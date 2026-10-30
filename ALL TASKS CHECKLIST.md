# Senarai — ALL TASKS CHECKLIST

**Hackathon:** AI CAN DO IT Tencent Cloud Hackathon Indonesia 2026
**Deadline:** 1 November 2026, 23:59 WIB
**Team:** Two people (Person A: data + agent surface; Person B: shell + document UI)
**Architecture:** Unified product — two equal components sharing one `lib/` core and one `data/` dataset: (a) a standalone Next.js web app, fully functional on its own, and (b) an MCP server (`stdio` + SSE). WorkBuddy is one consumer of the MCP server, not the product's orchestrator.
**Deployment:** VPS (PM2 + Nginx + Next.js standalone). One codebase, one build, one PM2 ecosystem file serving both components.

---

## Day 0 — Scaffold, tokens, shell

### Person A
- [ ] Create `types/domain.ts` with all types from `frontend.md` §8
- [ ] Create `data/projects.json` — `makassar-q4` (full, code `MKQ4`) + `kenari-q3` (thin, code `KNQ3`)
- [ ] Create `data/roles.json` — staff, manager, admin
- [ ] Create `data/actors.json` — Rina (staff), Budi (manager), Admin, +1 participant
- [ ] Create `data/sources.json` — 20 sources: chat, doc, task; management-sensitivity; SOP vs chat conflict; PII source
- [ ] Create `data/audit.seed.json` — 3-4 seed entries
- [ ] Create `app/api/schemas.ts` — shared `zod` schemas (`askSchema`, `getThreadSchema`, `approveSchema`, `revokeScopeSchema`, `queryAuditSchema`)
- [ ] Agree on three demo questions with Person B

### Person B
- [ ] Scaffold Next.js 15 App Router, React 19, TypeScript `strict`
- [ ] Install Tailwind v4; create `app/globals.css` with full `@theme` block (fallback to v3.4 if friction <1hr)
- [ ] Set up `next/font/google`: Source Serif 4, Inter, IBM Plex Mono (`latin` subset)
- [ ] Create `components/ui/Surface.tsx`, `Card`, `Panel` (elevation primitives)
- [ ] Create `components/shell/AppShell.tsx` (CSS grid: 264px/72px/off-canvas)
- [ ] Create `Sidebar.tsx`, `SidebarGroup.tsx`, `SidebarItem.tsx`, `ProjectSwitcher.tsx` (client)
- [ ] Create `ThreadList.tsx`, `ThreadRow.tsx`, `IdentityBlock.tsx`
- [ ] Create `TopBar.tsx`, `Breadcrumb.tsx`, `LocaleToggle.tsx` (client), `RoleSwitcher.tsx` (client), `MenuButton.tsx` (client)
- [ ] Create `components/ui/icons.tsx` — 10 inline SVG glyphs
- [ ] Create `lib/ui/cx.ts` — 12-line class merge helper

### Shared
- [ ] Types frozen — no changes after today without a note
- [ ] Shell renders at three breakpoints (≥1280px, 900–1279px, <900px)
- [ ] `npm run dev` starts without errors
- [ ] `/` redirects to `/ask`

---

## Day 1 — Access control, retrieval, static answer

### Person A
- [ ] Create `lib/access/canRead.ts` — pure, synchronous, ~20 lines
- [ ] Create `lib/access/scope.ts` — resolve `ScopeSnapshot` for an actor
- [ ] Create `lib/access/snapshot.ts` — create/clone, increment version
- [ ] Create `lib/access/grants.ts` — mutate grant (revoke/restore)
- [ ] Create `lib/retrieval/search.ts` — project → canRead → keyword match
- [ ] Create `lib/retrieval/rank.ts` — date desc, then doc > task > chat
- [ ] Create `lib/retrieval/toCitation.ts` — Source → Citation, `canRead` defence in depth
- [ ] Create `lib/store/session.ts` — `globalThis` singleton
- [ ] Write `vitest` tests for `canRead`: project/tag/sensitivity mismatch, `'*'` grant, revocation

### Person B
- [ ] Create `components/register/RegisterPage.tsx`, `SectionHeader.tsx`
- [ ] Create `LedgerList.tsx`, `LedgerRow.tsx` (`<ol>`, 96px date sub-column)
- [ ] Create `components/answer/CitationMark.tsx` — `<button>`, 28px/44px, `aria-expanded`
- [ ] Create `components/ui/DataTable.tsx`, `DataTableRow.tsx`, `TableEmptyRow.tsx`
- [ ] Create `components/ui/StatusPill.tsx` — tint + border + label
- [ ] Create `lib/ui/status.ts` — five values only: `open`, `blocked`, `overdue`, `approved`, `cancelled`
- [ ] Render static answer from fixture inside real shell

