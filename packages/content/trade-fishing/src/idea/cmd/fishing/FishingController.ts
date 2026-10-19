/**
 * FishingController — what the trade's verbs share: which reach the
 * actor is at (a bound Shore, else the Locality's), the trade
 * singleton, the register, and the one refusal shape.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import Waters, { WATERS_PATH } from '../../Waters';
import type { FisheryRegistry } from '../../../lib/FisheryRead';
import { FISHING_TOPIC } from '../../../lib/FishingEngagement';

export { FISHING_TOPIC };

export abstract class FishingController<M extends CommandModel = CommandModel> extends CommandController<M> {
  protected async waters(): Promise<Waters> {
    return StuffApi.singleton<Waters>(WATERS_PATH);
  }

  /** The room the actor stands in, or `null`. */
  protected roomOf(giver: Stuff): Stuff | null {
    return MixinApi.isContainable(giver) ? giver.getContainer() : null;
  }

  /**
   * ⭐ The reach: the water the bound place names (maritime revision 3 —
   * the place is the shore, and it says which water you mean or why
   * none), else the covering Locality's — the fallback that lets a
   * locality that never mentioned fish have them. A refusal comes back
   * in the place's own words; the controller only renders it.
   */
  protected async reachFor(
    giver: Stuff,
    shore: MqlOneResult | undefined,
  ): Promise<{ reach: string } | { refusal: string; reason: string } | null> {
    const room = this.roomOf(giver);
    if (shore?.stuff) {
      const name = shore.via?.detailPath?.[0];
      if (MixinApi.isShore(shore.stuff)) {
        const pick = await shore.stuff.waterRefFor(name);
        if ('refusal' in pick) return pick;
        // ⭐ Frozen water is fished only through a hole (storage-and-ice
        // D15): THE gate is the shore's, shared with washing.
        const gate = shore.stuff.drawAt(pick.key, room ?? shore.stuff);
        if ('refusal' in gate && gate.refusal === 'frozen') {
          return { refusal: gate.line, reason: 'frozen' };
        }
        return { reach: pick.ref };
      }
      return { refusal: `There is no water in the ${shore.raw ?? 'that'}.`, reason: 'not-water' };
    }
    if (room === null) return null;
    const reach = await (await this.waters()).reachAt(room);
    return reach === null ? null : { reach };
  }

  protected async registry(): Promise<FisheryRegistry | null> {
    return (await this.waters()).registry();
  }

  protected decline(context: CommandContext, line: string, reason: string): void {
    this.refuse(context, FISHING_TOPIC, line, reason);
  }
}
