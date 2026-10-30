# Test results

**Run:** 29 October 2026, 21:12 WIB
**Environment:** Windows 11 · Node 22.22.2 · Next.js 15.1.6 · Vitest 2.1.8
**Raw logs:** `submission/logs/vitest.txt`, `submission/logs/verify.txt`, `submission/logs/verify-extra.txt`, `submission/logs/verify-improvements.txt`, `submission/logs/verify-canonical.txt`, `submission/logs/verify-mcp.txt`

| Suite | Command | Result |
|---|---|---|
| Unit tests over the guarantees | `npm test` | **13 files, 73 tests, 0 failures** |
| Scripted demo against the running server | `npm run verify` | **9 of 9 checks pass** |
| Multi-request checks (citations, deep link, cancel, revocation) | `npm run verify:extra` | **5 of 5 pass** |
| Lead answer, agent trace, onboarding scenario, language, ingestion | `npm run verify:improvements` | **19 of 19 pass** |
| Byte-identical empty payload across three causes | `npm run verify:canonical` | **identical, sha `b127c7615b7cf584`** |
| MCP over a real stdio handshake | `npm run verify:mcp` | **23 of 23 pass** |
| Type check | `npm run typecheck` | 0 errors |

**34 scripted checks against the live web app, 23 more over an MCP stdio handshake, 73 unit tests, 0 failures.**

---

## 1. Unit suite

| File | Tests | Covers |
|---|---|---|
| `tests/access.test.ts` | 7 | `canRead` over project, tag, sensitivity, wildcard, missing grant, revocation |
| `tests/canonical-empty.test.ts` | 5 | No question echo; identical payload across causes; three empty sections; no comparable scope version |
| `tests/latency.test.ts` | 3 | 600 ms floor on answered and empty responses; forbidden question not echoed |
| `tests/gaps.test.ts` | 6 | `no-cause`, `ownerless-blocked-item`, `silent-interval` (5-day boundary); no gap derived from absent data |
| `tests/conflict.test.ts` | 4 | Version precedence between documents, recency across kinds, agreement is silent, both sources kept |
| `tests/pii.test.ts` | 6 | NIK, `08…`, `+62…`, ordinary numbers untouched, idempotence |
| `tests/no-forbidden.test.ts` | 4 | No forbidden/denied/locked/restricted tell in `components/` or `app/`; five pill states, closed |
| `tests/approval.test.ts` | 4 | Draft only with a visible knower; one audit row on confirm; **cancel writes nothing**; unknown gap refused |
| `tests/narrative.test.ts` | 7 | Lead answer answers; every clause cited; every row explains itself; language follows the question; empty stays language-neutral |
| `tests/agent-trace.test.ts` | 5 | Pipeline order; self-check passes; access before search; empty carries no trace; no withheld count leaks |
| `tests/onboarding.test.ts` | 9 | Example Test 2; leave; approval authority; role-gated budget; injection ignored; grounding; T15; T16 |
| `tests/ingest.test.ts` | 4 | New message changes the next answer; ingestion does not bypass permission; invalid ingest rejected |
| `tests/mcp.test.ts` | 9 | MCP tool returns the same substance as the HTTP path; floor holds; canonical empty and unknown actor; no escalation through the tools |

## 2. Scripted demo run

Six questions, staff (A1) and manager (A2), same server:

| # | Actor | Question | canonical | Chronology | Open | Gaps | Source kinds | ms |
|---|---|---|---|---|---|---|---|---|
| 0 | staff | Kenapa stok telat di Makassar… | false | 9 | 2 | 3 | doc+task+chat | 678 |
| 1 | manager | Kenapa stok telat di Makassar… | false | 12 | 2 | 2 | doc+task+chat | 630 |
| 2 | staff | Berapa denda kontrak Anugrah? | **true** | 0 | 0 | 0 | — | 625 |
| 3 | manager | Berapa denda kontrak Anugrah? | false | 2 | 0 | 0 | doc+chat | 626 |
| 4 | staff | Apa itu Proyek Kenari? | **true** | 0 | 0 | 0 | — | 614 |
| 5 | staff | Apa itu Proyek Nusantara? | **true** | 0 | 0 | 0 | — | 618 |

Wall-clock times move a few milliseconds between runs; the assertion is the 600 ms floor, not the exact figure.

```
PASS  T01 forbidden == nonexistent (byte-identical body)
PASS  T01 forbidden == out-of-scope content
PASS  T04 latency floor >= 600ms (all asks)
PASS  T06 staff and manager answers differ
PASS  T06 same three-section shape
PASS  T09 chat+doc+task synthesised
PASS  T11 penalty visible to manager only
PASS  T13 gap cards present
PASS  T19 PII masked (no raw 16-digit NIK)
```

`npm run verify:extra` (same build):

```
PASS  T08 every chronology row and open item is cited
PASS  T10 ?source=S12 renders the source server-side
PASS  T18 cancel leaves the gap in draft and writes no audit entry
PASS  T20 revocation reduces the next answer and the audit holds both snapshots  (9 → 8 rows, 3 snapshots)
PASS  widening a scope the role does not carry is refused  (HTTP 403)
```

