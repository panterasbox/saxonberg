/**
 * SmellController — `smell` verb. Thin shim over
 * `SingleSenseControllerBase` pinning channel + topic.
 */

import { SingleSenseControllerBase } from './SingleSenseControllerBase';
import type { SenseChannel } from '../../lib/species/BodyPlan';

export class SmellController extends SingleSenseControllerBase {
  protected readonly senseChannel: SenseChannel = 'smell';
  protected readonly sceneTopic = 'world.perception.smell';
}
