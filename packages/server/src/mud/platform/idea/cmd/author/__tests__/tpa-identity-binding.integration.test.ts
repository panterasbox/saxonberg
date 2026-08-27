/**
 * TPA identity-binding — the headline security regression. Travel
 * **authorization** (the registered-node set) is bound to the traveller's
 * *identity* (their born-with, aether-hosted wallet), never to a carried,
 * transferable `TravelCard`. Handing a loaded card to another player confers
 * no clearance they didn't already hold on their own identity.
 *
 * Also covers: `register` writes to identity (not the carried card);
 * card-or-implant both satisfy the instrument gate; out-of-service departure
 * gates refuse the ride.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import RegisterController from "../../movement/RegisterController";
import TeleportController from "../TeleportController";
import TravelCard from "../../../../../world/common/tpa/TravelCard";
import CredentialWalletUpdate from "../../../CredentialWalletUpdate";
import { AetherMixin } from "../../../../../lib/message/Aether";
import { MobileMixin } from "../../../../../lib/spatial/Mobile";
import { ContainerMixin } from "../../../../../lib/spatial/Container";
import { ContainableMixin } from "../../../../../lib/spatial/Containable";
import { CommandGiverMixin } from "../../../../../lib/command/CommandGiver";
import { SensorMixin } from "../../../../../lib/message/Sensor";
import { NamedMixin } from "../../../../../lib/description/Named";
import { Agent } from "../../../../../lib/stuff/Agent";
import { StuffApi } from "../../../../../api/stuff";
import { MixinApi } from "../../../../../api/mixin";
import { AccessApi } from "../../../../../api/access";
import { ContainmentApi } from "../../../../../api/containment";
import { AppSettings } from "../../../../../lib/config/AppSettings";
import { CommandDefinition } from "../../../../../lib/command/CommandDefinition";
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from "../../../../../api/command";
import type { Stuff } from "../../../../../lib/stuff/Stuff";
import type { Container } from "../../../../../lib/spatial/Container";
import type { AetherHosted } from "../../../../../lib/augmentation/AetherHosted";
import type { CredentialWallet } from "../../../../../lib/credential/CredentialWallet";
import type { FastTravel } from "../../../../../lib/fasttravel/FastTravel";
import { makeStuff } from "../../../../../lib/security/__tests__/test-setup";
import { installStore, type Doc } from "../../../../../world/lounge/__tests__/lounge-fixtures";
import PersistentHydrator from "../../../persistence/PersistentHydrator";

const PH = PersistentHydrator.templatePath;
const D_ROOM = "/world/test/d-room";
const R_ROOM = "/world/test/r-room";
const OFF_ROOM = "/world/test/off-room";
const DEPART = "/world/test/depart"; // operational departure gate
const OFF_GATE = "/world/test/depart-off"; // out-of-service departure gate
const ARRIVE = "/world/test/arrive"; // restricted destination (arrival-capable)

// An attuned traveller: hosts updates (identity wallet), carries inventory,
// moves, gives + receives commands.
class Traveller extends AetherMixin(
  MobileMixin(
    SensorMixin(
      CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Agent)))),
    ),
  ),
) {
  static _mixinName = "Traveller";
}

const docs: Doc[] = [
  { path: PH, class: PH, data: {} },
  { path: D_ROOM, class: "/platform/location/VoidLocation", hydratorClass: PH, data: { shortDescription: "the departure hall" } },
  { path: R_ROOM, class: "/platform/location/VoidLocation", hydratorClass: PH, data: { shortDescription: "the arrival hall" } },
  { path: OFF_ROOM, class: "/platform/location/VoidLocation", hydratorClass: PH, data: { shortDescription: "the shuttered hall" } },
  {
    path: DEPART,
    class: "/world/common/tpa/TpaTerminal",
    hydratorClass: PH,
    data: {
      seatIn: D_ROOM,
      shortDescription: "a Teleport Authority terminal",
      keywords: ["arrive"],
      directionality: "departure",
      status: "operational",
      routes: [{ to: ARRIVE }],
    },
  },
  {
    path: OFF_GATE,
    class: "/world/common/tpa/TpaTerminal",
    hydratorClass: PH,
    data: {
      seatIn: OFF_ROOM,
      shortDescription: "a Teleport Authority terminal",
      keywords: ["arrive"],
      directionality: "departure",
      status: "out-of-service",
      routes: [{ to: ARRIVE }],
    },
  },
  {
    path: ARRIVE,
    class: "/world/common/tpa/TpaTerminal",
    hydratorClass: PH,
    data: {
      seatIn: R_ROOM,
      shortDescription: "a Teleport Authority terminal",
      keywords: ["arrive"],
      directionality: "both",
      status: "operational",
      routes: [{ to: DEPART }],
    },
  },
];

function stub(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    "<test>",
  );
}

function ctx(
  giver: Stuff,
  location: Stuff | null,
  verb: string,
  source?: Stuff,
): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: location as never,
    commandSource: source as never,
    commandText: verb,
    executionId: "test",
    commandId: "test",
    verb,
    command: stub(verb),
  });
}

function registerCtl(): RegisterController {
  return makeStuff(() => new RegisterController());
}
function teleportCtl(): TeleportController {
  return makeStuff(() => new TeleportController());
}

function makeTraveller(name: string): Traveller {
  const t = makeStuff(() => {
    const a = new Traveller();
    a.setName(name);
    return a;
  });
  // Give it a born-with identity wallet (the aether-hosted CredentialWallet).
  const wallet = makeStuff(() => new CredentialWalletUpdate());
  (t as unknown as { hostUpdate(u: Stuff): void }).hostUpdate(wallet);
  return t;
}

function identityTravel(t: Stuff): CredentialWallet {
  // A single-object read on the traveller's own hosted updates (the old
  // findHostedUpdate leg-2 isolation, now a direct read).
  const w = MixinApi.isAether(t)
    ? (t
        .getHostedUpdates()
        .find(
          (s): s is Stuff & AetherHosted & CredentialWallet =>
            MixinApi.isCredentialWallet(s) && !!s.getCredential("travel"),
        ) ?? null)
    : null;
  if (!w) throw new Error("no identity wallet");
  return w;
}

describe("TPA identity binding (integration)", () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    installStore(docs);
    await AppSettings.warm();
    // Force the unprivileged TPA fork: with no AccessRegistry stood up,
    // AccessLogic fail-opens isWizard→true (bootstrap safety), which would
    // otherwise divert these plain travellers to the self-powered fork.
    vi.spyOn(AccessApi, "isWizard").mockResolvedValue(false);
    // Plain travellers hold nothing: no self-powered hop, the TPA it is.
    vi.spyOn(AccessApi, "heldExtents").mockResolvedValue([]);
  });
  afterEach(() => {
    AppSettings._resetForTesting();
    vi.restoreAllMocks();
  });

  it("register writes to identity, never to a carried card", async () => {
    const a = makeTraveller("alice");
    const card = makeStuff(() => new TravelCard());
    ContainmentApi.move(card, a);

    const arrive = await StuffApi.singleton<Stuff & FastTravel>(ARRIVE);
    await registerCtl().execute({} as CommandModel, ctx(a, null, "register", arrive as unknown as Stuff));

    expect(identityTravel(a).getCredential("travel")!.isRegistered(ARRIVE)).toBe(true);
    // The carried card's OWN set is untouched — clearance is not stored there.
    expect(card.getCredential("travel")!.isRegistered(ARRIVE)).toBe(false);
  });

  it("a loaded card handed to another player confers no clearance (headline)", async () => {
    const a = makeTraveller("alice");
    const b = makeTraveller("bob");

    // A registers the restricted destination on identity.
    const arrive = await StuffApi.singleton<Stuff & FastTravel>(ARRIVE);
    await registerCtl().execute({} as CommandModel, ctx(a, null, "register", arrive as unknown as Stuff));

    // Simulate the OLD vulnerability: a card physically carrying the node in
    // its own set. Hand it to B.
    const card = makeStuff(() => new TravelCard());
    card.ensureCredential("travel").register(ARRIVE);
    ContainmentApi.move(card, b);

    // Both stand at the operational departure gate.
    const dRoom = await StuffApi.singleton<Stuff & Container>(D_ROOM);
    await StuffApi.singleton(DEPART); // seat the gate into the room
    ContainmentApi.move(a, dRoom);
    ContainmentApi.move(b, dRoom);

    // B rides (bare teleport → selected route = the restricted destination).
    await teleportCtl().execute({} as CommandModel, ctx(b, dRoom, "teleport"));
    // B did NOT move — clearance read from identity, not the loaded card.
    expect(b.getContainer()).toBe(dRoom);

    // A rides successfully — A's identity holds the clearance.
    await teleportCtl().execute({} as CommandModel, ctx(a, dRoom, "teleport"));
    const rRoom = await StuffApi.singleton<Stuff & Container>(R_ROOM);
    expect(a.getContainer()).toBe(rRoom);
  });

  it("card-or-implant both satisfy the instrument gate", async () => {
    // Card-only actor: no hosted wallet, carries a card whose set holds R.
    const cardOnly = makeStuff(() => {
      const a = new Traveller();
      a.setName("carol");
      return a;
    });
    // Implant-only actor: hosted wallet, no card.
    const implantOnly = makeTraveller("dave");

    // Register R on the implant actor's identity so it can ride.
    const arrive = await StuffApi.singleton<Stuff & FastTravel>(ARRIVE);
    await registerCtl().execute({} as CommandModel, ctx(implantOnly, null, "register", arrive as unknown as Stuff));

    const dRoom = await StuffApi.singleton<Stuff & Container>(D_ROOM);
    await StuffApi.singleton(DEPART);

    // The card-only actor passes the instrument gate (a carried card counts)
    // — it is refused only at CLEARANCE (no identity store, empty clearance),
    // NOT at the instrument gate ("no credential").
    const card = makeStuff(() => new TravelCard());
    card.ensureCredential("travel").register(ARRIVE);
    ContainmentApi.move(card, cardOnly);
    ContainmentApi.move(cardOnly, dRoom);
    const c1 = ctx(cardOnly, dRoom, "teleport");
    await teleportCtl().execute({} as CommandModel, c1);
    expect(cardOnly.getContainer()).toBe(dRoom); // refused (no identity clearance)
    expect(c1.getNotes().some((n) => n.kind === "controller-rejected" && n.reason === "not-registered")).toBe(true);

    // The implant-only actor rides.
    ContainmentApi.move(implantOnly, dRoom);
    await teleportCtl().execute({} as CommandModel, ctx(implantOnly, dRoom, "teleport"));
    const rRoom = await StuffApi.singleton<Stuff & Container>(R_ROOM);
    expect(implantOnly.getContainer()).toBe(rRoom);
  });

  it("an out-of-service departure gate refuses the ride", async () => {
    const a = makeTraveller("erin");
    // Register R so clearance is not the reason for refusal.
    const arrive = await StuffApi.singleton<Stuff & FastTravel>(ARRIVE);
    await registerCtl().execute({} as CommandModel, ctx(a, null, "register", arrive as unknown as Stuff));

    const offRoom = await StuffApi.singleton<Stuff & Container>(OFF_ROOM);
    await StuffApi.singleton(OFF_GATE);
    ContainmentApi.move(a, offRoom);

    const c = ctx(a, offRoom, "teleport");
    await teleportCtl().execute({} as CommandModel, c);
    expect(a.getContainer()).toBe(offRoom); // refused, not moved
    expect(c.getNotes().some((n) => n.kind === "controller-rejected" && n.reason === "out-of-service")).toBe(true);
  });
});
