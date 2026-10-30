import type {
  AnswerPayload,
  ChronologyEvent,
  Citation,
  Locale,
  Notice,
  OpenItem,
  OpenItemStatus,
  RecordGap,
  ScopeSnapshot,
  Source,
} from '@/types/domain';
import { search, isStoryQuestion } from '@/lib/retrieval/search';
import { rank, chrono } from '@/lib/retrieval/rank';
import { toCitation } from '@/lib/retrieval/toCitation';
import { resolveConflicts, type ClaimEntry } from '@/lib/conflict/resolve';
import { detectGaps } from '@/lib/gaps/detect';
import { findKnower } from '@/lib/gaps/knowers';
import { draftQuestion } from '@/lib/gaps/draftQuestion';
import { maskPII } from '@/lib/mask/pii';
import { canonicalEmpty } from '@/lib/answer/canonicalEmpty';
import { buildLead, detectAnswerLanguage, detailOf, titleOf } from '@/lib/answer/narrative';
import { Trace } from '@/lib/agent/trace';

export interface ComposeInput {
  threadId: string;
  question: string;
  locale: Locale;
  projectId: string;
  snapshot: ScopeSnapshot;
  allSources: Source[];
  version?: number;
}

/**
 * The answer pipeline. Order matters and is visible in the trace:
 * scope → search → read → conflicts → gaps → compose → verify.
 *
 * Nothing here calls a model. Every sentence is either a quoted source or a
 * template filled with an authored fact, and the verify step asserts that each
 * rendered claim block carries a citation.
 */
