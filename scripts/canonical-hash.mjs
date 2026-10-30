// Prints the sha256 of the canonical-empty payload for three different causes.
// All three must be identical: the thread id is the only field that varies,
// so it is normalised before hashing.
// Usage: node scripts/canonical-hash.mjs [baseUrl]
import { createHash } from 'node:crypto';

const base = process.argv[2] ?? 'http://localhost:3000';
const actor = 'A1'; // Rina Pratiwi, staff

// Start from a known state so the digest is reproducible. If reset is disabled
// on this instance the check still runs, but the digest may reflect prior asks.
const resetRes = await fetch(`${base}/api/reset`, { method: 'POST' }).catch(() => null);
if (!resetRes?.ok) {
  console.log('note: /api/reset is unavailable here, so the digest depends on prior state\n');
}

const questions = [
  ['out of scope, content exists', 'Berapa denda kontrak Anugrah?'],
  ['out of scope, project exists', 'Apa itu Proyek Kenari?'],
  ['project does not exist', 'Apa itu Proyek Nusantara?'],
];

async function ask(question) {
  const res = await fetch(`${base}/api/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: `senarai_actor=${actor}` },
    body: JSON.stringify({ question }),
  });
  const { threadId } = await res.json();
  const payloadRes = await fetch(`${base}/api/threads/${threadId}`, {
    headers: { cookie: `senarai_actor=${actor}` },
  });
  return payloadRes.json();
}

const hashes = [];

for (const [label, question] of questions) {
  const payload = await ask(question);
  // The thread id is the only per-request value; blank it so the bodies compare.
  const normalised = { ...payload, threadId: 'TH-XXXXXX' };
  const sha = createHash('sha256').update(JSON.stringify(normalised)).digest('hex').slice(0, 16);
  hashes.push(sha);
  console.log(
    `${question.padEnd(30)}  canonical:${String(payload.canonical).padEnd(5)}  ${label.padEnd(30)}  sha ${sha}`,
  );
}

const identical = new Set(hashes).size === 1;
console.log(identical ? `\nPASS  all three bodies are byte-identical (sha ${hashes[0]})` : '\nFAIL  bodies differ');
process.exit(identical ? 0 : 1);
