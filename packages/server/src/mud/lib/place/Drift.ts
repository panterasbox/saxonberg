/**
 * Drift — ⭐ **the one scheduled next event of a moving place** (river D6).
 *
 * A moving place does not tick. Whoever owns its frame works out the
 * earliest thing that will happen to it — the next stretch boundary, the
 * next place it reaches, a merge, the mouth — and the drift holds ONE
 * game-clock schedule for that moment. When it fires, the owner moves the
 * place, does whatever the moment is, and schedules the next.
 *
 * Game seconds, through `WorldClockApi.at` — never a Node timer — with the
 * place as the schedule's host, so a reaped place takes its schedule with
 * it. The callback runs in a fresh root frame, so a throw is caught and
 * logged here rather than lost.
 *
 * ⚠ Runtime only. A restart re-derives the next event from the place's
 * stored position; nothing about a drift is persisted.
 */

import { WorldClockApi, type ClockHandle } from '../../api/worldclock';
import { Quantity } from '../quantity';
import type { Stuff } from '../stuff/Stuff';

export class Drift {
  private handle: ClockHandle | null = null;

  constructor(
    private readonly place: Stuff,
    private readonly tag: string,
  ) {}

  /** When the next event is due, game-seconds, or `null`. */
  public dueAtS(): number | null {
    return this.handle?.nextFireAt?.rawValue() ?? null;
  }

  /** Replace whatever was scheduled with one event at `atS`. */
  public scheduleAt(atS: number, run: () => Promise<void>): void {
    this.cancel();
    if (!Number.isFinite(atS)) return;
    const now = WorldClockApi.getNow().rawValue();
    const at = Math.max(now + 0.5, atS);
    this.handle = WorldClockApi.at(
      Quantity.of(at, 's'),
      () => {
        this.handle = null;
        if (this.place.isDestroyed()) return;
        void run().catch((err) => {
          console.error(`Drift(${this.tag}): the event at ${Math.round(at)} s failed`, err);
        });
      },
      { host: this.place, tag: this.tag },
    );
  }

  public cancel(): void {
    this.handle?.cancel();
    this.handle = null;
  }
}
