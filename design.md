# Senarai — Design Rationale

**Product:** Senarai, an access-aware project history agent.
**Context:** AI CAN DO IT Tencent Cloud Hackathon Indonesia 2026, Challenge A "The Workplace Brain". Team of two, deadline 1 November 2026, mock data.
**Companion document:** `FRONTEND.md` (implementation). Tokens, routes and component names here are the authority; `FRONTEND.md` builds against them.

---

## 1. Design premise

**A modern operations console that still behaves like a register.**

Senarai is judged as software, opened by someone who has used a hundred SaaS dashboards. It must look like a product that ships: a real shell, a real sidebar, real tables, a contemporary surface. But the thing it *does* is produce a document that shows its own blanks — and that document is the product, not the app around it.

So the direction is split deliberately:

| Layer | Behaviour |
|---|---|
| The shell | Contemporary enterprise console. Layered surfaces, a grouped sidebar, finished chrome, real table craft |
| The answer | A single continuous document. Three parts, fixed order, no card around it, no accordions, no shortening |
| The blanks | The loudest content in the product, expressed with tinted cards and the only modal in the app |

The register argument survives intact; only its costume changes. A register is still a document that lists what is known and leaves a visible space where something should be known but is not. That second half is the whole product. Senarai's differentiator is not that it retrieves project history — plenty of things retrieve — it is that it prints the empty rows on purpose and names the person who might fill them in.

| Consequence | Design decision |
|---|---|
| The product is software, opened daily | A real application shell: grouped sidebar, breadcrumb top bar, elevated surfaces |
| The answer is a document, not a feed | Serif answer body, fixed three-part skeleton, no bubbles, no summary, no collapse |
| Entries are numbered and citable | Every claim carries a stable source mark; every gap carries a `G` number |
| Blank rows are legitimate content | Record gaps get their own section, the only card treatment in the answer, and the only action in the product |
| A register never explains its filing rules to a reader who lacks clearance | No page, badge, pill, or disabled control ever indicates that a row exists but is withheld |

### 1.1 What the interface is arguing

The product's claim is: *an AI can be trusted with project history because it is built to be audited and built to admit ignorance.* The interface has to make that claim visually, not just state it in copy. Three arguments:

1. **Structure over conversation.** A fixed three-part answer means the same question always produces the same *shape* of document. Judges and users can compare two answers (staff vs manager) side by side and see that the shape is identical and the contents are not. A chat layout makes that comparison impossible; so does a card-per-answer layout that reflows the sections into independent blocks.
2. **Provenance is not an expandable detail.** Citations are set in the text as first-class marks. Clicking one opens a side panel without leaving the answer. Provenance is the reading experience, not a footnote under it.
3. **Absence is designed, not apologised for.** The record-gap section is the loudest thing on the page — the only place in the answer that uses cards, tint, and an action that requires a second confirmation.

The polish budget is spent on the shell and on table craft precisely so that the answer can stay austere. A plain document inside a well-built console reads as confidence; a plain document inside a plain console reads as an unfinished prototype.

---

## 2. Modern enterprise console: the direction made concrete

The reference object is a records product built by people who care about typography: the information density of a compliance tool, the warmth of a paper archive, the finish of a current SaaS console. Not a developer dashboard (cold, dark, mono-everything) and not a consumer chat app (bubbles, avatars, gradients).

### 2.1 Surfaces and elevation

Four surfaces, three raised levels, no more. Elevation is a hierarchy of *containers*, never a decoration.

| Token | Value | Used for |
|---|---|---|
| `--bg-app` | `#FAF8F4` | Application background. Warm off-white, the only large warm field in the product |
| `--surface` | `#FFFFFF` | Content surface: the answer document, the sidebar, the top bar, table body |
| `--surface-subtle` | `#FAF8F4` | Insets on white: table header row, draft field, metadata block, nav track |
| `--surface-overlay` | `#FFFFFF` | Modal sheet and source drawer |

| Level | Token | Shadow | Border | Radius | Applied to |
|---|---|---|---|---|---|
| 0 | `--elev-0` | none | `1px solid var(--border-subtle)` where a boundary is needed | `8px` | The answer document itself. It is a surface, not a card |
| 1 | `--elev-1` | `0 1px 2px rgba(26,23,19,.04), 0 1px 3px rgba(26,23,19,.06)` | `1px solid var(--border)` | `8px` | Gap blocks, inline note blocks, the project switcher button |
| 2 | `--elev-2` | `0 2px 4px rgba(26,23,19,.04), 0 8px 16px -4px rgba(26,23,19,.08)` | `1px solid var(--border)` | `12px` | Sidebar panel edge, source drawer, sticky filter bar |
| 3 | `--elev-3` | `0 8px 24px -4px rgba(26,23,19,.12), 0 24px 48px -12px rgba(26,23,19,.16)` | `1px solid var(--border-strong)` | `14px` | The approval sheet only |

Rules that keep the elevation system honest:

- **The answer is not a card.** It is a `--surface` region with generous padding and a single hairline separating its header from section 1. Wrapping the three sections in one elevated box, or giving each section its own card, would break the continuity that is the entire argument — the reader must be able to feel that the three parts are one filing.
- **Cards are for discrete objects, not for content groupings.** Permitted: a gap block, the contents of the source drawer, the approval sheet, a single inline conflict note. Forbidden: a card per chronology event, a card per open item, a card around a section.
- **Shadow never appears without a border.** On a warm background, shadow-only elevation reads as a blur artefact. Every raised surface has a 1px border plus its shadow.
- **No gradients, no glass, no blur.** One exception: the modal scrim, `rgba(26,23,19,.32)`, flat.
- **Radius scale:** `--radius-xs 4` (citation chips, pills), `--radius-sm 6` (inputs, buttons), `--radius-md 8` (cards), `--radius-lg 12` (panels), `--radius-xl 14` (modal), `--radius-pill 999`.

### 2.2 Palette

Warm neutrals, white surfaces, one accent. The warmth is not a stylistic preference: this is an Indonesian records product for operations teams, and a cold grey console would signal a developer tool used by engineers rather than a register used by a warehouse coordinator.

**Neutral ramp** (warm, used for every non-semantic surface, border and text value):

