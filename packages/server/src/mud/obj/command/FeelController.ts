/**
 * FeelController — `feel` verb. Thin shim over
 * `SingleSenseControllerBase` pinning channel + topic.
 */

import { SingleSenseControllerBase } from './SingleSenseControllerBase';
import type { SenseChannel } from '../../lib/species/BodyPlan';

export class FeelController extends SingleSenseControllerBase {
  protected readonly senseChannel: SenseChannel = 'touch';
  protected readonly sceneTopic = 'world.perception.feel';
}
