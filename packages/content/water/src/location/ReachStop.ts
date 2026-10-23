/**
 * ReachStop — ⭐ **a place on a river that stopped** (river D5): a gravel
 * bar you climbed out onto, an eddy you are resting in, the bed under a
 * pool where a dropped sword lies, the strainer that holds a body.
 *
 * Stopping between authored places is landing, and a stop is the patch
 * that has stopped: one room at a fixed km and bank, kept while anything
 * is in it, gone when empty. It persists by `(row, key)` — the key is its
 * position — so a canoe beached on a bar, or a sword on the bed, is there
 * after a restart, once.
 */

import { MovingWaterMixin } from '@saxonberg/server/mud/lib/location/MovingWater';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import Location from '@saxonberg/server/mud/platform/location/Location';
import { WarrenMemberMixin } from '@saxonberg/server/mud/lib/location/WarrenMember';
import { ShoreMixin } from '@saxonberg/server/mud/lib/location/Shore';
import { SwimmableMixin } from '@saxonberg/server/mud/lib/locomotion/Swimmable';
import { WaterPlaceMixin } from '@saxonberg/server/mud/lib/location/WaterPlace';
import { PositionedMixin } from '@saxonberg/server/mud/lib/expanse/Positioned';
import { MovingMixin } from '@saxonberg/server/mud/lib/expanse/Moving';
import { MovingPlaceMixin } from '@saxonberg/server/mud/lib/location/MovingPlace';
import type { ColumnBand } from '@saxonberg/server/mud/lib/location/WaterColumn';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { RiverWaterMixin } from '../lib/RiverWater';
import type WatercourseCatalogue from '../idea/WatercourseCatalogue';
import type ReachWarren from '../idea/ReachWarren';

const CATALOGUE_PATH = '/system/water/idea/WatercourseCatalogue';
const WARREN_PATH = '/system/water/idea/ReachWarren';

export default class ReachStop extends MovingPlaceMixin(
  RiverWaterMixin(MovingWaterMixin(
    WaterPlaceMixin(
      SwimmableMixin(ShoreMixin(PersistableMixin(MovingMixin(PositionedMixin(WarrenMemberMixin(Location)))))),
    ),
  )),
) {
  constructor() {
    super();
    // The river's bed under its water (D13): stood on where it is shallow.
    this.floor = { template: '/system/water/thing/river-bed' };
  }

  /** A stop does not move: the line leaves it alone. */
  public override isUnderWay(): boolean {
    return false;
  }

  /** No column: the stop's floor IS the river's bed here. */
  public override bandsNow(): ColumnBand[] {
    return [];
  }

  /** ⭐ Back from its record: the warren takes it again, zone and ways. */
  public override async onRestored(): Promise<void> {
    await super.onRestored();
    const warren = await StuffApi.singleton<ReachWarren>(WARREN_PATH).catch(() => null);
    if (warren) await warren.adoptStop(this);
  }

  public override getShort(): string {
    const s = this.stretch();
    const side = this.getLinePosition();
    const bank = s && side ? s.banks[this.side()].kind : null;
    if (bank === 'bar') return 'A gravel bar';
    if (bank === 'shelving') return 'The shallows by the bank';
    if (this.depthNow() > 1.5) return 'The river bed';
    return 'At the edge of the river';
  }

  public override getLong(): string {
    const s = this.stretch();
    if (!s) return 'The river runs past.';
    const bank = s.banks[this.side()];
    const where =
      bank.kind === 'bar'
        ? 'Shingle shelves up out of the river here, the water slack and shallow over the stones.'
        : bank.kind === 'shelving'
          ? 'Gravel shelves up to the bank; the water is shallow and slow at the edge.'
          : this.depthNow() > 1.5
            ? 'The river bed: stones and silt, the current pulling at everything above.'
            : 'The edge of the river, the current going past.';
    return `${where} Out in the channel the river goes by.`;
  }

  /** Which bank this stop is by: its across against the channel. */
  public side(): 'left' | 'right' {
    const pos = this.getLinePosition();
    const s = this.stretch();
    if (!pos || !s) return 'left';
    const width = this.catalogue()?.lineOfSync(pos.course)?.authoredWidthAt(pos.km) ?? 10;
    return pos.across < width * s.channelAcross ? 'left' : 'right';
  }

  private stretch() {
    const pos = this.getLinePosition();
    if (!pos) return null;
    return this.catalogue()?.lineOfSync(pos.course)?.stretchAt(pos.km) ?? null;
  }

  private catalogue(): WatercourseCatalogue | null {
    return StuffApi.findByTemplatePath<WatercourseCatalogue>(CATALOGUE_PATH) ?? null;
  }

  /** A stop is the water at one fixed place: nothing to sweep it anywhere. */
  public override async sweep(body: Stuff): Promise<boolean> {
    void body;
    return false;
  }
}
