import { getRole, roles, sources } from '@/lib/data';
import { readSession } from '@/lib/session';
import { isRevoked } from '@/lib/store/session';
import { SENSITIVITY_TOKEN } from '@/lib/access/scope';
import { t } from '@/lib/i18n/messages';
import { GrantToggle } from '@/components/access/GrantToggle';
import type { Sensitivity } from '@/types/domain';

export default async function AccessPage() {
  const session = await readSession();
  const role = getRole(session.actor.roleId);
  const projectId = session.projectId;

  const tags = [...new Set(sources.filter((s) => s.projectId === projectId).flatMap((s) => s.topicTags))].sort();
  const sensitivities: Sensitivity[] = ['general', 'management'];

  const roleHasTag = (roleId: string, tag: string) => {
    const r = roles.find((x) => x.id === roleId);
    if (!r) return false;
    return r.tags === '*' || r.tags.includes(tag);
  };

  const roleHasSensitivity = (roleId: string, s: Sensitivity) => {
    const r = roles.find((x) => x.id === roleId);
    return r ? r.sensitivities.includes(s) : false;
  };

  const tagGranted = (tag: string) => {
    if (!role) return false;
    if (role.tags === '*') return true;
    return role.tags.includes(tag) && !isRevoked(session.actorId, projectId, tag);
  };

  const sensGranted = (s: Sensitivity) => {
    if (!role) return false;
    return (
      role.sensitivities.includes(s) &&
      !isRevoked(session.actorId, projectId, SENSITIVITY_TOKEN(s))
    );
  };

  return (
    <main className="page">
      <h1 className="t-display">{t(session.locale, 'access.title')}</h1>
      <p className="page-sub">{t(session.locale, 'access.sub')}</p>

      <section style={{ marginTop: 30 }}>
        <div className="section-head" style={{ paddingBottom: 8 }}>
          <div>
            <h2 className="t-h2">{t(session.locale, 'access.you')}</h2>
            <p className="section-sub">{t(session.locale, 'access.you.sub')}</p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t(session.locale, 'access.col.tag')}</th>
                <th>{t(session.locale, 'access.col.scope')}</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag}>
                  <td className="t-mono">{tag}</td>
                  <td>
                    {role && role.tags === '*' ? (
                      <span className="t-ui-sm muted">
                        {session.locale === 'id' ? 'Semua tag' : 'All tags'}
                      </span>
                    ) : role && role.tags.includes(tag) ? (
                      <GrantToggle
                        token={tag}
                        granted={tagGranted(tag)}
                        locale={session.locale}
                        label={tag}
                      />
                    ) : (
                      <span className="t-ui-sm muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {sensitivities.map((s) => (
                <tr key={s}>
                  <td className="t-mono">{SENSITIVITY_TOKEN(s)}</td>
                  <td>
                    {role && role.sensitivities.includes(s) ? (
                      <GrantToggle
                        token={SENSITIVITY_TOKEN(s)}
                        granted={sensGranted(s)}
                        locale={session.locale}
                        label={s}
                      />
                    ) : (
                      <span className="t-ui-sm muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: 34 }}>
        <div className="section-head" style={{ paddingBottom: 8 }}>
          <div>
            <h2 className="t-h2">{t(session.locale, 'access.matrix')}</h2>
            <p className="section-sub">{t(session.locale, 'access.note')}</p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t(session.locale, 'access.col.scope')}</th>
                {roles.map((r) => (
                  <th key={r.id}>{session.locale === 'id' ? r.labelId : r.labelEn}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag}>
                  <td className="t-mono">{tag}</td>
                  {roles.map((r) => (
                    <td key={r.id} className="t-ui-sm">
                      {roleHasTag(r.id, tag) ? '✓' : '—'}
                    </td>
                  ))}
                </tr>
              ))}
              {sensitivities.map((s) => (
                <tr key={s}>
                  <td className="t-mono">{SENSITIVITY_TOKEN(s)}</td>
                  {roles.map((r) => (
                    <td key={r.id} className="t-ui-sm">
                      {roleHasSensitivity(r.id, s) ? '✓' : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
