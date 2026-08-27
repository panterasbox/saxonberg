/**
 * ManualBuild buffer + the verb-collision partition.
 *
 * The buffer (contributions, volume, weakest-link grade, method, clear)
 * and the property that makes the crafting `pour` coexist cleanly with
 * the bulk `pour`: a build vessel is NOT Bulkable (so the bulk pour can't
 * target it) while a Bulkable bottle is NOT a build vessel.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from "vitest";
import CocktailShaker from "../../../platform/thing/CocktailShaker";
import GradedReceptacle from "../../../platform/thing/GradedReceptacle";
import { MixinApi } from "../../../api/mixin";
import { makeStuff } from "../../security/__tests__/test-setup";

describe("ManualBuild buffer", () => {
  it("banks contributions and sums their volume", () => {
    const shaker = makeStuff(() => new CocktailShaker());
    expect(shaker.isBuildEmpty()).toBe(true);
    shaker.addContribution({ category: "gin", measureL: 0.06, gradeBand: "fine" });
    shaker.addContribution({
      category: "vermouth",
      measureL: 0.02,
      gradeBand: "fair",
    });
    expect(shaker.isBuildEmpty()).toBe(false);
    expect(shaker.getContributions()).toHaveLength(2);
    expect(shaker.getBuildVolumeL()).toBeCloseTo(0.08, 6);
  });

  it("derives the weakest-link grade across contributions", () => {
    const shaker = makeStuff(() => new CocktailShaker());
    shaker.addContribution({ category: "gin", measureL: 0.06, gradeBand: "fine" });
    shaker.addContribution({
      category: "vermouth",
      measureL: 0.02,
      gradeBand: "poor",
    });
    expect(shaker.getBuildGrade().getBand()).toBe("poor");
  });

  it("records the build method", () => {
    const shaker = makeStuff(() => new CocktailShaker());
    expect(shaker.getBuildMethod()).toBeNull();
    shaker.setBuildMethod("shaken");
    expect(shaker.getBuildMethod()).toBe("shaken");
  });

  it("clears the buffer", () => {
    const shaker = makeStuff(() => new CocktailShaker());
    shaker.addContribution({ category: "gin", measureL: 0.06, gradeBand: "fine" });
    shaker.setBuildMethod("stirred");
    shaker.clearBuild();
    expect(shaker.isBuildEmpty()).toBe(true);
    expect(shaker.getBuildMethod()).toBeNull();
  });

  it("getContributions returns a snapshot (not the live array)", () => {
    const shaker = makeStuff(() => new CocktailShaker());
    shaker.addContribution({ category: "gin", measureL: 0.06, gradeBand: "fine" });
    const snap = shaker.getContributions();
    (snap as { length: number }).length = 0; // mutate the copy
    expect(shaker.getContributions()).toHaveLength(1);
  });
});

describe("verb-collision partition", () => {
  it("a build vessel is NOT Bulkable, so the bulk pour can't target it", () => {
    const shaker = makeStuff(() => new CocktailShaker());
    expect(MixinApi.isBuildVessel(shaker)).toBe(true);
    expect(MixinApi.isTool(shaker)).toBe(true);
    expect(MixinApi.isBulkable(shaker)).toBe(false);
  });

  it("a Bulkable bottle is NOT a build vessel, so the crafting pour falls through", () => {
    const bottle = makeStuff(() => new GradedReceptacle());
    expect(MixinApi.isBulkable(bottle)).toBe(true);
    expect(MixinApi.isBuildVessel(bottle)).toBe(false);
  });
});
