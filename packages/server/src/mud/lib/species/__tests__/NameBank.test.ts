/**
 * NameBank + the Species name suggester. The suggester's *content* (the
 * pools) is a Document collection; here we mock the resolver and assert
 * the riff logic: a real-name-initial bias on suggest, a fresh draw on
 * reroll, the union across blended banks, and graceful empty-bank
 * fallback.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import Species from '../../../obj/species/Species';
import { NameBank } from '../NameBank';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

afterEach(() => {
  vi.restoreAllMocks();
  NameBank.clearCache();
  StuffApi.clearAll();
});

describe('NameBank.resolve', () => {
  it('unions the pools across multiple referenced banks', async () => {
    vi.spyOn(NameBank, 'find').mockImplementation(async (q: unknown) => {
      const key = (q as { key: string }).key;
      const bank = new NameBank();
      bank.key = key;
      if (key === 'orcish') {
        bank.given = ['Gorruk', 'Mogra'];
        bank.surname = ['Ironmaw'];
      } else if (key === 'common') {
        bank.given = ['Alden', 'Cora'];
        bank.surname = ['Reed'];
      }
      return [bank];
    });

    const pools = await NameBank.resolve(['orcish', 'common']);
    expect(pools.given).toEqual(
      expect.arrayContaining(['Gorruk', 'Mogra', 'Alden', 'Cora']),
    );
    expect(pools.surname).toEqual(expect.arrayContaining(['Ironmaw', 'Reed']));
  });

  it('skips unseeded banks silently', async () => {
    vi.spyOn(NameBank, 'find').mockResolvedValue([]);
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
