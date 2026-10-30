import type { AnswerPayload, AuditEntry, Locale, Source } from '@/types/domain';
import { actors, getActor, getProject, getRole } from '@/lib/data';
import { buildSnapshot } from '@/lib/access/scope';
import { composeAnswer } from '@/lib/answer/compose';
import { appendAudit, getThread, saveThread, setRevoked, store, updateThread } from '@/lib/store/session';
import { ingestSource, liveSources, nextAnswerVersion } from '@/lib/store/sources';
import { scoreSource, tokenize } from '@/lib/retrieval/search';
import { maskPII } from '@/lib/mask/pii';

const MIN_LATENCY_MS = 600;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withLatencyFloor(start: number): Promise<void> {
  const elapsed = Date.now() - start;
  if (elapsed < MIN_LATENCY_MS) await sleep(MIN_LATENCY_MS - elapsed);
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export interface AskRequest {
  question: string;
  projectId: string;
  actorId: string;
  locale: Locale;
}

export interface AskResult {
  payload: AnswerPayload;
  threadId: string;
}

export async function handleAsk(req: AskRequest): Promise<AskResult> {
  const start = Date.now();
  const threadId = makeId('TH');
  const snapshot = buildSnapshot(req.actorId, req.projectId);
  const dataset = liveSources();
  const version = nextAnswerVersion(req.actorId, req.projectId, req.question);

  const payload = composeAnswer({
    threadId,
    question: req.question,
    locale: req.locale,
    projectId: req.projectId,
    snapshot,
    allSources: dataset,
    version,
  });

  const matchedBeforeFilter = dataset
    .filter((s) => s.projectId === req.projectId)
    .filter((s) => scoreSource(tokenize(req.question), s) > 0).length;

  const decision: AuditEntry['decision'] = payload.canonical
    ? matchedBeforeFilter > 0
      ? 'empty-equivalent'
      : 'empty'
    : 'answered';

  // The log records what the agent returned, not only what it read. The summary
  // is masked like every other logged string, and truncated so a long answer
  // does not turn the log into a copy of the answer.
  const rawSummary = payload.lead
    ? payload.answerLanguage === 'en'
      ? payload.lead.textEn
      : payload.lead.textId
    : payload.chronology[0]?.title;
  const answerSummary = rawSummary ? maskPII(rawSummary).slice(0, 240) : undefined;

  const entry: AuditEntry = {
    id: makeId('AU'),
    at: new Date().toISOString(),
    actorId: req.actorId,
    actorRole: snapshot.roleId,
    projectId: req.projectId,
    questionMasked: maskPII(req.question),
    scopeSnapshotId: snapshot.id,
    scopeVersion: snapshot.version,
    retrievedSourceIds: payload.chronology
      .flatMap((e) => e.citations.map((c) => c.sourceId))
      .concat(payload.openItems.map((i) => i.citation.sourceId)),
    answerId: payload.id,
    threadId,
    answerSummary,
    steps: payload.trace?.length ?? 0,
    decision,
    approvals: [],
  };

  appendAudit(entry);
  saveThread(threadId, { payload, question: req.question, at: entry.at });

  await withLatencyFloor(start);
  return { payload, threadId };
}

export interface IngestRequest {
  projectId: string;
  kind: Source['kind'];
  title: string;
  titleEn?: string;
  body: string;
  detailId?: string;
  detailEn?: string;
  topicTags: string[];
  authorId: string;
  actorId: string;
}

/**
 * Live ingestion. A new message, document or task arrives and the next answer
 * must reflect it — this is what "responses remain current" means when it is
 * demonstrated rather than claimed.
 *
 * Ingestion is deliberately not permissioned: it stands in for the outside
 * world, which does not ask the agent before a message is sent. What the
 * ingestion is *allowed to become* is still gated by canRead at retrieval time.
 */
export function handleIngest(req: IngestRequest): { ok: boolean; sourceId?: string } {
  const project = getProject(req.projectId);
  const author = getActor(req.authorId);
  if (!project || !author) return { ok: false };
  if (!req.title.trim() || !req.body.trim()) return { ok: false };

  const sourceId = `L${store.ingested.length + 1}`;
  ingestSource({
    id: sourceId,
    kind: req.kind,
    projectId: req.projectId,
    topicTags: req.topicTags.length > 0 ? req.topicTags : project.topicTags.slice(0, 1),
    sensitivity: 'general',
    title: req.title.trim(),
    titleEn: req.titleEn,
    authorId: author.id,
    authorName: author.name,
    at: new Date().toISOString(),
    locator: req.kind === 'chat' ? '#umum' : req.kind === 'doc' ? 'Dokumen baru' : 'Papan tugas',
    body: req.body.trim(),
    bodyLocale: 'id',
    participantIds: [author.id],
    detailId: req.detailId,
    detailEn: req.detailEn,
    narrativeRole: 'context',
    ingested: true,
  });

  return { ok: true, sourceId };
}

export function handleApproval(input: {
  threadId: string;
  gapId: string;
  action: 'approve' | 'cancel';
}): { ok: boolean; approvalState?: string } {
  const thread = getThread(input.threadId);
  if (!thread) return { ok: false };

  const gap = thread.payload.gaps.find((g) => g.id === input.gapId);
  if (!gap || !gap.approval) return { ok: false };

  if (input.action === 'cancel') {
    // Cancelling writes nothing: the draft returns to its untouched state and
    // no audit entry is appended. Only a confirmed send is a fact worth keeping.
    gap.approval = { ...gap.approval, state: 'draft', decidedAt: undefined };
    updateThread(input.threadId, { payload: thread.payload });
    return { ok: true, approvalState: 'draft' };
  }

  const state = 'approved';
  const decidedAt = new Date().toISOString();

  gap.approval = { ...gap.approval, state, decidedAt };
  updateThread(input.threadId, { payload: thread.payload });

  const audit = store.auditLog.find((e) => e.answerId === thread.payload.id);
  if (audit) {
    audit.approvals.push({ gapId: input.gapId, state, at: decidedAt });
  }

  return { ok: true, approvalState: state };
}

export function handleScope(input: {
  actorId: string;
  projectId: string;
  token: string;
  granted: boolean;
}): { ok: boolean; scopeVersion: number } {
  // A person may narrow their own scope, never widen it. Granting a tag or a
  // sensitivity their role does not carry is refused here, not just hidden in
  // the UI.
  if (input.granted) {
    const actor = getActor(input.actorId);
    const role = actor ? getRole(actor.roleId) : undefined;
    if (!role) return { ok: false, scopeVersion: store.scopeVersion };

    if (input.token.startsWith('sensitivity:')) {
      const sensitivity = input.token.split(':')[1] as (typeof role.sensitivities)[number];
      if (!role.sensitivities.includes(sensitivity)) {
        return { ok: false, scopeVersion: store.scopeVersion };
      }
    } else if (role.tags !== '*' && !role.tags.includes(input.token)) {
      return { ok: false, scopeVersion: store.scopeVersion };
    }
  }

  setRevoked(input.actorId, input.projectId, input.token, !input.granted);
  return { ok: true, scopeVersion: store.scopeVersion };
}

export function handleAudit(actorId: string, roleId: string): AuditEntry[] {
  const entries = store.auditLog;
  if (roleId === 'admin') return entries;
  if (roleId === 'manager') {
    const actor = getActor(actorId);
    const projects = actor?.projectIds ?? [];
    return entries.filter((e) => projects.includes(e.projectId));
  }
  return entries.filter((e) => e.actorId === actorId);
}

export function actorList() {
  return actors;
}
