/**
 * ResidenceCatalogue — **the residence system's roster of itself**.
 *
 * Two engine reads and one NPC beat used to find this pack's objects by
 * walking every live object in the world and matching a CLASS NAME IN A
 * STRING — `world:[class.OuterWarren]`, `world:[class.PlatBook]`,
 * `world:[class.HoldingWarren]`. That is a kernel→pack dependency the
 * type system cannot see, priced at the size of the whole world, and one
 * of the three ran once per property-minder per cadence.
 *
 * So the residence system keeps a roster of its own, and everything that
 * wants a residence object asks it.
 *
 * ## What is in the roster, and how it is derived
 *
 * ⭐ **By the shape of the ROW, not by class.** An institution is any row
 * that authors `data.parentExtent` — the parcel extent its holdings are
 * subdivided out of — which is the one thing every institution has and
 * nothing else in the content tree declares. Deriving by class would
 * miss `DormWarren`, which belongs to the eternal-university pack and
 * descends straight from the kernel's `OuterWarren` without touching
 * this pack at all: **institution classes span packs**, and a roster
 * that only knew its own would be wrong on the first campus.
 *
 * ⭐ The second-instance test that placement is chosen against: a new
 * subdivision, dormitory or let building needs **zero code here**. It
 * authors a row with a `parentExtent` and it is found.
 *
 * ## Lazy, not warmed — and live-only
 *
 * Every read is async and self-loading, on the `LaneCatalogue` /
 * `WatercourseCatalogue` shape: there is no "warmed vs cold" state to
 * get wrong, because a reference roster nothing warms has now read empty
 * forever three times in this codebase. The memo holds ROW PATHS; every
 * read resolves them to live instances and drops what is not standing,
 * which is exactly the population the world walk used to return.
 *
 * A read that finds no institution covering its key rebuilds once and
 * retries, so a row authored at runtime is found (the `findBusiness`
 * shape).
 *
 * See [docs/subsystems/residence.md] and [docs/subsystems/holding.md].
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { Template } from '@saxonberg/server/mud/lib/stuff/Template';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { OuterWarren } from '@saxonberg/server/mud/lib/location/OuterWarren';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import PlatBook from './PlatBook';

/** The catalogue singleton's own template path. */
export const RESIDENCE_CATALOGUE_PATH =
  '/system/residence/idea/ResidenceCatalogue';

/** The authored field that marks a row as an institution or a plat book. */
const EXTENT_FIELD = 'parentExtent';

/** One derived row: the path, and the extent it authored. */
interface RosterRow {
  path: string;
  parentExtent: string;
}

export default class ResidenceCatalogue extends Idea {
  /** `null` until the first read; the load promise once one is running. */
  private loading: Promise<RosterRow[]> | null = null;

  /**
   * Residency veto — a load-bearing process-lifetime singleton is never
   * culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  /** Singleton refusal — the `LaneCatalogue` shape. */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'ResidenceCatalogue is a system singleton and cannot be ' +
        'destructed; use forceDestruct (admin-gated) if you really mean it',
    };
  }

  /** Drop the derived roster; the next read rebuilds. Fired by HMR. */
  public invalidateCache(): void {
    this.loading = null;
  }

  /* ─────────────────────────── reads ─────────────────────────── */

  /**
   * Every live institution — a warren that admits holdings under a
   * parcel extent. In no guaranteed order.
   */
  public async institutions(): Promise<OuterWarren[]> {
    return this.resolve((s): s is OuterWarren => s instanceof OuterWarren);
  }

  /** Every live plat book — a subdivision with lots to sell. */
  public async platBooks(): Promise<PlatBook[]> {
    return this.resolve((s): s is PlatBook => s instanceof PlatBook);
  }

  /**
   * The live institutions whose parent extent contains `key`, **longest
   * extent first** — the innermost claim answers before the outermost,
   * which is what makes a building inside a district resolvable at all.
   *
   * Rebuilds once and retries when nothing covers the key, so a row that
   * arrived after the memo was filled is still found.
   */
  public async institutionsCovering(key: string): Promise<OuterWarren[]> {
    if (!key) return [];
    const hit = await this.coveringNow(key);
    if (hit.length > 0) return hit;
    this.invalidateCache();
    return this.coveringNow(key);
  }

  /**
   * Every live holding whose own key sits at or under `extent` — the
   * property-minder's round.
   *
   * ⚠ Every institution is consulted, not only the one covering
   * `extent`: an extent may name a district containing several
   * institutions, and the holding's own key is the ownership test. Four
   * institutions ship today, so this is a walk over four maps.
   */
  public async holdingsUnder(extent: string): Promise<Stuff[]> {
    if (!extent) return [];
    const out: Stuff[] = [];
    for (const institution of await this.institutions()) {
      for (const holding of institution.holdings()) {
        const holder = holding as unknown as { holdingKey?: () => string | null };
        const key =
          typeof holder.holdingKey === 'function' ? holder.holdingKey() : null;
        if (!key) continue;
        if (key === extent || key.startsWith(`${extent}/`)) out.push(holding);
      }
    }
    return out;
  }

  /* ────────────────────────── derivation ─────────────────────── */

  private async coveringNow(key: string): Promise<OuterWarren[]> {
    const rows = await this.rows();
    const out: { extent: string; live: OuterWarren }[] = [];
    for (const row of rows) {
      const parent = row.parentExtent;
      if (!parent || !key.startsWith(`${parent}/`)) continue;
      const live = StuffApi.findByTemplatePath(row.path);
      if (live instanceof OuterWarren && !live.isDestroyed()) {
        out.push({ extent: parent, live });
      }
    }
    out.sort((a, b) => b.extent.length - a.extent.length);
    return out.map((e) => e.live);
  }

  private async resolve<T extends Stuff>(
    is: (s: Stuff) => s is T,
  ): Promise<T[]> {
    const out: T[] = [];
    for (const row of await this.rows()) {
      const live = StuffApi.findByTemplatePath(row.path);
      if (live && !live.isDestroyed() && is(live)) out.push(live);
    }
    return out;
  }

  private rows(): Promise<RosterRow[]> {
    if (!this.loading) this.loading = deriveRows();
    return this.loading;
  }
}

/**
 * The row query. `data.parentExtent` exists on exactly the institution
 * and plat-book rows and on nothing else in the content tree — four rows
 * today, across three packs.
 */
async function deriveRows(): Promise<RosterRow[]> {
  const templates = await Template.findWhereDataHas(EXTENT_FIELD);
  const out: RosterRow[] = [];
  for (const t of templates) {
    const extent = t.data?.[EXTENT_FIELD];
    if (typeof extent !== 'string' || extent.length === 0) continue;
    out.push({ path: t.path, parentExtent: extent });
  }
  return out;
}
