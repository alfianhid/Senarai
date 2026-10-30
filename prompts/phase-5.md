# Phase 5 — MCP server, audit log, i18n completion

**Day:** 5
**Goal:** The MCP server component is built. Any MCP-capable client (WorkBuddy included) can call all five Senarai tools and receive the same `AnswerPayload` the web app renders. The audit log route and UI are live. Both locales render all chrome with no hardcoded strings. All four routes work.

This phase builds the **second component** of the unified Senarai product — the MCP server. The web app (the first component) is already complete and independent from Phases 0–4. The MCP server is a parallel consumer of the same `lib/` core; it does not modify the web app. Both components share one audit log.

**Person A (data + agent surface — MCP server + audit):**

**MCP server (`mcp/server.ts` + `mcp/cli.ts`):**
- Install `@modelcontextprotocol/sdk`.
- Create `mcp/server.ts` — define five MCP tools: `senarai_ask`, `senarai_get_thread`, `senarai_approve`, `senarai_revoke_scope`, `senarai_query_audit`. Each tool's input schema is the shared `zod` schema from `app/api/schemas.ts` (Phase 0). Each tool calls the shared `handleAsk` / `handleGetThread` / etc. from `lib/api/handlers.ts`. The server contains ZERO business logic. See `backend.md` §2.1.
- Create `mcp/cli.ts` — stdio transport entry point. An MCP client (e.g. WorkBuddy) launches this as a subprocess. Pipes stdin/stdout to the MCP server.
- Create `app/api/mcp/sse/route.ts` — SSE transport for remote MCP clients. GET handler upgrades to SSE connection, serves the same tool handlers.
- Verify transport-equivalence: `senarai_ask` returns byte-identical `AnswerPayload` to `POST /api/ask` for the same input. Write a `vitest` test that calls both and deep-compares the result (excluding `createdAt` if it uses `now()` — but `canonicalEmpty` uses `FIXED_TS`, so even that should match).

**Actor resolution in the MCP server:**
- The MCP server validates `actorId` exists in `data/actors.json` before calling `lib/`. Unknown actor → canonical empty. No error message that could leak existence. See `backend.md` §2.4. The web app resolves the actor from a cookie/session, but the same `lib/access/scope.ts` produces the `ScopeSnapshot`.

**Audit log route:**
- Create `app/api/audit/route.ts` — GET handler. Calls `handleQueryAudit`. Returns `AuditEntry[]`, role-filtered (staff=own, manager=project, admin=all). Demo runs as admin.
- Create `lib/store/session.ts` audit read method — returns entries filtered by actor role.

**Person B (shell + document UI — audit UI + i18n):**

**Audit log UI:**
- Create `app/audit/page.tsx` — the `/audit` route. `AuditTable` with sticky header, `StatusPill` for decisions. `AuditFilters` (client) for decision / actor / date filtering via URL params.
- Create `components/audit/AuditTable.tsx`, `AuditRow.tsx`, `AuditFilters.tsx`, `DecisionTag.tsx`.
- The audit table is a `<table>` with `<caption>`. Columns: timestamp, actor, project, question (masked), scope snapshot id, retrieved source ids (count), decision, approvals.
- `/audit` is reachable in one click from the sidebar.

**i18n completion:**
- Complete `lib/i18n/messages.id.ts` and `messages.en.ts` — all keys from `lib/i18n/keys.ts`. Both `satisfies Catalogue`.
- Verify: no hardcoded UI string in any component. `grep -rnE '#[0-9A-Fa-f]{6}' components/` returns nothing (no raw hex values).
- Verify: the locale toggle re-labels chrome only. The answer body is not re-translated. Quotes stay verbatim.

**Shared checkpoint:**
- An MCP client (WorkBuddy, or a local tool like `mcp inspector`) can call `senarai_ask` and receive an `AnswerPayload`.
- `senarai_ask` returns canonical empty for a forbidden topic — same payload as non-existent topic (T01 holds through MCP transport).
- All four web app routes work: `/ask`, `/audit`, `/access`, and `/` (redirect) — independently, with no MCP client connected.
- Both locales (ID/EN) render all chrome with no hardcoded strings.
- The audit log is readable without explanation. A judge can open `/audit` and see the scope boundary (two entries, two snapshot ids). Entries from both the web app and MCP calls appear in the same log.

**Acceptance criteria:**
- The MCP server imports nothing from `lib/access/`, `lib/retrieval/`, `lib/answer/`, `lib/gaps/`, `lib/conflict/`, or `lib/mask/` directly. It only imports from `lib/api/handlers.ts` and `app/api/schemas.ts`. (Enforced by a test or a lint rule.)
- The web app continues to work with no MCP client connected (web-app-independence test).
- `senarai_ask` and `POST /api/ask` return byte-identical results for the same input (transport-equivalence test passes).
- `senarai_query_audit` returns role-filtered entries (admin sees all).
- The audit table has `<caption>`, sticky header, `StatusPill` for decisions.
- `vitest run lib/access/no-forbidden` passes — no `forbidden`/`denied`/`locked`/`restricted` in `components/`.
- `vitest run lib/ui/status` passes — tone set is exactly five values.
- `vitest run lib/ui/no-card` passes — `AnswerDocument` does not import `Card` or `Panel`.

**WorkBuddy workflow export:**
- Create a WorkBuddy workflow export file (JSON or YAML) containing:
  1. The MCP tool configuration (five tools, schemas, `stdio` transport endpoint).
  2. Agent instructions: when to call `senarai_ask`, how to present the answer summary, when to offer `senarai_approve` for gaps, how to handle `senarai_revoke_scope` requests, and when to link to `/ask/[threadId]` in the web app for the full structured view.
  3. The three demo scenarios as scripted sequences of tool calls.
- Note: this export describes only the MCP server component. The web app needs no export — it is opened in a browser.

**Do not do in this phase:** demo polish, accessibility pass, video recording. Those are Phase 6.
