/**
 * studioSlice tests — the reworked Studio "Kinds" surface:
 *
 *   1. the load-bearing data-integrity round-trip (the overlay never drops
 *      keys the schema doesn't surface; byte-identical to the raw editor);
 *   2. the VIEW ROUTER transitions (catalogue → blueprint → template and back;
 *      catalogue → composer → match → blueprint — the round-trip);
 *   3. the composer's exact + superset match filter, base-select implied-mixin
 *      pre-seed, ordered-mixin reorder;
 *   4. `createTemplate` disposition surfaced;
 *   5. scaffold + commit disposition/ordering-gate (unchanged behavior).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BlueprintSummary, MixinPalette } from "@saxonberg/types";

// Mock the REST client so actions can be exercised without a server.
const scaffoldMock = vi.fn();
const commitMock = vi.fn();
const listMixinsMock = vi.fn();
const listBlueprintsMock = vi.fn();
const describeMock = vi.fn();
const createTemplateMock = vi.fn();
vi.mock("../../components/cms/studioClient", async (orig) => {
  const actual =
    await orig<typeof import("../../components/cms/studioClient")>();
  return {
    ...actual,
    studioClient: {
      ...actual.studioClient,
      scaffold: (...a: unknown[]) => scaffoldMock(...a),
      commit: (...a: unknown[]) => commitMock(...a),
      listMixins: (...a: unknown[]) => listMixinsMock(...a),
      listBlueprints: (...a: unknown[]) => listBlueprintsMock(...a),
      describe: (...a: unknown[]) => describeMock(...a),
      createTemplate: (...a: unknown[]) => createTemplateMock(...a),
    },
  };
});

import { useStore } from "../index";
import {
  classifyMatches,
  effectiveMixins,
  mergeStudioData,
  moveItem,
  serializeStudioData,
  signatureFromParts,
} from "../studioSlice";

/** A `template.data` with a MIX of authorable + non-authorable keys. */
const BASE_DATA = {
  name: "Dave",
  shortDescription: "a weathered bartender",
  emittedIntensity: 3,
  fuelClockStamp: 172834,
  _internalCache: { warm: true, entries: [1, 2, 3] },
};

/** A small blueprint fixture set for the match filter + catalogue tests. */
function bp(over: Partial<BlueprintSummary>): BlueprintSummary {
  const baseClass = over.baseClass ?? "Idea";
  const mixinNames = over.mixinNames ?? [];
  return {
    blueprintId: over.blueprintId ?? over.name ?? "id",
    name: over.name ?? "Kind",
    kind: over.kind ?? "composition",
    baseClass,
    mixinNames,
    blessed: over.blessed ?? false,
    signature: over.signature ?? signatureFromParts(baseClass, mixinNames),
    ...(over.classPath ? { classPath: over.classPath } : {}),
    ...(over.parent ? { parent: over.parent } : {}),
    ...(over.description ? { description: over.description } : {}),
  };
}

const COIN = bp({
  blueprintId: "coin",
  name: "Coin",
  kind: "concrete",
  baseClass: "Idea",
  mixinNames: ["GlobbableMixin"],
  classPath: "/obj/Coin",
  blessed: true,
});
const MONEYBAG = bp({
  blueprintId: "moneybag",
  name: "MoneyBag",
  baseClass: "Idea",
  mixinNames: ["GlobbableMixin", "ContainerMixin"],
  classPath: "/obj/MoneyBag",
});

const PALETTE: MixinPalette = {
  mixins: [
    { name: "Idea", kind: "base" },
    { name: "Thing", kind: "base" },
    { name: "GlobbableMixin", kind: "mixin" },
    { name: "ContainerMixin", kind: "mixin" },
    { name: "VisibleMixin", kind: "mixin" },
  ],
  bases: [
    { name: "Idea", classPath: "/obj/Idea", impliedMixins: [] },
    {
      name: "Thing",
      classPath: "/obj/Thing",
      impliedMixins: ["VisibleMixin"],
    },
  ],
};

