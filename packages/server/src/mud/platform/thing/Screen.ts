/**
 * Screen — a wall-mounted display: `DisplayMixin` on a self-seating
 * `Fixture` Thing, not portable. A wall TV is a row over this with
 * `pairing: remote`, `remote: <the remote's row>` and no `shows` (all
 * three kinds)
 * (no row ships yet — the lounge's themed booths are its first home). Pairing is the screen's field, never the remote's — a `Remote`
 * is a plain thing you carry.
 */

import Thing from '../../lib/stuff/Thing';
import { DetailedMixin } from '../../lib/description/Detailed';
import { FixtureMixin } from '../../lib/stuff/Fixture';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { DisplayMixin } from '../../lib/display/Display';
import type { VetoResult } from '../../lib/errors';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import Location from '../../lib/stuff/Location';

const ScreenBase = DisplayMixin(
  PostRegistrationMixin(FixtureMixin(DetailedMixin(Thing))),
);

export default class Screen extends ScreenBase {
  /** Seat into the declared `seatIn` target, if any. */
  public override async postRegister(_context?: unknown): Promise<void> {
    await this.seatSelf();
  }

  /** A mounted screen is not carried off: it moves into a room, never a hand. */
  canMove(to: (Stuff & Container) | null): VetoResult {
    if (to === null || to instanceof Location) return { ok: true };
    return { ok: false, reason: 'mounted' };
  }
}
