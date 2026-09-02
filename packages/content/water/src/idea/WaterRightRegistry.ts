/**
 * WaterRightRegistry — **one substrate, two doctrines**.
 *
 * A water right is a **volume per window plus a priority date**. Without
 * a volume it cannot be over-subscribed; without a date it cannot be
 * senior. Everything else about water law is a reading of those two
 * numbers.
 *
 * ## Two doctrines, one mechanism
 *
 * | | how it exists | who has one |
 * |---|---|---|
 * | **prior appropriation** | an explicit, **dated, transferable record** | whoever filed, first in time first in right |
 * | **riparian** | **derived**, with no record at all | whoever owns land on the bank, in equal share |
 *
 * The substrate ships the **record** form, because it is the superset;
 * riparian is a *derivation rule over the same shape*, reading a
 * parcel's own reach citation. So a polity's doctrine is a **choice**,
 * not a second implementation — and both answer one allocation query.
 *
 * ⭐ Riparian being record-free is not a shortcut, it is the doctrine:
 * you have a right because of where your land is, and nobody had to
 * write anything down. It also means the riparian path needs no filing
 * authority, no gate and no verb, which is exactly why it is the one a
 * player has on day one.
 *
 * ## The quota rides the RIGHT, not the source
 *
 * A per-window counter on the holder's own record, so enforcement needs
 * no cross-drawer view and **no leaderboard can exist**. *Aggregate,
 * never report* — refusing an over-draw must never expose any other
 * holder's draw, and the shape of the check is what guarantees that
 * rather than a rule about what to print.
 *
 * ## Navigation is a claimant who is not a farmer
 *
 * `navigation` is a use in the vocabulary carrying a **minimum flow**
 * rather than a volume. That single entry gives the seniority system the
 * classic fight — navigation versus irrigation, the Missouri, the
 * Colorado — out of quantities the build already computes, and it is why
 * an upstream diversion can *strand* a river.
 *
 * See [docs/subsystems/watershed.md].
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type { ParcelOwner } from '@saxonberg/server/mud/lib/parcel/ParcelRecord';

/** Where the register lives in the path-addressed document tree. */
export const WATER_RIGHTS_PREFIX = '/water/rights';

/** The document kind the platform declares for a filed right. */
export const WATER_RIGHT_KIND = 'water-right';

/**
 * What a right is claimed FOR.
 *
 * Closed, and short on purpose. The uses that matter are the ones that
 * compete for the same water differently: a farm takes a volume and
 * gives none back, a town takes a volume and returns most of it fouled,
 * and **navigation takes nothing at all and still loses when the river
 * drops** — which is why it belongs in the same vocabulary rather than
 * in a system of its own.
 */
export type WaterUse =
  | 'irrigation'
  | 'municipal'
  | 'industrial'
  | 'navigation';

/** Validation array for {@link WaterUse}. */
export const WATER_USES: readonly WaterUse[] = [
  'irrigation',
  'municipal',
  'industrial',
  'navigation',
] as const;

/** A filed right, as it round-trips through the document store. */
export interface WaterRight {
  /** Durable id, unique within its reach. */
  rightId: string;
  /** The reach it is claimed on. */
  reachRef: string;
  /** Who holds it — a durable player / group / business ref. */
  holderRef: string;
  /** What it is for. */
  use: WaterUse;
  /**
   * Cubic metres per second the holder may take.
   *
   * A **rate**, not a total, because that is the quantity a river has
   * and the quantity an intake takes. The per-window quota below is what
   * turns it into an amount somebody can exhaust.
   */
  rateM3S: number;
  /**
   * The quota window in game-seconds, and the volume allowed inside it.
   * Zero volume means no quota — a rate-only right, which is the older
   * and simpler form.
   */
  windowS: number;
  quotaM3: number;
  /**
   * ⭐ Game-seconds when the claim was made. **First in time, first in
   * right** — the entire seniority system is a sort on this field.
   */
  priorityDateS: number;
  /**
   * For a `navigation` claim: the flow below which the reach is
   * stranded. Zero for every other use.
   */
  minimumFlowM3S: number;
  /** Whether it survives the sale of the land it was filed from. */
  transferable: boolean;
  /**
   * `true` for a right **derived** from parcel ownership rather than
   * filed. Never written to the store — it exists only in an allocation
   * answer, so that a caller can tell a bank-holder's share from a
   * filed claim without going and looking.
   */
  derived?: boolean;
}

/** What one right actually got out of a reach. */
export interface Allocation {
  right: WaterRight;
  /** Cubic metres per second served. */
  servedM3S: number;
  /** What it asked for and did not get. */
  shortfallM3S: number;
}

/** The whole answer to "who gets what out of this reach right now". */
export interface AllocationResult {
  reachRef: string;
  /** Flow available before anybody drew. */
  availableM3S: number;
  /** In seniority order — seniors first, and they are served first. */
  allocations: Allocation[];
  /** What is left after every right was served, in m³/s. */
  remainingM3S: number;
  /**
   * Navigation claims whose minimum flow is not met. ⭐ A diversion that
   * empties this array's complement has **stranded the river**.
   */
  strandedNavigation: WaterRight[];
}

