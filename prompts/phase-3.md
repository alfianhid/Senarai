# Phase 3 — Ask API, approval gate, scenarios 1 and 2

**Day:** 3
**Goal:** `POST /api/ask` streams NDJSON. Canonical empty and latency floor work. Approval gate opens and closes. Scenario 1 (two roles) and Scenario 2 (gap + gate) run end to end.

**Person A (data + agent surface):**
- Create `app/api/ask/route.ts` — POST handler. Calls `handleAsk` (in `lib/api/handlers.ts`). Streams NDJSON section-by-section. Appends thread + audit draft. See `backend.md` §3.2.
- Create `lib/api/handlers.ts` — `handleAsk`, `handleGetThread`, `handleApprove`, `handleRevokeScope`, `handleQueryAudit`. These are the shared functions called by both the web app's HTTP routes and the MCP server (Phase 5). One core, two components. See `backend.md` §3.3.
- Create `lib/api/stream.ts` — NDJSON encode/decode helpers.
- Create `lib/api/latency.ts` — `withLatencyFloor` wrapper. `MIN_LATENCY_MS = 600`. See `backend.md` §5.3.
- Create `lib/store/threads.ts` — store and retrieve `AnswerPayload` by `threadId`.
- Create `app/api/approvals/route.ts` — POST handler. Calls `handleApprove`. Appends audit entry on approve only. Cancel writes nothing.
- Write `vitest` test: forbidden topic and non-existent topic return byte-identical canonical empty. This is Example Test 1 (T01).
- Write `vitest` test: latency floor — both forbidden and normal queries take ≥600ms (T04).

**Person B (shell + document UI):**
- Create `components/answer/GapCard.tsx` — `Card` with 3px `border-l-gap` accent. Gap id pill, "what is missing", why it matters, knower, drafted question field, `Tinjau & setujui` button.
- Create `components/answer/DraftField.tsx` — `bg-subtle` verbatim draft, serif, copy button.
- Create `components/answer/ApprovalGate.tsx` — `<dialog>` at `Surface level={3}`, 560px. Recipient, question text, gap id, "nothing sent yet". Confirm disabled until question field focused/scrolled (200ms friction). Cancel and confirm equal size/weight. Simulated note at foot.
- Wire `ApprovalGate` to `POST /api/approvals`. On confirm: gap status → `Terkirim — menunggu balasan`, audit row → `Disetujui`. On cancel: nothing written.
- Create `components/states/LoadingRegister.tsx`, `NoRecordAnswer.tsx`, `EmptyAsk.tsx`, `ErrorRegister.tsx`.
- Implement the NDJSON stream consumer in `AnswerDocument` — append sections as they arrive. Chronology first.

**Shared checkpoint:**
- Scenario 1 works: staff and manager both ask "Kenapa stok terlambat di Makassar?" Manager sees management-only sources. Staff does not. Both answers have identical three-section shape. Staff answer gives no hint (T06).
- Scenario 2 works: the question reveals a gap (no-cause), names Rina as knower, drafts a question, user opens gate, reviews, confirms. Gap status changes. Audit log records `Disetujui` (T17).
- `curl` diff of forbidden vs non-existent responses returns nothing (T01).
- Cancel is silent — nothing written, including the audit log (T18).

**Acceptance criteria:**
- `POST /api/ask` returns HTTP 200 for all cases (forbidden, non-existent, answered).
- `grep -r "403" app/api` returns nothing.
- The canonical empty has no query echo, names no project/topic/person.
- The 600ms latency floor applies to all `/api/ask` responses.
- The approval gate is the only modal in the product.
- Cancel and confirm are the same size, height, radius, and type weight.

**Do not do in this phase:** `/api/scope`, `/api/audit`, the MCP server.
