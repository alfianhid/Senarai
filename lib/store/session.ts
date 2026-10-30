import type { AnswerPayload, AuditEntry, RecordGap, ScopeSnapshot, Source, ThreadSummary } from '@/types/domain';
import { auditSeed } from '@/lib/data';

export interface StoredThread {
  payload: AnswerPayload;
  question: string;
  at: string;
}

interface SessionState {
  scopeVersion: number;
  revocations: Set<string>;
  auditLog: AuditEntry[];
  threads: Map<string, StoredThread>;
  approvals: Map<string, RecordGap['approval']>;
  /** Sources that arrived during the demo. Kept beside the seed dataset rather
   *  than inside it, so a restart restores the authored story exactly. */
  ingested: Source[];
  dataVersion: number;
  askCounts: Map<string, number>;
}

const globalForSenarai = globalThis as unknown as { senaraiStore?: SessionState };

export const store: SessionState =
  globalForSenarai.senaraiStore ?? {
    scopeVersion: 5,
    revocations: new Set<string>(),
    auditLog: [...auditSeed],
    threads: new Map<string, StoredThread>(),
    approvals: new Map(),
    ingested: [],
    dataVersion: 1,
    askCounts: new Map<string, number>(),
  };

globalForSenarai.senaraiStore = store;

export function revocationKey(actorId: string, projectId: string, token: string): string {
  return `${actorId}:${projectId}:${token}`;
}

export function isRevoked(actorId: string, projectId: string, token: string): boolean {
  return store.revocations.has(revocationKey(actorId, projectId, token));
}

export function setRevoked(actorId: string, projectId: string, token: string, revoked: boolean): void {
  const key = revocationKey(actorId, projectId, token);
  if (revoked) store.revocations.add(key);
  else store.revocations.delete(key);
  store.scopeVersion += 1;
}

export function bumpScopeVersion(): number {
  store.scopeVersion += 1;
  return store.scopeVersion;
}

export function appendAudit(entry: AuditEntry): void {
  store.auditLog.unshift(entry);
}

export function saveThread(threadId: string, thread: StoredThread): void {
  store.threads.set(threadId, thread);
}

export function getThread(threadId: string): StoredThread | undefined {
  return store.threads.get(threadId);
}

export function updateThread(threadId: string, patch: Partial<StoredThread>): void {
  const existing = store.threads.get(threadId);
  if (!existing) return;
  store.threads.set(threadId, { ...existing, ...patch });
}

export function listThreads(actorId: string, projectId?: string): ThreadSummary[] {
  const out: ThreadSummary[] = [];
  for (const [threadId, t] of store.threads) {
    if (t.payload.scope.actorId !== actorId) continue;
    if (projectId && t.payload.projectId !== projectId) continue;
    out.push({
      threadId,
      projectId: t.payload.projectId,
      question: t.question,
      at: t.at,
      answerVersion: t.payload.version,
    });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
}

export function snapshotForDisplay(): ScopeSnapshot | undefined {
  return undefined;
}
