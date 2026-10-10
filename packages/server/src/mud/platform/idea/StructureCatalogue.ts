/**
 * StructureCatalogue — which Structure (if any) a place belongs to, and
 * what each one looks like from outside.
 *
 * A lazy, self-loading singleton over the authored `Structure` rows,
 * wherever a pack put them (`Template.findByClass`). Every public read is
 * async and loads on first use; there is deliberately no warmed-vs-cold
 * state to get wrong (`WatercourseCatalogue`'s shape — a roster nothing
 * warms reading empty forever has bitten this codebase three times).
 *
 * It reads ROWS, not live instances: the landmark walk needs a tower's
 * outside description, not a resident tower, and membership is a prefix
 * test over authored extents. The live Structure (a ship's moving
 * position) is `StuffApi.singleton(path)`.
 */

import { Idea } from '../../lib/stuff/Idea';
import { Template } from '../../lib/stuff/Template';
import type { EvictionContext } from '../../lib/stuff/Stuff';
import type { VetoResult } from '../../lib/errors';
import { STRUCTURE_CLASS_PATH } from './Structure';

/** What the catalogue knows of one Structure row. */
export interface StructureRow {
  path: string;
  name: string;
  extent: string;
  entrance: string | null;
  outsideDescription: string;
  heightM: number;
}

export default class StructureCatalogue extends Idea {
  /** `null` until the first read; the load promise once one is running. */
  private loading: Promise<StructureRow[]> | null = null;

  /** A process-lifetime singleton; never culled. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  /** Every authored Structure row. */
  public async all(): Promise<StructureRow[]> {
    if (this.loading === null) this.loading = this.load();
    return this.loading;
  }

  /** The row at `path`, or `null`. */
  public async rowOf(path: string): Promise<StructureRow | null> {
    return (await this.all()).find((r) => r.path === path) ?? null;
  }

  /**
   * The Structure a place belongs to — the row whose `extent` is the
   * longest prefix of `locationPath` on a segment boundary — or `null`.
   * Most places are in no structure, and never need to be.
   */
  public async structureOf(locationPath: string): Promise<StructureRow | null> {
    let best: StructureRow | null = null;
    for (const row of await this.all()) {
      if (row.extent === '') continue;
      const inside = locationPath === row.extent ||
        locationPath.startsWith(`${row.extent}/`);
      if (inside && (best === null || row.extent.length > best.extent.length)) {
        best = row;
      }
    }
    return best;
  }

  private async load(): Promise<StructureRow[]> {
    const out: StructureRow[] = [];
    for (const tpl of await Template.findByClass(STRUCTURE_CLASS_PATH)) {
      const d = (tpl.data ?? {}) as Record<string, unknown>;
      out.push({
        path: tpl.path,
        name: typeof d.name === 'string' ? d.name : '',
        extent: typeof d.extent === 'string' ? d.extent.replace(/\/+$/, '') : '',
        entrance: typeof d.entrance === 'string' ? d.entrance : null,
        outsideDescription:
          typeof d.outsideDescription === 'string' ? d.outsideDescription.trim() : '',
        heightM: typeof d.heightM === 'number' ? d.heightM : 0,
      });
    }
    return out;
  }
}
