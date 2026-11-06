/**
 * HarvestWordedController — ⭐⭐ the doctrine's exemplar (controllers-are-io
 * D14): **the same harvest in different words**. A wizard re-points the
 * `harvest` view's `controller:` here and every crop, grade, bed and duration
 * is exactly what `HarvestController` makes, because neither of them decides
 * any of it. Drive 16 proves it over the wire; this file exists so the proof
 * has something to run, and so an author has an example to copy.
 */

import { Mml } from '../../../../api/mml';
import type {
  HarvestBegin,
  HarvestDone,
  HarvestRefusal,
} from '../../../../lib/husbandry/Growing';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import HarvestController from './HarvestController';

type Composed = ReturnType<typeof Mml.compose>;

export default class HarvestWordedController extends HarvestController {
  static override refusalWords(r: HarvestRefusal): Composed {
    return Mml.compose`The harvest will not go that way (${r.reason}).`;
  }

  static override beginWords(f: HarvestBegin, giver: Stuff): { self: Composed; peers: Composed } {
    return {
      self: Mml.compose`You set to ${f.presentation}, working down the row.`,
      peers: Mml.compose`${Mml.actor(giver)} sets to ${f.presentation}.`,
    };
  }

  static override doneWords(f: HarvestDone, giver: Stuff): { self: Composed; peers: Composed } {
    const n = f.kind === 'swath' ? f.crops.length : f.kind === 'pick' ? f.count : 1;
    return {
      self: Mml.compose`The harvest comes in from ${f.presentation}: ${String(n)} to the good.`,
      peers: Mml.compose`${Mml.actor(giver)} brings in the harvest.`,
    };
  }
}
