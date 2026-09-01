/**
 * WinzeController — the shared vertical half of {@link DriveController}.
 *
 * A base class only (no YAML names it), holding the one thing `sink` and
 * `raise` add to a level heading: ⭐ **a winze is climbed, not walked**,
 * so the fresh exit pair admits the vertical medium. `climb` and
 * `ClimbableMixin` already ship — winzes need no new locomotion, only
 * the edge declaring what it is.
 */

import DriveController from './DriveController';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Cell } from '../../../location/Working';

/** The medium a vertical edge admits — `climb`'s own, off its shipped row. */
const VERTICAL = 'vertical';

export abstract class WinzeController extends DriveController {
  protected override async afterCut(
    room: Stuff,
    _cell: Cell,
    direction: string,
  ): Promise<void> {
    if (!MixinApi.isExitable(room)) return;
    const back = NavigationApi.invertDirection(direction);
    for (const [dir, exit] of room.getExits()) {
      if (dir !== back) continue;
      exit.setMedia([...new Set([...exit.getMedia(), VERTICAL])]);
      const other = exit.getDestination();
      if (other && MixinApi.isExitable(other)) {
        const inverse = other.getExit(direction);
        if (inverse) inverse.setMedia([...new Set([...inverse.getMedia(), VERTICAL])]);
      }
    }
  }
}
