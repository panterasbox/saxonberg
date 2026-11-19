/**
 * Charger — a powered surface you set a device on (aether-devices D6): it
 * draws grid power from its premises' meter and holds a thing on it.
 *
 * `put phone on charger` is the shipped `put` with the `on` placement; a
 * battery resting on anything that answers the kernel `Powered` shape
 * charges from it and never knows what kind of supply it is (the lounge's
 * runs on a mana line — arcana's `ManaCharger`).
 *
 * ⭐ It supplies only while it sits in a place: carried — in a hand, in a
 * bag — it answers 0 W, and `look` says it is not plugged in. Nobody is
 * billed for charging: metered billing is a deferred seam (energy.md), so
 * a charger works exactly while its supply is live.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { PlacingMixin } from '@saxonberg/server/mud/lib/spatial/Placing';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Piecewise } from '@saxonberg/server/mud/lib/Trajectory';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import { GridPoweredMixin } from '../lib/GridPowered';

const ChargerBase = GridPoweredMixin(PlacingMixin(Good));

export default class Charger extends ChargerBase {
  static markupAugmenters: MarkupAugmenter[] = [chargerStateAugmenter];

  public override isPowered(): boolean {
    return !this.isCarried() && super.isPowered();
  }

  public override availablePowerW(): number {
    return this.isCarried() ? 0 : super.availablePowerW();
  }

  public override poweredTrajectory(fromS: number, toS: number): Piecewise {
    if (!this.isCarried()) return super.poweredTrajectory(fromS, toS);
    const end = toS > fromS ? toS : fromS;
    return new Piecewise([{ fromS, toS: end, startValue: 0, target: 0, tau: 0 }]);
  }

  /** The line `look` adds: plugged in or not, and whether the supply is live. */
  public stateLine(): string {
    if (this.isCarried()) return 'It is not plugged in.';
    return this.isPowered() ? 'Its light glows: it has power.' : 'Its light is dark — no power reaches it.';
  }

  /** Is a body carrying it (at any depth)? Then it is not plugged in. */
  private isCarried(): boolean {
    let up: Stuff | null = this.getContainer();
    for (let i = 0; up !== null && i < 32; i++) {
      if (up.isAgent()) return true;
      up = MixinApi.isContainable(up) ? up.getContainer() : null;
    }
    return false;
  }
}

/** `look charger` — plugged in, and powered. */
function chargerStateAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!(host instanceof Charger)) return text;
  const line = host.stateLine();
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}
