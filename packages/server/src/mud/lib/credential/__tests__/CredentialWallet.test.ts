/**
 * CredentialWalletMixin — the dumb holder + the either-base resolution it
 * enables. Covers:
 *   - one wallet holds many credential kinds; getCredential / ensureCredential
 *     / hasCredential;
 *   - the `credentials` persistence accessor round-trips the held records
 *     (travel re-floors);
 *   - one scan (the MQL `reachable` pool filtered on `isCredentialWallet`)
 *     finds the holder whether it's a hosted CredentialWalletUpdate or a
 *     carried card (the Thing/Idea symmetry the consumers share).
 */

import { describe, it, expect } from "vitest";
import { ContainmentApi } from "../../../api/containment";
import { MixinApi } from "../../../api/mixin";
import { MqlApi } from "../../../api/mql";
import type { CommandGiver } from "../../command/CommandGiver";
import { AetherMixin } from "../../message/Aether";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { Idea } from "../../stuff/Idea";
import {
  CredentialWalletMixin,
  type CredentialWallet,
} from "../CredentialWallet";
import CredentialWalletUpdate from "../../../obj/CredentialWalletUpdate";
import PaymentCard from "../../../obj/PaymentCard";
import TravelCard from "../../../domain/common/tpa/TravelCard";
import { BORN_WITH_TRAVEL_NODES } from "../Credential";
import { makeStuff } from "../../security/__tests__/test-setup";
import type { Stuff } from "../../stuff/Stuff";

class TestWallet extends CredentialWalletMixin(Idea) {
  static _mixinName = "TestWallet";
}

// An attuned actor that can both carry (Container) and host (Aether).
class Traveller extends AetherMixin(ContainerMixin(ContainableMixin(Idea))) {}

const isWallet = (s: Stuff): s is Stuff & CredentialWallet =>
  MixinApi.isCredentialWallet(s);

/** The MQL `reachable` pool anchored on `actor` (the fixture actor isn't a
 *  real CommandGiver — the cast satisfies the seed's giver anchor). */
function reachableFrom(actor: Stuff): Stuff[] {
  return MqlApi.resolveMany("reachable", {
    commandGiver: actor as Stuff & CommandGiver,
    scope: "reachable",
  }).stuff;
}

describe("CredentialWalletMixin holder", () => {
  it("holds many kinds; ensureCredential mints lazily", () => {
    const w = makeStuff(() => new TestWallet());
    expect(w.hasCredential("payment")).toBe(false);
    expect(w.getCredential("payment")).toBeUndefined();

    const pay = w.ensureCredential("payment");
    pay.linkAccount("acct-a");
    const travel = w.ensureCredential("travel");
    travel.register("/domain/x/node");

    expect(w.hasCredential("payment")).toBe(true);
    expect(w.hasCredential("travel")).toBe(true);
    expect(w.getCredentials()).toHaveLength(2);
    // ensureCredential is idempotent — same record back.
    expect(w.ensureCredential("payment")).toBe(pay);
    expect(w.getCredential("payment")!.hasAccount("acct-a")).toBe(true);
  });

  it("round-trips its records through the `credentials` accessor", () => {
    const w = makeStuff(() => new TestWallet());
    w.ensureCredential("payment").linkAccount("acct-z");
    w.ensureCredential("travel").register("/domain/a/node");

    // Simulate hydration: read the storable rows, write them into a fresh wallet.
    const rows = (w as unknown as { credentials: unknown[] }).credentials;
    const w2 = makeStuff(() => new TestWallet());
    (w2 as unknown as { credentials: unknown[] }).credentials = rows;

    expect(w2.getCredential("payment")!.hasAccount("acct-z")).toBe(true);
    const t = w2.getCredential("travel")!;
    expect(t.isRegistered("/domain/a/node")).toBe(true);
    for (const node of BORN_WITH_TRAVEL_NODES) {
      expect(t.isRegistered(node)).toBe(true); // floor preserved
    }
  });
});

describe("either-base resolution (one scan finds the holder)", () => {
  it("resolves a hosted wallet update (no card)", () => {
    const actor = makeStuff(() => new Traveller());
    const wallet = makeStuff(() => new CredentialWalletUpdate());
    wallet.ensureCredential("travel"); // seed/clone mints this in prod
    (actor as unknown as { hostUpdate: (u: unknown) => void }).hostUpdate(
      wallet,
    );

    const resolved =
      reachableFrom(actor as unknown as Stuff).find(isWallet) ?? null;
    expect(resolved).toBe(wallet);
    // Born-with three-node floor (interchange + lounge + paid destination).
    for (const node of BORN_WITH_TRAVEL_NODES) {
      expect(resolved?.getCredential("travel")!.isRegistered(node)).toBe(true);
    }
    // `register` writes to the hosted update's travel record.
    resolved?.getCredential("travel")!.register("/domain/x/node");
    expect(wallet.getCredential("travel")!.isRegistered("/domain/x/node")).toBe(
      true,
    );
  });

  it("resolves a carried travel card (no update)", () => {
    const actor = makeStuff(() => new Traveller());
    const card = makeStuff(() => new TravelCard());
    card.ensureCredential("travel");
    ContainmentApi.move(card, actor as never);

    const resolved =
      reachableFrom(actor as unknown as Stuff).find(isWallet) ?? null;
    expect(resolved).toBe(card);
    for (const node of BORN_WITH_TRAVEL_NODES) {
      expect(resolved?.getCredential("travel")!.isRegistered(node)).toBe(true);
    }
  });

  it("narrows the holders: update is AetherHosted, cards are carryable", () => {
    const wallet = makeStuff(() => new CredentialWalletUpdate());
    const payCard = makeStuff(() => new PaymentCard());
    expect(MixinApi.isCredentialWallet(wallet)).toBe(true);
    expect(MixinApi.isAetherHosted(wallet)).toBe(true);
    expect(MixinApi.isContainable(wallet)).toBe(false);
    expect(MixinApi.isCredentialWallet(payCard)).toBe(true);
    expect(MixinApi.isContainable(payCard)).toBe(true);
  });
});
