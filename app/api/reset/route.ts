import { NextResponse } from 'next/server';
import { auditSeed } from '@/lib/data';
import { store } from '@/lib/store/session';

/**
 * Demo-only: clears threads, revocations and audit entries so a rehearsal or a
 * live demo starts from the seeded state.
 *
 * Off in production by default. A demo host turns it on explicitly with
 * SENARAI_ALLOW_RESET=1, so a deployed instance is not resettable by a stranger
 * unless the operator asked for that. Restarting the process has the same
 * effect, because every store is in memory.
 */
export async function POST() {
  const allowed = process.env.NODE_ENV !== 'production' || process.env.SENARAI_ALLOW_RESET === '1';
  if (!allowed) {
    return NextResponse.json({ error: 'not available' }, { status: 404 });
  }

  store.threads.clear();
  store.approvals.clear();
  store.revocations.clear();
  store.ingested.length = 0;
  store.askCounts.clear();
  store.dataVersion = 1;
  store.auditLog = [...auditSeed];
  store.scopeVersion = 5;

  return NextResponse.json({ ok: true });
}
