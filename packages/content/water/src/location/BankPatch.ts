/**
 * BankPatch — ⭐ **the bank between places, where you are walking it**
 * (river D25).
 *
 * Between a river's authored places the bank is the line's, as the water
 * is. Somebody who leaves a quay or a towpath along the river is in a bank
 * patch: one room for one party, on one bank, at a km, moved by their own
 * steps (`go upstream`, `go downstream` — a timed walk of a hundred metres
 * at a time). Reaching an authored bank place, they are handed into it; a
 * bank that turns to sheer rock refuses them.
 *
 * It is land, beside moving water: its way into the water (`river`) is the
 * water within hail there, and the water passing within hail of it is
 * wired to it — so the race to get ahead of somebody in the river is the
 * arithmetic of a runner against the current. Never persisted; gone when
 * empty; no map names it.
 */

import Location from '@saxonberg/server/mud/platform/location/Location';
import { WarrenMemberMixin } from '@saxonberg/server/mud/lib/location/WarrenMember';
import { ShoreMixin } from '@saxonberg/server/mud/lib/location/Shore';
import { PositionedMixin } from '@saxonberg/server/mud/lib/expanse/Positioned';
import { MovingPlaceMixin } from '@saxonberg/server/mud/lib/location/MovingPlace';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type WatercourseCatalogue from '../idea/WatercourseCatalogue';

const CATALOGUE_PATH = '/system/water/idea/WatercourseCatalogue';

export default class BankPatch extends MovingPlaceMixin(
  ShoreMixin(PositionedMixin(WarrenMemberMixin(Location))),
) {
  /** A bank does not drift: it moves only as its walkers walk. */
  public override isUnderWay(): boolean {
    return false;
  }

  /** Gone when nobody is on it: nothing durable to name. */
  public override getDurableHandle(): string | null {
    return null;
  }

  public override getLong(): string {
    const pos = this.getLinePosition();
    const cat = StuffApi.findByTemplatePath<WatercourseCatalogue>(CATALOGUE_PATH);
    const s = pos ? cat?.lineOfSync(pos.course)?.stretchAt(pos.km) ?? null : null;
    if (!s || !pos) return 'The bank of the river.';
    const width = cat?.lineOfSync(pos.course)?.authoredWidthAt(pos.km) ?? 10;
    const side = pos.across < width * s.channelAcross ? 'left' : 'right';
    const bank = s.banks[side];
    const ground =
      bank.kind === 'bar' ? 'You are on a gravel bar, the water shelving away beside you.'
        : bank.kind === 'shelving' ? 'You are on a low bank of gravel and grass, the water close beside you.'
          : bank.wooded ? 'You are on a steep bank among the trees, roots underfoot and the water below.'
            : 'You are on a steep bank above the water.';
    return `${ground} The river goes by: ${RIVER_WORDS[s.kind] ?? 'running on'}.`;
  }
}

const RIVER_WORDS: Record<string, string> = {
  pool: 'a long, slow pool',
  run: 'a smooth, steady run',
  riffle: 'a shallow riffle, breaking over gravel',
  rapid: 'white water among the rocks',
  falls: 'the falls',
  gorge: 'a gorge',
};
