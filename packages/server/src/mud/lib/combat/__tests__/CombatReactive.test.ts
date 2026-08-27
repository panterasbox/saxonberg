/**
 * CombatReactiveMixin — the instrument dynamics seam. Asserts the
 * substrate contract before any engine wiring: no-op default hook
 * bodies, the `augmentInflict` identity default, `super`-composition,
 * and the `MixinApi.isCombatReactive` narrowing (bare / composed /
 * nested).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeStuff } from "../../security/__tests__/test-setup";
import { StuffApi } from "../../../api/stuff";
import { MixinApi } from "../../../api/mixin";
import { Mixins, type MixinConstructor } from "../../mixin";
import Thing from "../../stuff/Thing";
import Weapon from "../../../platform/thing/equipment/Weapon";
import { SlottedMixin } from "../../slot/Slotted";
import type { Slotted } from "../../slot/Slotted";
import type { Stuff } from "../../stuff/Stuff";
import type { InflictSpec } from "../../../api/condition";
import { CombatReactiveMixin } from "../CombatReactive";
import { CombatHookContext } from "../CombatHookContext";
import { CombatSession } from "../CombatSession";
import { CombatTerms, DEFAULT_TERMS } from "../CombatTerms";

class ReactiveBlade extends CombatReactiveMixin(Weapon) {}

/** A trivial outer mixin so the nested-composition walk is exercised. */
function OuterMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class OuterMixin extends Base {
    static _mixinName = "OuterMixin";
  };
}

class NestedBlade extends OuterMixin(CombatReactiveMixin(Weapon)) {}

class FlamingBlade extends CombatReactiveMixin(Weapon) {
  public fired: string[] = [];

  override augmentInflict(
    spec: InflictSpec,
    ctx: CombatHookContext,
  ): InflictSpec {
    this.fired.push("flaming");
    // Re-channel an energy spec to heat (a shock spec passes through).
    const reshaped: InflictSpec =
      spec.mechanism === "shock" ? spec : { ...spec, mechanism: "heat" };
    return super.augmentInflict(reshaped, ctx);
  }
}

class SlottedHost extends SlottedMixin(Thing) {}

const SPEC: InflictSpec = {
  mechanism: "edge",
  site: "body.torso",
  energy: 40,
};

function makeCtx(): CombatHookContext {
  return new CombatHookContext({
    session: new CombatSession(
      CombatTerms.agreed("tester", DEFAULT_TERMS, true),
      250,
    ),
    beat: 1,
    actor: makeStuff(() => new Thing()),
    target: makeStuff(() => new Thing()),
  });
}

describe("CombatReactiveMixin", () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  it("is detected by MixinApi.isCombatReactive; a bare Weapon is not", () => {
    const blade = makeStuff(() => new ReactiveBlade());
    const mundane = makeStuff(() => new Weapon());
    expect(MixinApi.isCombatReactive(blade)).toBe(true);
    expect(MixinApi.hasMixin(blade, Mixins.CombatReactive)).toBe(true);
    expect(MixinApi.isCombatReactive(mundane)).toBe(false);
  });

  it("still narrows when composed under another mixin", () => {
    const blade = makeStuff(() => new NestedBlade());
    expect(MixinApi.isCombatReactive(blade)).toBe(true);
  });

  it("default hook bodies are no-ops", () => {
    const blade = makeStuff(() => new ReactiveBlade());
    const host = makeStuff(() => new SlottedHost()) as Stuff & Slotted;
    const ctx = makeCtx();
    expect(() => blade.onWielded(host, "hands")).not.toThrow();
    expect(() => blade.onUnwielded(host, "hands")).not.toThrow();
    expect(() => blade.onStrikeResolved(ctx)).not.toThrow();
    expect(() => blade.onStruck(ctx)).not.toThrow();
    expect(() => blade.onParry(ctx)).not.toThrow();
    expect(() => blade.onBypassed(ctx)).not.toThrow();
    // The witness hooks queue nothing on the context.
    expect(ctx._drain()).toEqual([]);
  });

  it("augmentInflict returns its input identically by default", () => {
    const blade = makeStuff(() => new ReactiveBlade());
    const out = blade.augmentInflict(SPEC, makeCtx());
    expect(out).toBe(SPEC);
  });

  it("an overrider composing via super sees the base behavior", () => {
    const blade = makeStuff(() => new FlamingBlade());
    const reshaped = blade.augmentInflict(SPEC, makeCtx());
    // The override ran, reshaped the mechanism, and the identity
    // terminal returned the reshaped spec untouched.
    expect(blade.fired).toEqual(["flaming"]);
    expect(reshaped).toEqual({ ...SPEC, mechanism: "heat" });
    expect(reshaped).not.toBe(SPEC);
  });
});
