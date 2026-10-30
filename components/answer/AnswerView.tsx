'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AgentStep,
  AnswerPayload,
  Citation,
  ConflictNote,
  Locale,
  OpenItem,
  RecordGap,
} from '@/types/domain';
import { t } from '@/lib/i18n/messages';
import { formatDate, formatDateTime } from '@/lib/ui/format';
import { IconClose } from '@/components/ui/icons';

export interface SourceMeta {
  id: string;
  kind: 'chat' | 'doc' | 'task';
  title: string;
  authorName: string;
  at: string;
  locator: string;
  version?: number;
}

interface Props {
  payload: AnswerPayload;
  locale: Locale;
  sourceMeta: Record<string, SourceMeta>;
  ownerName?: string;
  ownerChannel?: string;
}

const PILL: Record<string, string> = {
  open: 'pill pill-open',
  blocked: 'pill pill-blocked',
  overdue: 'pill pill-overdue',
  approved: 'pill pill-approved',
  cancelled: 'pill pill-cancelled',
};

const INGEST: Record<string, { title: string; titleEn: string; body: string; detailId: string; detailEn: string; tags: string[] }> = {
  'makassar-q4': {
    title: 'Vendor Anugrah setuju menandatangani berita acara',
    titleEn: 'Anugrah agrees to sign the delay report',
    body: 'Vendor Anugrah sudah setuju menandatangani berita acara keterlambatan hari ini. Surat klaim bisa dikirim Senin.',
    detailId: 'Vendor menandatangani berita acara keterlambatan, sehingga surat klaim bisa dikirim.',
    detailEn: 'The vendor signed the delay report, so the claim letter can now be sent.',
    tags: ['vendor.contract', 'ops'],
  },
  'onboarding-2026': {
    title: 'Akses VPN karyawan baru sudah aktif',
    titleEn: 'VPN access for the new hire is active',
    body: 'Akses VPN karyawan baru sudah aktif per hari ini. Tidak perlu tiket lagi.',
    detailId: 'Akses VPN karyawan baru sudah aktif, jadi tugas yang terhambat itu selesai.',
    detailEn: 'VPN access for the new hire is active, so the blocked task is resolved.',
    tags: ['it.access', 'onboarding'],
  },
  'proyek-kenari': {
    title: 'Penilaian independen selesai',
    titleEn: 'Independent valuation completed',
    body: 'Penilaian independen lahan Cikarang selesai. Hasilnya dibahas di rapat direksi.',
    detailId: 'Penilaian independen lahan Cikarang selesai dan hasilnya dibahas di rapat direksi.',
    detailEn: 'The independent valuation of the Cikarang land is complete and will be discussed at the board meeting.',
    tags: ['acquisition', 'kenari'],
  },
};

function conflictText(note: ConflictNote, markers: Map<string, number>, locale: Locale): string {
  const chosen = markers.get(note.chosenCitationId);
  const rejected = note.rejectedCitationIds.map((id) => markers.get(id)).filter(Boolean);
  const rule = t(locale, `conflict.rule.${note.rule}` as never);
  const value = note.params?.chosenValue ?? '';
  const rejectedValue = note.params?.rejectedValue ?? '';
  if (locale === 'id') {
    return `Konflik sumber — dipakai [${chosen}] (${value}) karena ${rule}, bukan [${rejected.join(', ')}] (${rejectedValue}).`;
  }
  return `Source conflict — used [${chosen}] (${value}) because it is the ${rule}, not [${rejected.join(', ')}] (${rejectedValue}).`;
}

/** Citation markers inside a composed sentence are buttons, not decoration. */
function RichText({
  text,
  onCite,
}: {
  text: string;
  onCite: (marker: number) => void;
}) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((part, index) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (!match) return <span key={index}>{part}</span>;
        const marker = Number(match[1]);
        return (
          <button
            key={index}
            type="button"
            className="cite"
            onClick={() => onCite(marker)}
            aria-label={`Source ${marker}`}
          >
            [{marker}]
          </button>
        );
      })}
    </>
  );
}

