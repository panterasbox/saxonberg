/**
 * OfficeHolder — the sparse handoff-persistence Document. One row
 * exists **only for an office that has been handed off** to an explicit
 * holder; the apparatus itself is the authored `OFFICE_APPARATUS`
 * constant, not a persisted definition.
 *
 * The sparse contract: **absence of a row = the founder default holds
 * the seat.** At founding the `office_holders` collection is empty and
 * every office resolves to the founder; a row appears on `assign` and is
 * deleted on `vacate` (the seat reverts to the founder default). There
 * is no empty/vacant state — a singular seat always has a holder.
 *
 * Mirrors `lib/social/Group.ts`'s Document shape, but with a single
 * scalar holder rather than parallel membership arrays. The registry
 * (`OfficeRegistry`) owns upsert/delete; this Document only carries the
 * `{officeKey, holderId}` pair and the by-key convenience finder.
 */

import { Document } from '../persistence/Document';

export class OfficeHolder extends Document {
  static collectionName = 'office_holders';
  static persistentFields = ['officeKey', 'holderId'];

  /**
   * The join key to `OFFICE_APPARATUS` (e.g. `'prime-minister'`).
   * Unique at the collection level — at most one handoff row per office.
   */
  officeKey: string = '';

  /**
   * The explicit holder's Avatar playerId — a single holder (every v1
   * office is singular), not an array.
   */
  holderId: string = '';

  /**
   * Find the handoff row for an office, or null when the seat is on the
   * founder default (no row). Mirrors `GoogleProfile.findByGoogleId`.
   */
  public static async findByOfficeKey(
    officeKey: string,
  ): Promise<OfficeHolder | null> {
    const results = await this.find<OfficeHolder>({ officeKey });
    return results.length > 0 && results[0] ? results[0] : null;
  }
}
