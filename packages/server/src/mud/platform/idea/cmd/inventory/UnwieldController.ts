/**
 * UnwieldController — `unwield <held thing>`: the held reading (over
 * {@link UnequipControllerBase}).
 */

import { UnequipControllerBase } from './UnequipControllerBase';

export default class UnwieldController extends UnequipControllerBase {
  protected override heldSpeak(): boolean {
    return true;
  }
}
