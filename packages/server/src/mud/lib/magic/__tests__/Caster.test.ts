/**
 * CasterMixin — the anatomical casting faculty: species-gated activation
 * (the innate-conferral leg), depth-derived mana capacity (absolute pt
 * avail/max), serenity-rate reconcile-on-read recovery, overchannel
 * hysteresis-clear, and the live drained-vs-rested composure read.
 * Driven through the real `WorldClockApi` test seam (the metabolism
 * reconcile-test harness).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Character } from "../../character/Character";
import Species from "../../species/Species";
import { Quantity } from "../../quantity";
import { MixinApi } from "../../../api/mixin";
import { WorldClockApi } from "../../../api/worldclock";
import "../../../obj/WorldClockRegistry"; // register the registry class
import {
  makeStuff,
  stampTemplatePathForTest,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import { Faculty, type FacultyProfile } from "../Faculty";
import { MANA_RESERVE_KEY, OVERCHANNEL_STRAIN_PATH } from "../Caster";

class TestCharacter extends Character {}

const SCALE = 12;
let real = 0;
let seq = 0;

function makeActor(profile: FacultyProfile | null, confers = true): TestCharacter {
  const n = seq++;
  const species = makeStuff(() => new Species());
  if (profile) species.setFacultyProfile(profile);
  if (confers) species.setInnateMixins(["CasterMixin"]);
  stampTemplatePathForTest(species, `/lib/species/test/caster-${n}`);
  const actor = makeStuff(() => new TestCharacter());
  actor.setSpecies(species);
  return actor;
}

/** Advance game-time, forcing the lazy faculty reconcile each chunk. */
function advance(c: TestCharacter, gameSec: number, chunkSec = 3000): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const s = Math.min(chunkSec, remaining);
    real += (s / SCALE) * 1000;
    c.reconcileFaculty();
    remaining -= s;
  }
}

