/**
 * TpaTerminal — the generic, area-agnostic Teleport Authority terminal: a
 * network node you teleport between. Reusable machinery, so it lives in the
 * tpa pack (`/system/tpa/thing/TpaTerminal`); an individual terminal is
 * content of the LOCALITY it stands in and keeps its `/world/**` row there
 * (`/world/lounge/`, `/world/terminus/`, …), naming this class. That split
 * is the pack's whole membership test: the mechanism is the system's, the
 * instance is the realm's.
 *
 * Composes `FastTravelMixin` (the node mechanism) on a `Thing` (which already
 * brings Visible / Perceptible / Tangible / Containable), plus Detailed (so a
 * terminal can carry `look`-able features), PostRegistration (cascade + arm
 * the timetable on boot), and Singleton (each terminal is network-resident).
 *
 * Surfaces the affordance two ways so bare-`teleport`-shows-the-board is
 * discoverable: a default **long description** that says how to use it, and a
 * diegetic **status light** — blue arrival / red departure / purple both /
 * grey offline. The light is the *colour of the terminal's name*: the
 * `getPresentationMml` override builds the name fragment wrapped in an
 * explicit `<color>` MML tag (`Mml.color`), resolved client-side through the
 * theme palette, so the colour does the work without spelling it out; the
 * long description states the same condition in words (the non-colour-alone
 * channel).
 */

import { Mml } from "@saxonberg/server/mud/api/mml";
import { AppApi } from "@saxonberg/server/mud/api/app";
import { AppSettingKeys } from "@saxonberg/server/mud/lib/config/AppSettings";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import Thing from "@saxonberg/server/mud/lib/stuff/Thing";
import { DetailedMixin } from "@saxonberg/server/mud/lib/description/Detailed";
import { FastTravelMixin } from "../lib/FastTravel";
import { FixtureMixin } from "@saxonberg/server/mud/lib/stuff/Fixture";
import { PostRegistrationMixin } from "@saxonberg/server/mud/lib/stuff/PostRegistration";
import { SingletonMixin } from "@saxonberg/server/mud/lib/stuff/Singleton";
import { DisplayMixin } from "@saxonberg/server/mud/lib/display/Display";
import { PersistableMixin } from "@saxonberg/server/mud/lib/persistence/Persistable";
import { SlottedMixin } from "@saxonberg/server/mud/lib/slot/Slotted";
import { ChargedMixin } from "@saxonberg/server/mud/lib/magic/Charged";
import { ConduitMixin } from "@saxonberg/server/mud/lib/magic/Conduit";
import { ContainerMixin } from "@saxonberg/server/mud/lib/spatial/Container";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { MixinApi as _MixinApi } from "@saxonberg/server/mud/api/mixin";
import { ReservedMixin } from "@saxonberg/server/mud/lib/reserve";
import { SUPPLY_STATE_GLOSS } from "@saxonberg/server/mud/lib/supply/SupplyState";
import type { SupplyState } from "@saxonberg/server/mud/lib/supply/SupplyState";
import type { CommandContributions } from "@saxonberg/server/mud/api/command";
import type { FieldMeta } from "@saxonberg/server/mud/lib/mixin";
import {
  BATTERY_SLOT,
  ManaPoweredMixin,
} from "@saxonberg/content-arcana/src/lib/ManaPowered";

