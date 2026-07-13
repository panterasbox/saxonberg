/**
 * `crossing-ritual` brain — Gus's dedicated crossing ceremony, fired on
 * the `arrival` witness (the south-side entry out of the terminal into
 * the crossing). It carries the two load-bearing rules from the
 * character sheet's *The movements*:
 *
 *   1. **Tally is a DEED, decoupled from the performance.** On the
 *      witnessed arrival itself, the brain IMMEDIATELY (synchronously, in
 *      `act`) reads Gus's own drifting `Watch` and appends one mark to his
 *      `CrossingLog` — BEFORE anything is scheduled. An aborted or
 *      never-run performance still keeps the count: N witnessed arrivals =
 *      N marks, no matter what the theater does.
 *
 *   2. **The busy-hub batch.** Because real players pour out of the
 *      terminal at once and one Gus has one voice/attention slot, the
 *      *performance* is coalesced: the first arrival of a burst schedules
 *      it after a short window; simultaneous/near-simultaneous arrivals
 *      inside that window join the batch (they still each tally) and the
 *      one performance speaks the batch line ("the lot of you — mind the
 *      curb"). N arrivals → N marks, 1 performance.
 *
 * **The performance** is a short scheduled sequence over the shipped
 * `ScheduleApi.schedule` one-shot timer substrate (there is no
 * `ScheduledEmission` type in the tree; staggered `ScheduleApi.schedule`
 * beats ARE the sequence mechanism, each wrapped in a fresh `runRoot`).
 * The whistle blast calls the carried `Whistle`'s `AudibleMixin.emit`
 * DIRECTLY — a discrete cross-room sound heard from the adjacent
 * arrival-gate, not a say/emote. The paddle-raise, the calls, and the
 * escort ride the standard `ctx.emoteFree` / `ctx.say` helpers, so they
 * flow through `Vocal.say` / `Soul` — and are therefore automatically
 * reactable (both call `ReactionApi.noteReactableAct`). The brain
 * `claims` `voice`+`attention`, so the `idles` speech brain
 * (`requiresFree: voice/attention`) falls quiet while the ceremony runs.
 *
 * Departures are NOT this brain — a courteous see-off rides the plain
 * `greets` brain (no log access), so leaving structurally never tallies.
 *
 * Stateless per-interactor by construction: it fires fresh on every
 * arrival and records only *when*, never *who* (the `CrossingLog`
 * discards identity). See docs/staging/eternal-university/npcs/crossing-guard.md.
 */

import type { Stuff } from '../stuff/Stuff';
import type { EngagementSlot } from '../activity/Engaged';
import type { Container } from '../spatial/Container';
import type { Time } from '../time/Time';
import { MixinApi } from '../../api/mixin';
import { ScheduleApi, type ScheduleHandle } from '../../api/schedule';
import type { AudibleEmitOptions } from '../perception/Audible';
import type { BrainContext, BrainStatics } from './brain';

/**
 * The `CrossingLog` mark surface, duck-typed by its method contract (the
 * inter-stuff rule: methods are the contract). Duck-typing keeps the
 * per-fire brain re-resolve (HMR) robust against a stale class reference.
 */
interface MarkableLog {
  addMark(reading: number | null): void;
}

/** Per-(host, spec) coalescing scratch the framework owns (not persisted). */
interface RitualState {
  /** Arrivals accumulated since the current window opened. */
  pending?: number;
  /** The scheduled trailing-edge performance, if a window is open. */
  batchHandle?: ScheduleHandle;
}

/** Optional prose overrides; each has a sensible default. */
interface RitualConfig {
  soloHeadline?: string;
  batchHeadline?: string;
  paddleEmote?: string;
  escortEmote?: string;
  whistle?: Partial<AudibleEmitOptions>;
}

/** Coalescing window: arrivals within this of the first join the batch (ms). */
const BATCH_WINDOW_MS = 250;
/** Performance beat offsets from the window close (ms). */
const BEAT = {
  whistle: 0,
  paddle: 500,
  headline: 1100,
  escort: 2100,
} as const;

const DEFAULTS = {
  soloHeadline:
    'Hold it right there— and clear. C\'mon across, mind the curb.',
  batchHeadline:
    'Alright, alright — the lot of you — both ways now — mind the curb.',
  paddleEmote:
    'raises the STOP paddle and gravely checks both ways down the empty avenue.',
  escortEmote:
    'walks you across, a hand hovering at the ready, then steps back to his post.',
} as const;

