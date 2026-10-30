import { cookies } from 'next/headers';
import type { Actor, Locale } from '@/types/domain';
import { actors, getActor, projects } from '@/lib/data';

export const ACTOR_COOKIE = 'senarai_actor';
export const LOCALE_COOKIE = 'senarai_locale';
export const PROJECT_COOKIE = 'senarai_project';

export const DEFAULT_ACTOR = 'A1';
export const DEFAULT_PROJECT = 'makassar-q4';

export interface Session {
  actor: Actor;
  actorId: string;
  locale: Locale;
  projectId: string;
}

export async function readSession(): Promise<Session> {
  const jar = await cookies();
  const actorId = jar.get(ACTOR_COOKIE)?.value ?? DEFAULT_ACTOR;
  const locale = (jar.get(LOCALE_COOKIE)?.value ?? 'id') as Locale;
  const actor = getActor(actorId) ?? actors[0];

  // A project the actor cannot see is never selected, so the switcher cannot
  // hand someone a workspace that silently answers nothing.
  const allowed =
    actor.roleId === 'admin' ? projects.map((p) => p.id) : actor.projectIds;
  const requested = jar.get(PROJECT_COOKIE)?.value ?? DEFAULT_PROJECT;
  const projectId = allowed.includes(requested) ? requested : allowed[0] ?? DEFAULT_PROJECT;

  return { actor, actorId: actor.id, locale, projectId };
}

export function projectsFor(actor: Actor) {
  return actor.roleId === 'admin'
    ? projects
    : projects.filter((p) => actor.projectIds.includes(p.id));
}
