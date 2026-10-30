import type { Citation, ScopeSnapshot, Source } from '@/types/domain';
import { canRead } from '@/lib/access/canRead';
import { maskPII } from '@/lib/mask/pii';

const MAX_QUOTE = 260;

export function toCitation(
  source: Source,
  marker: number,
  snapshot: ScopeSnapshot,
): Citation | null {
  if (!canRead(snapshot, source)) {
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(`toCitation: ${source.id} is outside the asker's scope`);
    }
    return null;
  }

  const body = maskPII(source.body);
  const quote = body.length > MAX_QUOTE ? `${body.slice(0, MAX_QUOTE).trimEnd()}…` : body;

  return {
    id: `C${marker}`,
    marker,
    sourceId: source.id,
    quote,
    locator: source.locator ?? source.title,
  };
}
