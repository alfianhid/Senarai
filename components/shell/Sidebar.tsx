'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Actor, Locale, Project, Role, ThreadSummary } from '@/types/domain';
import { t } from '@/lib/i18n/messages';
import { formatDay, groupThread } from '@/lib/ui/format';
import { IconAccess, IconAsk, IconAudit, IconPlug } from '@/components/ui/icons';
import { ActorSwitcher, ProjectSwitcher } from '@/components/shell/Controls';

interface Props {
  project: Project;
  projects: Project[];
  threads: ThreadSummary[];
  actor: Actor;
  role: Role | undefined;
  actors: Actor[];
  locale: Locale;
  activeThreadId?: string;
}

export function Sidebar({ project, projects, threads, actor, role, actors, locale, activeThreadId }: Props) {
  const pathname = usePathname();

  const groups = {
    today: threads.filter((th) => groupThread(th.at) === 'today'),
    week: threads.filter((th) => groupThread(th.at) === 'week'),
    earlier: threads.filter((th) => groupThread(th.at) === 'earlier'),
  };

  const navItem = (href: string, label: string, icon: React.ReactNode) => {
    const active = pathname === href || (href !== '/ask' && pathname.startsWith(href));
    return (
      <Link href={href} className="nav-item" aria-current={active ? 'page' : undefined}>
        {icon}
        <span className="label">{label}</span>
      </Link>
    );
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <ProjectSwitcher projects={projects} projectId={project.id} locale={locale} />
      </div>

      <nav className="nav" aria-label="Primary">
        <div className="nav-group">
          <div className="nav-label t-label">{t(locale, 'nav.workspace')}</div>
          {navItem('/ask', t(locale, 'nav.ask'), <IconAsk />)}
          {navItem('/audit', t(locale, 'nav.audit'), <IconAudit />)}
          {navItem('/access', t(locale, 'nav.access'), <IconAccess />)}
          {navItem('/integrations', t(locale, 'nav.integrations'), <IconPlug />)}
        </div>

        <div className="nav-group">
          <div className="nav-label t-label">{t(locale, 'nav.history')}</div>
          {threads.length === 0 ? (
            <div className="t-ui-sm muted" style={{ padding: '6px 10px' }}>
              {t(locale, 'nav.empty')}
            </div>
          ) : null}
          {(['today', 'week', 'earlier'] as const).map((key) => {
            const list = groups[key];
            if (list.length === 0) return null;
            return (
              <div key={key}>
                <div className="t-caption" style={{ padding: '10px 10px 4px' }}>
                  {t(locale, key === 'today' ? 'nav.today' : key === 'week' ? 'nav.week' : 'nav.earlier')}
                </div>
                {list.map((th) => (
                  <Link
                    key={th.threadId}
                    href={`/ask/${th.threadId}`}
                    className="thread-row"
                    data-active={th.threadId === activeThreadId}
                  >
                    <span className="t-mono">{formatDay(th.at, locale)}</span>
                    <span className="thread-q">{th.question}</span>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="sidebar-bottom">
        <div className="identity-block">
          <div className="identity-role">{role ? (locale === 'id' ? role.labelId : role.labelEn) : ''}</div>
          <ActorSwitcher actors={actors} actorId={actor.id} />
        </div>
      </div>
    </aside>
  );
}
