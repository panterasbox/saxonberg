/**
 * The minted-location quadrant, and the audit that keeps the four
 * location classes honest about which is which.
 *
 * The axis is `{cartesian, spherical} × {authored, minted}`:
 *
 *   - **authored** (`CartesianLocation` / `SphericalLocation`) — the row
 *     IS a place, unique by path, so both compose `SingletonMixin`;
 *   - **minted** (`CartesianLocation` / `SphericalLocation`)
 *     — the row describes a KIND of place and the instances are the
 *     places, so identity moves onto the instance (D17).
 *
 * `FurnishableRoom` is none of those: it is the interior somebody
 * FURNISHES, and the only one whose contents must survive.
 *
 * Leaving the minted quadrant empty is how this went wrong: for a while
 * `FurnishableRoom` was the only multi-instance location that existed,
 * so every minted road reach and stair landing became one — and quietly
 * acquired a persistence record that nothing ever read back.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi } from "vitest";
import CartesianLocation from "../CartesianLocation";
import LibCartesianLocation from "../../../lib/location/CartesianLocation";
import SphericalLocation from "../SphericalLocation";
import SingletonCartesianLocation from "../../../lib/location/SingletonCartesianLocation";
import FurnishableRoom from "../FurnishableRoom";
import { StuffApi } from "../../../api/stuff";
import { MixinApi } from "../../../api/mixin";
import { Mixins } from "../../../lib/mixin";
import { PersistableApi } from "../../../api/persistable";
import { makeStuffAtPath } from "../../../lib/security/__tests__/test-setup";

const PATH = "/platform/location/CartesianLocation";

beforeEach(() => {
  StuffApi.clearAll();
});

/**
 * ⚠ The instanceable faces must INHERIT the grid's behaviour, not
 * re-list its mixins. Two identical compositions produce two classes
 * that differ only in what they OVERRIDE, and the override that matters
 * is `CartesianLocation.addExit` — the cardinal-only-intra-zone rule.
 * `platform/location/CartesianLocation` shipped re-composed for one
 * commit and had silently dropped it, so a minted road reach accepted a
 * non-cardinal exit into its own zone while the authored lane beside it
 * still refused one. Type-checked, and every suite stayed green.
 */
describe("the faces inherit the grid, they do not re-compose it", () => {
  it("⭐ every cartesian face carries the cardinal-rule addExit", () => {
    // The rule lives on the lib class. A face that re-listed the mixins
    // would get `Exitable`'s plain addExit instead — same shape, no rule.
    const own = Object.getOwnPropertyDescriptor(
      LibCartesianLocation.prototype,
      "addExit",
    );
    expect(own, "the lib class owns the rule").toBeTruthy();
    for (const cls of [
      CartesianLocation,
      SingletonCartesianLocation,
      FurnishableRoom,
    ]) {
      expect(
        cls.prototype instanceof LibCartesianLocation ||
          Object.getPrototypeOf(cls.prototype) === LibCartesianLocation.prototype,
        `${cls.name} must descend from lib CartesianLocation`,
      ).toBe(true);
      expect(cls.prototype.addExit, `${cls.name} lost the rule`).toBe(
        own!.value,
      );
    }
  });
});

describe("the minted quadrant", () => {
  it("carries its coordinate system — it is a real grid cell", () => {
    const room = makeStuffAtPath(() => new CartesianLocation(), PATH);
    expect(MixinApi.isExitable(room)).toBe(true);
    expect(MixinApi.hasMixin(CartesianLocation, Mixins.Populates)).toBe(true);
    // The whole reason it exists: the authored classes are singletons
    // because one row IS one cell. A minted row is a KIND of cell.
    expect(MixinApi.hasMixin(SingletonCartesianLocation, Mixins.Singleton)).toBe(true);
    expect(MixinApi.hasMixin(CartesianLocation, Mixins.Singleton)).toBe(false);
    expect(MixinApi.hasMixin(SphericalLocation, Mixins.Singleton)).toBe(false);
  });

  it("⭐ keeps NO record, and writes nothing when it is reaped", async () => {
    // Circulation reaps constantly by design (outside-in, the moment a
    // reach empties). On `FurnishableRoom` each of those reaps wrote a
    // `holder_snapshots` row — and every landing in a building clones ONE
    // row, so all of them shared ONE scope.
    const capture = vi.spyOn(PersistableApi, "capture");
    const room = makeStuffAtPath(() => new CartesianLocation(), PATH);
    expect(MixinApi.isPersistable(room)).toBe(false);
    await StuffApi.destruct(room);
    expect(capture).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("both coordinate systems have one, so neither side has to improvise", () => {
    // The empty quadrant is what got filled by the wrong class last time.
    expect(MixinApi.isPersistable(
      makeStuffAtPath(() => new SphericalLocation(),
        "/platform/location/SphericalLocation"),
    )).toBe(false);
  });

  it("the furnishable interior is still the one that persists", () => {
    const room = makeStuffAtPath(
      () => new FurnishableRoom(),
      "/platform/location/FurnishableRoom",
    );
    expect(MixinApi.isPersistable(room)).toBe(true);
  });
});

/*
 * The CONTENT half of this invariant — which shipped rows may sit on
 * `FurnishableRoom` — is `pnpm lint:locations`
 * (`scripts/check-location-classes.ts`), not a test here. It is a
 * cross-pack content audit over an enumerated roster, which is the
 * lint family's job (`check-untitled-paths`, `check-instanceable-placement`),
 * and a kernel test may not name shipped content anyway.
 */
