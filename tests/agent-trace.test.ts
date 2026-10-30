import { describe, expect, it } from 'vitest';
import { composeAnswer } from '@/lib/answer/compose';
import { buildSnapshot } from '@/lib/access/scope';
import { sources } from '@/lib/data';

function ask(actorId: string, projectId: string, question: string) {
  return composeAnswer({
    threadId: 'TH-T',
    question,
    locale: 'id',
    projectId,
    snapshot: buildSnapshot(actorId, projectId),
    allSources: sources,
  });
}

describe('agent trace', () => {
  it('records the pipeline in the order it ran', () => {
    const answer = ask('A1', 'makassar-q4', 'Kenapa stok telat di Makassar?');
    const tools = answer.trace!.map((s) => s.tool);
    expect(tools).toEqual([
      'resolve_scope',
      'search_sources',
      'read_sources',
      'resolve_conflicts',
      'detect_gaps',
      'compose',
      'verify',
    ]);
  });

  it('ends with a self-check that passes when every claim is cited', () => {
    const answer = ask('A1', 'makassar-q4', 'Kenapa stok telat di Makassar?');
    expect(answer.verification!.passed).toBe(true);
    expect(answer.verification!.cited).toBe(answer.verification!.claims);
    expect(answer.trace!.at(-1)!.status).toBe('ok');
  });

  it('checks access before it searches', () => {
    const answer = ask('A1', 'makassar-q4', 'Kenapa stok telat di Makassar?');
    expect(answer.trace![0].tool).toBe('resolve_scope');
    expect(answer.trace![1].tool).toBe('search_sources');
  });

  it('carries no trace on the canonical empty', () => {
    // A trace that exists for an answered question and not for a withheld one
    // would itself be a signal, so the empty payload has none at all.
    const empty = ask('A1', 'makassar-q4', 'Berapa denda kontrak Anugrah?');
    expect(empty.canonical).toBe(true);
    expect(empty.trace).toBeUndefined();
    expect(empty.verification).toBeUndefined();
  });

  it('never states how many sources were filtered out', () => {
    const answer = ask('A1', 'makassar-q4', 'Kenapa stok telat di Makassar?');
    const text = answer.trace!.map((s) => `${s.detailId} ${s.detailEn}`).join(' ');
    expect(text).not.toMatch(/\d+\s+(hidden|filtered|withheld|disembunyikan)/i);
  });
});
