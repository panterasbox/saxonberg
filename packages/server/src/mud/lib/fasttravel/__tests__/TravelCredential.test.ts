import { describe, it, expect } from "vitest";
import {
  TravelCredentialMixin,
  UNIVERSITY_AVENUE_NODE,
} from "../TravelCredential";
import Thing from "../../stuff/Thing";
import { MixinApi } from "../../../api/mixin";
import { makeStuff } from "../../security/__tests__/test-setup";

class Card extends TravelCredentialMixin(Thing) {}

describe("TravelCredentialMixin", () => {
  it("is born with the University Avenue node registered", () => {
    const c = makeStuff(() => new Card());
    expect(c.isRegistered(UNIVERSITY_AVENUE_NODE)).toBe(true);
  });

  it("register / isRegistered / unregister", () => {
    const c = makeStuff(() => new Card());
    expect(c.isRegistered("/domain/x/node")).toBe(false);
    c.register("/domain/x/node");
    expect(c.isRegistered("/domain/x/node")).toBe(true);
    expect(c.authorize("/domain/x/node")).toBe(true);
    expect(c.unregister("/domain/x/node")).toBe(true);
    expect(c.isRegistered("/domain/x/node")).toBe(false);
  });

  it("the born-with floor survives a persistence round-trip", () => {
    const c = makeStuff(() => new Card());
    // Simulate hydration writing the persisted set back.
    c.registered = ["/domain/a/node", "/domain/b/node"];
    expect(c.isRegistered(UNIVERSITY_AVENUE_NODE)).toBe(true);
    expect(c.isRegistered("/domain/a/node")).toBe(true);
    expect(c.isRegistered("/domain/b/node")).toBe(true);
  });

  it("MixinApi.isTravelCredential narrows", () => {
    const c = makeStuff(() => new Card());
    expect(MixinApi.isTravelCredential(c)).toBe(true);
    const plain = makeStuff(() => new Thing());
    expect(MixinApi.isTravelCredential(plain)).toBe(false);
  });
});
