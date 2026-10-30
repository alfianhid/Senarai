# Senarai — Frontend Build Guide

**Target:** a working Next.js + Tailwind application, buildable by two people before 1 November 2026.
**Component role:** This document covers the **Senarai Web App** — the standalone Next.js application that is one of Senarai's two equal components (the other is the MCP server, covered in `backend.md`). The web app is fully functional on its own: every demo scenario runs end to end in the browser with no MCP client connected. It is the trusted surface and the system of record.
**Companion document:** `DESIGN.md` (rationale, tokens, copy). Where this document and `DESIGN.md` overlap — token values, route names, component names, type names — `DESIGN.md` is the authority on *why*, this document is the authority on *how*, and the names must match in both.

Read `DESIGN.md` §2 for the token system (§2.1 elevation, §2.2 palette, §2.3 type scale, §2.8 sidebar spec) and §5.1 for the bilingual model before starting. Nothing in this file restates the design argument.

---

## 1. Constraints that drive the build

| Constraint | Consequence |
|---|---|
| Two people, ~6 working days | No state library, no component library, no ORM, no test framework beyond `vitest` for the pure functions |
| The shell now costs real time | A grouped sidebar, breadcrumb top bar, elevation primitives and table craft are ~0.75–1 day of the two-person budget. Budgeted on Day 0 and Day 1, not discovered on Day 5 (§13) |
| Judged on agent design and orchestration, not code depth | The UI must *show* the decision points; it does not need to be production-hardened. The web app is one of two product components — it stands on its own, and the MCP server (built in Phase 5) is a parallel consumer of the same `lib/` core, not a dependency of the web app |
| Mock data only, no real integrations | Dataset is a static JSON tree; "send" is simulated and labelled as such |
| Demo must run live, unattended, for 5–8 minutes | Deterministic paths, seeded store, no network flakiness, no model latency on the critical demo beat |
| Judges open the audit log themselves | `/audit` must be reachable in one click and readable without explanation |

---

## 2. Stack

| Layer | Choice | Justification |
|---|---|---|
| Framework | Next.js 15, App Router, React 19, TypeScript `strict` | Server components keep the answer document and the sidebar server-rendered; route handlers give one place for the ask API |
| Styling | Tailwind CSS v4 with a `@theme` block | Tokens live in one CSS file and carry the same suffixes as `DESIGN.md` §2.2–2.3. If the v4 plugin causes friction in the first hour, fall back to v3.4 with `tailwind.config.ts` — do not spend more than one hour |
| Fonts | `next/font/google`: Source Serif 4, Inter, IBM Plex Mono | Self-hosted at build, no runtime request, no layout shift. Subset `latin` only |
| Validation | `zod` | Validate the mock dataset at import in dev. A malformed fixture at 02:00 is a demo-ending bug |
| i18n | Hand-rolled catalogue in `lib/i18n` (~100 lines) | Chrome-only translation means no plural machinery beyond `Intl`. One extra key group for nav and status vocabulary |
| State | React context + `useReducer` + URL search params | Three client state atoms (locale, actor, open source). The sidebar needs none: active state comes from `usePathname` in a server component |
| Icons | Inline SVG, ten glyphs in `components/ui/icons.tsx` | `ask`, `audit`, `access`, `thread`, `chevron-down`, `chevron-right`, `close`, `copy`, `menu`, `flag`. 16px, 1.5px stroke, `currentColor`. No icon package — it would cost more JS than ten hand-written paths |
| Tests | `vitest` on `lib/access`, `lib/gaps`, `lib/mask`, `lib/conflict`, `lib/ui/status` | These are the claims judges probe. Pure functions, no DOM |

**Explicitly not installed:** Prisma/any DB, tRPC, Redux/Zustand, shadcn/ui, Radix, Framer Motion, `lucide-react` or any icon package, `date-fns` (use `Intl`), `tailwind-merge` or `clsx` (one 12-line `cx` helper in `lib/ui/cx.ts`), any chart library, any auth library.

---

## 3. File and folder structure

```
app/
  layout.tsx                        root: fonts, <html lang>, ThemeVars
  page.tsx                          redirect('/ask')
  globals.css                       @theme: palette, elevation, radius, type scale (§4)
  (workspace)/
    layout.tsx                      AppShell + LocaleProvider + ActorProvider
    ask/
      page.tsx                      empty ask surface
      [threadId]/page.tsx           answer document, reads ?source= and ?gap=
    audit/page.tsx                  audit log table + filters
    access/page.tsx                 permission matrix + revocation
  api/
    ask/route.ts                    POST → NDJSON stream
    threads/[threadId]/route.ts     GET → AnswerPayload (rehydrate)
    approvals/route.ts              POST → append audit entry, return new gap state
    scope/route.ts                  POST → revoke/restore a grant, returns new snapshot
    audit/route.ts                  GET → AuditEntry[] (scoped)
components/
  shell/     AppShell, Sidebar, SidebarGroup, SidebarItem, ProjectSwitcher, ThreadList,
             ThreadRow, IdentityBlock, TopBar, Breadcrumb, LocaleToggle, RoleSwitcher,
             MenuButton, ScopeBanner
  ui/        Surface, Card, Panel, StatusPill, DataTable, DataTableRow, TableEmptyRow,
             IconButton, icons.tsx
  register/  RegisterPage, SectionHeader, LedgerList, LedgerRow, CitationMark, ConflictNote, Rule
  answer/    AnswerDocument, AnswerHeader, ChronologySection, OpenItemsSection,
             RecordGapsSection, GapCard, DraftField, ApprovalGate
  sources/   SourceDrawer, DrawerHeader, SourceMeta, QuoteBlock, GlossLine, MaskedField
  audit/     AuditTable, AuditRow, AuditFilters, DecisionTag
  access/    PermissionMatrix, GrantToggle, RevokeDialog, ScopePreview
  states/    LoadingRegister, NoRecordAnswer, EmptyAsk, ErrorRegister, StaleScopeBanner
lib/
  access/     canRead.ts, scope.ts, snapshot.ts, grants.ts
  retrieval/  search.ts, rank.ts, toCitation.ts
  answer/     compose.ts, canonicalEmpty.ts, sections.ts
  gaps/       detect.ts, draftQuestion.ts, knowers.ts
  conflict/   resolve.ts
  mask/       pii.ts
  ui/         cx.ts, status.ts (closed status vocabulary + tone map)
  i18n/       messages.id.ts, messages.en.ts, keys.ts, provider.tsx, format.ts
  store/      session.ts (globalThis singleton), threads.ts
  api/        stream.ts (NDJSON encode/decode), latency.ts
data/
  sources.json  projects.json  roles.json  actors.json  audit.seed.json
types/
  domain.ts     messages.ts (derived from keys.ts)
```

