/**
 * CombatHookContext — the hook-grammar value-object. Asserts the queue
 * semantics that make hooks safe: in-order accumulation across all
 * eight consequence kinds, recipient resolution against the context's
 * own pair (default `'defender'`), the null-recipient throw, the
 * drain-and-seal (post-drain `attach*` throws — the stashed-context
 * determinism hole), and the non-empty flavor rule.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeStuff } from "../../security/__tests__/test-setup";
import { StuffApi } from "../../../api/stuff";
import Thing from "../../stuff/Thing";
import { Quantity } from "../../quantity";
import { EnergizedMixin } from "../../electricity/Energized";
import type { Energized } from "../../electricity/Energized";
import type { Stuff } from "../../stuff/Stuff";
import type { ActiveCondition } from "../../vitals/Condition";
import type { InflictSpec } from "../../../api/condition";
import { CombatSession } from "../CombatSession";
import { CombatTerms, DEFAULT_TERMS } from "../CombatTerms";
import {
  CombatHookContext,
  type CombatConsequence,
  type CombatHookContextInit,
} from "../CombatHookContext";

class TestSource extends EnergizedMixin(Thing) {}

const RIDER_SPEC: InflictSpec = {
  mechanism: "heat",
  site: "body.torso",
  energy: 12,
};

const DREAD: ActiveCondition = {
  kind: "affliction",
  templatePath: "/obj/conditions/test-dread",
  stage: 0,
  elapsed: 0,
};

function makeSession(): CombatSession {
  return new CombatSession(CombatTerms.agreed("tester", DEFAULT_TERMS, true), 250);
}

function makeCtx(
  overrides: Partial<CombatHookContextInit> = {},
): { ctx: CombatHookContext; actor: Stuff; target: Stuff } {
  const actor = makeStuff(() => new Thing());
  const target = makeStuff(() => new Thing());
  const ctx = new CombatHookContext({
    session: makeSession(),
    beat: 3,
    actor,
    target,
    ...overrides,
  });
  return { ctx, actor, target };
}

describe("CombatHookContext", () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  it("exposes the read surface with null defaults for absent seams", () => {
    const { ctx, actor, target } = makeCtx();
    expect(ctx.beat).toBe(3);
    expect(ctx.actor).toBe(actor);
    expect(ctx.target).toBe(target);
    expect(ctx.actorState).toBeNull();
    expect(ctx.targetState).toBeNull();
    expect(ctx.gambit).toBeNull();
    expect(ctx.outcome).toBeNull();
    expect(ctx.channel).toBeNull();
    expect(ctx.site).toBeNull();
    expect(ctx.deflected).toBe(false);
    expect(ctx.instrument).toBeNull();
    expect(ctx.venue).toBeNull();
    expect(ctx.resolution).toBeNull();
  });

  it("accumulates all eight consequence kinds in queue order", () => {
    const { ctx } = makeCtx();
    const source = makeStuff(() => new TestSource()) as Stuff & Energized;
    const delta = Quantity.of(5, "s");

    ctx.attachRider(RIDER_SPEC);
    ctx.afflict(DREAD, "attacker");
    ctx.introduceToxin("test-venom", 2);
    ctx.adjustReserve("endurance", delta, "attacker");
    ctx.wearInstrument(0.1, "attacker");
    ctx.influence({ kind: "stagger", intensity: "light" });
    ctx.deliverShock(source);
    ctx.attachFlavor("The blade hums.");

    const drained = ctx._drain();
    expect(drained.map((c: CombatConsequence) => c.kind)).toEqual([
      "rider",
      "afflict",
      "toxin",
      "reserve",
      "wear",
      "influence",
      "shock",
      "flavor",
    ]);
    expect(drained[0]).toEqual({
      kind: "rider",
      spec: RIDER_SPEC,
      on: "defender",
    });
    expect(drained[1]).toEqual({
      kind: "afflict",
      condition: DREAD,
      on: "attacker",
    });
    expect(drained[2]).toEqual({
      kind: "toxin",
      type: "test-venom",
      amount: 2,
      on: "defender",
    });
    expect(drained[3]).toEqual({
      kind: "reserve",
      key: "endurance",
      delta,
      on: "attacker",
    });
    expect(drained[4]).toEqual({ kind: "wear", amount: 0.1, on: "attacker" });
    expect(drained[5]).toEqual({
      kind: "influence",
      instruction: { kind: "stagger", intensity: "light" },
      on: "defender",
    });
    expect(drained[6]).toEqual({ kind: "shock", source });
    expect(drained[7]).toEqual({ kind: "flavor", line: "The blade hums." });
  });

  it("defaults the recipient to 'defender' and resolves 'attacker'", () => {
    const { ctx } = makeCtx();
    ctx.attachRider(RIDER_SPEC);
    ctx.attachRider(RIDER_SPEC, "attacker");
    const [first, second] = ctx._drain();
    expect(first).toMatchObject({ on: "defender" });
    expect(second).toMatchObject({ on: "attacker" });
  });

  it("throws when the resolved recipient is null", () => {
    const noTarget = makeCtx({ target: null }).ctx;
    expect(() => noTarget.attachRider(RIDER_SPEC)).toThrow(/no defender/);
    // The other side still resolves.
    expect(() => noTarget.attachRider(RIDER_SPEC, "attacker")).not.toThrow();

    const noActor = makeCtx({ actor: null }).ctx;
    expect(() => noActor.wearInstrument(0.1, "attacker")).toThrow(
      /no attacker/,
    );
    expect(() => noActor.afflict(DREAD)).not.toThrow();

    // deliverShock is target-fixed: a null-target context throws at
    // queue time (the same shape as the other methods), never a silent
    // no-op at the drain.
    const source = makeStuff(() => new TestSource()) as Stuff & Energized;
    const noTarget2 = makeCtx({ target: null }).ctx;
    expect(() => noTarget2.deliverShock(source)).toThrow(/no defender/);
  });

  it("_drain seals the context — every later queue call throws", () => {
    const { ctx } = makeCtx();
    const source = makeStuff(() => new TestSource()) as Stuff & Energized;
    ctx.attachFlavor("A last word.");
    expect(ctx._drain()).toHaveLength(1);

    expect(() => ctx.attachRider(RIDER_SPEC)).toThrow(/sealed/);
    expect(() => ctx.afflict(DREAD)).toThrow(/sealed/);
    expect(() => ctx.introduceToxin("test-venom", 1)).toThrow(/sealed/);
    expect(() => ctx.adjustReserve("endurance", Quantity.of(1, "s"))).toThrow(
      /sealed/,
    );
    expect(() => ctx.wearInstrument(0.1, "defender")).toThrow(/sealed/);
    expect(() => ctx.influence({ kind: "expose" })).toThrow(/sealed/);
    expect(() => ctx.deliverShock(source)).toThrow(/sealed/);
    expect(() => ctx.attachFlavor("too late")).toThrow(/sealed/);
  });

  it("attachRider validates the spec fail-fast at attach (never from the drain)", () => {
    const { ctx } = makeCtx();
    // Not an object at all.
    expect(() => ctx.attachRider(null as never)).toThrow(TypeError);
    expect(() => ctx.attachRider("edge" as never)).toThrow(TypeError);
    // Energy spec: a 'shock'-free string mechanism, string site, finite
    // energy — each missing/malformed leg throws.
    expect(() =>
      ctx.attachRider({ site: "body.torso", energy: 3 } as never),
    ).toThrow(/mechanism/);
    expect(() =>
      ctx.attachRider({ mechanism: "edge", energy: 3 } as never),
    ).toThrow(/site/);
    expect(() =>
      ctx.attachRider({ mechanism: "edge", site: "body.torso" } as never),
    ).toThrow(/energy/);
    expect(() =>
      ctx.attachRider({
        mechanism: "edge",
        site: "body.torso",
        energy: Number.NaN,
      }),
    ).toThrow(/finite/);
    // Shock spec: mechanism 'shock' needs a current present.
    expect(() =>
      ctx.attachRider({ mechanism: "shock", site: "body.torso" } as never),
    ).toThrow(/current/);
    expect(() =>
      ctx.attachRider({
        mechanism: "shock",
        site: "body.torso",
        current: Quantity.of(0.05, "A"),
      }),
    ).not.toThrow();
    // A well-formed energy spec still queues.
    expect(() => ctx.attachRider(RIDER_SPEC)).not.toThrow();
    expect(ctx._drain().map((c) => c.kind)).toEqual(["rider", "rider"]);
  });

  it("attachFlavor accepts a non-empty string only", () => {
    const { ctx } = makeCtx();
    expect(() => ctx.attachFlavor("")).toThrow(/non-empty/);
    expect(() => ctx.attachFlavor("   ")).toThrow(/non-empty/);
    ctx.attachFlavor("The maul growls.");
    expect(ctx._drain()).toEqual([
      { kind: "flavor", line: "The maul growls." },
    ]);
  });
});
