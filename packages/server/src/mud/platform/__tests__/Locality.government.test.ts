/**
 * Locality government-key tests — the third realized tier-level field:
 * sparse default, setter null/trim behavior, and the regression that a
 * government-less Locality participates in address resolution exactly as
 * before the field existed.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from "vitest";
import Locality from "../idea/Locality";
import AddressRegistry from "../idea/AddressRegistry";
import { StuffApi } from "../../api/stuff";
import { ShadowApi } from "../../api/shadow";
import { AddressApi } from "../../api/address";
import { MixinApi } from "../../api/mixin";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../lib/security/__tests__/test-setup";

const newLocality = (): Locality => makeStuff(() => new Locality());

describe("Locality._governmentKey", () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    makeStuffAtPath(() => new AddressRegistry(), "/platform/idea/AddressRegistry");
  });

  it("defaults to null (the sparse common case)", () => {
    const l = newLocality();
    expect(l.getGovernmentKey()).toBeNull();
  });

  it("round-trips a key and trims to null on empty/whitespace", () => {
    const l = newLocality();
    void l.setGovernmentKey("terminus-city")?.catch(() => {}); // the load is the applier's (documents D7)
    expect(l.getGovernmentKey()).toBe("terminus-city");
    void l.setGovernmentKey("  padded  ")?.catch(() => {}); // the load is the applier's (documents D7)
    expect(l.getGovernmentKey()).toBe("padded");
    void l.setGovernmentKey("")?.catch(() => {}); // the load is the applier's (documents D7)
    expect(l.getGovernmentKey()).toBeNull();
    void l.setGovernmentKey("   ")?.catch(() => {}); // the load is the applier's (documents D7)
    expect(l.getGovernmentKey()).toBeNull();
    void l.setGovernmentKey(null)?.catch(() => {}); // the load is the applier's (documents D7)
    expect(l.getGovernmentKey()).toBeNull();
  });

  it("rejects non-string, non-null values", () => {
    const l = newLocality();
    expect(() =>
      l.setGovernmentKey(42 as unknown as string)
    ).toThrow(TypeError);
  });

  it("is carried in persistentFields for hydration", () => {
    expect(MixinApi.getAllPersistentFields(Locality)).toContain("_governmentKey");
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
