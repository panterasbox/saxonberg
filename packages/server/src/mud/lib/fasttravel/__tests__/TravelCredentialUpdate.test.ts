/**
 * TravelCredentialUpdate — the credential-as-update (Idea base).
 * Proves the Thing/Idea symmetry: the same TravelCredentialMixin
 * surface (born-with floor, register/authorize, round-trip union) on an
 * incorporeal hosted update.
 */

import { describe, it, expect } from "vitest";
import TravelCredentialUpdate from "../TravelCredentialUpdate";
import { UNIVERSITY_AVENUE_NODE } from "../TravelCredential";
import { MixinApi } from "../../../api/mixin";
import { makeStuff } from "../../security/__tests__/test-setup";

describe("TravelCredentialUpdate", () => {
  it("is born with the University Avenue node registered", () => {
    const u = makeStuff(() => new TravelCredentialUpdate());
    expect(u.isRegistered(UNIVERSITY_AVENUE_NODE)).toBe(true);
  });

  it("register / authorize / unregister", () => {
    const u = makeStuff(() => new TravelCredentialUpdate());
    expect(u.isRegistered("/domain/x/node")).toBe(false);
    u.register("/domain/x/node");
    expect(u.authorize("/domain/x/node")).toBe(true);
    expect(u.unregister("/domain/x/node")).toBe(true);
    expect(u.isRegistered("/domain/x/node")).toBe(false);
  });

  it("the born-with floor survives a persistence round-trip", () => {
    const u = makeStuff(() => new TravelCredentialUpdate());
    u.registered = ["/domain/a/node"];
    expect(u.isRegistered(UNIVERSITY_AVENUE_NODE)).toBe(true);
    expect(u.isRegistered("/domain/a/node")).toBe(true);
  });

  it("narrows as both a travel credential and a hosted update", () => {
    const u = makeStuff(() => new TravelCredentialUpdate());
    expect(MixinApi.isTravelCredential(u)).toBe(true);
    expect(MixinApi.isAetherHosted(u)).toBe(true);
  });
});
