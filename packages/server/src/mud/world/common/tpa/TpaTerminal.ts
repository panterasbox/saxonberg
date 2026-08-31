/**
 * TpaTerminal — the generic, area-agnostic Teleport Authority terminal: a
 * network node you teleport between. Reusable machinery, so it lives under
 * `/world/common/tpa/`; an individual terminal is content of the area it stands in
 * and is *seeded* in that area's domain (`/world/lounge/`, `/world/eu/`, …)
 * from this class. "Terminal" is the TPA's in-world word, not a lib identifier.
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

import { Mml } from "../../../api/mml";
import { MixinApi } from "../../../api/mixin";
import type { Stuff } from "../../../lib/stuff/Stuff";
import Thing from "../../../lib/stuff/Thing";
import { DetailedMixin } from "../../../lib/description/Detailed";
import { FastTravelMixin } from "../../../lib/fasttravel/FastTravel";
import { FixtureMixin } from "../../../lib/stuff/Fixture";
import { PostRegistrationMixin } from "../../../lib/stuff/PostRegistration";
import { SingletonMixin } from "../../../lib/stuff/Singleton";
import { DisplayMixin } from "../../../lib/display/Display";

// The departures board is a DISPLAY: `pairing: open` (anyone in reach
// reads it), `shows: ['prose']` — a board is prose, and this terminal's
// prose is COMPUTED rather than driven (`readScreen` below). See
// docs/subsystems/display.md.
const TpaTerminalBase = DisplayMixin(
  SingletonMixin(
    PostRegistrationMixin(
      FixtureMixin(DetailedMixin(FastTravelMixin(Thing))),
    ),
  ),
);

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
  constructor() {
    super();
    this.pairing = "open";
    this.shows = ["prose"];
    // A brass pillar: nobody walks off with it. Narrow by design — the
    // TPA re-seating it, or an author moving the whole gate, still works.
    this.fixedInPlace = true;
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    // Seat self into the declared target (a Warren host or a static
    // location) via `seatIn`, then cascade the rest of the network live off
    // this node and arm any scheduled/cycle departures. Runs after singleton
    // cache-registration, so reentrant route lookups (and the warren's
    // re-seat) hit the in-flight instance.
    await this.seatSelf();
    await this.armNetwork();
    this.armTimetable();
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
    if (this.getStatus() !== "operational") {
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
