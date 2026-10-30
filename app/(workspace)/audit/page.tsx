import { actors, getActor, getRole } from '@/lib/data';
import Link from 'next/link';
import { readSession } from '@/lib/session';
import { handleAudit } from '@/lib/api/handlers';
import { t } from '@/lib/i18n/messages';
import { formatDateTime } from '@/lib/ui/format';

const PILL: Record<string, string> = {
  answered: 'pill pill-approved',
  empty: 'pill pill-open',
  'empty-equivalent': 'pill pill-open',
};

export default async function AuditPage() {
  const session = await readSession();
  const role = getRole(session.actor.roleId);
  const entries = handleAudit(session.actorId, session.actor.roleId);

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1 className="t-display">{t(session.locale, 'audit.title')}</h1>
          <p className="page-sub">{t(session.locale, 'audit.sub')}</p>
        </div>
        <span className="t-mono">
          {entries.length} {session.locale === 'id' ? 'entri' : 'entries'}
        </span>
      </div>

      <div className="table-wrap" style={{ marginTop: 26 }}>
        <table className="data">
          <thead>
            <tr>
              <th>{t(session.locale, 'audit.col.time')}</th>
              <th>{t(session.locale, 'audit.col.actor')}</th>
              <th>{t(session.locale, 'audit.col.question')}</th>
              <th>{t(session.locale, 'audit.col.answer')}</th>
              <th>{t(session.locale, 'audit.col.sources')}</th>
              <th>{t(session.locale, 'audit.col.decision')}</th>
              <th>{t(session.locale, 'audit.col.approvals')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  {t(session.locale, 'audit.empty')}
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const actor = getActor(entry.actorId);
                const actorRole = actor ? getRole(actor.roleId) : undefined;
                return (
                  <tr key={entry.id}>
                    <td className="t-mono" style={{ whiteSpace: 'nowrap' }}>
                      {formatDateTime(entry.at, session.locale)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div className="t-ui">{actor?.name ?? entry.actorId}</div>
                      <div className="t-caption">
                        {actorRole ? (session.locale === 'id' ? actorRole.labelId : actorRole.labelEn) : ''}
                      </div>
                    </td>
                    <td className="t-body-sm" style={{ maxWidth: 320 }}>
                      {entry.questionMasked}
                    </td>
                    <td className="t-body-sm" style={{ maxWidth: 360 }}>
                      {entry.answerSummary ? (
                        <>
                          {entry.threadId ? (
                            <Link href={`/ask/${entry.threadId}`} className="audit-link">
                              {entry.answerSummary}
                            </Link>
                          ) : (
                            entry.answerSummary
                          )}
                          <div className="t-caption" style={{ marginTop: 4 }}>
                            {entry.steps ?? 0} {t(session.locale, 'audit.steps')} ·{' '}
                            {entry.answerId ?? '—'}
                          </div>
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="t-mono">{entry.retrievedSourceIds.join(', ') || '—'}</td>
                    <td>
                      <span className={PILL[entry.decision] ?? 'pill pill-open'}>
                        {t(session.locale, `audit.decision.${entry.decision}` as never)}
                      </span>
                      <div className="t-caption" style={{ marginTop: 4 }}>
                        {entry.scopeSnapshotId} · v{entry.scopeVersion}
                      </div>
                    </td>
                    <td className="t-mono">
                      {entry.approvals.length === 0
                        ? '—'
                        : entry.approvals.map((a) => `${a.gapId} ${a.state}`).join(', ')}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="t-caption" style={{ marginTop: 16, maxWidth: '68ch' }}>
        {role?.id === 'staff'
          ? session.locale === 'id'
            ? 'Anda melihat entri Anda sendiri. Peran manajer melihat seluruh proyek; admin melihat semua.'
            : 'You see your own entries. Managers see their projects; admins see everything.'
          : session.locale === 'id'
            ? 'Manajer melihat seluruh entri pada proyeknya. Admin melihat semua entri.'
            : 'Managers see every entry in their projects. Admins see everything.'}
      </p>
    </main>
  );
}
