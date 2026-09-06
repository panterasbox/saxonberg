/**
 * SoilKit — the tube-and-indicator kit that reads sourness, and ⭐ **the
 * instrument `measure acidity` was missing.**
 *
 * A verb affordance is a STATIC ON A CLASS, so a tool with no class of
 * its own affords nothing. The kit shipped as a bare `ToolItem` row
 * carrying `capabilities: ["soil-testing"]` — which is what the
 * controller checks — while nothing anywhere put the `measure` view in
 * front of a player, so the rung was unreachable. A live drive found it;
 * `MeasureAcidityController`'s own tests could not, because a controller
 * test calls the controller.
 *
 * ⭐⭐ **Sourness is the one soil property the eye cannot see**, which is
 * the whole reason this object exists rather than a look: a sour field
 * looks exactly like a sweet one, grows a visibly poor crop, and lime is
 * dear and entirely wasted on ground that did not need it. An instrument
 * you have to carry is the honest price of an invisible fact.
 *
 * The `SurveyInstrument` shape: the whole view on `environment` +
 * `peers`, and the channel's controller checks the capability.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

export default class SoilKit extends ToolItem {
  static commandContributions: CommandContributions = {
    self: [],
    peers: ['platform/cmd/perception/measure.yaml'],
    environment: ['platform/cmd/perception/measure.yaml'],
  };

  constructor() {
    super();
    this.capabilities = ['soil-testing'];
  }
}
