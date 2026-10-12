/**
 * WireZone — **a namespace root of the wire** (the sandbox build,
 * Decision O): `/studio` is one, and `/home` is its `HomeZone` subclass.
 *
 * It carries the one field that classifies a path as wire: `wire: true`
 * on the root, inherited by every descendant through the ordinary
 * `lookupField` walk — so "is this path wire?" is
 * `await zone.lookupField<boolean>('wire')`, data resolved by a mechanism
 * that already exists, never a hardcoded prefix list and never an
 * `instanceof`. A third wire root is a row of this class, not an edit to
 * the containment layers.
 *
 * ⚠ The field lived on `Zone` until the climate build's review, which
 * offered `wire` in the studio for every zone in the game — a district, a
 * clade, the wiki. Only a namespace root of the wire ever declares it.
 *
 * ⚠ It HAS to be a declared field: it has an accessor pair, so the
 * applier only reaches it by name — and a `wire: true` row that silently
 * doesn't apply reads as "not wire", which routes quarantined code down
 * the governed path (found live: `eval` inside a circle ran GOVERNED).
 */

import { Zone } from '../../lib/zone/Zone';
import type { FieldMeta } from '../../lib/mixin';

export default class WireZone extends Zone {
  static fieldMeta: FieldMeta = {
    wire: { persistent: true },
  };

  /** `true` on a wire root; `null` = not declared here (walk further). */
  protected wire: boolean | null = null;

  public getWire(): boolean | null { return this.wire; }
  public setWire(value: boolean): void { this.wire = value; }
}
