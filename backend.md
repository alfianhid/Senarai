# Senarai — Backend Architecture

**Product:** Senarai — Access-Aware Project History Agent (unified product: MCP server + standalone web app)
**Companion documents:** `PRD.md` (requirements, test matrix), `design.md` (interaction model), `frontend.md` (component contracts, domain types, build order)
**Hackathon:** AI CAN DO IT Tencent Cloud Hackathon Indonesia 2026
**Platform:** Tencent Cloud WorkBuddy (required; one consumer of the Senarai MCP server)
**Deployment:** Direct VPS (PM2 + Nginx + Next.js standalone output)

---

## 1. Architecture overview

Senarai is one product with two equal, independent components that share a single business-logic core (`lib/`) and a single dataset (`data/`). Both components are complete entry points with their own user flows. Neither is a companion to the other.

- **Senarai Web App** (`app/`) — a standalone Next.js application. Fully functional on its own: every demo scenario runs end to end in the browser with no MCP client connected. It is the trusted surface and the system of record.
- **Senarai MCP Server** (`mcp/server.ts`) — an MCP server exposing five tools over `stdio` and SSE. Any MCP-capable client — WorkBuddy included — can invoke them. The host client's model receives the same already-filtered `AnswerPayload` the web app renders.

WorkBuddy is one consumer of the MCP server, not the orchestrator of the product. The hackathon requires WorkBuddy as a platform; Senarai treats it as an integration target, not as the product's spine.

