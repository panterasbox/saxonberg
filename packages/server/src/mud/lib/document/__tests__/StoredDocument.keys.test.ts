/**
 * The catalogue card (documents path identity, D1/D4): every document's
 * `keys` is DERIVED from its data by its kind's declaration, and
 * `DocumentApi.findByKey` issues one query shape the wildcard index serves.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StoredDocument } from '../StoredDocument';
import { DocumentApi } from '../../../api/document';
import { PersistenceManager } from '../../../../backend/PersistenceManager';

describe('StoredDocument.cardOf — the card is derived, never authored', () => {
  it('a release carries publishedAt and pinned', () => {
    expect(
      StoredDocument.cardOf('release', '/org/press/releases/r1', {
        publishedAt: 1234,
        pinned: true,
        headline: 'x',
      }),
    ).toEqual({ publishedAt: 1234, pinned: true });
  });

  it('a typed-word kind carries its leaf as `word`', () => {
    expect(StoredDocument.cardOf('emote', '/expression/emotes/smile', {})).toEqual({
      word: 'smile',
    });
  });

  it('a recipe carries its word and its output template', () => {
    expect(
      StoredDocument.cardOf('recipe', '/stuff/recipes/stool', {
        outputTemplate: '/stuff/thing/stool',
      }),
    ).toEqual({ word: 'stool', output: '/stuff/thing/stool' });
  });

  it('a key with no value is left off the card', () => {
    expect(StoredDocument.cardOf('recipe', '/stuff/recipes/stool', {})).toEqual({
      word: 'stool',
    });
  });

  it('a kind with no declaration — or a runtime kind outside the vocabulary — has an empty card', () => {
    expect(StoredDocument.cardOf('map', '/home/a/map/x', { places: [] })).toEqual({});
    expect(StoredDocument.cardOf('venue-eighty-six', '/w/x', { a: 1 })).toEqual({});
  });

  it('refuses a document with no path — the path is the identity', () => {
    expect(() => StoredDocument.cardOf('emote', '', {})).toThrow(/no path/);
  });
});

describe('DocumentApi.findByKey — the one shape the wildcard index serves', () => {
  let seen: Array<{ query: Record<string, unknown>; options: unknown }>;
  beforeEach(() => {
    seen = [];
    const pm = PersistenceManager.get();
    vi.spyOn(pm, 'isConnected').mockReturnValue(true);
    vi.spyOn(pm, 'find').mockImplementation(async (_c: string, query: Record<string, unknown>, options?: unknown) => {
      seen.push({ query, options });
      return [] as never;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('equality on a key, kind first', async () => {
    await DocumentApi.findByKey('emote', 'word', { eq: 'smile' });
    expect(seen[0]!.query).toEqual({ kind: 'emote', 'keys.word': 'smile' });
  });

  it('newest first, bounded above, capped', async () => {
    await DocumentApi.findByKey('release', 'publishedAt', { max: 99, order: 'desc', limit: 30 });
    expect(seen[0]!.query).toEqual({ kind: 'release', 'keys.publishedAt': { $lte: 99 } });
    expect(seen[0]!.options).toEqual({ sort: { 'keys.publishedAt': -1 }, limit: 30 });
  });

  it('an ordered read with no bound still constrains the key, so the sort is on the index', async () => {
    await DocumentApi.findByKey('release', 'publishedAt', { order: 'asc' });
    expect(seen[0]!.query).toEqual({ kind: 'release', 'keys.publishedAt': { $exists: true } });
  });

  it('a prefix is a path range, never a regex', async () => {
    await DocumentApi.findByKey('recipe', 'word', { eq: 'stool', prefix: '/trade/carpentry' });
    expect(seen[0]!.query.path).toEqual({
      $gte: '/trade/carpentry/',
      $lt: '/trade/carpentry/\uffff',
    });
  });

  it('a subtree listing is a path range too — never a collection scan', async () => {
    await DocumentApi.list('/home/iris');
    expect(seen[0]!.query).toEqual({
      $or: [
        { path: '/home/iris' },
        { path: { $gte: '/home/iris/', $lt: '/home/iris/\uffff' } },
      ],
    });
  });
});
