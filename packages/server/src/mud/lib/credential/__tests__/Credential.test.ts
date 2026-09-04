/**
 * The credential record value-objects (the authorization half). Behavior
 * lifted from the retired PaymentCredentialMixin / TravelCredentialMixin,
 * now exercised directly on the plain records the wallet holds:
 *   - travel: the AUTHORED born-with floor (TPA reform D12: three
 *     hard-coded /world/** paths became `fasttravel.bornWithNodes`, so
 *     these suites seed it rather than importing a constant),
 *     register/isRegistered/
 *     unregister/authorize, serialize round-trip re-floors;
 *   - payment: link/active/cap/frozen + authorize ladder, serialize round-trip.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  Credential,
  PaymentCredential,
  TravelCredential,
  UNCAPPED,
} from "../Credential";
import { AppApi } from "../../../api/app";
import { AppSettingKeys } from "../../config/AppSettings";
import { Money } from "../../banking/Money";
import { Currency } from "../../banking/Currency";

/** The floor this suite authors — the shape, not the realm's values. */
const FLOOR = ["/world/one/node", "/world/two/node", "/world/three/node"];

describe("TravelCredential record", () => {
  beforeEach(() => {
    vi.spyOn(AppApi, "setting").mockImplementation((k: string) =>
      k === AppSettingKeys.fasttravelBornWithNodes ? FLOOR.join(",") : "",
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is born with every authored floor node registered", () => {
    const c = new TravelCredential();
    for (const node of FLOOR) {
      expect(c.isRegistered(node)).toBe(true);
    }
  });

  it("register / isRegistered / unregister / authorize", () => {
    const c = new TravelCredential();
    expect(c.isRegistered("/world/x/node")).toBe(false);
    c.register("/world/x/node");
    expect(c.isRegistered("/world/x/node")).toBe(true);
    expect(c.authorize("/world/x/node")).toBe(true);
    expect(c.unregister("/world/x/node")).toBe(true);
    expect(c.isRegistered("/world/x/node")).toBe(false);
  });

  it("the born-with floor survives a serialize round-trip", () => {
    const c = new TravelCredential();
    c.register("/world/a/node");
    const back = Credential.fromData(c.toData());
    expect(back).toBeInstanceOf(TravelCredential);
    const t = back as TravelCredential;
    for (const node of FLOOR) {
      expect(t.isRegistered(node)).toBe(true);
    }
    expect(t.isRegistered("/world/a/node")).toBe(true);
  });

  it("an unauthored floor is EMPTY, and that is correct", () => {
    // ⭐ A kernel with no teleport pack installed reads no floor at all.
    // The old code hard-coded three `/world/**` paths, so a pack-less
    // world was born registered for stops that did not exist.
    vi.spyOn(AppApi, "setting").mockReturnValue("");
    const c = new TravelCredential();
    for (const node of FLOOR) expect(c.isRegistered(node)).toBe(false);
  });

  it("re-floors even when the serialized row dropped the floor", () => {
    // A row that somehow lacks the floor still re-floors on rebuild.
    const back = Credential.fromData({
      kind: "travel",
      registered: ["/world/b/node"],
    }) as TravelCredential;
    for (const node of FLOOR) {
      expect(back.isRegistered(node)).toBe(true);
    }
    expect(back.isRegistered("/world/b/node")).toBe(true);
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
    expect(c.authorize(Money.of(10_000, Currency.compact()))).toBe(true);
    c.setSpendCap(100);
    expect(c.authorize(Money.of(100, Currency.compact()))).toBe(true);
    expect(c.authorize(Money.of(101, Currency.compact()))).toBe(false); // over cap
    c.setFrozen(true);
    expect(c.authorize(Money.of(1, Currency.compact()))).toBe(false); // frozen refuses all
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
