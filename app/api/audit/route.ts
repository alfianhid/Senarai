import { NextResponse } from 'next/server';
import { handleAudit } from '@/lib/api/handlers';
import { readSession } from '@/lib/session';

// Every question, the scope snapshot it ran under, the sources it retrieved and
// the decision it produced. The log is scoped by the same access code as the
// answers: staff see their own entries, managers their projects, admins all.
export async function GET() {
  const session = await readSession();
  const entries = handleAudit(session.actorId, session.actor.roleId);
  return NextResponse.json(entries);
}