| Token | Value | Token | Value |
|---|---|---|---|
| `--n-0` | `#FFFFFF` | `--n-500` | `#8C8375` |
| `--n-25` | `#FDFCFA` | `--n-600` | `#6B6357` |
| `--n-50` | `#FAF8F4` | `--n-700` | `#4A443B` |
| `--n-100` | `#F4F1EA` | `--n-800` | `#2E2A24` |
| `--n-200` | `#E8E3D9` | `--n-900` | `#1A1713` |
| `--n-300` | `#CFC7B8` | `--n-400` | `#B3AA9A` |

**Text and borders:** `--ink #1A1713` · `--ink-secondary #4A443B` · `--ink-muted #6B6357` · `--ink-inverse #FFFFFF` · `--border-subtle #EDE8DE` · `--border #E1DCD1` · `--border-strong #CFC7B8`.

**Primary accent** — one hue, used for actions and active states only, never for content:

| Token | Value | Bound to |
|---|---|---|
| `--primary` | `#14564F` | Primary button fill, active nav accent bar and label, links, approved state |
| `--primary-hover` | `#0E413C` | Hover / active press on primary fills |
| `--primary-tint` | `#E7F0EE` | Active nav fill, approved pill background, citation chip on hover |
| `--primary-border` | `#BFD8D3` | Border on primary-tinted surfaces |
| `--on-primary` | `#FFFFFF` | Text on primary fills |

**Semantic signals** — four, each re-derived for white surfaces, each always paired with a text label:

| Signal | Text token | Tint | Border | Bound to |
|---|---|---|---|---|
| Conflict | `--signal-conflict #8A5A12` | `--signal-conflict-tint #FBF0DC` | `--signal-conflict-border #EBD5AC` | Conflicting row tint, conflict note, `⚑` label |
| Record gap | `--signal-gap #8C2F39` | `--signal-gap-tint #FBEDEE` | `--signal-gap-border #F0CFD3` | Gap block left accent, `G` id, gap section rule |
| Open / approved | `--signal-open #4A443B` on `--n-100`; approved uses `--primary` on `--primary-tint` | — | — | Status pills in the open-items table and audit decisions |
| Focus | `--focus #2563C7` | — | — | Focus ring only, 2px with 2px offset. Never decorative |

Two deliberate re-derivations from the previous direction:

- **"Open" is no longer a hue.** Being unresolved is the default state of a register, not a signal. Open items take a neutral pill (`--n-100` fill, `--ink-secondary` text). Approval is the one positive transition in the product, so it takes the accent. This removes a green that competed with the primary teal and reduces the palette to three content hues plus one focus colour.
- **Red is not "no record".** Unchanged and non-negotiable. `--signal-gap` is a deep crimson reserved for record gaps, and the canonical empty answer is set in normal ink on the normal content surface, with no tint, no icon, and no accent.

**Forbidden, permanently:** role colour-coding (staff = one hue, manager = another). A coloured role badge advertises that answers differ by role, which is precisely the inference the product must not invite. Roles are plain text in the top bar and sidebar identity block. Also forbidden: using any signal hue as a *fill* at full saturation, and any use of colour as the sole carrier of meaning.

### 2.3 Typography

Three roles, three families, no overlap. The rule is functional: **the type tells you what kind of statement you are reading.** The serif answer body is the signature and does not move.

| Role | Family | Use | Why |
|---|---|---|---|
| Record | Source Serif 4 (400/600) | Answer prose, section headings, gap statements, drafted questions, source quotes | Serif signals "this is the document of record". It is the single most load-bearing choice in the direction |
| Chrome | Inter (400/500/600) | Navigation, buttons, labels, filters, table headers and cells, form fields, page titles on `/audit` and `/access` | The tool must look like a tool. Sans chrome keeps controls separable from content at a glance |
| Reference | IBM Plex Mono (400/500) | Dates, citation marks `[3]`, gap ids `G2`, audit ids, timestamps, version numbers, amounts, counts, permission tag names | Anything you might quote, cite, or copy to an auditor is set in mono with tabular figures |

**Scale** (px / line-height / weight / tracking). Nothing below 12px. Nothing above 600 weight.

| Token | Size / LH | Weight | Family | Applied to |
|---|---|---|---|---|
| `--text-display` | 36 / 1.12 | 600 | Serif | Page title: the project name on `/ask`, "Audit log", "Access" |
| `--text-h1` | 28 / 1.2 | 600 | Serif | The restated question at the top of an answer |
| `--text-h2` | 20 / 1.3 | 600 | Serif | Section headings 1–3 |
| `--text-h3` | 17 / 1.35 | 600 | Serif | Gap statement, chronology row title |
| `--text-body` | 16.5 / 1.65 | 400 | Serif | Answer prose. The measure is capped at 68ch; the generous leading is what makes a long chronology readable |
| `--text-body-sm` | 15 / 1.55 | 400 | Serif | Drafted question, quote block, gap supporting text |
| `--text-ui` | 14 / 1.45 | 500 | Sans | Nav items, buttons, table cells, control labels |
| `--text-ui-sm` | 13 / 1.4 | 400 | Sans | Secondary chrome: breadcrumb tail, helper text, sidebar thread questions |
| `--text-label` | 12 / 1.3 | 500 · `0.04em` · uppercase | Sans | Section eyebrows, table headers, sidebar group labels, metadata keys |
| `--text-caption` | 12.5 / 1.45 | 400 | Sans | Timestamps under a title, footnote-ish chrome, "simulated" notices |
| `--text-mono` | 12.5 / 1.4 | 400 | Mono | Dates, ids, amounts, citation numerals. `font-variant-numeric: tabular-nums` |
| `--text-mono-sm` | 12 / 1.35 | 400 | Mono | Audit ids, gap ids inside pills, version strings |

Craft rules:

- **A clear jump between levels.** The old scale stepped 16 → 17 → 22 and read as one size. The new scale steps 16.5 → 20 → 28 → 36, so hierarchy is legible before any rule is drawn.
- **Negative tracking above 24px** (`-0.02em` on display, `-0.01em` on h1). Body and below use default tracking.
- **Line-height is inverse to size**: 1.65 at body, 1.2 at display. A document needs air in the prose and density in the furniture.
- **Numerals are always tabular in mono**, and amounts always carry units (`Rp750.000`, `25 ton`). Column alignment in tables depends on this.
- **Chrome never exceeds 14px.** If a label needs 15px to be readable, the label is wrong.

