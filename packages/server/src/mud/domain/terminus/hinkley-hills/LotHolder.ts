/**
 * LotHolder — stands up the yard behind a Hinkley Hills lot, keyed on the
 * lot's parcel extent.
 *
 * The suburb's whole persistence story, and it is deliberately smaller
 * than the dorm's. `DormWarren` runs an elastic graph: floors, corridors,
 * stair exits, doors, membership, migration. A smallholding needs none of
 * that — one keyed room per lot and nothing between them — so this is a
 * plain singleton with a cache and one call:
 *
 * ```ts
 * PersistableApi.restoreOrSeed(yard, lotExtent)
 * ```
 *
 * That call is Wave 2's extraction earning itself. The decision it
 * encodes (key the host, then restore its record or lay down its
 * born-with fixtures and capture them) is identical to the dorm's, and
 * this is the second consumer that would otherwise have hand-rolled it.
 *
 * ## Keyed on the PARCEL EXTENT
 *
 * Not on a player id, and not on a slot number: on the `/domain/terminus/
 * hinkley-hills/lot-<n>` extent the `parcels` row is keyed by. Title and
 * durable state therefore share one identity — the row that says you own
 * the ground and the record that remembers what is growing on it are the
 * same key. Sell the lot and the garden goes with it, because there is
 * nothing else it could do.
 *
 * ## Not boundary-exempt, and it should not be
 *
 * This is content, so the sandbox's ordinary scope compare applies to it
 * (the exempt list is an enumeration of framework registries; `DormWarren`
 * is likewise absent from it). A new module category fails closed, which
 * is the correct default for a thing that mints rooms.
 *
 * See [docs/subsystems/husbandry.md] and [docs/subsystems/residence.md].
 */

import { Idea } from '../../../lib/stuff/Idea';
import { SingletonMixin } from '../../../lib/stuff/Singleton';
import { PostRegistrationMixin } from '../../../lib/stuff/PostRegistration';
import { StuffApi } from '../../../api/stuff';
import { PersistableApi } from '../../../api/persistable';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { VetoResult } from '../../../lib/errors';

/** The yard template every lot's room is cloned from. */
const YARD_TEMPLATE = '/domain/terminus/hinkley-hills/yard';

const LotHolderBase = SingletonMixin(PostRegistrationMixin(Idea));

export default class LotHolder extends LotHolderBase {
  static persistentFields: string[] = [];

  /** Live yards by lot extent — the process-lifetime cache. */
  private _yardsByLot = new Map<string, Stuff>();

  /** A load-bearing process-lifetime singleton is never culled. */
  public canEvict(): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  /**
   * The live yard for `lotExtent`, materialized if needed. Cached → clone
   * the yard shell → restore-or-seed against the lot's own key → cache.
   *
   * Returns `true` from the underlying call on a restore and `false` on a
   * first provisioning; that distinction is surfaced by
   * {@link LotHolder.provisionYard} for callers (the `title buy` path)
   * that want to know whether they just built something.
   */
  public async yardFor(lotExtent: string): Promise<Stuff> {
    const [yard] = await this.standUp(lotExtent);
    return yard;
  }

  /**
   * Stand the yard up and report whether this was a FIRST provisioning
   * (`true`) or a re-entry to ground already worked (`false`). The sale
   * uses it to decide whether to describe the lot as new.
   */
  public async provisionYard(
    lotExtent: string,
  ): Promise<{ yard: Stuff; firstTime: boolean }> {
    const [yard, restored] = await this.standUp(lotExtent);
    return { yard, firstTime: !restored };
  }

  /** The live yard for a lot if one is standing, else null. */
  public liveYardFor(lotExtent: string): Stuff | null {
    const cached = this._yardsByLot.get(lotExtent);
    return cached && !cached.isDestroyed() ? cached : null;
  }

  private async standUp(lotExtent: string): Promise<[Stuff, boolean]> {
    const cached = this._yardsByLot.get(lotExtent);
    if (cached && !cached.isDestroyed()) return [cached, true];

    const yard = await StuffApi.clone<Stuff>(YARD_TEMPLATE);
    const restored = await PersistableApi.restoreOrSeed(yard, lotExtent);
    this._yardsByLot.set(lotExtent, yard);
    return [yard, restored];
  }
}