### Shared
- [ ] `vitest run lib/access` passes
- [ ] `grep -r "forbidden\|denied\|locked\|restricted\|hidden-count" components/` returns nothing
- [ ] Chronology is `<ol>`, open items are `<table>`, `CitationMark` is `<button>`

---

## Day 2 — Composition, gaps, conflict, masking, source drawer

### Person A
- [ ] Create `lib/answer/compose.ts` — assemble `AnswerPayload` from ranked sources
- [ ] Create `lib/answer/sections.ts` — empty-section copy, "all on record" copy
- [ ] Create `lib/answer/canonicalEmpty.ts` — `Object.freeze`, no query echo, `FIXED_TS`
- [ ] Create `lib/gaps/detect.ts` — three rules: `no-cause`, `ownerless-blocked-item`, `silent-interval` (5-day)
- [ ] Create `lib/gaps/knowers.ts` — visible sources only, omit if no basis
- [ ] Create `lib/gaps/draftQuestion.ts` — one template per rule
- [ ] Create `lib/conflict/resolve.ts` — newer-version > board-over-chat > explicit-correction; tie → recency
- [ ] Create `lib/mask/pii.ts` — NIK (16 digits), phone (08... and +62...)
- [ ] Write `vitest` tests: `gaps/detect` (each rule), `conflict/resolve` (precedence), `mask/pii` (patterns)

### Person B
- [ ] Create `components/sources/SourceDrawer.tsx` — `<dialog>`, 480px/420px/full-height
- [ ] Create `DrawerHeader.tsx`, `SourceMeta.tsx`, `QuoteBlock.tsx`, `GlossLine.tsx`, `MaskedField.tsx`
- [ ] Implement `?source=S12` deep link — drawer opens on first paint
- [ ] Create `components/answer/AnswerDocument.tsx` — client, owns stream, one `Surface level={0}`
- [ ] Create `AnswerHeader.tsx`, `ChronologySection.tsx`, `OpenItemsSection.tsx`, `RecordGapsSection.tsx`
- [ ] Create `components/register/ConflictNote.tsx` — `⚑` + rule sentence on conflict tint

### Shared
- [ ] Full three-section answer renders from real data (one role, one project)
- [ ] At least one answer synthesizes chat + doc + task (T09)
- [ ] Source drawer opens via `?source=`, shows verbatim quote + masked PII
- [ ] `vitest run lib/gaps lib/conflict lib/mask` passes
- [ ] All three headings always render (empty → stated absence line, not collapsed)
- [ ] `AnswerDocument` does not import `Card` or `Panel`

---

## Day 3 — Ask API, approval gate, scenarios 1 and 2

### Person A
- [ ] Create `lib/api/handlers.ts` — `handleAsk`, `handleGetThread`, `handleApprove`, `handleRevokeScope`, `handleQueryAudit` (shared by HTTP + MCP)
- [ ] Create `lib/api/stream.ts` — NDJSON encode/decode
- [ ] Create `lib/api/latency.ts` — `withLatencyFloor`, `MIN_LATENCY_MS = 600`
- [ ] Create `lib/store/threads.ts` — store/retrieve `AnswerPayload` by `threadId`
- [ ] Create `app/api/ask/route.ts` — POST, NDJSON stream, calls `handleAsk`
- [ ] Create `app/api/approvals/route.ts` — POST, calls `handleApprove`, audit on approve only
- [ ] Write `vitest` test: forbidden vs non-existent → byte-identical canonical empty (T01)
- [ ] Write `vitest` test: latency floor ≥600ms for both (T04)

### Person B
- [ ] Create `components/answer/GapCard.tsx` — `Card`, 3px gap accent, id pill, what/why/knower/draft/button
- [ ] Create `components/answer/DraftField.tsx` — `bg-subtle`, serif, copy button
- [ ] Create `components/answer/ApprovalGate.tsx` — `<dialog>` level 3, 560px, equal-weight cancel/confirm
- [ ] Wire gate to `POST /api/approvals` — confirm → `Terkirim`, audit `Disetujui`; cancel → nothing
- [ ] Create `components/states/LoadingRegister.tsx`, `NoRecordAnswer.tsx`, `EmptyAsk.tsx`, `ErrorRegister.tsx`
- [ ] Implement NDJSON stream consumer in `AnswerDocument`

### Shared
- [ ] Scenario 1 works: two roles, same question, different answers, same shape (T06)
- [ ] Scenario 2 works: gap → knower → draft → gate → confirm → audit (T17)
- [ ] `curl` diff of forbidden vs non-existent returns nothing (T01)
- [ ] Cancel is silent — nothing written, including audit log (T18)
- [ ] `grep -r "403" app/api` returns nothing
- [ ] Approval gate is the only modal

