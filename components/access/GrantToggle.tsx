'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { Locale } from '@/types/domain';

export function GrantToggle({
  token,
  granted,
  locale,
  label,
}: {
  token: string;
  granted: boolean;
  locale: Locale;
  label: string;
}) {
  const router = useRouter();
  const [on, setOn] = useState(granted);
  const [pending, start] = useTransition();

  const flip = async () => {
    const next = !on;
    setOn(next);
    await fetch('/api/scope', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, granted: next }),
    });
    start(() => router.refresh());
  };

  return (
    <button
      type="button"
      onClick={() => void flip()}
      disabled={pending}
      aria-pressed={on}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 26,
        padding: '0 10px 0 4px',
        borderRadius: 999,
        border: `1px solid ${on ? 'var(--primary-border)' : 'var(--border)'}`,
        background: on ? 'var(--primary-tint)' : 'var(--surface)',
        color: on ? 'var(--primary)' : 'var(--ink-muted)',
        fontSize: 12,
        fontWeight: 500,
      }}
      aria-label={`${label}: ${on ? 'granted' : 'revoked'}`}
    >
      <span
        aria-hidden="true"
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: on ? 'var(--primary)' : 'var(--n-200)',
          display: 'inline-block',
        }}
      />
      {on ? (locale === 'id' ? 'Aktif' : 'Granted') : locale === 'id' ? 'Dicabut' : 'Revoked'}
    </button>
  );
}
