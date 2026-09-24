/**
 * ⭐⭐ **The spoiled sample reads honestly of itself.**
 *
 * A perishable sample carried badly is not a reading that FAILS — it is
 * a true answer to the wrong question. The bench reports the thing in
 * front of it, which really did go off in the carrying, and a competent
 * assayer is the one who says so.
 *
 * ⚠ There is no second clock anywhere. The freshness band is the shipped
 * `FreshnessMixin` clock read as it stands now, and the TELL is derived
 * — elapsed since the sample's own stamp — not stored.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import ChemistryReading from '../ChemistryReading';
import { StuffApi } from '../../../../api/stuff';
import { WorldClockApi } from '../../../../api/worldclock';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Tooled } from '../../../../lib/craft/Tooled';
import type { CompetenceBandName } from '../../../../lib/advancement/CompetenceBand';
import { MixinApi } from '../../../../api/mixin';

/** A reading whose bench rung is reachable from a test. */
class Probe extends ChemistryReading {
  public run(
    sample: Stuff,
    band: CompetenceBandName,
  ): Promise<{ prose: string; value: number | null; unit: string; tell?: string | null } | null> {
    return (
      this as unknown as {
        benchRead(
          s: Stuff,
          b: Stuff & Tooled,
          d: CompetenceBandName,
        ): Promise<{ prose: string; value: number | null; unit: string; tell?: string | null } | null>;
      }
    ).benchRead(sample, {} as Stuff & Tooled, band);
  }
}

/** A portion of something perishable, taken `hoursAgo` hours ago. */
function portion(state: string, hoursAgo: number): Stuff {
  const nowMs = WorldClockApi.getNow().rawValue() * 1000;
  return {
    getMaterial: () => ({
      getName: () => 'milk',
      getComposition: () => [
        { materialPath: '/stuff/idea/material/food/milk', fraction: 1 },
      ],
    }),
    getFreshnessBand: () => state,
    getSampling: () => ({
      at: '/test/farm/dairy',
      by: 'p',
      on: nowMs - hoursAgo * 3_600_000,
    }),
  } as unknown as Stuff;
}

describe('ChemistryReading — the bench, and the spoiled sample', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  /**
   * ⚠ The two narrowings are stubbed rather than satisfied by a real
   * `Provision`, and deliberately: standing one up needs the material
   * roster, the freshness clock and a warmed catalogue, none of which
   * this rung's behaviour depends on. What IS under test is what the
   * rung SAYS — and a fixture that took four catalogues to build would
   * be testing the world rather than the sentence.
   */
  function asPerishableMatter(): void {
    vi.spyOn(MixinApi, 'isTangible').mockReturnValue(true as never);
    vi.spyOn(MixinApi, 'isFresh').mockReturnValue(true as never);
  }

  it('⭐ a fresh sample reads its composition and says nothing about a journey', async () => {
    asPerishableMatter();
    const r = makeStuff(() => new Probe());
    const said = await r.run(portion('fresh', 0.2), 'expert');
    expect(said?.prose).toMatch(/milk/);
    expect(said?.tell ?? null).toBeNull();
  });

  it('⭐⭐ a spoiled sample reads as SPOILED — a true answer, not a refusal', async () => {
    asPerishableMatter();
    const r = makeStuff(() => new Probe());
    const said = await r.run(portion('spoiled', 6), 'novice');
    expect(said?.prose).toMatch(/spoiled/);
    // ⚠ At `novice` there is no tell: the reading is right and the
    // reader cannot say what it is really about. That gap IS the
    // product — it is what a competent assayer is worth.
    expect(said?.tell ?? null).toBeNull();
  });

  it('⭐⭐ a COMPETENT assayer notices, and says what the reading is about', async () => {
    asPerishableMatter();
    const r = makeStuff(() => new Probe());
    const said = await r.run(portion('spoiled', 6), 'competent');
    expect(said?.tell).toMatch(/in the carrying/);
    expect(said?.tell).toMatch(/about the journey, not the batch/);
    expect(said?.tell).toMatch(/6 hours/);
  });
});
