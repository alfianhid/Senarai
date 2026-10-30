import type { Knower, Locale } from '@/types/domain';
import type { GapDraft } from '@/lib/gaps/detect';

/**
 * Templated, not model-generated. One template per rule, so the draft cannot
 * invent a fact the record does not contain.
 */
export function draftQuestion(gap: GapDraft, knower?: Knower, lang: Locale = 'id'): string {
  const name = knower?.name ?? '';

  if (lang === 'en') {
    const greeting = name ? `Hi ${name.split(' ')[0]}, ` : 'Hi, ';
    switch (gap.rule) {
      case 'no-cause':
        return `${greeting}I could not find any written record of ${gap.whatIsMissingEn}. Do you know who approved it, and on what basis?`;
      case 'ownerless-blocked-item':
        return `${greeting}${gap.whatIsMissingEn} has not been assigned and the task is blocked. Who should be handling it?`;
      case 'silent-interval':
        return `${greeting}there is no record at all for ${gap.whatIsMissingEn}. Do you remember what happened in that period?`;
    }
  }

  const greeting = name ? `Halo ${name.split(' ')[0]}, ` : 'Halo, ';
  switch (gap.rule) {
    case 'no-cause':
      return `${greeting}saya tidak menemukan catatan tertulis soal ${gap.whatIsMissing}. Apakah Anda tahu siapa yang menyetujui dan atas dasar apa?`;
    case 'ownerless-blocked-item':
      return `${greeting}${gap.whatIsMissing} belum ditunjuk dan tugasnya berstatus terhambat. Siapa yang seharusnya menangani ini?`;
    case 'silent-interval':
      return `${greeting}tidak ada catatan sama sekali untuk ${gap.whatIsMissing}. Apakah Anda ingat apa yang terjadi pada periode itu?`;
  }
}
