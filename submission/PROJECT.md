# Senarai — project description

**Challenge A, The Workplace Brain** · AI CAN DO IT Tencent Cloud Hackathon Indonesia 2026
**Blurb:** Project history assembled, sourced, per access rights.

---

## The problem

When a project goes wrong — *"Why was stock late in Makassar, and what is still open?"* — nobody can answer quickly. The story is spread across a WhatsApp group, three revisions of a purchase order, and a task board nobody updated. The people who know are in meetings, so a new manager waits, or asks six people one at a time.

An AI that reads everything could answer in seconds. It could also leak everything: the vendor penalty clause, the price concession, the note about who approved the quantity change. That is not a hypothetical fear — 40% of organisations delay AI rollout over oversharing (Gartner), and under PP 33/2026 AI processing is a DPIA trigger with fines up to 2% of annual revenue.

Senarai is built on one constraint: **the model must never be trusted with a secret.** Access is resolved and checked in deterministic code before retrieval, so a source the asker may not read is never scored, ranked, counted or cited.

## What it does

Ask a question about a project and the answer arrives as one document, in three parts, every time — with a direct answer above them:

0. **The direct answer.** Two or three sentences that actually answer the question, each clause carrying a citation marker. *"Truk ditahan di Surabaya karena menunggu muatan penuh [3]. PO rev.3 menurunkan jumlah dari 25 menjadi 20 ton [6]. Toko Sinar Jaya kehabisan stok selama tiga hari [5]. Yang masih terbuka: Kirim surat klaim ke vendor [10], pemilik Rina Pratiwi."* No clause without a source is written; the composer drops it instead.
1. **Chronology** — the events in order, each row citing the exact chat message, document version or task card it came from, and each row explaining what it establishes rather than only naming the document.
2. **What is still open** — unresolved tasks with owner, due date and status.
3. **What is not on the record** — the gaps. What nobody wrote down, who might know (only if a source the asker can already read says so), and a drafted question that goes nowhere until a person approves it.

The three parts always render, in that order. A section with nothing in it says so; it is never collapsed, hidden or summarised away.

Under the answer sits the **agent trace**: the seven steps that actually ran, in order, with timings, and a self-check that every rendered claim carries a citation. It is a record of the pipeline, not an animation.

## The four things that make it different

**1. The same question gives two different answers, and the smaller one gives nothing away.**
Rina (staff) and Andi (manager) ask the same question. Andi sees 12 rows including the vendor dispute and the Rp45.000.000 penalty; Rina sees 9 rows and a complete-looking answer with no lock icon, no "restricted" pill, no reduced count, no "I can't share that." A forbidden topic and a topic that was never written return **byte-identical** payloads, held to the same 600 ms floor so they cannot be told apart by timing either.

**2. The gap section is the hero, not a footnote.**
Most tools stop at what they found. Senarai states what it could not find: *"no record of who approved the quantity change from 25 to 20 tons"*, names Andi as the person who might know because he appears in the warehouse channel during those dates, and drafts the question. Sending requires a second, explicit human action. Cancelling writes nothing, anywhere. When the record does not answer at all, the empty screen still names the project's topic owner and channel — constant metadata, identical for every question in that project, so it cannot hint at what was withheld.

**3. The answer is assembled from a plan, and the plan is on the page.**
`resolve_scope → search_sources → read_sources → resolve_conflicts → detect_gaps → compose → verify`. Access is resolved before the first search; the last step refuses to present an uncited claim as complete. The trace is part of the answer, so "is this genuinely agentic or one prompt?" is answerable by looking, not by trusting.

**4. The audit log is a screen, not a log file.**
Every question, the scope snapshot it ran under, the sources it retrieved, **the response it returned**, the number of agent steps, the decision (`answered` / `empty` / `empty-equivalent`) and every approval. Revoke a tag, ask again, and the log shows two entries with two snapshot ids — the permission boundary is visible to an auditor without reading code.

## How it works

