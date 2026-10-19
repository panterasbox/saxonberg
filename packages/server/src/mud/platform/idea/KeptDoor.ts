/**
 * KeptDoor — ⭐ **a door with somebody on it** (cleanliness D29): an `Exit`
 * whose crossing asks the man keeping it. The `FordExit`/`AshoreExit`
 * precedent of a mover-reading async `canTraverse`, with the judgment on a
 * BRAIN rather than in this file:
 *
 * - it finds, on EITHER side, an occupant with a door-judging brain;
 * - it asks that brain's `judge(host, mover, config, door)` — the keeper
 *   decides he is on duty only when ON SHIFT for the house this row names
 *   (`keptBy`): the answer is a SEAT, never presence;
 * - a refusal is the keeper's own words (the `veto` gate); nobody on duty
 *   ⇒ the door is simply a door.
 *
 * ⛔ No `canEnter` on the room (the room would then need the brain's
 * config), no gauge, no wizard check. The exit asking the person is the
 * honest shape.
 */

import Exit, { type TraversalGuard } from '../../lib/boundary/Exit';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import type { BrainStatics } from '../../lib/behavior/brain';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';

const BRAIN_EXPORT = 'brain';

export default class KeptDoor extends Exit {
  static fieldMeta: FieldMeta = {
    ...Exit.fieldMeta,
    keptBy: { persistent: true, authorable: true },
  };

  /** The Business whose on-shift doorman keeps this door. */
  public keptBy = '';

  public getKeptBy(): string {
    return this.keptBy;
  }
  public setKeptBy(value: string): void {
    this.keptBy = value;
  }

  public override async canTraverse(
    mover: Stuff & Containable,
    mode?: string,
  ): Promise<TraversalGuard> {
    const base = await super.canTraverse(mover, mode);
    if (!base.ok) return base;
    const keeper = this.keeper(mover);
    if (keeper === null) return base;
    const verdict = keeper.judge.judge!(keeper.host, mover, keeper.config, this);
    if (verdict.admit) return base;
    return { ok: false, gate: 'veto', reason: `${keeper.host.getPresentation()} says, "${verdict.reason}"` };
  }

  /** A keeper on either side — his judging brain and its config. */
  private keeper(
    mover: Stuff,
  ): { host: Stuff; judge: BrainStatics; config: Record<string, unknown> } | null {
    if (this.keptBy === '') return null;
    const sides: (Stuff & Container)[] = [this.getSource()];
    try {
      sides.push(this.getDestination());
    } catch {
      // A deferred far side not yet resolved: judge from this side.
    }
    for (const room of sides) {
      for (const occ of room.getContents()) {
        const host = occ as unknown as Stuff;
        if (host === mover || !MixinApi.isBehaved(host)) continue;
        for (const spec of host.getBehaviors()) {
          const statics = StuffApi.resolveExportSync(spec.brain, BRAIN_EXPORT) as
            | BrainStatics
            | null;
          if (statics?.judge) return { host, judge: statics, config: spec.config ?? {} };
        }
      }
    }
    return null;
  }
}
