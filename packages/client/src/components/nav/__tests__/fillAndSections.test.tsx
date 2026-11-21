/**
 * The card's sections (D7), filling the height (D8), the crumbs (D10) and
 * the status bar's outdoors (D13). The fill RULE is tested with numbers —
 * jsdom has no layout; the behavior is the browser walk's.
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import type { NavSections } from "@saxonberg/types";
import { useStore } from "../../../store/index";
import { fitSections } from "../useFillHeight";
import {
  horizonSummary,
  structureSummary,
  youSummary,
  zoneSummary,
  StructureBody,
} from "../sections";
import { IconAction } from "../IconAction";
import { Crumbs } from "../Crumbs";
import { StatusBar } from "../../frame/StatusBar";

const ORDER = ["world", "zone", "horizon", "place", "you"];
const base = { order: ORDER, userSet: {}, auto: new Set<string>(), needs: {}, free: 0, overflow: 0, tryRoom: 72 };

describe("fitSections — fill the height", () => {
  it("opens in order while there is room", () => {
    expect(fitSections({ ...base, free: 400 })).toEqual({ kind: "open", name: "world" });
    expect(fitSections({ ...base, free: 400, auto: new Set(["world"]) })).toEqual({ kind: "open", name: "zone" });
  });

  it("folds the LAST one it opened when the content overflows", () => {
    expect(fitSections({ ...base, overflow: 30, auto: new Set(["world", "zone", "place"]) })).toEqual({ kind: "fold", name: "place" });
  });

  it("never touches a section the player set", () => {
    expect(fitSections({ ...base, free: 400, userSet: { world: "closed" } })).toEqual({ kind: "open", name: "zone" });
    expect(fitSections({ ...base, overflow: 30, auto: new Set(["zone"]), userSet: { zone: "open" } })).toEqual({ kind: "settled" });
  });

  it("does not retry a section until what it needed is free; settles", () => {
    const needs = { world: 300 };
    expect(fitSections({ ...base, free: 200, needs, order: ["world"] })).toEqual({ kind: "settled" });
    expect(fitSections({ ...base, free: 320, needs, order: ["world"] })).toEqual({ kind: "open", name: "world" });
    // An unknown need is tried with about four lines free, not less.
    expect(fitSections({ ...base, free: 50, order: ["you"] })).toEqual({ kind: "settled" });
  });
});

describe("the sections — absent, never empty", () => {
  it("the ground line is whose ground it is — no zone name, no coordinates", () => {
    expect(zoneSummary({})).toBeNull();
    const s: NavSections = {
      zone: { v: 1, label: "The Sunken Delve" },
      localities: { v: 1, chain: [], jurisdiction: [{ key: "c", name: "the City of Terminus" }] },
    };
    expect(zoneSummary(s)).toBe("the City of Terminus");
    expect(zoneSummary({ zone: { v: 1 } })).toBe("Unclaimed ground");
  });

  it("the horizon is absent with no things and no traffic", () => {
    expect(horizonSummary({ horizon: { v: 1, atSea: false, things: [], traffic: 0 } })).toBeNull();
    expect(
      horizonSummary({ horizon: { v: 1, atSea: false, things: [{ stuffId: "l", name: "the lighthouse", landmark: true, glance: { point: "NE", roughMiles: 2 } }], traffic: 2 } }),
    ).toBe("Horizon · the lighthouse NE 2 mi · 2 sails");
  });

  it("the structure says floor N of M — storeys, never z", () => {
    const s: NavSections = { building: { v: 1, name: "The Counting-house", storey: 0, storeys: 3 } };
    expect(structureSummary(s)).toBe("The Counting-house · floor 1 of 3");
    expect(structureSummary({ building: null })).toBeNull();
    render(<StructureBody sections={s} onLook={() => {}} />);
    expect(screen.getByTestId("nav-storey").textContent).toBe("1 of 3");
  });

  it("aboard: the ship names the structure, and where she lies is said", () => {
    const s: NavSections = {
      building: null,
      localities: { v: 1, chain: [], ship: { name: "the Hesper" }, outer: { at: "berth", ship: "the Hesper", landing: "the Wharfside" }, jurisdiction: [] },
    };
    expect(structureSummary(s)).toBe("the Hesper");
    render(<StructureBody sections={s} onLook={() => {}} />);
    expect(screen.getByTestId("nav-lie").textContent).toBe("made fast at the Wharfside");
  });

  it("you is absent without the you section", () => {
    expect(youSummary({})).toBeNull();
    expect(youSummary({ you: { v: 1, pace: "walk", load: "light load", light: "lamp lit" } })).toBe("You · walking · light load · lamp lit");
  });
});

describe("Crumbs — your own", () => {
  it("names a crumb from your claim; an unlearned one is unnamed; a room named for its area still shows both", () => {
    const crumbs = [
      { address: "terminus", name: "Terminus" },
      { address: "terminus/city" },
      { address: "lounge", name: "The Lounge" },
    ];
    render(<Crumbs crumbs={crumbs} placeName="the lounge" onSendCommand={() => {}} />);
    const shown = screen.getAllByTestId("nav-crumb").map((c) => [c.textContent, c.getAttribute("data-named")]);
    expect(shown).toEqual([
      ["Terminus", "true"],
      ["…", "false"],
      ["The Lounge", "true"],
    ]);
    expect(screen.getByTestId("nav-here-name").textContent).toBe("the lounge");
  });
});

describe("the status bar's outdoors", () => {
  it("weather · season · day or night, from the place section; absent without it", () => {
    useStore.getState().applyNavSnapshot({});
    const { rerender } = render(<StatusBar />);
    expect(screen.queryByTestId("status-outdoors")).toBeNull();
    useStore.getState().applyNavSnapshot({ place: { v: 1, stuffId: "p", name: "the yard", weather: "light rain", season: "early spring", daylight: "night" } });
    rerender(<StatusBar />);
    expect(screen.getByTestId("status-outdoors").textContent).toBe("light rain · early spring · night");
  });
});

describe("an act is an icon that previews its command (owner, review)", () => {
  it("look is the eye; hover previews `look`, a click runs it", () => {
    const onPreview = vi.fn();
    const onRun = vi.fn();
    render(<IconAction icon="act.look" label="look" command="look" testid="nav-place-look" onRun={onRun} onPreview={onPreview} />);
    const btn = screen.getByTestId("nav-place-look");
    expect(btn.querySelector("[data-icon=\"act.look\"]")).toBeTruthy();
    fireEvent.mouseEnter(btn);
    expect(onPreview).toHaveBeenLastCalledWith("look");
    fireEvent.click(btn);
    expect(onRun).toHaveBeenCalledWith("look");
  });
});
