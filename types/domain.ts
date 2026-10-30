export type Locale = 'id' | 'en';
export type RoleId = 'staff' | 'manager' | 'admin';
export type SourceKind = 'chat' | 'doc' | 'task';
export type Sensitivity = 'general' | 'management';

export interface Project {
  id: string;
  code: string;
  nameKey: string;
  name: string;
  nameEn?: string;
  topicTags: string[];
  /** Constant project metadata. Rendered on the empty screen for every
   *  question in this project, so it can never disclose anything about the
   *  question that was asked. */
  ownerId?: string;
  ownerChannel?: string;
}

export interface TaskMeta {
  status: 'open' | 'blocked' | 'overdue' | 'done';
  ownerId?: string;
  ownerName?: string;
  due?: string;
}

export interface Claim {
  field: string;
  value: string;
  label: string;
}

export interface Source {
  id: string;
  kind: SourceKind;
  projectId: string;
  topicTags: string[];
  sensitivity: Sensitivity;
  title: string;
  titleEn?: string;
  authorId: string;
  authorName: string;
  at: string;
  version?: number;
  locator?: string;
  body: string;
  bodyLocale: Locale | 'mixed';
  participantIds: string[];
  task?: TaskMeta;
  claim?: Claim;
  containsInjection?: boolean;
  unrecordedDecision?: string;
  unrecordedDecisionEn?: string;
  explainsDecision?: boolean;
  /** One plain-language sentence stating what this source establishes. Authored
   *  by hand, never generated, so the narrative cannot invent a fact. */
  detailId?: string;
  detailEn?: string;
  /** Where this source sits in the causal chain. Used only to order the lead
   *  answer; it never changes what is retrieved. */
  narrativeRole?: 'cause' | 'decision' | 'effect' | 'context';
  /** Set when a source arrives through live ingestion during a demo. */
  ingested?: boolean;
}

export interface Role {
  id: RoleId;
  labelId: string;
  labelEn: string;
  sensitivities: Sensitivity[];
  tags: '*' | string[];
  canSeeAuditOfOthers: boolean;
}

export interface Actor {
  id: string;
  name: string;
  roleId: RoleId;
  title: string;
  projectIds: string[];
}

export interface Citation {
  id: string;
  marker: number;
  sourceId: string;
  quote: string;
  locator: string;
  gloss?: string;
}

export interface ConflictNote {
  field: string;
  chosenCitationId: string;
  rejectedCitationIds: string[];
  rule: 'newer-version' | 'board-over-chat' | 'explicit-correction' | 'recency';
  params?: Record<string, string>;
}

export interface ChronologyEvent {
  id: string;
  at: string;
  title: string;
  titleEn?: string;
  detail?: string;
  detailEn?: string;
  citations: Citation[];
  conflict?: ConflictNote;
}

/** The one-sentence answer, built from the causal chain the record supports.
 *  Every clause carries a marker; a clause with no marker is never emitted. */
export interface DirectAnswer {
  textId: string;
  textEn: string;
  citations: number[];
}

export type AgentTool =
  | 'resolve_scope'
  | 'search_sources'
  | 'read_sources'
  | 'resolve_conflicts'
  | 'detect_gaps'
  | 'compose'
  | 'verify';

export interface AgentStep {
  id: string;
  tool: AgentTool;
  labelId: string;
  labelEn: string;
  detailId: string;
  detailEn: string;
  status: 'ok' | 'flagged';
  ms: number;
}

export interface Verification {
  claims: number;
  cited: number;
  passed: boolean;
  noteId: string;
  noteEn: string;
}

export type OpenItemStatus = 'open' | 'blocked' | 'overdue';

export interface OpenItem {
  id: string;
  title: string;
  ownerId?: string;
  ownerName?: string;
  due?: string;
  status: OpenItemStatus;
  citation: Citation;
}

export interface Knower {
  personId: string;
  name: string;
  basis: 'participant' | 'owner';
  sourceId: string;
}

export interface ApprovalRequest {
  gapId: string;
  recipientName: string;
  channelLabel: string;
  state: 'draft' | 'approved' | 'cancelled';
  decidedAt?: string;
  simulated: true;
}

export interface RecordGap {
  id: string;
  whatIsMissing: string;
  whatIsMissingEn: string;
  whyItMatters?: string;
  whyItMattersEn?: string;
  knower?: Knower;
  draftQuestion: string;
  draftQuestionEn: string;
  rule: 'no-cause' | 'ownerless-blocked-item' | 'silent-interval';
  approval?: ApprovalRequest;
}

export interface Notice {
  id: string;
  kind: 'injection' | 'stale' | 'updated';
  textId: string;
  textEn: string;
  sourceId?: string;
}

export interface ScopeGrant {
  projectId: string;
  tags: '*' | string[];
  sensitivities: Sensitivity[];
}

export interface ScopeSnapshot {
  id: string;
  version: number;
  actorId: string;
  roleId: RoleId;
  projectIds: string[];
  grants: ScopeGrant[];
  issuedAt: string;
}

export interface AnswerPayload {
  id: string;
  threadId: string;
  projectId: string;
  question: string;
  questionMasked: string;
  createdAt: string;
  locale: Locale;
  /** Language the answer body is written in. Follows the language of the
   *  question, not the chrome toggle. A mixed ID/EN answer is correct output. */
  answerLanguage: Locale;
  scope: ScopeSnapshot;
  status: 'complete' | 'empty' | 'partial';
  canonical: boolean;
  version: number;
  lead?: DirectAnswer;
  chronology: ChronologyEvent[];
  openItems: OpenItem[];
  gaps: RecordGap[];
  notices: Notice[];
  /** Present only on answered payloads. The canonical empty carries no trace,
   *  because a trace that exists for one cause and not another is a tell. */
  trace?: AgentStep[];
  verification?: Verification;
}

export interface AuditEntry {
  id: string;
  at: string;
  actorId: string;
  actorRole: RoleId;
  projectId: string;
  questionMasked: string;
  scopeSnapshotId: string;
  scopeVersion: number;
  retrievedSourceIds: string[];
  answerId?: string;
  threadId?: string;
  /** What the agent returned, masked, so the log satisfies "the response it
   *  returned" and not only "the sources it retrieved". */
  answerSummary?: string;
  steps?: number;
  decision: 'answered' | 'empty' | 'empty-equivalent';
  approvals: Array<{ gapId: string; state: ApprovalRequest['state']; at: string }>;
}

export interface ThreadSummary {
  threadId: string;
  projectId: string;
  question: string;
  at: string;
  answerVersion: number;
}
