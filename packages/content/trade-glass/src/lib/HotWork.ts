/**
 * HotWorkWatch — ⭐ the hot-work window (glass build D10). A sustained
 * engagement on the glassmaker's `attention`, hosted by the blowpipe,
 * that watches the gather cool. It invents NO timing machinery: the
 * gather's clock is the thermal substrate every object already runs
 * (`Gather` cools by Newton drift), and this reads it at the one moment
 * the activity framework already gives — a tick.
 *
 * Each tick narrates a GLOW-BAND crossing only (white-hot → yellow →
 * orange → "the glow is going"), so the player feels the window closing.
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
import type { EngagementSlot, Engaged } from "@saxonberg/server/mud/lib/activity/Engaged";
import type { AbortReason } from "@saxonberg/types";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import Gather, {
  GLASSWORK_TYPE,
  GLASSWORK_TOPIC,
  type GlowBand,
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

const BAND_LINE: Record<GlowBand, string> = {
  white: "The gather is white-hot and runs like water.",
  yellow: "The gather has gone yellow — still soft, still yours.",
  orange: "The gather is orange now, stiffening; work quickly.",
  going: "The glow is going out of it; it is nearly set.",
};

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
  private lastBand: GlowBand | null = null;

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
    const band = this.gather.glowBand();
    if (band !== this.lastBand) {
      this.lastBand = band;
      if (MixinApi.isSensor(this.actor)) {
        MessageApi.scene(this.actor)
          .topic(GLASSWORK_TOPIC)
          .toSelf(Mml.compose`${Mml.fromMarkup(BAND_LINE[band])}`)
          .send();
      }
    }
  }
}
