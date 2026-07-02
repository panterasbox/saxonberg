import { describe, it, expect } from "vitest";
import { FastTravelMixin } from "../FastTravel";
import Thing from "../../stuff/Thing";
import { MixinApi } from "../../../api/mixin";
import { makeStuff } from "../../security/__tests__/test-setup";

class Node extends FastTravelMixin(Thing) {}

describe("FastTravelMixin", () => {
  it("directionality predicates", () => {
    const n = makeStuff(() => new Node());
    n.setDirectionality("arrival");
    expect(n.isArrival()).toBe(true);
    expect(n.isDeparture()).toBe(false);
    n.setDirectionality("departure");
    expect(n.isArrival()).toBe(false);
    expect(n.isDeparture()).toBe(true);
    n.setDirectionality("both");
    expect(n.isArrival()).toBe(true);
    expect(n.isDeparture()).toBe(true);
  });

  it("applyRoutes parses to / warren refs and HH:MM departures", () => {
    const n = makeStuff(() => new Node());
    n.applyRoutes([
      { to: "/domain/a/node", departures: ["11:00", "14:30"] },
      { warren: "/domain/lounge/warren" },
    ]);
    expect(n.hasRoute("/domain/a/node")).toBe(true);
    expect(n.hasRoute("/domain/lounge/warren")).toBe(true);
    expect(n.getRoutes().get("/domain/a/node")?.departures).toEqual([
      { hour: 11, minute: 0 },
      { hour: 14, minute: 30 },
    ]);
    expect(n.getRoutes().get("/domain/lounge/warren")?.departures).toEqual([]);
  });

  it("selection defaults to the first route; advanceSelection cycles + wraps", () => {
    const n = makeStuff(() => new Node());
    n.applyRoutes([{ to: "/a" }, { to: "/b" }]);
    expect(n.getSelectedDestination()).toBe("/a");
    n.advanceSelection();
    expect(n.getSelectedDestination()).toBe("/b");
    n.advanceSelection();
    expect(n.getSelectedDestination()).toBe("/a");
  });

  it("selectDeparture flips the current selection", () => {
    const n = makeStuff(() => new Node());
    n.applyRoutes([{ to: "/a" }, { to: "/b" }]);
    n.selectDeparture("/b");
    expect(n.getSelectedDestination()).toBe("/b");
  });

  it("applyRoutes normalizes the fare (absent → 0, present → number)", () => {
    const n = makeStuff(() => new Node());
    n.applyRoutes([
      { to: "/paid", fee: 15 },
      { to: "/free" },
    ]);
    expect(n.getRoutes().get("/paid")?.fee).toBe(15);
    expect(n.getRoutes().get("/free")?.fee).toBe(0);
  });

  it("MixinApi.isFastTravel narrows", () => {
    const n = makeStuff(() => new Node());
    expect(MixinApi.isFastTravel(n)).toBe(true);
    const plain = makeStuff(() => new Thing());
    expect(MixinApi.isFastTravel(plain)).toBe(false);
  });
});
