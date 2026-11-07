/**
 * The room rung: an interior has substrate a lane or a yard does not —
 * water piped into it, and walls and a roof unless its row says
 * otherwise — on both sides of the Locale/Location split.
 *
 * |        | one of many      | one particular   |
 * |--------|------------------|------------------|
 * | plain  | `Room`           | `Hall`           |
 * | kept   | `PersistentRoom` | `PersistentHall` |
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from "vitest";
import Location from "../Location";
import Locale from "../Locale";
import PersistentLocation from "../PersistentLocation";
import PersistentLocale from "../PersistentLocale";
import Street from "../Street";
import Room from "../Room";
import Hall from "../Hall";
import PersistentRoom from "../PersistentRoom";
import PersistentHall from "../PersistentHall";
import { StuffApi } from "../../../api/stuff";
import { MixinApi } from "../../../api/mixin";
import { Mixins } from "../../../lib/mixin";
import { makeStuffAtPath } from "../../../lib/security/__tests__/test-setup";

beforeEach(() => {
  StuffApi.clearAll();
});

const ROOMS = [Room, Hall, PersistentRoom, PersistentHall] as const;

describe("⭐⭐ PlumbedMixin composes on the room rung and nowhere else", () => {
  it("every room class is plumbed", () => {
    for (const cls of ROOMS) {
      expect(MixinApi.hasMixin(cls, Mixins.Plumbed)).toBe(true);
    }
  });

  it("no other place is — a lane, a crossing, a street carries no field", () => {
    for (const cls of [Location, Locale, PersistentLocation, PersistentLocale, Street]) {
      expect(MixinApi.hasMixin(cls, Mixins.Plumbed)).toBe(false);
    }
  });

  it("a room with no word stands up the universe default run; `none` is dry", () => {
    const room = makeStuffAtPath(() => new Room(), "/test/room/scullery");
    expect(room.plumbingRunRow()).toBe("/stuff/thing/fixture/iron-run");
    room.setPlumbing("lead");
    expect(room.plumbingRunRow()).toBe("/stuff/thing/fixture/lead-run");
    room.setPlumbing("none");
    expect(room.isPlumbed()).toBe(false);
    expect(room.plumbingRunRow()).toBeNull();
  });
});

describe("each rung keeps its side of the split", () => {
  it("a hall is one particular room; a room is one of many", () => {
    expect(Hall.prototype instanceof Room).toBe(true);
    expect(MixinApi.hasMixin(Hall, Mixins.Singleton)).toBe(true);
    expect(MixinApi.hasMixin(Room, Mixins.Singleton)).toBe(false);
  });

  it("the kept twins keep: a PersistentRoom is a PersistentLocation", () => {
    expect(PersistentRoom.prototype instanceof PersistentLocation).toBe(true);
    expect(PersistentHall.prototype instanceof Hall).toBe(true);
    expect(MixinApi.hasMixin(PersistentHall, Mixins.Persistable)).toBe(true);
  });
});

describe("⭐ a room is roofed in its walls unless its row says otherwise", () => {
  it("no walls authored: the roof is the wall default", () => {
    expect(Room.roofOverWalls(null)).toEqual({});
    expect(Room.roofOverWalls("none")).toEqual({});
  });

  it("walls authored: the roof is the same layers", () => {
    const brick = { material: "/stuff/idea/material/ceramic/brick", thicknessM: 0.23 };
    expect(Room.roofOverWalls(brick)).toBe(brick);
  });

  it("every room class declares its roof, so none reads it off a biome", () => {
    for (const cls of ROOMS) {
      const room = makeStuffAtPath(() => new cls(), `/test/room/${cls.name}`);
      expect(room.roofDefaults()).not.toBeNull();
      expect(room.construction().declared).toBe(true);
    }
  });

  it("an authored roof still wins", () => {
    const hall = makeStuffAtPath(() => new Hall(), "/test/room/lavoir");
    hall.setEnclosure("none");
    hall.setRoof({ material: "/stuff/idea/material/rock/slate", thicknessM: 0.01 });
    const built = hall.construction();
    expect(built.walls.none).toBe(true);
    expect(built.roof.none).toBe(false);
  });
});
