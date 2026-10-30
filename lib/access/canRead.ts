import type { ScopeSnapshot, Source } from '@/types/domain';

/**
 * The single gate the whole product hangs on.
 *
 * Called twice per answer: once in search(), before ranking, so a filtered-out
 * source never reaches the composer; and once in toCitation(), as defence in
 * depth. Pure, synchronous, no I/O — so it can be tested and reasoned about
 * without a running system.
 */
export function canRead(snapshot: ScopeSnapshot, source: Source): boolean {
  if (!snapshot.projectIds.includes(source.projectId)) return false;

  const grant = snapshot.grants.find((g) => g.projectId === source.projectId);
  if (!grant) return false;

  if (grant.tags !== '*') {
    const hasTag = source.topicTags.some((t) => grant.tags.includes(t));
    if (!hasTag) return false;
  }

  if (!grant.sensitivities.includes(source.sensitivity)) return false;

  return true;
}
