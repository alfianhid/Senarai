# Product sharing notes

**For:** judges, and anyone who wants to try Senarai in five minutes.
**What it is:** one Next.js app. No account, no API key, no database. If you can open a browser, you can use it.

---

## 1. Open it

| Where | How |
|---|---|
| **Hosted** | `<paste the deployed URL here after following deployment.md>` |
| **Local** | `npm install && npm run dev` → http://localhost:3000 |

Default actor is **Rina Pratiwi (staff)**, default project **Distribusi Makassar Q4**. Both switchers are in the sidebar; `/audit` and `/access` are one click away. Nothing else needs configuring.

## 2. Three questions that show the product

Ask these in order. Each one demonstrates a different claim.

**1. `Kenapa stok telat di Makassar, dan apa yang masih terbuka?`**
As Rina. The top of the page is the answer in prose, with a citation on every clause. Below it, 9 chronology rows, 2 open tasks and 3 record gaps. Open **Jejak agen** to see the seven steps that actually ran, with timings and a self-check that all 12 claims are cited. Click `[1]` to see the verbatim source, and note the driver's NIK rendered as `••••`.

**2. `Berapa denda kontrak Anugrah?`**
Still as Rina: **no record**. There is no lock, no "restricted", no count of what was withheld — the same screen you would get for a project that does not exist. Now switch to **Andi Wijaya (manager)** and ask again: `Rp45.000.000` appears. Same question, same system, different answer, and the staff version never hinted that a difference existed.

**3. Open a gap and approve the draft**
Scroll to **Yang tidak tercatat** → gap `G1` → **Tinjau draf**. The sheet shows the recipient, the channel and the exact message. Pressing **Batal** writes nothing anywhere; pressing **Setujui dan kirim** records one approval in `/audit`. Sending is simulated and the sheet says so.

Then open `/access`, switch off the `customer` tag for Rina, return to `/ask` and repeat question 1. The customer-complaint row is gone. No banner explains it — the next answer simply reflects the new scope, and `/audit` shows the two scope snapshots side by side.

**4. Switch the project to `Onboarding Karyawan 2026` and ask `Berapa tunjangan bahan bakar per bulan?`**
You get `Rp750.000 per bulan`, citing both the HR announcement and the older SOP at `Rp500.000`, with a note that the SOP is the older source. This is Example Test 2 from the handbook, on a second, independent scenario. Press **Simulasi pesan baru** on any answer to watch it return as v2 with the new row.

## 3. What to look at if you only have 90 seconds

1. Ask question 1. Check that the three sections always render, in the same order.
2. Click one citation. Check that the quote is verbatim and that personal data is masked.
3. Ask question 2 as staff, then as manager. Check that the staff answer gives nothing away.
4. Open `/audit`. Check that the decision column distinguishes `answered` from `empty`.
5. Open `/integrations`. The MCP client config is printed with your current actor and project already filled in — copy it, and an agent can ask the same question.

## 4. What is simulated, and what is not

| Real | Simulated, and labelled |
|---|---|
| Permission checks, PII masking, gap detection, conflict precedence, audit log | Ingestion: a static 29-source dataset, not a live WhatsApp/Drive/Notion sync. The demo button appends a message in memory. |
| The three-section composition and every citation | Sending: no message leaves the machine; the sheet says "Pengiriman disimulasikan" |
| Scope revocation and its effect on the next answer | Retrieval: IDF-weighted keyword and topic-tag matching, not embeddings |
| The MCP server and its five tools, over a real stdio handshake | Nothing here: `npm run verify:mcp` runs it end to end, 23 checks |

## 5. Reset it

Between runs, either restart the process or, when started with `SENARAI_ALLOW_RESET=1`:

```bash
curl -X POST http://localhost:3000/api/reset
```

All state is in memory: threads, revocations and audit entries. A restart replays `data/audit.seed.json`.

## 6. Known limits — read these before finding them

- The 600 ms floor narrows the timing side-channel; it does not close it.
- Aggregate inference ("how many staff earn above X") is not defended against yet.
- The grounding rule is strict by design: a fact question worded with vocabulary that appears nowhere in readable data returns "no record" rather than a near-miss.
- The composer cannot paraphrase beyond its authored sentences; a source with no authored detail line appears in the timeline but not in the lead.
- The MCP server is stdio only. There is no SSE endpoint, so a remote client cannot reach it without one. Threads created over MCP live in that process, so the browser cannot open them — the payload is complete, only the link is missing.

## 7. What this is built on

Next.js 15 · React 19 · TypeScript strict · hand-written CSS with the tokens in `design.md`. No UI library, no state library, no chart library, no auth library, no database. The full reasoning is in `PRD.md`, `design.md` and `backend.md`; the guarantees and their tests are listed in `submission/test-results.md`.
