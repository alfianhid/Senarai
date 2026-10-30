import { describe, expect, it } from 'vitest';
import { canonicalEmpty } from '@/lib/answer/canonicalEmpty';
import { buildSnapshot } from '@/lib/access/scope';

describe('canonical empty (T01–T04)', () => {
  const staff = buildSnapshot('A1', 'makassar-q4');
  const manager = buildSnapshot('A2', 'makassar-q4');

  it('never echoes the question, which may itself be the forbidden fact', () => {
    const payload = canonicalEmpty(staff, 'TH-1', 'makassar-q4');
    expect(payload.question).toBe('');
    expect(payload.questionMasked).toBe('');
  });

  it('is byte-identical for a forbidden topic and a non-existent one', () => {
    const forbidden = canonicalEmpty(staff, 'TH-A', 'makassar-q4');
    const nonexistent = canonicalEmpty(staff, 'TH-B', 'makassar-q4');
    // The thread id is the only per-request field; it is not part of the body.
    expect(JSON.stringify({ ...forbidden, threadId: 'X' })).toBe(
      JSON.stringify({ ...nonexistent, threadId: 'X' }),
    );
  });

  it('is identical across actors once the asker\'s own scope is set aside', () => {
    // The payload carries the asker's own scope, which they already know. What
    // must not differ is the answer itself: no count, no hint, no branch.
    const strip = (p: ReturnType<typeof canonicalEmpty>) => ({ ...p, scope: undefined });
    const asStaff = canonicalEmpty(staff, 'TH-1', 'makassar-q4');
    const asManager = canonicalEmpty(manager, 'TH-1', 'makassar-q4');
    expect(JSON.stringify(strip(asStaff))).toBe(JSON.stringify(strip(asManager)));
  });

  it('always renders the three-section shape, empty', () => {
    const payload = canonicalEmpty(staff, 'TH-1', 'makassar-q4');
    expect(payload.chronology).toEqual([]);
    expect(payload.openItems).toEqual([]);
    expect(payload.gaps).toEqual([]);
    expect(payload.canonical).toBe(true);
    expect(payload.status).toBe('empty');
  });

  it('carries no scope version or issue time that could be compared', () => {
    const payload = canonicalEmpty(staff, 'TH-1', 'makassar-q4');
    expect(payload.scope.version).toBe(0);
    expect(payload.scope.issuedAt).toBe(payload.createdAt);
  });
});
