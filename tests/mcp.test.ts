import { describe, expect, it } from 'vitest';
import {
  askTool,
  auditTool,
  approveTool,
  getThreadTool,
  revokeScopeTool,
} from '@/lib/mcp/tools';
import { handleAsk } from '@/lib/api/handlers';
import { store } from '@/lib/store/session';
import type { AnswerPayload } from '@/types/domain';

const MAIN = 'Kenapa stok telat di Makassar, dan apa yang masih terbuka?';

const askViaHttp = () =>
  handleAsk({ question: MAIN, projectId: 'makassar-q4', actorId: 'A1', locale: 'id' });

/**
 * Everything a reader can see, with the per-request identifiers removed. The
 * point of the check is that the MCP tool does not transform, trim or reorder
 * the answer — not that two threads happen to share an id.
 */
function substance(p: AnswerPayload) {
  return {
    canonical: p.canonical,
    answerLanguage: p.answerLanguage,
    leadId: p.lead?.textId,
    leadEn: p.lead?.textEn,
    leadCitations: p.lead?.citations,
    chronology: p.chronology.map((e) => [e.title, e.at, e.citations.map((c) => c.sourceId)]),
    openItems: p.openItems.map((i) => [i.title, i.citation.sourceId]),
    gaps: p.gaps.map((g) => [g.id, g.kind, g.whatIsMissing]),
    trace: p.trace?.map((s) => [s.tool, s.status]),
    verification: p.verification && {
      claims: p.verification.claims,
      cited: p.verification.cited,
      passed: p.verification.passed,
    },
  };
}

describe('MCP tool layer — transport equivalence (T28)', () => {
  it('returns the same answer as the HTTP path for the same input', async () => {
    const viaTool = await askTool({ question: MAIN, actorId: 'A1', projectId: 'makassar-q4' });
    const viaHttp = await askViaHttp();

    expect(substance(viaTool.payload)).toEqual(substance(viaHttp.payload));
    expect(viaTool.payload.canonical).toBe(false);
    expect(viaTool.payload.chronology.length).toBe(9);
  }, 15_000);

  it('keeps the 600 ms floor across the transport', async () => {
    const started = Date.now();
    await askTool({ question: MAIN, actorId: 'A1', projectId: 'makassar-q4' });
    expect(Date.now() - started).toBeGreaterThanOrEqual(600);
  }, 15_000);

  it('returns the canonical empty for a forbidden topic, identical to a non-existent one', async () => {
    const forbidden = await askTool({
      question: 'Apa itu Proyek Kenari?',
      actorId: 'A1',
      projectId: 'makassar-q4',
    });
    const absent = await askTool({
      question: 'Apa itu Proyek Nusantara?',
      actorId: 'A1',
      projectId: 'makassar-q4',
    });

    expect(forbidden.payload.canonical).toBe(true);
    expect(substance(forbidden.payload)).toEqual(substance(absent.payload));
    expect(JSON.stringify(forbidden.payload)).not.toMatch(
      /forbidden|denied|restricted|locked|withheld/i,
    );
  }, 15_000);

  it('gives an unknown actor the canonical empty rather than an error', async () => {
    const { payload } = await askTool({
      question: MAIN,
      actorId: 'A-DOES-NOT-EXIST',
      projectId: 'makassar-q4',
    });

    expect(payload.canonical).toBe(true);
    expect(payload.chronology).toHaveLength(0);
  }, 15_000);
});

describe('MCP tool layer — the tools cannot be used to escalate', () => {
  it("returns the canonical empty for another actor's thread", async () => {
    const manager = await askTool({ question: MAIN, actorId: 'A2', projectId: 'makassar-q4' });

    const foreign = getThreadTool({
      threadId: manager.threadId,
      actorId: 'A1',
      projectId: 'makassar-q4',
    });

    expect(foreign?.canonical).toBe(true);
    expect(foreign?.chronology).toHaveLength(0);
  }, 15_000);

  it('refuses to approve a gap on a thread the actor cannot see', async () => {
    const manager = await askTool({ question: MAIN, actorId: 'A2', projectId: 'makassar-q4' });
    const gapId = manager.payload.gaps.find((g) => g.approval)?.id;

    const result = approveTool({
      threadId: manager.threadId,
      gapId: gapId ?? 'G1',
      actorId: 'A1',
      projectId: 'makassar-q4',
    });

    expect(result.ok).toBe(false);
  }, 15_000);

  it('refuses to widen a scope the role does not carry', () => {
    const before = store.scopeVersion;
    const result = revokeScopeTool({
      actorId: 'A1',
      projectId: 'makassar-q4',
      token: 'sensitivity:management',
      granted: true,
    });

    expect(result.ok).toBe(false);
    expect(store.scopeVersion).toBe(before);
  });

  it('allows narrowing, and the next answer reflects it', async () => {
    const before = await askTool({ question: MAIN, actorId: 'A1', projectId: 'makassar-q4' });

    const revoked = revokeScopeTool({
      actorId: 'A1',
      projectId: 'makassar-q4',
      token: 'customer',
      granted: false,
    });
    expect(revoked.ok).toBe(true);

    const after = await askTool({ question: MAIN, actorId: 'A1', projectId: 'makassar-q4' });
    expect(after.payload.chronology.length).toBeLessThan(before.payload.chronology.length);

    // Restore so later files see the authored dataset.
    revokeScopeTool({ actorId: 'A1', projectId: 'makassar-q4', token: 'customer', granted: true });
  }, 20_000);

  it('scopes the audit log to the caller', () => {
    const staff = auditTool({ actorId: 'A1', limit: 100 });
    expect(staff.length).toBeGreaterThan(0);
    expect(staff.every((e) => e.actorId === 'A1')).toBe(true);

    const admin = auditTool({ actorId: 'A3', limit: 100 });
    expect(admin.length).toBeGreaterThanOrEqual(staff.length);
  });
});
