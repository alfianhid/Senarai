import type {
  ConflictNote,
  DirectAnswer,
  Locale,
  OpenItem,
  Source,
} from '@/types/domain';
import { formatDate } from '@/lib/ui/format';

/**
 * The lead answer.
 *
 * This is the only place in the product where sentences are assembled rather
 * than quoted. Every clause is anchored to a marker, and a clause whose source
 * has no marker is dropped — so the lead can never say something the record
 * does not support. No model writes here: the sentences are templates filled
 * with authored facts, which is why the demo cannot hallucinate on stage.
 */

const ID_MARKERS = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'itu', 'ini', 'apa', 'apakah', 'adalah', 'untuk',
  'dengan', 'pada', 'saya', 'kami', 'kita', 'tidak', 'ada', 'juga', 'sudah', 'belum',
  'akan', 'kenapa', 'mengapa', 'bagaimana', 'siapa', 'kapan', 'dimana', 'berapa',
  'masih', 'bisa', 'tolong', 'jam', 'hari', 'bulan', 'cuti', 'denda', 'stok',
  'telat', 'terlambat', 'tunjangan', 'gaji', 'biaya', 'karyawan', 'kantor', 'proyek',
  'boleh', 'harus', 'setelah', 'sebelum', 'kalau', 'atau',
]);

const EN_MARKERS = new Set([
  'the', 'a', 'an', 'is', 'was', 'were', 'of', 'to', 'in', 'on', 'for', 'and', 'or',
  'why', 'what', 'who', 'when', 'where', 'how', 'did', 'does', 'do', 'still', 'been',
  'has', 'have', 'my', 'i', 'can', 'much', 'many', 'leave', 'allowance', 'penalty',
  'stock', 'late', 'open', 'approved', 'should', 'would', 'about',
]);

/**
 * The answer body follows the language of the question, not the chrome toggle.
 * A judge who asks in English gets an English answer under Indonesian chrome —
 * which is the behaviour the handbook asks for.
 */
export function detectAnswerLanguage(question: string): Locale {
  const tokens = question.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  let id = 0;
  let en = 0;
  for (const token of tokens) {
    if (ID_MARKERS.has(token)) id += 1;
    if (EN_MARKERS.has(token)) en += 1;
  }
  return en > id ? 'en' : 'id';
}

const CAUSAL = /\b(kenapa|mengapa|why|penyebab|sebab|kok|how come)\b/i;
const OPEN_ASK = /\b(terbuka|masih|open|outstanding|pending|belum selesai)\b/i;

const ROLE_ORDER: Record<NonNullable<Source['narrativeRole']>, number> = {
  cause: 0,
  decision: 1,
  effect: 2,
  context: 3,
};

function detailOf(source: Source, lang: Locale): string {
  if (lang === 'en') return source.detailEn ?? source.detailId ?? source.titleEn ?? source.title;
  return source.detailId ?? source.detailEn ?? source.title;
}

function titleOf(source: Source, lang: Locale): string {
  return lang === 'en' ? source.titleEn ?? source.title : source.title;
}

export interface LeadInput {
  sources: Source[];
  markers: Map<string, number>;
  openItems: OpenItem[];
  conflicts: Map<string, ConflictNote>;
  question: string;
  lang: Locale;
}

type Clause = { id: string; en: string; citations: number[] };

/** A conflict is the sharpest thing an answer can lead with: one number is
 *  current and the other is out of date, and both stay cited. */
