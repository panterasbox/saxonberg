/**
 * The gate as a mana consumer, and what it costs (TPA reform W6/W6a/W7 —
 * AC9, AC11–AC13, AC13a–AC13c, AC26).
 *
 * ⭐⭐ **The ride is not a cast.** No `prepareCast`, no `resolveCast`, no
 * band gate: the gate quotes `MagicApi.relocationCost`, draws that many
 * τ, settles the money, and moves the traveller. That is D10's *"the TPA
 * is a utility selling a capability its customers do not have"*
 * expressed structurally — a ride through the cast pipeline would
 * inherit the band gate and lock out the network's entire customer base.
 *
 * The gate is a `TpaTerminal`, which composes exactly what the dorm's
 * wall lamp composes. Nothing in the mana leg below is TPA-specific
 * code: the refusals originate in `ManaPoweredMixin` and are worded in
 * the shipped six-word supply vocabulary.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import TpaTerminal from "../thing/TpaTerminal";
import ManaCell from "@saxonberg/content-arcana/src/thing/ManaCell";
import ManaMain from "@saxonberg/content-arcana/src/thing/ManaMain";
import { BATTERY_SLOT } from "@saxonberg/content-arcana/src/lib/ManaPowered";
import { AetherMixin } from "@saxonberg/server/mud/lib/message/Aether";
import { MobileMixin } from "@saxonberg/server/mud/lib/spatial/Mobile";
import { ContainerMixin } from "@saxonberg/server/mud/lib/spatial/Container";
import { ContainableMixin } from "@saxonberg/server/mud/lib/spatial/Containable";
import { CommandGiverMixin } from "@saxonberg/server/mud/lib/command/CommandGiver";
import { SensorMixin } from "@saxonberg/server/mud/lib/message/Sensor";
import { NamedMixin } from "@saxonberg/server/mud/lib/description/Named";
import { EnvironmentMixin } from "@saxonberg/server/mud/lib/shell/Environment";
import Location from "@saxonberg/server/mud/lib/stuff/Location";
import { Agent } from "@saxonberg/server/mud/lib/stuff/Agent";
import CredentialWalletUpdate from "@saxonberg/server/mud/platform/idea/CredentialWalletUpdate";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { MagicApi } from "@saxonberg/server/mud/api/magic";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import { WorldClockApi } from "@saxonberg/server/mud/api/worldclock";
import { AppApi } from "@saxonberg/server/mud/api/app";
import { AppSettingKeys } from "@saxonberg/server/mud/lib/config/AppSettings";
import {
  makeStuff,
  makeStuffAtPath,
} from "@saxonberg/server/mud/lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";

const D_ROOM = "/world/test/mana/d-room";
const R_ROOM = "/world/test/mana/r-room";
const DEPART = "/world/test/mana/depart";
const ARRIVE = "/world/test/mana/arrive";
const MAIN = "/world/test/mana/main";

class Traveller extends AetherMixin(
  EnvironmentMixin(
    MobileMixin(
      SensorMixin(
        CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Agent)))),
      ),
    ),
  ),
) {
  static _mixinName = "Traveller";
}

let notes: Array<Record<string, unknown>> = [];

function ctx(giver: Stuff, location: Stuff): CommandContext {
  notes = [];
  return {
    commandGiver: giver,
    location,
    note: (n: Record<string, unknown>) => notes.push(n),
  } as unknown as CommandContext;
}


/**
 * ⭐ The pack's tests drive the pack's own surface. Since the TPA reform's
 * correction, the `teleport` VERB is the kernel's — a privileged person
 * must be able to teleport with no network installed — and the network's
 * rules live on `FastTravelMixin.ride()`, the `TravelNode` shape the
 * kernel verb calls. So these exercise `ride()` directly: the credential
 * gate, the condition, the mana leg and the fare are all here, and the
 * verb's own forks are tested in the kernel.
 *
 * The outcome is folded into a notes-shaped list so the assertions read
 * the same as when a controller produced them.
 */
