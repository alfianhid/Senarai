import type { ChronologyEvent, OpenItem, Source } from '@/types/domain';
import { formatDate } from '@/lib/ui/format';

export interface GapDraft {
  rule: 'no-cause' | 'ownerless-blocked-item' | 'silent-interval';
  whatIsMissing: string;
  whatIsMissingEn: string;
  whyItMatters: string;
  whyItMattersEn: string;
  anchorSourceIds: string[];
  anchorItemId?: string;
}

const SILENT_INTERVAL_DAYS = 5;
/** Beyond this the gap is just sparse history, not silence inside a running
 *  project. Without the ceiling, a project with two sources a year apart
 *  reports a year-long "gap" and the hero section becomes noise. */
const MAX_SILENT_INTERVAL_DAYS = 90;

const CAUSAL = /\b(kenapa|mengapa|why|penyebab|sebab|kok|how come)\b/i;
const STORY = /\b(terbuka|masih|open|outstanding|timeline|riwayat|history|apa yang terjadi|what happened|status)\b/i;

export function isCausal(question: string): boolean {
  return CAUSAL.test(question);
}

/** A silence matters when someone is reconstructing a story. It is noise in a
 *  policy lookup ("what is the fuel allowance?") where two documents are simply
 *  months apart, so it only runs for story questions. */
function asksAboutStory(question: string): boolean {
  return CAUSAL.test(question) || STORY.test(question);
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Gap detection runs in code, on visible sources only. It never consults hidden
 * data, so a gap can never imply that hidden information exists.
 */
export function detectGaps(input: {
  question: string;
  chronology: ChronologyEvent[];
  openItems: OpenItem[];
  visibleSources: Source[];
}): GapDraft[] {
  const { question, chronology, openItems, visibleSources } = input;
  const gaps: GapDraft[] = [];

  const unrecorded = visibleSources.filter((s) => s.unrecordedDecision);
  const explained = visibleSources.some((s) => s.explainsDecision);
  if (isCausal(question) && unrecorded.length > 0 && !explained) {
    const anchor = unrecorded[0];
    gaps.push({
      rule: 'no-cause',
      whatIsMissing: anchor.unrecordedDecision!,
      whatIsMissingEn: anchor.unrecordedDecisionEn ?? anchor.unrecordedDecision!,
      whyItMatters:
        'Tanpa catatan persetujuan, keputusan ini tidak bisa ditelusuri dan tidak ada dasar untuk mempertanyakannya kemudian.',
      whyItMattersEn:
        'Without a record of the approval, the decision cannot be traced and there is no basis to challenge it later.',
      anchorSourceIds: [anchor.id],
    });
  }

  for (const item of openItems) {
    if (item.status === 'blocked' && (!item.ownerId || !item.due)) {
      gaps.push({
        rule: 'ownerless-blocked-item',
        whatIsMissing: `PIC untuk tugas "${item.title}"`,
        whatIsMissingEn: `An owner for the task "${item.title}"`,
        whyItMatters:
          'Tugas yang terhambat dan tanpa penanggung jawab biasanya berhenti bergerak tanpa ada yang menyadarinya.',
        whyItMattersEn:
          'A blocked task with no owner usually stops moving without anyone noticing.',
        anchorSourceIds: [item.citation.sourceId],
        anchorItemId: item.id,
      });
    }
  }

  for (let i = 1; i < chronology.length; i += 1) {
    if (!asksAboutStory(question)) break;
    const prev = new Date(chronology[i - 1].at).getTime();
    const next = new Date(chronology[i].at).getTime();
    const days = Math.round((next - prev) / DAY);
    if (days < SILENT_INTERVAL_DAYS || days > MAX_SILENT_INTERVAL_DAYS) continue;

    const from = chronology[i - 1].at;
    const to = chronology[i].at;
    const inside = visibleSources.filter((s) => {
      const t = new Date(s.at).getTime();
      return t > prev && t < next;
    });
    gaps.push({
      rule: 'silent-interval',
      whatIsMissing: `periode ${formatDate(from, 'id')} – ${formatDate(to, 'id')}`,
      whatIsMissingEn: `the period ${formatDate(from, 'en')} – ${formatDate(to, 'en')}`,
      whyItMatters: `${days} hari tanpa satu pun catatan, tepat pada periode ketika pekerjaan seharusnya berjalan.`,
      whyItMattersEn: `${days} days with no record at all, in a period when the work should have been moving.`,
      anchorSourceIds: [chronology[i - 1].citations[0]?.sourceId, chronology[i].citations[0]?.sourceId]
        .concat(inside.map((s) => s.id))
        .filter(Boolean) as string[],
    });
  }

  return gaps;
}