### 2.4 Grid, measure and spacing

- 12 columns, 24px gutter. Content max-width 1240px. Page padding 40px (32px at ≤1280px, 20px at ≤900px).
- The answer occupies the content column, capped at **68ch**, and does not stretch to fill wide screens. This is a reading measure, not a layout preference: the answer is prose that must be read linearly and then cited.
- **No margin column.** The date and the citation mark now sit on the row itself: date in mono at the row's left, in a fixed 96px sub-column; citation chips at the end of the line, right-aligned. Removing the margin column is what buys the space for a 264px sidebar without squeezing the measure. The register reading survives because the date still leads every row and the marks still terminate every claim.
- **Spacing scale** (4px base): 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Section heading sits 40px below the previous section's last row; rows are separated by 16px; inside a card, 16px padding with 12px between fields.
- Whitespace is still the primary grouping device inside the answer. The shell may be layered; the document is not.

### 2.5 How chronology is expressed

The chronology is a **ruled ledger**, not a timeline graphic and not a card list.

```
12 Okt 2026   Gudang menahan truk karena dokumen PO belum diperbarui.      [2]
14 Okt 2026   PO direvisi: kuantitas 40 → 25 ton.                          [4]
              ⚑ Konflik sumber — dipakai [4] karena lebih baru daripada [6]
```

- Date in mono, tabular, fixed 96px sub-column, `dd MMM yyyy` via `Intl` per locale. Year always shown.
- No dots, no connecting line, no vertical spine, no per-source icons. Source *kind* is legible in the drawer, not from a glyph — glyphs would compete with the conflict flag, which is the only mark allowed to interrupt the text flow.
- Events are an `<ol>`. Ordering is the content.
- Rows are separated by 1px `--border-subtle` rules, never by fills. The only filled row is a conflicting row, at `--signal-conflict-tint` with a 1px `--signal-conflict-border` top and bottom edge — a band, not a card.
- On hover, a row gets `--n-25`. That is the entire interaction affordance: chronology rows are not clickable, and must not look clickable.

### 2.6 Citations and the source drawer

**The mark.** A bracketed mono numeral is kept, because it is the register's convention and it is cheap to scan, but it is dressed for a modern surface:

- `[3]`, mono `--text-mono`, `--ink-muted` at rest, inside a 4px-radius chip with `--n-100` fill, 2px horizontal padding, optically raised 2px (`vertical-align: super; font-size: 11px` inside the chip so the mark never disturbs the line rhythm).
- Hover: chip fill `--primary-tint`, text `--primary`, border `--primary-border`. Open (its source in the drawer): same tint plus a 1px `--primary` border, persistent.
- Focus: 2px `--focus` ring, 2px offset. The chip is a real `<button>` with a 28px visual target expanded to a 44px hit area by a pseudo-element.
- Numbering is per-answer and sequential in reading order. `[3]` means the third distinct source in *this* document.
- Accessible name: "Sumber 3: pesan WhatsApp, 12 Oktober 2026" / "Source 3: WhatsApp message, 12 October 2026".

**The drawer.** A proper side panel, not a floating sheet.

| Property | Spec |
|---|---|
| Width | 480px at ≥1440px; 420px at 1280–1439px; full-height sheet with scrim below 1280px |
| Surface | `--surface-overlay`, `--elev-2`, `1px solid var(--border)` on the leading edge, no radius on the leading edge (it is docked) |
| Header | 56px, sticky, `1px solid var(--border-subtle)` bottom: source-kind pill (neutral), close button (32px icon button) |
| Metadata block | `--surface-subtle`, `--radius-sm`, 12px padding: two-column definition list, keys in `--text-label`, values in mono. Kind, author, timestamp, locator, version, project |
| Quote | `--text-body-sm` serif, `--ink`, with the cited span marked by a 2px `--primary` left border and `--primary-tint` background at 40% — not a highlight colour, a rule |
| Gloss | If present, one line under the quote, prefixed `gloss` in `--text-mono-sm` `--ink-muted`. Never generated |
| Masked fields | `••••` in mono plus a reason label in `--text-caption` |
| Why cited | One sentence, sans `--text-ui-sm`, `--ink-secondary`. Includes the conflict rule id when applicable |
| Scroll | Header sticky, body scrolls, `overscroll-behavior: contain`, `scroll-padding-top: 56px` so focused marks are not hidden |
| Push vs overlay | ≥1280px the drawer docks and the answer column narrows; the answer stays readable. That is the point of a register: you check the reference without losing your place |
| Deep link | `/ask/[threadId]?source=S12`, open on first paint |

### 2.7 Tables and data display

Two tables carry real weight: open items in section 2, and the audit log. Both get the same craft.

- **Container:** `--surface`, `--elev-0`, `1px solid var(--border)`, `--radius-md`, `overflow: hidden`. Rows do not have their own borders outside the container.
- **Header row:** `--surface-subtle`, `1px solid var(--border)` bottom, `--text-label` (12/1.3, 500, uppercase, 0.04em), `--ink-muted`, 40px tall. Sticky (`position: sticky; top: 0; z-index: 1`) inside any table that scrolls, with a `--surface-subtle` background so rows do not show through.
- **Rows:** 44px minimum, `1px solid var(--border-subtle)` between rows, no border on the last. Hover `--n-25`. No zebra striping — on a warm palette, banding reads as dirt.
- **Alignment:** text left; dates and amounts right-aligned in mono tabular; counts right-aligned; status column left after a fixed 120px gutter so pills form a vertical edge. Numeric columns get `font-variant-numeric: tabular-nums` and a fixed min-width.
- **Status treatment:** a pill, never bare colour. 22px tall, `--radius-pill`, 8px horizontal padding, `--text-label`-sized text (12/1.3, 500, sentence case), tint fill + matching 1px border + text in the signal colour. `Terbuka` / `Terhambat` / `Terlambat` / `Disetujui` / `Dibatalkan`. Colour is a second channel, never the first — the label is the channel.
- **Empty and loading rows:** a single full-width cell at 44px with `--text-ui-sm` `--ink-muted` text, inside the same table frame. A table that collapses to nothing on empty looks like a bug.
- **Focus:** rows are focusable only when they have an action. Row-level actions are 32px icon buttons in the last column, revealed on hover **and always visible on focus and on touch** (`@media (hover: none)`).

