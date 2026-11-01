/**
 * GrooveController — `groove [<patch>]`: cut a grid of grooves across the
 * ice, to be sawn into blocks (an ice plough GROOVED the ice). It was
 * `mark` until the tracts build gave that word to marking a field: rung 2
 * of the collision ladder — drawing a boundary on held ground is the
 * primitive other content extends, grooving ice is one trade's gesture
 * with a plain word of its own. (`score` was taken by the platform.)
 */

import { IceActController } from '../../../lib/IceActController';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type IceSheet from '@saxonberg/content-water/src/thing/IceSheet';

export default class GrooveController extends IceActController {
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
