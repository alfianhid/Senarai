import type { Source } from '@/types/domain';

const KIND_ORDER: Record<Source['kind'], number> = { doc: 0, task: 1, chat: 2 };

export function rank(sources: Source[]): Source[] {
  return [...sources].sort((a, b) => {
    if (a.at !== b.at) return b.at.localeCompare(a.at);
    return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  });
}

export function chrono(sources: Source[]): Source[] {
  return [...sources].sort((a, b) => a.at.localeCompare(b.at));
}
