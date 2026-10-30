import { notFound } from 'next/navigation';
import { getActor, getProject } from '@/lib/data';
import { readSession } from '@/lib/session';
import { getThread } from '@/lib/store/session';
import { getLiveSource } from '@/lib/store/sources';
import { buildSnapshot } from '@/lib/access/scope';
import { canonicalEmpty } from '@/lib/answer/canonicalEmpty';
import { AnswerView, type SourceMeta } from '@/components/answer/AnswerView';

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const session = await readSession();
  const thread = getThread(threadId);
  if (!thread) notFound();

  // A thread belongs to the actor who asked. Handing it to a different actor
  // would be a scope violation through the back door, so it renders as empty.
  const payload =
    thread.payload.scope.actorId === session.actorId
      ? thread.payload
      : canonicalEmpty(buildSnapshot(session.actorId, session.projectId), threadId, session.projectId);

  const sourceMeta: Record<string, SourceMeta> = {};
  const remember = (sourceId: string) => {
    const source = getLiveSource(sourceId);
    if (!source) return;
    sourceMeta[source.id] = {
      id: source.id,
      kind: source.kind,
      title: source.title,
      authorName: source.authorName,
      at: source.at,
      locator: source.locator ?? '',
      version: source.version,
    };
  };

  for (const event of payload.chronology) {
    for (const c of event.citations) remember(c.sourceId);
  }
  for (const item of payload.openItems) remember(item.citation.sourceId);

  // Constant project metadata, identical for every question in the project, so
  // showing it on the empty screen discloses nothing about the question.
  const project = getProject(payload.projectId);
  const owner = project?.ownerId ? getActor(project.ownerId) : undefined;

  return (
    <AnswerView
      payload={payload}
      locale={session.locale}
      sourceMeta={sourceMeta}
      ownerName={owner?.name}
      ownerChannel={project?.ownerChannel}
    />
  );
}