export default class WaterRightRegistry extends Idea {
  /** A load-bearing process-lifetime singleton is never culled. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'WaterRightRegistry is a system singleton and cannot be destructed',
    };
  }

  // ---------- filing ----------

  /**
   * File a right, validated.
   *
   * ⚠ **The validation is the pack's; the KIND is the platform's.** A
   * pack cannot declare a document kind — the installer needs a go-live
   * hook for it and that is code — but what counts as a legitimate
   * right is entirely this subsystem's business, and it lives here.
   *
   * Throws with a named cause rather than returning false: filing a
   * malformed right is a programming error at the caller, and a silent
   * `false` is how a claim goes missing.
   */
  public async file(right: WaterRight): Promise<string> {
    const problems: string[] = [];
    if (right.rightId.trim() === '') problems.push('it has no id');
    if (right.reachRef.trim() === '') problems.push('it names no reach');
    if (right.holderRef.trim() === '') problems.push('it names no holder');
    if (!WATER_USES.includes(right.use)) {
      problems.push(
        `its use '${String(right.use)}' is not one of ${WATER_USES.join(', ')}`,
      );
    }
    if (!Number.isFinite(right.priorityDateS)) {
      problems.push('it has no priority date, so it can never be senior');
    }
    if (right.use === 'navigation') {
      if (!(right.minimumFlowM3S > 0)) {
        problems.push(
          'a navigation claim with no minimum flow claims nothing — ' +
            'it is the flow it needs, not a volume it takes',
        );
      }
    } else if (!(right.rateM3S > 0)) {
      problems.push(
        'it claims no rate, and a right without a volume cannot be ' +
          'over-subscribed — which is the only thing that makes seniority bite',
      );
    }
    if (problems.length > 0) {
      throw new Error(
        `WaterRightRegistry.file: refusing '${right.rightId}' — ` +
          problems.join('; '),
      );
    }

    const path = pathOf(right.reachRef, right.rightId);
    await DocumentApi.save(path, WATER_RIGHT_KIND, {
      ...right,
      // A derived right is never a filed one. Strip the flag rather than
      // storing a lie that a later read would believe.
      derived: undefined,
    });
    return path;
  }

  /**
   * Transfer a filed right to a new holder — **it survives the sale of
   * the land**, which is the half of prior appropriation that makes it
   * a property interest rather than a permission.
   *
   * Returns `false` for a right that is not transferable or does not
   * exist. The priority date is deliberately untouched: a transferred
   * senior right stays senior, and that is why anyone buys one.
   */
  public async transfer(
    reachRef: string,
    rightId: string,
    newHolderRef: string,
  ): Promise<boolean> {
    const doc = await DocumentApi.read(pathOf(reachRef, rightId));
    if (doc === null) return false;
    const right = rightOf(doc.getData());
    if (right === null || !right.transferable) return false;
    await DocumentApi.save(pathOf(reachRef, rightId), WATER_RIGHT_KIND, {
      ...right,
      holderRef: newHolderRef,
    });
    return true;
  }

  // ---------- reading ----------

  /** Every FILED right on a reach, in seniority order. */
  public async filedRightsOn(reachRef: string): Promise<WaterRight[]> {
    const docs = await DocumentApi.list(prefixOf(reachRef));
    const out: WaterRight[] = [];
    for (const doc of docs) {
      const right = rightOf(doc.getData());
      if (right !== null && right.reachRef === reachRef) out.push(right);
    }
    return out.sort(bySeniority);
  }

  /**
   * ⭐ Every **riparian** right on a reach — derived from parcel
   * ownership, with **no record at all**.
   *
   * The bank-holders are the owners of the parcels citing this reach,
   * and their share is equal by construction: the available flow split
   * `1/N`. The priority date is `0` — every riparian right is
   * simultaneous, which is exactly what "equal share" means and why the
   * doctrine does not produce winners in a drought, only smaller
   * glasses.
   */
  public async riparianRightsOn(
    reachRef: string,
    availableM3S: number,
  ): Promise<WaterRight[]> {
    const parcels = await ParcelApi.allRecords();
    const holders = parcels.filter(
      (p) => p.getReach() === reachRef && p.getOwner() !== null,
    );
    if (holders.length === 0) return [];
    const share = Math.max(0, availableM3S) / holders.length;
    return holders.map((p) => ({
      rightId: `riparian:${p.getExtent()}`,
      reachRef,
      holderRef: ownerRefOf(p.getOwner()),
      use: 'irrigation' as WaterUse,
      rateM3S: share,
      windowS: 0,
      quotaM3: 0,
      // ⭐ Simultaneous by construction. No riparian holder is senior to
      // another, so a drought shrinks every glass rather than emptying
      // the junior ones.
      priorityDateS: 0,
      minimumFlowM3S: 0,
      transferable: false,
      derived: true,
    }));
  }

