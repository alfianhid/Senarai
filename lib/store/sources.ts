import type { Source } from '@/types/domain';
import { sources } from '@/lib/data';
import { store } from '@/lib/store/session';

/**
 * The dataset as it stands right now: the authored seed plus anything ingested
 * during this session. Every read goes through here, so a message that arrives
 * mid-demo is visible to the very next answer without a restart.
 */
export function liveSources(): Source[] {
  return store.ingested.length === 0 ? sources : [...sources, ...store.ingested];
}

export function getLiveSource(id: string): Source | undefined {
  return liveSources().find((s) => s.id === id);
}

export function ingestSource(source: Source): void {
  store.ingested.push(source);
  store.dataVersion += 1;
}

export function dataVersion(): number {
  return store.dataVersion;
}

/**
 * A question asked again after new data arrived is a new version of the same
 * answer, not a new answer. The count is per actor, project and exact question.
 */
export function nextAnswerVersion(actorId: string, projectId: string, question: string): number {
  const key = `${actorId}:${projectId}:${question.trim().toLowerCase()}`;
  const next = (store.askCounts.get(key) ?? 0) + 1;
  store.askCounts.set(key, next);
  return next;
}
