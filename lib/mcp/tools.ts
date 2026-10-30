/**
 * The MCP tool layer.
 *
 * Every handler here is a thin call into `lib/api/handlers.ts` — the same
 * functions `app/api/*` calls. No permission check, no composition, no masking
 * is implemented in this file: if a guarantee exists in the HTTP path it exists
 * here because it is the same code, not because it was copied.
 *
 * Kept free of any MCP SDK import so the handlers can be tested directly.
 */
import type { AnswerPayload, AuditEntry, Locale } from '@/types/domain';
import { getActor } from '@/lib/data';
import { buildSnapshot } from '@/lib/access/scope';
import { canonicalEmpty } from '@/lib/answer/canonicalEmpty';
import { handleApproval, handleAsk, handleAudit, handleScope } from '@/lib/api/handlers';
import { getThread } from '@/lib/store/session';

export interface McpAskInput {
  question: string;
  actorId: string;
  projectId: string;
  locale?: Locale;
}

export interface McpAskOutput {
  threadId: string;
  payload: AnswerPayload;
}

/**
 * Ask a question. An unknown actor, a project outside the actor's scope and a
 * project that does not exist all fall through to the canonical empty, because
 * `buildSnapshot` returns no grants and retrieval finds nothing readable.
 */
export async function askTool(input: McpAskInput): Promise<McpAskOutput> {
  const question = input.question.trim();
  if (!question) throw new Error('question must not be empty');

  const result = await handleAsk({
    question,
    actorId: input.actorId,
    projectId: input.projectId,
    locale: input.locale ?? 'id',
  });

  return { threadId: result.threadId, payload: result.payload };
}

export interface McpGetThreadInput {
  threadId: string;
  actorId: string;
  projectId: string;
}

/**
 * Read a thread back. A thread that belongs to another actor returns the
 * canonical empty rather than an error, so the tool cannot be used to probe
 * whether a thread id exists.
 */
export function getThreadTool(input: McpGetThreadInput): AnswerPayload | null {
  const thread = getThread(input.threadId);
  if (!thread) return null;

  if (thread.payload.scope.actorId !== input.actorId) {
    return canonicalEmpty(
      buildSnapshot(input.actorId, input.projectId),
      input.threadId,
      input.projectId,
    );
  }

  return thread.payload;
}

export interface McpApproveInput {
  threadId: string;
  gapId: string;
  actorId: string;
  projectId: string;
  action?: 'approve' | 'cancel';
}

/**
 * Confirm or cancel a drafted question. Only an actor who can see the thread may
 * decide on it; anyone else is told the gap does not exist.
 */
export function approveTool(input: McpApproveInput): {
  ok: boolean;
  approvalState?: string;
  reason?: string;
} {
  const thread = getThread(input.threadId);
  if (!thread) return { ok: false, reason: 'no such thread' };

  if (thread.payload.scope.actorId !== input.actorId) {
    return { ok: false, reason: 'no such gap' };
  }

  const result = handleApproval({
    threadId: input.threadId,
    gapId: input.gapId,
    action: input.action ?? 'approve',
  });

  if (!result.ok) return { ok: false, reason: 'no such gap' };
  return { ok: true, approvalState: result.approvalState };
}

export interface McpRevokeInput {
  actorId: string;
  projectId: string;
  token: string;
  granted: boolean;
}

/** Narrow or restore the actor's own scope. Widening is refused in `lib/`. */
export function revokeScopeTool(input: McpRevokeInput): {
  ok: boolean;
  scopeVersion: number;
  reason?: string;
} {
  const result = handleScope(input);
  if (!result.ok) {
    return {
      ok: false,
      scopeVersion: result.scopeVersion,
      reason: 'the role does not carry this grant, so it cannot be added',
    };
  }
  return { ok: true, scopeVersion: result.scopeVersion };
}

export interface McpAuditInput {
  actorId: string;
  limit?: number;
}

/** The audit view is scoped exactly as it is in `/audit`: staff see their own. */
export function auditTool(input: McpAuditInput): AuditEntry[] {
  const actor = getActor(input.actorId);
  const roleId = actor?.roleId ?? 'staff';
  const entries = handleAudit(input.actorId, roleId);
  const limit = input.limit ?? 20;
  return entries.slice(-Math.max(1, Math.min(limit, 100)));
}