```
┌──────────────────────────────┐   ┌──────────────────────────────────────────┐
│  Senarai Web App (standalone) │   │  MCP-capable client (e.g. WorkBuddy)      │
│                               │   │                                          │
│  Browser → /ask → compose     │   │  User asks in chat:                      │
│  → POST /api/ask (NDJSON)     │   │  "Why was stock late in Makassar?"        │
│  → three-section answer       │   │  Model plans → calls senarai_ask tool     │
│  → citation drawer            │   │  → receives AnswerPayload                 │
│  → gap card → approval gate   │   │  → presents summary in chat               │
│  → /audit, /access            │   │  → links to /ask/[threadId] for full view │
│                               │   │  → may call senarai_approve for gaps      │
│  Independent user flow.       │   │  Independent user flow.                   │
│  No WorkBuddy in this path.   │   │  WorkBuddy is one such client.            │
└──────────────┬────────────────┘   └──────────────────┬───────────────────────┘
               │ HTTP routes                           │ MCP tool call
               │ (app/api/*)                            │ (stdio for local, SSE for remote)
               ▼                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Shared Core — lib/  (ONE source of truth for both components)                │
│                                                                               │
│  access/    canRead.ts, scope.ts, snapshot.ts, grants.ts                      │
│  retrieval/ search.ts, rank.ts, toCitation.ts                                │
│  answer/    compose.ts, canonicalEmpty.ts, sections.ts                       │
│  gaps/      detect.ts, draftQuestion.ts, knowers.ts                          │
│  conflict/  resolve.ts                                                       │
│  mask/      pii.ts                                                           │
│  store/     session.ts (globalThis singleton), threads.ts                    │
│  api/       handlers.ts (shared by MCP + HTTP), stream.ts, latency.ts        │
│  i18n/      messages.id.ts, messages.en.ts, keys.ts, format.ts               │
│  ui/        cx.ts, status.ts                                                 │
│                                                                               │
│  Every security guarantee lives here.                                         │
│  Neither the web app's server components nor the MCP client's model           │
│  touches this layer directly — both go through lib/api/handlers.ts.           │
└──────────────────────────────────┬────────────────────────────────────────────┘
                                   │ reads
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Shared Dataset — data/  (ONE dataset for both components)                    │
│  sources.json  projects.json  roles.json  actors.json  audit.seed.json       │
│  Static JSON, loaded at import time. No database.                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Why two components sharing one core

The separation exists for one reason: **the model must never be the security boundary.** If `canRead()` runs as a prompt instruction, it is a suggestion. If it runs in `lib/retrieval/search.ts` before either the HTTP handler or the MCP tool returns anything, it is a guarantee. Both components enforce this by routing through `lib/api/handlers.ts` — the web app via its HTTP route handlers, the MCP server via its tool handlers. The handlers are the same functions.

The web app exists as an independent component because the full three-part structured answer (ruled ledger, citation marks, source drawer, gap cards, the approval modal) cannot be rendered faithfully inside a chat surface. The web app is the trusted surface where a judge reads the document, opens citations, and inspects `/audit`.

The MCP server exists as an independent component because the hackathon requires WorkBuddy as a platform, and WorkBuddy speaks MCP. Any MCP-capable client gets the same answers the web app renders — the model receives an `AnswerPayload` it can summarise, and links the user to the web app for the full structured view.

### 1.2 The two consumers, one core

Both the web app's HTTP route handlers and the MCP server's tool handlers call the same `lib/api/handlers.ts` functions. This is not duplication — it is defence in depth and transport equivalence. A judge can `curl POST /api/ask` and get the same `AnswerPayload` that `senarai_ask` returns. The transport-equivalence test (PRD §11.2) asserts they are byte-identical for the same input.

### 1.3 Component boundaries

1. The web app does not depend on WorkBuddy or any MCP client. It is fully functional on its own.
2. The MCP server does not depend on the web app's UI. It returns `AnswerPayload` values; rendering is the host client's concern.
3. The MCP adapter (`mcp/server.ts`) contains zero business logic and zero security-relevant code. It imports only from `lib/api/handlers.ts` and `app/api/schemas.ts`.
4. The web app's HTTP route handlers (`app/api/*/route.ts`) contain zero business logic. They call `lib/api/handlers.ts` and serialise the result (NDJSON stream for `/api/ask`, JSON for the rest).
5. Both components write to the same `lib/store/session.ts` audit log. Every `senarai_ask` call and every `POST /api/ask` call is audited, viewable at `/audit`.

### 1.4 Integration points between the two components

The two components are parallel consumers of `lib/`; they do not call each other. There is one bridge:

| Bridge | Direction | Purpose |
|---|---|---|
| Deep link `/ask/[threadId]` | MCP client → web app | When the MCP client's model returns an `AnswerPayload`, it includes `threadId`. The host client can present a link `https://<host>/ask/[threadId]` so the user can open the full structured answer in the web app. The web app rehydrates the thread via `GET /api/threads/[threadId]` — the same `lib/` path. No MCP call is made from the web app. |

The bridge is a URL, not an API dependency. The web app renders the thread from its own HTTP route; the MCP client only knows the URL to offer.

---

## 2. MCP server layer

### 2.1 File: `mcp/server.ts`

The MCP adapter is a single file. It defines five tools, maps their input schemas to `zod` definitions, and delegates to `lib/api/handlers.ts`. It contains no business logic, no security-relevant code, and no data access. Any MCP-capable client — WorkBuddy included — connects to it.

```ts
// mcp/server.ts — structural sketch
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { askSchema, getThreadSchema, approveSchema,
         revokeScopeSchema, queryAuditSchema } from '@/app/api/schemas';
import { handleAsk, handleGetThread, handleApprove,
         handleRevokeScope, handleQueryAudit } from '@/lib/api/handlers';

const server = new McpServer({
  name: 'senarai',
  version: '1.0.0',
});

server.tool('senarai_ask', askSchema, async (input) => {
  const result = await handleAsk(input);
  return { content: [{ type: 'json', data: result }] };
});

server.tool('senarai_get_thread', getThreadSchema, async (input) => {
  const result = await handleGetThread(input);
  return { content: [{ type: 'json', data: result }] };
});

server.tool('senarai_approve', approveSchema, async (input) => {
  const result = await handleApprove(input);
  return { content: [{ type: 'json', data: result }] };
});

server.tool('senarai_revoke_scope', revokeScopeSchema, async (input) => {
  const result = await handleRevokeScope(input);
  return { content: [{ type: 'json', data: result }] };
});

server.tool('senarai_query_audit', queryAuditSchema, async (input) => {
  const result = await handleQueryAudit(input);
  return { content: [{ type: 'json', data: result }] };
});

export { server };
```

### 2.2 Tool catalog

| MCP tool | Input schema | Output | `lib/` function(s) called | HTTP equivalent |
|---|---|---|---|---|
| `senarai_ask` | `{ question: string, projectId: string, actorId: string, locale: 'id' \| 'en' }` | `AnswerPayload` (complete, not streamed) | `snapshot.ts` → `pii.ts` → `search.ts` → `rank.ts` → `toCitation.ts` → `compose.ts` → `detect.ts` → `resolve.ts` → `threads.ts` → `session.ts` | `POST /api/ask` |
| `senarai_get_thread` | `{ threadId: string, actorId: string }` | `AnswerPayload` or canonical empty | `threads.ts` → `scope.ts` | `GET /api/threads/[id]` |
| `senarai_approve` | `{ gapId: string, action: 'approve' \| 'cancel', actorId: string }` | `{ gapId, status, auditAppended }` | `threads.ts` → `session.ts` | `POST /api/approvals` |
| `senarai_revoke_scope` | `{ actorId: string, projectId: string, tag: string, granted: boolean }` | `{ scopeSnapshotId, scopeVersion, affectedSourceCount }` | `grants.ts` → `snapshot.ts` → `session.ts` | `POST /api/scope` |
| `senarai_query_audit` | `{ actorId: string, projectId?: string, dateFrom?: string, dateTo?: string }` | `AuditEntry[]` (role-filtered) | `session.ts` → `scope.ts` | `GET /api/audit` |

### 2.3 Transport

| Transport | Use case | Implementation |
|---|---|---|
| **stdio** | Local MCP client on the demo machine (e.g. WorkBuddy desktop, primary demo path) | `mcp/cli.ts` — a standalone entry point that pipes stdin/stdout to the MCP server. The client launches it as a subprocess. |
| **SSE** | Remote MCP clients, or the web app testing the MCP layer | `GET /api/mcp/sse` — a Next.js route handler that upgrades to an SSE connection and serves the same tool handlers. |

Both transports call the same `handleAsk`, `handleGetThread`, etc. functions in `lib/api/handlers.ts`. The handlers are transport-agnostic. The web app does not consume the MCP server — it has its own HTTP routes — but both reach the same handlers.

### 2.4 Actor resolution

The MCP client passes `actorId` in every tool call. The MCP adapter validates the actor exists in `data/actors.json` before calling `lib/`. An unknown actor returns the canonical empty payload — no error message, no 404, no hint that the actor doesn't exist. This is the same pattern as the permission-invisibility rule: a bad actor id is indistinguishable from a forbidden topic. The web app resolves the actor from a cookie/session, but the same `lib/access/scope.ts` function produces the `ScopeSnapshot` either way.

### 2.5 Error handling

MCP tools return errors as `{ isError: true, content: [{ type: 'text', text: '...' }] }`. Senarai's error surface is intentionally minimal:

| Condition | MCP response | Audit entry? |
|---|---|---|
| Valid input, sources found | `AnswerPayload` | Yes (`answered`) |
| Valid input, no sources found | `AnswerPayload` (canonical empty) | Yes (`empty`) |
| Valid input, all sources filtered out | `AnswerPayload` (canonical empty) | Yes (`empty-equivalent`) |
| Unknown actorId | `AnswerPayload` (canonical empty) | Yes (`empty-equivalent`) |
| Invalid schema (zod parse fail) | `{ isError: true, content: 'Invalid input' }` | No |
| Internal error | `{ isError: true, content: 'Internal error' }` | No |

No error message ever reveals the existence of a forbidden project, topic, or source. The canonical empty is the only response that leaks nothing.

### 2.6 Schema generation

Tool input schemas are generated from the same `zod` definitions that validate HTTP request bodies in `app/api/*/route.ts`. This is a single source of truth — if the HTTP route validates `{ question: z.string(), projectId: z.string(), actorId: z.string(), locale: z.enum(['id','en']) }`, the MCP tool uses the same schema object. Drift is impossible because there is one object.

```ts
// app/api/schemas.ts — shared between HTTP routes and MCP adapter
import { z } from 'zod';

