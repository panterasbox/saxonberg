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
      d.data = { key, given, surname };
      return d;
    };
    vi.spyOn(DocumentApi, 'listOfKind').mockResolvedValue([
      doc('orcish', ['Gorruk', 'Mogra'], ['Ironmaw']),
      doc('common', ['Alden', 'Cora'], ['Reed']),
    ]);

    const pools = await NameBank.resolve(['orcish', 'common']);
    expect(pools.given).toEqual(
      expect.arrayContaining(['Gorruk', 'Mogra', 'Alden', 'Cora']),
    );
    expect(pools.surname).toEqual(expect.arrayContaining(['Ironmaw', 'Reed']));
  });

  it('skips unseeded banks silently', async () => {
    vi.spyOn(DocumentApi, 'listOfKind').mockResolvedValue([]);
    const pools = await NameBank.resolve(['missing']);
    expect(pools.given).toEqual([]);
    expect(pools.surname).toEqual([]);
  });
});

describe('Species.suggestName', () => {
  function halflingSpecies(): Species {
    const s = makeStuff(() => new Species());
    s.setNameBankKeys(['halfling']);
    return s;
  }

  it('biases the given name toward the real name initial', async () => {
    vi.spyOn(NameBank, 'resolve').mockResolvedValue({
      given: ['Bobalu', 'Bramble', 'Marigold', 'Dello'],
      surname: ['Smallberries', 'Underhill'],
      styles: [],
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
    });
    const s = halflingSpecies();
    const sug = await s.rerollName();
    expect(['Aelar', 'Caelen', 'Thalion']).toContain(sug.name);
    expect(sug.surname).toBe('Moonwhisper');
  });
});