describe("CasterMixin — the anatomical faculty", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  // NO StuffApi.clearAll() — it wipes the WorldClockRegistry from the
  // byTemplatePath index while the logic keeps a cached ref, so the
  // reconcile clock-guard early-returns forever after (the
  // ElectricityLogic.sustain-test precedent).
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it("is active iff the species confers it (the isMaker activation shape)", () => {
    const caster = makeActor({ depth: "mid", serenity: "mid", composure: "mid" });
    const beast = makeActor(null, false);
    const profileButNoConferral = makeActor(
      { depth: "mid", serenity: "mid", composure: "mid" },
      false,
    );
    expect(MixinApi.isCaster(caster)).toBe(true);
    expect(caster.isCastingCapable()).toBe(true);
    expect(MixinApi.isCaster(beast)).toBe(false);
    expect(beast.isCastingCapable()).toBe(false);
    // conferral without a profile / profile without conferral both refuse
    expect(profileButNoConferral.isCastingCapable()).toBe(false);
  });

  it("installs the mana pool once, capacity from the depth band, in pt", () => {
    const deep = makeActor({ depth: "high", serenity: "mid", composure: "mid" });
    const shallow = makeActor({ depth: "low", serenity: "mid", composure: "mid" });
    deep.installArcaneReserve();
    shallow.installArcaneReserve();

    const deepPool = deep.getReserve(MANA_RESERVE_KEY)!;
    const shallowPool = shallow.getReserve(MANA_RESERVE_KEY)!;
    expect(deepPool.capacity.unit).toBe("pt");
    expect(deepPool.capacity.rawValue()).toBe(Faculty.capacityFor("high"));
    expect(shallowPool.capacity.rawValue()).toBe(Faculty.capacityFor("low"));
    // a deep mage has a BIGGER TANK, not discounted spells
    expect(deepPool.capacity.rawValue()).toBeGreaterThan(
      shallowPool.capacity.rawValue(),
    );
    // idempotent — a second install doesn't reset a drained pool
    deep.adjustReserve(MANA_RESERVE_KEY, Quantity.of(-50, "pt"));
    deep.installArcaneReserve();
    expect(deep.getReserve(MANA_RESERVE_KEY)!.current.rawValue()).toBe(
      deepPool.capacity.rawValue() - 50,
    );
    // a non-caster never installs one
    const beast = makeActor(null, false);
    beast.installArcaneReserve();
    expect(beast.hasReserve(MANA_RESERVE_KEY)).toBe(false);
  });

  it("recovers at the serenity-banded rate over game-time", () => {
    const serene = makeActor({ depth: "mid", serenity: "high", composure: "mid" });
    const restless = makeActor({ depth: "mid", serenity: "low", composure: "mid" });
    for (const c of [serene, restless]) {
      c.installArcaneReserve();
      c.adjustReserve(MANA_RESERVE_KEY, Quantity.of(-80, "pt"));
      c.reconcileFaculty(); // seed the stamp
    }
    const sereneBefore = serene.getReserve(MANA_RESERVE_KEY)!.current.rawValue();

    // Advance both in lockstep (the shared-clock far-past discipline).
    let remaining = 1800; // 30 game-min
    while (remaining > 0) {
      const s = Math.min(3000, remaining);
      real += (s / SCALE) * 1000;
      serene.reconcileFaculty();
      restless.reconcileFaculty();
      remaining -= s;
    }

    const sereneGain =
      serene.getReserve(MANA_RESERVE_KEY)!.current.rawValue() - sereneBefore;
    const restlessGain =
      restless.getReserve(MANA_RESERVE_KEY)!.current.rawValue() -
      (Faculty.capacityFor("mid") - 80);
    expect(sereneGain).toBeGreaterThan(0);
    expect(restlessGain).toBeGreaterThan(0);
    expect(sereneGain).toBeGreaterThan(restlessGain);
    // recovery clamps at capacity
    advance(serene, 3600 * 3.5, 3000);
    expect(serene.getReserve(MANA_RESERVE_KEY)!.current.rawValue()).toBe(
      Faculty.capacityFor("mid"),
    );
  });

  it("clears overchannel strain by hysteresis once the pool recovers", () => {
    const c = makeActor({ depth: "mid", serenity: "high", composure: "mid" });
    c.installArcaneReserve();
    // Drain to empty + afflict the strain (as the cast pipeline does).
    const cap = Faculty.capacityFor("mid");
    c.adjustReserve(MANA_RESERVE_KEY, Quantity.of(-cap, "pt"));
    c.afflict({
      kind: "affliction",
      templatePath: OVERCHANNEL_STRAIN_PATH,
      stage: 2,
      elapsed: 0,
    });
    expect(c.isOverchannelStrained()).toBe(true);
    c.reconcileFaculty(); // seed the stamp — still strained (pool near empty)
    expect(c.isOverchannelStrained()).toBe(true);

    // Recover past the clear threshold (0.5 of capacity by default):
    // high serenity = 2.4 pt/game-min × 0.2 (stand) → ~86 pt over 3 h.
    advance(c, 3600 * 3, 3000);
    expect(c.getManaFraction()).toBeGreaterThanOrEqual(0.5);
    expect(c.isOverchannelStrained()).toBe(false);
  });

  it("reads composure live — a drained mage resists worse than a rested one", () => {
    const c = makeActor({ depth: "mid", serenity: "mid", composure: "mid" });
    c.installArcaneReserve();
    c.reconcileFaculty();
    const rested = c.getComposureFactor();
    c.adjustReserve(MANA_RESERVE_KEY, Quantity.of(-Faculty.capacityFor("mid"), "pt"));
    const drained = c.getComposureFactor();
    expect(drained).toBeLessThan(rested);
    // a non-caster reads the neutral default, never zero
    const beast = makeActor(null, false);
    expect(beast.getComposureFactor()).toBeGreaterThan(0);
  });

  it("speaks bands, never numbers, in the self-view", () => {
    const c = makeActor({ depth: "high", serenity: "low", composure: "mid" });
    c.installArcaneReserve();
    c.reconcileFaculty();
    const view = c.getFacultyView();
    expect(view).toEqual({
      capable: true,
      depth: "high",
      serenity: "low",
      composure: "mid",
      mana: "brimming",
      strained: false,
    });
    c.adjustReserve(
      MANA_RESERVE_KEY,
      Quantity.of(-Faculty.capacityFor("high") * 0.8, "pt"),
    );
    expect(c.getFacultyView().mana).toBe("ebbing");
    const beast = makeActor(null, false);
    expect(beast.getFacultyView()).toMatchObject({ capable: false, mana: null });
  });
});
