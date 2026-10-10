/**
 * ChartedMixin — a written thing that, when READ, writes what it shows
 * into the reader's map as `charted` claims (maritime D15).
 *
 * ⭐ The chart IS the procurement of knowledge: the edges of a sea are
 * unknown to you until you read a chart of them. `entries` are authored
 * AS THE CHART STATES THEM — name, row, and `where` in the chart's own
 * words — so a wrong chart is authored wrong in one row and is never
 * reconciled: read it, and your map holds the wrong band, still there
 * after the water has disagreed with it, beside whatever else you know.
 *
 * Narrowed at `read`'s own seam (the point a scroll's working fires),
 * never by `instanceof` in the controller. A pilot's book or sailing
 * directions would compose this same mixin.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { MapClaim } from '../location/MapClaim';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { NavigationApi } from '../../api/navigation';
import { SpatialZone } from '../zone/SpatialZone';

/** One thing a chart shows, as the chart shows it. */
export interface ChartEntry {
  /** A node is a place on the water; a band is water between places. */
  kind: 'node' | 'band';
  /** The row it is a chart OF (it may draw it wrong). */
  path: string;
  /** What the chart calls it. */
  name: string;
  /** Where the chart says it is, in the chart's words. */
  where?: string;
}

export interface Charted {
  getOf(): string;
  getEntries(): ChartEntry[];
  /** Write this chart's claims into `reader`'s map; the count written. */
  writeClaimsFor(reader: Stuff): Promise<number>;
}

export function ChartedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class ChartedMixin extends Base implements Charted {
    static _mixinName: string = 'ChartedMixin';

    static fieldMeta: FieldMeta = {
      of: { persistent: true, authorable: true },
      entries: { persistent: true, authorable: true },
    };

    /** The expanse row this is a chart of. */
    protected of = '';
    protected entries: ChartEntry[] = [];

    getOf(): string { return this.of; }
    setOf(v: string): void { this.of = v ?? ''; }

    getEntries(): ChartEntry[] { return this.entries.map((e) => ({ ...e })); }
    setEntries(v: ChartEntry[] | null): void {
      this.entries = Array.isArray(v)
        ? v.filter((e) => e && (e.kind === 'node' || e.kind === 'band') && typeof e.path === 'string')
        : [];
    }

    async writeClaimsFor(reader: Stuff): Promise<number> {
      if (!MixinApi.isCartographer(reader) || !reader.keepsMaps()) return 0;
      if (this.of === '' || this.entries.length === 0) return 0;
      const locality = await localityOf(this.of);
      const now = NavigationApi.mapNow();
      const by = reader.mapOwnerKey();
      const claims: MapClaim[] = this.entries.map((e) => ({
        kind: e.kind === 'band' ? 'band' : 'place',
        place: e.path,
        label: e.path,
        name: e.name,
        ...(e.where ? { where: e.where } : {}),
        channel: 'charted',
        firstSeen: now,
        lastSeen: now,
        recordedBy: by,
      }));
      await NavigationApi.recordPlace(by, locality, claims);
      return claims.length;
    }
  };
}

/** The map a chart files under: its expanse's address, else its key. */
async function localityOf(expansePath: string): Promise<string> {
  try {
    const e = await StuffApi.singleton<Stuff>(expansePath);
    if (e instanceof SpatialZone && e.getAddress()) return e.getAddress()!;
  } catch {
    /* the key, then */
  }
  return expansePath.split('/').pop() ?? expansePath;
}
