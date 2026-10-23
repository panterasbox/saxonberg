/**
 * MovingMixin — ⭐⭐ **how a thing moves, separate from what it is** (river
 * D41, W9). A ship (a `Structure` of many rooms) and a moving place (one
 * room — water within hail, a stopped sea room, one day a floe or a fair)
 * both compose it: each holds a {@link Trajectory}, reads where it is and
 * what phase it is in off it, and tells whoever is aboard in chunks.
 *
 * - **The trajectory** is persisted iff somebody touched it (D43): a
 *   course a master set, an interference with the world's own motion. The
 *   world's own (a current, a migration, a seeded wanderer) is held at
 *   runtime and re-derived by whoever plans it.
 * - **The phase** is state (D40): the last phase mark the trajectory has
 *   passed — what a floe will bear, whether the fair is open.
 * - **Told in chunks, per viewer** (D42): what it tells is buffered for each
 *   recipient over a short real-time window and sent as one beat, so a fast
 *   run is not a line per boundary. Slow change is READ (`look`), and only
 *   a mark is pushed.
 * - **Marks on their own clock** ({@link followMarks}): an owner whose
 *   mover has no watch of its own — a timetable, a floe — lets the mixin
 *   fire each mark when it comes. A ship's watch reads its marks itself.
 *
 * Needs `PositionedMixin` beneath it.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Positioned } from './Positioned';
import type { LinePositionRecord } from './LineFrame';
import type { GeoPosition } from './GeoPosition';
import { Trajectory, type MarkRecord, type TrajectoryAt, type TrajectoryRecord } from './Trajectory';
import { Drift } from '../location/Drift';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { ScheduleApi } from '../../api/schedule';
import { WorldClockApi } from '../../api/worldclock';
import { AppApi } from '../../api/app';

/** How long a viewer's lines gather before they are sent as one beat, ms (real time). */
const DEFAULT_TELL_WINDOW_MS = 1500;

export interface Moving {
  /** The trajectory it is on, or `null` (at rest, nowhere to go). */
  getTrajectory(): Trajectory | null;
  /**
   * Put it on a trajectory. `touched` (D43): somebody chose this — it is
   * persisted with the mover; otherwise it is the world's own, held at
   * runtime and re-derived by its planner.
   */
  setTrajectory(t: Trajectory | null, touched?: boolean): void;
  isTrajectoryTouched(): boolean;
  /** Where its trajectory puts it at `tS`, or `null` with none. */
  trajectoryAt(tS: number): TrajectoryAt | null;
  /** ⭐ The phase it is in now (D40), or `null`. */
  currentPhase(): string | null;
  /** Who is aboard to be told. */
  audience(): Promise<Stuff[]>;
  /** ⭐ Tell whoever is aboard — buffered per viewer over the window, sent as one beat (D42). */
  tellAboard(text: string, topic?: string): Promise<void>;
  /** Fire each mark of the trajectory when it comes, on its own clock. */
  followMarks(): void;
  /** A mark has come. */
  onMark(mark: MarkRecord): Promise<void>;
}

interface Pending {
  who: Stuff;
  topic: string;
  lines: string[];
}

