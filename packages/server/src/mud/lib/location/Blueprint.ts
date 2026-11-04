/**
 * Blueprint — ⭐ **a kind of building, authored as an ordinary place**
 * (harbors review 3).
 *
 * A warren that mints copies of a set of rooms — a Hinkley house, a dorm
 * unit, a valley farmstead, a smack — names its blueprint: a
 * `Structure` row whose `extent` holds the kind's rooms authored like any
 * place (ordinary rows, ordinary `exits:` between them) and whose `entrance` is the way in. This is the authored
 * Hesper's shape; nothing about a blueprint is a second schema. Per-room
 * facts are the room's own fields (a compartment's `floorM`, a tract's
 * `share`); the ground the buildings cover is the Structure's
 * `footprintM2`. ⚠ A blueprint row authors no `coords:` — a row's cell
 * registers on its zone's grid, and every copy stands in one zone; a
 * copy's layout is read from its ways (`FloorplanWarren.layOut`).
 *
 * This class READS the rows — it never stands the blueprint up. A copy is
 * minted from the rows, never from a live blueprint instance, and the
 * blueprint itself is served to nobody: the location graph attaches no
 * blueprint Structure to its extent, nothing boots it, and no way leads
 * in. An author holding title to the extent may still stand a room of it
 * up by the shipped author path (`clone <row>` — `AccessApi.canAtPath` —
 * then `goto`), as any authored place.
 *
 * Membership is FOLLOWED, never searched: the entrance, and every room a
 * way inside the extent leads to from a room already found — the ways
 * the author wrote. A one-room blueprint (the dorm's) names its room as
 * both its extent and its entrance. A room's
 * LEAF is the last segment of its row path (unique within the
 * blueprint); a one-room blueprint has none — its copy is keyed by the
 * warren's own key.
 *
 * ⭐⭐ **Its buildings are authored too** (harbors review, 2026-11-03).
 * The blueprint's `buildings:` names each building of the kind, the main
 * one first — a Building row with its own `extent` and `entrance`, like
 * any building. A building's rooms are the blueprint's rooms at or under
 * ITS extent: the Structure rule, read off the paths, never off how the
 * rooms connect. Ground no building's extent covers (a yard, a tract, a
 * garden) is no building's. A blueprint that names none (a flat) stands
 * in the building its holding's own extent lies in.
 */

import { Template } from '../stuff/Template';
import { StuffApi } from '../../api/stuff';
import type { ExitInstruction } from '../boundary/Exitable';

/** One room of a blueprint, as its row says. */
export interface BlueprintRoom {
  /** The room's row — what every copy clones from. */
  row: string;
  /** The key under copy N (`<N>/<leaf>`); absent for a one-room blueprint. */
  leaf?: string;
  /** Is this the Structure's entrance? */
  entry: boolean;
  /** The row's authored exits, by direction. */
  exits: Record<string, ExitInstruction>;
}

/** One building of a blueprint, as its row says. */
export interface BlueprintBuilding {
  /** The building's row — what every copy's building clones from. */
  row: string;
  /** Its row's last segment — what tells a copy's buildings apart. */
  leaf: string;
  /** Its rooms' row paths: the blueprint's rooms at or under its extent. */
  rooms: string[];
}

/** A blueprint, read off its rows. */
export interface BlueprintPlan {
  /** The Structure row. */
  path: string;
  /** Every room row lies under (or is) this path. */
  extent: string;
  /** The entrance row. */
  entrance: string;
  /** The ground the buildings stand on that no tract covers, m². */
  footprintM2: number;
  /** The rooms, the entrance first, then as the ways reach them. */
  rooms: BlueprintRoom[];
  /** Its buildings, the main one first — `[]` when it names none. */
  buildings: BlueprintBuilding[];
}

export class Blueprint {
  public constructor(public readonly path: string) {}

