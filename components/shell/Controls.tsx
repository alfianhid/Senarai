'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { Actor, Locale, Project } from '@/types/domain';

export function ProjectSwitcher({
  projects,
  projectId,
  locale,
}: {
  projects: Project[];
  projectId: string;
  locale: Locale;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <select
      aria-label="Project"
      value={projectId}
      disabled={pending}
      onChange={(e) => {
        document.cookie = `senarai_project=${e.target.value}; path=/; max-age=31536000`;
        start(() => router.refresh());
      }}
      style={{
        border: '1px solid var(--border)',
        borderRadius: 6,
        background: 'var(--surface)',
        font: 'inherit',
        fontSize: 13.5,
        fontWeight: 500,
        padding: '7px 8px',
        color: 'var(--ink)',
        width: '100%',
        boxShadow: 'var(--elev-1)',
      }}
    >
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {locale === 'en' ? p.nameEn ?? p.name : p.name}
        </option>
      ))}
    </select>
  );
}

export function LocaleToggle({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const set = (next: Locale) => {
    document.cookie = `senarai_locale=${next}; path=/; max-age=31536000`;
    start(() => router.refresh());
  };

  return (
    <div className="seg" role="group" aria-label="Language">
      <button type="button" data-on={locale === 'id'} onClick={() => set('id')} disabled={pending}>
        ID
      </button>
      <button type="button" data-on={locale === 'en'} onClick={() => set('en')} disabled={pending}>
        EN
      </button>
    </div>
  );
}

export function ActorSwitcher({ actors, actorId }: { actors: Actor[]; actorId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <select
      aria-label="Demo actor"
      value={actorId}
      disabled={pending}
      onChange={(e) => {
        document.cookie = `senarai_actor=${e.target.value}; path=/; max-age=31536000`;
        start(() => router.refresh());
      }}
      style={{
        border: '1px solid var(--border)',
        borderRadius: 6,
        background: 'var(--surface)',
        font: 'inherit',
        fontSize: 13,
        fontWeight: 500,
        padding: '5px 6px',
        color: 'var(--ink)',
        width: '100%',
      }}
    >
      {actors.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  );
}
