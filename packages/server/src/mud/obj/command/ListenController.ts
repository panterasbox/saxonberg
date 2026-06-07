/**
 * ListenController — `listen` verb. Thin shim over
 * `SingleSenseControllerBase` pinning channel + topic. Note: the
 * channel is `'hearing'`, the verb is `listen` — verb is the action,
 * channel is the sense.
 */

import { SingleSenseControllerBase } from './SingleSenseControllerBase';
import type { SenseChannel } from '../../lib/description/Perceiver';

export class ListenController extends SingleSenseControllerBase {
  protected readonly senseChannel: SenseChannel = 'hearing';
  protected readonly sceneTopic = 'world.perception.listen';
}
