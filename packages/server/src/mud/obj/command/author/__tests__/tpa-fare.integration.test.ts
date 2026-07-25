/**
 * TPA fare settlement — the transit-fare economy (D9/D12). A paid route
 * `settle`s the fare BEFORE travelling, split two operating budgets: the city
 * budget (the Business operating the departure gate, resolved un-spoofably)
 * takes `fee − networkFee`; the global TPA operating budget takes the network
 * fee (`min(fee, base + floor(fee × rate))`). Conserved (no mint), tender-
 * agnostic (credential OR cash via the cash bridge), refuses on short funds.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import TeleportController from "../TeleportController";
import { AetherMixin } from "../../../../lib/message/Aether";
import { MobileMixin } from "../../../../lib/spatial/Mobile";
import { ContainerMixin } from "../../../../lib/spatial/Container";
import { ContainableMixin } from "../../../../lib/spatial/Containable";
import { CommandGiverMixin } from "../../../../lib/command/CommandGiver";
import { SensorMixin } from "../../../../lib/message/Sensor";
import { NamedMixin } from "../../../../lib/description/Named";
import { FastTravelMixin } from "../../../../lib/fasttravel/FastTravel";
import Thing from "../../../../lib/stuff/Thing";
import Location from "../../../../lib/stuff/Location";
import { Agent } from "../../../../lib/stuff/Agent";
import CredentialWalletUpdate from "../../../../lib/credential/CredentialWalletUpdate";
import BusinessEntity from "../../../../lib/employment/Business";
import { StuffApi } from "../../../../api/stuff";
import { MixinApi } from "../../../../api/mixin";
import { AccessApi } from "../../../../api/access";
import { AppApi } from "../../../../api/app";
import { AppSettings } from "../../../../lib/config/AppSettings";
import { AppSettingKeys } from "../../../../lib/config/AppSettings";
import { BankingApi, Money } from "../../../../api/banking";
import { ContainmentApi } from "../../../../api/containment";
import { ExecutionContextApi } from "../../../../api/execution-context";
import { CommandDefinition } from "../../../../lib/command/CommandDefinition";
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from "../../../../api/command";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Container } from "../../../../lib/spatial/Container";
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from "../../../../lib/security/__tests__/test-setup";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "../../../../lib/banking/__tests__/banking-test-harness";
import type { AetherHosted } from "../../../../lib/augmentation/AetherHosted";
import type { CredentialWallet } from "../../../../lib/credential/CredentialWallet";
import Coin from "../../../../obj/Coin";
import { Quantity } from "../../../../lib/quantity";
import { installV1QuantityMarshallers } from "../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";

const D_ROOM = "/domain/test/fare/d-room";
const R_ROOM = "/domain/test/fare/r-room";
const DEPART = "/domain/test/fare/depart";
const ARRIVE = "/domain/test/fare/arrive";
const BIZ = "/domain/test/fare/budget";
const DEST_BIZ = "/domain/test/fare/dest-budget";
const TPA_BIZ = "/domain/test/fare/tpa";

class Node extends FastTravelMixin(Thing) {
  static _mixinName = "Node";
}
class Traveller extends AetherMixin(
  MobileMixin(
    SensorMixin(
      CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Agent)))),
    ),
  ),
) {
  static _mixinName = "Traveller";
}

function stub(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    "<test>",
  );
}
function ctx(giver: Stuff, location: Stuff): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: location as never,
    commandText: "teleport",
    executionId: "t",
    commandId: "t",
    verb: "teleport",
    command: stub("teleport"),
  });
}
function teleportCtl(): TeleportController {
  return makeStuff(() => new TeleportController());
}

/** Drive a TPA ride with the traveller as the execution-context principal. */
async function ride(t: Traveller, location: Stuff): Promise<CommandContext> {
  const c = ctx(t, location);
  await withRootContext(null, "fare.test", async () => {
    ExecutionContextApi.tagActingAuthor(t as unknown as Stuff);
    await teleportCtl().execute({} as CommandModel, c);
  });
  return c;
}

