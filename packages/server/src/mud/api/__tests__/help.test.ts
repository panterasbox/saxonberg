/**
 * HelpApi — the single read chokepoint over HelpCatalogue.
 *
 * Proves (a) the capability filter runs on every read and is a **no-op
 * pass at the anonymous floor** (nothing withheld), (b) the filter is the
 * single chokepoint — `applyFilter` is identity at the floor and drops a
 * spoiler topic once a (test-only) ceiling is supplied, and (c) forwarding
 * correctness for each method against a stubbed catalogue, including the
 * pre-warm empty-result path.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type {
  HelpTopic,
  HelpIndexEntry,
  HelpSearchGroup,
  HelpCategory,
  HelpKind,
} from "@saxonberg/types";
import { HelpApi, type HelpViewer } from "../help";
import { StuffApi } from "../stuff";
import type HelpCatalogue from "../../obj/HelpCatalogue";

function topic(id: string, kind: HelpKind, spoiler: boolean): HelpTopic {
  return {
    id,
    kind,
    title: id,
    summary: `${id} summary`,
    keywords: [id],
    body: `${id} body`,
    relations: [],
    spoiler,
    source: { subdivision: kind === "command" ? "commands" : "api", ref: id },
  };
}

const NORMAL = topic("command.look", "command", false);
const SECRET = topic("api.SecretApi.x", "api", true);

function entry(t: HelpTopic): HelpIndexEntry {
  return {
    id: t.id,
    kind: t.kind,
    title: t.title,
    summary: t.summary,
    keywords: t.keywords,
  };
}

/** A stub catalogue exposing exactly the read surface HelpApi calls. */
function stubCatalogue(): HelpCatalogue {
  const map = new Map<string, HelpTopic>([
    [NORMAL.id, NORMAL],
    [SECRET.id, SECRET],
  ]);
  const fake = {
    getTopic: (id: string) => map.get(id) ?? null,
    indexSlice: (): HelpIndexEntry[] => [entry(NORMAL), entry(SECRET)],
    categories: (): HelpCategory[] => [
      { kind: "command", title: "Commands", count: 1 },
      { kind: "api", title: "Apis", count: 1 },
    ],
    listByKind: (kind: HelpKind): HelpIndexEntry[] =>
      kind === "command" ? [entry(NORMAL)] : kind === "api" ? [entry(SECRET)] : [],
    search: (_q: string): HelpSearchGroup[] => [
      { kind: "command", hits: [entry(NORMAL)] },
      { kind: "api", hits: [entry(SECRET)] },
    ],
    typeaheadMatch: (_q: string): HelpIndexEntry[] => [entry(NORMAL), entry(SECRET)],
    findCommandTopic: (verb: string) =>
      verb === "look" ? NORMAL : null,
    findApiTopic: (target: string) =>
      target.includes("SecretApi") ? SECRET : null,
  };
  return fake as unknown as HelpCatalogue;
}

describe("HelpApi", () => {
  beforeEach(() => {
    vi.spyOn(StuffApi, "findByTemplatePath").mockReturnValue(
      stubCatalogue() as never
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("withholds nothing at the anonymous floor (spoiler topics still returned)", () => {
    expect(
      HelpApi.index().entries.some((e) => e.id === SECRET.id)
    ).toBe(true);
    expect(HelpApi.fullTopic(SECRET.id)).toEqual(SECRET);
    expect(HelpApi.apiTopic("SecretApi.x")).toEqual(SECRET);
    expect(HelpApi.typeahead("x").some((e) => e.id === SECRET.id)).toBe(true);
    const apiGroup = HelpApi.search("x").groups.find((g) => g.kind === "api");
    expect(apiGroup?.hits.some((h) => h.id === SECRET.id)).toBe(true);
  });

  it("routes every read through the single applyFilter chokepoint", () => {
    const applyFilter = (
      HelpApi as unknown as {
        applyFilter: <T>(
          items: T[],
          spoilerOf: (t: T) => boolean,
          viewer: HelpViewer
        ) => T[];
      }
    ).applyFilter;

    const items = [NORMAL, SECRET];
    const floor: HelpViewer = { tier: "anonymous" };
    // Floor → identity (nothing withheld).
    expect(applyFilter(items, (t) => t.spoiler, floor)).toEqual(items);
    // A (test-only) ceiling drops the spoiler topic — one-place gating.
    const ceiling = { tier: "restricted" } as unknown as HelpViewer;
    expect(applyFilter(items, (t) => t.spoiler, ceiling)).toEqual([NORMAL]);
  });

  it("forwards index / listKind / search / command / api correctly", () => {
    expect(HelpApi.index().categories).toHaveLength(2);
    expect(HelpApi.listKind("command").topics).toEqual([entry(NORMAL)]);
    expect(HelpApi.search("anything").query).toBe("anything");
    expect(HelpApi.commandTopic("look")).toEqual(NORMAL);
    expect(HelpApi.commandTopic("nope")).toBeNull();
    expect(HelpApi.apiTopic("SecretApi.x")).toEqual(SECRET);
  });

  it("returns empty results before the catalogue warms (null)", () => {
    vi.spyOn(StuffApi, "findByTemplatePath").mockReturnValue(
      null as never
    );
    expect(HelpApi.index()).toEqual({ entries: [], categories: [] });
    expect(HelpApi.listKind("api")).toEqual({ kind: "api", topics: [] });
    expect(HelpApi.fullTopic("x")).toBeNull();
    expect(HelpApi.search("q")).toEqual({ query: "q", groups: [] });
    expect(HelpApi.typeahead("q")).toEqual([]);
  });
});
