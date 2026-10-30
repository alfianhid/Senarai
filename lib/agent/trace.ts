import type { AgentStep, AgentTool, Verification } from '@/types/domain';

/**
 * The agent's own record of what it did, in order, with timings.
 *
 * This is a real trace, not a decorative animation: each step wraps the
 * function that actually ran, and the durations are measured. It exists so a
 * judge can see the difference between "one prompt" and "a plan with tool
 * calls and a self-check" without reading the source.
 *
 * It is attached only to answered payloads. The canonical empty carries no
 * trace, because a trace present for one cause and absent for another would
 * itself be a signal.
 */
export class Trace {
  private readonly steps: AgentStep[] = [];
  private readonly startedAt = Date.now();
  private last = this.startedAt;

  add(
    tool: AgentTool,
    labelId: string,
    labelEn: string,
    detailId: string,
    detailEn: string,
    status: AgentStep['status'] = 'ok',
  ): void {
    const now = Date.now();
    this.steps.push({
      id: `ST${this.steps.length + 1}`,
      tool,
      labelId,
      labelEn,
      detailId,
      detailEn,
      status,
      ms: Math.max(0, now - this.last),
    });
    this.last = now;
  }

  finish(claims: number, cited: number): { steps: AgentStep[]; verification: Verification } {
    const passed = claims > 0 && cited === claims;
    this.add(
      'verify',
      'Verifikasi mandiri',
      'Self-check',
      passed
        ? `${cited} dari ${claims} klaim punya sitasi. Tidak ada kalimat tanpa sumber.`
        : `${cited} dari ${claims} klaim punya sitasi. Jawaban ditandai tidak lengkap.`,
      passed
        ? `${cited} of ${claims} claims carry a citation. No sentence is unsourced.`
        : `${cited} of ${claims} claims carry a citation. The answer is flagged incomplete.`,
      passed ? 'ok' : 'flagged',
    );

    return {
      steps: this.steps,
      verification: {
        claims,
        cited,
        passed,
        noteId: passed
          ? 'Setiap klaim dalam jawaban ini punya sumber.'
          : 'Sebagian klaim tidak punya sumber dan ditandai.',
        noteEn: passed
          ? 'Every claim in this answer has a source.'
          : 'Some claims have no source and are flagged.',
      },
    };
  }

  get elapsed(): number {
    return Date.now() - this.startedAt;
  }
}