function makeWalletTraveller(name: string): Traveller {
  const t = makeStuff(() => {
    const a = new Traveller();
    a.setName(name);
    return a;
  });
  const wallet = makeStuff(() => new CredentialWalletUpdate());
  (t as unknown as { hostUpdate(u: Stuff): void }).hostUpdate(wallet);
  // Identity clearance for ARRIVE (so the ride is gated on funds, not
  // registration).
  wallet.getCredential("travel")!.register(ARRIVE);
  return t;
}

/**
 * A departure node routed to ARRIVE with `fee`, seated in D_ROOM. Options:
 * `surcharge` sets the ARRIVE node's arrival surcharge; `destOperator` stands
 * up a Business operating the ARRIVE room (so the surcharge has a collector).
 */
function seedNetwork(
  fee: number,
  opts: { surcharge?: number; destOperator?: boolean } = {},
): { dRoom: Location } {
  const dRoom = makeStuffAtPath(() => new Location(), D_ROOM);
  const rRoom = makeStuffAtPath(() => new Location(), R_ROOM);
  const depart = makeStuffAtPath(() => new Node(), DEPART);
  depart.setDirectionality("departure");
  depart.setStatus("operational");
  depart.applyRoutes([{ to: ARRIVE, fee }]);
  ContainmentApi.move(depart, dRoom);
  const arrive = makeStuffAtPath(() => new Node(), ARRIVE);
  arrive.setDirectionality("both");
  if (opts.surcharge) arrive.setSurcharge(opts.surcharge);
  ContainmentApi.move(arrive, rRoom);
  // The city-budget Business operates the departure TERMINAL (the fixture,
  // fixture-keyed attribution), not the room.
  const biz = makeStuffAtPath(() => new BusinessEntity(), BIZ);
  biz.proprietorPath = "";
  biz.positions = [];
  biz.operatingLocations = [DEPART];
  biz.banksAt = BankingApi.defaultCustodianBank();
  // Optional: the destination operator collecting the arrival surcharge — keyed
  // on the destination terminal fixture.
  // The Teleport Authority Business — the network-fee payee, resolved by
  // path (never ensureOperatorAt), banking at its authored banksAt.
  const tpa = makeStuffAtPath(() => new BusinessEntity(), TPA_BIZ);
  tpa.proprietorPath = "";
  tpa.positions = [];
  tpa.operatingLocations = [];
  tpa.banksAt = BankingApi.defaultCustodianBank();
  if (opts.destOperator) {
    const dest = makeStuffAtPath(() => new BusinessEntity(), DEST_BIZ);
    dest.proprietorPath = "";
    dest.positions = [];
    dest.operatingLocations = [ARRIVE];
    dest.banksAt = BankingApi.defaultCustodianBank();
  }
  return { dRoom };
}

async function bal(accountId: string): Promise<number> {
  return BankingApi.balanceOf(accountId).minor;
}

/** The TPA Business's operating-account balance (0 before any fee). */
async function tpaBal(): Promise<number> {
  const acct = await BankingApi.primaryAccountIdOf(TPA_BIZ);
  return acct ? BankingApi.balanceOf(acct).minor : 0;
}

/** The traveller's identity wallet (the hosted CredentialWalletUpdate —
 *  a single-object read on the traveller's own hosted updates). */
function walletOf(t: Stuff): CredentialWallet {
  if (!MixinApi.isAether(t)) {
    throw new Error("traveller is not an aether host");
  }
  return t
    .getHostedUpdates()
    .find(
      (s): s is Stuff & AetherHosted & CredentialWallet =>
        MixinApi.isCredentialWallet(s),
    )!;
}

/** Link + fund a payment account on the traveller's wallet. */
async function fundAccount(t: Stuff, acct: string, amount: number): Promise<void> {
  const pay = walletOf(t).getCredential("payment")!;
  pay.linkAccount(acct);
  pay.setActiveAccount(acct);
  await BankingApi.mint(acct, Money.of(amount), "seed", "float");
}

