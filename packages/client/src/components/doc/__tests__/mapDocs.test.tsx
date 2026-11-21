/**
 * The map's documents (navigation card D12): sources present, an unknown
 * fact key becomes a row, no builder output carries a button, the zone
 * thumbnail renders from your own copy.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { NavWay, TooltipDoc } from "@saxonberg/types";
import { useStore } from "../../../store/index";
import { DocView } from "../blocks";
import { crumbDoc, edgeDoc, placeDoc, wayDoc, PATH_LABEL } from "../docs";

const links = { onCommandClick: () => {}, onCommandPreview: () => {} };

/** ⛔ No action buttons — the spoiler block's own reveal is the one control a document has. */
const noButton = (doc: TooltipDoc): void => {
  const { container, unmount } = render(<DocView doc={doc} {...links} />);
  const actions = [...container.querySelectorAll("button")].filter((b) => !b.closest('[data-testid="doc-spoiler"]'));
  expect(actions).toEqual([]);
  unmount();
};

describe("map documents", () => {
  beforeEach(() => useStore.getState().applyMapSnapshot({ documents: [] }));

  it("placeDoc: tier, every channel it was learned on, the path as the one spoiler, what a click does", () => {
    const doc = placeDoc(
      { name: "the vault", key: "/test/delve/vault", tier: "known", keywords: ["vault"], sources: [{ channel: "seen" }, { channel: "searched" }] },
      { command: "route to vault" },
    );
    expect(doc.header?.kindWord).toBe("a place you know of");
    // One plain row, in the order learned — never a count of "records".
    expect(doc.facts?.map((f) => [f.label, f.value])).toEqual([["how you know it", "you found it searching, then you saw it"]]);
    expect(doc.spoilers).toEqual([{ level: 2, label: PATH_LABEL, text: "/test/delve/vault" }]);
    expect(doc.command).toBe("route to vault");
    // No age: claims are dated in game time and the client has no game now.
    expect(doc.facts?.every((f) => f.at === undefined)).toBe(true);
    noButton(doc);
  });

  it("placeDoc: a place with no word to route by says so", () => {
    const doc = placeDoc({ name: "a stop", key: "/x", tier: "known", keywords: [], sources: [{ channel: "published" }] }, { command: null });
    expect(doc.command).toBeUndefined();
    expect(doc.hint).toMatch(/no word to route there by/);
  });

  it("wayDoc: one row per fact key — a key nobody worded is a plain row; what stops you and what would work", () => {
    const way: NavWay = {
      direction: "down",
      state: "open",
      crossesZone: false,
      oneWay: true,
      facts: { opening: "0.9 × 1.4 m", portcullis: "raised" },
      take: { ok: false, gate: "exitMode", reason: "You can't walk that way — you'll have to climb.", works: { mode: "climb", command: "climb down" } },
    };
    const doc = wayDoc("down", "go down", { to: "the floor of the pit", toSource: "walked", way, foundBySearching: true });
    const rows = Object.fromEntries((doc.facts ?? []).map((f) => [f.label, [f.value, f.source]]));
    expect(rows["to"]).toEqual(["the floor of the pit", "walked"]);
    expect(rows["opening"]).toEqual(["0.9 × 1.4 m", "seen"]);
    expect(rows["portcullis"]).toEqual(["raised", "seen"]);
    // `oneWay` is an authoring flag, never shown as "no way back".
    expect(rows["one way"]).toBeUndefined();
    expect(rows["found"]).toEqual(["by searching", "searched"]);
    expect(doc.prose).toMatch(/have to climb/);
    expect(doc.hint).toMatch(/climb down/);
    noButton(doc);
  });

  it("edgeDoc: stale and disagreeing ways say so", () => {
    const doc = edgeDoc(
      { dir: "north", state: "shut", stale: true, foundBySearching: false, conflict: true, shape: "link", claims: [{ channel: "seen" }] },
      { from: "the hall", to: "the yard", others: ["the cellar"] },
    );
    expect(doc.prose).toMatch(/Not seen the last time you looked/);
    expect(doc.prose).toMatch(/disagrees with itself/);
    expect(doc.facts?.find((f) => f.label === "also said to lead")?.value).toBe("the cellar");
    noButton(doc);
  });

  it("crumbDoc: from your claim; unnamed without one", () => {
    const named = crumbDoc(
      { address: "terminus/city", name: "Terminus City" },
      { claim: { channel: "walked", government: { name: "the City of Terminus" }, localityKind: "settlement" }, claims: 12, places: 4 },
    );
    expect(named.facts?.map((f) => f.label)).toEqual(["first came", "your map", "kind", "government"]);
    expect(named.facts?.find((f) => f.label === "your map")?.value).toBe("4 places you know here");
    expect(named.command).toBe("map terminus/city");
    expect(crumbDoc({ address: "terminus/city" }, { claims: 0 }).header?.name).toBe("Unnamed");
    // W8: the civic facts, when the server answered for a Locality you hold.
    const civic = crumbDoc(
      { address: "terminus/city", name: "Terminus City" },
      { claim: { channel: "walked" }, claims: 3 },
      { seats: [{ seat: "Mayor", holder: "Odo" }, { seat: "Clerk", holder: null }], resident: false, forecast: "cirrus — a front may be moving in" },
    );
    const rows = Object.fromEntries((civic.facts ?? []).map((f) => [f.label, f.value]));
    expect(rows).toMatchObject({ "you are": "a visitor", Mayor: "Odo", Clerk: "vacant", forecast: "cirrus — a front may be moving in" });
    noButton(named);
  });

  it("the zone thumbnail block draws from your copy, and is absent when your map has nothing there", () => {
    const tag = (path: string) => ({ path, spoiler: 2 as const });
    const first = render(<DocView doc={{ header: { name: "south" }, zoneThumb: { zone: "/test/wilds", level: 0 } }} {...links} />);
    expect(screen.queryByTestId("doc-zone-thumb")).toBeNull();
    first.unmount();
    useStore.getState().applyMapSnapshot({
      documents: [
        {
          locality: "last-counted-mile",
          claims: [{ key: "k", kind: "place", place: tag("/test/wilds/treeline"), name: "treeline", channel: "walked", at: { zone: tag("/test/wilds"), x: 0, y: 0, z: 0, level: 0 }, firstSeen: 1, lastSeen: 1 }],
        },
      ],
    });
    render(<DocView doc={{ header: { name: "south" }, zoneThumb: { zone: "/test/wilds", level: 0 } }} {...links} />);
    expect(screen.getByTestId("doc-zone-thumb")).toBeTruthy();
    expect(screen.getByTestId("nav-thumb")).toBeTruthy();
  });
});
