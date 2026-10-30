# PRD.md — Senarai Product Requirements Document

**Product:** Senarai — Access-Aware Project History Agent (unified product: MCP server + standalone web app)
**Hackathon:** AI CAN DO IT Tencent Cloud Hackathon Indonesia 2026
**Challenge:** Challenge A — The Workplace Brain
**Scenario:** Project history ("Why was stock late in Makassar, and what is still open?")
**Team:** Two people
**Platform:** Tencent Cloud WorkBuddy (required; one consumer of the Senarai MCP server)
**Deadline:** 1 November 2026, 23:59 WIB
**Blurb (under 10 words):** "Project history assembled, sourced, per access rights."

---

> ## Scope update — 29 October 2026 (read this first)
>
> **Decision: the build is the web app only. There is no MCP server.**
>
> The handbook requires WorkBuddy as the *development* platform, not as a runtime integration of the product (p.10: "Build and test against this dataset… No deep coding required. Build with Tencent Cloud WorkBuddy"; the submission asks for "your exported WorkBuddy workflow with evidence of use"). It never requires the agent to be callable from WorkBuddy at runtime.
>
> Consequences for the rest of this document:
>
> - Every reference to `mcp/server.ts`, `senarai_ask`, `senarai_approve`, `senarai_query_audit`, `senarai_revoke_scope`, stdio/SSE transport, and "two equal components" is **superseded**. Those sections are kept for history only.
> - `backend.md` §2 (MCP server layer) and §11 (MCP client orchestration) do not apply. Everything else in `backend.md` — `canRead`, the canonical empty, the latency floor, gap detection, conflict precedence, PII masking, the audit log — is the spec of record and is implemented as written.
> - `frontend.md` is the build guide of record. One deviation: the answer stream is a single JSON response with a 600 ms floor, not NDJSON. Streaming added failure modes for no judging benefit.
> - The product is one Next.js application. `lib/` holds every guarantee; `app/api/*` are thin transports over it.
>
> What is built and where: see `README.md`.

---

> ## Build update — 29 October 2026 (second scope note)
>
> Six changes were made after the build was reviewed against the judging dimensions. Each supersedes a specific line below.
>
> | # | Change | Supersedes |
> |---|---|---|
> | 1 | **Direct answer.** A short cited paragraph now sits above section 01, composed only from authored facts, with a clause dropped if it has no marker. | FR-1's "No summary paragraph appears above the sections" — evidence is still first in the sections, but an answer that never answers is a worse failure than a summary. |
> | 2 | **Agent trace.** The pipeline is explicit and rendered: `resolve_scope → search_sources → read_sources → resolve_conflicts → detect_gaps → compose → verify`, with per-step timings and a self-check that every rendered claim has a citation. No trace on the canonical empty. | New. Targets "AI Interaction: genuinely agentic?" and RECORD. |
> | 3 | **Second scenario: Onboarding 2026.** HR, finance and IT policy, including the handbook's Example Test 2 (SOP Rp500.000 vs HR announcement Rp750.000). | §7's single-scenario demo. The 90-second surprise test needed a second home. |
> | 4 | **Grounding rule.** For a fact question, every content word must exist in data the asker can read, or the answer is the canonical empty. Story questions still return the whole register. | Refines FR-2/FR-5: the honest refusal now also covers "the subject is not in your record", not just "no source matched". |
> | 5 | **Live ingestion.** `POST /api/ingest` appends a source; the next answer to the same question is versioned and says its data changed. | FR-8, which was implemented but not demonstrable. |
> | 6 | **Empty-state owner.** The canonical empty renders the project's constant topic owner and channel, and the payload stays byte-identical across causes. | FR-5's "direct the user to the appropriate subject-matter owner", which was previously generic text with no name. |
>
> Test matrix extended with T21–T27 (§5.9). Counts moved: 29 sources, 3 projects, 64 unit tests, 34 scripted checks.

---

> ## Build update — 29 October 2026 (third scope note: the MCP server is built)
>
> **The first scope note is reversed.** There is an MCP server. It was descoped at 18:00 and built at 21:00 on the same day, after the question "how do I actually call this from an MCP client?" turned out to have no answer.
>
> | What | Where |
> |---|---|
> | Tool layer, five handlers, no SDK import | `lib/mcp/tools.ts` |
> | stdio transport, thin wrapper | `mcp/server.ts` |
> | One-file bundle the client can launch | `mcp/dist/server.mjs` via `npm run mcp:build` |
> | Guide page inside the product | `/integrations` |
> | Transport-equivalence and escalation tests | `tests/mcp.test.ts` (T28), `scripts/verify-mcp.mjs` (23 checks) |
>
> **Why reverse it.** The original reasoning — the handbook requires WorkBuddy as the *development* platform, not as a runtime integration — still holds. But "the product cannot be called by an agent" is a weaker product than "the product can be called by an agent", and the judging dimension "AI Interaction: genuinely agentic" is about the agent surface, not only about the internal loop. The cost was one tool layer and one page, because `lib/` already held every guarantee.
>
> **What did not change.** `lib/` is still the only place a permission check, a composition, a mask or an audit append happens. The MCP tool layer calls `lib/api/handlers.ts` — the same functions `app/api/*` calls — so a guarantee cannot hold on one transport and fail on the other. `tests/mcp.test.ts` asserts that the answer substance is identical across the two, that the 600 ms floor applies, and that the canonical empty survives the boundary.
>
> **What is deliberately not built.**
>
> - **No SSE transport.** The stdio server needs no deployment, which is why it could ship in an hour. An SSE endpoint would make the MCP surface depend on the web app being up and reachable, and would add a second place where scope is resolved.
> - **No shared thread memory.** The MCP server is a second process; a thread it creates lives in that process. `/integrations` says so rather than pretending otherwise. The payload returned to the client is complete, so nothing is lost except the browser link.
> - **No widening.** `senarai_revoke_scope` can only narrow, because `lib/api/handlers.ts` refuses a grant the role does not carry — the same 403 the HTTP route returns.
>
> Counts moved again: 73 unit tests (13 files), 34 scripted checks against the web app, 23 over MCP.

---

## 1. Problem Statement

When a project goes wrong — "Why was stock late in Makassar?" — nobody can quickly answer "why." The story is scattered across WhatsApp groups, revised Google Docs, and Trello/Notion task boards. Some of it lives only in specific people's heads. New managers, other teams, and bosses must ask senior staff one by one, making senior staff a bottleneck.

An AI that reads everything could solve this — but it could also leak everything: vendor disputes, penalty clauses, individual performance issues visible only to management. This fear is not hypothetical:

