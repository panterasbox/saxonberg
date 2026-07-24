/**
 * The `SustainedEffect` condition kind + the magic reconcile arms —
 * modifier realization by pull (bound-orb flux, imposed cloak), dormancy
 * un-realization (the suppression flag, inert until the field sets it),
 * timed expiry → release, tag-keyed dread decay. The SustainedShock
 * reconcile-arm precedent, driven through the WorldClockApi test seam.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Character } from "../../character/Character";
import Species from "../../species/Species";
import Thing from "../../stuff/Thing";
import { LightSourceMixin } from "../../perception/LightSource";
import { StuffApi } from "../../../api/stuff";
import { WorldClockApi } from "../../../api/worldclock";
import "../../../obj/WorldClockRegistry";
import {
  makeStuff,
  stampTemplatePathForTest,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import type { SustainedEffect, AfflictionRecord } from "../../vitals/Condition";
import type { MagicProvenance } from "../Grid";

class TestCharacter extends Character {}
class TestOrb extends LightSourceMixin(Thing) {
  static _mixinName = "TestOrbMagic";
}

const SCALE = 12;
let real = 0;
let seq = 0;

const ORIGIN: MagicProvenance = {
  verb: "create",
  noun: "light",
  spellId: "glowlight",
  caster: "/obj/Avatar/test",
};

function makeActor(): TestCharacter {
  const n = seq++;
  const species = makeStuff(() => new Species());
  stampTemplatePathForTest(species, `/lib/species/test/sustained-${n}`);
  const actor = makeStuff(() => new TestCharacter());
  actor.setSpecies(species);
  return actor;
}

/** Advance game-time and force the lazy conditions reconcile. */
function advance(c: TestCharacter, gameSec: number): void {
  real += (gameSec / SCALE) * 1000;
  c.getConditions().length; // any read would do…
  c.getVitalSign("heartRate"); // …this one runs reconcileConditions
}

const gameNow = (): number => WorldClockApi.getNow().rawValue();

describe("SustainedEffect — the modifier condition kind", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it("realizes a bound light emitter by pull, and dormancy un-realizes it", () => {
    const actor = makeActor();
    const orb = makeStuff(() => new TestOrb());
    const effect: SustainedEffect = {
      kind: "sustained",
      spellId: "glowlight",
      realizes: "emit-light",
      magicOrigin: ORIGIN,
      boundStuffId: orb.stuffId,
    };
    actor.afflict(effect);
    advance(actor, 1); // first touch stamps + realizes
    expect(orb.getEmittedFlux().rawValue()).toBe(500); // magic.glowlight.lumens fallback

    // suppression sets the flag (P7's job); the arm un-realizes on pull
    effect.dormant = true;
    advance(actor, 5);
    expect(orb.getEmittedFlux().rawValue()).toBe(0);

    // out of the field — re-realizes
    effect.dormant = false;
    advance(actor, 5);
    expect(orb.getEmittedFlux().rawValue()).toBe(500);
  });

  it("expires on schedule, destructing the bound emitter", () => {
    const actor = makeActor();
    const orb = makeStuff(() => new TestOrb());
    const orbId = orb.stuffId;
    advance(actor, 1); // establish a stamp epoch
    actor.afflict({
      kind: "sustained",
      spellId: "glowlight",
      realizes: "emit-light",
      magicOrigin: ORIGIN,
      boundStuffId: orbId,
      expiresAt: gameNow() + 600,
    } satisfies SustainedEffect);
    advance(actor, 10); // alive
    expect(actor.hasCondition((c) => c.kind === "sustained")).toBe(true);
    expect(StuffApi.findById(orbId)).toBeTruthy();

    advance(actor, 700); // past expiry
    expect(actor.hasCondition((c) => c.kind === "sustained")).toBe(false);
    expect(StuffApi.findById(orbId)).toBeUndefined();
  });

  it("releaseSustained (the dispel path) un-realizes and destructs immediately", () => {
    const actor = makeActor();
    const orb = makeStuff(() => new TestOrb());
    const effect: SustainedEffect = {
      kind: "sustained",
      spellId: "glowlight",
      realizes: "emit-light",
      magicOrigin: ORIGIN,
      boundStuffId: orb.stuffId,
    };
    actor.afflict(effect);
    advance(actor, 1);
    actor.releaseSustained(effect);
    expect(actor.hasCondition((c) => c.kind === "sustained")).toBe(false);
    expect(StuffApi.findById(orb.stuffId)).toBeUndefined();
  });

  it("a magic-tagged affliction decays on the authored timescale (dread)", () => {
    const actor = makeActor();
    const dread: AfflictionRecord = {
      kind: "affliction",
      templatePath: "/lib/magic/conditions/dread",
      stage: 2,
      elapsed: 0,
      magicOrigin: { ...ORIGIN, verb: "destroy", noun: "mind", spellId: "dread" },
    };
    actor.afflict(dread);
    advance(actor, 1); // stamp
    advance(actor, 200); // 200 game-sec × 0.005/sec = 1 stage
    expect(dread.stage).toBeLessThan(2);
    expect(dread.stage).toBeGreaterThan(0);
    advance(actor, 300);
    // decayed to zero → relieved
    expect(actor.hasCondition((c) => c.kind === "affliction")).toBe(false);
  });

  it("an untagged affliction never decays (mundane conditions untouched)", () => {
    const actor = makeActor();
    const mundane: AfflictionRecord = {
      kind: "affliction",
      templatePath: "/lib/metabolism/conditions/collapse",
      stage: 1,
      elapsed: 0,
    };
    actor.afflict(mundane);
    advance(actor, 1);
    advance(actor, 3000);
    expect(mundane.stage).toBe(1);
    expect(actor.hasCondition((c) => c.kind === "affliction")).toBe(true);
  });
});