export const askSchema = z.object({
  question: z.string().min(1).max(500),
  projectId: z.string(),
  actorId: z.string(),
  locale: z.enum(['id', 'en']),
});

export const approveSchema = z.object({
  gapId: z.string(),
  action: z.enum(['approve', 'cancel']),
  actorId: z.string(),
});

// ... etc
```

---

## 3. HTTP API layer (web app component)

The HTTP routes are the web app's own API surface — the entry point for the standalone Next.js application. They are a parallel consumer of `lib/`, not a separate implementation, and not a wrapper around the MCP server. The web app does not call the MCP server; both call `lib/`.

### 3.1 Route handlers

| Route | Method | Handler | Stream? | Audit? |
|---|---|---|---|---|
| `/api/ask` | POST | `handleAsk` | NDJSON stream (section-by-section) | Yes, on first section |
| `/api/threads/[threadId]` | GET | `handleGetThread` | No (full payload) | No (read-only) |
| `/api/approvals` | POST | `handleApprove` | No | Yes, on approve only |
| `/api/scope` | POST | `handleRevokeScope` | No | Yes |
| `/api/audit` | GET | `handleQueryAudit` | No | No (read-only) |
| `/api/mcp/sse` | GET | `handleMcpSse` | SSE upgrade | Per-tool-call (delegated) — serves remote MCP clients |

### 3.2 NDJSON streaming (`/api/ask`)

The HTTP `/api/ask` route streams the answer section-by-section as NDJSON (newline-delimited JSON). Each line is a JSON object. The MCP `senarai_ask` tool does not stream — MCP tools return one value. The streaming is an HTTP-only optimisation for first-paint performance; the final `AnswerPayload` is identical.

NDJSON event sequence:

```json
{"type":"header","threadId":"T1","scopeVersion":3,"createdAt":"2026-10-27T14:32:00Z"}
{"type":"section","index":1,"label":"chronology","events":[...]}
{"type":"section","index":2,"label":"openItems","items":[...]}
{"type":"section","index":3,"label":"gaps","gaps":[...]}
{"type":"done","answerId":"A1","version":1}
```

The canonical empty streams the same event sequence with empty arrays. A `curl` diff between a forbidden response and a non-existent-topic response returns nothing — same bytes, same order, same headers.

### 3.3 Shared handlers (`lib/api/handlers.ts`)

Both the MCP adapter and the HTTP route handlers call functions in `lib/api/handlers.ts`. These functions:

1. Validate input (already done by `zod` at the transport boundary).
2. Resolve the actor's `ScopeSnapshot` via `lib/access/snapshot.ts`.
3. Call the pipeline (`search → rank → compose → gaps → conflict → mask`).
4. Append an `AuditEntry` via `lib/store/session.ts`.
5. Return the `AnswerPayload`.

The 600ms latency floor (`lib/api/latency.ts`) is applied inside `handleAsk`, not in the transport layer. It applies equally to the MCP tool and the HTTP route.

---

## 4. Data layer

### 4.1 Static dataset (`data/`)

The dataset is static JSON, loaded at import time. No database, no ORM.

| File | Content | Validated by |
|---|---|---|
| `data/sources.json` | `Source[]` — chat messages, document versions, task cards | `zod` schema at import in dev |
| `data/projects.json` | `Project[]` — project id, code, name, topic tags | `zod` schema at import in dev |
| `data/roles.json` | `Role[]` — staff, manager, admin (id, label, sensitivity access) | `zod` schema at import in dev |
| `data/actors.json` | `Actor[]` — demo users (id, name, roleId, projectId assignments) | `zod` schema at import in dev |
| `data/audit.seed.json` | `AuditEntry[]` — pre-seeded entries for the `/audit` demo | `zod` schema at import in dev |

### 4.2 In-memory session store (`lib/store/session.ts`)

A `globalThis` singleton. Survives hot-reload in dev, resets on server restart. In production (VPS), it lives in the Node.js process managed by PM2.

```ts
// lib/store/session.ts — structural sketch
interface SessionState {
  scopeSnapshots: Map<string, ScopeSnapshot>;
  scopeVersion: number;
  auditLog: AuditEntry[];
  threads: Map<string, AnswerPayload>;
}

