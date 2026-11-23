import { describe, it, expect } from "vitest";
import type { WireClaim } from "@saxonberg/types";
import type { CopyClaim } from "../navSlice";
import {
  zoneView,
  crumbsView,
  placeAt,
  localityKnowledge,
  longDirection,
  neighborDirection,
  routeCommandFor,
  inferStanding,
} from "../navSelectors";

const Z = "/test/delve";
const tag = (path: string) => ({ path, spoiler: 2 as const });
const DOC = "last-counted-mile/delve";

let seq = 0;
function place(
  path: string,
  x: number,
  y: number,
  opts: Partial<WireClaim> & { level?: number; zone?: string } = {},
): CopyClaim {
  const { level = 0, zone = Z, ...rest } = opts;
  return {
    locality: DOC,
    claim: {
      key: `p${seq++}`,
      kind: "place",
      place: tag(path),
      name: path.split("/").pop(),
      keywords: [path.split("/").pop()!],
      channel: "walked",
      at: { zone: tag(zone), x, y, z: level, level },
      firstSeen: 10,
      lastSeen: 10,
      ...rest,
    },
  };
}
function edge(from: string, dir: string, opts: Partial<WireClaim> = {}): CopyClaim {
  return {
    locality: DOC,
    claim: {
      key: `e${seq++}`,
      kind: "edge",
      place: tag(from),
      dir,
      to: null,
      toLabel: null,
      channel: "seen",
      state: "open",
      firstSeen: 10,
      lastSeen: 10,
      ...opts,
    },
  };
}
const copyOf = (...entries: CopyClaim[]): Record<string, CopyClaim> =>
  Object.fromEntries(entries.map((e) => [`${e.locality}|${e.claim.key}`, e]));

const V = `${Z}/vestibule`;
const C1 = `${Z}/corridor-1`;
const C2 = `${Z}/corridor-2`;
const C3 = `${Z}/corridor-3`;
const VAULT = `${Z}/vault`;
const PIT = `${Z}/pit-below`;

