/**
 * Watch — a brass hunter-cased pocket watch that keeps game-time and
 * *drifts*, because nobody ever sets it right.
 *
 * A thin composition: `Sealable` (the hunter lid — shut → the dial is
 * hidden → `currentReading()` is null), `MechanicalMovement` (the
 * windable, drifting clockwork — mainspring `Reserve`, set-point, drift
 * `rate`; folds in `Timekeeping` + `Reserved`), and `Detailed` (the
 * engraving) over a `Thing` (brass, via `Tangible`).
 *
 * All the clockwork now lives on `MechanicalMovementMixin` (a
 * locality-content mixin, not engine substrate — the only realistic
 * mechanical timepiece is this antique); Watch only adds the two
 * lid-aware overrides — `currentReading()` gates the movement reading on
 * the open lid, and `getLong()` renders the live dial (or the shut case).
 * The `wind`/`adjust` verbs are content verbs of this locality bundle,
 * gated on the presence of `MechanicalMovementMixin`, so Watch
 * contributes none — a future accurate/aether timepiece composes plain
 * `Timekeeping` (the general read seam that stays in `lib/time`) and
 * simply doesn't afford the mechanical verbs.
 */

import Thing from '../../../lib/stuff/Thing';
import { SealableMixin } from '../../../lib/spatial/Sealable';
import { MechanicalMovementMixin } from '../../../lib/time/MechanicalMovement';
import { DetailedMixin } from '../../../lib/description/Detailed';
import { Time } from '../../../lib/time/Time';

const WatchBase = SealableMixin(
  MechanicalMovementMixin(DetailedMixin(Thing)),
);

export default class Watch extends WatchBase {
  /**
   * The face reading. Lid shut → null (hidden dial). Otherwise defer to
   * the mechanical movement's drift reading.
   */
  override currentReading(): Time | null {
    if (!this.isOpen()) return null;
    return super.currentReading();
  }

  /**
   * Dynamic long description — recomputed each look (`getMarkupLong`
   * calls `getLong` afresh). Lid shut → shows the closed case; open →
   * the static engraving prose plus the live reading.
   */
  override getLong(): string {
    const reading = this.currentReading();
    const base = super.getLong();
    if (reading === null) {
      return `${base} The hunter lid is shut, hiding the dial.`;
    }
    return `${base} The dial reads ${reading.format()}.`;
  }
}
