import { describe, it, expect } from "vitest";
import { whereaboutsOf } from "../navSlice";

describe("whereaboutsOf — the navigator's shape, built from the sections", () => {
  it("is null until the place has arrived", () => {
    expect(whereaboutsOf({})).toBeNull();
  });

  it("builds what the navigator always read; jurisdiction is the innermost government", () => {
    const where = whereaboutsOf({
      place: { v: 1, stuffId: "r", name: "the deck", at: { x: 0, y: 1, z: 0 }, weather: "rain", daylight: "day" },
      localities: {
        v: 1,
        chain: [{ name: "Terminus", address: "terminus" }],
        ship: { name: "the Hesper" },
        jurisdiction: [{ key: "port", name: "the Port" }, { key: "flag", name: "the Flag" }],
      },
      building: { v: 1, name: "the Hesper" },
      ways: { v: 1, ways: [{ direction: "ashore", state: "open", crossesZone: true }] },
    });
    expect(where).toEqual({
      place: { stuffId: "r", name: "the deck" },
      structure: { name: "the Hesper" },
      localities: [{ name: "Terminus", address: "terminus" }],
      coords: { x: 0, y: 1, z: 0 },
      exits: [{ direction: "ashore", state: "open", crossesZone: true }],
      conditions: { weather: "rain", daylight: "day" },
      jurisdiction: "the Port",
    });
  });
});
