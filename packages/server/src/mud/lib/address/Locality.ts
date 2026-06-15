/**
 * Locality — a reified node in the addressing namespace that claims an
 * address subtree.
 *
 * A Locality is reference data, like `Biome` / `Material` / `Species`:
 * a leaf `Idea` that hangs off the template tree under `/lib/address/`.
 * Its `_address` is a path in the addressing namespace
 * (`narnia`, `narnia/castle`) and that string **is** its coverage
 * prefix — a Locality claims everything at or under its node. The
 * `AddressApi` resolve-walk finds the covering Locality for a scope by
 * longest-prefix match against the set of claimed prefixes.
 *
 * **One concept, variable depth.** Whether a Locality plays the coarse
 * "Region" role (a realm / climate source — the shortest prefixes) or
 * a finer "settlement" role is authoring flavor (its `_address` depth
 * and which tier-level fields it carries), not a subclass. There are
 * no `Region` / `Block` / `Spot` classes.
 *
 * **Designated home for tier-level fields.** This unit ships only the
 * node + the resolve-walk. The deferred weather build hangs its
 * per-locality field (weather seed / overrides) here; the later
 * delivery build hangs provider-coverage refs here. Neither ships now.
 *
 * Like `Biome`, a Locality does NOT call `Stuff._registerTopLevelBranch`
 * (leaf Ideas aren't instance-tree roots) and does NOT compose
 * `SingletonMixin` (leaving room for future per-clone variance). It
 * DOES compose `PostRegistrationMixin` — unlike `Biome` — because the
 * `AddressRegistry` keeps a live coverage index and a Locality
 * self-registers into it (wired in the Api commit); `Biome` needs no
 * such hook because `BiomeApi` re-resolves on every read with no index.
 */

import { Idea } from '../stuff/Idea';
import { PostRegistrationMixin } from '../stuff/PostRegistration';
import { AddressApi } from '../../api/address';

export default class Locality extends PostRegistrationMixin(Idea) {
  /** Display name (e.g. `'Narnia'`, `'Cair Paravel'`). */
  protected name: string = '';

  /**
   * The claimed address prefix — this Locality's own address, which IS
   * its coverage prefix (no separate coverage field in v1). A path
   * string in the addressing namespace, independent of `templatePath`
   * and the zone tree. An empty string means "claims nothing" and is
   * skipped by the coverage index.
   */
  protected _address: string = '';

  static persistentFields = ['name', '_address'];

  // ---------- name ----------

  public getName(): string {
    return this.name;
  }
  public setName(value: string): void {
    this.name = value;
  }

  // ---------- claimed address prefix ----------

  public getAddress(): string {
    return this._address;
  }
  public setAddress(value: string): void {
    this._address = value;
  }

  // ---------- coverage-index lifecycle ----------

  /**
   * Self-register the claimed prefix into the `AddressRegistry`
   * coverage index. Fires once on clone (leaf Ideas clone lazily), and
   * again on HMR re-clone, so the index never holds a stale node. The
   * Registry's own boot rebuild covers never-accessed Localities.
   */
  public override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister(context);
    if (this._address.length > 0) AddressApi.registerLocality(this);
  }

  /** Deregister from the coverage index on destruct / HMR re-clone. */
  public override onDestruct(): void {
    AddressApi.deregisterLocality(this);
    super.onDestruct();
  }
}
