/**
 * The minted-location quadrant, and the audit that keeps the four
 * location classes honest about which is which.
 *
 * The axis is `{cartesian, spherical} × {authored, minted}`:
 *
 *   - **authored** (`CartesianLocation` / `SphericalLocation`) — the row
 *     IS a place, unique by path, so both compose `SingletonMixin`;
 *   - **minted** (`MintedCartesianLocation` / `MintedSphericalLocation`)
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
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import MintedCartesianLocation from "../MintedCartesianLocation";
import MintedSphericalLocation from "../MintedSphericalLocation";
import CartesianLocation from "../../../lib/location/CartesianLocation";
import FurnishableRoom from "../FurnishableRoom";
import { StuffApi } from "../../../api/stuff";
import { MixinApi } from "../../../api/mixin";
import { Mixins } from "../../../lib/mixin";
import { PersistableApi } from "../../../api/persistable";
import { makeStuffAtPath } from "../../../lib/security/__tests__/test-setup";

const PATH = "/platform/location/MintedCartesianLocation";

beforeEach(() => {
  StuffApi.clearAll();
});

describe("the minted quadrant", () => {
  it("carries its coordinate system — it is a real grid cell", () => {
    const room = makeStuffAtPath(() => new MintedCartesianLocation(), PATH);
    expect(MixinApi.isExitable(room)).toBe(true);
    expect(MixinApi.hasMixin(MintedCartesianLocation, Mixins.Populates)).toBe(true);
    // The whole reason it exists: the authored classes are singletons
    // because one row IS one cell. A minted row is a KIND of cell.
    expect(MixinApi.hasMixin(CartesianLocation, Mixins.Singleton)).toBe(true);
    expect(MixinApi.hasMixin(MintedCartesianLocation, Mixins.Singleton)).toBe(false);
    expect(MixinApi.hasMixin(MintedSphericalLocation, Mixins.Singleton)).toBe(false);
  });

  it("⭐ keeps NO record, and writes nothing when it is reaped", async () => {
    // Circulation reaps constantly by design (outside-in, the moment a
    // reach empties). On `FurnishableRoom` each of those reaps wrote a
    // `holder_snapshots` row — and every landing in a building clones ONE
    // row, so all of them shared ONE scope.
    const capture = vi.spyOn(PersistableApi, "capture");
    const room = makeStuffAtPath(() => new MintedCartesianLocation(), PATH);
    expect(MixinApi.isPersistable(room)).toBe(false);
    await StuffApi.destruct(room);
    expect(capture).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("both coordinate systems have one, so neither side has to improvise", () => {
    // The empty quadrant is what got filled by the wrong class last time.
    expect(MixinApi.isPersistable(
      makeStuffAtPath(() => new MintedSphericalLocation(),
        "/platform/location/MintedSphericalLocation"),
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

describe("the shipped rows pick the right location class", () => {
  const PACKS = fileURLToPath(new URL("../../../../../../content/", import.meta.url));

  function rows(): Array<{ file: string; cls: string }> {
    const out: Array<{ file: string; cls: string }> = [];
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.name === "node_modules") continue;
        const full = join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith(".yaml")) {
          const m = /^class:\s*(\S+)\s*$/m.exec(readFileSync(full, "utf8"));
          if (m) out.push({ file: full.slice(PACKS.length), cls: m[1]! });
        }
      }
    };
    walk(PACKS);
    return out;
  }

  /**
   * Rows a warren MINTS repeatedly from one row, plus the archetype
   * scaffold. None is furnished by anybody and none is ever keyed, so
   * none may carry a record.
   */
  const MINTED = [
    "hinkley-hills/content/world/terminus/hinkley-hills/lots/road-segment.yaml",
    "terminus/content/world/terminus/mayfield-row/seznick-house/corridor.yaml",
    "platform/content/platform/location/venue.yaml",
  ];

  it("⭐ nothing minted-and-reaped carries a persistence record", () => {
    const byFile = new Map(rows().map((r) => [r.file, r.cls]));
    for (const f of MINTED) {
      expect(byFile.get(f), `${f} must exist`).toBeDefined();
      expect(
        byFile.get(f),
        `${f} is minted per node and reaped — it must not persist`,
      ).toBe("/platform/location/MintedCartesianLocation");
    }
  });

  it("⚠ FurnishableRoom is the FURNISHING archetypes' base, not a default", () => {
    // It drifted into being the generic room class because it was the only
    // multi-instance location. Nothing minted may sit on it.
    const furnishable = rows().filter(
      (r) => r.cls === "/platform/location/FurnishableRoom",
    );
    expect(furnishable.length).toBeGreaterThan(0);
    for (const r of furnishable) expect(MINTED).not.toContain(r.file);
  });
});
