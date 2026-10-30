import type { Locale } from '@/types/domain';

export function formatDate(iso: string, locale: Locale): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDay(iso: string, locale: Locale): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-GB', {
    day: '2-digit',
    month: 'short',
  }).format(d);
}

export function formatTime(iso: string, locale: Locale): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatDateTime(iso: string, locale: Locale): string {
  return `${formatDate(iso, locale)} · ${formatTime(iso, locale)}`;
}

export function groupThread(iso: string): 'today' | 'week' | 'earlier' {
  const now = new Date();
  const then = new Date(iso);
  const diffDays = Math.floor((now.getTime() - then.getTime()) / 86400000);
  if (diffDays <= 0) return 'today';
  if (diffDays <= 7) return 'week';
  return 'earlier';
}
