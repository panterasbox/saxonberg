/**
 * Lantern — a lamp made of parts: a tin body, a glass pane seated in it,
 * and a wick that wears (assembly W6). Everything a {@link Lamp} is, and
 * an assembly: its light comes THROUGH its pane, so a cracked pane darkens
 * the room it lights, and fitting a new one brightens it again.
 *
 * ⭐ Its own class, not mixins on `Lamp`: a torch, a flare and a safety
 * lamp are lamps with no parts (`lint:bills` holds both directions).
 */

import Lamp from './Lamp';
import { DurableMixin } from '../../lib/material/Durable';
import { AssembledMixin } from '../../lib/craft/Assembled';
import { CraftedMixin } from '../../lib/craft/Crafted';
import { Quantity } from '../../lib/quantity';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';

/** Numeric AppSetting read with the seeded fallback. */
function lanternDial(key: string, fallback: number): number {
  try {
    const n = Number.parseFloat(AppApi.setting(key));
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

// Crafted: a fitted lantern is stamped like anything else made. Durable
// beneath Assembled: an assembly's wear has to have somewhere to go.
const LanternBase = AssembledMixin(CraftedMixin(DurableMixin(Lamp)));

export default class Lantern extends LanternBase {
  /**
   * ⭐ A lantern's light comes THROUGH its pane (assembly D8, AC 11): a
   * failed facing line — a cracked pane — lets out a fraction of it, and
   * the room it lights is darker for it. Replace the pane and the room
   * brightens.
   */
  public override getEmittedFlux(): Quantity<'lumen'> {
    const flux = super.getEmittedFlux();
    let factor = 1;
    for (const line of this.getParts()) {
      if (line.role !== 'facing' || line.failed <= 0) continue;
      factor *= lanternDial(AppSettingKeys.lampCrackedGlassFlux, 0.35);
    }
    return factor === 1 ? flux : Quantity.of(flux.rawValue() * factor, 'lumen');
  }
}