describe("TPA fare settlement (integration)", () => {
  let cityAccount: string;
  beforeEach(async () => {
    installV1QuantityMarshallers();
    installBankingHarness();
    // issueCash / GlobbableApi.split clone /obj/Coin — stub the clone so the
    // coin stack round-trips without a full domain-store hydration.
    vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) => {
      const c = makeStuffAtPath(() => new Coin(), path);
      c.setMass(Quantity.of(0.01, "kg"));
      return c;
    }) as unknown as typeof StuffApi.clone);
    await AppSettings.warm();
    vi.spyOn(AppApi, "setting").mockImplementation((k: string) => {
      if (k === AppSettingKeys.fasttravelNetworkFeeRate) return "0.15";
      if (k === AppSettingKeys.fasttravelNetworkFeeBase) return "1";
      if (k === AppSettingKeys.fasttravelTpaBusinessPath) return TPA_BIZ;
      return "";
    });
    vi.spyOn(AccessApi, "isWizard").mockResolvedValue(false);
    vi.spyOn(AccessApi, "isAuthor").mockResolvedValue(false);
    cityAccount = await BankingApi.ensureVenueAccount(
      BIZ,
      BankingApi.defaultCustodianBank(),
      "",
    );
  });
  afterEach(() => {
    teardownBankingHarness();
    AppSettings._resetForTesting();
  });

  it("credential fare splits city + TPA, conserved (no mint)", async () => {
    const { dRoom } = seedNetwork(15);
    const t = makeWalletTraveller("alice");
    // Fund a payment account and link it to the wallet.
    await fundAccount(t, "alice-acct", 100);
    ContainmentApi.move(t, dRoom);

    const supplyBefore = BankingApi.moneySupply().minor;
    await ride(t, dRoom);

    // fee 15, rate .15, base 1 → networkFee = min(15, 1+floor(2.25)) = 3
    expect(await bal("alice-acct")).toBe(85);
    expect(await bal(cityAccount)).toBe(12);
    expect(await tpaBal()).toBe(3);
    const rRoom = await StuffApi.singleton<Stuff & Container>(R_ROOM);
    expect(t.getContainer()).toBe(rRoom); // arrived
    expect(BankingApi.moneySupply().minor).toBe(supplyBefore); // no mint
    expect(BankingApi.reconcile().balanced).toBe(true);
  });

  it("the TPA collects a non-zero fee on a micro-fare (flat base)", async () => {
    const { dRoom } = seedNetwork(3);
    const t = makeWalletTraveller("bob");
    await fundAccount(t, "bob-acct", 100);
    ContainmentApi.move(t, dRoom);

    await ride(t, dRoom);
    // fee 3, rate .15 → floor(0.45)=0; base 1 → networkFee = 1 (not 0)
    expect(await tpaBal()).toBe(1);
    expect(await bal(cityAccount)).toBe(2);
  });

  it("insufficient funds refuses the ride (no partial charge)", async () => {
    const { dRoom } = seedNetwork(15);
    const t = makeWalletTraveller("carol");
    await fundAccount(t, "carol-acct", 5); // < fee
    ContainmentApi.move(t, dRoom);

    const c = await ride(t, dRoom);
    expect(t.getContainer()).toBe(dRoom); // not moved
    expect(await bal("carol-acct")).toBe(5); // untouched
    expect(await bal(cityAccount)).toBe(0);
    expect(await tpaBal()).toBe(0);
    expect(
      c.getNotes().some((n) => n.kind === "controller-rejected" && n.reason === "fare-declined"),
    ).toBe(true);
  });

  it("a free route (fee 0) charges nothing, even underfunded", async () => {
    const { dRoom } = seedNetwork(0);
    const t = makeWalletTraveller("dave"); // no funds at all
    ContainmentApi.move(t, dRoom);

    await ride(t, dRoom);
    const rRoom = await StuffApi.singleton<Stuff & Container>(R_ROOM);
    expect(t.getContainer()).toBe(rRoom); // rode free
    expect(await bal(cityAccount)).toBe(0);
    expect(await tpaBal()).toBe(0);
  });

  it("cash fares split identically via the cash bridge (supply-neutral)", async () => {
    const { dRoom } = seedNetwork(15);
    const t = makeWalletTraveller("erin"); // no payment account
    ContainmentApi.move(t, dRoom);
    // Cash-fund the traveller (a CB mint — the one supply increase). 20 credits
    // dispenses as four 5-credit crowns, so the 15 fare is payable in exact
    // cash (three crowns) — the coinage make-change path, not just 1s.
    await withRootContext(null, "fund", async () => {
      ExecutionContextApi.tagActingAuthor(t as unknown as Stuff);
      await BankingApi.issueCash(t as unknown as Stuff & Container, Money.of(20));
    });
    const supplyBefore = BankingApi.moneySupply().minor;

    await ride(t, dRoom);
    const rRoom = await StuffApi.singleton<Stuff & Container>(R_ROOM);
    expect(t.getContainer()).toBe(rRoom); // arrived
    expect(await bal(cityAccount)).toBe(12);
    expect(await tpaBal()).toBe(3);
    expect(BankingApi.moneySupply().minor).toBe(supplyBefore); // supply-neutral
    expect(BankingApi.reconcile().balanced).toBe(true);
  });

  it("an arrival surcharge splits a third operator: total = fee + surcharge", async () => {
    const { dRoom } = seedNetwork(15, { surcharge: 2, destOperator: true });
    const t = makeWalletTraveller("frank");
    await fundAccount(t, "frank-acct", 100);
    ContainmentApi.move(t, dRoom);
    const destAccount = await BankingApi.ensureVenueAccount(
      DEST_BIZ,
      BankingApi.defaultCustodianBank(),
      "",
    );

    await ride(t, dRoom);
    // total 17: departure city 12 (15−3), TPA 3 (network fee on the fee only),
    // destination operator 2 (the surcharge), traveller −17.
    expect(await bal("frank-acct")).toBe(83);
    expect(await bal(cityAccount)).toBe(12);
    expect(await tpaBal()).toBe(3);
    expect(await bal(destAccount)).toBe(2);
    const rRoom = await StuffApi.singleton<Stuff & Container>(R_ROOM);
    expect(t.getContainer()).toBe(rRoom); // arrived
    expect(BankingApi.reconcile().balanced).toBe(true);
  });

  it("a surcharge with no destination operator refuses the ride", async () => {
    const { dRoom } = seedNetwork(15, { surcharge: 2 }); // no destOperator
    const t = makeWalletTraveller("grace");
    await fundAccount(t, "grace-acct", 100);
    ContainmentApi.move(t, dRoom);

    const c = await ride(t, dRoom);
    expect(t.getContainer()).toBe(dRoom); // not moved
    expect(await bal("grace-acct")).toBe(100); // untouched
    expect(await bal(cityAccount)).toBe(0);
    expect(
      c.getNotes().some((n) => n.kind === "controller-rejected" && n.reason === "no-operator"),
    ).toBe(true);
  });

  it("a surcharge on a FREE route goes wholly to the destination (no TPA fee)", async () => {
    const { dRoom } = seedNetwork(0, { surcharge: 2, destOperator: true });
    const t = makeWalletTraveller("heidi");
    await fundAccount(t, "heidi-acct", 100);
    ContainmentApi.move(t, dRoom);
    const destAccount = await BankingApi.ensureVenueAccount(
      DEST_BIZ,
      BankingApi.defaultCustodianBank(),
      "",
    );

    await ride(t, dRoom);
    expect(await bal("heidi-acct")).toBe(98); // −2 (surcharge only)
    expect(await bal(destAccount)).toBe(2); // the whole surcharge
    expect(await bal(cityAccount)).toBe(0); // free route → no departure charge
    expect(await tpaBal()).toBe(0); // no network fee on a free route
    const rRoom = await StuffApi.singleton<Stuff & Container>(R_ROOM);
    expect(t.getContainer()).toBe(rRoom); // arrived
    expect(BankingApi.reconcile().balanced).toBe(true);
  });
});