// ⭐ Read BOTTOM-UP, and every layer is forced by something:
//
// - **`ConduitMixin` at the bottom** is the single most load-bearing
//   find in the whole reform. `MagicLogic.bestConduitFor(actor)` scans
//   the actor's ENVIRONMENT for a `ConduitMixin` and refuses a transfer
//   without one — *"bare hands are a poor road for that much energy."*
//   A terminal that composes it **is its own coupling**, so a traveller
//   standing at one can pour their pool in with no rod, no bench, and
//   ZERO kernel change. It is also already true in the fiction: the
//   terminal is a brass pillar, and brass conducts.
// - **`ChargedMixin`** because an impulse device *"draws per use and
//   runs off a stored charge"* — the reservoir IS the impulse shape, not
//   an implementation convenience. It is what makes `dry` mean
//   something, what `chargeFrom` needs a shell for, and what makes the
//   three supplies three ways of filling ONE thing rather than three
//   parallel draw paths.
// - **`SlottedMixin`** for the battery bay; **`ManaPoweredMixin`** for
//   the draw surface and the condition; **`ContainerMixin`** because a
//   part that goes into a machine has to physically BE somewhere (the
//   slot is occupancy, containment is location — the `plant`-into-a-pot
//   order); **`PersistableMixin`** so the
//   reservoir level and the cell in the bay survive a restart (the
//   shipped spine captures a `SlottedSlice` and the per-mixin fields —
//   no new collection).
//
// The departures board is a DISPLAY: `pairing: open` (anyone in reach
// reads it), `shows: ['prose']` — a board is prose, and this terminal's
// prose is COMPUTED rather than driven (`readScreen` below). See
// docs/subsystems/display.md.
const TpaTerminalBase = DisplayMixin(
  PersistableMixin(
    SingletonMixin(
      PostRegistrationMixin(
        FixtureMixin(
          DetailedMixin(
            FastTravelMixin(
              ManaPoweredMixin(
                SlottedMixin(
                  ChargedMixin(
                    ReservedMixin(ConduitMixin(ContainerMixin(Thing))),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  ),
);

/**
 * Numeric AppSetting read, falling back to the seeded literal — the
 * shipped `dial` idiom, so the pack is right with the settings row
 * absent (a fresh box, a unit fixture).
 */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === "" || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

const DEFAULT_FLAVOR =
  "A Teleport Authority terminal stands here: a brass pillar crowned with a " +
  "glowing departures board, the next outbound stop pulsing at its head.";

const AFFORDANCE_HINT =
  "Read the board with `teleport`; step up and name a stop — " +
  "`teleport <place>` — to ride.";

// Shown only on arrival-capable terminals — a departure-only node is one-way
// out and has nothing to register. Tells a traveller who reached a new stop
// how to add it to their network.
const REGISTER_HINT =
  "New to this stop? `register` adds it to your travel credential, so you can " +
  "return here from anywhere on the network.";

export default class TpaTerminal extends TpaTerminalBase {
  /**
   * ⚠ `ChargedMixin` affords `zap` AND `recharge` on the peers /
   * environment buckets. `recharge <terminal>` is exactly right — it is
   * the pre-loading route for somebody who wants to fill the gate
   * before riding. `zap` is not: a terminal is not a wand, and the verb
   * would offer to fire a working the pillar does not carry.
   *
   * Overriding the static drops it. The contribution collector reads
   * the MOST-DERIVED static rather than unioning the chain, which W6's
   * suite asserts directly — if that ever changes, the fix is
   * `zap.yaml` growing `requires: [ArcaneMixin]` (a spell-bound shell),
   * which is the honest gate regardless.
   *
   * `register` comes from `FastTravelMixin` and is re-declared here
   * because a most-derived static REPLACES rather than extends.
   * `teleport` is the KERNEL's verb (`MobileMixin` affords it) — a node
   * adds the ride and the board, it does not grant the verb.
   */
  static commandContributions: CommandContributions = {
    self: [],
    peers: [
      "system/tpa/cmd/movement/register.yaml",
      "system/arcana/cmd/magic/recharge.yaml",
    ],
    environment: [
      "system/tpa/cmd/movement/register.yaml",
      "system/arcana/cmd/magic/recharge.yaml",
    ],
  };

  /**
   * A cell the Authority seated when it built the gate. Authored, and
   * laid down ONCE — only into an empty bay, so a restart restores the
   * captured occupant rather than minting a second one.
   */
  public bornWithCell: string = "";

  static fieldMeta: FieldMeta = {
    bornWithCell: { persistent: true, authorable: true },
  };

  public getBornWithCell(): string {
    return this.bornWithCell;
  }
  public setBornWithCell(v: string): void {
    this.bornWithCell = typeof v === "string" ? v : "";
  }

  constructor() {
    super();
    this.pairing = "open";
    this.shows = ["prose"];
    // A brass pillar: nobody walks off with it. Narrow by design — the
    // TPA re-seating it, or an author moving the whole gate, still works.
    this.fixedInPlace = true;
    // An impulse device: it draws per ride off a stored charge.
    this.setDrawMode("impulse");
    this.setStaticSlots([
      {
        name: BATTERY_SLOT,
        // ⚠ `accepts` may only name a KERNEL `Mixins` value — a pack
        // cannot invent one — so the bay takes any charged shell and
        // `ManaCell.fitsSlot` narrows from the candidate side.
        accepts: "ChargedMixin",
        capacity: 1,
        userFacingDetail: "bay",
      },
    ]);
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    // Seat self into the declared target (a Warren host or a static
    // location) via `seatIn`, then cascade the rest of the network live off
    // this node and arm any scheduled/cycle departures. Runs after singleton
    // cache-registration, so reentrant route lookups (and the warren's
    // re-seat) hit the in-flight instance.
    await this.seatSelf();
    await this.armSupply();
    await this.armNetwork();
    this.armTimetable();
  }

  /**
   * @hook Seat the authored cell — the spine's **no-record branch**.
   *
   * ⚠⚠ This was `postRegister`'s job for about an hour, and the live
   * drive killed it: `StuffApi.singleton` already runs
   * `hasRecord ? materialize : seedBornWith + capture`, so seating a
   * cell in `postRegister` put one in the bay and THEN let the restore
   * try to re-seat the captured one — *"Slotted.occupy: slot 'battery'
   * is full"*, and the terminal failed to stand up at all. Every gate
   * on the frontier was dark on the second boot.
   *
   * Overriding `seedBornWith` is the fix and is also what the row
   * comment always claimed: laid down exactly once, on a world that has
   * no record of this gate, and captured immediately after — so the
   * next standup RESTORES the cell (at whatever charge it had drained
   * to) rather than minting a fresh full one. AC13c's drain is only
   * durable because of this.
   *
   * ⓘ Still not `props:` — props seed CONTENTS and a bay is occupancy.
   * Contents first, then the slot: the `plant`-into-a-pot order.
   */
  public override async seedBornWith(): Promise<void> {
    await super.seedBornWith();
    if (!this.bornWithCell) return;
    if (this.getOccupant(BATTERY_SLOT)) return;
    try {
      const cell = await StuffApi.clone<Stuff>(this.bornWithCell);
      if (!_MixinApi.isContainable(cell) || !_MixinApi.isSlottable(cell)) return;
      ContainmentApi.move(cell, this as never);
      this.occupy(cell, BATTERY_SLOT);
    } catch (err) {
      console.warn(
        `TpaTerminal: could not seat ${this.bornWithCell}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  public override onDestruct(): void {
    this.disarmTimetable();
    super.onDestruct();
  }

  /**
   * ⭐ The PROSE arm, and the reason it cannot be a pushed payload: the
   * board annotates every route against the READER's own travel
   * credential ("— not yet registered"). One shared payload would show
   * the whole room whichever traveller last touched the terminal had
   * registered — wrong for everyone else, and nobody's business. So the
   * board resolves when you read the screen, per reader.
   *
   * `look <terminal>` is therefore how you read the board; a bare
   * `teleport` is the same text on demand.
   */
  override async readScreen(viewer: Stuff): Promise<Mml | null> {
    if (!MixinApi.isSensor(viewer)) return super.readScreen(viewer);
    return Mml.fromMarkup(await this.renderDepartures(viewer));
  }

  /**
   * The terminal's operating condition as a color name: grey out of
   * service, else blue inbound / red outbound / purple both-ways.
   */
  private statusColor(): string {
    if (this.getStatus() !== "operational") return "grey";
    // ⭐ AMBER — the fourth colour, and the one that is a RELATIONSHIP
    // rather than a property. The gate is armed and running, and short
    // for the ride currently selected; a cheaper ride off the same
    // terminal is fine. See {@link stateForSelectedRide}.
    if (this.selectedRideIsOverdrawn()) return "amber";
    switch (this.getDirectionality()) {
      case "arrival":
        return "blue";
      case "departure":
        return "red";
      default:
        return "purple";
    }
  }

  /**
   * **The gate's condition, derived — never a stored string.**
   *
   * ⭐ `status` was a persisted field nothing ever wrote: an author
   * could set it and the light would go grey, and no mechanism in the
   * game could dim a terminal for a reason. It now DERIVES from
   * `ManaPoweredMixin.supplyState()`, so a gate is out of service iff
   * something is actually wrong with its supply — which is what makes
   * AC9's refusal originate in the mixin rather than in TPA-specific
   * breakdown code.
   *
   * An authored non-`operational` value still wins, so an author can
   * close a gate deliberately.
   */
  override getStatus(): string {
    const authored = super.getStatus();
    if (authored !== "operational") return authored;
    return this.supplyState() ? "out-of-service" : "operational";
  }

  /** Is the CURRENTLY SELECTED ride more than this gate can cover? */
  private selectedRideIsOverdrawn(): boolean {
    return this._selectedRideDeficit;
  }

  /**
   * Set by the ride path before it quotes, so the light can show the
   * ride-scoped `overdrawn` band the stock read cannot know about.
   * Transient — a condition of the moment, never persisted.
   */
  private _selectedRideDeficit = false;

  /** Record whether this gate can cover a ride costing `tau`. */
  public noteRideCost(tau: number): SupplyState | null {
    const state = this.stateForDraw(tau);
    this._selectedRideDeficit = state === "overdrawn";
    return state;
  }

  /**
   * **What this gate charges per τ it supplies**, and ⭐ it DERIVES
   * from where the mana came from rather than being authored.
   *
   * That is the whole of D8a: the operator bought the mana and resells
   * it at its cost basis, so a gate on the city line is cheap and a
   * frontier post running on bought cells is dear — and the traveller
   * can *see* which is which by looking at the terminal. Two
   * otherwise-identical gates quote different prices for the same ride
   * (AC13), and neither price is a number somebody tuned.
   *
   * `contact`/`none` is zero: you cannot be charged for mana the
   * operator did not buy.
   */
  public manaRatePerTau(): number {
    switch (this.getSupplyMode()) {
      case "main":
        return dial(AppSettingKeys.tpaManaRateMains, 0.002);
      case "cell":
        return dial(AppSettingKeys.tpaManaRateCell, 0.01);
      default:
        return 0;
    }
  }

  /**
   * The terminal's name fragment, tinted by status: the colour does the
   * work, no words in the listing. We build a richer `Mml` fragment than
   * the default plain one — the name wrapped in an explicit `<color>`
   * tag — so the status reads as a real property of the composed prose,
   * not a hidden tint channel. The long description spells the same
   * state out in words (the non-colour-alone cue) on a deliberate look.
   */
  override getPresentationMml(label: string): Mml {
    return Mml.color(this.statusColor(), label);
  }

  /** The status light in words — the colorblind-safe channel, shown on
   * a deliberate look rather than in every room listing. */
  private statusLine(): string {
    const supply = this.supplyState();
    if (supply) {
      // ⭐ The six words, in words. The colour does the work in a room
      // listing; this is the non-colour-alone channel, and it names the
      // SHAPE OF THE FIX — a player who learned what `dry` means at a
      // standpipe has learned what it means here.
      return `Its status light is dark — ${SUPPLY_STATE_GLOSS[supply]}.`;
    }
    if (this._selectedRideDeficit) {
      return (
        "Its light burns amber: it is running, but short of what the " +
        "outbound stop would take."
      );
    }
    if (super.getStatus() !== "operational") {
      return "Its status light is dark — the terminal is out of service.";
    }
    switch (this.getDirectionality()) {
      case "arrival":
        return "Its light glows blue: an arrival-only stop.";
      case "departure":
        return "Its light burns red: a departure-only stop.";
      default:
        return "Its light shines a steady purple: it runs both ways.";
    }
  }

  override getShortDescription(): string {
    return super.getShortDescription() || "a Teleport Authority terminal";
  }

  override getLongDescription(): string {
    const flavor =
      this.longDescription && this.longDescription.length > 0
        ? this.longDescription
        : DEFAULT_FLAVOR;
    const register = this.isArrival() ? `\n${REGISTER_HINT}` : "";
    return `${flavor}\n${this.statusLine()}\n${AFFORDANCE_HINT}${register}`;
  }

  // The look/inspect surfaces render `getMarkupLong` → `getLong`, which
  // reads the raw `longDescription` field (empty here) with a
  // short-description fallback — it never consults `getLongDescription()`.
  // Route those surfaces through the computed long description so the
  // affordance hints and the status line (the non-colour-alone channel
  // for the name tint) actually show on a deliberate look.
  override getLong(): string {
    return this.getLongDescription();
  }
}