### 2.8 Chrome and navigation

The flat 220px rail was the weakest element in the previous direction: four items and a list, no grouping, no identity, no hierarchy — a wireframe pretending to be navigation. It is replaced by a proper enterprise sidebar.

**Sidebar spec**

| Property | Value |
|---|---|
| Width, expanded | 264px, fixed, full height, `--surface`, `1px solid var(--border)` right edge, no shadow |
| Width, collapsed | 72px icon rail at ≤1280px. Labels removed, 40×40 icon targets, `aria-label` plus a 200ms tooltip on hover/focus |
| Below 900px | Off-canvas drawer over the content, opened by a menu button in the top bar, scrim `rgba(26,23,19,.32)`, closes on route change and on `Esc` |
| Structure | Project switcher → grouped sections → identity block, in that order |
| Project switcher | Top block, 56px: project name (`--text-ui` 600), project code in mono `--text-ui-sm` muted, chevron. Full-width button, `--surface-subtle` on hover, `--radius-sm`, opens a menu of projects (`--elev-3`, `--radius-lg`) |
| Groups | Two labelled groups: `Ruang kerja` / `Workspace` (Ask, Audit log, Access) and `Utas` / `Threads` (recent thread history). Group label uses `--text-label`, `--ink-muted`, 8px left padding, 20px top margin |
| Item height | 40px. 12px horizontal padding, 8px gap to icon, `--radius-sm`, 2px vertical gap between items. Generous, because this is a console used all day |
| Item anatomy | 16px line icon (`--ink-muted`), label (`--text-ui` 500), optional trailing mono count (audit only) |
| Hover | Background `--n-100`, no border, no colour change on the label, 120ms colour transition |
| Active | Background `--primary-tint` **and** a 3px `--primary` accent bar on the leading edge (inset, full item height, `--radius-pill` on the bar), label `--primary` at 600, icon `--primary`. Two channels, so the state survives greyscale and forced-colours |
| Focus | `2px var(--focus)` ring, 2px offset, inside the item's radius. `aria-current="page"` on the active item |
| Thread history | Max 8 rows, grouped by relative date (`Hari ini` / `Minggu ini` / `Lebih awal`). Each row: mono date (fixed 44px), one-line truncated question in `--text-ui-sm`, `--ink-secondary`; active thread uses the same active treatment as nav. No avatars, no previews, no unread dots, no timestamps-per-minute — it must not read as a chat log |
| Identity block | Bottom, 64px, `1px solid var(--border-subtle)` top: name (`--text-ui` 500) and role as plain text (`--text-ui-sm` `--ink-muted`), plus a chevron. No avatar, no initials circle, no colour-coded role |

**Top bar** (56px, `--surface`, `1px solid var(--border)` bottom, sticky):

- Left: menu button (≤900px only), then breadcrumb-style context — `Proyek` / `Makassar Q4` / `Tanya`. Segments in `--text-ui-sm` `--ink-muted`, current segment `--ink` at 500, `/` separators at 12px. Non-link segments are not clickable-looking.
- Right: `ID / EN` segmented control (28px tall, `--n-100` track, `--radius-sm`, active segment `--surface` with `--elev-1` and `--ink` text, 120ms transition), then the acting identity as plain text with role, separated by a 1px `--border-subtle` vertical rule.
- No notification bell, no help icon, no settings gear. Every element in the top bar must be one of: context, locale, identity.

### 2.9 What this direction costs

This is a real trade, and it should be recorded rather than smoothed over. A contemporary console surface is more immediately legible to a judge — it looks like software that shipped, it reads as enterprise-grade in a five-second screenshot, and it removes the "unfinished prototype" risk that flat paper carried. But the ledger metaphor was doing argumentative work: hairline rules, a margin column, and the absence of cards were themselves the claim that this output is a filing rather than a generated reply, and a card-and-shadow treatment risks making Senarai resemble every other enterprise AI tool at exactly the moment a judge is deciding whether it is different. What compensates is specific rather than atmospheric: the answer is still a single continuous document with no container around it and no card per section, its prose is still serif at a 68ch measure, the three sections are still always all three and never collapsible, the record-gap cards are the only cards in the answer and therefore the only thing that looks like a component, and the approval gate is still the only modal. The elevation system is spent on the shell so that the document can stay flat — which is a harder discipline than flat-everything, because now every shadow is a decision someone has to defend.

---

## 3. Information architecture

Four routes, one persistent frame: sidebar + top bar. No nested navigation. One modal (the approval gate) and one docked panel (the source drawer).

| Route | Surface | Job |
|---|---|---|
| `/ask` | Ask + answer | Compose a question, read the three-part answer, open sources |
| `/ask/[threadId]` | Same, addressed | Deep-linkable answer state, including `?source=` for a citation and `?gap=` for a gap |
| `/audit` | Audit log | Every query, scope snapshot, sources retrieved, answer, approval decision |
| `/access` | Permission / admin | Role × topic-tag matrix, live revocation, scope preview |

The sidebar carries: project switcher, `Workspace` group (the three non-ask routes plus Ask), `Threads` group (recent history), identity block. Spec in §2.8. Thread history is navigation, not conversation: no bubbles, no previews, no grouping by participant.

### 3.1 The answer's three-part hierarchy

The answer is one document with a fixed skeleton, rendered on a single `--surface` region with 40px padding. The hierarchy is enforced by heading level, rule weight and type size — never by nesting, cards, or accordions.

