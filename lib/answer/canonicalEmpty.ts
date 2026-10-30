import type { AnswerPayload, Locale, ScopeSnapshot } from '@/types/domain';

const FIXED_TS = '2026-01-01T00:00:00+07:00';

/**
 * The canonical empty answer.
 *
 * Four causes produce it: topic outside scope, project outside scope, genuinely
 * absent record, and all matches filtered by canRead(). The payload does not
 * branch on cause, does not echo the question (the topic name may itself be the
 * forbidden fact), and carries a constant timestamp so response time and byte
 * length cannot be compared across causes.
 */
export function canonicalEmpty(scope: ScopeSnapshot, threadId: string, projectId: string): AnswerPayload {
  return {
    id: 'EMPTY',
    threadId,
    projectId,
    question: '',
    questionMasked: '',
    createdAt: FIXED_TS,
    locale: 'id' as Locale,
    // Fixed to Indonesian regardless of the question's language, so an English
    // question cannot be told apart from an Indonesian one by the empty payload.
    answerLanguage: 'id' as Locale,
    // The scope copy is normalised as well: a per-call issuedAt would make two
    // empty payloads differ by a timestamp, which is itself a signal.
    scope: { ...scope, id: 'SCP-EMPTY', version: 0, issuedAt: FIXED_TS },
    status: 'empty',
    canonical: true,
    version: 0,
    chronology: [],
    openItems: [],
    gaps: [],
    notices: [],
  };
}