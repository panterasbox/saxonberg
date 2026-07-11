/**
 * studioSlice tests — the load-bearing data-integrity round-trip
 * (req Acceptance #3) plus the overlay edit/clear semantics.
 *
 * The overlay must NEVER drop keys the schema doesn't surface, and must
 * produce a body byte-identical to the raw-JSON editor
 * (`JSON.stringify(data, null, 2)`) for an unedited round-trip.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "../index";
import { serializeStudioData } from "../studioSlice";

/** A `template.data` with a MIX of authorable + non-authorable keys. */
const BASE_DATA = {
  name: "Dave",
  shortDescription: "a weathered bartender",
  emittedIntensity: 3,
  // Non-authorable / runtime-state keys the schema never surfaces — MUST
  // survive an unedited round-trip and any edit to a sibling.
  fuelClockStamp: 172834,
  _internalCache: { warm: true, entries: [1, 2, 3] },
};

function resetStudio(): void {
  useStore.setState({
    studio: {
      description: null,
      baseData: {},
      edits: {},
      cleared: [],
      advanced: false,
      loading: false,
      error: null,
    },
  });
}

describe("studioSlice overlay", () => {
  beforeEach(resetStudio);

  it("studioLoadData parses the raw body into baseData", () => {
    const raw = JSON.stringify(BASE_DATA, null, 2);
    useStore.getState().studioLoadData(raw);
    expect(useStore.getState().studio.baseData).toEqual(BASE_DATA);
    expect(useStore.getState().studio.edits).toEqual({});
    expect(useStore.getState().studio.cleared).toEqual([]);
  });

  it("(a) unedited round-trip is byte-identical to the raw editor", () => {
    const raw = JSON.stringify(BASE_DATA, null, 2);
    useStore.getState().studioLoadData(raw);
    expect(useStore.getState().studioSerialize()).toBe(raw);
  });

  it("(b) editing one authorable field updates only that key", () => {
    useStore.getState().studioLoadData(JSON.stringify(BASE_DATA, null, 2));
    useStore.getState().studioSetField("name", "Davina");
    const out = JSON.parse(useStore.getState().studioSerialize());
    expect(out.name).toBe("Davina");
    // Every other key — authorable and non-authorable — is untouched.
    expect(out.shortDescription).toBe(BASE_DATA.shortDescription);
    expect(out.emittedIntensity).toBe(BASE_DATA.emittedIntensity);
    expect(out.fuelClockStamp).toBe(BASE_DATA.fuelClockStamp);
    expect(out._internalCache).toEqual(BASE_DATA._internalCache);
  });

  it("(c) a non-authorable key present in baseData is never dropped", () => {
    useStore.getState().studioLoadData(JSON.stringify(BASE_DATA, null, 2));
    useStore.getState().studioSetField("emittedIntensity", 9);
    const out = JSON.parse(useStore.getState().studioSerialize());
    expect(out).toHaveProperty("fuelClockStamp", BASE_DATA.fuelClockStamp);
    expect(out).toHaveProperty("_internalCache");
    // Key set is exactly the original set (no additions from editing an
    // existing key, no drops).
    expect(Object.keys(out).sort()).toEqual(Object.keys(BASE_DATA).sort());
  });

  it("editing preserves key ORDER (byte-compat under edit)", () => {
    useStore.getState().studioLoadData(JSON.stringify(BASE_DATA, null, 2));
    useStore.getState().studioSetField("name", "Davina");
    const expected = JSON.stringify(
      { ...BASE_DATA, name: "Davina" },
      null,
      2,
    );
    expect(useStore.getState().studioSerialize()).toBe(expected);
  });

  it("studioClearField removes the key (reset to inherit)", () => {
    useStore.getState().studioLoadData(JSON.stringify(BASE_DATA, null, 2));
    useStore.getState().studioClearField("shortDescription");
    const out = JSON.parse(useStore.getState().studioSerialize());
    expect(out).not.toHaveProperty("shortDescription");
    // Siblings intact.
    expect(out.name).toBe(BASE_DATA.name);
    expect(out.fuelClockStamp).toBe(BASE_DATA.fuelClockStamp);
  });

  it("set then clear the same field ends up cleared (clear wins)", () => {
    useStore.getState().studioLoadData(JSON.stringify(BASE_DATA, null, 2));
    useStore.getState().studioSetField("name", "Davina");
    useStore.getState().studioClearField("name");
    const out = JSON.parse(useStore.getState().studioSerialize());
    expect(out).not.toHaveProperty("name");
  });

  it("clear then set the same field re-adds it (set wins)", () => {
    useStore.getState().studioLoadData(JSON.stringify(BASE_DATA, null, 2));
    useStore.getState().studioClearField("name");
    useStore.getState().studioSetField("name", "Davina");
    const out = JSON.parse(useStore.getState().studioSerialize());
    expect(out.name).toBe("Davina");
    expect(useStore.getState().studio.cleared).not.toContain("name");
  });

  it("studioLoadData rejects a non-object body without wiping state", () => {
    useStore.getState().studioLoadData(JSON.stringify(BASE_DATA, null, 2));
    useStore.getState().studioLoadData("not json");
    expect(useStore.getState().studio.error).toBeTruthy();
    // Base data left intact — a bad reparse doesn't destroy the overlay.
    expect(useStore.getState().studio.baseData).toEqual(BASE_DATA);
  });

  it("studioToggleAdvanced flips the raw-JSON toggle", () => {
    expect(useStore.getState().studio.advanced).toBe(false);
    useStore.getState().studioToggleAdvanced();
    expect(useStore.getState().studio.advanced).toBe(true);
  });
});

describe("serializeStudioData (pure)", () => {
  it("empty overlay equals JSON.stringify(base, null, 2)", () => {
    expect(serializeStudioData(BASE_DATA, {}, [])).toBe(
      JSON.stringify(BASE_DATA, null, 2),
    );
  });

  it("cleared keys are removed even when also edited", () => {
    const out = JSON.parse(
      serializeStudioData(BASE_DATA, { name: "X" }, ["name"]),
    );
    expect(out).not.toHaveProperty("name");
  });
});