export function AnswerView({ payload, locale, sourceMeta, ownerName, ownerChannel }: Props) {
  const router = useRouter();
  const [answer, setAnswer] = useState<AnswerPayload>(payload);
  const [openCitation, setOpenCitation] = useState<Citation | null>(null);
  const [reviewGap, setReviewGap] = useState<RecordGap | null>(null);
  const [busy, setBusy] = useState(false);
  const lastCite = useRef<HTMLButtonElement | null>(null);

  const closeDrawer = () => {
    setOpenCitation(null);
    lastCite.current?.focus();
  };

  // Escape cancels whichever layer is open. Closing the drawer returns focus to
  // the citation that opened it, so a keyboard reader is never dropped at the
  // top of the document.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (reviewGap) setReviewGap(null);
      else if (openCitation) closeDrawer();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [reviewGap, openCitation]);

  const markers = useMemo(() => {
    const map = new Map<string, number>();
    for (const event of answer.chronology) {
      for (const c of event.citations) map.set(c.id, c.marker);
    }
    for (const item of answer.openItems) map.set(item.citation.id, item.citation.marker);
    return map;
  }, [answer]);

  const citationByMarker = useMemo(() => {
    const map = new Map<number, Citation>();
    for (const event of answer.chronology) {
      for (const c of event.citations) map.set(c.marker, c);
    }
    for (const item of answer.openItems) map.set(item.citation.marker, item.citation);
    return map;
  }, [answer]);

  const sourceCount =
    answer.chronology.reduce((n, e) => n + e.citations.length, 0) + answer.openItems.length;

  const lang = answer.answerLanguage ?? locale;
  const copy = (id: string, en: string) => (lang === 'en' ? en : id);

  const decide = async (gap: RecordGap, action: 'approve' | 'cancel') => {
    const res = await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ threadId: answer.threadId, gapId: gap.id, action }),
    });
    if (res.ok) {
      setAnswer((prev) => ({
        ...prev,
        gaps: prev.gaps.map((g) =>
          g.id === gap.id && g.approval
            ? {
                ...g,
                approval: {
                  ...g.approval,
                  state: action === 'approve' ? 'approved' : 'cancelled',
                  decidedAt: new Date().toISOString(),
                },
              }
            : g,
        ),
      }));
    }
    setReviewGap(null);
  };

  /** Living answer: the same question, asked again against the current data. */
  const reask = async (question: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error('ask failed');
      const data = (await res.json()) as { threadId: string };
      router.push(`/ask/${data.threadId}`);
    } catch {
      setBusy(false);
    }
  };

  /** A message arrives from outside. The next answer has to include it. */
  const ingest = async (question: string) => {
    if (busy) return;
    setBusy(true);
    const canned = INGEST[answer.projectId];
    try {
      if (canned) {
        await fetch('/api/ingest', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            kind: 'chat',
            title: canned.title,
            titleEn: canned.titleEn,
            body: canned.body,
            detailId: canned.detailId,
            detailEn: canned.detailEn,
            topicTags: canned.tags,
          }),
        });
      }
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error('ask failed');
      const data = (await res.json()) as { threadId: string };
      router.push(`/ask/${data.threadId}`);
    } catch {
      setBusy(false);
    }
  };

  if (answer.canonical) {
    // The empty answer keeps the same skeleton as a real one: three numbered
    // sections, in order, each stating its own absence. Nothing here says why
    // the record is empty — that would be the tell. The owner block is constant
    // project metadata, identical for every question in this project.
    const emptySections = [
      { idx: '01', title: 'section.chronology', sub: 'section.chronology.sub' },
      { idx: '02', title: 'section.open', sub: 'section.open.sub' },
      { idx: '03', title: 'section.gaps', sub: 'section.gaps.sub' },
    ] as const;

    const owner = ownerName;

    return (
      <main className="page">
        <div className="document">
          <header className="answer-head">
            <h1 className="t-h1">{t(locale, 'empty.title')}</h1>
            <p className="t-body secondary">{t(locale, 'empty.body')}</p>
          </header>

          {emptySections.map((section) => (
            <section className="section" key={section.idx}>
              <div className="rule-solid">
                <div className="section-head">
                  <span className="idx">{section.idx}</span>
                  <div>
                    <h2 className="t-h2">{t(locale, section.title)}</h2>
                    <p className="section-sub">{t(locale, section.sub)}</p>
                  </div>
                </div>
                <p className="t-body muted">{t(locale, 'section.none')}</p>
              </div>
            </section>
          ))}

          <div className="owner-block">
            <div className="t-label">{t(locale, 'empty.owner')}</div>
            <p className="t-ui" style={{ margin: '6px 0 2px' }}>
              {owner ?? '—'}
            </p>
            <p className="t-caption">
              {ownerChannel} · {t(locale, 'empty.owner.sub')}
            </p>
            <p className="t-caption" style={{ marginTop: 10 }}>
              {t(locale, 'empty.hint')}
            </p>
          </div>

          <div className="row" style={{ marginTop: 18 }}>
            <Link href="/ask" className="btn">
              {t(locale, 'answer.askAgain')}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const hasTrace = (answer.trace?.length ?? 0) > 0;

  return (
    <main className="page">
      <div className="document">
        <header className="answer-head">
          <h1 className="t-h1">{answer.question}</h1>
          <div className="answer-meta">
            <span className="t-mono">v{answer.version}</span>
            <span className="t-mono">
              {sourceCount} {t(locale, 'answer.sources')}
            </span>
            <span className="t-mono">{formatDateTime(answer.createdAt, locale)}</span>
            <span className="t-mono">{lang === 'en' ? 'EN' : 'ID'}</span>
          </div>

          {answer.notices.map((notice) => (
            <div className="notice" key={notice.id}>
              <span className="tag">{t(locale, `notice.${notice.kind}` as never)}</span>
              <span>{lang === 'en' ? notice.textEn : notice.textId}</span>
            </div>
          ))}

          <div className="answer-actions">
            <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => void reask(answer.question)}>
              {busy ? t(locale, 'answer.loading') : t(locale, 'answer.reask')}
            </button>
            <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => void ingest(answer.question)}>
              {t(locale, 'answer.ingest')}
            </button>
            {answer.verification ? (
              <span className={answer.verification.passed ? 'verified' : 'verified flagged'}>
                {answer.verification.cited}/{answer.verification.claims}{' '}
                {lang === 'en' ? 'claims cited' : 'klaim bersitasi'}
              </span>
            ) : null}
          </div>
        </header>

        {answer.lead ? (
          <div className="lead">
            <div className="t-label">{t(locale, 'lead.label')}</div>
            <p className="lead-text">
              <RichText
                text={lang === 'en' ? answer.lead.textEn : answer.lead.textId}
                onCite={(marker) => {
                  const citation = citationByMarker.get(marker);
                  if (citation) setOpenCitation(citation);
                }}
              />
            </p>
          </div>
        ) : null}

        {hasTrace ? (
          <AgentTrace steps={answer.trace ?? []} locale={locale} passed={answer.verification?.passed} />
        ) : null}

        <section className="section">
          <div className="rule-solid">
            <div className="section-head">
              <span className="idx">01</span>
              <div>
                <h2 className="t-h2">{t(locale, 'section.chronology')}</h2>
                <p className="section-sub">{t(locale, 'section.chronology.sub')}</p>
              </div>
            </div>

            <ol className="ledger">
              {answer.chronology.map((event) => (
                <li className="ledger-row" key={event.id}>
                  <div className="ledger-date">{formatDate(event.at, locale)}</div>
                  <div>
                    <div className="ledger-title">
                      <span className="t-h3">{event.title}</span>
                      {event.citations.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="cite"
                          onClick={(clickEvent) => {
                            lastCite.current = clickEvent.currentTarget;
                            setOpenCitation(c);
                          }}
                          aria-expanded={openCitation?.id === c.id}
                          aria-label={`${t(locale, 'drawer.title')} ${c.marker}`}
                        >
                          [{c.marker}]
                        </button>
                      ))}
                    </div>
                    {event.detail ? (
                      <p className="ledger-detail">
                        {lang === 'en' ? event.detailEn ?? event.detail : event.detail}
                      </p>
                    ) : null}
                    {event.conflict ? (
                      <div className="conflict">
                        <span className="flag">⚑</span>
                        <span>{conflictText(event.conflict, markers, locale)}</span>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section">
          <div className="rule-solid">
            <div className="section-head">
              <span className="idx">02</span>
              <div>
                <h2 className="t-h2">{t(locale, 'section.open')}</h2>
                <p className="section-sub">{t(locale, 'section.open.sub')}</p>
              </div>
            </div>

            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>{t(locale, 'table.item')}</th>
                    <th>{t(locale, 'table.owner')}</th>
                    <th>{t(locale, 'table.due')}</th>
                    <th>{t(locale, 'table.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {answer.openItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="muted">
                        {t(locale, 'section.open.none')}
                      </td>
                    </tr>
                  ) : (
                    answer.openItems.map((item: OpenItem) => (
                      <tr key={item.id}>
                        <td>
                          <span className="t-ui">{item.title}</span>{' '}
                          <button
                            type="button"
                            className="cite"
                            onClick={() => setOpenCitation(item.citation)}
                          >
                            [{item.citation.marker}]
                          </button>
                        </td>
                        <td className="t-ui-sm">{item.ownerName ?? t(locale, 'table.noowner')}</td>
                        <td className="t-mono">
                          {item.due ? formatDate(item.due, locale) : t(locale, 'table.nodue')}
                        </td>
                        <td>
                          <span className={PILL[item.status]}>
                            {t(locale, `status.${item.status}` as never)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="rule-dashed">
            <div className="section-head">
              <span className="idx">03</span>
              <div>
                <h2 className="t-h2">{t(locale, 'section.gaps')}</h2>
                <p className="section-sub">{t(locale, 'section.gaps.sub')}</p>
              </div>
            </div>

            {answer.gaps.length === 0 ? (
              <p className="t-body-sm muted">{t(locale, 'section.gaps.none')}</p>
            ) : (
              answer.gaps.map((gap) => (
                <div className="gap-card" key={gap.id} style={{ marginTop: 14 }}>
                  <div className="gap-id">{gap.id}</div>
                  <div className="gap-grid">
                    <div>
                      <div className="gap-kv">{t(locale, 'gap.missing')}</div>
                      <p className="t-h3" style={{ margin: 0 }}>
                        {lang === 'en' ? gap.whatIsMissingEn : gap.whatIsMissing}
                      </p>
                      {gap.whyItMatters ? (
                        <p className="t-body-sm secondary" style={{ marginTop: 8 }}>
                          {lang === 'en' ? gap.whyItMattersEn ?? gap.whyItMatters : gap.whyItMatters}
                        </p>
                      ) : null}

                      <div className="draft">
                        <div className="gap-kv">{t(locale, 'gap.draft')}</div>
                        {lang === 'en' ? gap.draftQuestionEn : gap.draftQuestion}
                      </div>
                    </div>

                    <div>
                      {gap.knower ? (
                        <>
                          <div className="gap-kv">{t(locale, 'gap.knower')}</div>
                          <div className="t-ui">{gap.knower.name}</div>
                          <div className="t-caption">{t(locale, 'gap.knower.basis')}</div>
                        </>
                      ) : null}

                      <div style={{ marginTop: 16 }}>
                        {gap.approval?.state === 'draft' ? (
                          <button type="button" className="btn" onClick={() => setReviewGap(gap)}>
                            {t(locale, 'gap.review')}
                          </button>
                        ) : gap.approval ? (
                          <span className={PILL[gap.approval.state]}>
                            {t(locale, `status.${gap.approval.state}` as never)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {openCitation ? (
        <SourceDrawer
          citation={openCitation}
          meta={sourceMeta[openCitation.sourceId]}
          locale={locale}
          onClose={closeDrawer}
        />
      ) : null}

      {reviewGap && reviewGap.approval ? (
        <>
          <button className="scrim" aria-label="Close" onClick={() => setReviewGap(null)} />
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="approval-title">
            <h2 className="t-h2" id="approval-title">
              {t(locale, 'gap.approval.title')}
            </h2>
            <p className="t-caption">{t(locale, 'gap.approval.pending')}</p>

            <div className="field-label">{t(locale, 'gap.approval.recipient')}</div>
            <div className="field-value">{reviewGap.approval.recipientName}</div>

            <div className="field-label">{t(locale, 'gap.approval.channel')}</div>
            <div className="field-value">{reviewGap.approval.channelLabel}</div>

            <div className="field-label">{t(locale, 'gap.approval.text')}</div>
            <div className="field-value">
              {lang === 'en' ? reviewGap.draftQuestionEn : reviewGap.draftQuestion}
            </div>

            <p className="t-caption" style={{ marginTop: 14 }}>
              {t(locale, 'gap.approval.simulated')}
            </p>

            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => void decide(reviewGap, 'cancel')}>
                {t(locale, 'gap.approval.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void decide(reviewGap, 'approve')}
              >
                {t(locale, 'gap.approval.confirm')}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}

function AgentTrace({
  steps,
  locale,
  passed,
}: {
  steps: AgentStep[];
  locale: Locale;
  passed?: boolean;
}) {
  const total = steps.reduce((n, s) => n + s.ms, 0);

  return (
    <details className="trace">
      <summary>
        <span className="trace-title">{t(locale, 'trace.title')}</span>
        <span className="t-mono">
          {steps.length} {t(locale, 'trace.steps')} · {total} ms ·{' '}
          {passed ? t(locale, 'trace.passed') : t(locale, 'trace.flagged')}
        </span>
      </summary>
      <ol className="trace-list">
        {steps.map((step) => (
          <li key={step.id} className="trace-row" data-status={step.status}>
            <span className="t-mono trace-tool">{step.tool}</span>
            <span className="trace-detail">
              <span className="t-ui-sm">{locale === 'en' ? step.labelEn : step.labelId}</span>
              <span className="t-caption" style={{ display: 'block' }}>
                {locale === 'en' ? step.detailEn : step.detailId}
              </span>
            </span>
            <span className="t-mono">{step.ms} ms</span>
          </li>
        ))}
      </ol>
      <p className="t-caption" style={{ marginTop: 10 }}>
        {t(locale, 'trace.note')}
      </p>
    </details>
  );
}

function SourceDrawer({
  citation,
  meta,
  locale,
  onClose,
}: {
  citation: Citation;
  meta: SourceMeta | undefined;
  locale: Locale;
  onClose: () => void;
}) {
  const masked = citation.quote.includes('••••');

  return (
    <>
      <button className="scrim" aria-label="Close" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={t(locale, 'drawer.title')}>
        <div className="drawer-head">
          <div className="row">
            <span className="pill pill-open">
              {meta ? t(locale, `kind.${meta.kind}` as never) : t(locale, 'drawer.title')}
            </span>
            <span className="t-mono">[{citation.marker}]</span>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>

        <div className="drawer-body">
          <h2 className="t-h3" style={{ marginBottom: 14 }}>
            {meta?.title ?? citation.sourceId}
          </h2>

          <dl className="meta-block">
            <dt>{t(locale, 'drawer.author')}</dt>
            <dd>{meta?.authorName ?? '—'}</dd>
            <dt>{t(locale, 'drawer.date')}</dt>
            <dd>{meta ? formatDate(meta.at, locale) : '—'}</dd>
            <dt>{t(locale, 'drawer.locator')}</dt>
            <dd>{citation.locator}</dd>
            {meta?.version ? (
              <>
                <dt>{t(locale, 'drawer.version')}</dt>
                <dd>v{meta.version}</dd>
              </>
            ) : null}
            <dt>{t(locale, 'drawer.kind')}</dt>
            <dd>{citation.sourceId}</dd>
          </dl>

          <div className="quote">{citation.quote}</div>
          {masked ? <p className="masked-note">{t(locale, 'drawer.masked')}</p> : null}
        </div>
      </aside>
    </>
  );
}
