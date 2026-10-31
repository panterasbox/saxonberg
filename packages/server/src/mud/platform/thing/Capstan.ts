/**
 * Capstan — ⭐ **the drum on a ship's deck you walk round to haul her**
 * (river D28): the third way off the ground, after the water rising and
 * lightening her.
 *
 * Kedging: her boat takes a kedge out a hail ahead and lets it go (a boat
 * held by its killick, `anchor`); back aboard, `pull capstan` walks the
 * line in and hauls her up to it. Each pull is a spell on the bars — the
 * pullers' hands for a few seconds — and moves her to the kedge; if the
 * water there is deeper than she draws, she floats.
 *
 * The capstan decides nothing about the river: her frame says where the
 * kedge is down, and she says whether she floats.
 */

import { PullableMixin, type PullOutcome, type PullSense } from '../../lib/spatial/Pullable';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';
import { NavigationApi } from '../../api/navigation';
import type { Stuff } from '../../lib/stuff/Stuff';
import Fitting from './Fitting';
import Ship from '../idea/Ship';

/** One spell on the capstan bars, real seconds. */
const SPELL_REAL_S = 4;

export default class Capstan extends PullableMixin(Fitting) {
  /** Walk the capstan round: haul her to the kedge, if one is down. */
  public override async pullBy(puller: Stuff, sense: PullSense | null): Promise<PullOutcome> {
    void sense;
    const room = MixinApi.isContainable(this) ? this.getContainer() : null;
    const path = room?.getDurableHandle() ?? room?.getTemplatePath() ?? '';
    const ship = path ? await NavigationApi.structureAt(path).catch(() => null) : null;
    if (!(ship instanceof Ship) || ship.getLine() === null) {
      return { ok: false, reason: 'no-ship', line: 'The capstan turns freely; there is nothing on it.' };
    }
    if (!ship.isAground()) {
      return { ok: false, reason: 'afloat', line: 'She is afloat. There is nothing to heave her off.' };
    }
    const live = await ship.liveFrame();
    const frame = live !== null && MixinApi.isLineFrame(live) ? live : null;
    const pos = ship.getLinePosition();
    const kedge = frame && pos ? frame.kedgeNear(pos) : null;
    if (frame === null || pos === null || kedge === null) {
      return {
        ok: false,
        reason: 'no-kedge',
        line: 'There is no kedge out to heave on. Take one out in her boat and let it go a hail off, then walk her up to it.',
      };
    }
    return {
      ok: true,
      self: Mml.compose`You ship the bars and put your weight on one, and the capstan begins to clank round.`,
      peers: Mml.compose`${Mml.actor(puller)} ships the bars and leans on the capstan.`,
      takes: {
        realS: SPELL_REAL_S,
        finish: async (): Promise<PullOutcome> => {
          ship.placeOnLine(ship.getLine(), { ...pos, km: kedge });
          const off = await ship.floatIfShePasses();
          return off
            ? { ok: true, self: Mml.compose`The line comes in, groaning, and she grinds forward — and lifts. She is afloat.` }
            : { ok: true, self: Mml.compose`The line comes in and she grinds up to the kedge, and stops. Still aground.` };
        },
      },
    };
  }
}
