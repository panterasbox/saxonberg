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
   * ⭐ The reach: the bound Shore's, else the covering Locality's — the
   * fallback that lets a locality that never mentioned fish have them.
   */
  protected async reachFor(giver: Stuff, shore: MqlOneResult | undefined): Promise<string | null> {
    const bound = shore?.stuff as unknown as { getReachRef?: () => string } | undefined;
    const fromShore = bound?.getReachRef?.() ?? '';
    if (fromShore) return fromShore;
    const room = this.roomOf(giver);
    if (room === null) return null;
    return (await this.waters()).reachAt(room);
  }

  protected async registry(): Promise<FisheryRegistry | null> {
    return (await this.waters()).registry();
  }

  protected decline(context: CommandContext, line: string, reason: string): void {
    this.refuse(context, FISHING_TOPIC, line, reason);
  }
}
