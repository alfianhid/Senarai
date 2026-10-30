# Phase 6 — Demo polish, accessibility, tests, freeze

**Day:** 6
**Goal:** All three demo scenarios run live and unattended for 5–8 minutes — in the web app alone, then again through WorkBuddy via the MCP server. Accessibility pass done. All tests pass. Video recorded. WorkBuddy workflow export included. Accountability sheet written. Frozen.

**Person A (data + agent surface — demo run + tests):**

**Scripted demo run:**
- Run all three scenarios end to end in the **web app alone** (no MCP client connected), unattended, three times. Verify determinism. This is the web-app-independence test.
- Then run all three scenarios through **WorkBuddy via the MCP server** to verify the second component.
- Scenario 1: staff and manager ask "Kenapa stok terlambat di Makassar?" Two different answers, same shape. Staff sees no hint.
- Scenario 2: question reveals a gap (no-cause). Rina named as knower. Draft question. Open gate. Confirm. Gap → `Terkirim`. Audit → `Disetujui`.
- Scenario 3: manager viewing answer. Revoke `vendor.penalty` tag via `/access`. Re-ask. Answer reduced. Scope banner appears. Audit shows two snapshots.

**curl diff test:**
- `curl -X POST localhost:3000/api/ask -d '{"question":"Proyek Kenari","projectId":"kenari-q3","actorId":"rina","locale":"id"}'` (forbidden — Rina has no access to Kenari).
- `curl -X POST localhost:3000/api/ask -d '{"question":"Proyek Tidak Ada","projectId":"nonexistent","actorId":"rina","locale":"id"}'` (non-existent).
- `diff` the two responses. Must return nothing (T01).
- Repeat the same test through the MCP tool (`senarai_ask`). Must also return nothing.

**README and assumptions:**
- Write `README.md` with: the three demo questions, the role switcher instructions, the curl diff command, the 600ms latency floor acknowledgement (limitation, not security control), the "mock data only" statement, the VPS deployment link.

**Test suite run:**
- `vitest run` — all pure function tests pass:
  - `lib/access/canRead` — project/tag/sensitivity mismatch, `'*'` grant, revocation.
  - `lib/gaps/detect` — three rules.
  - `lib/conflict/resolve` — precedence.
  - `lib/mask/pii` — NIK and phone.
  - `lib/access/no-forbidden` — no forbidden components.
  - `lib/ui/status` — five values only.
  - `lib/ui/no-card` — `AnswerDocument` does not import `Card` or `Panel`.
- Run the transport-equivalence test (MCP `senarai_ask` vs HTTP `POST /api/ask`).
- Take screenshots of all test results, including any failures (handbook requirement).

**Person B (shell + document UI — accessibility + contrast):**

**Accessibility pass:**
- Keyboard test: every interactive element reachable via Tab. Focus ring visible (`2px var(--color-focus)`, 2px offset, never clipped).
- `CitationMark`: `aria-expanded`, `aria-label` naming source kind and date. 44px hit area.
- `SourceDrawer`: focus trap, `Esc` closes, focus returns to originating mark.
- `ApprovalGate`: `aria-disabled` + `aria-describedby` on confirm, not bare `disabled`. Keyboard-reachable.
- `ScopeBanner`: `role="status"`, does not steal focus.
- `AnswerDocument`: `aria-busy="true"` during stream. `aria-live="polite"` announces once per section close.
- VoiceOver test: run once through all four routes.

**Contrast check:**
- Verify all text/surface pairs pass 4.5:1 (text) or 3:1 (UI). Use `design.md` §6.1 contrast table.
- `--border-strong` fails as a sole boundary (2.0:1) — verify inputs compensate with `--surface-subtle` fill.
- Pills carry tint + text, never border alone.

**Motion:**
- Only three transitions exist, all colour-only at 120ms. `prefers-reduced-motion` sets them to 0ms globally.

**States verification:**
- `LoadingRegister`: three section shells, mono status line, no shimmer.
- `NoRecordAnswer`: canonical empty, identical for all four causes, no illustration/tint/icon.
- `ErrorRegister`: same document frame + retry. No status codes, no stack traces.
- `StaleScopeBanner`: answer discarded by revocation.

**Shared checkpoint:**
- All three demo scenarios run live, unattended, for 5–8 minutes.
- `curl` diff of forbidden vs non-existent returns nothing (T01).
- `/audit` reachable in one click, readable without explanation.
- Both locales render all chrome with no hardcoded strings.
- No `Forbidden`/`AccessDenied`/`Locked`/`Restricted` component exists.
- Status vocabulary test passes (five values).
- No-card test passes.
- Accessibility: keyboard + VoiceOver tested.
- Contrast table verified.

**Demo readiness checklist (from PRD §11.2):**
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
- [ ] All three demo scenarios run end to end in the web app alone, with no MCP client connected (web-app-independence test).
- [ ] WorkBuddy workflow export included (MCP tool configuration + agent instructions).
- [ ] MCP `senarai_ask` tool returns byte-identical answer to `POST /api/ask` for the same input.
- [ ] MCP `senarai_ask` returns canonical empty for forbidden topic (T01 holds through MCP).
- [ ] Accountability sheet (one page) included.

**Deliverables to freeze:**
- Project description (handbook).
- Accountability sheet (one page) — can be generated from the audit log.
- Architecture diagram — the unified two-component diagram from `backend.md` §1 (web app + MCP server, shared `lib/` core, shared `data/`).
- Demo video (5–8 min).
- WorkBuddy workflow export (MCP tool config + agent instructions + demo script).
- Product sharing notes.
- Test screenshots (including any failures).

**Freeze.** No code changes after this point. If something is broken, fix it; if something is ugly, leave it. The score is in the demo, not in the polish.