Rules: nothing in `lib/` imports React. Nothing in `components/` reads `data/` directly. Route handlers and server components are the only data entry points. Nothing in `components/shell/` imports from `components/answer/` — the shell must not know what the document contains.

---

## 4. Tokens

### 4.1 Naming rule

`DESIGN.md` writes tokens as CSS custom properties (`--ink`, `--elev-1`). In Tailwind v4 the same token appears in the `@theme` block under a namespace prefix, and **the suffix is never renamed**: `--ink` → `--color-ink`, `--elev-1` → `--shadow-e1`, `--text-body` → `--text-body`, `--radius-md` → `--radius-md`. A reviewer can map any utility class back to a `DESIGN.md` token by reading its suffix.

### 4.2 `app/globals.css`

```css
@import "tailwindcss";

@theme {
  /* ── Neutral ramp (DESIGN.md §2.2) ─────────────────────────── */
  --color-n-0:   #FFFFFF;  --color-n-25:  #FDFCFA;
  --color-n-50:  #FAF8F4;  --color-n-100: #F4F1EA;
  --color-n-200: #E8E3D9;  --color-n-300: #CFC7B8;
  --color-n-400: #B3AA9A;  --color-n-500: #8C8375;
  --color-n-600: #6B6357;  --color-n-700: #4A443B;
  --color-n-800: #2E2A24;  --color-n-900: #1A1713;

  /* ── Surfaces ─────────────────────────────────────────────── */
  --color-app:      #FAF8F4;   /* --bg-app          */
  --color-surface:  #FFFFFF;   /* --surface         */
  --color-subtle:   #FAF8F4;   /* --surface-subtle  */
  --color-overlay:  #FFFFFF;   /* --surface-overlay */

  /* ── Text and borders ─────────────────────────────────────── */
  --color-ink:          #1A1713;
  --color-ink-secondary:#4A443B;
  --color-ink-muted:    #6B6357;
  --color-ink-inverse:  #FFFFFF;
  --color-border-subtle:#EDE8DE;
  --color-border:       #E1DCD1;
  --color-border-strong:#CFC7B8;

  /* ── Primary ──────────────────────────────────────────────── */
  --color-primary:      #14564F;
  --color-primary-hover:#0E413C;
  --color-primary-tint: #E7F0EE;
  --color-primary-border:#BFD8D3;
  --color-on-primary:   #FFFFFF;

  /* ── Semantic signals ─────────────────────────────────────── */
  --color-conflict:        #8A5A12;
  --color-conflict-tint:   #FBF0DC;
  --color-conflict-border: #EBD5AC;
  --color-gap:             #8C2F39;
  --color-gap-tint:        #FBEDEE;
  --color-gap-border:      #F0CFD3;
  --color-open:            #4A443B;   /* neutral pill text, on --color-n-100 */
  --color-focus:           #2563C7;

  /* ── Elevation (DESIGN.md §2.1) ───────────────────────────── */
  --shadow-e1: 0 1px 2px rgb(26 23 19 / .04), 0 1px 3px rgb(26 23 19 / .06);
  --shadow-e2: 0 2px 4px rgb(26 23 19 / .04), 0 8px 16px -4px rgb(26 23 19 / .08);
  --shadow-e3: 0 8px 24px -4px rgb(26 23 19 / .12), 0 24px 48px -12px rgb(26 23 19 / .16);
  --shadow-e0: none;

  /* ── Radius ───────────────────────────────────────────────── */
  --radius-xs: 4px;   --radius-sm: 6px;
  --radius-md: 8px;   --radius-lg: 12px;
  --radius-xl: 14px;  --radius-pill: 999px;

  /* ── Type scale (DESIGN.md §2.3) ──────────────────────────── */
  --font-serif: var(--font-source-serif), Georgia, serif;
  --font-sans:  var(--font-inter), system-ui, sans-serif;
  --font-mono:  var(--font-plex-mono), ui-monospace, monospace;

  --text-display: 36px;   --text-display--line-height: 1.12;
  --text-display--letter-spacing: -0.02em;  --text-display--font-weight: 600;
  --text-h1: 28px;        --text-h1--line-height: 1.2;
  --text-h1--letter-spacing: -0.01em;       --text-h1--font-weight: 600;
  --text-h2: 20px;        --text-h2--line-height: 1.3;   --text-h2--font-weight: 600;
  --text-h3: 17px;        --text-h3--line-height: 1.35;  --text-h3--font-weight: 600;
  --text-body: 16.5px;    --text-body--line-height: 1.65;
  --text-body-sm: 15px;   --text-body-sm--line-height: 1.55;
  --text-ui: 14px;        --text-ui--line-height: 1.45;  --text-ui--font-weight: 500;
  --text-ui-sm: 13px;     --text-ui-sm--line-height: 1.4;
  --text-label: 12px;     --text-label--line-height: 1.3;
  --text-label--letter-spacing: 0.04em;     --text-label--font-weight: 500;
  --text-caption: 12.5px; --text-caption--line-height: 1.45;
  --text-mono: 12.5px;    --text-mono--line-height: 1.4;
  --text-mono-sm: 12px;   --text-mono-sm--line-height: 1.35;

  /* ── Layout ───────────────────────────────────────────────── */
  --spacing-sidebar: 264px;
  --spacing-sidebar-collapsed: 72px;
  --spacing-topbar: 56px;
  --spacing-drawer: 480px;
  --spacing-measure: 68ch;
}

@layer base {
  html { background: var(--color-app); }
  body {
    color: var(--color-ink);
    font-family: var(--font-sans);
    font-size: var(--text-ui);
    -webkit-font-smoothing: antialiased;
  }
  /* Numbers and ids are always tabular — DESIGN.md §2.3 */
  .font-mono, [data-num] { font-variant-numeric: tabular-nums; }
  :focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
    border-radius: var(--radius-xs);
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { transition-duration: 0ms !important; }
  }
}
```

