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

import Thing from '../lib/stuff/Thing';
import { AudibleMixin } from '../lib/perception/Audible';
import { WearableMixin } from '../lib/slot/Wearable';
import { SlottableMixin } from '../lib/slot/Slottable';
import { DetailedMixin } from '../lib/description/Detailed';
import type { CommandContributions } from '../api/command';

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
    inventory: ['device/blow.yaml'],
    environment: [],
    peers: [],
  };
}