  /**
   * Read the blueprint off its rows. Throws — loudly, naming the row — on
   * a missing Structure, an empty extent, an entrance that is not one of
   * its rooms, or two rooms with one leaf: each is a content error that
   * would otherwise mint a house with no door or two rooms on one key.
   */
  public async load(): Promise<BlueprintPlan> {
    const row = await Template.findByPath(this.path);
    if (!row) throw new Error(`Blueprint '${this.path}': no such row`);
    const data = (row.data ?? {}) as Record<string, unknown>;
    const extent = typeof data.extent === 'string' ? data.extent.replace(/\/+$/, '') : '';
    const entrance = typeof data.entrance === 'string' ? data.entrance : '';
    if (!extent || !entrance) {
      throw new Error(`Blueprint '${this.path}': a blueprint names an extent and an entrance`);
    }
    // ⭐ Its rooms are FOLLOWED, never searched (load on use): the
    // entrance, then every room a way inside the extent leads to from a
    // room already found — the ways the author wrote. A room no way
    // reaches is in no copy (a house with a room you cannot walk into is
    // a content error the author sees as a missing room).
    const inside = (p: string): boolean => p === extent || p.startsWith(`${extent}/`);
    if (!inside(entrance)) {
      throw new Error(`Blueprint '${this.path}': its entrance '${entrance}' is outside '${extent}'`);
    }
    const places: Template[] = [];
    const seen = new Set<string>([entrance]);
    const queue = [entrance];
    while (queue.length > 0) {
      const path = queue.shift()!;
      const t = await Template.findByPath(path);
      const cls = t?.class
        ? ((await StuffApi.loadClassByPath(t.class)) as { prototype?: { isPlace?: () => boolean } } | undefined)
        : undefined;
      if (!t || cls?.prototype?.isPlace?.() !== true) {
        throw new Error(
          `Blueprint '${this.path}': '${path}' is inside '${extent}' and no room of it` +
            (path === entrance ? ' (the entrance)' : ''),
        );
      }
      places.push(t);
      for (const way of Object.values(exitsOf((t.data as Record<string, unknown> | undefined)?.exits))) {
        if (!inside(way.destination) || seen.has(way.destination)) continue;
        seen.add(way.destination);
        queue.push(way.destination);
      }
    }
    const single = places.length === 1;
    const leaves = new Set<string>();
    const rooms = places.map((t): BlueprintRoom => {
      const d = (t.data ?? {}) as Record<string, unknown>;
      const leaf = single ? undefined : t.path.slice(t.path.lastIndexOf('/') + 1);
      if (leaf !== undefined) {
        if (leaves.has(leaf)) throw new Error(`Blueprint '${this.path}': two rooms are '${leaf}'`);
        leaves.add(leaf);
      }
      return {
        row: t.path,
        leaf,
        entry: t.path === entrance,
        exits: exitsOf(d.exits),
      };
    });
    const footprint = Number(data.footprintM2);
    return {
      path: this.path,
      extent,
      entrance,
      footprintM2: Number.isFinite(footprint) && footprint > 0 ? footprint : 0,
      rooms,
      buildings: await this.loadBuildings(data.buildings, rooms, inside),
    };
  }

  /**
   * The blueprint's buildings off their rows. Throws — naming the row —
   * on a building outside the blueprint, one with no rooms, an entrance
   * that is not one of its rooms, or a room two buildings claim: each
   * would stand up a building nobody could find or a room in two.
   */
  private async loadBuildings(
    raw: unknown,
    rooms: readonly BlueprintRoom[],
    inside: (p: string) => boolean,
  ): Promise<BlueprintBuilding[]> {
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw) || raw.some((r) => typeof r !== 'string' || r === '')) {
      throw new Error(`Blueprint '${this.path}': buildings is a list of building rows`);
    }
    const claimed = new Map<string, string>();
    const leaves = new Set<string>();
    const out: BlueprintBuilding[] = [];
    for (const path of raw as string[]) {
      const row = await Template.findByPath(path);
      if (!row) throw new Error(`Blueprint '${this.path}': building '${path}' has no row`);
      const d = (row.data ?? {}) as Record<string, unknown>;
      const extent = typeof d.extent === 'string' ? d.extent.replace(/\/+$/, '') : '';
      const entrance = typeof d.entrance === 'string' ? d.entrance : '';
      if (!extent || !entrance) {
        throw new Error(`Blueprint '${this.path}': building '${path}' names an extent and an entrance`);
      }
      if (!inside(extent)) {
        throw new Error(`Blueprint '${this.path}': building '${path}' lies outside it ('${extent}')`);
      }
      const within = (p: string): boolean => p === extent || p.startsWith(`${extent}/`);
      const mine = rooms.filter((r) => within(r.row)).map((r) => r.row);
      if (mine.length === 0) throw new Error(`Blueprint '${this.path}': building '${path}' has no rooms`);
      if (!mine.includes(entrance)) {
        throw new Error(`Blueprint '${this.path}': building '${path}' is entered by '${entrance}', none of its rooms`);
      }
      for (const r of mine) {
        const other = claimed.get(r);
        if (other !== undefined) {
          throw new Error(`Blueprint '${this.path}': '${r}' is in two buildings ('${other}', '${path}')`);
        }
        claimed.set(r, path);
      }
      const leaf = path.slice(path.lastIndexOf('/') + 1);
      if (leaves.has(leaf)) throw new Error(`Blueprint '${this.path}': two buildings are '${leaf}'`);
      leaves.add(leaf);
      out.push({ row: path, leaf, rooms: mine });
    }
    return out;
  }
}

/** A row's `exits:` map, entries with a destination only. */
function exitsOf(raw: unknown): Record<string, ExitInstruction> {
  const out: Record<string, ExitInstruction> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [dir, spec] of Object.entries(raw as Record<string, unknown>)) {
    if (spec && typeof spec === 'object' && typeof (spec as { destination?: unknown }).destination === 'string') {
      out[dir] = spec as ExitInstruction;
    }
  }
  return out;
}