No other global CSS. Every component styles itself with utilities that resolve to these tokens; a raw hex value in a component is a review failure (`grep -rnE '#[0-9A-Fa-f]{6}' components/` must return nothing).

### 4.3 Elevation primitives

`components/ui/Surface.tsx` is the only place `shadow-e*` and `rounded-*` appear together. Everything raised goes through it.

```ts
type Elevation = 0 | 1 | 2 | 3;
type SurfaceProps = {
  level?: Elevation;          // default 0
  as?: 'div' | 'section' | 'aside' | 'article';
  padded?: boolean;           // default true → p-5 (20px); false → p-0
  className?: string;
  children: React.ReactNode;
};
```

| `level` | Classes emitted | Used by |
|---|---|---|
| `0` | `bg-surface rounded-md border border-border-subtle` | `AnswerDocument` region, `DataTable` container |
| `1` | `bg-surface rounded-md border border-border shadow-e1` | `GapCard`, `ConflictNote`, `ProjectSwitcher` button |
| `2` | `bg-overlay rounded-lg border border-border shadow-e2` | `SourceDrawer`, `Sidebar` at ≥1280px, audit filter bar |
| `3` | `bg-overlay rounded-xl border border-border-strong shadow-e3` | `ApprovalGate`, `ProjectSwitcher` menu |

`Card` is `Surface level={1}` with `as="article"` — a named alias so that "card" reads as an intentional object in the JSX. `Panel` is `Surface level={2}`. Neither has its own styles.

**Invariant, enforced by test:** `AnswerDocument` renders `<Surface level={0}>` and contains exactly one. No component under `components/answer/` may use `level={2}` or `level={3}` except `ApprovalGate`. `lib/ui/no-card.test.ts` asserts that `answer/AnswerDocument.tsx` does not import `Card` or `Panel`.

---

## 5. Route map

| Route | Type | Renders | Reads | Writes |
|---|---|---|---|---|
| `/` | server | Redirect to `/ask` | — | — |
| `/ask` | server | `EmptyAsk` + composer | active project from cookie | — |
| `/ask/[threadId]` | server shell + client stream | `AnswerDocument` | `?source=` opens drawer, `?gap=` scrolls to a gap | — |
| `/audit` | server | `AuditTable` | `?decision=&actor=&from=` | — |
| `/access` | server | `PermissionMatrix` | `?role=` | via `/api/scope` |
| `POST /api/ask` | handler | NDJSON stream | body `{ question, projectId, actorId, locale }` | appends thread + audit draft |
| `GET /api/threads/[threadId]` | handler | `AnswerPayload` | — | — |
| `POST /api/approvals` | handler | `{ gap, auditEntry }` | body `{ gapId, action: 'approve' \| 'cancel' }` | appends audit entry on approve only |
| `POST /api/scope` | handler | `{ snapshot }` | body `{ actorId, projectId, tag, granted }` | mutates session store, bumps `scopeVersion` |
| `GET /api/audit` | handler | `AuditEntry[]` | scope-filtered by actor | — |

Route names are unchanged by the visual direction. Deep-link contract unchanged: `/ask/[threadId]?source=S12` opens the drawer on first paint (server passes the param down; the drawer renders open).

---

## 6. Shell components

The shell is server-rendered end to end. No shell component is `'use client'` except `LocaleToggle`, `RoleSwitcher`, `ProjectSwitcher` (menu open state), `MenuButton` (off-canvas open state), and `SidebarItem` **only** if it needs a hover tooltip in collapsed mode — otherwise it stays server.

| Component | Kind | Responsibility | Key props |
|---|---|---|---|
| `AppShell` | server | CSS grid: `264px 1fr` at ≥1280px, `72px 1fr` at 900–1279px, single column below 900px. Owns the top bar row and the scroll container | `children`, `collapsed` |
| `Sidebar` | server | `<nav aria-label>`; composes switcher, groups, threads, identity. `border-r border-border`, `bg-surface` | `projects`, `activeProject`, `threads`, `actor`, `activePath`, `collapsed` |
| `SidebarGroup` | server | `<div role="group" aria-labelledby>` + `--text-label` heading + 2px item gap | `labelKey`, `id`, `children` |
| `SidebarItem` | server | 40px row: 16px icon, label, optional trailing mono count. Emits `aria-current="page"`, `bg-primary-tint`, and the 3px `bg-primary` accent bar as an absolutely positioned `<span>` | `href`, `icon`, `labelKey`, `count?`, `active` |
| `ProjectSwitcher` | client | 56px top block: project name, mono `code`, chevron. Opens `Surface level={3}` menu of projects | `projects`, `activeId`, `collapsed` |
| `ThreadList` | server | Max 8 `ThreadRow`, grouped by `Hari ini` / `Minggu ini` / `Lebih awal` | `threads`, `activeThreadId` |
| `ThreadRow` | server | 44px: mono date (44px fixed), one-line truncated question. Active row uses the `SidebarItem` active treatment | `thread`, `active` |
| `IdentityBlock` | server | 64px bottom block: name (`text-ui`), role as plain text (`text-ui-sm` muted), chevron. No avatar, no initials circle, no role colour | `actor` |
| `TopBar` | server | 56px, sticky, `bg-surface border-b border-border`: `MenuButton` (≤900px), `Breadcrumb`, spacer, `LocaleToggle`, divider, identity text | `crumbs`, `locale`, `actor` |
| `Breadcrumb` | server | `Proyek / Makassar Q4 / Tanya`. Non-final segments `text-ui-sm text-ink-muted`, final `text-ink` | `crumbs: Array<{ labelKey \| label, href? }>` |
| `LocaleToggle` | client | Segmented `ID / EN`, 28px, `bg-n-100` track, active segment `bg-surface shadow-e1`. Writes cookie, `router.refresh()` | `locale` |
| `RoleSwitcher` | client | Demo-only actor impersonation for judging; lives in the identity block menu | `actors`, `actorId` |
| `MenuButton` | client | 32px `IconButton` opening the off-canvas sidebar below 900px | `onOpen` |
| `ScopeBanner` | client | Session scope-change line, `role="status"`, neutral chrome, no icon | `changedAt` |

