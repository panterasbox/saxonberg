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
 * All the clockwork lives on `MechanicalMovementMixin`; Watch adds the
 * two lid-aware overrides — `currentReading()` gates the movement
 * reading on the open lid, and `getLong()` renders the live dial (or the
 * shut case) — and **confers the two verbs.**
 *
 * ⚠⚠⚠ **It did not, and that sentence is the bug.** This docstring used
 * to end: *"the `wind`/`adjust` verbs are content verbs of this locality
 * bundle, gated on the presence of `MechanicalMovementMixin`, so Watch
 * contributes none."* Every clause of that is true except the
 * conclusion. It picks the right GATE and then forgets to pick a
 * CONFERRER — and since a verb reaches a player through
 * `commandContributions` and nothing else
 * (`command-routing.md:378-381`), the result was that `wind watch`
 * answered *"I don't understand 'wind'"* for the whole life of the
 * locality. ⭐ `CLAUDE.md` names the `blow`/`tally`/`wind`/`adjust`
 * bundle as THE exemplar for domain-local verbs, and half of it had
 * never run once. Its two siblings in this very directory get it right
 * (`Whistle.ts:36`, `CrossingLog.ts:41`).
 *
 * ⭐ The conferrer is this CLASS and not the mixin, deliberately. The
 * mixin is kernel substrate (`lib/time/MechanicalMovement.ts`) and these
 * views are the terminus locality's; `command-routing.md:418-424` is
 * explicit that each pack's classes name only its own views, so the
 * kernel can never name a trade's verb. The mixin keeps its
 * capability-gate role — the controllers' own `hasMixin` check is what
 * makes `wind clock` decline intelligibly while you are carrying a watch
 * — and the concrete timepiece in the pack that owns the verbs carries
 * the static. A future accurate/aether timepiece composes plain
 * `Timekeeping` and simply does not name these views.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { SealableMixin } from '@saxonberg/server/mud/lib/spatial/Sealable';
import { MechanicalMovementMixin } from '@saxonberg/server/mud/lib/time/MechanicalMovement';
import { Time } from '@saxonberg/server/mud/lib/time/Time';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const WatchBase = SealableMixin(
  MechanicalMovementMixin(Good),
);

/**
 * ⭐ This locality's two verbs, named once. `inventory` because the
 * watch is a thing you carry and wind in your hand; `environment`
 * because one lying on a table is still windable. Not `peers` — a
 * pocket watch is not something you stand beside.
 */
const TIMEPIECE = [
  'world/terminus/university-avenue/cmd/wind.yaml',
  'world/terminus/university-avenue/cmd/adjust.yaml',
];

export default class Watch extends WatchBase {
  /** ⭐ The instrument affords the verb — a static on the class. */
  static commandContributions: CommandContributions = {
    self: [],
    inventory: TIMEPIECE,
    environment: TIMEPIECE,
    peers: [],
  };

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
