import { describe, expect, it } from 'vitest';
import { handleApproval, handleAsk } from '@/lib/api/handlers';
import { store } from '@/lib/store/session';

const askMain = () =>
  handleAsk({
    question: 'Kenapa stok telat di Makassar, dan apa yang masih terbuka?',
    projectId: 'makassar-q4',
    actorId: 'A1',
    locale: 'id',
  });

const auditRow = (answerId: string) => store.auditLog.find((e) => e.answerId === answerId);

describe('approval gate (T17–T18)', () => {
  it('drafts a question only for a gap that has a visible knower', async () => {
    const { payload } = await askMain();
    const withApproval = payload.gaps.filter((g) => g.approval);
    expect(withApproval.length).toBeGreaterThan(0);
    for (const gap of withApproval) {
      expect(gap.approval?.state).toBe('draft');
      expect(gap.approval?.simulated).toBe(true);
      expect(gap.knower).toBeDefined();
    }
  }, 10_000);

  it('records one approval on confirm', async () => {
    const { payload, threadId } = await askMain();
    const gap = payload.gaps.find((g) => g.approval)!;

    const result = handleApproval({ threadId, gapId: gap.id, action: 'approve' });
    expect(result).toEqual({ ok: true, approvalState: 'approved' });

    const row = auditRow(payload.id);
    expect(row?.approvals).toHaveLength(1);
    expect(row?.approvals[0].gapId).toBe(gap.id);
  }, 10_000);

  it('writes nothing on cancel: the gap returns to draft and the log is untouched', async () => {
    const { payload, threadId } = await askMain();
    const gap = payload.gaps.find((g) => g.approval)!;

    const result = handleApproval({ threadId, gapId: gap.id, action: 'cancel' });
    expect(result).toEqual({ ok: true, approvalState: 'draft' });

    expect(auditRow(payload.id)?.approvals).toHaveLength(0);
  }, 10_000);

  it('refuses an approval for a gap that does not exist', async () => {
    const { threadId } = await askMain();
    expect(handleApproval({ threadId, gapId: 'G99', action: 'approve' })).toEqual({ ok: false });
  }, 10_000);
});
