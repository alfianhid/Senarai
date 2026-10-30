import { NextResponse } from 'next/server';
import { handleIngest, type IngestRequest } from '@/lib/api/handlers';
import { readSession } from '@/lib/session';

/**
 * Demo endpoint: a new message arrives from the outside world, and the next
 * answer to the same question has to include it.
 */
export async function POST(request: Request) {
  const session = await readSession();
  const body = (await request.json()) as Partial<IngestRequest>;

  const result = handleIngest({
    projectId: session.projectId,
    kind: body.kind ?? 'chat',
    title: body.title ?? '',
    titleEn: body.titleEn,
    body: body.body ?? '',
    detailId: body.detailId,
    detailEn: body.detailEn,
    topicTags: body.topicTags ?? [],
    authorId: body.authorId ?? session.actorId,
    actorId: session.actorId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: 'ingest rejected' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, sourceId: result.sourceId });
}
