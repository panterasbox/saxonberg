/**
 * IceHand — ⭐ the walk an ice hand makes between the bank and the ice,
 * shared by the crew's and the boss's brains (only ever inherited).
 *
 * The trade waited on the BANK until the ice would hold: the roster puts
 * a hand at the shore (its station), and the hand walks out only when the
 * ice is ready for it — the boss when the field bears its margin, the
 * crew once the boss's grid is down. One who is in the water anyway
 * hauls out (`stand`) where the ice bears them, or swims back to the bank
 * where it does not. Every step is a literal verb through `forceCommand`,
 * so a hand is subject to the rules a person is.
 *
 * ⚠ Found at the pre-merge sweep: stationed ON the mere, the crew came on
 * shift onto ice that would not hold it, went through, and stayed in the
 * water — the brains returned whenever the ice was not holding them, and
 * the ice refuses all work from the water. The crew never worked.
 *
 * config (both brains): `{ pool, shore, out, back }` — the mere's location
 * path, the bank's, and the ways between (`north` / `south` at Hollow
 * Mere). Content, so a second icehouse is rows.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';
import IceSheet from '@saxonberg/content-water/src/thing/IceSheet';

export default abstract class IceHand {
  /**
   * The sheet this hand stands ON, ready to work — or `null`, having taken
   * one step toward it (or back to the bank) this beat.
   */
  protected static async onTheIce(
    ctx: BrainContext,
    host: Stuff,
    ready: (sheet: IceSheet) => boolean,
  ): Promise<IceSheet | null> {
    const giver = host as unknown as CommandGiver;
    const here = IceHand.sheetUnder(host);
    if (here !== null) {
      if (here.supports(host)) return here;
      // In the water: out onto the ice if it bears you, else back to the bank.
      await giver.forceCommand(here.bears(here.supportLoadKgOf(host)) ? 'stand' : `swim ${IceHand.way(ctx, 'back', 'south')}`);
      return null;
    }
    const room = MixinApi.isContainable(host) ? host.getContainer() : null;
    const shore = String(ctx.config.shore ?? '');
    const pool = String(ctx.config.pool ?? '');
    if (room === null || !shore || !pool || room.getTemplatePath() !== shore) return null;
    const ice = IceHand.sheetOf(await StuffApi.singleton<Stuff>(pool));
    // ⚠ `go north`, never bare `north`: a bare direction is a PLAYER's
    // alias expansion, and a forced command has none (unknown-verb).
    if (ice !== null && ready(ice)) await giver.forceCommand(`go ${IceHand.way(ctx, 'out', 'north')}`);
    return null;
  }

  /**
   * ⭐ OFF shift and still out on the mere: back to the bank — walking if
   * the ice holds you, swimming if it does not (or is gone). The roster's
   * offstage teleport is the ordinary way home; this is the hand who was
   * left out there (the drive: the boss still on the summer water). True
   * when it took that step.
   */
  protected static async offTheIce(ctx: BrainContext, host: Stuff): Promise<boolean> {
    const room = MixinApi.isContainable(host) ? host.getContainer() : null;
    const pool = String(ctx.config.pool ?? '');
    if (room === null || !pool || room.getTemplatePath() !== pool) return false;
    const here = IceHand.sheetUnder(host);
    const back = IceHand.way(ctx, 'back', 'south');
    await (host as unknown as CommandGiver).forceCommand(here !== null && here.supports(host) ? `go ${back}` : `swim ${back}`);
    return true;
  }

  /** The ice sheet under a host, or `null` (not on a frozen pool). */
  protected static sheetUnder(host: Stuff): IceSheet | null {
    const room = MixinApi.isContainable(host) ? host.getContainer() : null;
    return room ? IceHand.sheetOf(room) : null;
  }

  private static sheetOf(place: Stuff): IceSheet | null {
    const floor = MixinApi.isAdornable(place) ? place.getFloor() : null;
    return floor instanceof IceSheet ? floor : null;
  }

  private static way(ctx: BrainContext, key: 'out' | 'back', fallback: string): string {
    const w = ctx.config[key];
    return typeof w === 'string' && w ? w : fallback;
  }
}
