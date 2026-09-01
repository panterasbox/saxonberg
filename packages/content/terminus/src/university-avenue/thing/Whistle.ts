/**
 * Whistle — a brass referee's pea whistle worn on a neck cord.
 *
 * Composition: `Audible` (the discrete-event sound emitter — one sharp
 * blast per `blow`), `Wearable` (it hangs on the neck slot), `Slottable`
 * (so it can be worn), `Detailed` (the cork pea inside — the honest cause
 * of the trill) over a `Thing` (brass, via `Tangible`).
 *
 * It carries the `blow` verb from its inventory bucket
 * (`commandContributions`) — the object-afforded-verb law: `blow` lights
 * up only where a whistle is in hand or worn. No mixin grants it.
 *
 * For Gus the blast is a fixed, clean ~110 dB flourish — no breath/skill
 * modulation (that's the banked player-whistle model). `Audible.emit`
 * resolves the whistle up to its enclosing room, so a carried whistle
 * propagates from the room, not the hand.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { AudibleMixin } from '@saxonberg/server/mud/lib/perception/Audible';
import { WearableMixin } from '@saxonberg/server/mud/lib/slot/Wearable';
import { SlottableMixin } from '@saxonberg/server/mud/lib/slot/Slottable';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const WhistleBase = AudibleMixin(
  WearableMixin(SlottableMixin(DetailedMixin(Thing))),
);

export default class Whistle extends WhistleBase {
  /**
   * `blow` lights up only while a whistle is carried or worn — the verb
   * is carried by the object, per the object-afforded-verb law.
   */
  static commandContributions: CommandContributions = {
    self: [],
    environment: ['world/terminus/university-avenue/cmd/blow.yaml'],
    peers: [],
  };
}