describe("zoneView — the zone as your map knows it", () => {
  it("places in two tiers: walked, and known without walking", () => {
    const view = zoneView(
      copyOf(place(V, 0, 0), place(C1, 0, 1, { channel: "seen" })),
      Z,
    );
    const tiers = Object.fromEntries(view.places.map((p) => [p.name, p.tier]));
    expect(tiers).toEqual({ vestibule: "walked", "corridor-1": "known" });
    expect(view.counts).toMatchObject({ walked: 1, known: 1 });
  });

  it("a way to somewhere you do not know is an opening; a known far side is a link", () => {
    const view = zoneView(
      copyOf(
        place(V, 0, 0),
        place(C1, 0, 1),
        edge(V, "north", { to: tag(C1), channel: "walked" }),
        edge(C1, "northeast"),
      ),
      Z,
    );
    const shapes = Object.fromEntries(view.edges.map((e) => [`${e.from.split("/").pop()} ${e.dir}`, e.shape]));
    expect(shapes).toEqual({ "vestibule north": "link", "corridor-1 northeast": "opening" });
    expect(view.counts.openings).toBe(1);
  });

  it("joins a far side by the row path a look recorded (toLabel), as the planner does", () => {
    const view = zoneView(
      copyOf(place(V, 0, 0), place(C1, 0, 1), edge(C1, "south", { toLabel: tag(V) })),
      Z,
    );
    expect(view.edges).toHaveLength(1);
    expect(view.edges[0]).toMatchObject({ shape: "link", to: V });
  });

  it("a link seen from both ends is drawn once, in its latest state", () => {
    const view = zoneView(
      copyOf(
        place(V, 0, 0),
        place(C1, 0, 1),
        edge(V, "north", { to: tag(C1), state: "open", lastSeen: 10 }),
        edge(C1, "south", { toLabel: tag(V), state: "shut", lastSeen: 20 }),
      ),
      Z,
    );
    expect(view.edges).toHaveLength(1);
    expect(view.edges[0]!.state).toBe("shut");
    expect(view.edges[0]!.claims).toHaveLength(2);
  });

  it("a diagonal is a link; two cells apart is a track", () => {
    const view = zoneView(
      copyOf(
        place(C3, 0, 3),
        place(VAULT, 1, 2),
        place("/r/seep", 18, 10, { zone: Z }),
        edge(C3, "southeast", { to: tag(VAULT) }),
        edge(VAULT, "east", { to: tag("/r/seep") }),
      ),
      Z,
    );
    const byDir = Object.fromEntries(view.edges.map((e) => [e.dir, e.shape]));
    expect(byDir).toEqual({ southeast: "link", east: "track" });
  });

  it("up and down are vertical glyphs; a word with no bearing is a named way", () => {
    const view = zoneView(
      copyOf(
        place(C2, 0, 2),
        place(PIT, 0, 2, { level: -1 }),
        edge(C2, "down", { to: tag(PIT) }),
        edge(C2, "pumphouse"),
      ),
      Z,
    );
    const byDir = Object.fromEntries(view.edges.map((e) => [e.dir, e]));
    expect(byDir.down).toMatchObject({ shape: "vertical", farKnown: true });
    expect(byDir.pumphouse!.shape).toBe("named");
    expect(view.levels).toEqual([-1, 0]);
    expect(view.extent[-1]).toEqual({ minX: 0, maxX: 0, minY: 2, maxY: 2 });
  });

  it("a way to a place your map has in ANOTHER zone leaves the zone", () => {
    const view = zoneView(
      copyOf(
        place(V, 0, 0),
        place("/test/wilds/treeline", 4, 4, { zone: "/test/wilds" }),
        edge(V, "south", { to: tag("/test/wilds/treeline") }),
      ),
      Z,
    );
    expect(view.places.map((p) => p.name)).toEqual(["vestibule"]);
    expect(view.edges[0]!.shape).toBe("leaves");
  });

  it("⭐ two claims naming different far sides are BOTH drawn, and marked", () => {
    const view = zoneView(
      copyOf(
        place(V, 0, 0),
        place(C1, 0, 1),
        place(C2, 0, 2),
        edge(V, "north", { to: tag(C1), firstSeen: 5 }),
        edge(V, "north", { toLabel: tag(C2), firstSeen: 9 }),
      ),
      Z,
    );
    const north = view.edges.filter((e) => e.dir === "north");
    expect(north).toHaveLength(2);
    expect(north.every((e) => e.conflict)).toBe(true);
    expect(north.map((e) => e.variant).sort()).toEqual([0, 1]);
  });

  it("an edge not seen the last time you looked is stale", () => {
    const view = zoneView(
      copyOf(
        place(C1, 0, 1, { channel: "seen", lastSeen: 50 }),
        edge(C1, "west", { lastSeen: 20 }),
        edge(C1, "east", { lastSeen: 50 }),
      ),
      Z,
    );
    const stale = Object.fromEntries(view.edges.map((e) => [e.dir, e.stale]));
    expect(stale).toEqual({ west: true, east: false });
  });

  it("found by searching: the way's first record is a search", () => {
    const view = zoneView(
      copyOf(
        place(C1, 0, 1),
        edge(C1, "northeast", { channel: "searched", firstSeen: 5 }),
        edge(C1, "northeast", { channel: "seen", firstSeen: 9, key: "x2" }),
        edge(C1, "south", { channel: "seen", firstSeen: 3 }),
        edge(C1, "south", { channel: "searched", firstSeen: 8, key: "x3" }),
      ),
      Z,
    );
    const found = Object.fromEntries(view.edges.map((e) => [e.dir, e.foundBySearching]));
    expect(found).toEqual({ northeast: true, south: false });
  });

  it("a place with no cell in a Locality that covers you is listed, never guessed", () => {
    const loose: CopyClaim = {
      locality: DOC,
      claim: { key: "u", kind: "place", place: tag("/x/told"), name: "the old shaft", channel: "told", firstSeen: 1, lastSeen: 1 },
    };
    const view = zoneView(copyOf(place(V, 0, 0), loose), Z, [DOC]);
    expect(view.unplaced.map((p) => p.name)).toEqual(["the old shaft"]);
    expect(view.places.map((p) => p.name)).toEqual(["vestibule"]);
    // Not listed when no covering Locality holds it.
    expect(zoneView(copyOf(place(V, 0, 0), loose), Z, []).unplaced).toEqual([]);
  });

  it("is memoized on the copy object", () => {
    const copy = copyOf(place(V, 0, 0));
    expect(zoneView(copy, Z)).toBe(zoneView(copy, Z));
    expect(zoneView({ ...copy }, Z)).not.toBe(zoneView(copy, Z));
  });

  it("short direction words read long", () => {
    expect(longDirection("NE")).toBe("northeast");
    expect(longDirection("pumphouse")).toBe("pumphouse");
  });
});