const WHISTLE_BLAST: AudibleEmitOptions = {
  db: 110,
  character: 'whistle',
  description: 'a sharp whistle',
  timbreHook: 'rough trill',
};

function isMarkableLog(x: Stuff): x is Stuff & MarkableLog {
  return (
    typeof (x as unknown as Partial<MarkableLog>).addMark === 'function'
  );
}

export const brain = class CrossingRitual {
  static label = 'crossing-ritual';
  // The ceremony owns Gus's voice + attention; idle chatter yields to it.
  static claims: readonly EngagementSlot[] = ['voice', 'attention'];

  static act(ctx: BrainContext): void {
    // ── Rule 1: the tally is a DEED. Fire it synchronously, first, so an
    // aborted or never-run performance never loses the count. ──
    CrossingRitual.tally(ctx.host);

    // ── Rule 2: coalesce the performance. The first arrival of a burst
    // opens a short window and schedules the one performance; arrivals
    // inside the window join the batch (already tallied above). ──
    const state = ctx.state as RitualState;
    state.pending = (state.pending ?? 0) + 1;
    if (state.batchHandle) return;
    state.batchHandle = ScheduleApi.schedule(BATCH_WINDOW_MS, () => {
      const count = state.pending ?? 1;
      state.pending = 0;
      state.batchHandle = undefined;
      CrossingRitual.perform(ctx, count);
    });
  }

  /**
   * Read Gus's own carried timepiece (the drifting `Watch`, may read
   * null when its lid is shut) and append one mark to his carried
   * `CrossingLog`. Identity is never read and never stored — when, never
   * who. A no-op if he isn't carrying a log.
   */
  private static tally(host: Stuff): void {
    if (!MixinApi.isContainer(host)) return;
    const contents = (host as Stuff & Container).getContents();
    const log = contents.find((c) => isMarkableLog(c as Stuff)) as
      | (Stuff & MarkableLog)
      | undefined;
    if (!log) return;
    const reading = CrossingRitual.readWatch(contents);
    log.addMark(reading === null ? null : reading.minutes);
  }

  /** First readable timepiece reading among the marker's own gear (or null). */
  private static readWatch(contents: readonly Stuff[]): Time | null {
    for (const item of contents) {
      if (MixinApi.isTimekeeping(item as Stuff)) {
        return (item as Stuff & { currentReading(): Time | null }).currentReading();
      }
    }
    return null;
  }

  /**
   * The one (possibly batched) performance: whistle blast (direct
   * cross-room Audible emit) → paddle raise → the call → the escort, over
   * staggered one-shot timers. `count > 1` speaks the batch line.
   */
  private static perform(ctx: BrainContext, count: number): void {
    const cfg = (ctx.config ?? {}) as RitualConfig;
    const host = ctx.host;
    const headline =
      count > 1
        ? cfg.batchHeadline ?? DEFAULTS.batchHeadline
        : cfg.soloHeadline ?? DEFAULTS.soloHeadline;

    // Beat 0: the whistle — heard cross-room, from the room not the hand.
    ScheduleApi.schedule(BEAT.whistle, () => CrossingRitual.blow(host, cfg));
    // Beat 1: raise the paddle, check both ways.
    ScheduleApi.schedule(BEAT.paddle, () =>
      ctx.emoteFree(cfg.paddleEmote ?? DEFAULTS.paddleEmote),
    );
    // Beat 2: the call (reactable via Vocal.say → noteReactableAct).
    ScheduleApi.schedule(BEAT.headline, () => ctx.say(headline));
    // Beat 3: the escort across.
    ScheduleApi.schedule(BEAT.escort, () =>
      ctx.emoteFree(cfg.escortEmote ?? DEFAULTS.escortEmote),
    );
  }

  /** Resolve the carried whistle and call `AudibleMixin.emit` directly. */
  private static blow(host: Stuff, cfg: RitualConfig): void {
    if (!MixinApi.isContainer(host)) return;
    for (const item of (host as Stuff & Container).getContents()) {
      const s = item as Stuff;
      if (MixinApi.isAudible(s)) {
        s.emit({ ...WHISTLE_BLAST, ...(cfg.whistle ?? {}) });
        return;
      }
    }
  }
} satisfies BrainStatics;
