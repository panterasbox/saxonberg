/**
 * OnAirSign — the sign in a broadcast booth's window (stream arrival D19):
 * lit exactly while somebody in its place is on the air.
 *
 * `AdornmentMixin(LightSourceMixin(Thing))` — the `NeonSign` shape: a fixture
 * hung in a room's `adornments:`, whose light the room's propagation walk
 * reads. ⭐ What it does NOT have is a lit flag. *Lit* is DERIVED when it is
 * read: some body in the sign's own place (the room it hangs in) is a
 * broadcast host that `isOnAir()`. One followed reference — the sign → its
 * place → that place's contents — no world scan, no event from `rodney`, no
 * state to drift after a restart. Lit, it adds its authored flux to the
 * room's light and says so when you look at it; dark, it says that.
 *
 * ⚠ Lit by PRESENCE (the owner, 2026-11-23): a broadcaster who walks out on
 * air with their phone keeps broadcasting, and the window goes dark behind
 * them. Nothing records where a program was started.
 */

import Thing from '../../lib/stuff/Thing';
import { AdornmentMixin } from '../../lib/boundary/Adornment';
import { LightSourceMixin } from '../../lib/perception/LightSource';
import { MixinApi } from '../../api/mixin';
import { Quantity } from '../../lib/quantity';
import type { Stuff } from '../../lib/stuff/Stuff';

const OnAirSignBase = AdornmentMixin(LightSourceMixin(Thing));

export default class OnAirSign extends OnAirSignBase {
  /** Is somebody in the sign's place on the air right now? Derived, never stored. */
  public isLit(): boolean {
    const place = this.getAdornedTo() as Stuff | null;
    if (!place || !MixinApi.isContainer(place)) return false;
    for (const there of place.getContents()) {
      if (MixinApi.isBroadcastHost(there) && there.isOnAir()) return true;
    }
    return false;
  }

  /** Emits the authored flux only while lit; dark (0 lumens) otherwise. */
  override getEmittedFlux(): Quantity<'lumen'> {
    return this.isLit() ? super.getEmittedFlux() : Quantity.of(0, 'lumen');
  }

  /** The authored description, and whether it is lit — read now (what `look` reads). */
  override getLong(): string {
    const base = super.getLong();
    const state = this.isLit()
      ? 'It is LIT — somebody in here is on the air.'
      : 'It is dark — nobody in here is on the air.';
    return base ? `${base} ${state}` : state;
  }
}
