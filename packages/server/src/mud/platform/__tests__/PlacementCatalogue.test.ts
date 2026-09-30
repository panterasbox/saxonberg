/**
 * PlacementCatalogue — the ways-of-sitting roster (the
 * `MaterialCatalogue` / `ReadingCatalogue` self-warming shape).
 *
 * ⭐ The load-bearing case is the PACK one: a `Placement` row under a
 * root that is not the platform's must warm, because *a new way of
 * sitting is a row* is the claim this build is judged on, and a
 * catalogue that only read `/platform/idea/Placement/` would make it
 * false for every pack.
 *
 * ⚠ And the lazy warm, because `put` and `look` resolve a member
 * SYNCHRONOUSLY on every dispatch: a roster nothing stands up reads
 * null forever on a fresh process, which is the reference-Idea-inert
 * trap this repo has hit three times.
 */

import "../../../test-bootstrap";
import { describe, it, expect, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import PlacementCatalogue from "../idea/PlacementCatalogue";
import Placement from "../idea/Placement";
import { StuffApi } from "../../api/stuff";
import { Template } from "../../lib/stuff/Template";
import { makeStuff } from "../../lib/security/__tests__/test-setup";

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

/** A live member with the fields its row would have hydrated. */
function member(
  name: string,
  prepositions: string[],
  encloses = false,
  heading = "",
): Placement {
  const m = makeStuff(() => new Placement());
  m.name = name;
  m.prepositions = prepositions;
  m.encloses = encloses;
  m.heading = heading;
  return m;
}

/** The three platform rows plus one a PACK ships under its own root. */
const ROWS = [
  { path: "/platform/idea/Placement/on", class: "/platform/idea/Placement" },
  { path: "/platform/idea/Placement/in", class: "/platform/idea/Placement" },
  { path: "/platform/idea/Placement/from", class: "/platform/idea/Placement" },
  {
    path: "/trade/cooking/idea/Placement/behind",
    class: "/platform/idea/Placement",
  },
];

const MEMBERS: Record<string, () => Placement> = {
  "/platform/idea/Placement/on": () => member("on", ["on", "onto"], false, "On it"),
  "/platform/idea/Placement/in": () => member("in", ["in", "into"], true, "In it"),
  "/platform/idea/Placement/from": () =>
    member("from", ["from", "on"], false, "Hanging from it"),
  "/trade/cooking/idea/Placement/behind": () =>
    member("behind", ["behind"], false, "Behind it"),
};

function mockRoster(rows = ROWS): void {
  vi.spyOn(Template, "findByPathInfix").mockResolvedValue(
    rows as unknown as Template[],
  );
  vi.spyOn(StuffApi, "loadClassByPath").mockResolvedValue(
    Placement as unknown as never,
  );
  vi.spyOn(StuffApi, "singleton").mockImplementation(
    async (path: string) => (MEMBERS[path]?.() ?? member("x", ["x"])) as never,
  );
}

describe("the roster warm", () => {
  it("⭐ warms every member, including one under a PACK root", async () => {
    mockRoster();
    const catalogue = makeStuff(() => new PlacementCatalogue());
    expect(await catalogue.warm()).toBe(4);
    expect(catalogue.peek("on")?.getHeading()).toBe("On it");
    // The claim this build is judged on: a pack ships a way of sitting
    // with a row alone, under its own root, with no kernel edit.
    expect(catalogue.peek("behind")?.getHeading()).toBe("Behind it");
    expect(Template.findByPathInfix).toHaveBeenCalledWith("/idea/Placement/");
  });

  it("indexes by every preposition, and a PRIMARY always wins its word", async () => {
    mockRoster();
    const catalogue = makeStuff(() => new PlacementCatalogue());
    await catalogue.warm();
    expect(catalogue.peekWord("onto")?.getName()).toBe("on");
    expect(catalogue.peekWord("from")?.getName()).toBe("from");
    // `from` lists `on` as a SECONDARY word — that is how `put ham on
    // hook` reaches a from-only host — and it must not steal `on`'s
    // own key, whichever row warmed first.
    expect(catalogue.peekWord("on")?.getName()).toBe("on");
    expect(catalogue.peekWord("behind")?.getName()).toBe("behind");
  });

  it("⚠ peek reads null COLD; warmed() warms on the first miss", async () => {
    mockRoster();
    const catalogue = makeStuff(() => new PlacementCatalogue());
    expect(catalogue.peek("on")).toBeNull();
    expect((await catalogue.warmed("on"))?.getName()).toBe("on");
    // The second read is an index read, not a second warm.
    expect(catalogue.peek("on")?.getName()).toBe("on");
  });

  it("names a member claimed twice rather than silently overwriting", async () => {
    mockRoster([
      ...ROWS,
      { path: "/trade/cooking/idea/Placement/on", class: "/platform/idea/Placement" },
    ]);
    MEMBERS["/trade/cooking/idea/Placement/on"] = () =>
      member("on", ["on"], false, "Stolen");
    const warnings: string[] = [];
    vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => {
      warnings.push(a.map(String).join(" "));
    });
    const catalogue = makeStuff(() => new PlacementCatalogue());
    await catalogue.warm();
    delete MEMBERS["/trade/cooking/idea/Placement/on"];
    expect(warnings.some((w) => /claimed twice/.test(w))).toBe(true);
    expect(catalogue.peek("on")?.getHeading()).toBe("On it");
  });

  it("tolerates a single failed standup and continues", async () => {
    mockRoster();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(StuffApi, "singleton").mockImplementation(
      async (path: string) => {
        if (path.endsWith("/in")) throw new Error("boom");
        return (MEMBERS[path]?.() ?? member("x", ["x"])) as never;
      },
    );
    const catalogue = makeStuff(() => new PlacementCatalogue());
    expect(await catalogue.warm()).toBe(3);
  });

  it("skips a row whose class is not a Placement", async () => {
    mockRoster();
    vi.spyOn(StuffApi, "loadClassByPath").mockResolvedValue(
      class NotAPlacement {} as unknown as never,
    );
    const catalogue = makeStuff(() => new PlacementCatalogue());
    expect(await catalogue.warm()).toBe(0);
  });

  it("invalidateCache drops the index so the next read re-warms", async () => {
    mockRoster();
    const catalogue = makeStuff(() => new PlacementCatalogue());
    await catalogue.warm();
    expect(catalogue.peek("on")).not.toBeNull();
    catalogue.invalidateCache();
    expect(catalogue.peek("on")).toBeNull();
    expect(await catalogue.warmed("on")).not.toBeNull();
  });

  it("⚠ the platform pack boots it eagerly (the wiring assert)", () => {
    const src = readFileSync(
      fileURLToPath(
        new URL("../../../../../content/platform/pack.yaml", import.meta.url),
      ),
      "utf-8",
    );
    expect(src).toMatch(/template: \/platform\/idea\/PlacementCatalogue/);
  });
});

describe("Placement residency", () => {
  it("the catalogue is a system singleton — never culled, never destructed", () => {
    const catalogue = makeStuff(() => new PlacementCatalogue());
    expect(catalogue.canEvict({} as never).ok).toBe(false);
    expect(catalogue.canDestruct().ok).toBe(false);
  });

  it("a member's primary word is its first preposition, else its name", () => {
    expect(member("from", ["from", "on"]).getPrimaryWord()).toBe("from");
    expect(member("odd", []).getPrimaryWord()).toBe("odd");
  });
});
