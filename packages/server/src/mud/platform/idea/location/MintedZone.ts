/**
 * MintedZone — ⭐ **a zone whose instances are COPIES, each minted by a
 * warren** (zone-instancing D1, D4).
 *
 * A plan's zone row is a KIND: the Hinkley house, the smack's decks, a
 * reach patch. A warren that copies the plan mints one instance of this
 * row per copy, under an identity the warren derives from its own key
 * (`ZoneMintingMixin.copyIdentity`) — so two houses on one programme are
 * two zones, each with its own grid, each inheriting from where its
 * identity is filed (the lot it stands on, or the ship kind's chain).
 *
 * The row says who makes its copies — `mintedBy`, the warren ROW — and
 * the minting warren checks it before it mints, so the declaration is
 * load-bearing at run time and not only in `lint:locations`.
 *
 * ⚠ **The row's own instance holds no rooms** (D4). It is still stood up
 * for the things and ideas filed under the plan's folder (they are only
 * STAMPED with it), but a room that tries to join it is a room that missed
 * its copy — once a silent fallback that put every keyed room of every
 * house into one shared zone, now a loud failure.
 */

import CartesianZone from './CartesianZone';
import type Place from '../../../lib/stuff/Place';
import type { EvictionContext } from '../../../lib/stuff/Stuff';
import type { VetoResult } from '../../../lib/errors';
import type { FieldMeta } from '../../../lib/mixin';

export default class MintedZone extends CartesianZone {
  /**
   * The warren ROW whose instances mint this zone's copies — the
   * declaration the minting warren asserts before it mints.
   */
  protected mintedBy: string = '';

  public getMintedBy(): string { return this.mintedBy; }
  public setMintedBy(value: string): void { this.mintedBy = value; }

  static fieldMeta: FieldMeta = {
    mintedBy: { persistent: true, authorable: true, ref: 'identity:kind' },
  };

  /**
   * Is this instance a copy (minted under an identity of its own), as
   * opposed to the row's own instance?
   */
  public isCopy(): boolean {
    const identity = this.getIdentityPath();
    return identity !== null && identity !== this.getTemplatePath();
  }

  /**
   * A room joins a COPY, never the row (D4). The row's own instance is
   * stood up for what is filed under the plan's folder; a room arriving
   * here is a room whose copy was not standing when it was cloned.
   */
  public override addLocation(
    location: Place,
    x: number = 0,
    y: number = 0,
    z: number = 0
  ): void {
    if (!this.isCopy()) {
      throw new Error(
        `MintedZone: '${this.getTemplatePath()}' is copied by ` +
          `'${this.mintedBy || '(undeclared)'}'; a room joins a copy, never the row ` +
          `(room '${location.getIdentityPath() ?? location.getTemplatePath()}').`
      );
    }
    super.addLocation(location, x, y, z);
  }

  /** A copy stays while it holds a room — its warren puts it to sleep. */
  public override canEvict(context: EvictionContext): VetoResult {
    if (this.getLocations().size > 0) {
      return { ok: false, reason: 'a copy holding rooms' };
    }
    return super.canEvict(context);
  }
}
