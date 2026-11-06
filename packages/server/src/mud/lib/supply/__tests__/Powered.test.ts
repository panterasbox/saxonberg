/**
 * PoweredMixin + WaterPoweredMixin + NameTakingMixin — the three markers D7a
 * minted (controllers-are-io): each default refuses, each reader narrows on
 * a predicate instead of a method probe.
 */
import "../../../../test-bootstrap";
import { describe, it, expect } from "vitest";
import { Idea } from "../../stuff/Idea";
import { MixinApi } from "../../../api/mixin";
import { NamedMixin } from "../../description/Named";
import { NameTakingMixin } from "../../description/NameTaking";
import { PoweredMixin } from "../Powered";
import { WaterPoweredMixin } from "../WaterPowered";
import { makeStuff } from "../../security/__tests__/test-setup";

class Bare extends PoweredMixin(Idea) {}
class Live extends PoweredMixin(Idea) {
  public override availablePowerW(): number {
    return 750;
  }
}
class Weir extends WaterPoweredMixin(Idea) {}

/** Two rules at two layers, the order a real class stacks them in. */
class MakerRule extends NameTakingMixin(Idea) {
  public override canBeNamedBy(hand: string, by?: never): boolean {
    return super.canBeNamedBy(hand, by) || hand === "maker";
  }
}
class Pot extends NamedMixin(MakerRule) {}
class Mute extends NamedMixin(Idea) {}

describe("PoweredMixin", () => {
  it("refuses by default: no power, never supplied, a constant 0", () => {
    const bare = makeStuff(() => new Bare());
    expect(MixinApi.isPowered(bare)).toBe(true);
    expect(bare.availablePowerW()).toBe(0);
    expect(bare.isPowered()).toBe(false);
    expect(bare.poweredTrajectory(0, 100).integrate((v) => v, 4)).toBe(0);
  });

  it("is supplied when power reaches it, and integrates over the gap", () => {
    const live = makeStuff(() => new Live());
    expect(live.isPowered()).toBe(true);
    expect(live.poweredTrajectory(0, 100).integrate((v) => v, 4)).toBeCloseTo(100);
  });

  it("is absent on a thing that draws nothing", () => {
    expect(MixinApi.isPowered(makeStuff(() => new Mute()))).toBe(false);
  });
});

describe("WaterPoweredMixin", () => {
  it("refuses by default: no reach, no head, no watts", () => {
    const weir = makeStuff(() => new Weir());
    expect(MixinApi.isWaterPowered(weir)).toBe(true);
    expect(weir.getReachRef()).toBe("");
    expect(weir.getHeadM()).toBe(0);
    expect(weir.generationW(10)).toBe(0);
  });
});

describe("NameTakingMixin", () => {
  it("defaults to nobody, on anything named", () => {
    const mute = makeStuff(() => new Mute());
    expect(MixinApi.isNameTaking(mute)).toBe(true);
    expect(mute.canBeNamedBy("anyone")).toBe(false);
  });

  it("⭐ hears a rule composed INSIDE the outer layer (the chain survives)", () => {
    const pot = makeStuff(() => new Pot());
    expect(pot.canBeNamedBy("maker")).toBe(true);
    expect(pot.canBeNamedBy("stranger")).toBe(false);
  });
});
