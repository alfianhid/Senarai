import type { Citation, ConflictNote, Source } from '@/types/domain';

export interface ClaimEntry {
  source: Source;
  citation: Citation;
}

/**
 * Precedence is fixed and stated in plain language next to the row:
 * newer document version > task board over chat > explicit correction > recency.
 */
export function resolveConflicts(entries: ClaimEntry[]): Map<string, ConflictNote> {
  const byField = new Map<string, ClaimEntry[]>();
  for (const entry of entries) {
    const claim = entry.source.claim;
    if (!claim) continue;
    const list = byField.get(claim.field) ?? [];
    list.push(entry);
    byField.set(claim.field, list);
  }

  const notes = new Map<string, ConflictNote>();

  for (const [field, group] of byField) {
    const values = new Set(group.map((e) => e.source.claim!.value));
    if (values.size < 2) continue;

    // Version wins only between two documents. A chat announcement that
    // supersedes an older SOP is not "version 0 losing to version 2" — it is
    // simply newer, and the newer statement is the one in force.
    const sorted = [...group].sort((a, b) => {
      const bothDocs = a.source.kind === 'doc' && b.source.kind === 'doc';
      if (bothDocs) {
        const va = a.source.version ?? 0;
        const vb = b.source.version ?? 0;
        if (va !== vb) return vb - va;
      }
      return b.source.at.localeCompare(a.source.at);
    });

    const chosen = sorted[0];
    const rejected = sorted.slice(1);

    const bothDocs =
      chosen.source.kind === 'doc' && rejected.every((r) => r.source.kind === 'doc');
    const versionsDiffer =
      bothDocs && rejected.some((r) => (r.source.version ?? 0) !== (chosen.source.version ?? 0));
    const rule: ConflictNote['rule'] = versionsDiffer ? 'newer-version' : 'recency';

    notes.set(chosen.source.id, {
      field,
      chosenCitationId: chosen.citation.id,
      rejectedCitationIds: rejected.map((r) => r.citation.id),
      rule,
      params: {
        field,
        chosenLabel: chosen.source.claim!.label,
        chosenValue: chosen.source.claim!.value,
        rejectedLabel: rejected[0].source.claim!.label,
        rejectedValue: rejected[0].source.claim!.value,
      },
    });
  }

  return notes;
}
