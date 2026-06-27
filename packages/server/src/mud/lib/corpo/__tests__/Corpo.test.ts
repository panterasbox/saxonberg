/**
 * Corpo tests — field defaults, setter validation, and the defensive-copy
 * rivals read surface.
 */

import { describe, it, expect, beforeEach } from "vitest";
import Corpo from "../Corpo";
import { StuffApi } from "../../../api/stuff";
import { ShadowApi } from "../../../api/shadow";
import { makeStuff } from "../../security/__tests__/test-setup";

const newCorpo = (): Corpo => makeStuff(() => new Corpo());

describe("Corpo", () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
  });

  it("defaults to an empty node", () => {
    const c = newCorpo();
    expect(c.getKey()).toBe("");
    expect(c.getLabel()).toBe("");
    expect(c.getSector()).toBe("");
    expect(c.getEthos()).toBe("");
    expect(c.getAesthetic()).toBe("");
    expect(c.getTemperament()).toBe("");
    expect(c.getDescription()).toBe("");
    expect(c.getRivals()).toEqual([]);
  });

  it("round-trips its authored fields", () => {
    const c = newCorpo();
    c.setKey("veshko");
    c.setLabel("Veshko");
    c.setSector("heavy industry");
    c.setEthos("the Ruthless Optimizer");
    c.setAesthetic("brutalist grey");
    c.setTemperament("pragmatists");
    c.setDescription("makes the hard infrastructure");
    expect(c.getKey()).toBe("veshko");
    expect(c.getLabel()).toBe("Veshko");
    expect(c.getSector()).toBe("heavy industry");
    expect(c.getEthos()).toBe("the Ruthless Optimizer");
    expect(c.getAesthetic()).toBe("brutalist grey");
    expect(c.getTemperament()).toBe("pragmatists");
    expect(c.getDescription()).toBe("makes the hard infrastructure");
  });

  it("setKey rejects an empty key", () => {
    const c = newCorpo();
    expect(() => c.setKey("")).toThrow(TypeError);
    c.setKey("veshko");
    expect(c.getKey()).toBe("veshko");
  });

  it("setLabel rejects an empty label", () => {
    const c = newCorpo();
    expect(() => c.setLabel("")).toThrow(TypeError);
  });

  it("getRivals returns a defensive copy", () => {
    const c = newCorpo();
    c.rivals = ["aevex"];
    const first = c.getRivals();
    first.push("hollis");
    expect(c.getRivals()).toEqual(["aevex"]);
  });
});
