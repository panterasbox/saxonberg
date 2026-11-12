/**
 * ScrapeController — `scrape [<patch>]`: clear the snow off the ice so it
 * freezes black. ⭐ The sheet decides (`IceSheet.scrapePlan` — its own
 * method, controller-liquidity D14); the words are this controller's (controllers-are-io D4).
 */

import { IceActController } from '../../../lib/IceActController';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { ActPlan } from '@saxonberg/server/mud/lib/craft/ActPlan';
import type IceSheet from '@saxonberg/content-water/src/thing/IceSheet';
import type { ScrapeDone, ScrapeRefusal } from '@saxonberg/content-water/src/thing/IceSheet';
import { Mml } from '@saxonberg/server/mud/api/mml';

export default class ScrapeController extends IceActController<'scrape'> {
  protected planOn(sheet: IceSheet, actor: Stuff, tool: Stuff, patch: string | null): ActPlan<undefined, ScrapeDone, ScrapeRefusal> {
    return sheet.scrapePlan(actor, tool, patch);
  }
  protected capability(): string {
    return 'scraping';
  }
  protected refusalWords(out: ScrapeRefusal): string {
    switch (out.reason) {
      case 'not-on-ice':
        return 'You cannot work the ice from the water.';
      case 'no-snowy-ice':
        return 'There is no snowy ice there to scrape.';
      case 'open':
        return 'That is open water.';
      case 'nothing-left':
        return 'There is nothing left there to scrape.';
      default: {
        const never: never = out;
        return never;
      }
    }
  }
  protected doneWords(facts: ScrapeDone): string {
    return `You scrape the snow off a patch of the ice, about ${Math.round(facts.areaM2)} square metres of it, down to the black.`;
  }
  protected peersLine(actor: Stuff) {
    return Mml.compose`${Mml.actor(actor)} scrapes the snow off a patch of the ice.`;
  }
}
