/**
 * `reads-air` brain (`/trade/mining/behavior/reads-air`) — **the canary,
 * and the canary is an INSTRUMENT that happens to be alive.**
 *
 * ⭐⭐ The bird's behaviour IS the reading. It sings in good air, goes
 * quiet as it thins, stops entirely before a person feels anything, and
 * dies. Nothing about that is decoration: it is the **only free reading
 * of the one lethal hazard in this build**, and it is free precisely so
 * that dying underground is always a choice a player made rather than
 * something that happened to them.
 *
 * ⭐ **It is not redundant with a nose.** Stinkdamp reeks and a nose
 * catches it; **blackdamp is odourless**, and that is the historical
 * reason for the bird — the two senses cover different gases, and the
 * mine authors them distinctly so neither is a spare.
 *
 * ⚠ The bird's DEATH is not scripted here. It breathes the same
 * atmosphere everybody else does, through the shipped respiration
 * driver; it succumbs first because its species row says its blood
 * oxygen has a much higher survivable floor than a person's. The
 * mechanism is a number in content, not a special case in code — which
 * is why a second mine can use a different animal by writing a different
 * row.
 *
 * config: `{}` — the bird reads the room it is in and nothing else.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';

/** The bands the bird's behaviour reports, worst first. */
const BANDS: ReadonlyArray<{ below: number; line: string }> = [
  { below: 0.15, line: 'is a small still heap on the floor of its cage.' },
  { below: 0.35, line: 'has stopped moving. It sits low, beak open, and makes no sound at all.' },
  { below: 0.55, line: 'has gone quiet. It shuffles along its perch and will not sing.' },
  { below: 0.8, line: 'sings in short bursts, then stops to breathe.' },
  { below: 1.01, line: 'sings, steady and bright, and turns its head at nothing.' },
];

export const brain = class {
  static label = 'reads-air';
  // The reading is load-bearing, not chatter: it must run whether or not
  // somebody happens to be watching, so the bird is already quiet when
  // you walk in on it.
  static presenceGated = false;
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const bird = ctx.host as Stuff;
    if (!MixinApi.isContainable(bird)) return;
    const room = bird.getContainer();
    if (!room) return;
    const working = room as unknown as { airAt?(): Promise<number> };
    if (typeof working.airAt !== 'function') return;

    const air = await working.airAt();
    const band = BANDS.find((b) => air < b.below) ?? BANDS[BANDS.length - 1]!;
    MessageApi.scene(bird)
      .topic('sense.ambient')
      .toPeers(Mml.compose`${Mml.thing(bird)} ${band.line}`)
      .send();
  }
};