`npm run verify:improvements` (same build):

```
PASS  T21 lead answer is present and in prose
PASS  T21 lead answer names the cause from the record
PASS  T21 every lead citation resolves to a rendered citation
PASS  T21 every chronology row carries an explanatory sentence
PASS  T22 trace records the pipeline in execution order
PASS  T22 self-check passes on a fully cited answer
PASS  T22 canonical empty carries no trace
PASS  T23 returns the newer figure Rp750.000
PASS  T23 cites both sources
PASS  T23 says the SOP is the older source
PASS  T23 conflict rule is named, not a score
PASS  T24 leave entitlement answered from policy
PASS  T25 English question produces an English answer body
PASS  T25 English answer is not the Indonesian sentence
PASS  T26 a newly ingested message appears in the next answer
PASS  T26 the answer version increments  (v1 → v2)
PASS  T26 the answer says its data changed
PASS  T27 staff sees no record for the management-only budget
PASS  T27 manager sees the budget figure
```

`npm run verify:canonical` (same build) — the strongest single claim in the project, so it gets its own check:

```
Berapa denda kontrak Anugrah?   canonical:true   out of scope, content exists    sha b127c7615b7cf584
Apa itu Proyek Kenari?          canonical:true   out of scope, project exists    sha b127c7615b7cf584
Apa itu Proyek Nusantara?       canonical:true   project does not exist          sha b127c7615b7cf584

PASS  all three bodies are byte-identical (sha b127c7615b7cf584)
```

The thread id is the only per-request value; the script blanks it and hashes the rest. A judge can re-run this and get the same digest.

---

## 2b. MCP transport

`npm run verify:mcp` launches `mcp/dist/server.mjs` the way a client would — a real stdio handshake, not an in-process import — then calls all five tools:

```
PASS  initialize handshake completes
PASS  five tools are advertised  (senarai_approve, senarai_ask, senarai_get_thread, senarai_query_audit, senarai_revoke_scope)
PASS  every tool has a description the model can plan from
PASS  senarai_ask returns a payload
PASS  the payload is answered, not empty
PASS  the lead answer is present
PASS  the trace survives the transport
PASS  the self-check passes
PASS  chronology is sourced  (9 rows)
PASS  two roles get genuinely different answers over MCP  (12 rows vs 9)
PASS  forbidden topic returns the canonical empty
PASS  non-existent topic returns the canonical empty
PASS  the two empties are byte-identical over MCP
PASS  no withheld count leaks in the empty
PASS  senarai_get_thread returns the same answer
PASS  another actor's thread returns the canonical empty, not an error
PASS  a gap can be confirmed over MCP
PASS  the approval is visible on the thread
PASS  widening a scope the role does not carry is refused
PASS  narrowing the actor's own scope is allowed
PASS  the next answer reflects the narrowed scope  (8 rows after revoking customer)
PASS  the audit log is readable over MCP
PASS  staff audit entries are their own  (6 entries)

23/23 passed
```

Two of these matter more than the rest. *Two roles get genuinely different answers* proves the scope snapshot is resolved from the `actorId` argument and not inherited from the web session. *The two empties are byte-identical over MCP* proves the canonical-empty guarantee is a property of `lib/`, not of the HTTP layer that happened to be tested first.

---

## 3. Matrix status (PRD §5, extended)

| # | Case | Status | Evidence |
|---|---|---|---|
| T01 | Forbidden == non-existent | **PASS** | `verify`, `canonical-empty.test.ts` |
| T02 | Non-existent project | **PASS** | `verify` row 5 |
| T03 | All sources filtered out | **PASS** | `verify` row 2 |
| T04 | Latency floor | **PASS** | `latency.test.ts`, `verify` |
| T05 | No forbidden component | **PASS** | `no-forbidden.test.ts` (scans `components/`, `app/`) |
| T06 | Same question, two roles | **PASS** | `verify` rows 0/1 and 2/3 |
| T07 | Sensitivity filtering | **PASS** | `access.test.ts` + `verify` T11 |
| T08 | Per-claim citation | **PASS** | payload check, all rows and items cited |
| T09 | Three-source synthesis | **PASS** | `verify` — doc+task+chat in one answer |
| T10 | Drawer deep link | **PASS** | `?source=S12` server-rendered |
| T11 | SOP vs chat conflict | **PASS** | `verify` T11, `conflict.test.ts` |
| T12 | Conflict rule is a name, not a score | **PASS** | `conflict.test.ts` asserts `newer-version` / `recency` |
| T13 | Gap — no cause | **PASS** | `verify`, `gaps.test.ts` |
| T14 | Gap — ownerless blocked item | **PASS** | `gaps.test.ts` |
| T15 | Gap with no visible knower | **PASS** | `onboarding.test.ts` — blocked template task authored by the asker; knower omitted, no approval offered |
| T16 | No gaps — stated absence | **PASS** | `onboarding.test.ts` — leave question yields zero gaps |
| T17 | Approval flow | **PASS** | `approval.test.ts`, manual run |
| T18 | Cancel is silent | **PASS** | `approval.test.ts` |
| T19 | NIK and phone masking | **PASS** | `pii.test.ts`, `verify` |
| T20 | Revocation mid-session | **PASS** | `verify:extra`, two snapshots in the audit log |
| T21 | Lead answer is grounded and cited | **PASS** | `narrative.test.ts`, `verify:improvements` |
| T22 | Agent trace records the real pipeline | **PASS** | `agent-trace.test.ts`, `verify:improvements` |
| T23 | Handbook Example Test 2 (Rp500k vs Rp750k) | **PASS** | `onboarding.test.ts`, `verify:improvements` |
| T24 | Second scenario is answerable | **PASS** | `onboarding.test.ts` — leave, approval authority, laptop |
| T25 | Answer language follows the question | **PASS** | `narrative.test.ts`, `verify:improvements` |
| T26 | Live ingestion updates the next answer | **PASS** | `ingest.test.ts`, `verify:improvements` |
| T27 | Empty state names the owner; role still gates | **PASS** | `verify:improvements` |
| T28 | The MCP transport preserves every guarantee | **PASS** | `tests/mcp.test.ts`, `verify:mcp` — same substance, same floor, same empty, no escalation |