export function MovingMixin<TBase extends MixinConstructor<Stuff & Positioned>>(Base: TBase) {
  return class MovingMixin extends Base implements Moving {
    static _mixinName: string = 'MovingMixin';

    static fieldMeta: FieldMeta = {
      trajectory: { persistent: true },
    };

    /** A trajectory somebody chose (D43) — persisted; `null` otherwise. */
    protected trajectory: TrajectoryRecord | null = null;
    /** The world's own trajectory (runtime: re-derived by its planner). */
    private _derived: Trajectory | null = null;
    /** The clock that fires marks for {@link followMarks} (runtime). */
    private _markClock: Drift | null = null;
    /** Lines gathering per viewer (runtime). */
    private _tell = new Map<string, Pending>();
    private _tellArmed = false;

    getTrajectory(): Trajectory | null {
      return this._derived ?? (this.trajectory && Array.isArray(this.trajectory.legs) ? new Trajectory(this.trajectory) : null);
    }

    setTrajectory(t: Trajectory | null, touched = false): void {
      if (touched) {
        this.trajectory = t ? t.toJSON() : null;
        this._derived = null;
      } else {
        this.trajectory = null;
        this._derived = t;
      }
    }

    isTrajectoryTouched(): boolean {
      return this.trajectory !== null;
    }

    trajectoryAt(tS: number): TrajectoryAt | null {
      return this.getTrajectory()?.at(tS) ?? null;
    }

    /** ⭐ Moving, its position is read off its trajectory; at rest, what is stored. */
    getLinePosition(): LinePositionRecord | null {
      const at = this.trajectoryNow();
      return at === undefined ? super.getLinePosition() : at?.pos.frame === 'line' ? { ...at.pos.at } : null;
    }

    getExpansePosition(): GeoPosition | null {
      const at = this.trajectoryNow();
      return at === undefined ? super.getExpansePosition() : at?.pos.frame === 'chart' ? at.pos.at : null;
    }

    /**
     * ⭐ Placed somewhere is a fact that replaces where it was going: the
     * trajectory goes with the old position (its planner gives it a new one).
     * Not the hydration setters — loading what is stored never clears what
     * was persisted with it.
     */
    placeOnLine(line: string | null, value: LinePositionRecord | null): void {
      super.placeOnLine(line, value);
      this.setTrajectory(null);
    }

    /** Where the trajectory puts it now; `undefined` when it has none (read what is stored). */
    private trajectoryNow(): TrajectoryAt | null | undefined {
      const t = this.getTrajectory();
      if (t === null) return undefined;
      try {
        // A trajectory of marks only (she stops where she lies) puts it
        // nowhere new: read what is stored.
        return t.at(WorldClockApi.getNow().rawValue()) ?? undefined;
      } catch {
        return undefined;
      }
    }

    currentPhase(): string | null {
      let now = 0;
      try {
        now = WorldClockApi.getNow().rawValue();
      } catch {
        return null;
      }
      return this.getTrajectory()?.phaseAt(now) ?? null;
    }

    /**
     * Who is aboard to be told.
     * @hook A ship answers everyone in her rooms. Default: what is inside it.
     */
    async audience(): Promise<Stuff[]> {
      const self = this as unknown as Stuff;
      return MixinApi.isContainer(self) ? self.getContents() : [];
    }

    async tellAboard(text: string, topic = 'sense.surroundings'): Promise<void> {
      if (text.trim() === '') return;
      for (const who of await this.audience()) {
        if (!MixinApi.isSensor(who)) continue;
        const pending = this._tell.get(who.stuffId) ?? { who, topic, lines: [] };
        if (pending.lines[pending.lines.length - 1] !== text) pending.lines.push(text);
        this._tell.set(who.stuffId, pending);
      }
      if (this._tellArmed || this._tell.size === 0) return;
      this._tellArmed = true;
      ScheduleApi.schedule(tellWindowMs(), () => this.flushTold());
    }

    /** Send each viewer what gathered for them, as one beat. */
    private flushTold(): void {
      this._tellArmed = false;
      const batch = [...this._tell.values()];
      this._tell.clear();
      for (const p of batch) {
        if (p.who.isDestroyed()) continue;
        try {
          MessageApi.scene(p.who).topic(p.topic).toSelf(Mml.compose`${Mml.fromMarkup(p.lines.join(' '))}`).send();
        } catch {
          // decoration: an unreachable viewer misses a line
        }
      }
    }

    followMarks(): void {
      const t = this.getTrajectory();
      let now = 0;
      try {
        now = WorldClockApi.getNow().rawValue();
      } catch {
        return;
      }
      const next = t ? t.getMarks().find((m) => m.atS > now) ?? null : null;
      if (next === null) {
        this._markClock?.cancel();
        return;
      }
      this._markClock ??= new Drift(this as unknown as Stuff, `marks:${(this as unknown as Stuff).stuffId}`);
      const from = now;
      this._markClock.scheduleAt(next.atS, async () => {
        const traj = this.getTrajectory();
        const at = WorldClockApi.getNow().rawValue();
        for (const m of traj ? traj.marksBetween(from, at) : []) await this.onMark(m);
        this.followMarks();
      });
    }

    /**
     * A mark has come.
     * @hook Override to act on it (a stop, a boarding call). Default: tell its words.
     */
    async onMark(mark: MarkRecord): Promise<void> {
      if (mark.words) await this.tellAboard(mark.words);
    }
  };
}

function tellWindowMs(): number {
  try {
    const raw = AppApi.setting('moving.tellWindowMs');
    const n = Number(raw);
    return raw !== undefined && raw !== null && raw !== '' && Number.isFinite(n) && n >= 0 ? n : DEFAULT_TELL_WINDOW_MS;
  } catch {
    return DEFAULT_TELL_WINDOW_MS;
  }
}
