import type { ScopeSnapshot, Source } from '@/types/domain';
import { canRead } from '@/lib/access/canRead';

const STOP = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'itu', 'ini', 'apa', 'adalah', 'untuk', 'dengan', 'pada',
  'saya', 'kita', 'kami', 'mereka', 'dia', 'tidak', 'ada', 'juga', 'sudah', 'belum', 'akan',
  'kenapa', 'mengapa', 'bagaimana', 'siapa', 'kapan', 'dimana', 'berapa', 'masih', 'bisa',
  'per', 'bagi', 'oleh', 'atas', 'saat', 'dalam', 'antara', 'sebagai', 'atau', 'hanya',
  'saja', 'lebih', 'paling', 'setiap', 'tiap', 'para', 'pun', 'lagi', 'mau',
  'the', 'a', 'an', 'is', 'was', 'were', 'of', 'to', 'in', 'on', 'for', 'and', 'or', 'why',
  'what', 'who', 'when', 'where', 'how', 'did', 'does', 'do', 'still', 'been', 'has', 'have',
  'my', 'me', 'we', 'our', 'your', 'it', 'this', 'that', 'at', 'by', 'with', 'from', 'can',
]);

/** Words that carry no subject and therefore do not need to be grounded in the
 *  record. Everything else must appear in data the asker can read. */
const GENERIC = new Set([
  'masalah', 'issue', 'info', 'informasi', 'information', 'detail', 'status', 'update',
  'terbaru', 'latest', 'terkait', 'about', 'regarding', 'tolong', 'please', 'bantu',
  'help', 'tahu', 'know', 'perlu', 'need', 'want', 'punya', 'have', 'juta', 'ribu',
  'miliar', 'ton', 'orang', 'hari', 'bulan', 'tahun', 'minggu',
]);

const ALIASES: Record<string, string[]> = {
  telat: ['terlambat', 'keterlambatan', 'delay', 'late', 'tertunda'],
  late: ['telat', 'terlambat', 'delay', 'keterlambatan'],
  delay: ['telat', 'terlambat', 'late'],
  stok: ['stock', 'persediaan', 'barang'],
  stock: ['stok', 'barang'],
  kirim: ['pengiriman', 'kiriman', 'shipment', 'delivery'],
  denda: ['penalti', 'penalty'],
  jumlah: ['kuantitas', 'quantity', 'ton'],
  ubah: ['revisi', 'perubahan', 'change'],
  vendor: ['pemasok', 'supplier', 'anugrah'],
  tiba: ['sampai', 'datang', 'arrive', 'arrival'],
  setuju: ['menyetujui', 'approve', 'approval', 'persetujuan', 'disetujui'],
  menyetujui: ['setuju', 'disetujui', 'approval', 'approve'],
  persetujuan: ['setuju', 'disetujui', 'approval'],
  beli: ['pembelian', 'purchase'],
  pembelian: ['beli', 'purchase'],
  cuti: ['leave', 'libur'],
  leave: ['cuti', 'libur'],
  tunjangan: ['allowance', 'benefit'],
  allowance: ['tunjangan'],
  gaji: ['payroll', 'salary'],
  laptop: ['komputer', 'perangkat'],
  akses: ['access', 'vpn', 'akun'],
  vpn: ['akses', 'jaringan'],
  rapat: ['meeting'],
  jam: ['waktu', 'hours', 'time'],
  reimbursement: ['reimburse', 'klaim', 'penggantian'],
  klaim: ['reimbursement', 'reimburse', 'penggantian'],
  anggaran: ['budget'],
  budget: ['anggaran'],
  penalty: ['denda', 'penalti'],
};

/** A story question wants the whole register; a fact question wants precision.
 *  Retrieving the full project for "what is the fuel allowance?" buries the
 *  answer in context, which is the failure mode this split removes. */
const STORY = /\b(kenapa|mengapa|why|terbuka|masih|open|outstanding|riwayat|history|timeline|status|apa yang terjadi|what happened)\b/i;

export function isStoryQuestion(question: string): boolean {
  return STORY.test(question);
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\brp\.?\s?/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP.has(t) && !/^\d+$/.test(t));
}

function expand(tokens: string[]): string[] {
  const out = new Set<string>();
  for (const t of tokens) {
    out.add(t);
    for (const a of ALIASES[t] ?? []) out.add(a);
  }
  return [...out];
}

/** Everything a source can be found by, in both languages. English questions
 *  are answerable because the authored English text is indexed too. */
function haystack(source: Source): string {
  return [
    source.title,
    source.titleEn ?? '',
    source.body,
    source.detailId ?? '',
    source.detailEn ?? '',
    source.topicTags.join(' '),
  ]
    .join(' ')
    .toLowerCase();
}

export function scoreSource(
  questionTokens: string[],
  source: Source,
  weights?: Map<string, number>,
): number {
  let score = 0;
  const text = haystack(source);
  for (const token of questionTokens) {
    const w = weights?.get(token) ?? 1;
    if (source.topicTags.some((tag) => tag.toLowerCase().includes(token))) score += 3 * w;
    if (text.includes(token)) score += 2 * w;
  }
  return score;
}

/**
 * Permission is applied before scoring, never after. A source the asker may not
 * read is never scored, never ranked, never cited, and never counted.
 */
export function search(
  question: string,
  projectId: string,
  snapshot: ScopeSnapshot,
  sources: Source[],
): Source[] {
  const inScope = sources
    .filter((s) => s.projectId === projectId)
    .filter((s) => canRead(snapshot, s));

  const baseTokens = tokenize(question);
  if (baseTokens.length === 0) return [];
  const tokens = expand(baseTokens);

  // Document frequency over readable sources only, so a term that exists only
  // in data this person cannot read is treated as absent — which is the truth
  // from where they stand, and discloses nothing.
  const index = new Map<string, number>();
  for (const token of tokens) {
    const df = inScope.filter((s) => haystack(s).includes(token)).length;
    index.set(token, df);
  }

  const story = isStoryQuestion(question);

  if (!story) {
    // Grounding rule: every content word the person actually typed has to exist
    // in the record they can read, directly or through an alias. Aliases are
    // not themselves checked — "laptop" expanding to "perangkat" must not make
    // a laptop question unanswerable just because nobody wrote "perangkat".
    const unknown = baseTokens.filter((token) => {
      if ((index.get(token) ?? 0) > 0) return false;
      if (GENERIC.has(token)) return false;
      return !(ALIASES[token] ?? []).some((alias) => (index.get(alias) ?? 0) > 0);
    });
    if (unknown.length > 0) return [];
  }

  // Rare terms carry the subject; common ones carry the topic. Weighting by
  // inverse document frequency is what stops "bulan" from outvoting "anggaran".
  const weights = new Map<string, number>();
  const n = Math.max(1, inScope.length);
  for (const [token, df] of index) {
    weights.set(token, Math.log(1 + n / (1 + df)));
  }

  const scored = inScope
    .map((source) => ({ source, score: scoreSource(tokens, source, weights) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.source.at.localeCompare(a.source.at));

  if (scored.length === 0) return [];

  // The register view: the whole project story, in order, for a "why" or
  // "what is still open" question.
  if (story) return inScope;

  // The fact view: only sources that carry the question's terms, and only those
  // close to the best match.
  const best = scored[0].score;
  const floor = Math.max(2, best * 0.3);
  return scored.filter((x) => x.score >= floor).map((x) => x.source);
}
