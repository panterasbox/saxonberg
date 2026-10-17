/** MarkController — `mark [<patch>]`: score a grid across the ice, to be cut into blocks. */

import { IceActController } from './IceActController';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type IceSheet from '@saxonberg/content-water/src/thing/IceSheet';

export default class MarkController extends IceActController {
  protected capability(): string {
    return 'marking';
  }
  protected perform(sheet: IceSheet, actor: Stuff, tool: Stuff, raw: string | null) {
    return sheet.markPatch(actor, tool, raw);
  }
  protected peersLine(actor: Stuff) {
    return Mml.compose`${Mml.actor(actor)} scores a grid across the ice.`;
  }
}
