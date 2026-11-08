/**
 * NameBank + the Species name suggester. The suggester's *content* (the
 * pools) is a Document collection; here we mock the resolver and assert
 * the riff logic: a real-name-initial bias on suggest, a fresh draw on
 * reroll, the union across blended banks, and graceful empty-bank
 * fallback.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, afterEach, vi } from 'vitest';
import Species from '../../../platform/idea/species/Species';
import { NameBank } from '../NameBank';
import { DocumentApi } from '../../../api/document';
import { DiagnosticApi } from '../../../api/diagnostics';
import { SpeciesApi } from '../../../api/species';
import { StoredDocument } from '../../document/StoredDocument';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

afterEach(() => {
  vi.restoreAllMocks();
  NameBank.clearCache();
  StuffApi.clearAll();
});

describe('NameBank.resolve', () => {
  it('unions the pools across multiple referenced banks', async () => {
    const doc = (key: string, given: string[], surname: string[]): StoredDocument => {
      const d = new StoredDocument();
      d.path = `/species-and-names/name-banks/${key}`;
      d.kind = 'name-bank';
      d.data = { given, surname };
      return d;
    };
    const banks = [doc('orcish', ['Gorruk', 'Mogra'], ['Ironmaw']), doc('common', ['Alden', 'Cora'], ['Reed'])];
    const read = vi
      .spyOn(DocumentApi, 'read')
      .mockImplementation(async (path: string) => banks.find((b) => b.path === path) ?? null);

    const pools = await NameBank.resolve([
      '/species-and-names/name-banks/orcish',
      '/species-and-names/name-banks/common',
    ]);
    expect(pools.given).toEqual(
      expect.arrayContaining(['Gorruk', 'Mogra', 'Alden', 'Cora']),
    );
    expect(pools.surname).toEqual(expect.arrayContaining(['Ironmaw', 'Reed']));
    // Read by path, once each, and kept: nothing lists the kind.
    await NameBank.resolve(['/species-and-names/name-banks/common']);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('records a bank no document backs, and skips it', async () => {
    vi.spyOn(DocumentApi, 'read').mockResolvedValue(null);
    const record = vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined as never);
    const pools = await SpeciesApi.resolveNamePools(['/species-and-names/name-banks/missing']);
    expect(pools.given).toEqual([]);
    expect(pools.surname).toEqual([]);
    expect(pools.missing).toEqual(['/species-and-names/name-banks/missing']);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/species-and-names/name-banks/missing', severity: 'error' }),
    );
  });
});

describe('Species.suggestName', () => {
  function halflingSpecies(): Species {
    const s = makeStuff(() => new Species());
    s.setNameBanks(['/species-and-names/name-banks/halfling']);
    return s;
  }

  it('biases the given name toward the real name initial', async () => {
    vi.spyOn(NameBank, 'resolve').mockResolvedValue({
      given: ['Bobalu', 'Bramble', 'Marigold', 'Dello'],
      surname: ['Smallberries', 'Underhill'],
      styles: [],
      missing: [],
    });
    const s = halflingSpecies();
    // Many trials: every suggestion for "Bobby" should keep the B.
    for (let i = 0; i < 12; i++) {
      const sug = await s.suggestName('Bobby Schaetzle');
      expect(sug.name[0]!.toLowerCase()).toBe('b');
      expect(['Smallberries', 'Underhill']).toContain(sug.surname);
    }
  });

  it('always returns a given name (intake is never blocked)', async () => {
    vi.spyOn(NameBank, 'resolve').mockResolvedValue({
      given: ['Bobalu'],
      surname: [],
      styles: [],
      missing: [],
    });
    const s = halflingSpecies();
    const sug = await s.suggestName(undefined);
    expect(sug.name).toBe('Bobalu');
    expect(sug.surname).toBeUndefined();
  });

  it('falls back to the real name when the bank is empty', async () => {
    vi.spyOn(NameBank, 'resolve').mockResolvedValue({
      given: [],
      surname: [],
      styles: [],
      missing: [],
    });
    const s = halflingSpecies();
    const sug = await s.suggestName('Zelda');
    expect(sug.name).toBe('Zelda');
  });

  it('rerollName draws without real-name bias', async () => {
    vi.spyOn(NameBank, 'resolve').mockResolvedValue({
      given: ['Aelar', 'Caelen', 'Thalion'],
      surname: ['Moonwhisper'],
      styles: [],
      missing: [],
    });
    const s = halflingSpecies();
    const sug = await s.rerollName();
    expect(['Aelar', 'Caelen', 'Thalion']).toContain(sug.name);
    expect(sug.surname).toBe('Moonwhisper');
  });
});
