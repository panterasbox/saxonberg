/**
 * RemoveController — `remove <worn thing>`: the worn reading (over
 * {@link UnequipControllerBase}).
 */

import { UnequipControllerBase } from './UnequipControllerBase';

export default class RemoveController extends UnequipControllerBase {
  protected override heldSpeak(): boolean {
    return false;
  }
}