**28 pass, 0 fail, 0 unexercised.**

---

## 4. What failed during the build, and what changed

Recorded because a test report that only shows passes is not a test report.

| Found | Fix | Now |
|---|---|---|
| **The answer did not answer.** Section 01 was a list of document titles; a judge had to infer the cause. | Added a composed lead answer and a per-row detail sentence, both built only from authored facts with citation markers. | T21 passes; the staff answer opens with the cause, the decision and the consequence |
| **No visible agent.** The pipeline was real but invisible, so "is it agentic?" had no answer. | Added an explicit trace with per-step timings and a self-check, rendered on the answer and counted in the audit log. | T22 passes |
| **Retrieval was too broad.** One shared word pulled an entire project into a policy lookup, and the lead cited an unrelated fact. | Split story questions (whole register) from fact questions (precision + IDF weighting + floor). | Leave question returns one row, not nine |
| **Retrieval was too permissive.** "Anggaran onboarding" for a staff user returned the laptop guide — an answer to a neighbouring question. | Grounding rule: every content word must exist in data the asker can read, or the answer is "no record". | Staff gets the empty screen; manager gets Rp120.000.000 |
| **Version precedence beat recency across kinds.** A v2 SOP outranked a newer HR chat announcement, which would have failed handbook Example Test 2. | Version wins only between two documents; across kinds the newer statement wins. | T23 passes: Rp750.000, both sources cited, SOP noted as older |
| **Silent-interval gaps fired on sparse policy timelines**, reporting a 36-day "silence" between two unrelated policy documents. | The rule now runs only for story questions, and ignores intervals over 90 days. | Leave question yields zero gaps (T16) |
| **The empty screen was a dead end**, against the handbook's "direct the user to the appropriate subject-matter owner". | Added a constant project-owner block and channel to the empty state — identical for every question in the project, so it discloses nothing. | T27 passes |
| **The audit log recorded sources but not the response**, against RECORD. | Added masked, truncated response text, the thread link and the agent step count. | visible in `/audit` |
| **The project switcher was decorative.** | Replaced with a real selector, filtered to projects the actor can access. | three projects reachable |
| **T15 and T16 were implemented but had no fixture.** | Added a blocked task authored by the asker, and asserted both cases. | both PASS |
| Cancel wrote `state: 'cancelled'` onto the gap, contradicting "nothing is written anywhere" | Cancel restores `draft` and appends nothing | `T18` asserts it |
| **The MCP server was descoped**, so "how do I call this from an agent?" had no answer. | Built the stdio server over `lib/api/handlers.ts` and an `/integrations` page that prints a pasteable config. | T28 passes; 23/23 over stdio |
| **`npm start` answered 404 on every route**, because `next start` cannot serve `output: standalone`. | `scripts/start.mjs` copies `.next/static`, `public/` and `data/` into the standalone folder, then runs `server.js`. | `/ask`, `/integrations`, `/api/ask` all 200 from the production build |
| `POST /api/reset` returned 404 in production, so a live demo could not be reset | Env-gated behind `SENARAI_ALLOW_RESET=1` | returns `{"ok":true}` in the demo build |
| `Esc` did not close the source drawer, and focus was not returned to the citation | One keydown handler closes the drawer and the approval sheet; focus returns to the mark that opened it | verified in the browser run |

## 5. Not covered here

- **Accessibility** was checked by keyboard and DOM inspection during the build, not by a screen-reader pass with a person. Focus return on `Esc`, `aria-expanded` on citations, `role="dialog"` on the drawer and the approval sheet, and the 44 px hit area are in the code and were exercised in a headless browser; they have not been read aloud by VoiceOver or NVDA.
- **The demo video** is recorded separately; this file covers the software, not the recording.
- **Load and concurrency** are out of scope: one process, in-memory state, a single demo user.
- **The browser screenshots** in `shots/` are captured by `scripts/shots-new.cjs` against a running server, not asserted by a test runner.
