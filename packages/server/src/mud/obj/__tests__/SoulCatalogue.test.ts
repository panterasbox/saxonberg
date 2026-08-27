/**
 * SoulCatalogue over the document store (content-packs wave 2): warms
 * from `DocumentApi.listOfKind('emote')`; `resolve` is CANONICAL-ONLY
 * (a search term never dispatches — the `;grin` criterion); `search`
 * finds by verb / tag / search term; `snapshot` carries `searchTerms`
 * and no `aliases`; `mint` writes `/emotes/<verb>` through
 * `DocumentApi.save` and indexes it; `delete` calls `DocumentApi.delete`.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SoulCatalogue from '../SoulCatalogue';
import { SoulApi } from '../../api/soul';
import { DocumentApi } from '../../api/document';
import { StuffApi } from '../../api/stuff';
import { StoredDocument } from '../../lib/document/StoredDocument';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

function doc(path: string, data: Record<string, unknown>): StoredDocument {
  const d = new StoredDocument();
  d.path = path;
  d.owner = '/expression';
  d.kind = 'emote';
  d.data = data;
  return d;
}

const GRAMMAR = { slots: {}, template: '{{ actor }} does it.' };

let docs: StoredDocument[];
let save: ReturnType<typeof vi.fn>;
let del: ReturnType<typeof vi.fn>;

describe('SoulCatalogue (documents-backed)', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    makeStuffAtPath(() => new SoulCatalogue(), '/obj/SoulCatalogue');
    docs = [
      doc('/expression/emotes/greet', { verb: 'greet', searchTerms: ['hi', 'hello'], tags: ['greeting'], grammar: GRAMMAR }),
      doc('/expression/emotes/smirk', { verb: 'smirk', searchTerms: ['grin'], tags: ['joy'], grammar: GRAMMAR, emoji: '😏' }),
      doc('/expression/emotes/broken', { verb: 'broken' }), // no grammar: skipped loudly, never fatal
    ];
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(DocumentApi, 'listOfKind').mockImplementation(async () => docs);
    save = vi.spyOn(DocumentApi, 'save').mockResolvedValue(undefined) as never;
    del = vi.spyOn(DocumentApi, 'delete').mockResolvedValue(true) as never;
    void SoulApi.invalidateCache();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a disabled emote resolves null, is absent from all/snapshot/search, present via resolveAny', async () => {
    docs.push(doc('/expression/emotes/wave', { verb: 'wave', tags: ['greeting'], searchTerms: ['hey'], grammar: GRAMMAR, disabled: true }));
    expect(await SoulApi.resolve('wave')).toBeNull();
    expect((await SoulApi.all()).map((e) => e.verb)).not.toContain('wave');
    expect((await SoulApi.snapshot()).map((e) => e.verb)).not.toContain('wave');
    expect((await SoulApi.search('hey')).map((e) => e.verb)).toEqual([]);
    const any = await SoulApi.resolveAny('wave');
    expect(any?.verb).toBe('wave');
    expect(any?.disabled).toBe(true);
  });

  it('setDisabled writes the row through DocumentApi.save with the flag and updates the cache both ways', async () => {
    expect(await SoulApi.setDisabled('greet', true)).toBe(true);
    expect(save).toHaveBeenCalledWith('/expression/emotes/greet', 'emote', expect.objectContaining({ verb: 'greet', disabled: true }));
    expect(await SoulApi.resolve('greet')).toBeNull();
    expect(await SoulApi.setDisabled('greet', false)).toBe(true);
    expect((save.mock.calls.at(-1) as unknown[])[2]).not.toHaveProperty('disabled');
    expect((await SoulApi.resolve('greet'))?.verb).toBe('greet');
    expect(await SoulApi.setDisabled('nope', true)).toBe(false);
  });

  it('mint lands under the soul committee\'s extent (/expression/emotes)', async () => {
    await SoulApi.mint({ verb: 'bow', grammar: GRAMMAR });
    expect(save).toHaveBeenCalledWith('/expression/emotes/bow', 'emote', expect.objectContaining({ verb: 'bow' }));
  });

  it('resolve is canonical-only: a search term does not dispatch', async () => {
    expect((await SoulApi.resolve('greet'))?.verb).toBe('greet');
    expect(await SoulApi.resolve('hi')).toBeNull();
    expect(await SoulApi.resolve('grin')).toBeNull(); // only smirk's search term
    expect(await SoulApi.resolve('broken')).toBeNull(); // malformed row skipped
  });

  it('search finds by search term, by tag, and by verb', async () => {
    expect((await SoulApi.search('grin')).map((e) => e.verb)).toEqual(['smirk']);
    expect((await SoulApi.search('HI')).map((e) => e.verb)).toEqual(['greet']);
    expect((await SoulApi.search('joy')).map((e) => e.verb)).toEqual(['smirk']);
    expect((await SoulApi.search('smirk')).map((e) => e.verb)).toEqual(['smirk']);
    expect(await SoulApi.search('nothing')).toEqual([]);
  });

  it('snapshot carries searchTerms and never aliases', async () => {
    const snap = await SoulApi.snapshot();
    const greet = snap.find((e) => e.verb === 'greet')!;
    expect(greet.searchTerms).toEqual(['hi', 'hello']);
    expect('aliases' in greet).toBe(false);
    expect(snap.map((e) => e.verb).sort()).toEqual(['greet', 'smirk']);
  });

  it('mint writes /emotes/<verb> as an emote document and indexes it (verb + search terms)', async () => {
    const minted = await SoulApi.mint({ verb: 'Shrug', searchTerms: ['Meh'], grammar: GRAMMAR });
    expect(minted.path).toBe('/expression/emotes/shrug');
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]![0]).toBe('/expression/emotes/shrug');
    expect(save.mock.calls[0]![1]).toBe('emote');
    expect(save.mock.calls[0]![2]).toMatchObject({ verb: 'shrug', searchTerms: ['meh'], grammar: GRAMMAR });
    expect((await SoulApi.resolve('shrug'))?.verb).toBe('shrug');
    expect(await SoulApi.resolve('meh')).toBeNull();
    expect((await SoulApi.search('meh')).map((e) => e.verb)).toEqual(['shrug']);
    await expect(SoulApi.mint({ verb: 'shrug', grammar: GRAMMAR })).rejects.toThrow(/already exists/);
  });

  it('edit rewrites the document at its own path and re-indexes search terms', async () => {
    await SoulApi.edit('greet', { searchTerms: ['yo'] });
    expect(save.mock.calls[0]![0]).toBe('/expression/emotes/greet');
    expect((await SoulApi.search('yo')).map((e) => e.verb)).toEqual(['greet']);
    expect(await SoulApi.search('hi')).toEqual([]);
  });

  it('delete calls DocumentApi.delete at the document path and drops the cache entry', async () => {
    expect(await SoulApi.delete('smirk')).toBe(true);
    expect(del).toHaveBeenCalledWith('/expression/emotes/smirk');
    expect(await SoulApi.resolve('smirk')).toBeNull();
    expect(await SoulApi.search('grin')).toEqual([]);
    expect(await SoulApi.delete('smirk')).toBe(false);
  });
});
