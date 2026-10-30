import { readSession } from '@/lib/session';
import { getProject } from '@/lib/data';
import { Composer } from '@/components/ask/Composer';
import { t } from '@/lib/i18n/messages';

export default async function AskPage() {
  const session = await readSession();
  const project = getProject(session.projectId);

  return (
    <main className="page">
      <div style={{ maxWidth: 820 }}>
        <p className="t-label">{project?.name}</p>
        <h1 className="t-display" style={{ marginTop: 10 }}>
          {t(session.locale, 'ask.title')}
        </h1>
        <Composer locale={session.locale} />
      </div>
    </main>
  );
}