const globalForSenarai = globalThis as unknown as {
  senaraiStore?: SessionState;
};

export const store: SessionState = globalForSenarai.senaraiStore ?? {
  scopeSnapshots: new Map(),
  scopeVersion: 0,
  auditLog: [...seedAuditEntries],
  threads: new Map(),
};

if (process.env.NODE_ENV !== 'production') {
  globalForSenarai.senaraiStore = store;
}
```

### 4.3 Scope snapshot versioning

Every scope mutation (via `senarai_revoke_scope` or `POST /api/scope`) increments `store.scopeVersion` and creates a new `ScopeSnapshot` with the new version. The previous snapshot is retained. This is how the audit log shows two scope snapshots for a revoked-and-re-asked session (PRD T20).

---

## 5. Access control pipeline

### 5.1 `canRead(snapshot, source): boolean`

The one function everything hangs on. Pure, synchronous, ~20 lines.

```ts
// lib/access/canRead.ts
export function canRead(snapshot: ScopeSnapshot, source: Source): boolean {
  // 1. Project must be in the snapshot's projectIds
  if (!snapshot.projectIds.includes(source.projectId)) return false;

  // 2. Find the grant for this project
  const grant = snapshot.grants.find(g => g.projectId === source.projectId);
  if (!grant) return false;

  // 3. Tag check: '*' passes, otherwise source must have at least one matching tag
  if (grant.tags !== '*') {
    const hasTag = source.topicTags.some(t => grant.tags.includes(t));
    if (!hasTag) return false;
  }

  // 4. Sensitivity check: source sensitivity must be in the grant's allowed set
  if (!grant.sensitivities.includes(source.sensitivity)) return false;

  return true;
}
```

Called in two places (defence in depth):
1. `lib/retrieval/search.ts` — **before** ranking. The model never receives a filtered-out source.
2. `lib/retrieval/toCitation.ts` — **again** at citation time. Throws in dev, drops silently in prod if a citation somehow points at a filtered source. Numbering is never renumbered — a gap in the sequence would be a tell.

### 5.2 Canonical empty payload

```ts
// lib/answer/canonicalEmpty.ts
const FROZEN = Object.freeze({
  status: 'empty' as const,
  canonical: true,
  chronology: [],
  openItems: [],
  gaps: [],
});

export const canonicalEmpty = (scope: ScopeSnapshot, threadId: string): AnswerPayload => ({
  ...FROZEN,
  id: 'EMPTY',
  threadId,
  question: '',          // no query echo
  questionMasked: '',
  createdAt: FIXED_TS,   // constant timestamp, not now()
  locale: 'id',
  scope,
  version: 0,
});
```

Properties that make it byte-identical across causes:
- `Object.freeze` on the static fields.
- No `question` echo — the topic name itself may be the forbidden fact.
- `createdAt` is a constant (`FIXED_TS`), not `new Date().toISOString()`.
- HTTP 200, same headers, same content length.
- The NDJSON stream uses the same event sequence with empty arrays.
- No `Surface level={1}` wrapper, no tint, no icon — renders inside the identical `Surface level={0}` as a full answer.

### 5.3 600ms latency floor

```ts
// lib/api/latency.ts
const MIN_LATENCY_MS = 600;

