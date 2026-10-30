import { NextResponse } from 'next/server';
import { getThread } from '@/lib/store/session';
import { readSession } from '@/lib/session';
import { buildSnapshot } from '@/lib/access/scope';
import { canonicalEmpty } from '@/lib/answer/canonicalEmpty';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params;
  const session = await readSession();
  const thread = getThread(threadId);

  if (!thread) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (thread.payload.scope.actorId !== session.actorId) {
    return NextResponse.json(
      canonicalEmpty(buildSnapshot(session.actorId, session.projectId), threadId, session.projectId),
    );
  }

  return NextResponse.json(thread.payload);
}
