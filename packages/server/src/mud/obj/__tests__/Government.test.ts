/**
 * Government tests — field defaults, setter validation, and the
 * defensive-copy departments/seats read surface.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from "vitest";
import Government from "../Government";
import { StuffApi } from "../../api/stuff";
import { ShadowApi } from "../../api/shadow";
import { makeStuff } from "../../lib/security/__tests__/test-setup";

const newGovernment = (): Government => makeStuff(() => new Government());

describe("Government", () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
  });

  it("defaults to an empty node", () => {
    const g = newGovernment();
    expect(g.getKey()).toBe("");
    expect(g.getDisplayName()).toBe("");
    expect(g.getDescription()).toBe("");
    expect(g.getCharter()).toBe("");
    expect(g.getTreasury()).toBe("");
    expect(g.getDepartments()).toEqual([]);
    expect(g.getSeats()).toEqual([]);
  });

  it("round-trips its authored fields", () => {
    const g = newGovernment();
    g.setKey("terminus-city");
    g.setDisplayName("the City of Terminus");
    g.setDescription("the young retrofit administration");
    g.setCharter("/charters/terminus-city");
    g.setTreasury("/world/terminus/budget");
    expect(g.getKey()).toBe("terminus-city");
    expect(g.getDisplayName()).toBe("the City of Terminus");
    expect(g.getDescription()).toBe("the young retrofit administration");
    expect(g.getCharter()).toBe("/charters/terminus-city");
    expect(g.getTreasury()).toBe("/world/terminus/budget");
  });

  it("setKey rejects an empty key", () => {
    const g = newGovernment();
    expect(() => g.setKey("")).toThrow(TypeError);
    g.setKey("terminus-realm");
    expect(g.getKey()).toBe("terminus-realm");
  });

  it("setDisplayName rejects an empty name", () => {
    const g = newGovernment();
    expect(() => g.setDisplayName("")).toThrow(TypeError);
  });

  it("getDepartments returns a defensive copy", () => {
    const g = newGovernment();
    g.departments = ["/world/terminus/registry/business"];
    const first = g.getDepartments();
    first.push("/world/terminus/watch");
    expect(g.getDepartments()).toEqual(["/world/terminus/registry/business"]);
  });

  it("getSeats returns defensive copies", () => {
    const g = newGovernment();
    g.seats = [
      {
        key: "magistrate",
        label: "Magistrate",
        department: "/world/terminus/registry/business",
        positionKey: "magistrate",
      },
    ];
    const first = g.getSeats();
    first[0]!.label = "mutated";
    first.push({
      key: "x",
      label: "x",
      department: "y",
      positionKey: "z",
    });
    expect(g.getSeats()).toHaveLength(1);
    expect(g.getSeats()[0]!.label).toBe("Magistrate");
  });
});
