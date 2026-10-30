# Phase 2 — Composition, gaps, conflict, masking, source drawer

**Day:** 2
**Goal:** Full three-section answer composed from real data for one role. Source drawer opens via `?source=` deep link. Gap detection and conflict resolution run in the pipeline.

**Person A (data + agent surface):**
- Create `lib/answer/compose.ts` — assemble `AnswerPayload` from ranked sources. Chronology (merge events), open items (extract tasks), gaps (call `detect.ts`), conflicts (call `resolve.ts`). Assign citation markers sequentially. See `backend.md` §6.4.
- Create `lib/answer/sections.ts` — section-level helpers (empty-section copy, "all on record" copy).
- Create `lib/answer/canonicalEmpty.ts` — `Object.freeze` the static fields. No query echo. Constant timestamp. See `backend.md` §5.2.
- Create `lib/gaps/detect.ts` — three deterministic rules: `no-cause`, `ownerless-blocked-item`, `silent-interval` (5-day threshold). Thresholds are constants in this file. See `backend.md` §7.1.
- Create `lib/gaps/knowers.ts` — derive knower from visible sources only. Omit if no visible basis. No directory lookup. See `backend.md` §7.2.
- Create `lib/gaps/draftQuestion.ts` — one template per rule. Not model-generated. See `backend.md` §7.3.
- Create `lib/conflict/resolve.ts` — fixed precedence: newer-version > board-over-chat > explicit-correction. Tie → recency. Store rule id. See `backend.md` §8.1.
- Create `lib/mask/pii.ts` — mask NIK (16 digits), phone (08... and +62...). Runs before retrieval. See `backend.md` §9.1.
- Write `vitest` tests for `gaps/detect` (each rule), `conflict/resolve` (precedence), `mask/pii` (NIK and phone patterns).

**Person B (shell + document UI):**
- Create `components/sources/SourceDrawer.tsx` — `<dialog>`, 480px docked at ≥1440px, 420px at 1280–1439px, full-height sheet below 1280px.
- Create `components/sources/DrawerHeader.tsx` (sticky, kind pill + close), `SourceMeta.tsx` (two-column definition list), `QuoteBlock.tsx` (serif quote with 2px primary left rule), `GlossLine.tsx` (mono gloss, secondary), `MaskedField.tsx` (`••••` + reason label).
- Implement `?source=S12` deep link — drawer opens on first paint (server-rendered). No client fetch.
- Create `components/answer/AnswerDocument.tsx` — client component, owns the stream, composes three sections inside one `Surface level={0}`.
- Create `components/answer/AnswerHeader.tsx`, `ChronologySection.tsx`, `OpenItemsSection.tsx`, `RecordGapsSection.tsx`.
- Create `components/register/ConflictNote.tsx` — `⚑` + label + rule sentence on the conflict tint, `Surface level={1}`.

**Shared checkpoint:**
- A full three-section answer renders from real data (one role, one project).
- The source drawer opens via `?source=` deep link, shows verbatim quote, metadata, masked PII.
- At least one answer synthesizes chat, doc, and task sources in a single response (FR-1 / T09).
- Gaps render with the correct rule id and drafted question.
- Conflicts render inline on the affected chronology row with the rule named.

**Acceptance criteria:**
- `vitest run lib/gaps lib/conflict lib/mask` passes.
- The three-section answer always renders all three headings, even when a section is empty (stated absence line, not collapsed).
- No summary paragraph appears above the sections.
- Citations are numbered sequentially in reading order across all three sections.
- `AnswerDocument` renders `<Surface level={0}>` and does not import `Card` or `Panel`.
