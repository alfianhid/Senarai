import type { Actor, Knower, Source } from '@/types/domain';
import type { GapDraft } from '@/lib/gaps/detect';
import { getActor, getRole } from '@/lib/data';

/**
 * A knower is only ever a participant of a source the asker can already read.
 * No directory lookup, no guess. If the visible record yields nobody, the gap
 * card omits the field entirely — naming someone from outside the asker's scope
 * would itself disclose that a hidden conversation took place.
 */
export function findKnower(
  gap: GapDraft,
  visibleSources: Source[],
  askerId: string,
): Knower | undefined {
  const anchors = visibleSources.filter((s) => gap.anchorSourceIds.includes(s.id));
  if (anchors.length === 0) return undefined;

  const candidates: Array<{ personId: string; name: string; sourceId: string }> = [];
  for (const source of anchors) {
    for (const id of source.participantIds) {
      if (id === askerId) continue;
      const actor: Actor | undefined = getActor(id);
      if (!actor) continue;
      if (!candidates.some((c) => c.personId === id)) {
        candidates.push({ personId: id, name: actor.name, sourceId: source.id });
      }
    }
  }

  if (candidates.length === 0) return undefined;

  const rank = (id: string) => {
    const actor = getActor(id);
    const role = actor ? getRole(actor.roleId) : undefined;
    return role?.id === 'manager' ? 0 : role?.id === 'admin' ? 1 : 2;
  };

  candidates.sort((a, b) => rank(a.personId) - rank(b.personId));
  const chosen = candidates[0];

  return {
    personId: chosen.personId,
    name: chosen.name,
    basis: 'participant',
    sourceId: chosen.sourceId,
  };
}