export async function withLatencyFloor<T>(start: number, fn: () => Promise<T>): Promise<T> {
  const result = await fn();
  const elapsed = Date.now() - start;
  if (elapsed < MIN_LATENCY_MS) {
    await sleep(MIN_LATENCY_MS - elapsed);
  }
  return result;
}
```

Applied in `handleAsk`, after the pipeline runs, before the return. A forbidden query (which returns canonical empty quickly) and a normal query (which runs the full pipeline) both take at least 600ms. This narrows timing side-channels. It is acknowledged in the README as a limitation, not a security control.

### 5.4 When the canonical empty is returned

One component, four causes, no branching on cause:

1. Topic outside the asker's scope (forbidden).
2. Project outside the asker's scope.
3. Genuinely absent record (the topic exists but no source covers it).
4. All matching sources filtered out by `canRead()`.

The handler does not know which cause triggered the empty. It calls `canRead()` on every source; if zero sources survive, it returns `canonicalEmpty()`. The audit log records `decision: 'empty-equivalent'` for cause 1 and 4, `decision: 'empty'` for cause 2 and 3 — but the payload returned to the model and the web app is identical.

### 5.5 Mid-session revocation

When `senarai_revoke_scope` or `POST /api/scope` mutates a grant:
1. `store.scopeVersion` increments.
2. A new `ScopeSnapshot` is created with the new version.
3. The next `senarai_ask` / `POST /api/ask` call resolves the new snapshot.
4. If a stream is in flight (HTTP only), the client sees the version bump via the NDJSON stream header and aborts. The partial document is discarded. No leaked text remains in the DOM.
5. The audit log shows two entries with two scope snapshot ids.

---

## 6. Retrieval and composition pipeline

### 6.1 Search (`lib/retrieval/search.ts`)

```ts
export function search(
  question: string,
  projectId: string,
  snapshot: ScopeSnapshot,
  sources: Source[]
): Source[] {
  return sources
    .filter(s => s.projectId === projectId)
    .filter(s => canRead(snapshot, s))           // permission-before-search
    .filter(s => matchesQuestion(question, s));  // keyword/tag match
}
```

`matchesQuestion` is a keyword + topic-tag match, not semantic search. For the three scripted demo questions, the match is exact. For free-text questions, the fallback is keyword match; if no keywords match, the result is the canonical empty. This is the "honest no-record" path (FR-5).

### 6.2 Rank (`lib/retrieval/rank.ts`)

```ts
export function rank(sources: Source[]): Source[] {
  return [...sources].sort((a, b) => {
    // 1. By date descending (most recent first)
    if (a.at !== b.at) return b.at.localeCompare(a.at);
    // 2. By kind precedence: doc > task > chat (for same timestamp)
    const kindOrder = { doc: 0, task: 1, chat: 2 };
    return kindOrder[a.kind] - kindOrder[b.kind];
  });
}
```

### 6.3 toCitation (`lib/retrieval/toCitation.ts`)

Converts a `Source` into a `Citation` with a `marker` (sequential number) and a `quote` (verbatim, already masked by `lib/mask/pii.ts`). Calls `canRead()` again here as defence in depth.

### 6.4 Compose (`lib/answer/compose.ts`)

Assembles the `AnswerPayload` from the ranked sources:

1. **Chronology** — merge events from chat, doc, task sources into a single timeline. Each event gets `citations[]` pointing at the sources it was drawn from.
2. **Open items** — extract open/blocked/overdue tasks from task sources. Each item gets a `citation`.
3. **Gaps** — call `lib/gaps/detect.ts` (see §7).
4. **Conflicts** — call `lib/conflict/resolve.ts` on chronology events with overlapping claims (see §8).
5. Assign `marker` numbers sequentially across all three sections in reading order.

---

## 7. Record-gap detection

### 7.1 Three deterministic rules (`lib/gaps/detect.ts`)

The gap detection is in code, not in the model. The model only phrases the gaps. Three rules:

| Rule | Condition | Example |
|---|---|---|
| `no-cause` | A causal question ("why was X late?") has no visible source stating a cause for the named event. | "No record of who approved the quantity change on the PO." |
| `ownerless-blocked-item` | An open item has status `blocked` but no owner or no due date. | "Task 'confirm vendor' is blocked but has no owner assigned." |
| `silent-interval` | A gap of ≥5 days in the chronology between two related events. | "No sources between Oct 12 and Oct 18 — the interval is unrecorded." |

Thresholds are demo constants in one file (`lib/gaps/detect.ts`), not configurable at runtime.

### 7.2 Knower derivation (`lib/gaps/knowers.ts`)

```ts
export function findKnower(
  gap: RecordGap,
  visibleSources: Source[],
  actors: Actor[]
): Knower | undefined {
  // Only from sources the asker can read
  // Find a participant who was present in the relevant time window
  const candidates = visibleSources
    .filter(s => isRelevant(gap, s))
    .flatMap(s => s.participantIds)
    .map(id => actors.find(a => a.id === id))
    .filter(Boolean);

  if (candidates.length === 0) return undefined;  // omit, never guess

  const first = candidates[0];
  return {
    personId: first.id,
    name: first.name,
    basis: 'participant',
    sourceId: /* the source that yielded this person */,
  };
}
```

**Critical:** if no visible source yields a participant, `knower` is `undefined` and the gap card omits the field. No directory lookup, no guessed name. The gap itself must not leak that hidden information exists.

### 7.3 Draft question generation (`lib/gaps/draftQuestion.ts`)

```ts
export function draftQuestion(gap: RecordGap, knower?: Knower): string {
  // Templated, not model-generated. One template per rule.
  const templates = {
    'no-cause': (g) => `Halo ${knower?.name ?? ''}, terkait ${g.whatIsMissing}, apakah Anda tahu siapa yang menyetujui perubahan ini?`,
    'ownerless-blocked-item': (g) => `Halo ${knower?.name ?? ''}, tugas "${g.whatIsMissing}" saat ini terhambat. Siapa yang seharusnya menangani ini?`,
    'silent-interval': (g) => `Halo ${knower?.name ?? ''}, tidak ada catatan untuk periode ${g.whatIsMissing}. Apakah Anda ingat apa yang terjadi?`,
  };
  return templates[gap.rule](gap);
}
```

The draft is a starting point, not a final message. The approval gate shows it in an editable field (FR-4: the user can modify before approving). The draft is never sent without explicit human approval.

---

## 8. Conflict resolution

### 8.1 Precedence rules (`lib/conflict/resolve.ts`)

Fixed precedence, stored as a rule id, rendered as a plain-language note:

| Precedence | Rule id | Plain language |
|---|---|---|
| 1 (highest) | `newer-version` | "Newer document version" |
| 2 | `board-over-chat` | "Task board update over chat message" |
| 3 | `explicit-correction` | "Explicit correction" |
| Tie-break | (recency) | Most recent source wins |

### 8.2 Conflict note placement

The conflict note is inline on the affected chronology row, not in a summary banner at the top. The note names the rule and the chosen source:

```
Konflik sumber — dipakai [4] (PO rev. 3, 14 Okt) karena lebih baru daripada [6] (chat, 12 Okt)
```

Both conflicting sources appear in the drawer; neither is hidden. One conflict = one note. No conflict-count badges, no colour escalation, no severity ordering.

### 8.3 `ConflictNote` type

```ts
export interface ConflictNote {
  field: string;                    // what the conflict is about
  chosenCitationId: string;        // the citation that was used
  rejectedCitationIds: string[];   // the citations that were rejected
  rule: 'newer-version' | 'board-over-chat' | 'explicit-correction';
  params?: Record<string, string>; // for rendering the note
}
```

---

## 9. PII masking

### 9.1 `lib/mask/pii.ts`

```ts
const NIK_PATTERN = /\b\d{16}\b/g;                    // 16-digit NIK
const PHONE_PATTERN = /\b08\d{8,12}\b/g;               // Indonesian mobile
const PHONE_INTL_PATTERN = /\+62\d{8,12}\b/g;          // International format

