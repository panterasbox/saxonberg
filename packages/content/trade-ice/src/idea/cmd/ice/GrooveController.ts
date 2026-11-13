/**
 * GrooveController — `groove [<patch>]`: cut a grid of grooves across the
 * ice, to be sawn into blocks (an ice plough GROOVED the ice). It was
 * `mark` until the tracts build gave that word to marking a field: rung 2
 * of the collision ladder — drawing a boundary on held ground is the
 * primitive other content extends, grooving ice is one trade's gesture
 * with a plain word of its own. (`score` was taken by the platform.)
 *
 * ⭐ The sheet decides (`IceSheet.groovePlan` — its own method,
 * controller-liquidity D14); the words are this controller's (controllers-are-io D4).
 */

import { IceActController } from '../../../lib/IceActController';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { ActPlan } from '@saxonberg/server/mud/lib/craft/ActPlan';
import type IceSheet from '@saxonberg/content-water/src/thing/IceSheet';
import type { GrooveDone, GrooveRefusal } from '@saxonberg/content-water/src/thing/IceSheet';
import { Mml } from '@saxonberg/server/mud/api/mml';

export default class GrooveController extends IceActController<'groove'> {
  protected planOn(sheet: IceSheet, actor: Stuff, tool: Stuff, patch: string | null): ActPlan<undefined, GrooveDone, GrooveRefusal> {
    return sheet.groovePlan(actor, tool, patch);
  }
  protected capability(): string {
    return 'marking';
  }
  protected refusalWords(out: GrooveRefusal): string {
    switch (out.reason) {
      case 'not-on-ice':
        return 'You cannot work the ice from the water.';
      case 'no-horse':
        return 'An ice plough wants a horse in the traces, and there is none out here.';
      case 'no-clear-ice':
        return 'There is no clear ice there to mark.';
      case 'open':
        return 'That is open water.';
      default: {
        const never: never = out;
        return never;
      }
    }
  }
  protected doneWords(facts: GrooveDone): string {
    return `You score a grid across the ice, the lines ${facts.gridCm} centimetres apart.`;
  }
  protected peersLine(actor: Stuff) {
    return Mml.compose`${Mml.actor(actor)} scores a grid across the ice.`;
  }
}
