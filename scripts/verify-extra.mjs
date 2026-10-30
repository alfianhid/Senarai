// The checks that need a running server and more than one request.
// Usage: node scripts/verify-extra.mjs [baseUrl]
const base = process.argv[2] ?? 'http://localhost:3000';
const H = (actor) => ({ cookie: `senarai_actor=${actor}`, 'content-type': 'application/json' });
const MAIN = 'Kenapa stok telat di Makassar, dan apa yang masih terbuka?';

const ask = async (actor, question) => {
  const res = await fetch(`${base}/api/ask`, {
    method: 'POST',
    headers: H(actor),
    body: JSON.stringify({ question }),
  });
  const { threadId } = await res.json();
  const payload = await (await fetch(`${base}/api/threads/${threadId}`, { headers: H(actor) })).json();
  return { threadId, payload };
};

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

// T08 — every claim carries a citation.
{
  const { payload } = await ask('A1', MAIN);
  const rowsCited = payload.chronology.every((e) => e.citations.length > 0);
  const itemsCited = payload.openItems.every((i) => i.citation?.sourceId);
  check('T08 every chronology row and open item is cited', rowsCited && itemsCited);
}

// T10 — the drawer opens on first paint from ?source=.
{
  const { threadId } = await ask('A1', MAIN);
  const html = await (await fetch(`${base}/ask/${threadId}?source=S12`, { headers: H('A1') })).text();
  check('T10 ?source=S12 renders the source server-side', /Sumber|Source/.test(html) && /Kirim surat klaim/i.test(html));
}

// T18 — cancel writes nothing.
{
  const { threadId, payload } = await ask('A1', MAIN);
  const gap = payload.gaps.find((g) => g.approval);
  await fetch(`${base}/api/approvals`, {
    method: 'POST',
    headers: H('A1'),
    body: JSON.stringify({ threadId, gapId: gap.id, action: 'cancel' }),
  });
  const after = await (await fetch(`${base}/api/threads/${threadId}`, { headers: H('A1') })).json();
  const audit = await (await fetch(`${base}/api/audit`, { headers: H('A1') })).json();
  const row = audit.find((e) => e.answerId === after.id);
  const gapAfter = after.gaps.find((g) => g.id === gap.id);
  check('T18 cancel leaves the gap in draft and writes no audit entry', gapAfter.approval.state === 'draft' && row.approvals.length === 0);
}

// T20 — revoke, re-ask, two snapshots.
{
  await fetch(`${base}/api/reset`, { method: 'POST', headers: H('A1') });
  const before = await ask('A1', MAIN);
  await fetch(`${base}/api/scope`, {
    method: 'POST',
    headers: H('A1'),
    body: JSON.stringify({ token: 'customer', granted: false }),
  });
  const after = await ask('A1', MAIN);
  const audit = await (await fetch(`${base}/api/audit`, { headers: H('A1') })).json();
  const snapshots = new Set(audit.map((e) => e.scopeSnapshotId));
  check(
    'T20 revocation reduces the next answer and the audit holds both snapshots',
    after.payload.chronology.length < before.payload.chronology.length && snapshots.size >= 2,
    `${before.payload.chronology.length} → ${after.payload.chronology.length} rows, ${snapshots.size} snapshots`,
  );
}

// Scope can be narrowed, never widened.
{
  const res = await fetch(`${base}/api/scope`, {
    method: 'POST',
    headers: H('A1'),
    body: JSON.stringify({ token: 'vendor.contract', granted: true }),
  });
  check('widening a scope the role does not carry is refused', res.status === 403, `HTTP ${res.status}`);
}

console.log('');
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed === 0 ? 0 : 1);
