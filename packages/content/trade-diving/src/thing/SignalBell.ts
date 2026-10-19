/**
 * SignalBell — ⭐ **a bell you strike under the water** (underwater C5): a
 * diver's way to be heard below where no voice carries. Water carries the
 * note further than air and from no direction you can place (the medium's
 * own sound), so every diver in the column hears it and none can tell
 * where it came from.
 */

import Good from '@saxonberg/server/mud/platform/thing/Good';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';

/** A struck bell carries like a shout, and further in water. */
const BELL_DB = 95;

export default class SignalBell extends Good {
  static commandContributions: CommandContributions = {
    self: [],
    environment: ['trade/diving/cmd/diving/ring.yaml'],
    peers: [],
  };

  /** ⭐ Strike it: a hearing event from where the striker is. */
  public ring(by: Stuff): void {
    MessageApi.scene(by)
      .topic('act.deed')
      .modality('hearing')
      .meta({ acousticDb: BELL_DB })
      .toSelf(Mml.compose`You strike ${Mml.thing(this as unknown as Stuff)}; the note goes out through the water.`)
      .toPeers(Mml.compose`A bell rings out, clear and close, from nowhere you can place.`)
      .send();
  }
}