```
Answer header        question restated · scope note · version · timestamp
──────────────────────────────────────────────────────────── 2px --border-strong
1  Kronologi           the ruled ledger, chronological, cited
──────────────────────────────────────────────────────────── 1px --border-subtle
2  Yang Masih Terbuka  open items: owner, due, status, source  (a table)
──────────────────────────────────────────────────────────── 1px --border-subtle
3  Yang Tidak Tercatat  ← the hero section
   ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  1px dashed --signal-gap-border
   │ G1  what is missing                     [ card, --elev-1, 3px gap accent ]
   │     who might know (name + basis)
   │     drafted question (quoted, --surface-subtle field)
   │     [ Tinjau & setujui ]  → approval gate
   └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

Asymmetries that are deliberate:

- **Section 3 is the only section that uses cards.** A gap block is a discrete object with its own fields and its own action, so it is the one legitimate card in the answer. Sections 1 and 2 are continuous.
- **Section 3's heading carries `--signal-gap`** and its list sits under a 1px dashed rule. It is the only dashed rule in the product, and the only place the register admits it is incomplete.
- **Section 3 is never empty-collapsed.** If there are no gaps, the section still renders with the sentence "Semua bagian cerita ini tercatat." / "Every part of this story is on the record." A missing section would read as an omission; a stated absence reads as an audit result.
- **Section 3 is the only section with an action.** Sections 1 and 2 are read-only. That asymmetry is the accountability story in layout form: reading is free, acting needs a human.
- **Open items are a table, not prose** — owner, due, status, source, one row per item, because the reader's next move is "who do I chase".
- **No summary paragraph above the sections.** A summary would be the model's synthesis presented before its evidence, which inverts the trust order. The reader sees evidence first.

---

## 4. Interaction model for the hard cases

### 4.1 Permission-invisible answers

**Rule: there is no UI state for "forbidden".** The codebase contains no `Forbidden`, `AccessDenied`, or `Locked` component, and no disabled row, greyed citation, "N hidden items" counter, lock glyph, muted pill, or reduced-opacity row. A question about a topic outside the asker's scope returns the canonical no-record answer: same layout, same three sections, same wording, byte-identical to the answer for a topic that does not exist.

The new visual language creates new temptations, and each is closed explicitly:

- **No "restricted" pill.** The status pill system exists now, and it must never gain a `Terbatas` / `Restricted` value. The pill vocabulary is exactly `Terbuka`, `Terhambat`, `Terlambat`, `Disetujui`, `Dibatalkan`.
- **No empty-state illustration.** A modern console would reach for a friendly line-art figure. The canonical empty answer has none: a tinted, illustrated, or centred empty state is a distinct visual treatment, and a distinct treatment is a tell.
- **No greyed nav items.** If a route is out of scope for the acting role, the item is *absent*, not dimmed. Absence of a link is not a permission signal because links are chrome, not records.
- **The empty answer cannot echo the question.** A friendlier "Kami tidak menemukan catatan tentang Proyek Kenari" is impossible, because the topic name itself may be the forbidden fact. The canonical empty answer names no project, no topic, and no person.
- **The empty answer cannot offer a person to ask.** "Ask the project owner" would be a hint. The only redirection permitted is generic and identical in both cases: point to the project list, not a human.
- **Latency is part of the interface.** A forbidden query that returns in 40ms while a normal query takes 900ms is a tell that no pixel reveals. The API applies a minimum response floor; see `FRONTEND.md` §10.3.
- **The empty answer still renders the three headings**, set in the same serif, on the same white surface, with the same rules. Hiding them would make an empty answer structurally distinguishable from a thin answer, and a thin answer is a legitimate outcome of real scope.

### 4.2 Record gaps

The gap block is the product's signature object and the only card in the answer. Anatomy:

| Element | Content rule |
|---|---|
| Block | `--surface`, `--elev-1`, `--radius-md`, 3px `--signal-gap` accent on the leading edge, 20px padding, 16px between gaps |
| `G1` id | Mono, `--signal-gap`, in a `--signal-gap-tint` pill at the top of the block. Stable within the answer, referenced in the audit log |
| What is missing | One sentence, declarative, no hedging: "Tidak ada catatan siapa yang menyetujui perubahan kuantitas PO." Not "It seems there may be no record of…". `--text-h3` serif |
| Why it matters | Optional, one clause, only when derivable from visible sources. `--text-body-sm`, `--ink-secondary` |
| Who might know | A name plus a basis: "Rina (peserta kanal Gudang Makassar, 12–14 Okt)". If no visible basis exists, the field is omitted — never guessed |
| Drafted question | Verbatim, in a `--surface-subtle` field with `1px solid var(--border)` and `--radius-sm`, with a copy affordance. Serif, so it reads as text-to-be-sent, not a system message |
| Action | `Tinjau & setujui` — secondary-weight button (white fill, `--border-strong` border, `--ink` label). Not primary-filled; the product does not push you to send |

The block never shows a send button. Sending lives behind the approval gate (§4.4). A gap block with a live send button would make the gate decorative.

### 4.3 Conflict disclosure

Conflicts are disclosed **at the point of the claim**, not in a summary banner at the top, because the reader's decision ("do I believe Oct 13 or Oct 15?") happens at that line.

- The affected chronology row becomes a band: `--signal-conflict-tint` fill, 1px `--signal-conflict-border` top and bottom, `⚑` in `--signal-conflict`, and an inline note under the row: `Konflik sumber — dipakai [4] (PO rev. 3, 14 Okt) karena lebih baru daripada [6] (chat, 12 Okt)`.
- The note is set in `--text-ui-sm` sans on the tint, not in a card — a card would make one disputed row look like a different kind of object from the rest of the chronology.
- Both marks are clickable; both sources appear in the drawer; neither is hidden.
- The resolution rule is named in plain language, never as a confidence score. "Newer version" is auditable; "0.78 confidence" is not.
- One conflict = one note. If three sources disagree, the note lists the rule and the chosen source, and the drawer shows all three. No conflict-count badges, no colour escalation, no severity ordering.

### 4.4 The approval gate

The gate is the only modal in the product, and it is deliberately heavier than the action it guards. It is the one place that uses `--elev-3` and the `--radius-xl` radius.

1. `Tinjau & setujui` opens a centred sheet, 560px wide, `--surface-overlay`, `--elev-3`, scrim `rgba(26,23,19,.32)`, titled "Kirim pertanyaan ini?".
2. It restates, in this order: recipient (name + channel label), the exact question text in a `--surface-subtle` field, the gap it addresses (mono id), and the fact that Senarai has not sent anything yet.
3. The confirm control reads `Kirim` and is **disabled until the user has focused or scrolled the question field** — a 200ms friction, not a puzzle. No countdown, no checkbox theatre, no pre-checked consent.
4. Cancel and confirm are the same size, the same height (40px), the same radius, and the same type weight. Cancel is a bordered white button; confirm is the primary fill. Both occupy equal grid columns. The safe action is never the quieter one.
5. On confirm: the gate closes, the gap block's action becomes `Terkirim — menunggu balasan` with a timestamp, the status pill in the audit row reads `Disetujui`, and an `approval` entry is appended to the audit log. On cancel: nothing is written anywhere, including the log (a cancelled draft is not an event).
6. A persistent line at the foot of the sheet, `--text-caption` `--ink-muted`, states "Pengiriman disimulasikan dalam demo ini." / "Sending is simulated in this demo." Faking a real send would be the one dishonest interaction in an honesty-first product.

### 4.5 Permission revoked mid-session

This is the demo's third scenario and the interaction with the most at stake, because a half-streamed answer computed under a wider scope is a leak.

- **In-flight answers are aborted, not completed.** When a revocation lands while an answer is streaming, the client aborts the stream, discards the partial document, and replaces it with the canonical no-record answer if the question is now out of scope — or re-requests it under the new scope if the question is still partially in scope. Partial text is never left on screen.
- **The next answer reflects the new scope silently** for the question itself, but the *frame* tells the truth about the session: a single-line banner above the answer reads "Cakupan akses Anda berubah pada 14:32. Jawaban ini disusun dengan cakupan terbaru." / "Your access scope changed at 14:32. This answer was composed with the current scope."
- **The banner is neutral chrome, not a warning.** No amber, no icon, no dismiss button: `--surface-subtle`, 1px `--border`, `--text-ui-sm`, `role="status"`. Colouring it would make a fact about the session look like an alert about the content.
- **The banner is about the session, not about the content.** It never says what was removed, how much, or that anything was removed at all. "Scope changed" is a fact about the user's own account; "3 items removed" is a fact about the record.
- **The audit log records both scopes.** Two entries, two scope snapshot ids. A judge can open `/audit` and see the boundary. That is where the disclosure lives — for the auditor, not for the asker.

---

## 5. Tone of voice and copy

Voice: a competent records clerk. Plain, specific, unemotional, never apologetic, never enthusiastic. The new surface is more polished; the voice does not become more polished with it. A finished console and a flat voice are the combination that reads as institutional confidence.

Six rules:

1. **Declarative over hedged.** "Tidak ada catatan siapa yang menyetujui…" not "Sepertinya tidak ada catatan…".
2. **No assistant voice.** The product never says "I", "Saya", or "Senarai menemukan". It reports: "Tercatat 4 peristiwa." The agent is a register, not a correspondent.
3. **Numbers carry units and dates carry years.** "Rp750.000", "25 ton", "14 Okt 2026".
4. **No praise, no reassurance.** Never "Kabar baik!" / "Great question!". Never "Tenang, data Anda aman."
5. **Errors describe the next action, not the failure.** "Coba lagi" plus what will happen, never a status code alone.
6. **One empty message, forever.** The canonical no-record copy is a single string, used for every cause. Any proposal to make it more helpful must be rejected on the grounds that "more helpful" is the leak.

Labels in the new chrome stay short and lowercase-ish in Indonesian, sentence case in English: `Tanya`, `Log audit`, `Akses`, `Ruang kerja`, `Utas`. No exclamation marks, no "Let's", no second person where the register can speak in the third.

### 5.1 Bilingual model

- Indonesian is default; `ID / EN` is a two-state segmented control in the top bar, persisted in a cookie. It governs **chrome only**: navigation, group labels, section headings, buttons, table headers, status pill text, empty and error states, audit column names, permission tags' display names.
- **The answer body is not a translation pair.** It is composed in the language of the question, and retrieved source text stays in its original language, verbatim. A mixed ID/EN answer is correct output, not a bug. The toggle does not re-render retrieved quotes.
- **Citations are never machine-translated.** The drawer shows the original text, and if a gloss is offered it is explicitly marked `gloss` in mono and visually secondary. Translating a quote would break citation fidelity — the one thing an auditor cannot tolerate.
- **Dates and numbers localise with the chrome** (`id-ID` / `en-GB`), because they are chrome, not quoted content.

Reference copy (both languages ship; `FRONTEND.md` §7 holds the catalogue):

| Key | Indonesian (default) | English |
|---|---|---|
| Section 1 | Kronologi | Chronology |
| Section 2 | Yang Masih Terbuka | Still Open |
| Section 3 | Yang Tidak Tercatat | Not on the Record |
| Empty title | Tidak ada catatan | No record |
| Empty body | Tidak ada catatan yang dapat ditampilkan untuk pertanyaan ini. Periksa daftar proyek Anda atau ajukan pertanyaan lain. | There is no record that can be shown for this question. Check your project list or ask a different question. |
| Conflict label | Konflik sumber | Source conflict |
| Gap action | Tinjau & setujui | Review and approve |
| Gate title | Kirim pertanyaan ini? | Send this question? |
| Gate simulated note | Pengiriman disimulasikan dalam demo ini. | Sending is simulated in this demo. |
| Scope banner | Cakupan akses Anda berubah. Jawaban ini disusun dengan cakupan terbaru. | Your access scope changed. This answer was composed with the current scope. |
| No gaps | Semua bagian cerita ini tercatat. | Every part of this story is on the record. |
| Status: open | Terbuka | Open |
| Status: blocked | Terhambat | Blocked |
| Status: overdue | Terlambat | Overdue |
| Status: approved | Disetujui | Approved |
| Status: cancelled | Dibatalkan | Cancelled |
| Nav: workspace | Ruang kerja | Workspace |
| Nav: threads | Utas | Threads |

The empty-state pair above is the single most constrained string in the product: it must be identical for a forbidden topic and a non-existent one, so it names no project, no topic, and no person. If either language version drifts, the equivalence guarantee breaks. The status vocabulary is the second most constrained: it is a closed set of five, and no permission-related value may be added.

---

## 6. Accessibility

Target WCAG 2.2 AA, re-derived for the new palette and surfaces, with four additions this product specifically needs.

### 6.1 Contrast, on the surfaces that now exist

Measured against the surface each token actually sits on, not against paper.

| Pair | Ratio | Requirement | Verdict |
|---|---|---|---|
| `--ink` on `--surface` (#FFF) | 17.9:1 | 4.5:1 | Pass |
| `--ink` on `--bg-app` (#FAF8F4) | 16.9:1 | 4.5:1 | Pass |
| `--ink-secondary` on `--surface` | 9.6:1 | 4.5:1 | Pass |
| `--ink-muted` on `--surface` | 5.9:1 | 4.5:1 | Pass |
| `--ink-muted` on `--surface-subtle` | 5.6:1 | 4.5:1 | Pass |
| `--primary` on `--surface` | 8.5:1 | 4.5:1 | Pass |
| `--primary` on `--primary-tint` | 7.3:1 | 4.5:1 | Pass |
| `--on-primary` on `--primary` | 8.5:1 | 4.5:1 | Pass |
| `--signal-conflict` on `--surface` | 6.0:1 | 4.5:1 | Pass |
| `--signal-conflict` on `--signal-conflict-tint` | 5.3:1 | 4.5:1 | Pass |
| `--signal-gap` on `--surface` | 8.1:1 | 4.5:1 | Pass |
| `--signal-gap` on `--signal-gap-tint` | 7.2:1 | 4.5:1 | Pass |
| `--signal-open` on `--n-100` | 8.5:1 | 4.5:1 | Pass |
| `--focus` on `--surface` (UI, non-text) | 5.7:1 | 3:1 | Pass |
| `--border-strong` on `--surface` (UI boundary) | 2.0:1 | 3:1 | **Fails as a boundary** — borders are never the sole boundary of an interactive control; controls also carry fill or shadow |

Consequences of that last row: an input's boundary is `--border-strong` **plus** a `--surface-subtle` fill, so the control is perceivable without relying on the border. Pills carry tint plus text, never border alone.

### 6.2 Non-negotiable additions

- **Never colour alone.** Conflict = tint band + `⚑` + label. Gap = dashed rule + `G` id + label + 3px accent. Status = pill with text. Active nav = tint **plus** left accent bar **plus** `aria-current="page"`.
- **Focus is always visible and never removed.** `2px var(--focus)` with `2px` offset, on every interactive element including nav items, table row actions, citation chips, and the segmented locale control. `outline-offset` inside the sidebar item radius so the ring is not clipped.
- **Semantics.** Chronology is an `<ol>`; open items are a `<table>` with `<th scope="col">`; the audit log is a `<table>` with `<caption>`; the sidebar is a `<nav>` with `aria-label`; groups are `role="group"` with `aria-labelledby` pointing at the visible group label.
- **Citations are buttons, not spans.** 28px visual mark expanded to a 44px hit area, `aria-label` naming the source kind and date, `aria-expanded` reflecting the drawer.
- **The drawer is a `<dialog>`** with `aria-labelledby`, a focus trap, `Esc` to close, focus returned to the originating mark, and `scroll-padding-top` matching the sticky header so a focused mark is never hidden under it.
- **Sticky table headers do not swallow focus.** Any focusable row action scrolled into view must land below the header: `scroll-margin-top: 48px` on rows.
- **Collapsed sidebar is still operable.** Icon-only items keep their accessible name via `aria-label` and expose it visually through a tooltip on hover **and** focus. The collapse toggle is a 32px button with `aria-expanded` and an accessible name that changes with state.
- **Streaming announces once per section, not per token.** An `aria-live="polite"` region receives "Kronologi selesai, 4 peristiwa" when a section closes.
- **Motion.** Only three transitions exist, all colour-only at 120ms: nav hover, chip hover, segmented-control switch. No elevation animation, no slide-in drawer, no streaming typewriter. Under `prefers-reduced-motion` all transitions drop to 0ms.
- **The scope-change banner is `role="status"`**, so a revocation is announced without stealing focus from the answer being read.
- **The approval gate is reachable and cancellable by keyboard alone**, and its disabled confirm state uses `aria-disabled` plus `aria-describedby` explaining why, rather than a bare `disabled` that removes it from the tab order.

---

## 7. What we deliberately did not do

### 7.1 Prohibitions lifted by this direction

| Was prohibited | Now | Why it changed |
|---|---|---|
| Any card | Cards for discrete objects only: gap blocks, drawer contents, the approval sheet | A gap block genuinely is an object with fields and an action. The prohibition that mattered was never "no cards" — it was "no card around the answer", and that one is retained |
| No box-shadow anywhere | A three-level elevation scale (`--elev-1/2/3`) plus a flat `--elev-0` | Flat-only surfaces read as unfinished on a modern console and cost the product the "shipped" signal. Elevation is now scoped to containers, never to content |
| Radius 2px maximum | 4 / 6 / 8 / 12 / 14 / pill | 2px on a white card reads as a rendering artefact. Radius now encodes object type: chip, control, card, panel, modal |
| Single paper background, one raised tone | App background, content surface, subtle inset, overlay | Layering is how the shell separates itself from the document without a card around the document |
| 220px flat rail, four links | 264px grouped sidebar with project switcher, labelled groups, thread history, identity block | The rail was the weakest element and the most visible "wireframe" tell. Navigation is chrome, and chrome is where polish is spent |
| Four glyphs total | A ten-glyph inline SVG set for navigation, table actions, and drawer controls | A collapsed icon rail needs icons. The prohibition is retained where it mattered: no icons inside the answer, no per-source-kind glyphs, no icon decoration on content |
| Margin column holding date and mark | Date in a fixed sub-column of the row; mark at the end of the line | The sidebar took the width the margin column occupied. The register reading survives because the date still leads the row and the mark still closes the claim |

### 7.2 Prohibitions that remain, and are not negotiable

| Not done | Why |
|---|---|
| Chat transcript, message bubbles, avatars | Bubbles hide structure and provenance and make the staff-vs-manager comparison unreadable. A fixed document shape is the demo |
| A card around the answer, or a card per section | The continuity of the document is the argument. Cards fragment it into modules that can be compared by shape rather than by content |
| Accordions, collapsible sections, shortened answers | All three parts, always, in order, fully rendered |
| Greyed rows, lock icons, muted pills, "N hidden" counters, an access-denied page, a friendlier or illustrated empty state | Every one is a tell. The core claim is that absence is indistinguishable |
| A `Restricted` / `Terbatas` status value | The pill vocabulary is closed at five. A permission-shaped pill is the same tell in a new costume |
| Role colour-coding or role badges | A coloured role badge invites the inference that answers differ by role, which is the inference the design exists to prevent. Roles are plain text |
| A confidence score or percentage per claim | Fake precision. The available signal is source recency and authority, which is a *rule*, and a rule can be named and audited |
| A global search box across all projects | A search that spans scopes leaks the existence of projects by result count. Ask is scoped to the active project |
| Charts, dashboards, project-health gauges, sparklines, KPI tiles | Senarai reports what was recorded, not how the project is doing. A gauge would be an opinion the sources do not support. This also rules out the "summary stat cards" row that a modern console would normally open with |
| Auto-send, scheduled send, bulk draft, "send all gaps" | The approval principle is one human, one action, one message. Convenience here is the failure mode |
| Translating retrieved source text | Breaks citation fidelity. Glosses are allowed only when explicitly marked |
| An "AI is thinking" animation, typing indicator, or visible reasoning trace | The reasoning is shown as the audit log — a durable artifact — rather than as ephemeral theatre. A typing indicator would also make the product read as a chat app |
| A dark mode | The palette is derived for warm light surfaces; a dark variant would require re-deriving three signal hues and the whole elevation scale, and would not be tested before the deadline |
| Real WhatsApp / Drive / Trello integrations | Out of scope per the plan. The gate says "simulated" rather than pretending |
| A mobile-native app | Web only. The sidebar becomes an off-canvas drawer below 900px and the answer collapses to a single column, which is adequate for a judge on a phone |

---

## 8. Assumptions and missing details

The plan leaves these open. Each has a recommended default so the team is not blocked; none is settled by the brief.

| # | Gap in the plan | Why it matters | Recommended default |
|---|---|---|---|
| A1 | Permission granularity is unspecified — project, topic, or field level | Determines the whole filter function and the demo's credibility | **Project + topic tag**, two levels. Each source carries `projectId` and `topicTags[]`; each role grants `'*'` or an explicit tag list. Field-level (per-column) is out of scope and said so in the README |
| A2 | "Who might know" is inferred from participant metadata that may itself be permissioned | If the participant list is hidden, naming a person leaks that the channel exists | Derive only from sources the asker can already see. If no visible source yields a participant, **omit the name** and keep the gap. Never fall back to a directory lookup |
| A3 | The record-gap heuristic is never defined | If the model decides what counts as a gap, the hero feature is unverifiable | Deterministic rules in code, model only phrases them. Three rules: (a) a causal question with no visible source stating a cause for the named event; (b) a blocked open item with no owner or no due date; (c) a chronology interval over 5 days containing a blocked task. Demo-only threshold, stated as such |
| A4 | "Identical response" is asserted but not specified at the API layer | A single differing byte or millisecond breaks the challenge's Example Test 1 | One frozen canonical payload for both paths, no query echo, HTTP 200, same headers, and a minimum response floor (600ms) on all answers. Timing side-channels are acknowledged, not solved — see `FRONTEND.md` §10.3 |
| A5 | Whether the audit log is itself permissioned | A full log visible to staff leaks exactly what the answer layer hides | Scoped: actor sees own entries, manager sees entries in their projects, admin sees all. Demo runs as admin for judging. The log's own scoping is a stated limitation |
| A6 | How bilingual affects citation fidelity | Translating a quote would make the citation unverifiable | Quotes are never translated. Chrome-only translation. A mixed ID/EN answer is correct. Glosses marked as glosses |
| A7 | What happens when the asker's role changes mid-answer | A partially rendered answer under an old, wider scope is a leak | Abort the stream, discard the partial document, re-resolve scope, re-request or return canonical empty. Session banner announces the scope change; the audit log records both snapshots |
| A8 | Whether the question text itself is stored in the audit log, and whether it may contain PII | The log is the most-quoted artifact and the easiest place to leak a NIK | Log the masked question. Store the raw text only if a judge-facing export needs it; default to masked |
| A9 | Whether the drafted question has a real recipient address | The gate implies a channel that does not exist | Show a channel *label*, not an address. State "simulated" in the gate. No network call |
| A10 | Which source wins a conflict, exactly | "Newer or more authoritative" is two rules in one sentence | Fixed precedence: newer document version > task board update > chat message; ties broken by recency. Encode as a rule id shown in the note, so the choice is auditable |
| A11 | Whether the three-part structure may ever be shortened for a trivial question | A one-line answer in a three-section document looks absurd | Keep all three headings always; allow sections 1 and 2 to render a single row and section 3 to render the "all on the record" line. Structural consistency beats brevity |
| A12 | Whether citations may reference a source that is masked | A citation pointing at a fully masked source is a dead end | Masked fields render as `••••` inside the drawer with the reason ("data pribadi"), and the source remains citable. Removing the citation would hide that the source was used |
| A13 | How much shell the team can afford in six days | A grouped sidebar, top-bar breadcrumb and table craft are roughly a day of the two-person budget, and the answer document is the score | Shell scope is fixed at: sidebar with two groups and a project switcher, top bar with breadcrumb and locale toggle, table craft on open items and audit. Cut order and the items that are never cut are in `FRONTEND.md` §13 |
| A14 | Whether the collapsed sidebar hides the project switcher | In a 72px rail the switcher has no room for a name, and losing project identity makes every answer ambiguous | Collapsed rail keeps the project switcher as a 40px button showing the project's two-letter code in mono, with the full name as tooltip and accessible name. Project identity is never hidden |
| A15 | Whether the status pill vocabulary can grow for other screens | A new value (e.g. `Tertunda`) is how a permission-shaped pill gets introduced by accident | Closed set of five, defined in one file, and a test asserts no component passes a literal status string. Any new value requires a note in this document |
