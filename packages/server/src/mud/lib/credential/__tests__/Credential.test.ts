/**
 * The credential record value-objects (the authorization half). Behavior
 * lifted from the retired PaymentCredentialMixin / TravelCredentialMixin,
 * now exercised directly on the plain records the wallet holds:
 *   - travel: born-with University Avenue floor, register/isRegistered/
 *     unregister/authorize, serialize round-trip re-floors;
 *   - payment: link/active/cap/frozen + authorize ladder, serialize round-trip.
 */

import { describe, it, expect } from "vitest";
import {
  Credential,
  PaymentCredential,
  TravelCredential,
  UNIVERSITY_AVENUE_NODE,
  UNCAPPED,
} from "../Credential";
import { Money } from "../../banking/Money";

describe("TravelCredential record", () => {
  it("is born with the University Avenue node registered", () => {
    const c = new TravelCredential();
    expect(c.isRegistered(UNIVERSITY_AVENUE_NODE)).toBe(true);
  });

  it("register / isRegistered / unregister / authorize", () => {
    const c = new TravelCredential();
    expect(c.isRegistered("/domain/x/node")).toBe(false);
    c.register("/domain/x/node");
    expect(c.isRegistered("/domain/x/node")).toBe(true);
    expect(c.authorize("/domain/x/node")).toBe(true);
    expect(c.unregister("/domain/x/node")).toBe(true);
    expect(c.isRegistered("/domain/x/node")).toBe(false);
  });

  it("the born-with floor survives a serialize round-trip", () => {
    const c = new TravelCredential();
    c.register("/domain/a/node");
    const back = Credential.fromData(c.toData());
    expect(back).toBeInstanceOf(TravelCredential);
    const t = back as TravelCredential;
    expect(t.isRegistered(UNIVERSITY_AVENUE_NODE)).toBe(true);
    expect(t.isRegistered("/domain/a/node")).toBe(true);
  });

  it("re-floors even when the serialized row dropped the floor", () => {
    // A row that somehow lacks the floor still re-floors on rebuild.
    const back = Credential.fromData({
      kind: "travel",
      registered: ["/domain/b/node"],
    }) as TravelCredential;
    expect(back.isRegistered(UNIVERSITY_AVENUE_NODE)).toBe(true);
    expect(back.isRegistered("/domain/b/node")).toBe(true);
  });
});

describe("PaymentCredential record", () => {
  it("links accounts; first linked becomes active", () => {
    const c = new PaymentCredential();
    expect(c.getActiveAccount()).toBeNull();
    c.linkAccount("acct-a");
    c.linkAccount("acct-b");
    expect(c.hasAccount("acct-a")).toBe(true);
    expect(c.getActiveAccount()).toBe("acct-a");
    c.setActiveAccount("acct-b");
    expect(c.getActiveAccount()).toBe("acct-b");
  });

  it("setActiveAccount throws on an unlinked account", () => {
    const c = new PaymentCredential();
    expect(() => c.setActiveAccount("nope")).toThrow(/not linked/);
  });

  it("authorize: uncapped admits anything; cap and freeze refuse", () => {
    const c = new PaymentCredential();
    expect(c.getSpendCap()).toBe(UNCAPPED);
    expect(c.authorize(Money.of(10_000))).toBe(true);
    c.setSpendCap(100);
    expect(c.authorize(Money.of(100))).toBe(true);
    expect(c.authorize(Money.of(101))).toBe(false); // over cap
    c.setFrozen(true);
    expect(c.authorize(Money.of(1))).toBe(false); // frozen refuses all
  });

  it("survives a serialize round-trip (links, active, cap, frozen)", () => {
    const c = new PaymentCredential();
    c.linkAccount("acct-a");
    c.linkAccount("acct-b");
    c.setActiveAccount("acct-b");
    c.setSpendCap(250);
    c.setFrozen(true);
    const back = Credential.fromData(c.toData()) as PaymentCredential;
    expect(back).toBeInstanceOf(PaymentCredential);
    expect(back.getLinkedAccounts().has("acct-a")).toBe(true);
    expect(back.getActiveAccount()).toBe("acct-b");
    expect(back.getSpendCap()).toBe(250);
    expect(back.isFrozen()).toBe(true);
  });
});

describe("Credential.mint", () => {
  it("mints a default record per kind", () => {
    expect(Credential.mint("payment")).toBeInstanceOf(PaymentCredential);
    expect(Credential.mint("travel")).toBeInstanceOf(TravelCredential);
  });
});
