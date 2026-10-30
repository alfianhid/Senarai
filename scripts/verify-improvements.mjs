/**
 * Verification for the six upgrades: the lead answer, the agent trace, the
 * onboarding scenario (handbook Example Test 2), answer-language following the
 * question, live ingestion, and the empty-state owner.
 *
 * Run against a running server: node scripts/verify-improvements.mjs
 */
const BASE = process.argv[2] ?? process.env.BASE ?? 'http://localhost:3000';

const results = [];

function check(label, condition, detail = '') {
  results.push({ label, pass: Boolean(condition), detail });
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
}

async function ask(actor, project, question, locale = 'id') {
  const cookie = `senarai_actor=${actor}; senarai_project=${project}; senarai_locale=${locale}`;
  const res = await fetch(`${BASE}/api/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ question }),
  });
  const { threadId } = await res.json();
  const thread = await fetch(`${BASE}/api/threads/${threadId}`, { headers: { cookie } }).then((r) =>
    r.json(),
  );
  return thread;
}

const markers = (payload) => [
  ...payload.chronology.flatMap((e) => e.citations.map((c) => c.marker)),
  ...payload.openItems.map((i) => i.citation.marker),
];

(async () => {
  // --- T21: the answer answers ---------------------------------------------
  const causal = await ask('A1', 'makassar-q4', 'Kenapa stok telat di Makassar, dan apa yang masih terbuka?');
  check('T21 lead answer is present and in prose', (causal.lead?.textId ?? '').length > 80);
  check(
    'T21 lead answer names the cause from the record',
    /Truk ditahan/i.test(causal.lead?.textId ?? ''),
  );
  const known = new Set(markers(causal));
  check(
    'T21 every lead citation resolves to a rendered citation',
    (causal.lead?.citations ?? []).every((m) => known.has(m)),
  );
  check(
    'T21 every chronology row carries an explanatory sentence',
    causal.chronology.every((e) => (e.detail ?? '').length > 20),
  );

  // --- T22: the agent trace ------------------------------------------------
  const tools = (causal.trace ?? []).map((s) => s.tool);
  check(
    'T22 trace records the pipeline in execution order',
    tools.join(',') ===
      'resolve_scope,search_sources,read_sources,resolve_conflicts,detect_gaps,compose,verify',
    tools.join(' → '),
  );
  check('T22 self-check passes on a fully cited answer', causal.verification?.passed === true);

  const empty = await ask('A1', 'makassar-q4', 'Berapa denda kontrak Anugrah?');
  check('T22 canonical empty carries no trace', empty.canonical === true && empty.trace === undefined);

  // --- T23: handbook Example Test 2 ----------------------------------------
  const fuel = await ask('A1', 'onboarding-2026', 'Berapa tunjangan bahan bakar per bulan?');
  check('T23 returns the newer figure Rp750.000', /Rp750\.000/.test(fuel.lead?.textId ?? ''));
  check('T23 cites both sources', (fuel.lead?.citations ?? []).length === 2);
  check('T23 says the SOP is the older source', /SOP v2.*Rp500\.000.*lebih lama/i.test(fuel.lead?.textId ?? ''));
  const conflict = fuel.chronology.find((e) => e.conflict)?.conflict;
  check('T23 conflict rule is named, not a score', Boolean(conflict) && !/%/.test(conflict.rule));

  // --- T24: second scenario is answerable ----------------------------------
  const leave = await ask('A1', 'onboarding-2026', 'Berapa hari cuti tahunan?');
  check('T24 leave entitlement answered from policy', /12 hari/.test(leave.lead?.textId ?? ''));

  // --- T25: answer language follows the question ---------------------------
  const english = await ask('A1', 'onboarding-2026', 'Where do I collect my laptop?');
  check('T25 English question produces an English answer body', english.answerLanguage === 'en');
  check('T25 English answer is not the Indonesian sentence', /IT desk/.test(english.lead?.textEn ?? ''));

  // --- T26: live ingestion -------------------------------------------------
  await fetch(`${BASE}/api/reset`, { method: 'POST' });
  const before = await ask('A1', 'makassar-q4', 'Kenapa stok telat di Makassar?');
  await fetch(`${BASE}/api/ingest`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: 'senarai_actor=A1; senarai_project=makassar-q4',
    },
    body: JSON.stringify({
      kind: 'chat',
      title: 'Vendor menandatangani berita acara',
      body: 'Vendor sudah menandatangani berita acara keterlambatan pagi ini.',
      detailId: 'Vendor menandatangani berita acara, sehingga surat klaim bisa dikirim.',
      topicTags: ['vendor.contract', 'ops'],
    }),
  });
  const after = await ask('A1', 'makassar-q4', 'Kenapa stok telat di Makassar?');
  const appeared = after.chronology.some((e) => e.title.includes('berita acara'));
  check('T26 a newly ingested message appears in the next answer', appeared);
  check('T26 the answer version increments', after.version === before.version + 1, `v${before.version} → v${after.version}`);
  check(
    'T26 the answer says its data changed',
    (after.notices ?? []).some((n) => n.kind === 'updated'),
  );

  // --- T27: empty state names the owner, and role still gates --------------
  const staffBudget = await ask('A1', 'onboarding-2026', 'Berapa anggaran onboarding Q4?');
  const managerBudget = await ask('A2', 'onboarding-2026', 'Berapa anggaran onboarding Q4?');
  check('T27 staff sees no record for the management-only budget', staffBudget.canonical === true);
  check('T27 manager sees the budget figure', /Rp120\.000\.000/.test(managerBudget.lead?.textId ?? ''));

  await fetch(`${BASE}/api/reset`, { method: 'POST' });

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${passed}/${results.length} passed`);
  if (passed !== results.length) process.exit(1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
