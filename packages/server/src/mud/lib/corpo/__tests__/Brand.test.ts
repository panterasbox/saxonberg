/**
 * Brand tests — field defaults, setter validation, and the `owner === ''`
 * independent default.
 */

import { describe, it, expect, beforeEach } from "vitest";
import Brand from "../Brand";
import { StuffApi } from "../../../api/stuff";
import { ShadowApi } from "../../../api/shadow";
import { makeStuff } from "../../security/__tests__/test-setup";

const newBrand = (): Brand => makeStuff(() => new Brand());

describe("Brand", () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
  });

  it("defaults to an empty, independent brand", () => {
    const b = newBrand();
    expect(b.getKey()).toBe("");
    expect(b.getName()).toBe("");
    expect(b.getOwner()).toBe("");
    expect(b.isIndependent()).toBe(true);
    expect(b.getCategory()).toBe("");
    expect(b.getPositioning()).toBe("");
    expect(b.getDescriptor()).toBe("");
  });

  it("round-trips its authored fields", () => {
    const b = newBrand();
    b.setKey("volk");
    b.setName("Volk");
    b.setOwner("veshko");
    b.setCategory("vodka");
    b.setPositioning("well-rail default");
    b.setDescriptor("industrially perfect, soulless, fine");
    expect(b.getKey()).toBe("volk");
    expect(b.getName()).toBe("Volk");
    expect(b.getOwner()).toBe("veshko");
    expect(b.isIndependent()).toBe(false);
    expect(b.getCategory()).toBe("vodka");
    expect(b.getPositioning()).toBe("well-rail default");
    expect(b.getDescriptor()).toBe("industrially perfect, soulless, fine");
  });

  it("an empty owner marks the brand independent", () => {
    const b = newBrand();
    b.setName("Crowsfoot Gin");
    b.setOwner("");
    expect(b.isIndependent()).toBe(true);
  });

  it("setKey and setName reject empty values", () => {
    const b = newBrand();
    expect(() => b.setKey("")).toThrow(TypeError);
    expect(() => b.setName("")).toThrow(TypeError);
  });
});
