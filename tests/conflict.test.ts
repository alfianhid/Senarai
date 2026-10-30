import { describe, expect, it } from 'vitest';
import type { Citation, Source } from '@/types/domain';
import { resolveConflicts } from '@/lib/conflict/resolve';

const citation = (id: string): Citation => ({
  id,
  marker: 1,
  sourceId: id,
  quote: 'quote',
  locator: 'locator',
});

const source = (over: Partial<Source> = {}): Source => ({
  id: 'S1',
  kind: 'doc',
  projectId: 'makassar-q4',
  topicTags: ['ops'],
  sensitivity: 'general',
  title: 'Source',
  authorId: 'A1',
  authorName: 'Rina Pratiwi',
  at: '2026-10-10T09:00:00+07:00',
  body: 'body',
  bodyLocale: 'id',
  participantIds: ['A1'],
  ...over,
});

describe('conflict resolution (T11–T12)', () => {
  it('prefers the newer document version and names the rule', () => {
    const older = source({
      id: 'S2',
      version: 2,
      at: '2026-10-06T09:00:00+07:00',
      claim: { field: 'penalty', value: 'Rp500.000', label: 'SOP v2' },
    });
    const newer = source({
      id: 'S10',
      version: 3,
      at: '2026-10-16T09:00:00+07:00',
      claim: { field: 'penalty', value: 'Rp750.000', label: 'PO rev.3' },
    });

    const notes = resolveConflicts([
      { source: older, citation: citation('C2') },
      { source: newer, citation: citation('C10') },
    ]);

    const note = notes.get('S10');
    expect(note).toBeDefined();
    expect(note?.rule).toBe('newer-version');
    expect(note?.params?.chosenValue).toBe('Rp750.000');
    expect(note?.rejectedCitationIds).toEqual(['C2']);
  });

  it('falls back to recency when both sources are the same version', () => {
    const older = source({
      id: 'S4',
      version: 1,
      at: '2026-10-09T09:00:00+07:00',
      claim: { field: 'eta', value: '13 Oktober', label: 'chat' },
    });
    const newer = source({
      id: 'S11',
      version: 1,
      at: '2026-10-18T09:00:00+07:00',
      claim: { field: 'eta', value: '18 Oktober', label: 'chat' },
    });

    const notes = resolveConflicts([
      { source: older, citation: citation('C4') },
      { source: newer, citation: citation('C11') },
    ]);

    expect(notes.get('S11')?.rule).toBe('recency');
  });

  it('says nothing when sources agree', () => {
    const a = source({ id: 'S1', claim: { field: 'qty', value: '20 ton', label: 'PO' } });
    const b = source({ id: 'S2', claim: { field: 'qty', value: '20 ton', label: 'SOP' } });
    const notes = resolveConflicts([
      { source: a, citation: citation('C1') },
      { source: b, citation: citation('C2') },
    ]);
    expect(notes.size).toBe(0);
  });

  it('keeps both conflicting sources in the note so neither is hidden', () => {
    const a = source({ id: 'S1', version: 1, claim: { field: 'qty', value: '25 ton', label: 'PO rev.2' } });
    const b = source({ id: 'S2', version: 2, claim: { field: 'qty', value: '20 ton', label: 'PO rev.3' } });
    const notes = resolveConflicts([
      { source: a, citation: citation('C1') },
      { source: b, citation: citation('C2') },
    ]);
    const note = notes.get('S2');
    expect(note?.rejectedCitationIds).toHaveLength(1);
    expect(note?.rule).not.toMatch(/%/);
  });
});
