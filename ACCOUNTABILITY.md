# Accountability sheet — Senarai

**One page. What the agent can access, what it does on its own, what needs a person, what it will never do.**

---

## 1. What it can access

| | |
|---|---|
| **Sources** | Chat messages, document versions and task cards belonging to the projects the asker is assigned to. Twenty-nine sources across three projects in the demo dataset. |
| **Scope model** | A scope snapshot is resolved per request from three things: the actor's project list, the role's topic tags, and the role's sensitivities (`general`, `management`). |
| **When it is checked** | Before retrieval. A source outside the snapshot is never scored, never ranked, never counted. Checked again at citation time as defence in depth. |
| **What it can never read** | Any project the actor is not assigned to. Any topic tag the role does not carry. Any `management`-sensitive source when the role is `staff`. |
| **Personal data** | NIK and phone numbers are masked before the text enters the retrieval pipeline, so the model never sees the raw value. The citation stays valid; the value does not. |

## 2. What it does on its own

Autonomous, no approval, reversible, no side effects:

- Retrieves and ranks sources inside the asker's scope.
- Composes the three-part answer: chronology, open items, record gaps.
- Writes the direct answer at the top. Every clause in it carries a citation marker, and a clause whose source has no marker is dropped rather than written.
- Runs a fixed, visible pipeline and records it: `resolve_scope → search_sources → read_sources → resolve_conflicts → detect_gaps → compose → verify`, with per-step timings in `/audit` and on the answer page.
- Self-checks before returning: if any rendered claim lacks a citation, the answer is flagged rather than presented as complete.
- Detects conflicts between sources and applies a fixed precedence (newer document version between two documents → most recent source across kinds).
- Detects record gaps with three deterministic rules and names a knower **only** from a source the asker can already read.
- Masks personal data, ignores instructions embedded in documents, and reports that it did so.
- Writes an audit entry for every question: actor, scope snapshot, sources retrieved, **the response returned**, the agent step count, decision.

## 3. What requires a person

| Action | Gate |
|---|---|
| Sending any message to a named person | Approval sheet showing recipient, channel and the exact text. Nothing leaves the system until **Approve and send** is pressed. Cancelling writes no event. |
| Widening access | Not possible. A user can narrow their own scope; `POST /api/scope` returns 403 for any grant their role does not already carry. |
| Sending is simulated | The approval sheet says so. There is no mail or messaging integration in this build. |

## 4. What it will never do

1. **Never reveals that restricted content exists.** A question about forbidden material returns the same payload as a question about material that was never written: same structure, same length, no echo of the question, constant timestamp, same latency floor.
2. **Never says "I can't share that".** There is no `Forbidden`, `Denied`, `Locked` or `Restricted` component in the codebase, and no permission tone in the status vocabulary. The absence is the feature.
3. **Never guesses.** If the visible record does not answer the question, it says no record exists and stops. It does not fill the gap with plausible text. A fact question whose subject appears nowhere in data the asker can read is answered "no record", not with the nearest neighbouring topic.
4. **Never writes a sentence without a source.** The composition is deterministic: every clause is a quoted source or a template filled with a hand-authored fact. There is no language model in the answer path, so there is nothing that can invent a claim.
5. **Never shows its reasoning for a question it will not answer.** The canonical empty carries no agent trace, because a trace present for one cause and absent for another would itself be a signal.
6. **Never names a knower it cannot justify.** A knower must be a participant of a source the asker can read. If the visible record yields nobody, the field is omitted rather than filled from a directory.
7. **Never treats document text as a command.** An embedded instruction is logged as ignored, not executed.
8. **Never lets one person read another's thread.** A thread opened by a different actor renders as the empty state.
9. **Never hides a failure.** Refusals, ignored injections, source conflicts and an uncited claim are all rendered in the answer, not in a tooltip.
10. **Never lets ingestion widen anyone's scope.** A message that arrives during a session is subject to the same `canRead` gate as the seed dataset; a new `vendor.contract` message stays unreadable to a staff role.

## 5. Where the record lives

- `/audit` — every question, actor, scope snapshot id and version, sources retrieved, **the response returned (masked, truncated)**, the number of agent steps, decision, approvals.
- `decision` is one of `answered`, `empty`, `empty-equivalent`. The third means sources matched but were all filtered by scope. **It is stored for the auditor and never shown to the asker**, who sees the same empty screen either way.
- Staff see their own entries; managers see their projects; admins see everything.
- The audit log is scoped by the same access code as the answers — it is not a separate, weaker path.
- The agent's own step list is part of the answer, so "what it saw, decided and did" is readable without a database query.

## 6. Known gaps in this build

- Aggregate inference is not yet blocked (e.g. "how many staff earn above X").
- The 600 ms latency floor narrows the timing side-channel but does not eliminate it.
- Retrieval is keyword and topic-tag based. The grounding rule turns unusual vocabulary into an honest "no record" rather than a near-miss answer; that is the safer failure, but it is still a failure to answer something that exists.
- The agent is deterministic. It cannot paraphrase a source it has not been given a hand-authored sentence for.

*Stated here rather than discovered on stage. Concealing a failure costs more than disclosing it.*