Sidebar spec values are fixed in `DESIGN.md` §2.8 — 264px / 72px / 40px item height / 12px padding / 8px radius / 3px accent bar / 2px item gap / 120ms colour transition. Do not re-derive them here.

Collapsed behaviour: below 1280px the rail is 72px, labels are removed from the DOM (not `sr-only`) and each item keeps `aria-label`; tooltips render on hover **and** focus. Below 900px the sidebar becomes an off-canvas drawer with a scrim and is not in the tab order until opened.

---

## 7. Component inventory

| Component | Kind | Responsibility | Key props |
|---|---|---|---|
| `Surface` | server | Elevation primitive (§4.3) | `level`, `as`, `padded`, `className` |
| `Card` / `Panel` | server | Named aliases of `Surface` at level 1 / 2 | `className`, `children` |
| `RegisterPage` | server | Page-level wrapper: max-width 1240px, page padding, optional page header | `title`, `eyebrow`, `actions`, `children` |
| `SectionHeader` | server | `--text-h2` serif heading, index numeral in mono, 2px `border-strong` (sections 1–2) or 1px dashed `border-gap` (section 3) | `index`, `labelKey`, `variant` |
| `LedgerList` / `LedgerRow` | server | `<ol>` of chronology; 96px date sub-column in mono, 1px `border-subtle` between rows, `hover:bg-n-25` | `events` |
| `CitationMark` | client | `<button>` chip: mono, `bg-n-100`, `rounded-xs`, 28px visual / 44px hit area, `aria-expanded` | `marker`, `citation`, `open` |
| `ConflictNote` | server | `⚑` + label + rule sentence on the conflict tint, `Surface level={1}` | `note`, `citations` |
| `AnswerDocument` | client | Owns the stream, composes the three sections inside one `Surface level={0}` | `initial: AnswerPayload`, `threadId` |
| `AnswerHeader` | server | Restated question (`text-h1` serif), scope note, version, timestamp in mono | `answer` |
| `ChronologySection` | server | Section 1 + single-row fallback | `events` |
| `OpenItemsSection` | server | Section 2 as a `DataTable` | `items` |
| `RecordGapsSection` | server | Section 3, dashed `border-gap` rule, gap blocks, "all on record" fallback | `gaps` |
| `GapCard` | client | Gap anatomy per `DESIGN.md` §4.2; `Card` with `border-l-[3px] border-l-gap` | `gap`, `onReview` |
| `DraftField` | client | `bg-subtle border border-border rounded-sm` verbatim draft, serif, copy button | `text` |
| `ApprovalGate` | client | `<dialog>` at `level={3}`, 560px; recipient, text, gap id, equal-weight cancel/confirm, simulated note | `gap`, `onDecide` |
| `SourceDrawer` | client | `<dialog>` `Panel` 480px; header, metadata, quote, gloss, mask reason, why-cited | `citation`, `onClose` |
| `DrawerHeader` | server | 56px sticky: kind pill + `IconButton` close | `kind`, `onClose` |
| `SourceMeta` | server | `bg-subtle` two-column definition list, keys `text-label`, values mono | `source` |
| `QuoteBlock` | server | Serif quote with the cited span marked by a 2px primary left rule | `quote`, `span` |
| `GlossLine` | server | `gloss` in mono + secondary text; never generated at runtime | `text` |
| `MaskedField` | server | `••••` + reason label | `reasonKey` |
| `DataTable` | server | `<table>` in `Surface level={0}`; `border-collapse: separate`, sticky header at `top-0 z-10 bg-subtle` | `caption`, `head`, `children`, `sticky?` |
| `DataTableRow` | server | 44px min, 1px `border-subtle` between rows, `hover:bg-n-25`, `scroll-mt-12` | `children` |
| `TableEmptyRow` | server | Full-width 44px cell with `text-ui-sm text-ink-muted` | `colSpan`, `messageKey` |
| `StatusPill` | server | 22px pill: tint + matching border + label. Tone from `lib/ui/status.ts` only | `tone`, `labelKey` |
| `IconButton` | client | 32px square, `rounded-sm`, hover `bg-n-100`, always visible on focus and `@media (hover: none)` | `icon`, `labelKey`, `onClick` |
| `AuditTable` / `AuditRow` | server | `<table>` with `<caption>`, sticky header, `StatusPill` for decisions | `entries` |
| `AuditFilters` | client | decision / actor / date, URL params, in a `Surface level={2}` bar | `current` |
| `DecisionTag` | server | Maps `AuditEntry.decision` → `StatusPill` tone; the only decision→tone mapping | `decision` |
| `PermissionMatrix` | server | Role × topic-tag grid, `DataTable` | `roles`, `projects` |
| `GrantToggle` | client | Flip one grant, POST `/api/scope` | `roleId`, `projectId`, `tag` |
| `RevokeDialog` | client | Confirm + "takes effect on the next answer" | `grant` |
| `ScopePreview` | server | "This role sees N of M sources" — admin only | `snapshot` |
| `LoadingRegister` | server | Three section shells on one `Surface level={0}`, mono status line, no shimmer | — |
| `NoRecordAnswer` | server | Canonical empty; identical for both causes; no illustration, no tint, no icon | — |
| `EmptyAsk` | server | First-run composer prompt | — |
| `ErrorRegister` | server | Same document frame + retry | `onRetry` |
| `StaleScopeBanner` | client | Answer discarded by revocation | `at` |