  // ---------- allocation ----------

  /**
   * ⭐ **Serve a reach in seniority order** — one query, both doctrines.
   *
   * Filed rights sort by priority date, oldest first, and are served in
   * full until the water runs out. **The junior is the one that goes
   * short**, which is the whole of prior appropriation: in a dry August
   * the newest claim gets nothing while the oldest gets everything, and
   * that asymmetry is why a senior right is worth money.
   *
   * Riparian holders (priority `0`) come first in the sort because they
   * are the oldest claim there is — the land was there before anybody
   * filed — and they share equally among themselves by construction.
   *
   * Navigation claims take **nothing**; they are checked against the
   * flow that survives everybody else. A claim whose minimum is not met
   * is **stranded**, and curtailing a junior right un-strands it.
   */
  public async allocate(
    reachRef: string,
    availableM3S: number,
    opts: { riparian?: boolean } = {},
  ): Promise<AllocationResult> {
    const available = Math.max(0, availableM3S);
    const filed = await this.filedRightsOn(reachRef);
    const riparian = opts.riparian === true
      ? await this.riparianRightsOn(reachRef, available)
      : [];
    const ordered = [...riparian, ...filed].sort(bySeniority);

    let remaining = available;
    const allocations: Allocation[] = [];
    const navigation: WaterRight[] = [];

    for (const right of ordered) {
      if (right.use === 'navigation') {
        navigation.push(right);
        // It takes nothing, so it neither reduces the river nor appears
        // in the served list — it is a condition on what is left.
        continue;
      }
      const served = Math.min(right.rateM3S, remaining);
      remaining -= served;
      allocations.push({
        right,
        servedM3S: served,
        shortfallM3S: right.rateM3S - served,
      });
    }

    return {
      reachRef,
      availableM3S: available,
      allocations,
      remainingM3S: remaining,
      strandedNavigation: navigation.filter(
        (n) => remaining < n.minimumFlowM3S,
      ),
    };
  }

  /**
   * Whether a draw of `m3` over the current window would breach the
   * holder's quota.
   *
   * ⚠ **The refusal exposes no other holder's draw**, and that is a
   * property of the SHAPE rather than of what the caller prints: the
   * check reads one record — the drawer's own — and never touches
   * another. There is no cross-drawer view here to leak, and therefore
   * no leaderboard that could ever be built from it. *Aggregate, never
   * report.*
   */
  public quotaRemainingM3(
    right: WaterRight,
    drawnThisWindowM3: number,
  ): number | null {
    if (right.quotaM3 <= 0) return null; // rate-only right: no quota
    return Math.max(0, right.quotaM3 - Math.max(0, drawnThisWindowM3));
  }
}

/* ─────────────────────────── paths + parsing ─────────────────────────── */

/** `/water/rights/<course>/<node>` — the reach's own branch. */
function prefixOf(reachRef: string): string {
  const [course, node] = reachRef.split(':');
  return `${WATER_RIGHTS_PREFIX}/${course ?? ''}/${node ?? ''}`;
}

/** `/water/rights/<course>/<node>/<rightId>`. */
function pathOf(reachRef: string, rightId: string): string {
  return `${prefixOf(reachRef)}/${rightId}`;
}

/**
 * ⭐ Seniority: **first in time, first in right**. Ties break on the id
 * so the order is total and stable — two rights filed in the same
 * game-second must not swap places between reads, or an allocation
 * would be non-deterministic in exactly the case somebody is arguing
 * about.
 */
function bySeniority(a: WaterRight, b: WaterRight): number {
  if (a.priorityDateS !== b.priorityDateS) {
    return a.priorityDateS - b.priorityDateS;
  }
  return a.rightId < b.rightId ? -1 : a.rightId > b.rightId ? 1 : 0;
}

/**
 * A parcel owner as one durable string, whichever kind it is. The
 * registry does not care whether a bank-holder is a person, a group or
 * an organization — a right is a right — so the three shapes collapse
 * to the one identity the store round-trips.
 */
function ownerRefOf(owner: ParcelOwner | null): string {
  if (owner === null) return '';
  if (owner.kind === 'group') return `group:${owner.ref ?? owner.name ?? ''}`;
  return owner.templatePath;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** Build a right from a stored document's `data`, or `null`. */
function rightOf(data: Record<string, unknown>): WaterRight | null {
  const rightId = str(data.rightId);
  const reachRef = str(data.reachRef);
  if (rightId === '' || reachRef === '') return null;
  const use = str(data.use) as WaterUse;
  return {
    rightId,
    reachRef,
    holderRef: str(data.holderRef),
    use: WATER_USES.includes(use) ? use : 'irrigation',
    rateM3S: num(data.rateM3S),
    windowS: num(data.windowS),
    quotaM3: num(data.quotaM3),
    priorityDateS: num(data.priorityDateS),
    minimumFlowM3S: num(data.minimumFlowM3S),
    transferable: data.transferable === true,
  };
}
