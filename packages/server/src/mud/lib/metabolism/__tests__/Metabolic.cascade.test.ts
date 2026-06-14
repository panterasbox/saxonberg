/**
 * MetabolicMixin reconcileCascade — metabolism as the first
 * condition-driver: a floored biological reserve instantiates its
 * `floorEffect`-named vitals condition and clears it on recovery
 * (hysteresis); starvation/dehydration progress to the death seam
 * (dehydration faster); collapse is acute + reversible and gates
 * volitional verbs via `requiresConscious`; the grounded death-spiral
 * (collapsed → can't intake → keeps starving) emerges from the gate.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Creature } from "../../creature/Creature";
import { Quantity } from "../../quantity";
import { WorldClockApi } from "../../../api/worldclock";
import "../../../obj/WorldClockRegistry";
import { makeStuff } from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import { TemplatePaths } from "../../paths";
import requiresConscious from "../../command/validators/requiresConscious";
import type { CommandContext } from "../../../api/command";

const COLLAPSE_CONDITION_PATH = TemplatePaths.metabolismCollapse;
const SCALE = 12;
let real = 0;

function advance(c: Creature, gameSec: number, chunkSec = 3000): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const s = Math.min(chunkSec, remaining);
    real += (s / SCALE) * 1000;
    c.getReserve("endurance");
    remaining -= s;
  }
}

const Q = (n: number) => Quantity.of(n, "%");

function has(c: Creature, path: string): boolean {
  return c.getConditions().some(
    (x) => x.kind === "affliction" && x.templatePath === path,
  );
}
function consciousGate(c: Creature): string | undefined {
  return requiresConscious({ commandGiver: c } as unknown as CommandContext) as
    | string
    | undefined;
}

const STARVATION = "/lib/metabolism/conditions/starvation";

describe("MetabolicMixin cascade — reserves → conditions", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it("flooring satiation spawns starvation; recovery clears it", () => {
    const c = makeStuff(() => new Creature());
    c.adjustReserve("satiation", Q(-100)); // satiation 0
    c.getReserve("endurance"); // seed stamp
    advance(c, 120); // a tick — cascade runs
    expect(has(c, STARVATION)).toBe(true);

    c.adjustReserve("satiation", Q(50)); // recover above the clear band
    advance(c, 120);
    expect(has(c, STARVATION)).toBe(false);
  });

  it("flooring endurance spawns collapse and gates exertion verbs", () => {
    const c = makeStuff(() => new Creature());
    // No fuel ⇒ recovery can't lift endurance back, so collapse holds.
    c.adjustReserve("endurance", Q(-100));
    c.adjustReserve("satiation", Q(-100));
    c.adjustReserve("hydration", Q(-100));
    c.getReserve("endurance");
    advance(c, 120);

    expect(has(c, COLLAPSE_CONDITION_PATH)).toBe(true);
    expect(consciousGate(c)).toBeTypeOf("string"); // verb rejected

    // Recover endurance above the collapse clear band.
    c.adjustReserve("endurance", Q(50));
    advance(c, 120);
    expect(has(c, COLLAPSE_CONDITION_PATH)).toBe(false);
    expect(consciousGate(c)).toBeUndefined(); // verb allowed again
  });

  it("a fed, conscious body passes the consciousness gate", () => {
    const c = makeStuff(() => new Creature());
    expect(consciousGate(c)).toBeUndefined();
  });

  it("death-spiral: collapsed + starving progresses to death", () => {
    const c = makeStuff(() => new Creature());
    c.adjustReserve("endurance", Q(-100)); // collapsed (can't exert)
    c.adjustReserve("satiation", Q(-100)); // starving
    c.getReserve("endurance"); // seed
    advance(c, 3000); // a slice — cascade spawns collapse + starvation
    // The body can't run intake (gated by requiresConscious), so
    // satiation keeps falling and starvation keeps accruing.
    expect(consciousGate(c)).toBeTypeOf("string");

    advance(c, 90000); // > the starvation lethal accrual (24 game-hours)
    expect(c.getCauseOfDeath()).toBe("starvation");
    expect(c.getConditionBand()).toBe("dead");
  });

  it("dehydration progresses faster than starvation", () => {
    const c = makeStuff(() => new Creature());
    c.adjustReserve("satiation", Q(-100));
    c.adjustReserve("hydration", Q(-100));
    c.getReserve("endurance"); // seed
    // Past dehydration's lethal accrual (8 game-hours) but before
    // starvation's (24) — so the body dies of thirst first.
    advance(c, 31000);
    expect(c.getCauseOfDeath()).toBe("dehydration");
  });
});