async function ride(
  t: Traveller,
  node: TpaTerminal,
  spec: { channel?: boolean } = {},
): Promise<void> {
  notes = [];
  const out = await node.ride(t as unknown as Stuff, {
    keyword: "arrive",
    ...spec,
  });
  if (!out.ok) {
    notes.push({
      kind: "controller-rejected",
      reason: out.reason,
      detail: out.refusal,
    });
  }
}

function rejectedFor(reason: string): boolean {
  return notes.some(
    (n) => n.kind === "controller-rejected" && n.reason === reason,
  );
}

function traveller(name: string): Traveller {
  const t = makeStuff(() => {
    const a = new Traveller();
    a.setName(name);
    return a;
  });
  const wallet = makeStuff(() => new CredentialWalletUpdate());
  (t as unknown as { hostUpdate(u: Stuff): void }).hostUpdate(wallet);
  wallet.getCredential("travel")!.register(ARRIVE);
  return t;
}

/** A gate routed to ARRIVE, seated in D_ROOM. */
function seedNetwork(opts: {
  capacity?: number;
  stored?: number;
  floor?: number;
  standbyWatts?: number;
  cell?: number | null;
  mains?: boolean;
} = {}): { dRoom: Location; depart: TpaTerminal; arrive: TpaTerminal } {
  const dRoom = makeStuffAtPath(() => new Location(), D_ROOM);
  const rRoom = makeStuffAtPath(() => new Location(), R_ROOM);

  const depart = makeStuffAtPath(() => new TpaTerminal(), DEPART);
  depart.setDirectionality("departure");
  depart.setCapacityTau(opts.capacity ?? 4000);
  depart.setArmingFloorTau(opts.floor ?? 0);
  depart.standbyWatts = opts.standbyWatts ?? 0;
  depart.applyRoutes([{ to: ARRIVE, fee: 0 }]);
  ContainmentApi.move(depart as never, dRoom as never);
  if (opts.stored !== undefined) {
    depart.spendCharge(depart.getStoredTau() - opts.stored);
  }
  if (opts.cell != null) {
    const c = makeStuff(() => new ManaCell());
    c.setCapacityTau(opts.cell);
    ContainmentApi.move(c as never, depart as never);
    depart.occupy(c as never, BATTERY_SLOT);
  }
  if (opts.mains) {
    const m = makeStuffAtPath(() => new ManaMain(), MAIN);
    m.setCapacityTau(100000);
    depart.setMainsRef(MAIN);
  }

  const arrive = makeStuffAtPath(() => new TpaTerminal(), ARRIVE);
  arrive.setDirectionality("both");
  arrive.setKeywords(["arrive"]);
  ContainmentApi.move(arrive as never, rRoom as never);

  return { dRoom, depart, arrive };
}