Note there is **no** `Forbidden`, `AccessDenied`, `Locked`, or `Restricted` component, and no `StatusPill` tone for a permission state. `lib/access/no-forbidden.test.ts` asserts that no file under `components/` matches `/forbidden|denied|locked|restricted|hidden-count/i`. `lib/ui/status.test.ts` asserts the tone set is exactly `open | blocked | overdue | approved | cancelled`. The tests are the enforcement; the absence is the feature.

---

## 8. Domain models

`types/domain.ts`. These names are used verbatim in `DESIGN.md` §4 and §8. Only the fields marked **new** are affected by the visual direction; everything else is unchanged and should not be touched.

```ts
export type Locale = 'id' | 'en';
export type RoleId = 'staff' | 'manager' | 'admin';
export type SourceKind = 'chat' | 'doc' | 'task';
export type Sensitivity = 'general' | 'management';

export interface Project {
  id: string;                 // 'makassar-q4'
  code: string;               // NEW — 'MKQ4', mono, shown in the collapsed switcher (DESIGN.md A14)
  nameKey: string;            // i18n key, never a raw string
  topicTags: string[];        // 'logistics.makassar', 'vendor.penalty'
}

export interface Source {
  id: string;                 // 'S12'
  kind: SourceKind;
  projectId: string;
  topicTags: string[];
  sensitivity: Sensitivity;
  title: string;
  authorId: string;
  authorName: string;
  at: string;                 // ISO 8601
  version?: number;           // docs only
  locator?: string;
  body: string;               // PII masked before it leaves lib/mask
  bodyLocale: Locale | 'mixed';
  participantIds: string[];   // visible-scope only; drives "who might know"
}

export interface Citation {
  id: string;                 // 'C3'
  marker: number;             // 3 → renders as [3]
  sourceId: string;
  quote: string;              // verbatim, already masked
  locator: string;
  gloss?: string;             // NEW — authored in the dataset, never generated
}

export interface ConflictNote {
  field: string;
  chosenCitationId: string;
  rejectedCitationIds: string[];
  rule: 'newer-version' | 'board-over-chat' | 'explicit-correction';
  params?: Record<string, string>;
}

export interface ChronologyEvent {
  id: string;
  at: string;
  title: string;
  detail?: string;
  citations: Citation[];
  conflict?: ConflictNote;
}

export type OpenItemStatus = 'open' | 'blocked' | 'overdue';   // NEW — named, closed set

export interface OpenItem {
  id: string;
  title: string;
  ownerId?: string;
  ownerName?: string;
  due?: string;
  status: OpenItemStatus;
  citation: Citation;
}

export interface Knower {
  personId: string;
  name: string;
  basis: 'participant' | 'owner';
  sourceId: string;
}

export interface RecordGap {
  id: string;                 // 'G1'
  whatIsMissing: string;
  whyItMatters?: string;
  knower?: Knower;
  draftQuestion: string;
  rule: 'no-cause' | 'ownerless-blocked-item' | 'silent-interval';
  approval?: ApprovalRequest;
}

export interface ApprovalRequest {
  gapId: string;
  recipientName: string;
  channelLabel: string;       // a label, not an address
  state: 'draft' | 'approved' | 'cancelled';
  decidedAt?: string;
  simulated: true;
}

export interface ScopeSnapshot {
  id: string;
  version: number;
  actorId: string;
  roleId: RoleId;
  projectIds: string[];
  grants: Array<{ projectId: string; tags: '*' | string[]; sensitivities: Sensitivity[] }>;
  issuedAt: string;
}

export interface AnswerPayload {
  id: string;
  threadId: string;
  question: string;
  questionMasked: string;
  createdAt: string;
  locale: Locale;
  scope: ScopeSnapshot;
  status: 'complete' | 'empty' | 'partial';
  canonical: boolean;
  version: number;
  chronology: ChronologyEvent[];
  openItems: OpenItem[];
  gaps: RecordGap[];
}

export interface AuditEntry {
  id: string;
  at: string;
  actorId: string;
  actorRole: RoleId;
  projectId: string;
  questionMasked: string;
  scopeSnapshotId: string;
  retrievedSourceIds: string[];
  answerId?: string;
  decision: 'answered' | 'empty' | 'empty-equivalent';
  approvals: Array<{ gapId: string; state: ApprovalRequest['state']; at: string }>;
}

export interface ThreadSummary {           // NEW — sidebar thread history only
  threadId: string;
  projectId: string;
  question: string;                       // truncated to one line by CSS, never by data
  at: string;                             // ISO; grouped into Hari ini / Minggu ini / Lebih awal
  answerVersion: number;
}
```

Three additions, all forced by the shell: `Project.code` (the collapsed rail has 40px for project identity — `DESIGN.md` A14), `ThreadSummary` (thread history is now a first-class nav group), and the named `OpenItemStatus` union (the `StatusPill` tone map needs a closed set — `DESIGN.md` A15). `Citation.gloss` is promoted from an implicit drawer behaviour to an optional authored field so the drawer never generates text.

Everything else — `canRead`, `ScopeSnapshot`, `canonicalEmpty`, the audit shape — is untouched by this direction. If a UI change appears to require a new field on `AnswerPayload`, the change is wrong: the answer's structure is fixed.