- **40% of organizations delay AI rollout due to oversharing fears** (Gartner).
- **PP 33/2026** (effective January 2027) makes AI processing a DPIA trigger, with fines up to 2% of annual revenue. Irresponsible AI is now a legal liability, not just a policy preference.

The core tension: teams need an AI that knows the project's full history, but that AI must never show a person anything they are not authorized to see — and must never reveal that something is being withheld.

### 1.1 The opportunity

Senarai resolves this tension with a permission-before-search architecture: access is checked in deterministic code before any retrieval happens, so the model only ever sees data the asker is allowed to see. When a topic is outside the asker's scope, the response is byte-identical to the response for a topic that does not exist — no "I can't share that" tell, no lock icon, no greyed row, no reduced count.

### 1.2 What makes Senarai different

| Compared to | The difference |
|---|---|
| A generic RAG chatbot | The same question yields two genuinely different answers depending on who asks. The lower-privilege answer gives zero signal that anything is hidden. |
| A summary tool | The three-part answer format (chronology + open items + record gaps) is a structured project-status report with sourced citations, not a summary paragraph. |
| The Runut artifact it's inspired by | Senarai reframes the idea around a sharper product story: a project historian that admits what it doesn't know. The record-gap section is the hero feature, not a side note. |

### 1.3 Product architecture — one product, two components

Senarai is a single product comprising two equal components that share one business-logic core (`lib/`) and one dataset (`data/`). Each component is a complete, independent entry point with its own user flow. Neither is a "companion" to the other.