describe("the gate runs on mana", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    StuffApi.clearAll();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100_000);
    // ⓘ The MANA RATE is zeroed for this suite, deliberately: what is
    // under test here is the mana LEG — the arming floor, the
    // relationship band, the draw — and a live rate would drag the
    // banking harness in beside it. The rate's own derivation is
    // asserted directly, off `manaRatePerTau()`, in its own test below.
    // Every other `dial` falls back to its seeded literal, which is
    // what a fresh box does.
    vi.spyOn(AppApi, "setting").mockImplementation((k: string) =>
      k === AppSettingKeys.tpaManaRateCell ||
      k === AppSettingKeys.tpaManaRateMains
        ? "0"
        : "",
    );
    // The cost is the subject of its own suite; here it is a fixed
    // quote so the mana leg's arithmetic is checkable by hand.
    vi.spyOn(MagicApi, "relocationCost").mockResolvedValue(100);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  // ─────────────────────────── AC9 ───────────────────────────

  it("AC9 — an exhausted gate reports `dry`, shows grey, and refuses", async () => {
    const { dRoom, depart } = seedNetwork({ capacity: 4000, stored: 0, floor: 200 });
    const t = traveller("alice");
    ContainmentApi.move(t as never, dRoom as never);

    // The condition comes from `ManaPoweredMixin`, in the shipped
    // six-word vocabulary — no TPA-specific breakdown code exists.
    expect(depart.supplyState()).toBe("dry");
    // …and the light and the words agree.
    expect(depart.getStatus()).toBe("out-of-service");
    expect(depart.getLongDescription()).toContain("status light is dark");

    await ride(t, depart);
    expect(rejectedFor("gate-dry")).toBe(true);
    expect((t as unknown as { getContainer(): unknown }).getContainer()).toBe(
      dRoom,
    );
  });

  // ────────────────────── AC13a / AC13b ──────────────────────

  it("AC13a — below the ARMING FLOOR it refuses even a BYO ride", async () => {
    const { dRoom, depart } = seedNetwork({ capacity: 4000, stored: 50, floor: 200 });
    const t = traveller("bob");
    ContainmentApi.move(t as never, dRoom as never);

    // ⚠ Offering your own mana is not the fix. Below the floor the gate
    // is not a gate: there is nothing for the mana to arrive INTO.
    await ride(t, depart, { channel: true });
    expect(rejectedFor("gate-dry")).toBe(true);
    expect(depart.isArmed()).toBe(false);
  });

  it("AC13b — `overdrawn` is a RELATIONSHIP: the same gate runs a cheaper hop", async () => {
    const { dRoom, depart } = seedNetwork({ capacity: 4000, stored: 300, floor: 200 });
    const t = traveller("carol");
    ContainmentApi.move(t as never, dRoom as never);

    // Armed and running — the STOCK question says nothing is wrong…
    expect(depart.supplyState()).toBeNull();
    // …and the TRANSACTION question is the one that knows the amount.
    expect(depart.stateForDraw(100)).toBeNull();
    expect(depart.stateForDraw(5000)).toBe("overdrawn");

    // An expensive hop is refused, and the refusal names the RIDE.
    vi.spyOn(MagicApi, "relocationCost").mockResolvedValue(5000);
    await ride(t, depart);
    expect(rejectedFor("overdrawn")).toBe(true);
    // The amber band: running, but short for THIS ride.
    expect(depart.getStatus()).toBe("operational");

    // …and the same gate, unchanged, runs a cheaper one.
    vi.spyOn(MagicApi, "relocationCost").mockResolvedValue(100);
    await ride(t, depart);
    expect(notes.filter((n) => n.kind === "controller-rejected")).toHaveLength(0);
  });

  // ─────────────────────────── AC13c ───────────────────────────

  it("AC13c — a gate with NO traffic at all drains to `dry` over time", async () => {
    let now = 100_000;
    WorldClockApi._setNowProviderForTesting(() => now);
    const { depart } = seedNetwork({
      capacity: 1200,
      stored: 1200,
      floor: 150,
      standbyWatts: 5,
    });
    expect(depart.isArmed()).toBe(true);

    // Nobody rides. Absence is a cost — reconcile-on-read, no clock, the
    // same shape `GrowingMixin` and the soil use. THIS is what gives a
    // cell swap a schedule, and gives the Authority its first real job.
    // ⓘ The provider is in REAL MILLISECONDS; the world clock scales
    // them into game-seconds. A game-month of nobody riding.
    now += 300_000_000;
    expect(depart.isArmed()).toBe(false);
    expect(depart.supplyState()).toBe("dry");
  });

  // ─────────────────────── AC11 / AC12 ───────────────────────

  it("AC11/AC13 — the mana rate DERIVES from the supply, so two gates differ", () => {
    // The seeded literals, this time: the rate is the subject.
    vi.spyOn(AppApi, "setting").mockReturnValue("");
    const { depart } = seedNetwork({ cell: 600 });
    expect(depart.getSupplyMode()).toBe("cell");
    // Nobody tuned this: the operator resells its own supply at its cost
    // basis, so a post on bought cells is dearer than a gate on the line.
    const cellRate = depart.manaRatePerTau();

    StuffApi.clearAll();
    const city = seedNetwork({ mains: true });
    expect(city.depart.getSupplyMode()).toBe("main");
    expect(city.depart.manaRatePerTau()).toBeLessThan(cellRate);
  });

  it("AC12 — a NON-caster cannot channel, and the reason is not a check we wrote", async () => {
    // A gate that is armed but SHORT for this ride, so the BYO path is
    // actually exercised (a full gate needs nobody's help).
    const { dRoom, depart } = seedNetwork({ capacity: 4000, stored: 50, mains: false });
    const t = traveller("dave");
    ContainmentApi.move(t as never, dRoom as never);
    // ⭐ `installArcaneReserve` returns early for a non-caster, so a
    // non-caster holds NO reserve at all — `chargeFrom` refuses on that
    // fact rather than on anything this build added.
    expect(MixinApi.isCaster(t as unknown as Stuff)).toBe(false);
    await ride(t, depart, { channel: true });
    expect(rejectedFor("cannot-channel")).toBe(true);
  });

  // ────────────────────── the ride that works ──────────────────────

  it("a fed gate runs the ride, and the draw comes off its reservoir", async () => {
    const { dRoom, depart, arrive } = seedNetwork({
      capacity: 4000,
      stored: 4000,
      floor: 200,
    });
    const t = traveller("erin");
    ContainmentApi.move(t as never, dRoom as never);

    const before = depart.getStoredTau();
    await ride(t, depart);
    expect(notes.filter((n) => n.kind === "controller-rejected")).toHaveLength(0);
    expect(depart.getStoredTau()).toBeCloseTo(before - 100, 6);
    // …and the traveller arrived where the destination gate stands.
    expect((t as unknown as { getContainer(): unknown }).getContainer()).toBe(
      (arrive as unknown as { getContainer(): unknown }).getContainer(),
    );
  });

  it("a cell in the bay tops the reservoir up on demand — one resolveSupply", async () => {
    // Armed (no floor to fall below) but SHORT for this ride, so the
    // top-up path is actually exercised.
    const { dRoom, depart } = seedNetwork({
      capacity: 4000,
      stored: 50,
      floor: 0,
      cell: 600,
    });
    const t = traveller("frank");
    ContainmentApi.move(t as never, dRoom as never);

    await ride(t, depart);
    expect(notes.filter((n) => n.kind === "controller-rejected")).toHaveLength(0);
    // The cell gave up what the gate was short of; the gate holds no
    // branch on which supply answered.
    const cell = depart.getOccupant(BATTERY_SLOT) as unknown as ManaCell;
    expect(cell.getStoredTau()).toBeLessThan(600);
  });

  // ─────────────────────────── the wrinkle ───────────────────────────

  it("the gate affords `recharge` and NOT `zap` — the most-derived static wins", () => {
    const affordances = [
      ...(TpaTerminal.commandContributions.peers ?? []),
      ...(TpaTerminal.commandContributions.environment ?? []),
    ];
    // `ChargedMixin` offers both; a terminal is not a wand, and the verb
    // would offer to fire a working the pillar does not carry.
    expect(affordances.some((v) => v.includes("recharge"))).toBe(true);
    expect(affordances.some((v) => v.includes("zap"))).toBe(false);
    // ⚠ The assertion that the collector reads the MOST-DERIVED static
    // rather than unioning the chain: `register` survives the override,
    // `zap` does not. If it ever unions, the fix is `zap.yaml` growing
    // `requires: [ArcaneMixin]`.
    expect(affordances.some((v) => v.includes("register"))).toBe(true);
    // ⭐⭐ And `teleport` is NOT here, deliberately. It is the KERNEL's
    // verb, afforded by `MobileMixin` beside `go` and `goto`: a node
    // adds the ride and the board to a verb everyone already has, it
    // does not GRANT the verb. You must not need a travel network
    // installed in order to teleport.
    expect(affordances.some((v) => v.includes("teleport"))).toBe(false);
  });
});