### 8.1 The one function everything hangs on

```ts
// lib/access/canRead.ts
export function canRead(snapshot: ScopeSnapshot, source: Source): boolean;
```

- Called in `lib/retrieval/search.ts` **before** ranking, not after. The model never receives a filtered-out source.
- Called again in `lib/retrieval/toCitation.ts`. Defence in depth.
- Pure, synchronous, no I/O. Tests cover project mismatch, tag mismatch, sensitivity mismatch, `'*'` grant, revocation.
- Roughly 20 lines. It is the only function in the codebase that gets a doc comment longer than its body.

---

## 9. Bilingual implementation

### 9.1 Shape

```ts
// lib/i18n/keys.ts
export const keys = ['nav.ask', 'nav.audit', 'nav.access', 'nav.group.workspace',
  'nav.group.threads', 'nav.thread.today', 'nav.thread.week', 'nav.thread.earlier',
  'section.chronology', 'section.open', 'section.gaps',
  'status.open', 'status.blocked', 'status.overdue', 'status.approved', 'status.cancelled',
  'empty.title', 'empty.body', /* … */] as const;
export type MessageKey = typeof keys[number];
export type Catalogue = Record<MessageKey, string>;
```

`messages.id.ts` and `messages.en.ts` both `satisfies Catalogue`. A missing key is a type error. No string literal in any component.

### 9.2 Rules the implementation must enforce

1. **Cookie `senarai.locale`**, default `id`, read in `(workspace)/layout.tsx`, set to `<html lang>`. The toggle sets the cookie and calls `router.refresh()`; server components re-render, the answer body does not change. The sidebar and breadcrumb re-render with the new chrome labels — that is the whole visible effect and it should be obvious in the demo.
2. **The toggle never touches the answer body.** `AnswerPayload.locale` is fixed at ask time and drives chronology rendering language. Flipping the toggle re-labels headings and keeps prose. State it in the README; a judge will test it.
3. **Quotes are never translated.** `Citation.quote` renders as-is. `GlossLine` renders `Citation.gloss` only, authored in the dataset, never generated at runtime.
4. **Numbers and dates are chrome.** `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })`; dates `dd MMM yyyy`.
5. **No hardcoded UI string.** ESLint `no-restricted-syntax` bans JSX text children longer than one word inside `components/`, plus a `grep` step in the pre-demo checklist.
6. **Status vocabulary is one file.** `lib/ui/status.ts` exports `statusTone: Record<OpenItemStatus | ApprovalRequest['state'] | AuditEntry['decision'], StatusPillTone>`. No component passes a literal tone string.

### 9.3 Copy that is not a translation pair

`empty.title` / `empty.body` / `no-gaps` must each be internally frozen, because the empty answer must be byte-identical across causes. Change them only with a note in the commit message; both languages change together. The five `status.*` keys are the second frozen set: adding a key to that group requires a note in `DESIGN.md` §8 (A15).

---

## 10. States

### 10.1 Loading

`LoadingRegister`: the real layout — one `Surface level={0}`, three `SectionHeader`s, two 40px placeholder rows each separated by `border-subtle`. No spinner, no shimmer, no animated skeleton bars: a shimmering placeholder is the single most generic SaaS signal available, and the register's loading state should read as a page being set, not as a dashboard fetching. A single mono line in the header area reads `Menyusun kronologi…` and is replaced as each section lands. Under `prefers-reduced-motion` nothing animates.

The composer's submit is disabled for the duration, with `aria-busy="true"` on the answer region.

### 10.2 Empty (no record)

`NoRecordAnswer` is one component with no props beyond locale. It renders the three section headings on a normal `Surface level={0}`, the canonical `empty.title` / `empty.body`, and no citations, no names, no counts, no illustration, no tint, no action other than a link back to `/ask`.

It is used for: topic outside scope, project outside scope, genuinely absent record, and a question whose sources were all filtered out. One component, four causes, no branching on cause anywhere in the component tree.

### 10.3 Permission-equivalent state (the hard one)

Guarantees, in implementation terms:

```ts
// lib/answer/canonicalEmpty.ts
const FROZEN = Object.freeze({ status: 'empty', canonical: true,
  chronology: [], openItems: [], gaps: [] /* … */ });
export const canonicalEmpty = (scope: ScopeSnapshot, threadId: string) =>
  ({ ...FROZEN, id: 'EMPTY', threadId, scope, createdAt: FIXED_TS });
```

- **No query echo.** `question` is omitted from the canonical payload.
- **No scope-dependent fields.** `scope` is passed in but the rendered output ignores it; the serialised bytes reaching the client come from a fixed template.
- **Same HTTP status (200), same headers, same content length.** No 403 anywhere; `grep -r "403" app/api` must return nothing.
- **Latency floor.** `lib/api/latency.ts` applies `await sleep(Math.max(0, MIN_LATENCY_MS - elapsed))` with `MIN_LATENCY_MS = 600` on every `/api/ask` response. Acknowledged limitation: narrows but does not eliminate timing side-channels; it is not a security control. Say so in the README.
- **Same streaming shape.** The empty answer streams the same event sequence with empty arrays.
- **Same visual treatment.** The new elevation system is the risk here: an empty answer must not be given a distinct surface, a dashed border, a centred layout, or a `Surface level={1}` wrapper. `NoRecordAnswer` renders inside the identical `Surface level={0}` as a full answer. A judge's `curl` diff and a judge's screenshot must both come back clean.

### 10.4 Error

`ErrorRegister` keeps the document frame: same grid, same `Surface level={0}`, a serif line stating what failed in plain language (`Tidak dapat memuat jawaban. Coba lagi.`) and a retry button. No status codes, no stack traces, no error boundary default UI. A failed ask writes no audit entry.

### 10.5 Revoked mid-answer

