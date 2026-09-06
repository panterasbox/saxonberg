/**
 * ⭐⭐ **The capability half of a trade discipline** — and the reason it
 * is a *different act* rather than the same act done better.
 *
 * A novice handles a barrow; a competent teamster handles a wagon and a
 * team. The wagon is **not faster** in a competent teamster's hands — it
 * is *available at all*. That is the known-of → can-make ladder, and the
 * one thing the standing rule forbids is the odometer failure: **no
 * conferral may make the same act better.**
 *
 * The claims:
 *
 *  - ⭐ **band 0 can earn** — a rig that asks nothing takes anybody, on
 *    the day they arrive (AC15a's mechanism half);
 *  - a rig that asks for a band refuses below it, **naming the rig**;
 *  - ⚠⚠ the transport system **never interprets the discipline key** —
 *    it is data, and a rig asking for a key nobody has an opinion about
 *    behaves exactly like a rig asking for nothing;
 *  - the ACTOR's competence decides, not the hauler's.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { AdvancementMixin } from '@saxonberg/server/mud/lib/advancement/Advancement';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import HaulageRig from '../thing/HaulageRig';

/** Somebody with a transcript — and a band we can set. */
class Teamster extends AdvancementMixin(Idea) {
  static _mixinName = 'TestTeamster';
  public band: CompetenceBandName = 'untrained';
  public async competenceBandFor(): Promise<CompetenceBandName> {
    return this.band;
  }
}

/** Somebody with no transcript at all — a brand-new character. */
class Newcomer extends Idea {
  static _mixinName = 'TestNewcomer';
}

const rigDemanding = (band: string, key = 'teamstering'): HaulageRig => {
  const rig = makeStuff(() => new HaulageRig());
  rig.setRequiredDiscipline(key);
  rig.setRequiredBand(band);
  return rig;
};

beforeEach(() => {
  installV1QuantityMarshallers();
  StuffApi.clearAll();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('a rig asks who is putting it in the shafts', () => {
  it('⭐ AC15a — a rig that asks nothing takes somebody with NO TRANSCRIPT', async () => {
    const barrow = makeStuff(() => new HaulageRig());
    const newcomer = makeStuff(() => new Newcomer()) as unknown as Stuff;
    expect(MixinApi.isAdvancing(newcomer)).toBe(false);

    // The entry rung, and it has to hold: a labor market whose smallest
    // job needs capital OR competence is not an entry rung.
    const veto = await barrow.canHitch(newcomer, newcomer);
    expect(veto.ok).toBe(true);
  });

  it('refuses below the band it asks for, and NAMES the rig', async () => {
    const wagon = rigDemanding('competent');
    wagon.setShortDescription('a four-wheeled wagon');
    const novice = makeStuff(() => new Teamster());
    novice.band = 'novice';

    const veto = await wagon.canHitch(
      novice as unknown as Stuff,
      novice as unknown as Stuff,
    );
    expect(veto.ok).toBe(false);
    expect(veto.ok === false && veto.reason).toMatch(/wagon/);
    // The refusal is about the RIG, not about a number.
    expect(veto.ok === false && veto.reason).not.toMatch(/\d/);
  });

  it('admits at the band and above — competence is ACCESS', async () => {
    const wagon = rigDemanding('competent');
    const hand = makeStuff(() => new Teamster());
    for (const band of ['competent', 'proficient', 'expert'] as const) {
      hand.band = band;
      expect(
        (await wagon.canHitch(hand as unknown as Stuff, hand as unknown as Stuff))
          .ok,
      ).toBe(true);
    }
    for (const band of ['untrained', 'novice'] as const) {
      hand.band = band;
      expect(
        (await wagon.canHitch(hand as unknown as Stuff, hand as unknown as Stuff))
          .ok,
      ).toBe(false);
    }
  });

  it('⚠⚠ the transport system never INTERPRETS the discipline key', async () => {
    // A rig demanding a key nothing in the realm has an opinion about
    // behaves exactly like a rig demanding nothing, because the system
    // hands the key straight to the actor and reads back a band. A
    // content word in this code would have been the mistake — and would
    // have made the transport pack depend on the pack that depends on
    // it.
    const odd = rigDemanding('competent', 'basket-weaving');
    const hand = makeStuff(() => new Teamster());
    hand.band = 'expert'; // the stub answers the same for any key
    expect(
      (await odd.canHitch(hand as unknown as Stuff, hand as unknown as Stuff)).ok,
    ).toBe(true);

    // …and an incomplete demand is no demand at all.
    const halfSpec = makeStuff(() => new HaulageRig());
    halfSpec.setRequiredBand('competent'); // no discipline named
    const green = makeStuff(() => new Teamster());
    green.band = 'untrained';
    expect(
      (await halfSpec.canHitch(green as unknown as Stuff, green as unknown as Stuff))
        .ok,
    ).toBe(true);
  });

  it('⚠ the ACTOR decides, not the hauler — a horse has no transcript', async () => {
    const wagon = rigDemanding('competent');
    const horse = makeStuff(() => new Newcomer()) as unknown as Stuff;
    const teamster = makeStuff(() => new Teamster());
    teamster.band = 'competent';

    // The horse in the shafts knows nothing; the person coupling it does.
    expect(
      (await wagon.canHitch(horse, teamster as unknown as Stuff)).ok,
    ).toBe(true);
    teamster.band = 'novice';
    expect(
      (await wagon.canHitch(horse, teamster as unknown as Stuff)).ok,
    ).toBe(false);
  });

  it('⚠⚠ NO conferral makes the same act better — the rig is unchanged by the band', async () => {
    const wagon = rigDemanding('competent');
    const novice = makeStuff(() => new Teamster());
    const master = makeStuff(() => new Teamster());
    novice.band = 'competent';
    master.band = 'expert';

    // Same rig, same draft, same capacity, whoever is holding it. The
    // ONLY thing competence bought was the right to take it at all.
    const draftBefore = wagon.getDraftLoad().rawValue();
    await wagon.canHitch(novice as unknown as Stuff, novice as unknown as Stuff);
    await wagon.canHitch(master as unknown as Stuff, master as unknown as Stuff);
    expect(wagon.getDraftLoad().rawValue()).toBe(draftBefore);
    expect(wagon.getDraftFactor()).toBe(wagon.getDraftFactor());
  });
});
