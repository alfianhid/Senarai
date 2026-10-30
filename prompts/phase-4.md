# Phase 4 — Scope mutation, revocation, access matrix

**Day:** 4
**Goal:** Scenario 3 (live permission revocation) works. `/api/scope` mutates the session store, bumps the version, and the next answer reflects the new scope. The access matrix UI is live.

**Person A (data + agent surface):**
- Create `app/api/scope/route.ts` — POST handler. Calls `handleRevokeScope`. Body `{ actorId, projectId, tag, granted }`. Mutates session store, bumps `scopeVersion`, creates new `ScopeSnapshot`. Returns `{ scopeSnapshotId, scopeVersion, affectedSourceCount }`. See `backend.md` §5.5.
- Implement the revocation abort path: if a stream is in flight when `/api/scope` is called, the client sees the version bump in the NDJSON stream header and aborts. Partial document discarded. No leaked text in DOM. See `backend.md` §5.5, `design.md` §4.5.
- Implement scope re-resolution on rehydrate: `GET /api/threads/[threadId]` re-checks the current scope. If the thread's sources are now out of scope, return canonical empty.
- Write `vitest` test: revoked-and-re-asked session produces two audit entries with two scope snapshot ids (T20).

**Person B (shell + document UI):**
- Create `app/access/page.tsx` — the `/access` route. Permission matrix: role × topic-tag grid. `DataTable`.
- Create `components/access/PermissionMatrix.tsx`, `GrantToggle.tsx` (client — flip one grant, POST `/api/scope`), `RevokeDialog.tsx` (confirm + "takes effect on the next answer"), `ScopePreview.tsx` ("This role sees N of M sources" — admin only).
- Create `components/shell/ScopeBanner.tsx` (client) — session scope-change line. `role="status"`. Neutral chrome (`bg-subtle`, `border-border`, `text-ui-sm`). No amber, no icon, no dismiss.
- Create `components/states/StaleScopeBanner.tsx` — answer discarded by revocation.
- Wire `AnswerDocument` with an `AbortController` that listens for scope version bumps and aborts the stream.

**Shared checkpoint:**
- Scenario 3 works: manager is viewing an answer. A tag grant is revoked via `/access`. Manager re-asks. New answer is reduced. Scope-change banner appears. Audit log shows two entries with two scope snapshot ids (T20).
- If revocation lands mid-stream, the partial answer is aborted and discarded. No leaked text.
- The scope-change banner is about the session, not the content. It never says what was removed or how much.

**Acceptance criteria:**
- `POST /api/scope` increments `scopeVersion` and creates a new `ScopeSnapshot`.
- The next `POST /api/ask` reflects the new scope.
- The audit log records both scope snapshots (T20).
- The scope-change banner is `role="status"`, does not steal focus, and names no project/topic/person.
- `ScopePreview` shows correct source counts for each role.

**Do not do in this phase:** `/api/audit` route or UI, the MCP server.