`AnswerDocument` holds an `AbortController`. `/api/scope` responses carry the new `scope.version`; a client that sees a version bump while streaming aborts, discards the reducer state, and shows `StaleScopeBanner` with one action: ask again. Partial text is never left in the DOM. If the client misses the bump (second tab), the next answer is still correct — the server re-resolves scope per request.

`ScopeBanner` and `StaleScopeBanner` are neutral chrome: `bg-subtle`, `border-border`, `text-ui-sm`, `role="status"`. Not amber, no warning icon, no dismiss control.

---

## 11. Citation and drawer interaction

1. Server composes `Citation[]` with `marker` assigned by reading order across all three sections.
2. `CitationMark` renders `<button type="button" aria-expanded={open} aria-label={t('cite.open', { n, kind, date })}>` containing a mono `[n]` inside the chip. The chip's 44px hit area comes from a `::after` overlay; the visual mark stays 28px so it never disturbs line rhythm.
3. Click → `router.push(pathname + '?source=' + sourceId, { scroll: false })`. URL as state means the drawer is shareable and the back button closes it.
4. `SourceDrawer` is a `<dialog>` rendered by the page (server) when `?source=` is present, so it is open on first paint for deep links — no client fetch on the demo path.
5. Structure: `DrawerHeader` (sticky, kind pill + close) → `SourceMeta` (kind, author, timestamp, locator, version, project) → `QuoteBlock` → optional `GlossLine` → `MaskedField` for redacted PII → one line stating why the source was cited (including the conflict rule id).
6. ≥1440px: 480px docked panel, answer column narrows. 1280–1439px: 420px. <1280px: full-height sheet with `rgba(26,23,19,.32)` scrim. Body scrolls with `overscroll-behavior: contain`; header sticky at 56px; `scroll-padding-top: 56px`.
7. Keyboard: `Esc` closes, focus returns to the originating `CitationMark`, focus trapped while open.
8. Hover preview after 400ms is **cut** in this direction — the chip already carries a visible affordance, and the preview was the first thing on the cut list. Do not build it.

**Citations that must not exist:** a mark whose source is filtered out. `toCitation` re-checks `canRead` and throws in dev, drops silently in prod. Numbering is never renumbered after composition — a gap in the sequence would be a tell.

---

## 12. Accessibility and performance

**Accessibility (target AA, tested with keyboard + VoiceOver once before submission):**

- Chronology `<ol>`; open items `<table>` with `<th scope="col">`; audit `<table>` with `<caption>`; sidebar `<nav aria-label>` with `role="group"` + `aria-labelledby` per group.
- Active nav carries `aria-current="page"` **and** two visual channels (tint fill + 3px accent bar). Do not express active state with colour alone.
- `CitationMark` 28px visual / 44px hit area, `aria-expanded`; `:focus-visible` ring `2px var(--color-focus)` offset `2px`, never removed, never clipped by a parent's `overflow: hidden` (use `outline-offset` inside the item radius in the sidebar).
- Collapsed sidebar items keep accessible names via `aria-label` and expose them on hover **and** focus. The collapse toggle has `aria-expanded` and a state-dependent label.
- Sticky table headers: `scroll-mt-12` on rows so a focused row action never lands under the header.
- `StatusPill` always renders text; colour is the second channel. Contrast per `DESIGN.md` §6.1 — pills are text on tint, never text on the signal hue at full saturation.
- `ApprovalGate` uses `aria-disabled` + `aria-describedby` on the confirm control, not bare `disabled`. Cancel and confirm are equal-weight and equal-size; the DOM order is cancel-then-confirm in both languages.
- `ScopeBanner` is `role="status"` and must not steal focus.
- Answer sections announce once per section close, not per token.
- Only three transitions exist, all colour-only at 120ms (nav hover, chip hover, segmented switch). No elevation animation, no drawer slide, no shimmer. `prefers-reduced-motion` sets them to 0ms globally.
- Do not introduce a hue without checking it against `DESIGN.md` §6.1; the contrast table is the contract.

**Performance budgets:**

| Metric | Budget | Method |
|---|---|---|
| LCP on `/ask/[threadId]` | < 1.5s local | Server-rendered document and shell, no client fetch for the answer |
| Client JS on `/audit` | < 60KB gzip | Table and shell are server components; only `AuditFilters` hydrates |
| Client JS on `/ask/[threadId]` | < 90KB gzip | `AnswerDocument`, `CitationMark`, `GapCard`, `ApprovalGate`, `SourceDrawer` only. The sidebar adds **zero** JS: active state comes from the pathname on the server |
| Font payload | 3 families, `latin` subset, `display: swap` | `next/font/google` |
| First answer paint | < 400ms to first section | Stream section-by-section; chronology first |
| Tailwind CSS | single stylesheet, no runtime | v4 `@theme`, no `tailwind-merge` |
| Elevation | 0 bytes of JS | Shadows and borders are static classes; no measuring, no portals for elevation, no floating-ui |

Do not add `framer-motion`, a chart library, an icon package, or a headless UI library for the drawer and modal. `<dialog>` plus `showModal()` covers both, and the elevation system is CSS-only by design.

---

## 13. Build order (two people, 6 days)

The shell is now a real cost. It is front-loaded on Day 0 and Day 1 and capped: if the shell is not rendering at Day 1 end, cut from the list below rather than borrowing Day 2.

