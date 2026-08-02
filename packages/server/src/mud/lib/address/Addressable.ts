/**
 * AddressableMixin — the optional address declaration for a place.
 *
 * Composing this mixin says: "this Stuff can declare a position in the
 * addressing namespace." The declaration is a plain path string
 * (`narnia/castle/east-wing`) — a node in the rooted address tree,
 * deliberately independent of `templatePath` and the zone tree (a
 * mailing address is not a filesystem path). Sparse: `null` is the
 * normal "no declared address" case and costs a single field.
 *
 * **Resolution is NOT this mixin's job.** Unlike `AtmosphericMixin`'s
 * `getBiome()` (which resolves a ref to a `Biome`), `getAddress()`
 * returns the raw declared string. Turning an address into a covering
 * `Locality` is the `AddressApi` resolve-walk's responsibility — it
 * reads `_address` off ancestors directly during the
 * containment-outward walk. That direct read is the same chain-walker
 * carve-out `AtmosphericMixin._biomePath` documents (the API layer is
 * the one external reader of the field, parallel to the Hydrator's
 * reflection into persistent fields).
 *
 * Composed onto `Location`. A future Vessel-carries-an-address case
 * composes the same mixin — which is why the field lives here, not as
 * a bare field on `Location`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

export interface Addressable {
  /** The host's declared address, or `null` when none is declared. */
  getAddress(): string | null;
  /** Declare (or, with `null`, clear) the host's address. */
  setAddress(value: string | null): void;

  // ---------- storage — public so the AddressApi walker can read ----------
  // The resolve-walk reads `_address` off ancestor hosts directly. Per
  // CLAUDE.md "Inter-Stuff Contract" this chain-walker reach is the
  // API-layer carve-out (same shape as `AtmosphericMixin._biomePath`).
  _address: string | null;
}

export function AddressableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class AddressableMixin extends Base implements Addressable {
    static _mixinName = 'AddressableMixin';

    static fieldMeta: FieldMeta = {
      _address: { persistent: true },
    };

    /**
     * Declared address path in the namespace, or `null`. Sparse —
     * `null` is the common case and the resolve-walk falls through it
     * to a containment ancestor or the spatial zone.
     * @authorable ref:Template
     */
    public _address: string | null = null;

    public getAddress(): string | null {
      return this._address;
    }

    public setAddress(value: string | null): void {
      this._address = value;
    }
  };
}
