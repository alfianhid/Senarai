# Phase 1 — Access control, retrieval, static answer

**Day:** 1
**Goal:** `canRead` works and is tested. Keyword search filters by permission before ranking. A static answer renders from a fixture inside the real shell.

**Person A (data + agent surface):**
- Create `lib/access/canRead.ts` — the one function everything hangs on. Pure, synchronous, ~20 lines. Project check → tag check → sensitivity check. See `backend.md` §5.1.
- Create `lib/access/scope.ts` — resolve a `ScopeSnapshot` for an actor. Read from `data/actors.json` and `data/roles.json`.
- Create `lib/access/snapshot.ts` — create/clone a snapshot, increment version.
- Create `lib/access/grants.ts` — mutate a grant (revoke/restore).
- Create `lib/retrieval/search.ts` — filter sources by project, then `canRead`, then keyword/tag match. See `backend.md` §6.1.
- Create `lib/retrieval/rank.ts` — sort by date descending, then kind precedence (doc > task > chat). See `backend.md` §6.2.
- Create `lib/retrieval/toCitation.ts` — convert `Source` to `Citation` with sequential `marker`. Call `canRead` again here (defence in depth).
- Create `lib/store/session.ts` — `globalThis` singleton. Store scope snapshots, audit log, threads. See `backend.md` §4.2.
- Write `vitest` tests for `canRead`: project mismatch, tag mismatch, sensitivity mismatch, `'*'` grant, revocation. See `frontend.md` §8.1.

**Person B (shell + document UI):**
- Create `components/register/RegisterPage.tsx` — page-level wrapper, max-width 1240px.
- Create `components/register/SectionHeader.tsx` — serif heading, index numeral in mono, 2px `border-strong` (sections 1–2) or 1px dashed `border-gap` (section 3).
- Create `components/register/LedgerList.tsx`, `LedgerRow.tsx` — `<ol>` of chronology. 96px date sub-column in mono.
- Create `components/answer/CitationMark.tsx` — `<button>` chip, mono `[n]`, 28px visual / 44px hit area, `aria-expanded`.
- Create `components/ui/DataTable.tsx`, `DataTableRow.tsx`, `TableEmptyRow.tsx`.
- Create `components/ui/StatusPill.tsx` — 22px pill, tint + border + label. Tone from `lib/ui/status.ts` only.
- Create `lib/ui/status.ts` — `statusTone` map for `OpenItemStatus | ApprovalRequest['state'] | AuditEntry['decision']`. Closed set of five: `open`, `blocked`, `overdue`, `approved`, `cancelled`.
- Render a static answer from a hardcoded fixture inside the real shell to verify the document layout.

**Shared checkpoint:**
- `canRead` unit tests pass.
- A static three-section answer renders from a fixture inside `RegisterPage` inside `AppShell`.
- The chronology is an `<ol>`, open items are a `<table>`.
- `CitationMark` is a `<button>`, not a `<span>`.

**Acceptance criteria:**
- `vitest run lib/access` passes all `canRead` tests.
- `grep -r "forbidden\|denied\|locked\|restricted\|hidden-count" components/` returns nothing.
- The status pill vocabulary is exactly five values.

**Do not do in this phase:** `compose`, gap detection, conflict resolution, PII masking, API routes, the MCP server.
