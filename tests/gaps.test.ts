import { describe, expect, it } from 'vitest';
import type { ChronologyEvent, Citation, OpenItem, Source } from '@/types/domain';
import { detectGaps, isCausal } from '@/lib/gaps/detect';

const citation = (sourceId: string): Citation => ({
  id: `C-${sourceId}`,
  marker: 1,
  sourceId,
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

const event = (id: string, at: string): ChronologyEvent => ({
  id,
  at,
  title: `Event ${id}`,
  citations: [citation(`S-${id}`)],
});

const item = (over: Partial<OpenItem> = {}): OpenItem => ({
  id: 'T1',
  title: 'Konfirmasi vendor pengganti',
  status: 'open',
  citation: citation('S9'),
  ...over,
});

describe('gap detection (T13–T16)', () => {
  it('recognises a causal question', () => {
    expect(isCausal('Kenapa stok telat di Makassar?')).toBe(true);
    expect(isCausal('Why was the stock late?')).toBe(true);
    expect(isCausal('Apa isi PO-2291?')).toBe(false);
  });

  it('raises no-cause only when the question is causal and nothing explains the decision', () => {
    const unrecorded = source({ id: 'S8', unrecordedDecision: 'persetujuan perubahan jumlah PO' });

    const causal = detectGaps({
      question: 'Kenapa jumlah PO berubah?',
      chronology: [event('E1', '2026-10-10T09:00:00+07:00')],
      openItems: [],
      visibleSources: [unrecorded],
    });
    expect(causal.map((g) => g.rule)).toContain('no-cause');

    const explained = detectGaps({
      question: 'Kenapa jumlah PO berubah?',
      chronology: [event('E1', '2026-10-10T09:00:00+07:00')],
      openItems: [],
      visibleSources: [unrecorded, source({ id: 'S9', explainsDecision: true })],
    });
    expect(explained.map((g) => g.rule)).not.toContain('no-cause');
  });

  it('raises ownerless-blocked-item when a blocked task has no owner or no due date', () => {
    const gaps = detectGaps({
      question: 'Apa yang masih terbuka?',
      chronology: [event('E1', '2026-10-10T09:00:00+07:00')],
      openItems: [item({ status: 'blocked' })],
      visibleSources: [],
    });
    expect(gaps.map((g) => g.rule)).toContain('ownerless-blocked-item');
  });

  it('does not raise a gap for a blocked task that has both owner and due date', () => {
    const gaps = detectGaps({
      question: 'Apa yang masih terbuka?',
      chronology: [event('E1', '2026-10-10T09:00:00+07:00')],
      openItems: [item({ status: 'blocked', ownerId: 'A1', due: '2026-10-20' })],
      visibleSources: [],
    });
    expect(gaps.map((g) => g.rule)).not.toContain('ownerless-blocked-item');
  });

  it('raises silent-interval at five days or more, and not below it', () => {
    const sixDays = detectGaps({
      question: 'Apa yang masih terbuka?',
      chronology: [event('E1', '2026-10-18T09:00:00+07:00'), event('E2', '2026-10-24T09:00:00+07:00')],
      openItems: [],
      visibleSources: [],
    });
    expect(sixDays.map((g) => g.rule)).toContain('silent-interval');

    const twoDays = detectGaps({
      question: 'Apa yang masih terbuka?',
      chronology: [event('E1', '2026-10-18T09:00:00+07:00'), event('E2', '2026-10-20T09:00:00+07:00')],
      openItems: [],
      visibleSources: [],
    });
    expect(twoDays.map((g) => g.rule)).not.toContain('silent-interval');
  });

  it('never derives a gap from data it was not given', () => {
    const gaps = detectGaps({
      question: 'Kenapa stok telat?',
      chronology: [event('E1', '2026-10-18T09:00:00+07:00'), event('E2', '2026-10-24T09:00:00+07:00')],
      openItems: [],
      visibleSources: [],
    });
    // A silent interval is stated, but nothing names a hidden cause or person.
    expect(gaps.every((g) => !/restricted|hidden|locked/i.test(g.whatIsMissing))).toBe(true);
  });
});
