import { describe, expect, it } from 'vitest';
import { handleAsk } from '@/lib/api/handlers';

const MIN_LATENCY_MS = 600;

// The latency floor does not make the system secure; it narrows the window in
// which an observer could compare a forbidden question against a normal one.
describe('latency floor (T04)', () => {
  it('takes at least 600ms to answer a normal question', async () => {
    const started = Date.now();
    await handleAsk({
      question: 'Kenapa stok telat di Makassar?',
      projectId: 'makassar-q4',
      actorId: 'A1',
      locale: 'id',
    });
    expect(Date.now() - started).toBeGreaterThanOrEqual(MIN_LATENCY_MS);
  }, 10_000);

  it('takes at least 600ms to return the canonical empty', async () => {
    const started = Date.now();
    const result = await handleAsk({
      question: 'Apa itu Proyek Kenari?',
      projectId: 'makassar-q4',
      actorId: 'A1',
      locale: 'id',
    });
    expect(Date.now() - started).toBeGreaterThanOrEqual(MIN_LATENCY_MS);
    expect(result.payload.canonical).toBe(true);
  }, 10_000);

  it('does not echo a forbidden question into the audit log', async () => {
    const result = await handleAsk({
      question: 'Berapa denda kontrak Anugrah?',
      projectId: 'makassar-q4',
      actorId: 'A1',
      locale: 'id',
    });
    expect(result.payload.question).toBe('');
    expect(result.payload.canonical).toBe(true);
  }, 10_000);
});
