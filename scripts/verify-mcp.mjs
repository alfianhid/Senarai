// End-to-end check of the MCP server over real stdio.
//
// It launches the built bundle the way an MCP client would, performs the
// initialize handshake, lists the tools and calls them. Nothing here imports
// lib/ — if a guarantee holds, it holds across the transport boundary.
//
// Usage: node scripts/verify-mcp.mjs
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const results = [];

function check(label, condition, detail = '') {
  results.push(Boolean(condition));
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['mcp/dist/server.mjs'],
  cwd: root,
  env: { ...process.env, SENARAI_ACTOR: 'A1', SENARAI_PROJECT: 'makassar-q4' },
  stderr: 'pipe',
});

const client = new Client({ name: 'senarai-verify', version: '1.0.0' });
await client.connect(transport);

async function call(name, args) {
  const res = await client.callTool({ name, arguments: args });
  const text = res.content?.[0]?.text ?? '';
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not every tool returns JSON */
  }
  return { res, text, json };
}

// 1. Handshake and catalogue
const { tools } = await client.listTools();
const names = tools.map((t) => t.name).sort();
check('initialize handshake completes', tools.length > 0);
check(
  'five tools are advertised',
  names.length === 5,
  names.join(', '),
);
check(
  'every tool has a description the model can plan from',
  tools.every((t) => (t.description ?? '').length > 40),
);

// 2. The main question, as staff
const staff = await call('senarai_ask', {
  question: 'Kenapa stok telat di Makassar, dan apa yang masih terbuka?',
});
check('senarai_ask returns a payload', staff.json && typeof staff.json.threadId === 'string');
check('the payload is answered, not empty', staff.json?.canonical === false);
check('the lead answer is present', Boolean(staff.json?.lead?.textId));
check('the trace survives the transport', (staff.json?.trace?.length ?? 0) >= 7);
check('the self-check passes', staff.json?.verification?.passed === true);
check(
  'chronology is sourced',
  (staff.json?.chronology?.length ?? 0) === 9,
  `${staff.json?.chronology?.length} rows`,
);

// 3. The same question as the manager
const manager = await call('senarai_ask', {
  question: 'Kenapa stok telat di Makassar, dan apa yang masih terbuka?',
  actorId: 'A2',
});
check(
  'two roles get genuinely different answers over MCP',
  (manager.json?.chronology?.length ?? 0) === 12,
  `${manager.json?.chronology?.length} rows vs ${staff.json?.chronology?.length}`,
);

// 4. The canonical empty, through the tool
const forbidden = await call('senarai_ask', {
  question: 'Apa itu Proyek Kenari?',
  actorId: 'A1',
});
const nonexistent = await call('senarai_ask', {
  question: 'Apa itu Proyek Nusantara?',
  actorId: 'A1',
});
check('forbidden topic returns the canonical empty', forbidden.json?.canonical === true);
check('non-existent topic returns the canonical empty', nonexistent.json?.canonical === true);
const bodyOf = (j) => JSON.stringify({ ...j, threadId: undefined });
check(
  'the two empties are byte-identical over MCP',
  bodyOf(forbidden.json) === bodyOf(nonexistent.json),
);
check(
  'no withheld count leaks in the empty',
  !JSON.stringify(forbidden.json).match(/forbidden|denied|restricted|locked|withheld/i),
);

// 5. Read the thread back, and try to read someone else's
const back = await call('senarai_get_thread', { threadId: staff.json.threadId, actorId: 'A1' });
check('senarai_get_thread returns the same answer', back.json?.id === staff.json?.id);

const foreign = await call('senarai_get_thread', {
  threadId: manager.json.threadId,
  actorId: 'A1',
});
check(
  "another actor's thread returns the canonical empty, not an error",
  foreign.json?.canonical === true,
);

// 6. Approve the first gap
const gapId = staff.json?.gaps?.find((g) => g.approval)?.id;
const approval = await call('senarai_approve', {
  threadId: staff.json.threadId,
  gapId,
  action: 'approve',
  actorId: 'A1',
});
check('a gap can be confirmed over MCP', approval.res.isError !== true, approval.text);
const after = await call('senarai_get_thread', { threadId: staff.json.threadId, actorId: 'A1' });
check(
  'the approval is visible on the thread',
  after.json?.gaps?.some((g) => g.approval?.state === 'approved'),
);

// 7. Scope: narrowing works, widening is refused
const widen = await call('senarai_revoke_scope', {
  token: 'sensitivity:confidential',
  granted: true,
  actorId: 'A1',
});
check('widening a scope the role does not carry is refused', widen.res.isError === true);

const narrow = await call('senarai_revoke_scope', {
  token: 'customer',
  granted: false,
  actorId: 'A1',
});
check('narrowing the actor\'s own scope is allowed', narrow.res.isError !== true, narrow.text);

const reduced = await call('senarai_ask', {
  question: 'Kenapa stok telat di Makassar, dan apa yang masih terbuka?',
  actorId: 'A1',
});
check(
  'the next answer reflects the narrowed scope',
  (reduced.json?.chronology?.length ?? 0) < (staff.json?.chronology?.length ?? 0),
  `${reduced.json?.chronology?.length} rows after revoking customer`,
);

// 8. Audit
const audit = await call('senarai_query_audit', { actorId: 'A1', limit: 50 });
check('the audit log is readable over MCP', Array.isArray(audit.json) && audit.json.length > 0);
check(
  'staff audit entries are their own',
  audit.json.every((e) => e.actorId === 'A1'),
  `${audit.json.length} entries`,
);

await client.close();

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);
