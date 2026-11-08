/**
 * WearController — `wear <wearable>`: this goes ON (over
 * {@link EquipControllerBase}).
 */

import { EquipControllerBase, type EquipMode } from './EquipControllerBase';

export default class WearController extends EquipControllerBase {
  protected override mode(): EquipMode {
    return 'wear';
  }
}
