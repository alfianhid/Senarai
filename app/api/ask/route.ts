import { NextResponse } from 'next/server';
import { handleAsk } from '@/lib/api/handlers';
import { readSession } from '@/lib/session';

export async function POST(request: Request) {
  const session = await readSession();
  const body = (await request.json()) as { question?: string };

  const question = (body.question ?? '').trim();
  if (!question) {
    return NextResponse.json({ error: 'question required' }, { status: 400 });
  }

  const result = await handleAsk({
    question,
    projectId: session.projectId,
    actorId: session.actorId,
    locale: session.locale,
  });

  return NextResponse.json({ threadId: result.threadId });
}
