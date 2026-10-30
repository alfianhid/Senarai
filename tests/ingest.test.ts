import { beforeEach, describe, expect, it } from 'vitest';
import { handleAsk, handleIngest } from '@/lib/api/handlers';
import { store } from '@/lib/store/session';

/**
 * "Responses remain current as new messages are ingested" is a bonus
 * requirement that is easy to claim and easy to disprove. This exercises it:
 * a message arrives, and the next answer to the same question contains it.
 */
describe('live ingestion', () => {
  beforeEach(() => {
    store.ingested.length = 0;
    store.askCounts.clear();
    store.dataVersion = 1;
  });

  const ask = (question: string) =>
    handleAsk({ question, projectId: 'makassar-q4', actorId: 'A1', locale: 'id' });

  it('adds an ingested source to the next answer to the same question', async () => {
    const before = await ask('Kenapa stok telat di Makassar?');
    expect(before.payload.chronology.some((e) => e.title.includes('berita acara'))).toBe(false);

    const ingested = handleIngest({
      projectId: 'makassar-q4',
      kind: 'chat',
      title: 'Vendor menandatangani berita acara',
      body: 'Vendor sudah menandatangani berita acara keterlambatan.',
      topicTags: ['vendor.contract', 'ops'],
      authorId: 'A1',
      actorId: 'A1',
    });
    expect(ingested.ok).toBe(true);

    const after = await ask('Kenapa stok telat di Makassar?');
    expect(after.payload.chronology.some((e) => e.title.includes('berita acara'))).toBe(true);
    expect(after.payload.notices.some((n) => n.kind === 'updated')).toBe(true);
    expect(after.payload.version).toBe(2);
  });

  it('does not let ingestion bypass permission: a new vendor.contract message stays unreadable to staff', async () => {
    handleIngest({
      projectId: 'makassar-q4',
      kind: 'chat',
      title: 'Catatan denda vendor',
      body: 'Denda vendor sudah dihitung dan disepakati.',
      topicTags: ['vendor.contract'],
      authorId: 'A1',
      actorId: 'A1',
    });

    const asStaff = await ask('Berapa denda kontrak Anugrah?');
    expect(asStaff.payload.canonical).toBe(true);

    const asManager = await handleAsk({
      question: 'Berapa denda kontrak Anugrah?',
      projectId: 'makassar-q4',
      actorId: 'A2',
      locale: 'id',
    });
    expect(asManager.payload.canonical).toBe(false);
  });

  it('rejects an ingest with no title or body', () => {
    const result = handleIngest({
      projectId: 'makassar-q4',
      kind: 'chat',
      title: '   ',
      body: '',
      topicTags: [],
      authorId: 'A1',
      actorId: 'A1',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects an ingest into a project that does not exist', () => {
    const result = handleIngest({
      projectId: 'no-such-project',
      kind: 'chat',
      title: 'x',
      body: 'y',
      topicTags: [],
      authorId: 'A1',
      actorId: 'A1',
    });
    expect(result.ok).toBe(false);
  });
});
