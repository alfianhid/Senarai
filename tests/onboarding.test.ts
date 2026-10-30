import { describe, expect, it } from 'vitest';
import { composeAnswer } from '@/lib/answer/compose';
import { buildSnapshot } from '@/lib/access/scope';
import { sources } from '@/lib/data';

function ask(actorId: string, projectId: string, question: string) {
  return composeAnswer({
    threadId: 'TH-O',
    question,
    locale: 'id',
    projectId,
    snapshot: buildSnapshot(actorId, projectId),
    allSources: sources,
  });
}

/**
 * The onboarding scenario exists for one reason: the 90-second surprise test
 * must be answerable from a second, independent story, and the handbook's
 * Example Test 2 must be reproducible exactly as written.
 */
describe('onboarding scenario', () => {
  it('passes handbook Example Test 2: SOP Rp500.000 vs chat Rp750.000', () => {
    const answer = ask('A1', 'onboarding-2026', 'Berapa tunjangan bahan bakar per bulan?');
    expect(answer.canonical).toBe(false);

    // Returns the newer figure.
    expect(answer.lead!.textId).toMatch(/Rp750\.000/);
    // Cites both sources.
    expect(answer.lead!.citations).toHaveLength(2);
    // Says the SOP is the older one, so it is not the one used.
    expect(answer.lead!.textId).toMatch(/SOP v2.*Rp500\.000.*lebih lama/i);

    const conflict = answer.chronology.find((e) => e.conflict)?.conflict;
    expect(conflict).toBeDefined();
    expect(conflict!.rule).toBe('recency');
    expect(conflict!.params?.chosenValue).toBe('Rp750.000 per bulan');
    expect(conflict!.params?.rejectedValue).toBe('Rp500.000 per bulan');
  });

  it('answers a leave question from the policy document', () => {
    const answer = ask('A1', 'onboarding-2026', 'Berapa hari cuti tahunan?');
    expect(answer.lead!.textId).toMatch(/12 hari/);
  });

  it('answers an approval-authority question from the matrix', () => {
    const answer = ask('A1', 'onboarding-2026', 'Siapa yang menyetujui pembelian di atas Rp10 juta?');
    expect(answer.canonical).toBe(false);
    expect(answer.lead!.textId).toMatch(/direktur/i);
  });

  it('shows a manager the Q4 budget and a staff member no record', () => {
    const asStaff = ask('A1', 'onboarding-2026', 'Berapa anggaran onboarding Q4?');
    const asManager = ask('A2', 'onboarding-2026', 'Berapa anggaran onboarding Q4?');

    expect(asStaff.canonical).toBe(true);
    expect(asManager.canonical).toBe(false);
    expect(asManager.lead!.textId).toMatch(/Rp120\.000\.000/);
  });

  it('reports the ownerless blocked task as a gap, without naming hidden data', () => {
    const answer = ask('A1', 'onboarding-2026', 'Apa yang masih terbuka?');
    const rules = answer.gaps.map((g) => g.rule);
    expect(rules).toContain('ownerless-blocked-item');
    expect(answer.gaps.every((g) => !/restricted|hidden|locked/i.test(g.whatIsMissing))).toBe(true);
  });

  it('ignores the instruction embedded in the onboarding guide', () => {
    const answer = ask('A1', 'onboarding-2026', 'Di mana saya ambil laptop?');
    expect(answer.notices.some((n) => n.kind === 'injection')).toBe(true);
  });

  it('never answers a question whose subject is outside the asker\'s record', () => {
    const answer = ask('A1', 'onboarding-2026', 'Berapa nilai akuisisi lahan Cikarang?');
    expect(answer.canonical).toBe(true);
  });
});

describe('gap coverage (T15–T16)', () => {
  it('renders a gap with no visible knower, without inventing a name', () => {
    const answer = ask('A1', 'onboarding-2026', 'Apa yang masih terbuka?');
    const ownerless = answer.gaps.filter((g) => g.rule === 'ownerless-blocked-item');
    expect(ownerless.length).toBeGreaterThan(0);
    // The blocked template task is authored by the asker and lists only the
    // asker, so the visible record yields nobody to ask.
    const noKnower = ownerless.find((g) => !g.knower);
    expect(noKnower).toBeDefined();
    expect(noKnower!.approval).toBeUndefined();
  });

  it('states an absence instead of inventing a gap when the record is complete', () => {
    const answer = ask('A1', 'onboarding-2026', 'Berapa hari cuti tahunan?');
    expect(answer.gaps).toHaveLength(0);
  });
});