---

## Day 4 — Scope mutation, revocation, access matrix

### Person A
- [ ] Create `app/api/scope/route.ts` — POST, calls `handleRevokeScope`, bumps version, new snapshot
- [ ] Implement revocation abort path — client sees version bump, aborts stream, discards partial
- [ ] Implement scope re-resolution on rehydrate (`GET /api/threads/[threadId]`)
- [ ] Write `vitest` test: revoked-and-re-asked → two audit entries, two snapshot ids (T20)

### Person B
- [ ] Create `app/access/page.tsx` — permission matrix
- [ ] Create `components/access/PermissionMatrix.tsx`, `GrantToggle.tsx` (client), `RevokeDialog.tsx`, `ScopePreview.tsx`
- [ ] Create `components/shell/ScopeBanner.tsx` (client) — `role="status"`, neutral chrome
- [ ] Create `components/states/StaleScopeBanner.tsx`
- [ ] Wire `AnswerDocument` with `AbortController` for scope version bumps

### Shared
- [ ] Scenario 3 works: revoke → re-ask → reduced answer → scope banner → two audit entries (T20)
- [ ] Mid-stream revocation: partial aborted, discarded, no leaked text
- [ ] Scope banner names no project/topic/person, no "N items removed"

---

## Day 5 — MCP server, audit log, i18n completion

### Person A — MCP server
- [ ] Install `@modelcontextprotocol/sdk`
- [ ] Create `mcp/server.ts` — five tools, schemas from `app/api/schemas.ts`, calls `lib/api/handlers.ts`
- [ ] Create `mcp/cli.ts` — stdio transport entry point (launched by an MCP client, e.g. WorkBuddy)
- [ ] Create `app/api/mcp/sse/route.ts` — SSE transport for remote MCP clients
- [ ] Implement actor validation: unknown `actorId` → canonical empty
- [ ] Write transport-equivalence test: `senarai_ask` vs `POST /api/ask` → byte-identical
- [ ] Verify MCP server imports only from `lib/api/handlers.ts` and `app/api/schemas.ts` (no direct `lib/` imports)
- [ ] Verify the web app still works with no MCP client connected (web-app-independence test)

### Person A — audit route
- [ ] Create `app/api/audit/route.ts` — GET, calls `handleQueryAudit`, role-filtered
- [ ] Implement audit read method in `lib/store/session.ts` — filter by role

### Person B — audit UI
- [ ] Create `app/audit/page.tsx` — `/audit` route
- [ ] Create `components/audit/AuditTable.tsx`, `AuditRow.tsx`, `AuditFilters.tsx` (client), `DecisionTag.tsx`
- [ ] Table has `<caption>`, sticky header, `StatusPill` for decisions
- [ ] `/audit` reachable in one click from sidebar

### Person B — i18n completion
- [ ] Complete `lib/i18n/messages.id.ts` and `messages.en.ts` — all keys
- [ ] Verify: no hardcoded UI string in components
- [ ] Verify: locale toggle re-labels chrome only, answer body unchanged
- [ ] Verify: `grep -rnE '#[0-9A-Fa-f]{6}' components/` returns nothing

### Shared
- [ ] An MCP client (WorkBuddy, or `mcp inspector`) can call `senarai_ask` and receive `AnswerPayload`
- [ ] MCP `senarai_ask` returns canonical empty for forbidden topic (T01 through MCP)
- [ ] All four web app routes work independently: `/ask`, `/audit`, `/access`, `/` — no MCP client connected
- [ ] Both locales render all chrome, no hardcoded strings
- [ ] The audit log shows entries from both the web app and MCP calls
- [ ] `vitest run lib/access/no-forbidden` passes
- [ ] `vitest run lib/ui/status` passes (five values)
- [ ] `vitest run lib/ui/no-card` passes

### WorkBuddy workflow export
- [ ] Create workflow export file (JSON/YAML): MCP tool config + agent instructions + demo script

---

## Day 6 — Demo polish, accessibility, tests, freeze

### Person A — demo + tests
- [ ] Run all three scenarios unattended ×3 in the web app alone (no MCP client connected), verify determinism
- [ ] Run all three scenarios through WorkBuddy via the MCP server
- [ ] `curl` diff: forbidden vs non-existent → nothing (T01)
- [ ] Repeat curl diff through MCP `senarai_ask` → nothing
- [ ] `vitest run` — all tests pass
- [ ] Take screenshots of all test results (including failures)
- [ ] Write `README.md` — two components (web app + MCP server), demo questions, role switcher, curl command, 600ms floor, mock data, VPS deploy link