function resetStudio(): void {
  useStore.setState({
    studio: {
      view: "catalogue",
      blueprints: null,
      blueprintsError: null,
      search: "",
      selectedBlueprint: null,
      palette: null,
      inspectedMixin: null,
      mixinDetails: {},
      inspectError: null,
      template: null,
      templateResult: null,
      description: null,
      baseData: {},
      edits: {},
      cleared: [],
      advanced: false,
      loading: false,
      error: null,
      composer: {
        name: "",
        base: {
          name: "Idea",
          classPath: "",
          impliedMixins: [],
          rootBaseClass: "Idea",
        },
        orderedMixins: [],
      },
      scaffoldSource: null,
      scaffoldTarget: null,
      commitDisposition: null,
      commitReloaded: false,
      commitMessage: null,
      busy: false,
    },
  });
}

const st = () => useStore.getState().studio;

// ---------------------------------------------------------------------------
describe("studioSlice overlay (data-integrity round-trip)", () => {
  beforeEach(resetStudio);

  it("studioLoadData parses the raw body into baseData", () => {
    useStore.getState().studioLoadData(JSON.stringify(BASE_DATA, null, 2));
    expect(st().baseData).toEqual(BASE_DATA);
    expect(st().edits).toEqual({});
    expect(st().cleared).toEqual([]);
  });

  it("unedited round-trip is byte-identical to the raw editor", () => {
    const raw = JSON.stringify(BASE_DATA, null, 2);
    useStore.getState().studioLoadData(raw);
    expect(useStore.getState().studioSerialize()).toBe(raw);
  });

  it("editing one authorable field updates only that key, non-authorable ride through", () => {
    useStore.getState().studioLoadData(JSON.stringify(BASE_DATA, null, 2));
    useStore.getState().studioSetField("name", "Davina");
    const out = JSON.parse(useStore.getState().studioSerialize());
    expect(out.name).toBe("Davina");
    expect(out.shortDescription).toBe(BASE_DATA.shortDescription);
    expect(out.fuelClockStamp).toBe(BASE_DATA.fuelClockStamp);
    expect(out._internalCache).toEqual(BASE_DATA._internalCache);
    expect(Object.keys(out).sort()).toEqual(Object.keys(BASE_DATA).sort());
  });

  it("studioClearField removes the key (reset to inherit)", () => {
    useStore.getState().studioLoadData(JSON.stringify(BASE_DATA, null, 2));
    useStore.getState().studioClearField("shortDescription");
    const out = JSON.parse(useStore.getState().studioSerialize());
    expect(out).not.toHaveProperty("shortDescription");
    expect(out.name).toBe(BASE_DATA.name);
  });

  it("studioMergedData returns the overlay as an object (YAML round-trip source)", () => {
    useStore.getState().studioLoadData(JSON.stringify(BASE_DATA, null, 2));
    useStore.getState().studioSetField("name", "Davina");
    expect(useStore.getState().studioMergedData()).toEqual({
      ...BASE_DATA,
      name: "Davina",
    });
  });

  it("studioSetDataObject adopts a parsed object as the fresh baseline", () => {
    useStore.getState().studioLoadData(JSON.stringify(BASE_DATA, null, 2));
    useStore.getState().studioSetField("name", "X");
    useStore.getState().studioSetDataObject({ name: "Fresh", cap: 9 });
    expect(st().baseData).toEqual({ name: "Fresh", cap: 9 });
    expect(st().edits).toEqual({});
    expect(st().cleared).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe("studioSlice pure helpers", () => {
  it("serializeStudioData empty overlay equals JSON.stringify(base, null, 2)", () => {
    expect(serializeStudioData(BASE_DATA, {}, [])).toBe(
      JSON.stringify(BASE_DATA, null, 2),
    );
  });

  it("mergeStudioData removes cleared keys even when also edited", () => {
    const out = mergeStudioData(BASE_DATA, { name: "X" }, ["name"]);
    expect(out).not.toHaveProperty("name");
  });

  it("signatureFromParts matches the server format (base|sorted-unique)", () => {
    expect(signatureFromParts("Idea", ["B", "A", "A"])).toBe("Idea|A,B");
    expect(signatureFromParts("Thing", [])).toBe("Thing|");
  });

  it("effectiveMixins dedupes implied ∪ ordered, implied first", () => {
    expect(effectiveMixins(["V"], ["G", "V", "C"])).toEqual(["V", "G", "C"]);
  });

  it("moveItem moves an element and is a no-op for out-of-range", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveItem(["a", "b", "c"], 1, 1)).toEqual(["a", "b", "c"]);
    expect(moveItem(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });

  it("classifyMatches partitions exact (same set+base) vs superset (strict)", () => {
    const list = [COIN, MONEYBAG];
    // Composition = Idea + GlobbableMixin → exact = Coin; superset = MoneyBag.
    const m = classifyMatches(list, "Idea", ["GlobbableMixin"]);
    expect(m.exact.map((b) => b.name)).toEqual(["Coin"]);
    expect(m.superset.map((b) => b.name)).toEqual(["MoneyBag"]);
  });

  it("classifyMatches: a different base is NOT an exact match", () => {
    const m = classifyMatches([COIN], "Thing", ["GlobbableMixin"]);
    expect(m.exact).toEqual([]);
    // Not a superset either (same size, same set but the base differs → the
    // size-strict superset rule excludes equal sets regardless of base).
    expect(m.superset).toEqual([]);
  });

  it("classifyMatches: exact set wins over superset (no double-count)", () => {
    const m = classifyMatches([MONEYBAG], "Idea", [
      "GlobbableMixin",
      "ContainerMixin",
    ]);
    expect(m.exact.map((b) => b.name)).toEqual(["MoneyBag"]);
    expect(m.superset).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe("studioSlice view router", () => {
  beforeEach(resetStudio);

  it("catalogue → blueprint → template → back to blueprint → back to catalogue", () => {
    const s = useStore.getState();
    expect(st().view).toBe("catalogue");

    s.studioSelectBlueprint(COIN);
    expect(st().view).toBe("blueprint");
    expect(st().selectedBlueprint?.name).toBe("Coin");

    s.studioBeginTemplate(COIN);
    expect(st().view).toBe("template");
    expect(st().template).toEqual({
      path: "",
      classPath: "/obj/Coin",
      blueprintName: "Coin",
      yamlMode: false,
    });
    // A fresh template resets the overlay to an empty baseline.
    expect(st().baseData).toEqual({});

    // Back to blueprint (re-select the same one).
    s.studioSelectBlueprint(COIN);
    expect(st().view).toBe("blueprint");

    s.studioGoCatalogue();
    expect(st().view).toBe("catalogue");
    expect(st().selectedBlueprint).toBeNull();
    expect(st().template).toBeNull();
  });

  it("beginTemplate describes the backing class", () => {
    describeMock.mockResolvedValue({
      classPath: "/obj/Coin",
      mixins: [],
      fields: [],
    });
    useStore.getState().studioBeginTemplate(COIN);
    expect(describeMock).toHaveBeenLastCalledWith("/obj/Coin", undefined);
  });

  it("the round-trip: catalogue → composer → match → blueprint", () => {
    // Seed the catalogue + palette so the composer's match filter can run.
    useStore.setState({
      studio: { ...st(), blueprints: [COIN, MONEYBAG], palette: PALETTE },
    });
    const s = useStore.getState();

    s.studioBeginComposer();
    expect(st().view).toBe("composer");

    // Compose Idea + GlobbableMixin → exact match is Coin.
    s.studioComposerAddMixin("GlobbableMixin");
    const matches = useStore.getState().studioMatchingBlueprints();
    expect(matches.exact.map((b) => b.name)).toEqual(["Coin"]);
    expect(matches.superset.map((b) => b.name)).toEqual(["MoneyBag"]);

    // Click the match → route to that blueprint's detail (the round-trip).
    s.studioSelectBlueprint(matches.exact[0]!);
    expect(st().view).toBe("blueprint");
    expect(st().selectedBlueprint?.name).toBe("Coin");
  });
});

// ---------------------------------------------------------------------------
describe("studioSlice composer", () => {
  beforeEach(() => {
    resetStudio();
    useStore.setState({ studio: { ...st(), palette: PALETTE } });
  });

  it("base-select pre-seeds the base's implied mixins", () => {
    useStore.getState().studioComposerSetBase("Thing");
    expect(st().composer.base.name).toBe("Thing");
    expect(st().composer.base.rootBaseClass).toBe("Thing");
    expect(st().composer.base.impliedMixins).toEqual(["VisibleMixin"]);
  });

  it("base-select drops an added mixin the new base already implies", () => {
    useStore.getState().studioComposerAddMixin("VisibleMixin");
    expect(st().composer.orderedMixins).toEqual(["VisibleMixin"]);
    useStore.getState().studioComposerSetBase("Thing");
    // VisibleMixin is now inherited → dropped from the added list.
    expect(st().composer.orderedMixins).toEqual([]);
    expect(st().composer.base.impliedMixins).toEqual(["VisibleMixin"]);
  });

  it("addMixin ignores a mixin already implied by the base", () => {
    useStore.getState().studioComposerSetBase("Thing");
    useStore.getState().studioComposerAddMixin("VisibleMixin");
    expect(st().composer.orderedMixins).toEqual([]);
  });

  it("reorder moves an added mixin (drag reorder)", () => {
    const s = useStore.getState();
    s.studioComposerAddMixin("GlobbableMixin");
    s.studioComposerAddMixin("ContainerMixin");
    s.studioComposerAddMixin("VisibleMixin");
    expect(st().composer.orderedMixins).toEqual([
      "GlobbableMixin",
      "ContainerMixin",
      "VisibleMixin",
    ]);
    s.studioComposerReorder(2, 0);
    expect(st().composer.orderedMixins).toEqual([
      "VisibleMixin",
      "GlobbableMixin",
      "ContainerMixin",
    ]);
  });

  it("beginComposer(seed) makes the blueprint's CLASS the base with EMPTY added", () => {
    // "Author a new kind from this →" on MoneyBag: the MoneyBag CLASS becomes
    // the superclass (NOT decomposed into Idea + its mixins). Its own mixin
    // set is the read-only inherited segment; the added stack starts empty.
    useStore.getState().studioBeginComposer(MONEYBAG);
    expect(st().composer.base.name).toBe("MoneyBag");
    expect(st().composer.base.classPath).toBe("/obj/MoneyBag");
    expect(st().composer.base.rootBaseClass).toBe("Idea");
    expect(st().composer.base.impliedMixins).toEqual([
      "GlobbableMixin",
      "ContainerMixin",
    ]);
    expect(st().composer.orderedMixins).toEqual([]);
  });

});

// ---------------------------------------------------------------------------
describe("studioSlice createTemplate disposition", () => {
  beforeEach(() => {
    resetStudio();
    createTemplateMock.mockReset();
    describeMock.mockResolvedValue({
      classPath: "/obj/Coin",
      mixins: [],
      fields: [],
    });
  });

  it("a committed create surfaces the disposition + path", async () => {
    createTemplateMock.mockResolvedValue({
      disposition: "committed",
      path: "/obj/MyCoin",
    });
    useStore.getState().studioBeginTemplate(COIN);
    useStore.getState().studioSetTemplatePath("/obj/MyCoin");
    useStore.getState().studioSetField("name", "My Coin");
    await useStore.getState().studioCreateTemplate("csrf");
    expect(createTemplateMock).toHaveBeenCalledWith(
      { path: "/obj/MyCoin", classPath: "/obj/Coin", data: { name: "My Coin" } },
      "csrf",
    );
    expect(st().templateResult).toEqual({
      disposition: "committed",
      path: "/obj/MyCoin",
    });
  });

  it("a denied create surfaces the refusal message (never a bare boolean)", async () => {
    createTemplateMock.mockResolvedValue({
      disposition: "denied",
      message: "only a wizard can name a class",
    });
    useStore.getState().studioBeginTemplate(COIN);
    useStore.getState().studioSetTemplatePath("/obj/MyCoin");
    await useStore.getState().studioCreateTemplate("csrf");
    expect(st().templateResult?.disposition).toBe("denied");
    expect(st().templateResult?.message).toContain("wizard");
  });
});

// ---------------------------------------------------------------------------
describe("studioSlice scaffold + commit (composer act #3)", () => {
  beforeEach(() => {
    resetStudio();
    scaffoldMock.mockReset();
    commitMock.mockReset();
  });

  it("scaffold stores the generated source + paths and resets commit state", async () => {
    scaffoldMock.mockResolvedValue({
      source: "export class Coin extends GlobbableMixin(Idea) {}\n",
      targetPath: "/obj/Coin.ts",
      draftPath: "/home/alice/drafts/Coin.ts",
    });
    await useStore
      .getState()
      .studioScaffold(
        { name: "Coin", baseClass: "Idea", mixinNames: ["GlobbableMixin"] },
        "csrf",
      );
    expect(st().scaffoldSource).toContain("export class Coin");
    expect(st().scaffoldTarget).toBe("/obj/Coin.ts");
    expect(st().commitDisposition).toBeNull();
    expect(st().commitReloaded).toBe(false);
  });

  it("drops a STALE scaffold response (the latest request owns the state)", async () => {
    // The composer auto-scaffolds per composition change, so overlapping
    // requests are normal. A slow earlier response must not clobber a newer
    // one. Arrange for request A to resolve AFTER the newer request B.
    let resolveA!: () => void;
    let resolveB!: () => void;
    scaffoldMock
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            resolveA = () => r({ source: "AAA", targetPath: "/obj/A.ts" });
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            resolveB = () => r({ source: "BBB", targetPath: "/obj/B.ts" });
          }),
      );
    const s = useStore.getState();
    const pA = s.studioScaffold(
      { name: "A", baseClass: "Idea", mixinNames: [] },
      "csrf",
    );
    const pB = s.studioScaffold(
      { name: "B", baseClass: "Idea", mixinNames: [] },
      "csrf",
    );
    // Newer request B resolves first, then the stale A resolves.
    resolveB();
    await pB;
    resolveA();
    await pA;
    // B won; A's late arrival was dropped.
    expect(st().scaffoldSource).toBe("BBB");
    expect(st().scaffoldTarget).toBe("/obj/B.ts");
  });

  it("committed + reloaded UNLOCKS the follow-on ordering gate", async () => {
    scaffoldMock.mockResolvedValue({
      source: "x",
      targetPath: "/obj/Coin.ts",
    });
    commitMock.mockResolvedValue({
      disposition: "committed",
      classPath: "/obj/Coin.ts",
      reloaded: true,
    });
    const s = useStore.getState();
    await s.studioScaffold(
      { name: "Coin", baseClass: "Idea", mixinNames: [] },
      "csrf",
    );
    await useStore.getState().studioCommit("csrf");
    expect(st().commitDisposition).toBe("committed");
    expect(st().commitReloaded).toBe(true);
  });

  it("a DENIED commit does not enable the follow-on", async () => {
    scaffoldMock.mockResolvedValue({ source: "x", targetPath: "/obj/Coin.ts" });
    commitMock.mockResolvedValue({
      disposition: "denied",
      message: "you must be a wizard to publish a class",
    });
    const s = useStore.getState();
    await s.studioScaffold(
      { name: "Coin", baseClass: "Idea", mixinNames: [] },
      "csrf",
    );
    await useStore.getState().studioCommit("csrf");
    expect(st().commitDisposition).toBe("denied");
    expect(st().commitReloaded).toBe(false);
    expect(st().commitMessage).toContain("wizard");
  });

  it("committed-but-not-reloaded (compile failure) keeps the gate closed", async () => {
    scaffoldMock.mockResolvedValue({ source: "x", targetPath: "/obj/Broken.ts" });
    commitMock.mockResolvedValue({
      disposition: "committed",
      classPath: "/obj/Broken.ts",
      reloaded: false,
      reloadDetail: "TS2304: Cannot find name 'Nope'",
    });
    const s = useStore.getState();
    await s.studioScaffold(
      { name: "Broken", baseClass: "Nope", mixinNames: [] },
      "csrf",
    );
    await useStore.getState().studioCommit("csrf");
    expect(st().commitReloaded).toBe(false);
    expect(st().commitMessage).toContain("TS2304");
  });
});
