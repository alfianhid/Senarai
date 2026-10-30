import projectsJson from '@/data/projects.json';
import sourcesJson from '@/data/sources.json';
import rolesJson from '@/data/roles.json';
import actorsJson from '@/data/actors.json';
import auditSeedJson from '@/data/audit.seed.json';
import type { Actor, AuditEntry, Project, Role, Source } from '@/types/domain';

export const projects = projectsJson as Project[];
export const sources = sourcesJson as Source[];
export const roles = rolesJson as Role[];
export const actors = actorsJson as Actor[];
export const auditSeed = auditSeedJson as AuditEntry[];

export function getProject(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

export function getActor(id: string): Actor | undefined {
  return actors.find((a) => a.id === id);
}

export function getRole(id: string): Role | undefined {
  return roles.find((r) => r.id === id);
}

export function getSource(id: string): Source | undefined {
  return sources.find((s) => s.id === id);
}

export function sourcesForProject(projectId: string): Source[] {
  return sources.filter((s) => s.projectId === projectId);
}
