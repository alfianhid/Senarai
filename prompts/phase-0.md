# Phase 0 — Scaffold, tokens, shell

**Day:** 0 (full day)
**Goal:** Project scaffolded, design tokens live, application shell rendering at three breakpoints. Types frozen. Both people agree on the three demo questions.

**Person A (data + agent surface):**
- Create `types/domain.ts` with all types from `frontend.md` §8: `Locale`, `RoleId`, `SourceKind`, `Sensitivity`, `Project` (incl. `code`), `Source`, `Citation` (incl. `gloss?`), `ConflictNote`, `ChronologyEvent`, `OpenItemStatus`, `OpenItem`, `Knower`, `RecordGap`, `ApprovalRequest`, `ScopeSnapshot`, `AnswerPayload`, `AuditEntry`, `ThreadSummary`.
- Create `data/projects.json` — two projects: `makassar-q4` (fully authored, code `MKQ4`) and `kenari-q3` (thin, code `KNQ3`, proves scope filtering).
- Create `data/roles.json` — staff, manager, admin.
- Create `data/actors.json` — at least 4 actors: Rina (staff), Budi (manager), Admin (admin), and one more participant.
- Create `data/sources.json` — first 20 sources covering chat, doc, and task kinds. Include at least one management-sensitivity source per project. Include the SOP vs chat conflict (Example Test 2). Include a source with PII (NIK, phone) for masking.
- Create `data/audit.seed.json` — 3-4 seed entries for the `/audit` demo.
- Add `zod` schemas in `app/api/schemas.ts` for `askSchema`, `getThreadSchema`, `approveSchema`, `revokeScopeSchema`, `queryAuditSchema`. These are the single source of truth shared by the web app's HTTP routes (Phase 3–4) and the MCP server (Phase 5) — both components of the unified Senarai product.

**Person B (shell + document UI):**
- Scaffold Next.js 15 App Router, React 19, TypeScript `strict`.
- Install Tailwind v4. Create `app/globals.css` with the full `@theme` block from `frontend.md` §4.2 — neutral ramp, surfaces, text/borders, primary, signal hues, elevation shadows, radius, type scale, focus ring. If v4 causes friction in the first hour, fall back to v3.4 with `tailwind.config.ts`. Do not spend more than one hour.
- Set up `next/font/google`: Source Serif 4, Inter, IBM Plex Mono. `latin` subset only. `display: swap`.
- Create `components/ui/Surface.tsx` (elevation primitive, §4.3), `Card` (level 1 alias), `Panel` (level 2 alias).
- Create `components/shell/AppShell.tsx` — CSS grid: `264px 1fr` at ≥1280px, `72px 1fr` at 900–1279px, single column below 900px.
- Create `components/shell/Sidebar.tsx`, `SidebarGroup.tsx`, `SidebarItem.tsx`, `ProjectSwitcher.tsx` (client), `ThreadList.tsx`, `ThreadRow.tsx`, `IdentityBlock.tsx`.
- Create `components/shell/TopBar.tsx`, `Breadcrumb.tsx`, `LocaleToggle.tsx` (client), `RoleSwitcher.tsx` (client), `MenuButton.tsx` (client).
- Create `components/ui/icons.tsx` — 10 inline SVG glyphs: `ask`, `audit`, `access`, `thread`, `chevron-down`, `chevron-right`, `close`, `copy`, `menu`, `flag`. 16px, 1.5px stroke, `currentColor`.
- Create `lib/ui/cx.ts` — 12-line class merge helper.

**Shared checkpoint:**
- Types frozen. No type changes after Day 0 without a note.
- Shell renders at three breakpoints: ≥1280px (expanded), 900–1279px (collapsed rail), <900px (off-canvas).
- Both people agree on the three demo questions:
  1. "Kenapa stok terlambat di Makassar?" (causal — triggers `no-cause` gap)
  2. "Apa status tugas konfirmasi vendor?" (open items focus)
  3. "Berapa denda keterlambatan vendor?" (conflict — SOP vs chat)

**Acceptance criteria:**
- `npm run dev` starts without errors.
- `/` redirects to `/ask`.
- The shell renders at all three breakpoints with no layout shift.
- `types/domain.ts` compiles with `strict: true`.
- `data/*.json` files parse and pass `zod` validation at import in dev.
- No icon package installed. No component library installed.

**Do not do in this phase:** answer components, API routes, `lib/` business logic, the MCP server.
