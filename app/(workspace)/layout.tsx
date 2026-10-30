import { actors, getRole, projects } from '@/lib/data';
import { readSession, projectsFor } from '@/lib/session';
import { listThreads } from '@/lib/store/session';
import { Sidebar } from '@/components/shell/Sidebar';
import { LocaleToggle } from '@/components/shell/Controls';
import type { Project } from '@/types/domain';

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();
  const project: Project = projects.find((p) => p.id === session.projectId) ?? projects[0];
  const visibleProjects = projectsFor(session.actor);
  const role = getRole(session.actor.roleId);
  const threads = listThreads(session.actorId, session.projectId);

  return (
    <div className="shell">
      <Sidebar
        project={project}
        projects={visibleProjects}
        threads={threads}
        actor={session.actor}
        role={role}
        actors={actors}
        locale={session.locale}
      />
      <div className="main">
        <header className="topbar">
          <div className="crumbs">
            <span className="t-mono">SENARAI</span>
            <span aria-hidden="true">/</span>
            <span>{project.code}</span>
          </div>
          <div className="spacer" />
          <LocaleToggle locale={session.locale} />
        </header>
        {children}
      </div>
    </div>
  );
}