export function maskPII(text: string): string {
  return text
    .replace(NIK_PATTERN, '••••')
    .replace(PHONE_PATTERN, '••••')
    .replace(PHONE_INTL_PATTERN, '••••');
}
```

Runs on every source body **before** it enters the retrieval pipeline. The model never sees the raw NIK or phone number. The source drawer shows `••••` with a "data pribadi" / "personal data" reason label. The citation remains valid — removing it would hide that the source was used.

### 9.2 Audit log masking

The raw question is masked before it is logged. `AuditEntry.questionMasked` is the only question field in the type system. No `rawQuestion` field exists. This is enforced by the type definition — there is no field to accidentally log into.

---

## 10. Audit logging

### 10.1 `AuditEntry` lifecycle

| Event | When | What is recorded |
|---|---|---|
| Ask | `handleAsk` completes | `id`, `at`, `actorId`, `actorRole`, `projectId`, `questionMasked`, `scopeSnapshotId`, `retrievedSourceIds[]`, `answerId`, `decision` (`answered` / `empty` / `empty-equivalent`) |
| Approve | `handleApprove` with `action: 'approve'` | Appends to the existing ask entry's `approvals[]`: `{ gapId, state: 'approved', at }` |
| Cancel | `handleApprove` with `action: 'cancel'` | **Nothing is written.** A cancelled draft is not an event. |
| Scope change | `handleRevokeScope` | A new `ScopeSnapshot` is created. The next ask entry will reference it. |

### 10.2 Audit log permissioning

| Role | Sees |
|---|---|
| Staff | Own entries only (`actorId === session.actorId`) |
| Manager | Entries for projects in their scope |
| Admin | All entries |

The demo runs as admin for judging (PRD A5). The `senarai_query_audit` tool and `GET /api/audit` both enforce this scoping via `lib/access/scope.ts`.

### 10.3 Decision values

| Decision | Meaning |
|---|---|
| `answered` | The question matched sources and a full answer was composed. |
| `empty` | No sources matched the question (non-existent topic, project outside scope). |
| `empty-equivalent` | Sources matched but all were filtered out by `canRead()` (forbidden topic). The payload returned is the canonical empty — byte-identical to `empty`. |

The decision is stored in the audit log for the auditor. It is never visible to the asker. The asker sees the same canonical empty regardless of whether the decision was `empty` or `empty-equivalent`.

---

## 11. MCP client orchestration mapping

This section describes how an MCP-capable client (WorkBuddy being the required one) calls each tool in each demo scenario. The web app runs the same scenarios independently through its HTTP routes — no MCP client required. Both paths share the audit log.

### 11.1 How an MCP client calls each tool in each demo scenario

> In the demo, the MCP client is WorkBuddy. The same tool calls work from any MCP-capable client. The web app runs each scenario independently through its HTTP routes — no MCP client required.

**Scenario 1: One question, two different answers (role differentiation)**

1. User asks the MCP client: "Why was stock late in Makassar?"
2. The client's model calls `senarai_ask({ question, projectId: 'makassar-q4', actorId: 'rina', locale: 'id' })`.
3. Senarai resolves Rina's scope (staff), runs the pipeline, returns an `AnswerPayload` with only general-sensitivity sources.
4. The client presents the answer summary in chat. It offers a link: "Open full answer in Senarai" → `http://localhost:3000/ask/T1`.
5. User (or judge) switches to the manager role in the web app and re-asks — or the client calls `senarai_ask` with `actorId: 'budi'` (manager).
6. Budi's answer includes management-only sources (vendor dispute, penalty clause).
7. Both answers have the identical three-section shape. The staff answer gives no hint that anything is hidden.

