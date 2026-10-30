import type { Actor, ScopeGrant, ScopeSnapshot } from '@/types/domain';
import { getActor, getRole, projects } from '@/lib/data';
import { isRevoked, store } from '@/lib/store/session';

export const SENSITIVITY_TOKEN = (s: string) => `sensitivity:${s}`;

export function buildSnapshot(actorId: string, projectId: string): ScopeSnapshot {
  const actor = getActor(actorId);
  const role = actor ? getRole(actor.roleId) : undefined;
  const issuedAt = new Date().toISOString();

  if (!actor || !role) {
    return {
      id: `SCP-${store.scopeVersion}`,
      version: store.scopeVersion,
      actorId,
      roleId: 'staff',
      projectIds: [],
      grants: [],
      issuedAt,
    };
  }

  const visibleProjects = role.id === 'admin' ? projects.map((p) => p.id) : actor.projectIds;

  const grants: ScopeGrant[] = visibleProjects.map((pid) => {
    const tags =
      role.tags === '*'
        ? ('*' as const)
        : role.tags.filter((t) => !isRevoked(actor.id, pid, t));
    const sensitivities = role.sensitivities.filter(
      (s) => !isRevoked(actor.id, pid, SENSITIVITY_TOKEN(s)),
    );
    return { projectId: pid, tags, sensitivities };
  });

  return {
    id: `SCP-${store.scopeVersion}`,
    version: store.scopeVersion,
    actorId: actor.id,
    roleId: role.id,
    projectIds: visibleProjects,
    grants,
    issuedAt,
  };
}

export function visibleTagCount(actorId: string, projectId: string): { visible: number; total: number } {
  const snapshot = buildSnapshot(actorId, projectId);
  const grant = snapshot.grants.find((g) => g.projectId === projectId);
  if (!grant) return { visible: 0, total: 0 };
  if (grant.tags === '*') return { visible: 1, total: 1 };
  return { visible: grant.tags.length, total: grant.tags.length };
}
