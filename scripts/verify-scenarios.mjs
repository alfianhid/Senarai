// Verifies the demo scenarios against a running server.
// Usage: node scripts/verify-scenarios.mjs [baseUrl]
import { readFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:3000';

const actors = { staff: 'A1', manager: 'A2', admin: 'A3' };

// Citations reference a source by id; the kind lives on the source itself.
const sourceKind = new Map(
  JSON.parse(readFileSync(new URL('../data/sources.json', import.meta.url), 'utf8')).map((s) => [s.id, s.kind]),
);

async function ask(actor, question) {
  const started = Date.now();
  const res = await fetch(`${base}/api/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: `senarai_actor=${actor}` },
    body: JSON.stringify({ question }),
  });
  const elapsed = Date.now() - started;
  const { threadId } = await res.json();
  const payloadRes = await fetch(`${base}/api/threads/${threadId}`, {
    headers: { cookie: `senarai_actor=${actor}` },
  });
  const text = await payloadRes.text();
  return { threadId, elapsed, text, payload: JSON.parse(text) };
}

function summarize(label, r) {
  const p = r.payload;
  const kinds = [...new Set(p.chronology.flatMap((e) => e.citations.map((c) => sourceKind.get(c.sourceId))))];
  return {
    label,
    thread: r.threadId,
    ms: r.elapsed,
    canonical: p.canonical,
    chronology: p.chronology.length,
    openItems: p.openItems.length,
    gaps: p.gaps.length,
    kinds: kinds.join('+') || '—',
    firstTitle: p.chronology[0]?.title ?? '—',
  };
}

const results = [];
const main = 'Kenapa stok telat di Makassar, dan apa yang masih terbuka?';

const staffMain = await ask(actors.staff, main);
const managerMain = await ask(actors.manager, main);
const staffPenalty = await ask(actors.staff, 'Berapa denda kontrak Anugrah?');
const managerPenalty = await ask(actors.manager, 'Berapa denda kontrak Anugrah?');
const staffKenari = await ask(actors.staff, 'Apa itu Proyek Kenari?');
const staffGhost = await ask(actors.staff, 'Apa itu Proyek Nusantara?');

results.push(summarize('staff / main question', staffMain));
results.push(summarize('manager / main question', managerMain));
results.push(summarize('staff / penalty', staffPenalty));
results.push(summarize('manager / penalty', managerPenalty));
results.push(summarize('staff / kenari (forbidden)', staffKenari));
results.push(summarize('staff / nonexistent', staffGhost));

console.table(results);

const canon = (r) => {
  // Canonical payloads must match except for the per-request identifiers.
  const p = { ...r.payload };
  delete p.id;
  delete p.threadId;
  delete p.createdAt;
  return JSON.stringify(p);
};

const checks = [
  ['T01 forbidden == nonexistent (byte-identical body)', canon(staffKenari) === canon(staffGhost)],
  ['T01 forbidden == out-of-scope content', canon(staffKenari) === canon(staffPenalty)],
  ['T04 latency floor >= 600ms (all asks)', [staffMain, managerMain, staffPenalty, managerPenalty, staffKenari, staffGhost].every((r) => r.elapsed >= 600)],
  ['T06 staff and manager answers differ', staffMain.text !== managerMain.text],
  ['T06 same three-section shape', staffMain.payload.chronology.length > 0 && staffMain.payload.openItems.length > 0 && staffMain.payload.gaps.length > 0],
  ['T09 chat+doc+task synthesised', new Set(staffMain.payload.chronology.flatMap((e) => e.citations.map((c) => sourceKind.get(c.sourceId)))).size === 3],
  ['T11 penalty visible to manager only', managerPenalty.text.includes('45.000.000') && !staffPenalty.text.includes('45.000.000')],
  ['T13 gap cards present', staffMain.payload.gaps.length > 0],
  ['T19 PII masked (no raw 16-digit NIK)', !/\b\d{16}\b/.test(staffMain.text)],
];

console.log('');
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);

const gap = staffMain.payload.gaps[0];
if (gap) {
  console.log('\nFirst gap:', gap.id, '|', gap.rule, '|', gap.whatIsMissing);
  console.log('Knower:', gap.knower?.name ?? '(none)');
  console.log('Draft:', gap.draftQuestion);
}