describe("placeAt / localityKnowledge", () => {
  it("finds the place at your cell", () => {
    const copy = copyOf(place(V, 0, 0), place(C1, 0, 1));
    expect(placeAt(copy, Z, { x: 0, y: 1, z: 0 })?.name).toBe("corridor-1");
    expect(placeAt(copy, Z, { x: 5, y: 1, z: 0 })).toBeUndefined();
  });

  it("counts the claims filed at or under an address", () => {
    const copy = copyOf(place(V, 0, 0), place(C1, 0, 1));
    expect(localityKnowledge(copy, "last-counted-mile").claims).toBe(2);
    expect(localityKnowledge(copy, "last-counted").claims).toBe(0);
  });
});

describe("crumbsView — the breadcrumb from your map", () => {
  const section = {
    v: 1,
    chain: [
      { name: "Terminus", address: "terminus" },
      { name: "Terminus City", address: "terminus/city" },
    ],
    jurisdiction: [],
  };
  it("names a crumb from your claim, and leaves one you have not learned unnamed", () => {
    const loc: CopyClaim = {
      locality: "terminus",
      claim: { key: "l", kind: "locality", place: "terminus", name: "Terminus", channel: "walked", firstSeen: 1, lastSeen: 1 },
    };
    const crumbs = crumbsView(copyOf(loc), section);
    expect(crumbs.map((c) => c.name ?? null)).toEqual(["Terminus", null]);
  });
  it("aboard, the ship is the last crumb", () => {
    expect(crumbsView({}, { ...section, ship: { name: "the Hesper" } }).at(-1)).toMatchObject({
      name: "the Hesper",
      ship: true,
    });
  });
});


describe("what a click on the map runs", () => {
  const copy = copyOf(
    place(V, 0, 0),
    place(C1, 0, 1),
    place(C3, 0, 3, { keywords: ["corridor", "end"] }),
    place(VAULT, 1, 2, { keywords: ["vault"] }),
    place("/r/seep", 6, 0, { keywords: ["corridor"] }),
    edge(V, "east", { to: tag("/r/seep") }),
  );
  const standing = { zone: Z, at: { x: 0, y: 0, z: 0 }, ways: [{ direction: "north" }, { direction: "east" }] };
  const byName = (n: string) => zoneView(copy, Z).places.find((p) => p.name === n)!;

  it("a neighbor is the way whose step lands on it — or whose edge names it", () => {
    expect(neighborDirection(copy, standing, byName("corridor-1"))).toBe("north");
    expect(neighborDirection(copy, standing, byName("seep"))).toBe("east");
    expect(neighborDirection(copy, standing, byName("vault"))).toBeUndefined();
  });

  it("a distant place routes by its first keyword nobody else in its document shares", () => {
    expect(routeCommandFor(copy, byName("corridor-3"))).toBe("route to end");
    expect(routeCommandFor(copy, byName("vault"))).toBe("route to vault");
  });

  it("led by its group; nothing when it has no keyword", () => {
    const grouped = { ...byName("vault"), group: "terminus/city/lot-123" };
    expect(routeCommandFor(copy, grouped)).toBe("route to lot-123 vault");
    expect(routeCommandFor(copy, { ...byName("vault"), keywords: [] })).toBeNull();
  });
});


describe("inferStanding — where you are when the server sends no position", () => {
  it("one step back from a placed place a way leads to", () => {
    const copy = copyOf(place(V, 0, 0, { name: "Dave's Bar" }));
    expect(inferStanding(copy, Z, [{ direction: "north", destination: "Dave's Bar" }])).toEqual({ x: 0, y: -1, z: 0 });
    expect(inferStanding(copy, Z, [{ direction: "north", destination: "somewhere else" }])).toBeUndefined();
  });
});
