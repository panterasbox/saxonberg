/** ScrapeController — `scrape [<patch>]`: clear the snow off the ice so it freezes black. */

import { IceActController } from '../../../lib/IceActController';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type IceSheet from '@saxonberg/content-water/src/thing/IceSheet';

export default class ScrapeController extends IceActController {
  protected capability(): string {
    return 'scraping';
  }
  protected perform(sheet: IceSheet, actor: Stuff, tool: Stuff, raw: string | null) {
    return sheet.scrapePatch(actor, tool, raw);
  }
  protected peersLine(actor: Stuff) {
    return Mml.compose`${Mml.actor(actor)} scrapes the snow off a patch of the ice.`;
  }
}
