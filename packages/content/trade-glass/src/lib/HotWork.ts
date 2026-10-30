/**
 * HotWorkWatch — ⭐ the hot-work window (glass build D10). A sustained
 * engagement on the glassmaker's `attention`, hosted by the blowpipe,
 * that watches the gather cool. It invents NO timing machinery: the
 * gather's clock is the thermal substrate every object already runs
 * (`Gather` cools by Newton drift), and this reads it at the one moment
 * the activity framework already gives — a tick.
 *
 * Each tick narrates a WORK-BAND crossing only (runs → soft → stiffening
 * → setting), each line coloured by the gather's own heat on the one
 * incandescence scale, so the player feels the window closing.
 * When the gather falls below working heat it is LOST — `gather.loseToCullet`
 * converts it, the loss is narrated, a failure deed credited — and the
 * watch completes. `cancel glasswork` stops the watching, not the cooling:
 * the lump stays on the pipe (onAbort does not lose it).
 */

import type {
  SustainedEngagement,
  ScheduledEmission,
} from "@saxonberg/server/mud/api/scheduler";
import { SchedulerApi } from "@saxonberg/server/mud/api/scheduler";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { Mml } from "@saxonberg/server/mud/api/mml";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { AppApi } from "@saxonberg/server/mud/api/app";
import { FireApi } from "@saxonberg/server/mud/api/fire";
import type { EngagementSlot, Engaged } from "@saxonberg/server/mud/lib/activity/Engaged";
import type { AbortReason } from "@saxonberg/types";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import Gather, {
  GLASSWORK_TYPE,
  GLASSWORK_TOPIC,
  type WorkBand,
} from "../thing/Gather";

const SLOTS: readonly EngagementSlot[] = ["attention"];

/** Numeric pack-setting read with a seeded-literal fallback. */
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

/** One line per work band, coloured by the gather's own glow. */
function bandLine(band: WorkBand, kelvin: number): string {
  const glow = FireApi.incandescenceOf(kelvin);
  switch (band) {
    case "runs":
      return `The gather glows ${glow ?? "hot"} and runs like water.`;
    case "soft":
      return `The gather glows ${glow ?? "hot"} — still soft, still yours.`;
    case "stiffening":
      return `The gather is ${glow ?? "dull"} now, stiffening; work quickly.`;
    case "setting":
      return glow === null
        ? "The glow is going out of it; it is nearly set."
        : `It has dulled to ${glow}; it is nearly set.`;
  }
}

export interface HotWorkSpec {
  actor: Stuff & Engaged;
  pipe: Stuff;
  gather: Gather;
}

export class HotWorkWatch implements SustainedEngagement {
  engagementId = "";
  readonly type = GLASSWORK_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots: ReadonlySet<EngagementSlot> = new Set(SLOTS);
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set();
  readonly cancelable = true;
  readonly emissions: readonly ScheduledEmission[];

  private readonly pipe: Stuff;
  private readonly gather: Gather;
  private lastBand: WorkBand | null = null;

  constructor(spec: HotWorkSpec) {
    this.actor = spec.actor;
    this.pipe = spec.pipe;
    this.gather = spec.gather;
    const tickMs = dial("glass.hotwork.tickGameS", 45) * 1000;
    this.emissions = [
      {
        intervalMs: tickMs,
        event: () => {
          void this.tick();
        },
      },
    ];
  }

  onStart(): void {
    this.startedAt = Date.now();
  }

  // ⭐ Cancel stops the WATCHING, not the cooling — the lump stays on the
  // pipe. Nothing is lost here.
  onAbort(_reason: AbortReason): void {}

  /** The blowpipe: its destruction tears the watch down. */
  getHost(): Stuff | null {
    return this.pipe;
  }

  private async tick(): Promise<void> {
    if (this.gather.isDestroyed()) {
      SchedulerApi.complete(this);
      return;
    }
    if (!this.gather.isWorkable()) {
      await this.gather.loseToCullet(this.actor, "You dawdled.");
      SchedulerApi.complete(this);
      return;
    }
    const band = this.gather.workBand();
    if (band !== this.lastBand) {
      this.lastBand = band;
      if (MixinApi.isSensor(this.actor)) {
        MessageApi.scene(this.actor)
          .topic(GLASSWORK_TOPIC)
          .toSelf(Mml.compose`${bandLine(band, this.gather.getTemperature().rawValue())}`)
          .send();
      }
    }
  }
}
