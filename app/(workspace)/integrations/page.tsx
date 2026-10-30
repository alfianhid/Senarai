import { join } from 'node:path';
import { readSession } from '@/lib/session';
import { t } from '@/lib/i18n/messages';
import { ConfigBlock } from '@/components/integrations/ConfigBlock';

const TOOLS = [
  ['senarai_ask', 'integrations.tool.ask'],
  ['senarai_get_thread', 'integrations.tool.thread'],
  ['senarai_approve', 'integrations.tool.approve'],
  ['senarai_revoke_scope', 'integrations.tool.scope'],
  ['senarai_query_audit', 'integrations.tool.audit'],
] as const;

export default async function IntegrationsPage() {
  const session = await readSession();
  const locale = session.locale;

  // The snippet must work when pasted, so the path is absolute rather than
  // relative to wherever the client happens to start the process.
  const serverPath = join(process.cwd(), 'mcp', 'dist', 'server.mjs');

  const config = JSON.stringify(
    {
      mcpServers: {
        senarai: {
          command: 'node',
          args: [serverPath],
          env: {
            SENARAI_ACTOR: session.actorId,
            SENARAI_PROJECT: session.projectId,
          },
        },
      },
    },
    null,
    2,
  );

  const steps = [
    t(locale, 'integrations.step.build'),
    t(locale, 'integrations.step.paste'),
    t(locale, 'integrations.step.ask'),
  ];

  return (
    <main className="page">
      <h1 className="t-display">{t(locale, 'integrations.title')}</h1>
      <p className="page-sub">{t(locale, 'integrations.sub')}</p>

      <section style={{ marginTop: 30 }}>
        <div className="section-head" style={{ paddingBottom: 8 }}>
          <div>
            <h2 className="t-h2">{t(locale, 'integrations.server')}</h2>
            <p className="section-sub">{t(locale, 'integrations.server.sub')}</p>
          </div>
        </div>
        <ol className="integration-steps">
          {steps.map((step, i) => (
            <li key={step}>
              <span className="t-mono step-no">{String(i + 1).padStart(2, '0')}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section style={{ marginTop: 34 }}>
        <div className="section-head" style={{ paddingBottom: 8 }}>
          <div>
            <h2 className="t-h2">{t(locale, 'integrations.tools')}</h2>
            <p className="section-sub">{t(locale, 'integrations.tools.sub')}</p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t(locale, 'integrations.col.tool')}</th>
                <th>{t(locale, 'integrations.col.does')}</th>
              </tr>
            </thead>
            <tbody>
              {TOOLS.map(([name, key]) => (
                <tr key={name}>
                  <td className="t-mono">{name}</td>
                  <td className="t-ui-sm">{t(locale, key)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: 34 }}>
        <div className="section-head" style={{ paddingBottom: 8 }}>
          <div>
            <h2 className="t-h2">{t(locale, 'integrations.config')}</h2>
            <p className="section-sub">{t(locale, 'integrations.config.sub')}</p>
          </div>
        </div>
        <ConfigBlock code={config} locale={locale} />
      </section>

      <section style={{ marginTop: 34 }}>
        <div className="section-head" style={{ paddingBottom: 8 }}>
          <div>
            <h2 className="t-h2">{t(locale, 'integrations.limits')}</h2>
            <p className="section-sub">{t(locale, 'integrations.limits.sub')}</p>
          </div>
        </div>
        <ul className="limit-list">
          <li>{t(locale, 'integrations.limit.memory')}</li>
          <li>{t(locale, 'integrations.limit.scope')}</li>
          <li>{t(locale, 'integrations.limit.actor')}</li>
        </ul>
      </section>
    </main>
  );
}
