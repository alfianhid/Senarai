import { describe, expect, it } from 'vitest';
import { composeAnswer } from '@/lib/answer/compose';
import { buildSnapshot } from '@/lib/access/scope';
import { sources } from '@/lib/data';
import { detectAnswerLanguage } from '@/lib/answer/narrative';

function ask(actorId: string, projectId: string, question: string) {
  return composeAnswer({
    threadId: 'TH-N',
    question,
    locale: 'id',
    projectId,
    snapshot: buildSnapshot(actorId, projectId),
    allSources: sources,
  });
}

describe('lead answer (the answer actually answers)', () => {
  it('answers a causal question with a cause, not a list of titles', () => {
    const answer = ask('A1', 'makassar-q4', 'Kenapa stok telat di Makassar?');
    expect(answer.canonical).toBe(false);
    expect(answer.lead).toBeDefined();
    // The cause the record supports, in prose.
    expect(answer.lead!.textId).toMatch(/Truk ditahan/i);
    expect(answer.lead!.textId.length).toBeGreaterThan(80);
  });

  it('gives every lead clause a marker that resolves to a citation in the answer', () => {
    const answer = ask('A1', 'makassar-q4', 'Kenapa stok telat di Makassar?');
    const markers = new Set<number>([
      ...answer.chronology.flatMap((e) => e.citations.map((c) => c.marker)),
      ...answer.openItems.map((i) => i.citation.marker),
    ]);

    for (const marker of answer.lead!.citations) {
      expect(markers.has(marker)).toBe(true);
    }
    // Every inline [n] in the sentence is one of the declared citations.
    const inline = [...answer.lead!.textId.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
    expect(inline.length).toBeGreaterThan(0);
    for (const marker of inline) expect(answer.lead!.citations).toContain(marker);
  });

  it('explains each row instead of only naming the document', () => {
    const answer = ask('A1', 'makassar-q4', 'Kenapa stok telat di Makassar?');
    const withDetail = answer.chronology.filter((e) => (e.detail ?? '').length > 20);
    expect(withDetail.length).toBe(answer.chronology.length);
  });

  it('answers a fact question with one clause and no unrelated rows', () => {
    const answer = ask('A1', 'onboarding-2026', 'Berapa hari cuti tahunan?');
    expect(answer.canonical).toBe(false);
    expect(answer.lead!.textId).toMatch(/12 hari/);
    // One fact, one source row.
    expect(answer.chronology).toHaveLength(1);
  });
});

describe('answer language follows the question', () => {
  it('detects English and Indonesian', () => {
    expect(detectAnswerLanguage('Why was the stock late?')).toBe('en');
    expect(detectAnswerLanguage('Kenapa stok telat?')).toBe('id');
    expect(detectAnswerLanguage('Where do I collect my laptop?')).toBe('en');
  });

  it('answers an English question in English under Indonesian chrome', () => {
    const answer = ask('A1', 'onboarding-2026', 'Where do I collect my laptop?');
    expect(answer.answerLanguage).toBe('en');
    expect(answer.lead!.textEn).toMatch(/IT desk/);
    expect(answer.chronology[0].title).toMatch(/Onboarding Guide|collect the laptop/);
  });

  it('does not leak the answer language into the canonical empty', () => {
    const empty = ask('A1', 'makassar-q4', 'How much is the Anugrah penalty?');
    expect(empty.canonical).toBe(true);
    expect(empty.answerLanguage).toBe('id');
  });
});
