/**
 * TpaTerminal — the generic, area-agnostic Teleport Authority terminal: a
 * network node you teleport between. Reusable machinery, so it lives under
 * `/domain/common/tpa/`; an individual terminal is content of the area it stands in
 * and is *seeded* in that area's domain (`/domain/lounge/`, `/domain/eu/`, …)
 * from this class. "Terminal" is the TPA's in-world word, not a lib identifier.
 *
 * Composes `FastTravelMixin` (the node mechanism) on a `Thing` (which already
 * brings Visible / Perceptible / Tangible / Containable), plus Detailed (so a
 * terminal can carry `look`-able features), PostRegistration (cascade + arm
 * the timetable on boot), and Singleton (each terminal is network-resident).
 *
 * Surfaces the affordance two ways so bare-`teleport`-shows-the-board is
 * discoverable: a default **long description** that says how to use it, and a
 * computed **short description** carrying a diegetic status light — blue
 * arrival / red departure / purple both / dark offline. The word carries the
 * meaning; the colour only reinforces it (never colour-alone).
 */

import Thing from "../../../lib/stuff/Thing";
import { DetailedMixin } from "../../../lib/description/Detailed";
import { FastTravelMixin } from "../../../lib/fasttravel/FastTravel";
import { PostRegistrationMixin } from "../../../lib/stuff/PostRegistration";
import { SingletonMixin } from "../../../lib/stuff/Singleton";

const TpaTerminalBase = SingletonMixin(
  PostRegistrationMixin(DetailedMixin(FastTravelMixin(Thing))),
);

const DEFAULT_FLAVOR =
  "A Teleport Authority terminal stands here: a brass pillar crowned with a " +
  "glowing departures board, the next outbound stop pulsing at its head.";

const AFFORDANCE_HINT =
  "Read the board with `teleport`; step up and name a stop — " +
  "`teleport <place>` — to ride.";

export default class TpaTerminal extends TpaTerminalBase {
  public override async postRegister(_context?: unknown): Promise<void> {
    // Cascade the rest of the network live off this node, then arm any
    // scheduled/cycle departures. Runs after singleton cache-registration,
    // so reentrant route lookups hit the in-flight instance.
    await this.armNetwork();
    this.armTimetable();
  }

  public override onDestruct(): void {
    this.disarmTimetable();
    super.onDestruct();
  }

  /** A diegetic status light — directionality, or dark when offline. */
  private statusLight(): string {
    if (this.getStatus() !== "operational") {
      return "its light dark, out of service";
    }
    switch (this.getDirectionality()) {
      case "arrival":
        return "its arrival light glowing blue";
      case "departure":
        return "its departure light burning red";
      default:
        return "lit a steady purple for both";
    }
  }

  override getShortDescription(): string {
    const base = super.getShortDescription() || "a Teleport Authority terminal";
    return `${base}, ${this.statusLight()}`;
  }

  override getLongDescription(): string {
    const flavor =
      this.longDescription && this.longDescription.length > 0
        ? this.longDescription
        : DEFAULT_FLAVOR;
    return `${flavor}\n${AFFORDANCE_HINT}`;
  }
}
