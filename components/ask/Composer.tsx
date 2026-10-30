'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Locale } from '@/types/domain';
import { t } from '@/lib/i18n/messages';

export function Composer({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error('ask failed');
      const data = (await res.json()) as { threadId: string };
      router.push(`/ask/${data.threadId}`);
    } catch {
      setError(t(locale, 'error.title'));
      setBusy(false);
    }
  };

  const samples = ['ask.q1', 'ask.q2', 'ask.q3', 'ask.q4'] as const;

  return (
    <div>
      <div className="composer">
        <textarea
          id="question"
          rows={2}
          aria-label={t(locale, 'ask.title')}
          value={value}
          placeholder={t(locale, 'ask.placeholder')}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submit(value);
            }
          }}
        />
        <div className="composer-row">
          <span className="t-caption" style={{ flex: 1 }}>
            {t(locale, 'ask.hint')}
          </span>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || value.trim().length === 0}
            onClick={() => void submit(value)}
          >
            {busy ? t(locale, 'answer.loading') : t(locale, 'ask.submit')}
          </button>
        </div>
      </div>

      {error ? (
        <p className="t-ui-sm" style={{ color: 'var(--signal-gap)' }}>
          {error}
        </p>
      ) : null}

      <div className="samples">
        <span className="t-caption" style={{ alignSelf: 'center', marginRight: 4 }}>
          {t(locale, 'ask.sample')}:
        </span>
        {samples.map((key) => (
          <button key={key} type="button" className="chip-btn" onClick={() => void submit(t(locale, key))}>
            {t(locale, key)}
          </button>
        ))}
      </div>
    </div>
  );
}
