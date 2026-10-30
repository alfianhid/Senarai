import { NextResponse } from 'next/server';
import { handleScope } from '@/lib/api/handlers';
import { readSession } from '@/lib/session';

export async function POST(request: Request) {
  const session = await readSession();
  const body = (await request.json()) as {
    token?: string;
    granted?: boolean;
  };

  if (!body.token || typeof body.granted !== 'boolean') {
    return NextResponse.json({ error: 'token and granted are required' }, { status: 400 });
  }

  const result = handleScope({
    actorId: session.actorId,
    projectId: session.projectId,
    token: body.token,
    granted: body.granted,
  });

  if (!result.ok) {
    return NextResponse.json({ error: 'scope can be narrowed, never widened' }, { status: 403 });
  }

  return NextResponse.json(result);
}
