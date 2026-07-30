/**
 * Locality government-key tests — the third realized tier-level field:
 * sparse default, setter null/trim behavior, and the regression that a
 * government-less Locality participates in address resolution exactly as
 * before the field existed.
 */

import { describe, it, expect, beforeEach } from "vitest";
import Locality from "../Locality";
import AddressRegistry from "../../../obj/AddressRegistry";
import { StuffApi } from "../../../api/stuff";
import { ShadowApi } from "../../../api/shadow";
import { AddressApi } from "../../../api/address";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";

const newLocality = (): Locality => makeStuff(() => new Locality());

describe("Locality._governmentKey", () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    makeStuffAtPath(() => new AddressRegistry(), "/obj/AddressRegistry");
  });

  it("defaults to null (the sparse common case)", () => {
    const l = newLocality();
    expect(l.getGovernmentKey()).toBeNull();
  });

  it("round-trips a key and trims to null on empty/whitespace", () => {
    const l = newLocality();
    l.setGovernmentKey("terminus-city");
    expect(l.getGovernmentKey()).toBe("terminus-city");
    l.setGovernmentKey("  padded  ");
    expect(l.getGovernmentKey()).toBe("padded");
    l.setGovernmentKey("");
    expect(l.getGovernmentKey()).toBeNull();
    l.setGovernmentKey("   ");
    expect(l.getGovernmentKey()).toBeNull();
    l.setGovernmentKey(null);
    expect(l.getGovernmentKey()).toBeNull();
  });

  it("rejects non-string, non-null values", () => {
    const l = newLocality();
    expect(() =>
      l.setGovernmentKey(42 as unknown as string)
    ).toThrow(TypeError);
  });

  it("is carried in persistentFields for hydration", () => {
    expect(Locality.persistentFields).toContain("_governmentKey");
  });

  it("a government-less Locality resolves coverage exactly as before", () => {
    const l = newLocality();
    l.setName("Narnia");
    l.setAddress("narnia");
    AddressApi.registerLocality(l);
    try {
      const covering = AddressApi.coveringLocalityOf("narnia/castle");
      expect(covering).toBe(l);
      expect(covering?.getGovernmentKey()).toBeNull();
    } finally {
      AddressApi.deregisterLocality(l);
    }
  });
});
