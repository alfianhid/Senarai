'use client';

import { useState } from 'react';
import { t } from '@/lib/i18n/messages';
import type { Locale } from '@/types/domain';

export function ConfigBlock({ code, locale }: { code: string; locale: Locale }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the text stays selectable either way.
    }
  }

  return (
    <div className="code-block">
      <pre>
        <code>{code}</code>
      </pre>
      <button type="button" className="btn-quiet code-copy" onClick={copy} aria-live="polite">
        {copied ? t(locale, 'action.copied') : t(locale, 'action.copy')}
      </button>
    </div>
  );
}
