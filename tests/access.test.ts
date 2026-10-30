import { describe, expect, it } from 'vitest';
import type { ScopeSnapshot, Source } from '@/types/domain';
import { canRead } from '@/lib/access/canRead';
import { buildSnapshot } from '@/lib/access/scope';

const source = (over: Partial<Source> = {}): Source => ({
  id: 'S1',
  kind: 'chat',
  projectId: 'makassar-q4',
  topicTags: ['ops'],
  sensitivity: 'general',
  title: 'Test source',
  authorId: 'A1',
  authorName: 'Rina Pratiwi',
  at: '2026-10-12T09:00:00+07:00',
  body: 'body',
  bodyLocale: 'id',
  participantIds: ['A1'],
  ...over,
});

const snapshot = (over: Partial<ScopeSnapshot> = {}): ScopeSnapshot => ({
  id: 'SCP-0',
  version: 0,
  actorId: 'A1',
  roleId: 'staff',
  projectIds: ['makassar-q4'],
  grants: [{ projectId: 'makassar-q4', tags: ['ops'], sensitivities: ['general'] }],
  issuedAt: '2026-10-29T00:00:00+07:00',
  ...over,
});

describe('canRead', () => {
  it('allows a source inside project, tag and sensitivity', () => {
    expect(canRead(snapshot(), source())).toBe(true);
  });

  it('refuses a project the actor is not assigned to', () => {
    expect(canRead(snapshot(), source({ projectId: 'proyek-kenari' }))).toBe(false);
  });

  it('refuses a topic tag the role does not carry', () => {
    expect(canRead(snapshot(), source({ topicTags: ['vendor.contract'] }))).toBe(false);
  });

  it('refuses a management source for a staff role', () => {
    expect(canRead(snapshot(), source({ sensitivity: 'management' }))).toBe(false);
  });

  it('treats a wildcard tag grant as every tag', () => {
    const wide = snapshot({
      grants: [{ projectId: 'makassar-q4', tags: '*', sensitivities: ['general', 'management'] }],
    });
    expect(canRead(wide, source({ topicTags: ['anything'], sensitivity: 'management' }))).toBe(true);
  });

  it('refuses everything when no grant exists for the project', () => {
    expect(canRead(snapshot({ grants: [] }), source())).toBe(false);
  });

  it('reflects a revocation on the next snapshot', () => {
    const before = buildSnapshot('A1', 'makassar-q4');
    expect(before.grants[0].tags).toContain('ops');

    const narrowed = snapshot({
      grants: [{ projectId: 'makassar-q4', tags: ['customer'], sensitivities: ['general'] }],
    });
    expect(canRead(narrowed, source())).toBe(false);
  });
});
