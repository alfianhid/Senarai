# Submission checklist

**Deadline:** 1 November 2026, 23:59 WIB · **Last verified:** 29 October 2026, 21:05 WIB

## Deliverables the handbook asks for

| # | Deliverable | File | Status |
|---|---|---|---|
| 1 | Project description | `submission/PROJECT.md` | Ready |
| 2 | Accountability sheet (one page) | `ACCOUNTABILITY.md` | Ready |
| 3 | Architecture diagram | `submission/architecture.png` (+ `.svg`) | Ready |
| 4 | Demo video, 5–8 minutes | — | **To record** — shot-by-shot script in `submission/demo-script.md` (6:20 runtime) |
| 5 | WorkBuddy workflow export | `submission/workbuddy-workflow.json` | Ready |
| 5a | MCP server + guide | `mcp/dist/server.mjs` (built by `npm run mcp:build`), guide at `/integrations` | Ready |
| 6 | Product sharing notes | `submission/sharing-notes.md` | Ready |
| 7 | Test results, including failures | `submission/test-results.md` (+ `submission/logs/`) | Ready |
| 8 | Deployed link | — | **To deploy** — `deployment.md` is written and the standalone build is verified |

## Software readiness

| Check | Command | Status |
|---|---|---|
| Type check | `npm run typecheck` | 0 errors |
| Unit tests | `npm test` | 13 files, 73 tests, 0 failures |
| Demo scenarios | `npm run verify` | 9 of 9 checks pass |
| MCP over stdio | `npm run verify:mcp` | 23 of 23 checks pass |
| Production build | `npm run build` | 13 routes, standalone output present |
| Standalone boot | `npm start` | serves `/ask`, `/integrations` and `/api/ask` |
| Five routes | `/ask`, `/ask/[threadId]`, `/audit`, `/access`, `/integrations` | all HTTP 200 |
| Reset in demo mode | `POST /api/reset` with `SENARAI_ALLOW_RESET=1` | `{"ok":true}` |

## Remaining before submission

1. **Record the video.** Use `submission/demo-script.md`. Record at 1440×900, browser zoom 100%, no notifications. One take is fine; the script is written to be read aloud.
2. **Deploy.** Follow `deployment.md` §1–§7. Set `SENARAI_ALLOW_RESET=1` in the PM2 env for the judging window. Paste the URL into `submission/sharing-notes.md` §1.
3. **Paste the URL** into the submission form, and attach items 1–7 above.
4. **Optional:** add a sixth demo beat for `/integrations` — open it, copy the config, show a client calling `senarai_ask`. The page is built and verified; it is not yet in the 6:20 script.

## Known deviations, stated rather than hidden

- **MCP is stdio only.** No SSE endpoint, so a remote client cannot reach it without a URL. Threads created over MCP live in the MCP process, not the web process. Both limits are printed on `/integrations`.
- **No streaming.** One JSON response with a 600 ms floor. Streaming added failure modes for no judging benefit.
- **No live integrations.** Ingestion is a static dataset; the handbook allows mock data, and the UI labels sending as simulated.
- **Accessibility is code-level, not audited.** Focus rings, `aria-expanded`, `role="status"` and the 44 px hit area are implemented; no screen-reader pass with a person has been run.
