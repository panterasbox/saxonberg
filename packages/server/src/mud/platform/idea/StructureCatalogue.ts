/**
 * StructureCatalogue — which Structure (if any) a place belongs to, and
 * which of them are landmarks.
 *
 * A lazy, self-loading singleton over the authored `Structure` rows,
 * wherever a pack put them (`Template.findByClass`). Every public read is
 * async and loads on first use; there is deliberately no warmed-vs-cold
 * state to get wrong (`WatercourseCatalogue`'s shape — a roster nothing
 * warms reading empty forever has bitten this codebase three times).
 *
 * It reads ROWS, not live instances: membership is a prefix test over
 * authored extents, and it answers before any member is resident. The
 * live Structure is `StuffApi.singleton(path)`. (The horizon does not read
 * this catalogue: it needs the structures synchronously, and they are
 * booted and never culled, so it reads them resident — maritime R4.)
 */

import { Idea } from '../../lib/stuff/Idea';
import { Template } from '../../lib/stuff/Template';
import type { EvictionContext } from '../../lib/stuff/Stuff';
import type { VetoResult } from '../../lib/errors';
import { STRUCTURE_CLASS_PATH } from './Structure';
import { SHIP_CLASS_PATH } from './Ship';

/** What the catalogue knows of one Structure row. */
export interface StructureRow {
  path: string;
  name: string;
  extent: string;
  entrance: string | null;
  landmark: boolean;
  heightM: number;
  /** A {@link Ship} (a Structure whose position is a variable). */
  ship: boolean;
  /** The sea a SHIP is sited on, or `null` (a building has none). */
  expanse: string | null;
}

export default class StructureCatalogue extends Idea {
  /** `null` until the first read; the load promise once one is running. */
  private loading: Promise<StructureRow[]> | null = null;
  /**
   * The rows by key, built once with them: extent → row, and every
   * ancestor zone of an extent → the rows standing in it. Transient.
   */
  private index: {
    byExtent: Map<string, StructureRow>;
    within: Map<string, StructureRow[]>;
    onExpanse: Map<string, StructureRow[]>;
  } | null = null;

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
    await this.all();
    return this.peekStructureOf(locationPath);
  }

  /**
   * ⭐ {@link structureOf}, SYNCHRONOUSLY, by key — walk the place's own
   * path up its segments and look each one up as an extent (O(depth), no
   * scan). `null` before the rows have loaded (the read it starts lands
   * for the next ask). What the horizon and the water's weather lean ask
   * — *which building is this room in* is this catalogue's question, not
   * the registry's (maritime review: no registry-wide reads).
   */
  public peekStructureOf(locationPath: string): StructureRow | null {
    if (this.index === null) {
      void this.all();
      return null;
    }
    let p = locationPath.replace(/\/+$/, '');
    while (p !== '') {
      const row = this.index.byExtent.get(p);
      if (row) return row;
      const cut = p.lastIndexOf('/');
      if (cut <= 0) break;
      p = p.slice(0, cut);
    }
    return null;
  }

  /**
   * ⭐ The Structures standing in a ZONE (their extent is the zone or under
   * it) — by key, synchronously; `[]` before the rows have loaded. What a
   * horizon that names a zone scans.
   */
  public peekStructuresWithin(zonePath: string): readonly StructureRow[] {
    if (this.index === null) {
      void this.all();
      return [];
    }
    return this.index.within.get(zonePath.replace(/\/+$/, '')) ?? [];
  }

  /**
   * ⭐ The SHIPS sited on a sea — what an expanse's compile registers as
   * craft (a building on its rock is found through the sea's nodes). By
   * key, from the rows this catalogue already holds; it replaced a
   * full-table `findWhereDataHas('expansePosition')` (maritime review).
   */
  public async structuresOn(expansePath: string): Promise<readonly StructureRow[]> {
    await this.all();
    return this.index?.onExpanse.get(expansePath) ?? [];
  }

  private async load(): Promise<StructureRow[]> {
    const out: StructureRow[] = [];
    const ships = new Set((await Template.findByClass(SHIP_CLASS_PATH)).map((t) => t.path));
    const rows = [
      ...(await Template.findByClass(STRUCTURE_CLASS_PATH)),
      ...(await Template.findByClass(SHIP_CLASS_PATH)),
    ];
    for (const tpl of rows) {
      const d = (tpl.data ?? {}) as Record<string, unknown>;
      out.push({
        path: tpl.path,
        name: typeof d.name === 'string' ? d.name : '',
        extent: typeof d.extent === 'string' ? d.extent.replace(/\/+$/, '') : '',
        entrance: typeof d.entrance === 'string' ? d.entrance : null,
        landmark: d.landmark === true,
        heightM: typeof d.heightM === 'number' ? d.heightM : 0,
        ship: ships.has(tpl.path),
        expanse: typeof d.expanse === 'string' && d.expanse !== '' ? d.expanse : null,
      });
    }
    const byExtent = new Map<string, StructureRow>();
    const within = new Map<string, StructureRow[]>();
    const onExpanse = new Map<string, StructureRow[]>();
    for (const row of out) {
      if (row.expanse !== null) {
        const list = onExpanse.get(row.expanse);
        if (list) list.push(row);
        else onExpanse.set(row.expanse, [row]);
      }
      if (row.extent === '') continue;
      byExtent.set(row.extent, row);
      // Every ancestor zone of the extent — `/world/terminus/terminal`
      // stands in `/world/terminus` and in `/world` — and the extent itself.
      let p = row.extent;
      while (p !== '') {
        const list = within.get(p);
        if (list) list.push(row);
        else within.set(p, [row]);
        const cut = p.lastIndexOf('/');
        if (cut <= 0) break;
        p = p.slice(0, cut);
      }
    }
    this.index = { byExtent, within, onExpanse };
    return out;
  }
}
