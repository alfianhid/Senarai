import { NextResponse } from 'next/server';
import { handleApproval } from '@/lib/api/handlers';

export async function POST(request: Request) {
  const body = (await request.json()) as {
    threadId?: string;
    gapId?: string;
    action?: 'approve' | 'cancel';
  };

  if (!body.threadId || !body.gapId || !body.action) {
    return NextResponse.json({ error: 'threadId, gapId and action are required' }, { status: 400 });
  }

  const result = handleApproval({
    threadId: body.threadId,
    gapId: body.gapId,
    action: body.action,
  });

  if (!result.ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(result);
}