function conflictClause(input: LeadInput, note: ConflictNote): Clause | null {
  const chosenMarker = [...input.markers.entries()].find(
    ([, marker]) => `C${marker}` === note.chosenCitationId,
  );
  if (!chosenMarker) return null;
  const [chosenSourceId, chosen] = chosenMarker;

  const rejected = note.rejectedCitationIds
    .map((cid) => {
      const hit = [...input.markers.entries()].find(([, marker]) => `C${marker}` === cid);
      return hit ? hit[1] : undefined;
    })
    .find((m): m is number => m !== undefined);

  const chosenValue = note.params?.chosenValue ?? '';
  if (!chosenValue) return null;

  const chosenLabel = note.params?.chosenLabel ?? chosenSourceId;
  const rejectedValue = note.params?.rejectedValue ?? '';
  const rejectedLabel = note.params?.rejectedLabel ?? 'SOP';

  const id = rejected !== undefined && rejectedValue
    ? `Angka yang berlaku ${chosenValue} (${chosenLabel}) [${chosen}]. ${rejectedLabel} [${rejected}] masih menyebut ${rejectedValue}, tetapi sumber itu lebih lama sehingga tidak dipakai.`
    : `Angka yang berlaku ${chosenValue} (${chosenLabel}) [${chosen}].`;

  const en = rejected !== undefined && rejectedValue
    ? `The current figure is ${chosenValue} (${chosenLabel}) [${chosen}]. ${rejectedLabel} [${rejected}] still says ${rejectedValue}, but it is the older source, so it is not the one used.`
    : `The current figure is ${chosenValue} (${chosenLabel}) [${chosen}].`;

  return { id, en, citations: [chosen, ...(rejected !== undefined ? [rejected] : [])] };
}

/** Cause → decision → effect. For a "why" question the role order is the story
 *  order; for a fact question the ranking already put the right source first. */
function chainClause(input: LeadInput, causal: boolean): Clause | null {
  const usable = input.sources.filter((s) => input.markers.has(s.id) && (s.detailId || s.detailEn));
  if (usable.length === 0) return null;

  let picked: Source[];

  if (causal) {
    const ordered = [...usable].sort((a, b) => {
      const ra = ROLE_ORDER[a.narrativeRole ?? 'context'];
      const rb = ROLE_ORDER[b.narrativeRole ?? 'context'];
      if (ra !== rb) return ra - rb;
      return a.at.localeCompare(b.at);
    });
    picked = [];
    const seen = new Set<string>();
    for (const source of ordered) {
      const role = source.narrativeRole ?? 'context';
      if (seen.has(role)) continue;
      seen.add(role);
      picked.push(source);
      if (picked.length === 3) break;
    }
  } else {
    // `sources` arrives ranked by relevance for a fact lookup. One clause is
    // enough: a fact question has one fact as its answer.
    picked = usable.slice(0, 1);
  }

  if (picked.length === 0) return null;

  const citations = picked.map((s) => input.markers.get(s.id)!);
  return {
    id: picked.map((s) => `${s.detailId ?? s.detailEn} [${input.markers.get(s.id)}]`).join(' '),
    en: picked.map((s) => `${s.detailEn ?? s.detailId} [${input.markers.get(s.id)}]`).join(' '),
    citations,
  };
}

function openClause(input: LeadInput): Clause | null {
  const first = input.openItems[0];
  if (!first) return null;
  const marker = first.citation.marker;
  const due = first.due ? formatDate(first.due, 'id') : undefined;
  const dueEn = first.due ? formatDate(first.due, 'en') : undefined;

  const id = `Yang masih terbuka: ${first.title} [${marker}]${
    first.ownerName ? `, pemilik ${first.ownerName}` : ', belum ada pemilik'
  }${due ? `, tenggat ${due}` : ''}.`;

  const en = `Still open: ${first.title} [${marker}]${
    first.ownerName ? `, owned by ${first.ownerName}` : ', with no owner yet'
  }${dueEn ? `, due ${dueEn}` : ''}.`;

  return { id, en, citations: [marker] };
}

export function buildLead(input: LeadInput): DirectAnswer | undefined {
  const parts: Clause[] = [];
  const causal = CAUSAL.test(input.question);

  // A "why" question leads with the cause chain. A fact question leads with the
  // current value, because a conflict is the sharpest thing an answer can say.
  if (causal) {
    const chain = chainClause(input, true);
    if (chain) parts.push(chain);
  } else {
    const note = [...input.conflicts.values()][0];
    const conflict = note ? conflictClause(input, note) : null;
    if (conflict) parts.push(conflict);
    else {
      const chain = chainClause(input, false);
      if (chain) parts.push(chain);
    }
  }

  if (causal || OPEN_ASK.test(input.question)) {
    const open = openClause(input);
    if (open) parts.push(open);
  }

  if (parts.length === 0) return undefined;

  const citations = [...new Set(parts.flatMap((p) => p.citations))];
  return {
    textId: parts.map((p) => p.id).join(' '),
    textEn: parts.map((p) => p.en).join(' '),
    citations,
  };
}

export { detailOf, titleOf };
