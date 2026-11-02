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
 * Membership is the Structure rule: every row under the extent whose
 * class is a place — and the extent row itself when it is one, so a
 * one-room blueprint (the dorm's) names its room as its extent. A room's
 * LEAF is the last segment of its row path (unique within the
 * blueprint); a one-room blueprint has none — its copy is keyed by the
 * warren's own key.
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
  /** The rooms, the entrance first, then by row path. */
  rooms: BlueprintRoom[];
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
    const own = await Template.findByPath(extent);
    const candidates = [...(own ? [own] : []), ...(await Template.findDescendants(extent))];
    const places: Template[] = [];
    for (const t of candidates) {
      if (t.path === this.path || !t.class) continue;
      const cls = (await StuffApi.loadClassByPath(t.class)) as
        | { prototype?: { isPlace?: () => boolean } }
        | undefined;
      if (cls?.prototype?.isPlace?.() === true) places.push(t);
    }
    if (places.length === 0) throw new Error(`Blueprint '${this.path}': no rooms under '${extent}'`);
    places.sort((a, b) =>
      a.path === entrance ? -1 : b.path === entrance ? 1 : a.path.localeCompare(b.path),
    );
    if (places[0]!.path !== entrance) {
      throw new Error(`Blueprint '${this.path}': its entrance '${entrance}' is not one of its rooms`);
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
    };
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