### Person B — accessibility + contrast
- [ ] Keyboard test: Tab through all four routes, focus ring visible
- [ ] `CitationMark`: `aria-expanded`, `aria-label`, 44px hit area
- [ ] `SourceDrawer`: focus trap, `Esc` closes, focus returns
- [ ] `ApprovalGate`: `aria-disabled` + `aria-describedby`, keyboard-reachable
- [ ] `ScopeBanner`: `role="status"`, no focus steal
- [ ] `AnswerDocument`: `aria-busy`, `aria-live="polite"` per section
- [ ] VoiceOver test through all four routes
- [ ] Contrast check per `design.md` §6.1 — all pairs pass 4.5:1 / 3:1
- [ ] Verify `--border-strong` compensated by `--surface-subtle` fill
- [ ] Verify pills: tint + text, never border alone
- [ ] Verify motion: three transitions only, 120ms, `prefers-reduced-motion` → 0ms

### Shared — demo readiness checklist
- [ ] All three demo scenarios run live, unattended, 5–8 min
- [ ] `curl` diff of forbidden vs non-existent returns nothing
- [ ] `/audit` reachable in one click, readable without explanation
- [ ] Both locales render all chrome, no hardcoded strings
- [ ] No `Forbidden`/`AccessDenied`/`Locked`/`Restricted` component exists
- [ ] Status vocabulary test passes (five values)
- [ ] No-card test passes
- [ ] Accessibility: keyboard + VoiceOver tested
- [ ] Contrast table verified
- [ ] Demo video recorded (5–8 min)
- [ ] All three demo scenarios run end to end in the web app alone, with no MCP client connected
- [ ] WorkBuddy workflow export included
- [ ] MCP `senarai_ask` byte-identical to `POST /api/ask`
- [ ] MCP `senarai_ask` canonical empty for forbidden (T01 through MCP)
- [ ] Accountability sheet (one page) included

### Deliverables to freeze
- [ ] Project description
- [ ] Accountability sheet (one page)
- [ ] Architecture diagram (unified two-component diagram from `backend.md` §1)
- [ ] Demo video (5–8 min)
- [ ] WorkBuddy workflow export
- [ ] Product sharing notes
- [ ] Test screenshots (including failures)

---

## Post-build — VPS deployment

### Prerequisites
- [ ] VPS provisioned (Ubuntu 22.04+, 2 vCPU, 4GB RAM minimum)
- [ ] Node.js 20+ installed
- [ ] PM2 installed globally (`npm install -g pm2`)
- [ ] Nginx installed
- [ ] Domain name pointed at VPS (optional for hackathon, recommended)

### Build
- [ ] Configure `next.config.ts` with `output: 'standalone'`
- [ ] Run `npm run build` — produces `.next/standalone/` directory
- [ ] Verify `.next/standalone/server.js` exists

### Deploy
- [ ] Copy `.next/standalone/` to VPS (e.g., `/var/www/senarai/`)
- [ ] Copy `.next/static/` to `/var/www/senarai/.next/static/`
- [ ] Copy `public/` to `/var/www/senarai/public/`
- [ ] Copy `data/` to `/var/www/senarai/data/` (mock dataset)
- [ ] Copy `mcp/` to `/var/www/senarai/mcp/` (MCP server)
- [ ] Create PM2 ecosystem file (`ecosystem.config.cjs`)
- [ ] Start Next.js with PM2: `pm2 start ecosystem.config.cjs`
- [ ] Start MCP stdio process with PM2 (for local MCP clients, e.g. WorkBuddy on the demo machine)
- [ ] Configure Nginx reverse proxy → `localhost:3000`
- [ ] Enable SSL via certbot (if domain configured)
- [ ] Verify `https://<domain>/ask` loads
- [ ] Verify `https://<domain>/api/ask` responds
- [ ] Verify `https://<domain>/api/mcp/sse` upgrades to SSE

### Environment variables
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `MCP_TRANSPORT=stdio` (for local MCP clients, e.g. WorkBuddy desktop)
- [ ] `MCP_SSE_ENABLED=true` (for remote MCP clients)
- [ ] `MIN_LATENCY_MS=600`

### Health checks
- [ ] PM2 status: `pm2 status` — both processes online
- [ ] HTTP health: `curl https://<domain>/api/audit` returns 200
- [ ] Web app independence: all four routes work with no MCP client connected
- [ ] MCP health: an MCP client (WorkBuddy) connects and `senarai_query_audit` returns entries

### Rollback
- [ ] Keep previous `.next/standalone/` backup on VPS
- [ ] Rollback: `pm2 stop senarai && pm2 stop senarai-mcp`, swap directory, `pm2 start ecosystem.config.cjs`