export function composeAnswer(input: ComposeInput): AnswerPayload {
  const { threadId, question, locale, projectId, snapshot, allSources, version = 1 } = input;
  const trace = new Trace();
  const lang = detectAnswerLanguage(question);

  const grant = snapshot.grants.find((g) => g.projectId === projectId);
  const tagCount = grant ? (grant.tags === '*' ? -1 : grant.tags.length) : 0;
  trace.add(
    'resolve_scope',
    'Periksa akses',
    'Resolve access',
    tagCount < 0
      ? `Akses ${snapshot.roleId} diperiksa sebelum pencarian · semua tag topik · ${snapshot.grants[0]?.sensitivities.length ?? 0} tingkat sensitivitas`
      : `Akses ${snapshot.roleId} diperiksa sebelum pencarian · ${tagCount} tag topik · ${grant?.sensitivities.length ?? 0} tingkat sensitivitas`,
    `Access for ${snapshot.roleId} resolved before search · ${tagCount < 0 ? 'all topic tags' : `${tagCount} topic tags`} · ${grant?.sensitivities.length ?? 0} sensitivity levels`,
  );

  const matched = search(question, projectId, snapshot, allSources);
  if (matched.length === 0) {
    // The canonical empty is returned before any trace exists, so a withheld
    // answer and an absent one are indistinguishable all the way down.
    return canonicalEmpty(snapshot, threadId, projectId);
  }

  const chats = matched.filter((s) => s.kind === 'chat').length;
  const docs = matched.filter((s) => s.kind === 'doc').length;
  const tasks = matched.filter((s) => s.kind === 'task').length;

  trace.add(
    'search_sources',
    'Cari sumber',
    'Search sources',
    `${matched.length} sumber dalam cakupan cocok dengan pertanyaan`,
    `${matched.length} in-scope sources match the question`,
  );
  trace.add(
    'read_sources',
    'Baca sumber',
    'Read sources',
    `${chats} chat · ${docs} dokumen · ${tasks} tugas dibaca utuh`,
    `${chats} chat · ${docs} documents · ${tasks} tasks read in full`,
  );

  const ranked = rank(matched);
  // A story question gets the whole register. A fact question gets the few rows
  // that actually carry the answer, so a policy lookup does not read as a
  // dump of everything that shares a tag with it.
  const story = isStoryQuestion(question);
  const pool = story ? matched : ranked.slice(0, 4);
  // A closed task is a record of something that happened, so it belongs in the
  // timeline. An open task is work still to do, so it belongs in section two.
  // This is what lets one answer cite chat, document and task sources at once.
  const storySources = chrono(pool.filter((s) => s.kind !== 'task' || s.task?.status === 'done'));
  const taskSources = (story ? ranked : pool).filter((s) => s.kind === 'task');

  let marker = 0;
  const entries: ClaimEntry[] = [];
  const markers = new Map<string, number>();

  const makeCitation = (source: Source): Citation | null => {
    marker += 1;
    const citation = toCitation(source, marker, snapshot);
    if (citation) {
      entries.push({ source, citation });
      markers.set(source.id, marker);
    }
    return citation;
  };

  const chronology: ChronologyEvent[] = storySources.map((source, index) => {
    const citation = makeCitation(source);
    return {
      id: `E${index + 1}`,
      at: source.at,
      title: titleOf(source, lang),
      titleEn: source.titleEn ?? source.title,
      detail: detailOf(source, lang),
      detailEn: source.detailEn ?? source.detailId,
      citations: citation ? [citation] : [],
    };
  });

  const openItems: OpenItem[] = taskSources
    .filter((s) => s.task && s.task.status !== 'done')
    .map((source, index) => {
      const citation = makeCitation(source);
      const task = source.task!;
      return {
        id: `T${index + 1}`,
        title: titleOf(source, lang),
        ownerId: task.ownerId,
        ownerName: task.ownerName,
        due: task.due,
        status: task.status as OpenItemStatus,
        citation: citation as Citation,
      };
    })
    .filter((item) => Boolean(item.citation));

  const conflicts = resolveConflicts(entries);
  for (const event of chronology) {
    const sourceId = event.citations[0]?.sourceId;
    const note = sourceId ? conflicts.get(sourceId) : undefined;
    if (note) event.conflict = note;
  }

  trace.add(
    'resolve_conflicts',
    'Selesaikan konflik',
    'Resolve conflicts',
    conflicts.size === 0
      ? 'Tidak ada sumber yang saling bertentangan'
      : `${conflicts.size} konflik sumber diselesaikan dan kedua sumber tetap dikutip`,
    conflicts.size === 0
      ? 'No two sources disagree'
      : `${conflicts.size} source conflict(s) resolved, both sources still cited`,
  );

  const gapDrafts = detectGaps({
    question,
    chronology,
    openItems,
    visibleSources: matched,
  });

  const gaps: RecordGap[] = gapDrafts.map((draft, index) => {
    const knower = findKnower(draft, matched, snapshot.actorId);
    return {
      id: `G${index + 1}`,
      whatIsMissing: draft.whatIsMissing,
      whatIsMissingEn: draft.whatIsMissingEn,
      whyItMatters: draft.whyItMatters,
      whyItMattersEn: draft.whyItMattersEn,
      knower,
      draftQuestion: draftQuestion(draft, knower, 'id'),
      draftQuestionEn: draftQuestion(draft, knower, 'en'),
      rule: draft.rule,
      approval: knower
        ? {
            gapId: `G${index + 1}`,
            recipientName: knower.name,
            channelLabel: 'WhatsApp · pesan langsung',
            state: 'draft',
            simulated: true,
          }
        : undefined,
    };
  });

  trace.add(
    'detect_gaps',
    'Deteksi celah catatan',
    'Detect record gaps',
    gaps.length === 0
      ? 'Setiap bagian cerita ini tercatat'
      : `${gaps.length} bagian tidak tercatat, dihitung hanya dari sumber yang boleh Anda baca`,
    gaps.length === 0
      ? 'Every part of this story is on record'
      : `${gaps.length} part(s) missing from the record, computed from readable sources only`,
  );

  const lead = buildLead({
    sources: matched,
    markers,
    openItems,
    conflicts,
    question,
    lang,
  });

  const claims = chronology.length + openItems.length + (lead ? 1 : 0);
  const cited =
    chronology.filter((e) => e.citations.length > 0).length +
    openItems.filter((i) => i.citation).length +
    (lead && lead.citations.length > 0 ? 1 : 0);

  trace.add(
    'compose',
    'Susun jawaban',
    'Compose answer',
    `${claims} klaim disusun dari ${matched.length} sumber · bahasa ${lang === 'en' ? 'Inggris' : 'Indonesia'}`,
    `${claims} claims composed from ${matched.length} sources · ${lang === 'en' ? 'English' : 'Indonesian'} output`,
  );

  const { steps, verification } = trace.finish(claims, cited);

  const notices: Notice[] = matched
    .filter((s) => s.containsInjection)
    .map((s) => ({
      id: `N-${s.id}`,
      kind: 'injection',
      textId: `Instruksi tersemat di "${s.title}" diabaikan. Dokumen diperlakukan sebagai data, bukan perintah.`,
      textEn: `An instruction embedded in "${s.titleEn ?? s.title}" was ignored. Documents are treated as data, never as commands.`,
      sourceId: s.id,
    }));

  const ingested = matched.filter((s) => s.ingested);
  if (ingested.length > 0) {
    notices.push({
      id: 'N-INGEST',
      kind: 'updated',
      textId: `Jawaban ini memakai ${ingested.length} sumber yang masuk setelah pertanyaan sebelumnya. Versi ${version}.`,
      textEn: `This answer uses ${ingested.length} source(s) that arrived after the previous answer. Version ${version}.`,
      sourceId: ingested[0].id,
    });
  }

  return {
    id: `AN-${Date.now()}`,
    threadId,
    projectId,
    question,
    questionMasked: maskPII(question),
    createdAt: new Date().toISOString(),
    locale,
    answerLanguage: lang,
    scope: snapshot,
    status: 'complete',
    canonical: false,
    version,
    lead,
    chronology,
    openItems,
    gaps,
    notices,
    trace: steps,
    verification,
  };
}
