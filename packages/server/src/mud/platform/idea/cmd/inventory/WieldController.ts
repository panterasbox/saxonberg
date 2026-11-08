/**
 * WieldController — `wield <wieldable>`: this goes IN HAND (over
 * {@link EquipControllerBase}).
 */

import { EquipControllerBase, type EquipMode } from './EquipControllerBase';

export default class WieldController extends EquipControllerBase {
  protected override mode(): EquipMode {
    return 'wield';
  }
}