One Next.js 15 application. No database, no model call, no third-party API, no key.

```
browser → server component or route handler → lib/
  resolve scope snapshot        actor → role → projects, tags, sensitivities
  canRead()                     before any search: project · tag · sensitivity
  mask PII                      NIK and phone numbers, before composition
  grounding check               every content word must exist in readable data
  search + rank                 IDF-weighted keyword and topic tag
  canRead() again               at citation time, defence in depth
  compose                       lead answer · chronology · open items · gaps
  resolve conflicts             version between documents, recency across kinds
  detect gaps                   three deterministic rules, visible sources only
  verify                        every rendered claim has a citation
  canonical empty               when nothing survives, the same bytes every time
```

Every guarantee is a pure function in `lib/` with a test. The routes are thin transports; they contain no permission logic of their own.

### Two doors, one core

The same `lib/` is reachable two ways: the web app (`app/api/*`) and an MCP server (`mcp/server.ts`, stdio, five tools). Both call `lib/api/handlers.ts` — the tool layer is a wrapper, not a second implementation, so a guarantee cannot hold in the browser and fail in an agent.

| | Web app | MCP |
|---|---|---|
| Transport | HTTP routes | stdio subprocess |
| Who it is for | A person reading the record | An agent answering in a chat client |
| Permission check | cookie → scope snapshot | `actorId` argument → scope snapshot |
| Canonical empty | same bytes | same bytes, asserted by `tests/mcp.test.ts` |
| Needs deployment | yes | no |

`/integrations` prints the client config with the current actor and project already filled in. The two limits are on that page rather than in a footnote: stdio only (no SSE endpoint, so a remote client would need one), and a thread created over MCP lives in the MCP process, so the browser cannot open it — the payload is complete, only the link is missing.

### The trade-off we chose: no language model in the answer path

A model would make the prose more flexible and would make two of our guarantees unprovable: that a withheld answer is indistinguishable from an absent one, and that no sentence appears without a source. So composition is deterministic — every clause is a quoted source or a template filled with a hand-authored fact — and the intelligence is in the plan, the grounding rule, the conflict and gap resolution, and the self-check. The cost is stated plainly: the agent cannot paraphrase a source it has no authored sentence for, and a question phrased with vocabulary that appears nowhere in the record returns "no record" rather than a near-miss. Both are the safer failure for a workplace brain.

## What is built, and what is mocked

| Built | Mocked, and said so in the UI |
|---|---|
| Four routes: `/ask`, `/ask/[threadId]`, `/audit`, `/access` | Ingestion: a static JSON dataset of 29 sources across 3 projects, not a live WhatsApp/Drive/Notion sync. A demo control appends a new message in memory to prove answers stay current. |
| Two scenarios: late shipment (Makassar) and onboarding (HR, finance, IT) | Sending: the approval sheet says "Pengiriman disimulasikan dalam demo ini" |
| 73 unit tests over the guarantees; 34 scripted checks against the web app, 23 more over MCP | Retrieval: IDF-weighted keyword and topic-tag matching, not embeddings — deterministic on purpose |
| Bilingual answer body that follows the language of the question, not the chrome | State: in memory, reseeded on restart |
| Production build, standalone output, PM2 + Nginx deploy guide | Roles: four actors in three roles, not SSO |

## Known limits, stated before anyone finds them

- The 600 ms floor narrows the timing side-channel; it does not close it.
- Aggregate inference ("how many staff earn above X") is not defended against yet.
- The grounding rule is strict by design: a fact question phrased with vocabulary that appears nowhere in readable data returns "no record" instead of the nearest answer.
- The composer cannot paraphrase beyond its authored sentences. A source with no hand-authored detail line appears in the timeline but not in the lead.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 73 tests
npm run verify:all  # 34 checks against a running server
```

Default actor is Rina Pratiwi (staff); default project is Distribusi Makassar Q4. Both switchers are in the sidebar. `/audit` and `/access` are one click away.
