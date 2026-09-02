/**
 * Locality — a reified node in the addressing namespace that claims an
 * address subtree.
 *
 * A Locality is reference data, like `Biome` / `Material` / `Species`:
 * a leaf `Idea` that hangs off the template tree under `<root>/idea/Locality/`.
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

import { Idea } from '../../lib/stuff/Idea';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { AddressApi } from '../../api/address';
import type {
  ClimateLean,
  WeatherPin,
} from '../../lib/weather/WeatherType';
import type { FieldMeta } from '../../lib/mixin';

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

  /**
   * The Locality-tier authored weather pin (weather Wave 2 — the reserved
   * tier field). `{ type, mode }` or `null`. Covers this Locality's whole
   * address subtree; a scope-tier pin (`AtmosphericMixin._weatherPin`)
   * overrides it within a single room. Higher-precedence than the climate
   * lean; the procgen model never overrides it. A plain-object field —
   * round-trips as native JSON, no marshaller.
   */
  protected _weatherPin: WeatherPin | null = null;

  /**
   * The Locality-tier authored climate lean (weather Wave 2). A soft
   * multiplicative bias over the procgen distribution ("this region tends
   * snowy/grim") — distinct from, and lower-precedence than, a hard pin.
   * `null` (or an empty record) is neutral. Plain-object native JSON.
   */
  protected _climateLean: ClimateLean | null = null;

  /**
   * The third realized tier-level field (weather pin / climate lean
   * siblings): the durable `key` of the diegetic `Government` claiming
   * this Locality's subtree, or `null` (the common sparse case — the
   * chain inherits from shorter prefixes). Declared here — on the land
   * side, by the landowner-authored seed — never as a claims list on the
   * Government (consent-by-construction). Resolution is
   * `GovernmentApi`'s job.
   */
  protected _governmentKey: string | null = null;

  /**
   * ⭐ **The reach this locality sits on and drains to** — a citation
   * like `kestrel:confluence`, or `null`.
   *
   * The **one** field that is the connective tissue between localities,
   * and the whole of what the watershed asks of a place.
   *
   * The address tree and the watershed are two hierarchies, and
   * **their misalignment is the point.** The address tree is *political*
   * containment — `terminus` → `city` → `campus`, with `_governmentKey`
   * per locality. The watershed is *hydrological* ordering — Rejection
   * → Heart's Delight → Terminus. Terminus governs its own streets and
   * has no say over what Rejection puts in the water, which is the real
   * condition, and it is why a river authority is the one institution
   * that follows the second hierarchy while every other one follows the
   * first.
   *
   * ⚠ `null` is a normal state of the world, exactly as no government
   * is. A locality that declares no reach is off the watershed: it
   * resolves no upstream/downstream relation with anybody, which is a
   * different answer from "downstream of everything". Three localities
   * ship rootless today.
   *
   * Interpreting the citation is the `water` pack's job; the kernel just
   * carries the string, so the kernel never imports the pack.
   *
   * See [docs/subsystems/watershed.md].
   */
  protected _reach: string | null = null;

  /**
   * Square kilometres of ground draining to {@link _reach}, or `null`.
   *
   * Catchment is **declared per locality** rather than derived per
   * place: deriving it would mean integrating an area over a world made
   * of rooms, most of which are indoors. The declaration is what turns
   * the precipitation integral into a river.
   */
  protected _catchmentKm2: number | null = null;

  static fieldMeta: FieldMeta = {
    name: { persistent: true },
    _address: { persistent: true },
    _weatherPin: { persistent: true },
    _climateLean: { persistent: true },
    _governmentKey: { persistent: true },
    _reach: { persistent: true, authorable: true },
    _catchmentKm2: { persistent: true, authorable: true },
  };

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

  // ---------- weather pin (Locality tier) ----------

  public getWeatherPin(): WeatherPin | null {
    return this._weatherPin;
  }
  public setWeatherPin(value: WeatherPin | null): void {
    this._weatherPin = value;
  }

  // ---------- climate lean (Locality tier) ----------

  public getClimateLean(): ClimateLean | null {
    return this._climateLean;
  }
  public setClimateLean(value: ClimateLean | null): void {
    this._climateLean = value;
  }

  // ---------- government key (Locality tier) ----------

  public getGovernmentKey(): string | null {
    return this._governmentKey;
  }
  public setGovernmentKey(value: string | null): void {
    if (value !== null && typeof value !== 'string') {
      throw new TypeError('Locality._governmentKey must be a string or null');
    }
    const trimmed = value?.trim() ?? '';
    this._governmentKey = trimmed.length > 0 ? trimmed : null;
  }

  // ---------- the watershed declaration (D21) ----------

  /** The reach citation this locality drains to, or `null`. */
  public getReach(): string | null {
    return this._reach;
  }
  public setReach(value: string | null): void {
    if (value !== null && typeof value !== 'string') {
      throw new TypeError('Locality._reach must be a string or null');
    }
    const trimmed = value?.trim() ?? '';
    this._reach = trimmed.length > 0 ? trimmed : null;
  }

  /** Square kilometres draining to {@link getReach}, or `null`. */
  public getCatchmentKm2(): number | null {
    return this._catchmentKm2;
  }
  public setCatchmentKm2(value: number | null): void {
    this._catchmentKm2 =
      value === null || !Number.isFinite(value) || value < 0 ? null : value;
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
