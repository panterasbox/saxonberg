/**
 * ListenController — `listen` verb.
 *
 * Bare form reads true field physics via `SoundModality.soundAt(loc)`
 * and renders the perceived sound with source attribution. Targeted
 * form (`listen <target>`) keeps the per-Detail `hearing` slot read
 * inherited from `SingleSenseControllerBase`.
 *
 * Note: the channel is `'hearing'`, the verb is `listen` — verb is
 * the action, channel is the sense.
 */

import { SingleSenseControllerBase } from './SingleSenseControllerBase';
import type { CommandContext } from '../../../../api/command';
import type { SenseChannel } from '../../../../lib/description/Perceiver';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { SoundModality } from '../../modalities/SoundModality';
import { Sound } from '../../../../lib/perception/Sound';
import { StuffApi } from '../../../../api/stuff';

export default class ListenController extends SingleSenseControllerBase {
  protected readonly senseChannel: SenseChannel = 'hearing';
  protected readonly sceneTopic = 'sense.survey';

  protected override senseLocation(context: CommandContext): void {
    const actor = context.commandGiver;
    const location = context.location;
    if (!location) return; // defensive: placeless avatars are blocked at inbound and Login carries no sense verbs, so location is present in practice; degrade to a quiet no-op otherwise
    const signal = SoundModality.soundAt(location);

    if (
      signal &&
      signal.amplitude.rawValue() >= Sound.DEFAULT_HEARING_THRESHOLD_DB
    ) {
      const body = renderListenProse(signal);
      MessageApi.scene(actor).topic(this.sceneTopic).toSelf(body).send();
      return;
    }
    super.senseLocation(context);
  }
}

function renderListenProse(signal: Sound): Mml {
  if (signal.sources.length === 0) {
    return Mml.compose`You hear ${signal.character || 'something'}.`;
  }
  const names = signal.sources
    .slice(0, 3)
    .map((s) => {
      if (s.character === 'ambient') return 'the ambient hum';
      const stuff = StuffApi.findById(s.stuffId);
      const name = stuff
        ? stuff.getPresentation()
        : s.character || 'something';
      return name;
    });
  const list = names.join(', ');
  if (signal.character) {
    return Mml.compose`You hear ${signal.character} — from ${list}.`;
  }
  return Mml.compose`You hear ${list}.`;
}