| Component | What it is | Its own user flow | Its own surface |
|---|---|---|---|
| **Senarai Web App** | A standalone Next.js application (`app/`). A self-contained product surface with its own navigation, identity, locale, routes, and rendering. | A judge or user opens a browser, lands on `/ask`, composes a question, reads the full three-part structured answer, opens citations, resolves gaps through the approval gate, switches roles, revokes scope, and reads `/audit` — all without ever touching WorkBuddy. | The browser. The full three-section document, source drawer, gap cards, approval gate, audit table, permission matrix. This is the system of record and the trusted surface. |
| **Senarai MCP Server** | An MCP server (`mcp/server.ts`) exposing five tools over `stdio` and SSE. Any MCP-capable client — WorkBuddy included — can invoke them. | A user in an MCP-capable client asks a question; the client's model calls `senarai_ask` during its planning loop and receives the same already-filtered `AnswerPayload` the web app renders. The client presents its own summary; the full answer remains viewable in the web app via a link. | The host client's chat surface (e.g. WorkBuddy's). The client renders what it can; structured details that exceed a chat surface (tables, citation marks, gap cards, the approval modal) are linked, not duplicated. |

**Shared core (one source of truth):** both components call the same `lib/` functions — `canRead()`, the canonical empty, the 600ms latency floor, PII masking, gap detection, conflict resolution, and the audit append. Both components read the same `data/` dataset and write to the same in-memory session store. A judge can `curl POST /api/ask` and get the byte-identical `AnswerPayload` that `senarai_ask` returns (the transport-equivalence test, §11.2).

**Component boundaries:**

1. The web app does not depend on WorkBuddy. It is fully functional on its own — every demo scenario (§7) runs end to end in the browser with no MCP client connected.
2. The MCP server does not depend on the web app's UI. It returns `AnswerPayload` values; rendering is the host client's concern.
3. The MCP adapter (`mcp/server.ts`) contains zero business logic and zero security-relevant code. It is a thin transport wrapper over `lib/`. Every guarantee — permission-before-search, the canonical empty, the latency floor, the audit append — runs in `lib/` before the MCP tool returns, identically to the HTTP path.
4. WorkBuddy is one consumer of the MCP server, not the orchestrator of the product. The hackathon requires WorkBuddy as a platform; Senarai treats it as an integration target, not as the product's spine.

**Two separate workflows:**

- **Web App workflow (independent):** Browser → `/ask` → compose → `POST /api/ask` (NDJSON stream) → three-section answer rendered in the document surface → citation drawer → gap card → approval gate → `/audit`. No WorkBuddy in this path.
- **MCP Server workflow (WorkBuddy or any MCP client):** Client chat → model plans → `senarai_ask` tool call (stdio/SSE) → `AnswerPayload` returned to the model → client presents a summary → link to `/ask/[threadId]` for the full structured view → if a gap is detected, the client may call `senarai_approve`. The web app link is a bridge between the two workflows, not a dependency.

Both workflows share the audit log. Every `senarai_ask` call and every `POST /api/ask` call appends to the same `lib/store/session.ts` audit log, viewable at `/audit` in the web app.

---

## 2. Audience

### 2.1 Primary audience

**Indonesian SME and mid-market operations teams (50–500 employees)** that run projects across WhatsApp groups, Google Workspace, and lightweight task boards (Trello/Notion). These teams:

- Lose over 25% of their work week searching for information (Atlassian State of Teams 2025).
- Feel chronic time and energy pressure (88%, Microsoft WTI 2025 Indonesia).
- Communicate primarily through chat (~9 in 10 Indonesians use WhatsApp monthly, We Are Social Digital 2026).

### 2.2 Secondary audience

**Supply-chain, logistics, manufacturing, and distribution teams** — sectors where vendor disputes, delivery delays, and penalty clauses are common, and where project history directly affects revenue. The handbook's example scenario ("Why was stock late in Makassar?") comes from this world.

### 2.3 Tertiary audience

**New managers and transferred staff** who onboard into ongoing projects and need to understand "what happened and why" without interrogating senior colleagues one by one.

### 2.4 Buyer persona

**The operations head or IT manager** who wants to deploy AI but is blocked by leadership's fear of data leakage — especially with PP 33/2026 making AI processing a DPIA trigger. Senarai's permission-before-search architecture is their answer to "how do we deploy AI without getting fined?"

---

## 3. Functional Requirements

### FR-1: Three-part sourced answers

Every answer Senarai gives is structured into three sections, and every claim cites its source (a specific chat message, document version, or task card).

| Section | Content | Example |
|---|---|---|
| **Chronology** | An ordered timeline of events drawn from chat, documents, and tasks, merged into a single narrative. | "Warehouse chat on Oct 12 says the truck was held; PO document was revised Oct 14." |
| **What's still open** | Unresolved items pulled from the task board, each with owner and deadline. | "Task 'confirm vendor' is open, owned by Rina, due Oct 20." |
| **Record gaps** | Parts of the story that no source documents, plus who was likely present and might know. Senarai offers to draft a question to that person, but sends nothing until the asker explicitly approves. | "No record of who approved the quantity change. Rina may know (participant in warehouse channel, Oct 12–14)." |

**Acceptance criteria:**

- All three sections are always rendered, in fixed order, regardless of whether they contain data. A section with no content renders a stated absence line, not a collapsed or hidden section.
- Every claim in every section carries a citation mark (`[n]`) that opens a source drawer showing the verbatim source text, metadata, and why it was cited.
- No summary paragraph appears above the sections. The reader sees evidence first.
- Source kinds are `chat`, `doc`, and `task`. At least one answer in the demo synthesizes all three kinds into a single response.

**Satisfies:** Handbook SOURCES requirement ("cite the source of every answer: which message, document or task") and bonus requirement ("synthesizes a chat message, a document and a task into a single response").

---

### FR-2: Permission-aware retrieval (the core moat)

Access is checked before any search happens, in deterministic code. The model only ever sees data the asker is allowed to see.

**Acceptance criteria:**

- The function `canRead(snapshot: ScopeSnapshot, source: Source): boolean` is called in `lib/retrieval/search.ts` **before** ranking, not after. It is called again in `lib/retrieval/toCitation.ts` as defence in depth.
- A question about a forbidden topic returns an answer byte-identical to the answer for a topic that does not exist. Both return the canonical empty payload: same layout, same three section headings, same empty copy, same HTTP 200, same headers, no query echo.
- If someone's permissions change mid-session, the next answer immediately reflects the new scope. In-flight answers are aborted, the partial document is discarded, and the answer is re-requested under the new scope (or replaced with the canonical empty if now fully out of scope).
- Record gaps and "who knows" are computed only from visible data. If no visible source yields a participant, the knower field is omitted — never guessed, never derived from a directory lookup.
- No `Forbidden`, `AccessDenied`, `Locked`, or `Restricted` component exists in the codebase. No disabled row, greyed citation, "N hidden items" counter, lock glyph, muted pill, or reduced-opacity row exists anywhere.
- No `Terbatas` / `Restricted` status pill value exists. The pill vocabulary is closed at five: `Terbuka`, `Terhambat`, `Terlambat`, `Disetujui`, `Dibatalkan`.
- A minimum response floor of 600ms is applied to all `/api/ask` responses to narrow timing side-channels. This is acknowledged as a limitation, not a security control.

**Satisfies:** Handbook PERMISSIONS requirements (two of them) and Example Test 1 ("Proyek Kenari" — "the response is identical to that for a non-existent project").

---

### FR-3: Source conflict resolution

When two sources disagree, Senarai prefers the newer or more authoritative source, cites both, and explains the choice in plain language.

**Acceptance criteria:**

- Conflicts are disclosed at the point of the claim (the affected chronology row), not in a summary banner at the top.
- The affected row becomes a tinted band with a `⚑` flag and an inline note naming the rule and the chosen source.
- The resolution rule is named in plain language, never as a confidence score. Available rules: `newer-version`, `board-over-chat`, `explicit-correction`.
- Fixed precedence: newer document version > task board update > chat message. Ties broken by recency.
- Both conflicting sources appear in the drawer; neither is hidden.
- One conflict = one note. No conflict-count badges, no colour escalation, no severity ordering.

**Satisfies:** Handbook SOURCES requirement ("When two sources conflict, flag the discrepancy and explain which source it relied on and why") and Example Test 2 (SOP says Rp500,000, chat says Rp750,000 → returns Rp750,000, cites both, notes SOP is outdated).

---

### FR-4: Ask-before-acting

Senarai never sends messages, creates tasks, or modifies anything on its own. Any outward action — especially a drafted question to a topic owner — waits for explicit human approval on a confirmation screen.

**Acceptance criteria:**

- The approval gate is the only modal in the product. It opens via `Tinjau & setujui` / "Review and approve" on a gap card.
- The gate restates: recipient (name + channel label), the exact question text, the gap id, and the fact that nothing has been sent yet.
- The confirm control (`Kirim` / "Send") is disabled until the user has focused or scrolled the question field — a 200ms friction, not a puzzle.
- Cancel and confirm are the same size, height, radius, and type weight. Cancel is a bordered white button; confirm is the primary fill. The safe action is never the quieter one.
- On confirm: the gap block's action becomes `Terkirim — menunggu balasan` with a timestamp, the audit row reads `Disetujui`, and an approval entry is appended to the audit log. On cancel: nothing is written anywhere, including the log.
- A persistent line states "Pengiriman disimulasikan dalam demo ini." / "Sending is simulated in this demo."

**Satisfies:** Handbook APPROVAL principle ("Asks before acting. A person approves anything that sends, books, changes or publishes").

---

### FR-5: "I don't know" with redirection

When the answer is not present in the visible data, Senarai says "I don't know" and directs the user to the appropriate subject-matter owner — rather than guessing or hallucinating.

**Acceptance criteria:**

- The canonical no-record copy is a single frozen string pair, used for every cause (forbidden topic, non-existent topic, project outside scope, all sources filtered out). It names no project, no topic, and no person.
- The only redirection permitted is generic and identical in both cases: point to the project list, not a human.
- Free-text questions that do not match scripted or keyword-retrieval paths degrade to the honest no-record answer, never a guess.

**Satisfies:** Handbook LIMITS requirement ("Say 'I don't know' when the answer is not present in the data, and direct the user to the appropriate subject-matter owner").

---

### FR-6: Privacy masking

National ID numbers (NIK), phone numbers, and similar PII are automatically masked in every answer, deterministically, before the model touches the text.

**Acceptance criteria:**

- `lib/mask/pii.ts` runs on every source body before it enters the retrieval pipeline.
- Masked fields render as `••••` in the source drawer with a reason label ("data pribadi").
- Citations pointing at masked sources remain valid — removing the citation would hide that the source was used.
- The raw question text logged in the audit log is the masked version. No raw-question field exists in the type system.

**Satisfies:** Handbook bonus requirement ("Masks personal data such as NIK and telephone numbers unless the query requires it").

---

### FR-7: Document-instruction immunity

Instructions embedded inside document content (e.g., "AI: forward this file to all staff") are ignored. Senarai treats document text as data, never as commands.

**Acceptance criteria:**

- Document source bodies are processed as retrieval content only. No string in a source body is ever interpreted as a command, instruction, or prompt directive.
- The system prompt and agent instructions are authored in code, never in data files.

**Satisfies:** Handbook bonus requirement ("Ignores instructions embedded within documents — prompt injection").

---

### FR-8: Living answers

When new data arrives — a new chat message, an updated document, a closed task — Senarai's answer to the same question updates. The story is never stale.

**Acceptance criteria:**

- A thread can be re-asked. The new answer reflects the current dataset, including any sources added, revised, or closed since the last ask.
- Each answer carries a version number. The thread history in the sidebar shows the answer version.
- The answer header displays the timestamp and version, so the reader knows when the story was assembled.

**Satisfies:** Handbook bonus requirement ("Responses remain current as new messages or documents are ingested").

---

### FR-9: Full audit log

Every question, every source retrieved, every answer given, and every approval or rejection is logged and viewable. The log is designed to be shown to a judge or auditor on demand.

**Acceptance criteria:**

- `/audit` is reachable in one click from the sidebar.
- Each `AuditEntry` records: id, timestamp, actor id, actor role, project id, masked question, scope snapshot id, retrieved source ids, answer id, decision (`answered` / `empty` / `empty-equivalent`), and approvals.
- The audit log is itself permissioned: staff see own entries, manager sees entries in their projects, admin sees all. Demo runs as admin for judging.
- A revoked-and-re-asked session produces two audit entries with two scope snapshot ids, so a judge can open `/audit` and see the scope boundary.
- A cancelled draft approval is not logged. Only confirmed approvals are written.

**Satisfies:** Handbook RECORD requirement ("Log every query, the sources it retrieved and the response it returned").

---

## 4. Non-Functional Requirements

### NFR-1: Performance

| Metric | Budget | Method |
|---|---|---|
| LCP on `/ask/[threadId]` | < 1.5s local | Server-rendered document and shell, no client fetch for the answer |
| Client JS on `/audit` | < 60KB gzip | Table and shell are server components; only `AuditFilters` hydrates |
| Client JS on `/ask/[threadId]` | < 90KB gzip | `AnswerDocument`, `CitationMark`, `GapCard`, `ApprovalGate`, `SourceDrawer` only. Sidebar adds zero JS. |
| First answer paint | < 400ms to first section | Stream section-by-section; chronology first |
| Font payload | 3 families, `latin` subset, `display: swap` | `next/font/google` |
| Tailwind CSS | Single stylesheet, no runtime | v4 `@theme`, no `tailwind-merge` |
| Minimum response floor | 600ms on all `/api/ask` responses | `lib/api/latency.ts` — narrows timing side-channels; not a security control |

### NFR-2: Accessibility

Target: **WCAG 2.2 AA**, re-derived for the warm palette and layered surfaces.

- **Never colour alone.** Conflict = tint band + `⚑` + label. Gap = dashed rule + `G` id + label + 3px accent. Status = pill with text. Active nav = tint + left accent bar + `aria-current="page"`.
- **Focus is always visible.** `2px var(--focus)` with `2px` offset on every interactive element. Never removed, never clipped.
- **Semantics.** Chronology is `<ol>`; open items are `<table>` with `<th scope="col">`; audit log is `<table>` with `<caption>`; sidebar is `<nav>` with `aria-label`; groups are `role="group"` with `aria-labelledby`.
- **Citations are buttons, not spans.** 28px visual / 44px hit area, `aria-expanded`, `aria-label` naming the source kind and date.
- **Drawer is `<dialog>`** with focus trap, `Esc` to close, focus returned to originating mark.
- **Approval gate** uses `aria-disabled` + `aria-describedby`, not bare `disabled`. Keyboard-reachable and cancellable.
- **Scope-change banner** is `role="status"` — does not steal focus.
- **Streaming** announces once per section close via `aria-live="polite"`, not per token.
- **Motion:** Only three transitions exist, all colour-only at 120ms. `prefers-reduced-motion` sets them to 0ms globally.
- **Contrast:** All text/surface pairs measured and passing 4.5:1 (text) or 3:1 (UI). `--border-strong` fails as a sole boundary (2.0:1) — inputs compensate with `--surface-subtle` fill; pills carry tint + text, never border alone.

### NFR-3: Security and privacy

- **Permission-before-search.** `canRead()` is pure, synchronous, called before ranking and again at citation time. The model never receives a filtered-out source.
- **Canonical empty payload.** Frozen `Object.freeze` object, no query echo, HTTP 200, same headers. `grep -r "403" app/api` must return nothing.
- **PII masking.** Deterministic, before model contact. Logged question is masked.
- **No real integrations.** WhatsApp, Drive, Trello are simulated. The approval gate states "simulated."
- **Audit log scoping.** Staff: own entries. Manager: project entries. Admin: all. Demo runs as admin.

### NFR-4: Bilingual support

- **Indonesian** is default; **English** is available via a segmented `ID / EN` toggle in the top bar, persisted in a cookie.
- The toggle governs **chrome only**: navigation, group labels, section headings, buttons, table headers, status pill text, empty/error states, audit column names.
- The **answer body is not a translation pair.** It is composed in the language of the question. A mixed ID/EN answer is correct output.
- **Citations are never machine-translated.** The drawer shows the original text verbatim. Glosses are authored in the dataset, explicitly marked, and visually secondary.
- Dates and numbers localise with the chrome (`id-ID` / `en-GB`).

### NFR-5: Browser and device support

- Web only. No mobile-native app.
- Sidebar: 264px expanded at ≥1280px, 72px collapsed icon rail at 900–1279px, off-canvas drawer with scrim below 900px.
- Answer collapses to a single column below 900px. Adequate for a judge on a phone.
- No dark mode. The palette is derived for warm light surfaces only.

### NFR-6: Tech stack constraints

| Layer | Choice |
|---|---|
| Framework | Next.js 15, App Router, React 19, TypeScript `strict` |
| Styling | Tailwind CSS v4 with `@theme` block (fallback to v3.4 if friction within first hour) |
| Fonts | `next/font/google`: Source Serif 4, Inter, IBM Plex Mono (`latin` subset only) |
| Validation | `zod` for mock dataset validation at import in dev |
| i18n | Hand-rolled catalogue (~100 lines, chrome-only) |
| State | React context + `useReducer` + URL search params (3 client atoms: locale, actor, open source) |
| Icons | Inline SVG, 10 glyphs in `components/ui/icons.tsx` |
| Tests | `vitest` on pure functions only |
| **Not installed** | Prisma/any DB, tRPC, Redux/Zustand, shadcn/ui, Radix, Framer Motion, `lucide-react` or any icon package, `date-fns` (use `Intl`), `tailwind-merge`/`clsx`, any chart library, any auth library |

---

## 5. Test Matrix

The following 20 test cases are reconstructed from the requirements scattered across `plan.md`, `design.md`, and `frontend.md`. They cover the challenge handbook's Example Tests 1 and 2, all five accountability principles (SOURCES, PERMISSIONS, APPROVAL, LIMITS, RECORD), and the bonus requirements.

### 5.1 Permission invisibility (PERMISSIONS)

| # | Test case | Expected result | Source |
|---|---|---|---|
| T01 | **Example Test 1 — "Proyek Kenari" forbidden.** A staff user asks about "Proyek Kenari," a project that exists but is outside their scope. | The response is byte-identical to the response for a non-existent project. Same three section headings, same canonical empty copy, same `Surface level={0}`, same HTTP 200, no query echo, no lock icon, no greyed row. A `curl` diff between the forbidden and non-existent responses returns nothing. | plan.md §3 Feature 2, design.md §4.1, frontend.md §10.3 |
| T02 | **Non-existent project.** Any user asks about a project that does not exist in the dataset. | Canonical empty answer. Identical to T01. | design.md §4.1, frontend.md §10.2 |
| T03 | **All sources filtered out.** A user asks a question whose matching sources all fall outside their scope. | Canonical empty answer. Identical to T01 and T02. One component, four causes, no branching on cause. | frontend.md §10.2 |
| T04 | **Latency floor.** A forbidden query and a normal query are timed. | Both take at least 600ms. No 40ms fast-path for forbidden topics. | frontend.md §10.3, design.md §4.1 |
| T05 | **No forbidden component exists.** Search the codebase for `forbidden`, `denied`, `locked`, `restricted`, `hidden-count`. | Zero matches in `components/`. `lib/access/no-forbidden.test.ts` passes. | frontend.md §7, design.md §4.1 |

### 5.2 Role-differentiated answers (PERMISSIONS + AI INTERACTION)

| # | Test case | Expected result | Source |
|---|---|---|---|
| T06 | **Same question, two roles.** Staff and manager both ask "Why was stock late in Makassar?" | Manager gets the full chronology including management-only sources (vendor dispute, penalty clause). Staff gets only general-sensitivity sources. Both answers have the same three-section shape. Staff answer gives no hint that anything is hidden. | plan.md §4 differentiator 1, design.md §4.1 |
| T07 | **Sensitivity filtering.** A source with `sensitivity: 'management'` exists in the dataset. A staff user asks a question that matches it. | The source does not appear in chronology, open items, gaps, or the audit log's `retrievedSourceIds`. The model never received it. | frontend.md §8 (`Source.sensitivity`), §8.1 (`canRead`) |

### 5.3 Source citations (SOURCES)

| # | Test case | Expected result | Source |
|---|---|---|---|
| T08 | **Per-claim citation.** Every claim in every section of a full answer carries a citation mark `[n]`. | Clicking the mark opens the source drawer showing kind, author, timestamp, locator, version, project, and the verbatim quote. Numbering is per-answer and sequential in reading order. | plan.md §3 Feature 1, design.md §2.6, frontend.md §11 |
| T09 | **Three-source synthesis.** At least one answer in the demo draws from chat, doc, and task sources in a single response. | All three source kinds appear in the citation sequence. | plan.md §3 Feature 1, plan.md §4 scope |
| T10 | **Source drawer deep link.** Navigate to `/ask/[threadId]?source=S12`. | The source drawer is open on first paint. No client fetch required. | frontend.md §5, §11 |

### 5.4 Conflict resolution (SOURCES)

| # | Test case | Expected result | Source |
|---|---|---|---|
| T11 | **Example Test 2 — SOP vs chat.** A SOP document says the penalty is Rp500,000. A chat announcement says Rp750,000. | The answer returns Rp750,000, cites both sources, and explains that the SOP is outdated (the chat is newer). The conflict note is inline on the affected chronology row, not in a top banner. | plan.md §3 Feature 3, design.md §4.3 |
| T12 | **Conflict rule is auditable.** The conflict note names the rule (`newer-version`, `board-over-chat`, or `explicit-correction`), not a confidence score. | The rule id is visible in the note and stored in `ConflictNote.rule`. | design.md §4.3, frontend.md §8 (`ConflictNote`) |

### 5.5 Record gaps (INNOVATION + HUMAN-CENTERED DESIGN)

| # | Test case | Expected result | Source |
|---|---|---|---|
| T13 | **Gap detection — no cause.** A causal question ("Why was the stock late?") has no visible source stating a cause for the named event. | Section 3 renders a gap card with `rule: 'no-cause'`, a declarative "what is missing" sentence, a named knower (if derivable from visible sources), and a drafted question. | design.md §4.2, frontend.md A3 |
| T14 | **Gap detection — ownerless blocked item.** An open item has status `blocked` but no owner or no due date. | A gap card with `rule: 'ownerless-blocked-item'` is rendered. | frontend.md A3 |
| T15 | **Gap with no visible knower.** A gap exists but no visible source yields a participant who might know. | The knower field is omitted. The gap card still renders with the "what is missing" sentence and draft question. No directory lookup, no guessed name. | design.md A2, frontend.md A2 |
| T16 | **No gaps — stated absence.** A question where every part of the story is on the record. | Section 3 renders with "Semua bagian cerita ini tercatat." / "Every part of this story is on the record." The section is never empty-collapsed. | design.md §3.1, §4.2 |

### 5.6 Approval gate (APPROVAL)

| # | Test case | Expected result | Source |
|---|---|---|---|
| T17 | **Approval flow.** A user clicks `Tinjau & setujui` on a gap card, reviews the drafted question, and confirms. | The gate opens (only modal in the product), confirm is disabled until the question field is focused/scrolled, on confirm the gap action becomes `Terkirim — menunggu balasan` with a timestamp, audit row reads `Disetujui`, and an approval entry is appended to the audit log. | design.md §4.4, frontend.md §7 (`ApprovalGate`) |
| T18 | **Cancel is silent.** A user opens the gate and cancels. | Nothing is written anywhere, including the audit log. The gap card returns to its draft state. | design.md §4.4 |

### 5.7 PII masking (BONUS)

| # | Test case | Expected result | Source |
|---|---|---|---|
| T19 | **NIK and phone masking.** A source body contains a NIK (16 digits) and a phone number. | Both are replaced with `••••` before the model sees the text. The source drawer shows the masked fields with a "data pribadi" reason label. The citation remains valid. | plan.md §3 Feature 6, design.md §2.6, frontend.md A12 |

### 5.8 Living answers + revocation (BONUS + PERMISSIONS)

| # | Test case | Expected result | Source |
|---|---|---|---|
| T20 | **Revocation mid-session.** A manager is viewing an answer. Their access to a topic tag is revoked via `/access`. They re-ask the same question. | The new answer reflects the reduced scope. The scope-change banner appears ("Cakupan akses Anda berubah…"). The audit log shows two entries with two scope snapshot ids. If the revocation lands mid-stream, the stream is aborted, the partial document is discarded, and no leaked text remains in the DOM. | plan.md §3 Feature 2+8, design.md §4.5, frontend.md §10.5 |

### 5.9 Synthesis, trace, second scenario, ingestion (added 29 Oct 2026)

| # | Test case | Expected result | Source |
|---|---|---|---|
| T21 | **The answer answers.** A causal question ("Kenapa stok telat di Makassar?") | A lead paragraph names the cause, the decision and the effect, each with a marker that resolves to a rendered citation. Every chronology row carries a detail sentence. A clause without a marker is never emitted. | Build update #1, `lib/answer/narrative.ts` |
| T22 | **Agent trace.** Any answered question. | The trace lists the seven steps in execution order with timings; the last step is `verify` and passes when cited == claims. The canonical empty carries no trace. | Build update #2, `lib/agent/trace.ts` |
| T23 | **Handbook Example Test 2.** "Berapa tunjangan bahan bakar per bulan?" | Returns Rp750.000, cites the SOP (Rp500.000) and the HR announcement, names the rule, and states that the SOP is the older source. | Build update #3, `data/sources.json` O1/O2 |
| T24 | **Second scenario is answerable.** Leave, approval authority, laptop collection. | Each returns a sourced answer from the onboarding project. | Build update #3 |
| T25 | **Answer language.** An English question under Indonesian chrome. | `answerLanguage: 'en'`, English lead and English row titles; chrome stays Indonesian. The canonical empty stays Indonesian regardless. | NFR-4, `detectAnswerLanguage` |
| T26 | **Live ingestion.** Ask, ingest a message, ask again. | The new source appears in the next answer, the version increments, and a "data updated" notice is rendered. Ingestion does not bypass `canRead`. | Build update #5, `POST /api/ingest` |
| T27 | **Empty-state owner.** Staff asks a management-only question. | Canonical empty, byte-identical to a non-existent topic, plus the project's constant owner name and channel. Manager asking the same question gets the figure. | Build update #6 |


---

## 6. Scope

### 6.1 In scope

- A unified product with two independent components: (a) a standalone Next.js web app that is fully functional on its own — every demo scenario runs end to end in the browser with no MCP client connected — and (b) an MCP server exposing five tools (`senarai_ask`, `senarai_get_thread`, `senarai_approve`, `senarai_revoke_scope`, `senarai_query_audit`) over `stdio` and SSE. Both components share one `lib/` business-logic core and one `data/` dataset. WorkBuddy is one consumer of the MCP server, not the product's orchestrator. The model in any MCP client receives only the already-filtered `AnswerPayload`; all permission checks, PII masking, and audit logging run server-side in deterministic `lib/` code before any client sees data. The product answers project-history questions in Bahasa Indonesia, English, or mixed code-switching.
- The three-part answer format with per-claim source citations.
- Permission-aware retrieval with a demo-ready permission model (at least two roles: staff and manager; admin for demo/judging).
- Record-gap detection computed only from visible data, with draft-question generation and approval gate.
- PII masking (NIK, phone), source conflict handling, document-instruction immunity, and an audit log view.
- A sample dataset rich enough to demo three key scenarios (see §7 below).
- Test results run against the challenge's test cases (approximately 20, including Example Test 1 and Example Test 2), with screenshots including any failures.
- Deliverables per handbook: project description, accountability sheet (one page), architecture diagram, demo video (5–8 min), WorkBuddy workflow export, product sharing notes.

### 6.2 Out of scope

- Real integrations with WhatsApp Business API, Google Drive, or Trello/Notion (mock data only — explicitly allowed by the handbook).
- Bulk historical ingestion pipelines and enterprise SSO.
- Mobile-native apps (web interface is sufficient).
- Multi-language beyond Indonesian/English/mixed.
- Automated DPIA generation or legal compliance tooling.
- Deep coding (judging focuses on agent design, workflow orchestration, and the 5 accountability principles).
- Dark mode.
- Charts, dashboards, project-health gauges, sparklines, KPI tiles.
- Field-level (per-column) permission granularity. Project + topic tag only.
- A global search box across all projects (scoped to active project only).

### 6.3 Prohibitions (non-negotiable)

The following are permanently excluded from the product. Each one is a "tell" that breaks the permission-invisibility guarantee or contradicts the product's core argument:

| Prohibited | Why |
|---|---|
| Chat transcript, message bubbles, avatars | Hide structure and provenance; make role comparison unreadable |
| A card around the answer, or a card per section | Breaks document continuity |
| Accordions, collapsible sections, shortened answers | All three parts, always, in order, fully rendered |
| Greyed rows, lock icons, muted pills, "N hidden" counters, access-denied page, illustrated empty state | Every one is a tell |
| `Terbatas` / `Restricted` status value | Pill vocabulary is closed at five |
| Role colour-coding or role badges | Invites the inference that answers differ by role |
| Confidence score or percentage per claim | Fake precision; use named rules instead |
| Auto-send, scheduled send, bulk draft | One human, one action, one message |
| Translating retrieved source text | Breaks citation fidelity |
| "AI is thinking" animation, typing indicator | Reasoning is shown as the audit log, not ephemeral theatre |

---

## 7. Demo Scenarios

Three judge-facing scenarios that map directly to the three differentiators:

### Scenario 1: One question, two different answers

Staff and manager both ask "Why was stock late in Makassar?" The manager sees the full chronology including vendor dispute and penalty clause sources (`sensitivity: 'management'`). The staff sees only general-sensitivity sources. Both answers have the identical three-section shape. The staff answer gives no hint that anything is hidden — no lock icon, no "restricted" pill, no reduced count, no "I can't share that."

**Scores on:** Responsible AI & Ethics (10 pts), AI Interaction (10 pts).

### Scenario 2: Record gap with draft question awaiting approval

A question reveals a gap: no source documents who approved the quantity change on the PO. Senarai names Rina as a potential knower (participant in the warehouse channel, Oct 12–14), drafts a question to her, and presents the `Tinjau & setujui` button. The user opens the approval gate, reviews the question, and confirms. The gap status changes to `Terkirim — menunggu balasan`. The audit log records the approval.

**Scores on:** Innovation & Creativity (10 pts), Human-Centered Design (10 pts).

### Scenario 3: Live permission revocation changing the next answer

A manager is viewing an answer that includes management-only sources. Via `/access`, a tag grant is revoked. The manager re-asks the same question. The new answer is reduced. The scope-change banner appears. The audit log shows two entries with two scope snapshot ids. If the revocation lands mid-stream, the partial answer is aborted and discarded.

**Scores on:** Responsible AI & Ethics (10 pts), Overall Quality & Judge's Impression (10 pts).

---

## 8. Information Architecture

### 8.1 Routes

Four routes, one persistent frame (sidebar + top bar). No nested navigation. One modal (approval gate) and one docked panel (source drawer).

| Route | Surface | Job |
|---|---|---|
| `/ask` | Ask + answer | Compose a question, read the three-part answer, open sources |
| `/ask/[threadId]` | Same, addressed | Deep-linkable answer state, including `?source=` for a citation and `?gap=` for a gap |
| `/audit` | Audit log | Every query, scope snapshot, sources retrieved, answer, approval decision |
| `/access` | Permission / admin | Role × topic-tag matrix, live revocation, scope preview |

### 8.2 API endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/ask` | POST | NDJSON stream; body `{ question, projectId, actorId, locale }`; appends thread + audit draft |
| `/api/threads/[threadId]` | GET | Returns `AnswerPayload` for rehydration |
| `/api/approvals` | POST | Body `{ gapId, action: 'approve' \| 'cancel' }`; appends audit entry on approve only |
| `/api/scope` | POST | Body `{ actorId, projectId, tag, granted }`; mutates session store, bumps `scopeVersion` |
| `/api/audit` | GET | Returns `AuditEntry[]`, scope-filtered by actor |

### 8.2a MCP tool catalog (Senarai MCP server)

The Senarai MCP server (`mcp/server.ts`) exposes five tools. Any MCP-capable client — WorkBuddy included — invokes them. Each tool is a thin transport wrapper around the same `lib/` functions the HTTP routes call. Schemas are generated from the existing `zod` definitions — one source of truth. The model in the host client never calls `lib/` directly; it receives only the already-filtered, already-masked, already-audited return value. The web app does not use these tools — it calls `lib/` through its HTTP routes (§8.2). The two components are parallel consumers of the same core.

| MCP tool | Input schema | Output | `lib/` function(s) called | HTTP equivalent |
|---|---|---|---|---|
| `senarai_ask` | `{ question: string, projectId: string, actorId: string, locale: 'id' \| 'en' }` | `AnswerPayload` (complete, not streamed — MCP tools return one value) | `lib/access/snapshot.ts` → `lib/mask/pii.ts` → `lib/retrieval/search.ts` → `lib/retrieval/rank.ts` → `lib/retrieval/toCitation.ts` → `lib/answer/compose.ts` → `lib/gaps/detect.ts` → `lib/conflict/resolve.ts` → `lib/store/threads.ts` → `lib/store/session.ts` (audit append) | `POST /api/ask` |
| `senarai_get_thread` | `{ threadId: string, actorId: string }` | `AnswerPayload` or canonical empty | `lib/store/threads.ts` → `lib/access/scope.ts` (re-check scope on rehydrate) | `GET /api/threads/[threadId]` |
| `senarai_approve` | `{ gapId: string, action: 'approve' \| 'cancel', actorId: string }` | `{ gapId, status: 'sent' \| 'draft', auditAppended: boolean }` | `lib/store/threads.ts` (mutate gap) → `lib/store/session.ts` (append audit entry on approve only) | `POST /api/approvals` |
| `senarai_revoke_scope` | `{ actorId: string, projectId: string, tag: string, granted: boolean }` | `{ scopeSnapshotId, scopeVersion, affectedSourceCount }` | `lib/access/grants.ts` → `lib/access/snapshot.ts` (bump version) → `lib/store/session.ts` | `POST /api/scope` |
| `senarai_query_audit` | `{ actorId: string, projectId?: string, dateFrom?: string, dateTo?: string }` | `AuditEntry[]` (scope-filtered by actor role) | `lib/store/session.ts` (read audit log) → `lib/access/scope.ts` (filter by role: staff=own, manager=project, admin=all) | `GET /api/audit` |

**Transport:** `stdio` for local clients (WorkBuddy desktop on the demo machine, primary demo path); SSE endpoint (`/api/mcp/sse`) for remote clients. Both transports call the same tool handlers. The web app does not consume the MCP server — it has its own HTTP routes.

**Actor resolution:** The MCP client passes `actorId` in every tool call. The MCP adapter validates the actor exists in `data/actors.json` before calling `lib/`. An unknown actor returns the canonical empty — no error message that could leak existence. The web app resolves the actor from a cookie/session instead, but the same `lib/access/scope.ts` function produces the `ScopeSnapshot` either way.

**Why the MCP server preserves every security guarantee:** `canRead()` runs in `lib/retrieval/search.ts` before the MCP tool returns anything to the host client's model. The canonical empty payload is returned by the MCP tool identically to the HTTP route. The 600ms latency floor applies to the MCP `senarai_ask` handler the same way it applies to `POST /api/ask`. The audit log captures every `senarai_ask` call because it flows through `lib/store/session.ts`. The host client's model cannot leak a forbidden source because it never receives one — the same guarantee the web app's server components enjoy.

### 8.3 Answer structure

The answer is one document with a fixed skeleton on a single `Surface level={0}` region with 40px padding. Three sections, always rendered, in fixed order:

1. **Kronologi / Chronology** — ruled ledger, chronological, cited
2. **Yang Masih Terbuka / Still Open** — open items table: owner, due, status, source
3. **Yang Tidak Tercatat / Not on the Record** — gap cards (the hero section), dashed rule, only section with cards and actions

---

## 9. Domain Model Summary

Key types (full definitions in `frontend.md` §8 and `backend.md`):

| Type | Purpose |
|---|---|
| `Project` | `id`, `code` (e.g. 'MKQ4'), `nameKey`, `topicTags[]` |
| `Source` | `id` (e.g. 'S12'), `kind` (chat/doc/task), `projectId`, `topicTags[]`, `sensitivity` (general/management), `body` (PII-masked), `participantIds[]` |
| `Citation` | `id`, `marker` (number → `[n]`), `sourceId`, `quote` (verbatim, masked), `gloss?` (authored, never generated) |
| `ChronologyEvent` | `id`, `at`, `title`, `detail?`, `citations[]`, `conflict?` |
| `OpenItem` | `id`, `title`, `ownerName?`, `due?`, `status` (open/blocked/overdue), `citation` |
| `RecordGap` | `id` (e.g. 'G1'), `whatIsMissing`, `whyItMatters?`, `knower?`, `draftQuestion`, `rule` (no-cause/ownerless-blocked-item/silent-interval), `approval?` |
| `ScopeSnapshot` | `id`, `version`, `actorId`, `roleId`, `projectIds[]`, `grants[]` |
| `AnswerPayload` | `id`, `threadId`, `question`, `questionMasked`, `scope`, `status` (complete/empty/partial), `canonical`, `version`, `chronology[]`, `openItems[]`, `gaps[]` |
| `AuditEntry` | `id`, `at`, `actorId`, `actorRole`, `projectId`, `questionMasked`, `scopeSnapshotId`, `retrievedSourceIds[]`, `decision` (answered/empty/empty-equivalent), `approvals[]` |
| `MCPCallContext` | `actorId`, `projectId`, `transport` ('stdio' \| 'sse'), `workBuddySessionId?`. Passed by the MCP adapter to `lib/` functions. Not stored in the dataset — ephemeral, per-tool-call. |

---

## 10. Key Assumptions

Each assumption has a recommended default so the team is not blocked. Full detail in `design.md` §8 and `frontend.md` §14.

| # | Assumption | Default |
|---|---|---|
| A1 | Permission granularity | Project + topic tag, two levels. Field-level out of scope. |
| A2 | "Who might know" from permissioned metadata | Derive only from visible sources. Omit name if no visible basis. No directory lookup. |
| A3 | Record-gap heuristic | Three deterministic rules in code: `no-cause`, `ownerless-blocked-item`, `silent-interval` (5-day threshold). Model only phrases them. |
| A4 | "Identical response" at API layer | Frozen canonical payload, no query echo, HTTP 200, same headers, 600ms latency floor. |
| A5 | Audit log permissioning | Scoped: staff=own, manager=project, admin=all. Demo runs as admin. |
| A6 | Bilingual vs citation fidelity | Chrome-only translation. Quotes never translated. Mixed ID/EN answer is correct. |
| A7 | Role changes mid-answer | Abort stream, discard partial, re-resolve scope, re-request or return canonical empty. |
| A8 | Raw question in audit log | Masked only. No raw-question field in the type. |
| A9 | Drafted question recipient | Channel label only, `simulated: true`, no network call. |
| A10 | Conflict precedence | Newer doc version > board update > chat; tie → recency. Rule id stored and rendered. |
| A11 | Three-part structure shortening | Never. All three headings always render. Empty sections render a stated line. |
| A12 | Citations to masked sources | Keep citation, render `••••` with reason in drawer. |
| A13 | Shell scope in 6 days | Fixed: sidebar (2 groups + switcher + identity), top bar (breadcrumb + locale), table craft. Cut order in `frontend.md` §13. |
| A14 | Collapsed rail project identity | Show `Project.code` (4 chars mono) in 40px button, full name in tooltip/aria-label. |
| A15 | Status pill vocabulary growth | Closed set of five, one file, one test. New value requires note in `design.md`. |
| A16 | Multi-project or single-project demo | Two projects, one fully authored. Second proves scope filtering. |
| A17 | Real model vs templated composition | Templated for scripted questions; keyword retrieval fallback otherwise. Free text degrades to honest "no record." |
| A18 | Unified product architecture | Senarai is one product with two equal, independent components: a standalone Next.js web app (`app/`) and an MCP server (`mcp/server.ts`). Both share one `lib/` business-logic core and one `data/` dataset. The web app is fully functional on its own — every demo scenario runs in the browser with no MCP client connected. The MCP server is fully functional on its own — any MCP-capable client (WorkBuddy included) can call its five tools. The MCP adapter is a thin transport wrapper: tool schemas are generated from existing `zod` definitions (one source of truth), and the adapter contains zero security-relevant logic. `canRead()`, the canonical empty, the 600ms floor, and the audit append all run in `lib/` unchanged, identically for both components. WorkBuddy is one consumer of the MCP server, not the product's orchestrator. |
| A19 | Deployment target | Direct VPS (Node.js 20+ managed by PM2, Nginx reverse proxy, Next.js standalone output). No Docker, no container. The web app runs as the Next.js standalone server (port 3000). The MCP server runs as a `stdio` subprocess (launched by WorkBuddy on the demo machine) and as an SSE endpoint (`/api/mcp/sse`) served by the same Next.js process for remote clients. Both components deploy from one codebase, one build, one PM2 ecosystem file. |

---

## 11. Success Metrics

### 11.1 Hackathon scoring alignment

| Differentiator | Scores on | Points |
|---|---|---|
| Same question, two different answers | Responsible AI & Ethics + AI Interaction | 10 + 10 |
| Record-gap section | Innovation & Creativity + Human-Centered Design | 10 + 10 |
| Audit log as first-class screen | Responsible AI & Ethics + Overall Quality & Judge's Impression | 10 + 10 |

### 11.2 Demo readiness checklist

- [ ] All three demo scenarios run live, unattended, for 5–8 minutes.
- [ ] `curl` diff of forbidden vs non-existent empty responses returns nothing.
- [ ] `/audit` is reachable in one click and readable without explanation.
- [ ] Both locales (ID/EN) render all chrome with no hardcoded strings.
- [ ] No `Forbidden`/`AccessDenied`/`Locked`/`Restricted` component exists (test passes).
- [ ] Status vocabulary test passes (closed set of five).
- [ ] No-card test passes (`AnswerDocument` does not import `Card` or `Panel`).
- [ ] Accessibility: keyboard + VoiceOver tested once before submission.
- [ ] Contrast table verified per `design.md` §6.1.
- [ ] Demo video recorded (5–8 min).
- [ ] WorkBuddy workflow export included (MCP tool configuration + agent instructions).
- [ ] All three demo scenarios run end to end in the web app alone, with no MCP client connected (web-app-independence test).
- [ ] MCP `senarai_ask` tool returns byte-identical answer to `POST /api/ask` for the same input (transport-equivalence test).
- [ ] MCP `senarai_ask` returns canonical empty for forbidden topic — same payload as non-existent topic (T01 holds through MCP transport).
- [ ] Accountability sheet (one page) included.

---

## 12. References

| Document | Role |
|---|---|
| `plan.md` | Product concept, audience, features, scope — the "what" and "why" |
| `design.md` | Design rationale, tokens, interaction model, accessibility — the "how it looks and behaves" |
| `frontend.md` | Build guide, stack, file structure, domain models, build order — the "how to build it" |
| `backend.md` | Unified product architecture, MCP server layer, web app API layer, shared `lib/` core, data pipeline, component boundaries and integration points — the "how the engine works" |
| `ALL TASKS CHECKLIST.md` | Day-by-day task checklist — the "what to do each day" |
| `prompts/phase-0.md` – `prompts/phase-6.md` | Day-by-day build prompts for a coding agent |
| `deployment.md` | VPS deployment guide for both components: web app (PM2 + Nginx + Next.js standalone) and MCP server (stdio subprocess + SSE endpoint) |
| `mockups/` | 9 SVG mockup screens of the UI |