| Day | Person A (data + agent surface) | Person B (shell + document UI) | Shared checkpoint |
|---|---|---|---|
| 0 (full day) | `types/domain.ts` incl. `ThreadSummary` and `Project.code`, `data/*.json` schema + first 20 sources | Repo, `@theme` tokens, fonts, `Surface`/`Card`/`Panel`, `AppShell` grid, `Sidebar` + groups + `ProjectSwitcher` + `IdentityBlock`, `TopBar` + `Breadcrumb` | Types frozen; shell renders at three breakpoints; both agree on the three demo questions |
| 1 | `canRead`, `search`, `toCitation`, unit tests | `RegisterPage`, `SectionHeader`, `LedgerList`, `CitationMark`, `DataTable` + `StatusPill` | Static answer renders from a fixture inside the real shell |
| 2 | `compose`, `gaps/detect`, `conflict/resolve`, `mask/pii` | `SourceDrawer` (+ header, meta, quote), `?source=` deep link, `AnswerDocument` streaming shell | Full three-section answer from real data, one role |
| 3 | `POST /api/ask` NDJSON stream, `canonicalEmpty`, latency floor | `GapCard`, `DraftField`, `ApprovalGate`, `/api/approvals` | Scenario 1 (two roles) and Scenario 2 (gap + gate) end to end |
| 4 | `/api/scope`, snapshot versioning, revocation abort path | `/access` matrix, `GrantToggle`, `RevokeDialog`, `StaleScopeBanner`, `ThreadList` groups | Scenario 3 (revocation) works |
| 5 | `/audit` data + scoping, seed entries | `/audit` table (sticky header, pills) + filters, i18n catalogue completion, empty/error/loading states | All four routes, both locales, no hardcoded strings. **MCP server built in parallel (see `prompts/phase-5.md`) — the web app is already complete and independent before MCP work begins** |
| 6 | Scripted demo run ×3, curl diff of the two empty responses, README assumptions | Accessibility pass, contrast check, `no-forbidden` + `status` + `no-card` tests, screenshots | Record the video; freeze. Demo runs in the web app alone, then again through WorkBuddy via the MCP server |

**Cut order if behind** (cut from the top, in this order):

1. Sidebar thread grouping (`Hari ini` / `Minggu ini`) → one flat list of 8, no group labels.
2. Sticky table headers → static header row.
3. Row-level actions revealed on hover → always-visible `IconButton`.
4. Breadcrumb sub-segments → single project-name segment.
5. Drawer elevation (`--elev-2`) → flat `border-l` panel, no shadow.
6. Collapsed 72px rail at 1280px → ship expanded-only, off-canvas below 900px.

**Do not cut:** the canonical empty payload, the approval gate and its equal-weight controls, the audit log table, the record-gap section, the three always-rendered headings, the serif answer body, the closed status vocabulary. Those are the score.

The honest version of the schedule: the shell costs roughly three quarters of a day that the previous direction spent on the document. That time comes out of Day 0, not out of the answer. If it slips further, cut from the list above — every item on it is chrome, and none of it is the argument.

---

## 14. Assumptions and missing details

Cross-referenced to `DESIGN.md` §8. Each is a build decision the brief does not make.

| # | Gap | Build-time impact | Recommended default |
|---|---|---|---|
| A1 | Permission granularity (project / topic / field) | Determines `ScopeSnapshot` and `canRead` signatures | Two levels: `projectId` + `topicTags[]`, plus a `sensitivity` flag. Field-level filtering is out of scope; README states it |
| A2 | "Who might know" may derive from permissioned attendance metadata | `knowers.ts` needs a source for `Knower.basis` | Only from a `Source` the asker can read whose `participantIds` includes the person. No directory fallback. Otherwise `knower` is `undefined` and the card omits the field |
| A3 | Record-gap heuristic undefined | `gaps/detect.ts` is unimplementable without a rule set | Three deterministic rules (`no-cause`, `ownerless-blocked-item`, `silent-interval` with a 5-day threshold). Thresholds are demo constants in one file |
| A4 | How "identical response" is guaranteed | `canonicalEmpty` + latency floor + no 403 | Frozen payload, no query echo, HTTP 200, 600ms floor, identical stream shape and identical surface |
| A5 | Is the audit log permissioned? | `/api/audit` scoping and the `DecisionTag` filters | Scoped by role (staff: own; manager: project; admin: all). Demo runs as admin |
| A6 | Bilingual vs citation fidelity | Whether the toggle re-renders quotes | Toggle = chrome only. Body language fixed at ask time. Glosses authored, labelled, secondary |
| A7 | Role changes mid-answer | Abort vs complete the stream | Abort, discard, re-resolve, re-request or return canonical empty |
| A8 | Is the raw question logged? | `AuditEntry.questionMasked` vs a raw field | Masked only. No raw-question field exists in the type |
| A9 | Drafted question has no real recipient | `ApprovalRequest.channelLabel` vs an address | Channel label only, `simulated: true`, gate states "simulated" |
| A10 | Which source wins a conflict | `conflict/resolve.ts` precedence | Newer doc version > board update > chat; tie → recency. `rule` id stored and rendered |
| A11 | May the three-part structure be shortened | Section components must never conditionally omit | Always render all three headings; empty sections render a single stated line. No accordions |
| A12 | Citations pointing at masked sources | Drawer rendering for redacted quotes | Keep the citation, render `••••` with a reason label |
| A13 | Shell scope vs six days | Roughly 0.75 day of the two-person budget, taken from Day 0 | Fixed shell scope: sidebar (two groups + switcher + identity), breadcrumb top bar, locale toggle, table craft on open items and audit. Cut order in §13 |
| A14 | Collapsed rail has no room for the project name | `ProjectSwitcher` at 72px | Show `Project.code` (4 chars mono) in a 40px button, full name in tooltip and `aria-label`. Requires `Project.code` in the dataset |
| A15 | Can the status pill vocabulary grow? | `StatusPill` tone map and `lib/ui/status.ts` | Closed set of five, one file, one test. Any new value needs a note in `DESIGN.md` §8 |
| A16 | Multi-project or single-project demo | Data volume and `ProjectSwitcher` menu | Two projects, one fully authored. The second proves scope filtering and can be thin |
| A17 | Real model vs templated composition | Free-text question quality | Templated for the three scripted questions; keyword retrieval fallback otherwise. Free text must degrade to an honest "no record", never a guess |
