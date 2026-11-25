/**
 * ⭐ A herd's own males serve her on the field — and a steer serves
 * nobody (organism-biology review: the survey found `breedRefusal` counted
 * every non-female head of the herd as a male, so a herd of cows and
 * steers "served").
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import Livestock from '../agent/Livestock';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ProxyApi } from '@saxonberg/server/mud/api/proxy';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

let seq = 0;

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

async function refusalWith(herd: { tally: number; femaleFraction?: number; neuteredFraction?: number }): Promise<string | null> {
  const kind = makeStuffAtPath(() => {
    const k = new Species();
    k.setSexDeterminationSystem('xy');
    return k;
  }, `/stuff/idea/species/_test/herd-males-${seq++}`);
  const cow = makeStuff(() => new Livestock());
  cow.setSpecies(kind);
  cow.setSex('female');
  // The herd she was drafted from (RAW_TARGET: the field the draft writes).
  (cow as unknown as Record<symbol, Livestock>)[ProxyApi.RAW_TARGET]!.herdId = 'h1';
  vi.spyOn(Livestock.prototype as unknown as { grazedFraction(): number | null }, 'grazedFraction').mockReturnValue(1);
  vi.spyOn(StuffApi, 'singleton').mockResolvedValue({ read: async () => herd } as never);
  return cow.breedRefusal();
}

describe('the herd\'s own males', () => {
  it('a herd with entire males serves her', async () => {
    expect(await refusalWith({ tally: 20, femaleFraction: 0.5 })).toBeNull();
  });

  it('⭐ a herd whose males are all steers does not', async () => {
    expect(await refusalWith({ tally: 20, femaleFraction: 0.5, neuteredFraction: 1 })).toBe('no-male');
  });

  it('two entire males in a mostly-cut herd are enough', async () => {
    expect(await refusalWith({ tally: 20, femaleFraction: 0.5, neuteredFraction: 0.8 })).toBeNull();
  });
});
