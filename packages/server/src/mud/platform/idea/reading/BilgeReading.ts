/**
 * BilgeReading — `measure bilge`: sounding a ship's well with a rod
 * (harbors P19, B4).
 *
 * ⭐ How a hull's neglect is SEEN: the rod goes down the well, comes up
 * wet to a mark, and a second sounding after an hour says whether she is
 * gaining. The figure is her bilge (`Ship.bilgeState`), reconciled now —
 * the leak her shell's band lets in, integrated since it was last read.
 *
 * ⭐ Competence buys DETAIL, never access (the instrumentation rule), read
 * from `seamanship`: everybody hears how deep it is and whether it is
 * rising; a novice how fast; a competent hand the height on the rod,
 * bracketed; an expert whether one pump at the brake would gain on it.
 * No eye rung — you cannot see down a bilge well.
 *
 * Sounding her is seamanship too (P24): a ship is kept afloat by somebody
 * who sounds her well every watch.
 */

import Reading from '../../../lib/instrument/Reading';
import type { Tooled } from '../../../lib/craft/Tooled';
import { CompetenceBand, type CompetenceBandName } from '../../../lib/advancement/CompetenceBand';
import type { CommandContext } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type Place from '../../../lib/stuff/Place';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import { Quantity } from '../../../lib/quantity';
import Ship from '../Ship';

export default class BilgeReading extends Reading {
  protected override async measure(
    context: CommandContext,
    _target: Stuff | null,
    _instrument: Stuff & Tooled,
    band: CompetenceBandName,
    param: string,
  ): Promise<void> {
    const giver = this.actorOf(context);
    const ship = await this.shipUnder(giver);
    if (ship === null) {
      this.decline(context, Mml.compose`There is no bilge under you to sound — you are aboard nothing.`, 'no-ship');
      return;
    }
    const words = await ship.bilgeWords(band);
    let body = Mml.compose`${words}`;
    if (CompetenceBand.rank(band) >= CompetenceBand.rank('competent')) {
      const st = await ship.bilgeState();
      // ⚠ Hoisted: the bracketing call's neighbours are read as a channel.
      const height = Quantity.of(st.heightM, 'm');
      const seed = this.seedFor(giver, null, param);
      const shown = this.bracketed(height, band, seed, 'spatial');
      body = Mml.compose`${body} The rod comes up wet to ${shown}.`;
    }
    this.report(context, Mml.compose`${body}\n`);
    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({ discipline: 'seamanship', difficulty: 'easy', outcome: 'success' });
    }
  }

  public override async truth(target: Stuff | null): Promise<number | null> {
    if (!target) return null;
    const ship = await this.shipUnder(target);
    return ship === null ? null : (await ship.bilgeState()).heightM;
  }

  /** The ship whose room `who` stands in, or `null`. */
  private async shipUnder(who: Stuff): Promise<Ship | null> {
    const room = this.placeOf(who);
    if (room === null) return null;
    // The room is asked: its warren's ship, else its attachment.
    if (!room.isPlace()) return null;
    const s = await (room as unknown as Place).structure().catch(() => null);
    return s instanceof Ship ? s : null;
  }
}