**Scenario 2: Record gap with draft question awaiting approval**

1. User asks the MCP client: "Why was stock late in Makassar?"
2. The client's model calls `senarai_ask`.
3. The `AnswerPayload` includes a `gaps[]` array with a `RecordGap` (rule: `no-cause`, knower: Rina, draftQuestion: "Halo Rina, terkait...").
4. The client presents the gap in chat: "I found a gap — no record of who approved the quantity change. Rina may know. Would you like me to send a draft question?"
5. User says "yes."
6. The client's model calls `senarai_approve({ gapId: 'G1', action: 'approve', actorId })`.
7. Senarai mutates the gap status to `sent`, appends an audit entry (`approvals[]`), and returns `{ gapId: 'G1', status: 'sent', auditAppended: true }`.
8. The client confirms: "Question sent to Rina (simulated). Waiting for reply."
9. The web app shows the gap card with `Terkirim — menunggu balasan` and the audit log reads `Disetujui`. (The web app's approval gate achieves the same outcome via `POST /api/approvals` — same `lib/` path.)

**Scenario 3: Live permission revocation changing the next answer**

1. Manager is viewing an answer (via the web app or a previous `senarai_ask` call).
2. Admin tells the MCP client: "Revoke Budi's access to the vendor.penalty tag in Makassar Q4." (Or the admin uses `/access` in the web app directly.)
3. The client's model calls `senarai_revoke_scope({ actorId: 'budi', projectId: 'makassar-q4', tag: 'vendor.penalty', granted: false })`. (The web app calls `POST /api/scope` for the same effect.)
4. Senarai mutates the grant, increments `scopeVersion`, creates a new `ScopeSnapshot`, returns the new snapshot id and affected source count.
5. The client confirms: "Access revoked. The next answer will reflect the change."
6. Budi re-asks the same question (via the MCP client or the web app).
7. `senarai_ask` / `POST /api/ask` resolves the new scope. The answer is reduced. The scope-change banner appears.
8. The audit log shows two entries with two scope snapshot ids.

### 11.2 What the MCP client's model receives vs. what it never sees

| The model receives | The model never sees |
|---|---|
| `AnswerPayload` (already filtered, already masked, already audited) | Raw `Source` objects |
| `AuditEntry[]` (already role-scoped) | The `canRead()` function |
| `{ gapId, status, auditAppended }` from approve | The scope snapshot mutation logic |
| `{ scopeSnapshotId, scopeVersion, affectedSourceCount }` from revoke | The PII masking pipeline |
| Canonical empty (byte-identical for forbidden and non-existent) | Whether the empty was `empty` or `empty-equivalent` |

The last row is critical: the model cannot distinguish a forbidden topic from a non-existent one because it receives the same payload. It cannot accidentally reveal that hidden information exists because it does not know. The web app's server components enjoy the same guarantee — neither surface ever receives filtered-out sources.

### 11.3 WorkBuddy workflow export

The "WorkBuddy workflow export" deliverable (required by the handbook) is:
1. The MCP tool configuration (five tools, their schemas, the `stdio` transport endpoint).
2. The agent instructions that tell WorkBuddy when to call each tool, how to present the summary, and when to link to the web app for the full structured view.
3. The demo script (three scenarios, with the exact questions and expected tool calls).

This is a clean, exportable artifact — a JSON or YAML file that WorkBuddy can import to connect to the Senarai MCP server. It describes only the MCP server component; the web app needs no import — it is opened in a browser.

---

## 12. Security analysis

### 12.1 Why the unified architecture preserves every guarantee

| Guarantee | How it is preserved |
|---|---|
| **Permission-before-search** | `canRead()` runs in `lib/retrieval/search.ts` before the pipeline returns anything to the MCP adapter. The model receives only filtered results. |
| **Canonical empty** | `canonicalEmpty()` is called in `lib/answer/compose.ts` when zero sources survive `canRead()`. The MCP adapter returns it as-is. Byte-identical to the HTTP route's response. |
| **Permission-invisibility** | The model cannot distinguish `empty` (non-existent) from `empty-equivalent` (forbidden) because both return the same canonical empty. No `Forbidden` component, no 403, no error message. |
| **600ms latency floor** | Applied in `handleAsk` (in `lib/`), not in the transport. Both MCP and HTTP paths get the floor. |
| **PII masking** | `lib/mask/pii.ts` runs on source bodies before they enter the pipeline. The model receives masked quotes. The audit log records masked questions. |
| **Audit completeness** | Every `senarai_ask` call appends an `AuditEntry` via `lib/store/session.ts`. The model cannot bypass this because the append happens inside `handleAsk`, not in the tool. |
| **No raw-question logging** | `AuditEntry.questionMasked` is the only field. The type system enforces it — there is no `rawQuestion` field to accidentally write. |
| **Document-instruction immunity** | Source bodies are retrieval content only. The MCP adapter passes them as data, not as instructions. The host client's model receives them as structured `Citation.quote` fields, not as prompt text. The web app's server components render them as document content, not as commands. |

### 12.2 What the MCP adapter does NOT do

- It does not call `canRead()` itself. (That would let the model influence the filter.)
- It does not compose the answer. (That would let the model shape the output.)
- It does not decide whether to return the canonical empty. (That would let the model choose to leak.)
- It does not log. (That would let the model skip the audit.)
- It does not mask PII. (That would let the model see raw data.)

The adapter is a pipe. Data flows through it in one direction: from `lib/` to the host client's model. Nothing flows back except explicit human actions (approve, revoke) that the model proposes and the user confirms. The same is true of the web app's HTTP handlers — they too are pipes over `lib/`.

### 12.3 The one attack the MCP server cannot prevent

A malicious host client model could refuse to call `senarai_ask` and instead fabricate an answer. This is not preventable at the Senarai layer — it is a property of the host client, not the tool. The hackathon judges will use WorkBuddy as provided, so this is not a practical concern. The web app (`/ask/[threadId]`) is the trusted surface and the system of record; the MCP server is an integration layer that gives host clients access to the same core.

---

## 13. File inventory (backend-specific)

```
mcp/
  server.ts              MCP server: five tool definitions, schema mapping
  cli.ts                 stdio transport entry point (launched by an MCP client, e.g. WorkBuddy)

app/api/
  ask/route.ts           POST → NDJSON stream (calls handleAsk)
  threads/[threadId]/route.ts   GET → AnswerPayload (calls handleGetThread)
  approvals/route.ts     POST → audit entry (calls handleApprove)
  scope/route.ts         POST → scope mutation (calls handleRevokeScope)
  audit/route.ts         GET → AuditEntry[] (calls handleQueryAudit)
  mcp/sse/route.ts       GET → SSE upgrade for remote MCP transport
  schemas.ts             Shared zod schemas (one source of truth)

lib/
  access/    canRead.ts, scope.ts, snapshot.ts, grants.ts
  retrieval/ search.ts, rank.ts, toCitation.ts
  answer/    compose.ts, canonicalEmpty.ts, sections.ts
  gaps/      detect.ts, draftQuestion.ts, knowers.ts
  conflict/  resolve.ts
  mask/      pii.ts
  store/     session.ts (globalThis singleton), threads.ts
  api/       handlers.ts (shared by MCP + HTTP), stream.ts, latency.ts
  i18n/      messages.id.ts, messages.en.ts, keys.ts, provider.tsx, format.ts
  ui/        cx.ts, status.ts

data/
  sources.json   projects.json   roles.json   actors.json   audit.seed.json

types/
  domain.ts     Full type definitions (see frontend.md §8)
```

---

## 14. Dependencies

| Package | Purpose | Version constraint |
|---|---|---|
| `next` | Framework (App Router, React 19) | `15.x` |
| `react`, `react-dom` | UI runtime | `19.x` |
| `tailwindcss` | Styling | `v4` (fallback `v3.4`) |
| `zod` | Schema validation (shared by HTTP + MCP) | `3.x` |
| `@modelcontextprotocol/sdk` | MCP server SDK | `latest stable` |
| `vitest` | Tests on pure functions | `latest` |

**Not installed:** Prisma, tRPC, Redux/Zustand, shadcn/ui, Radix, Framer Motion, any icon package, `date-fns`, `tailwind-merge`/`clsx`, any chart library, any auth library. The explicit list is in `frontend.md` §2.

---

## 15. References

| Document | Role |
|---|---|
| `PRD.md` | Requirements, test matrix, assumptions, MCP tool catalog (§8.2a) |
| `design.md` | Interaction model, tokens, accessibility, copy |
| `frontend.md` | Component contracts, domain types, build order |
| `backend.md` | This document — MCP server layer, API, pipelines, security analysis |
| `deployment.md` | VPS deployment (PM2 + Nginx + Next.js standalone) |
| `prompts/phase-0.md` – `prompts/phase-6.md` | Build prompts (Phase 5 covers the MCP server) |
