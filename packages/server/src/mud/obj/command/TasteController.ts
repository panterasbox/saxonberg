/**
 * TasteController — `taste` verb. Thin shim over
 * `SingleSenseControllerBase` pinning channel + topic.
 */

import { SingleSenseControllerBase } from './SingleSenseControllerBase';
import type { SenseChannel } from '../../lib/description/Perceiver';

export class TasteController extends SingleSenseControllerBase {
  protected readonly senseChannel: SenseChannel = 'taste';
  protected readonly sceneTopic = 'world.perception.taste';
}
