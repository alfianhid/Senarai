/**
 * Senarai MCP server — stdio transport.
 *
 * A transport wrapper and nothing else. Every tool calls `lib/mcp/tools.ts`,
 * which calls `lib/api/handlers.ts`, which is the same path `app/api/*` uses.
 * The host client's model never reaches `lib/` directly: it receives the
 * already-filtered, already-masked, already-audited payload, or the canonical
 * empty — never a hint that something was withheld.
 *
 * stdout is the protocol channel. Nothing here may write to it except the SDK.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { askTool, auditTool, approveTool, getThreadTool, revokeScopeTool } from '@/lib/mcp/tools';
import type { Locale } from '@/types/domain';

const DEFAULT_ACTOR = process.env.SENARAI_ACTOR ?? 'A1';
const DEFAULT_PROJECT = process.env.SENARAI_PROJECT ?? 'makassar-q4';

const log = (...args: unknown[]) => console.error('[senarai-mcp]', ...args);

const server = new McpServer(
  { name: 'senarai', version: '1.0.0' },
  {
    instructions: [
      'Senarai answers questions about a project record: what happened, what is still open, and what was never written down.',
      'Call senarai_ask with the user question. The reply is an AnswerPayload: a cited lead answer, a chronology, open items, detected gaps, the agent trace and a self-check.',
      'The payload is already filtered to the actor in scope. If a topic is not in their record, the payload is empty and looks identical to a topic that does not exist — report it as "no record", never as "denied" or "restricted".',
      'Do not invent detail beyond the payload. Every sentence you add must come from a citation.',
    ].join(' '),
  },
);

server.registerTool(
  'senarai_ask',
  {
    title: 'Ask the project record',
    description:
      'Ask a question about the project history. Returns a cited answer, the sourced chronology, open items, record gaps, the agent trace and a self-check. Returns an empty payload when the topic is outside the actor\'s scope — report that as "no record in your scope", not as a permission error.',
    inputSchema: {
      question: z.string().min(1).describe('The question, in Indonesian or English'),
      actorId: z.string().default(DEFAULT_ACTOR).describe('Who is asking, e.g. A1 (staff) or A2 (manager)'),
      projectId: z.string().default(DEFAULT_PROJECT).describe('Project id, e.g. makassar-q4 or onboarding-2026'),
      locale: z.enum(['id', 'en']).default('id').describe('Chrome language; the answer language follows the question'),
    },
  },
  async ({ question, actorId, projectId, locale }) => {
    const { threadId, payload } = await askTool({
      question,
      actorId,
      projectId,
      locale: locale as Locale,
    });

    log(`ask actor=${actorId} project=${projectId} thread=${threadId} canonical=${payload.canonical}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(payload, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  'senarai_get_thread',
  {
    title: 'Read a thread back',
    description:
      'Fetch a previously answered thread by id. A thread that belongs to another actor returns the same empty payload as a question with no record, so this cannot be used to probe whether a thread exists.',
    inputSchema: {
      threadId: z.string().min(1).describe('The thread id returned by senarai_ask'),
      actorId: z.string().default(DEFAULT_ACTOR),
      projectId: z.string().default(DEFAULT_PROJECT),
    },
  },
  async ({ threadId, actorId, projectId }) => {
    const payload = getThreadTool({ threadId, actorId, projectId });

    if (!payload) {
      return {
        isError: true,
        content: [{ type: 'text', text: `No thread ${threadId} in this process.` }],
      };
    }

    return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
  },
);

server.registerTool(
  'senarai_approve',
  {
    title: 'Confirm or cancel a drafted question',
    description:
      'A detected gap may carry a drafted question to the person who knows the answer. Sending is the only irreversible action in the product, so it happens only here, only on an explicit decision. Cancelling writes nothing anywhere.',
    inputSchema: {
      threadId: z.string().min(1),
      gapId: z.string().min(1).describe('The gap id from the payload, e.g. G1'),
      action: z.enum(['approve', 'cancel']).default('approve'),
      actorId: z.string().default(DEFAULT_ACTOR),
      projectId: z.string().default(DEFAULT_PROJECT),
    },
  },
  async ({ threadId, gapId, action, actorId, projectId }) => {
    const result = approveTool({ threadId, gapId, action, actorId, projectId });

    if (!result.ok) {
      return {
        isError: true,
        content: [{ type: 'text', text: result.reason ?? 'refused' }],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text:
            result.approvalState === 'approved'
              ? `Approved. One entry appended to the audit log for gap ${gapId}.`
              : `Cancelled. Nothing was written; gap ${gapId} is back in draft.`,
        },
      ],
    };
  },
);

server.registerTool(
  'senarai_revoke_scope',
  {
    title: 'Narrow the actor\'s own scope',
    description:
      'Remove or restore one grant for the actor. Narrowing is always allowed; adding a grant the role does not carry is refused, so this tool cannot be used to widen access.',
    inputSchema: {
      token: z
        .string()
        .min(1)
        .describe('A topic tag such as customer, or sensitivity:<level>'),
      granted: z.boolean().describe('false to revoke, true to restore'),
      actorId: z.string().default(DEFAULT_ACTOR),
      projectId: z.string().default(DEFAULT_PROJECT),
    },
  },
  async ({ token, granted, actorId, projectId }) => {
    const result = revokeScopeTool({ token, granted, actorId, projectId });

    if (!result.ok) {
      return {
        isError: true,
        content: [{ type: 'text', text: result.reason ?? 'refused' }],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `${granted ? 'Restored' : 'Revoked'} ${token}. Scope is now version ${result.scopeVersion}; the next answer is composed against the new snapshot.`,
        },
      ],
    };
  },
);

server.registerTool(
  'senarai_query_audit',
  {
    title: 'Read the audit log',
    description:
      'The record of what the agent answered, for whom, against which scope snapshot. Staff see only their own entries; a manager sees their projects; an admin sees everything. Same scoping as the /audit screen.',
    inputSchema: {
      limit: z.number().int().min(1).max(100).default(20),
      actorId: z.string().default(DEFAULT_ACTOR),
    },
  },
  async ({ limit, actorId }) => {
    const entries = auditTool({ actorId, limit });
    return { content: [{ type: 'text', text: JSON.stringify(entries, null, 2) }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
log(`ready actor=${DEFAULT_ACTOR} project=${DEFAULT_PROJECT}`);
