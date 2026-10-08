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
 * DOES override `onCreate` — unlike `Biome` — because the
 * `AddressRegistry` keeps a live coverage index and a Locality
 * self-registers into it (wired in the Api commit); `Biome` needs no
 * such hook because `BiomeApi` re-resolves on every read with no index.
 */

import { Idea } from '../../lib/stuff/Idea';
import { AddressApi } from '../../api/address';
import type {
  ClimateLean,
  WeatherPin,
} from '../../lib/weather/WeatherType';
import type { FieldMeta } from '../../lib/mixin';
import { BankingApi } from '../../api/banking';
import { Money } from '../../lib/banking/Money';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { GovernmentApi } from '../../api/government';
import { EmploymentApi } from '../../api/employment';
import type { StreetLightingSupply } from '../../lib/supply/SupplyState';
import type { Business } from './Business';
import type { Stuff } from '../../lib/stuff/Stuff';

import type { BoundaryRole } from '../../lib/security/BoundaryRole';
/** Seconds in a game day — the night index `settleStreetLighting` keys on. */
const DAY_SECONDS = 86_400;

/** The currency a lighting bill defaults to when a row names none. */
const DEFAULT_CURRENCY = 'credit';

/**
 * The realm treasury's owner path — the fallback source for an appropriation
 * when a locality declares no treasury of its own. Matches
 * `BankingLogic.TREASURY_PATH`; the kernel names it by string, never imports.
 */
const TREASURY_OWNER_PATH = '/compact/treasury';

/**
 * ⭐⭐ **What a town's street lighting costs it, and who it pays.** One
 * figure in one place — see {@link Locality.settleStreetLighting}.
 *
 * ⚠ Note what is NOT here: a list of streets, or a count of lamps. A
 * town does not track lamps; the streets declare the service and their
 * own place in the queue, and the extent declares what a street-night
 * costs and where the money goes.
 */
export interface PublicLightingFunding {
  /**
   * **Minor units** per street per night — a PRICE, and the name says so
   * now.
   *
   * ⚠⚠ It was `fuelPerStreetNight`, which named a quantity and held
   * money. Renamed at review (2026-09-25) for one reason: the energy
   * build is next and it will want a genuine *fuel* figure per
   * street-night — litres of oil — so that name has to be free and
   * true when it gets there. A field whose name lies is the kind of
   * thing a later build reads once and trusts.
   */
  costPerStreetNight: number;
  /**
   * ⭐ **Litres of fuel burned per street per night** — the goods leg the
   * name always promised. When {@link supply} names a physical store, the
   * settle drains this many litres from it per covered street; when it names
   * the grid, it is ignored (a wire consumes no litres). Absent/`0` on a
   * money-only or electric locality.
   *
   * The name was freed for exactly this by envelope (the money figure moved
   * to {@link costPerStreetNight}); the energy build makes it true.
   */
  fuelPerStreetNight?: number;
  /**
   * ⭐⭐ **The goods leg**: the template path of the thing that actually
   * keeps the streets lit — a `/system/energy/thing/FuelStore` (oil it
   * burns) or `/system/energy/idea/GridCatalogue` (a wire it energizes),
   * resolved by `StuffApi.singleton` and narrowed to the
   * {@link StreetLightingSupply} shape. `undefined` = the legacy money-only
   * path (envelope's behaviour, preserved: money moves, nothing is
   * consumed).
   *
   * When set, the settle asks it `lightStreets(candidates, nowS)` and lights
   * exactly what it covers — so a town that has run out of oil, or a stretch
   * whose feeder is cut, goes dark the same way a short treasury already
   * darkens the junior streets.
   */
  supply?: string;
  /**
   * The Business path a money bill is paid to (`null` = none).
   *
   * ⚠ Now genuinely optional. An oil-lit town pays for its light through the
   * **procurement loop** (its public-works department buys casks from a
   * producer), not through this leg, so it sets `costPerStreetNight: 0` and
   * leaves this `null`; an electric town's own lamps cost it nothing. The
   * money leg fires only when `costPerStreetNight > 0` and a `supplier` is
   * named — the pure-transfer path (Terminus, until it migrates to the grid).
   */
  supplier: string | null;
  /** The currency the bill is denominated in. Defaults to `credit`. */
  currency?: string;
}

export default class Locality extends Idea {
  /**
   * ⭐ NEW: nobody holds title to *terminus/city* as a thing, and `AddressApi.resolveLocalityFor` is on the Cartographer's own write path — a governed eval was denied reading it.
   *
   * See `lib/security/BoundaryRole.ts` — this replaces a
   * hand-maintained list in `api/security.ts` /
   * `BootstrapManager`, and `lint:boundary-roles` holds the
   * `commons` census at its measured ceiling.
   */
  static boundaryRole: BoundaryRole = 'commons';

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

  /**
   * ⭐⭐ **The town's street-lighting service** — the fuel bill and who
   * supplies it — or `null` for an extent that lights nothing.
   *
   * One figure in one place, and that is the design rather than a
   * simplification: *a town does not track lamps. It funds a service,
   * and finds out it is short when the streets go dark.* Which streets
   * exist and in what order they are lit is the STREETS' business
   * (`PublicLightingMixin.seniority`); what it costs a night and who
   * gets paid is the extent's.
   */
  protected _publicLighting: PublicLightingFunding | null = null;

  /**
   * Runtime: the day index this extent last settled its lighting for.
   * `-1` = never. Persisted so a reboot mid-evening does not re-bill
   * the treasury for a night it already paid.
   */
  protected _lightingNight: number = -1;

  /**
   * Runtime: the template paths this extent's money is lighting
   * TONIGHT, in seniority order, as far as the treasury went.
   */
  protected _lightingLitStreets: string[] = [];

  /**
   * Runtime: how the supply that lit the streets tonight reads — *"burning
   * the town's oil"*, *"fed from the Wharfside line"* — or `null` (money-only
   * / never settled). The street's lamp detail appends it, so the epoch is
   * derived off a lamp rather than flagged.
   */
  protected _lightingSourceLabel: string | null = null;

  static fieldMeta: FieldMeta = {
    name: { persistent: true },
    _address: { persistent: true },
    _weatherPin: { persistent: true },
    _climateLean: { persistent: true },
    _governmentKey: { persistent: true },
    _reach: { persistent: true, authorable: true },
    _catchmentKm2: { persistent: true, authorable: true },
    _publicLighting: { persistent: true, authorable: true },
    _lightingNight: { persistent: true, runtimeState: true },
    _lightingLitStreets: { persistent: true, runtimeState: true },
    _lightingSourceLabel: { persistent: true, runtimeState: true },
  };

  // ---------- public lighting ----------

  public getPublicLightingFunding(): PublicLightingFunding | null {
    return this._publicLighting;
  }

  /**
   * Is this extent's service lighting `streetPath` tonight?
   *
   * ⭐ Two conditions: it was settled as lit at dusk, **and** its supply is
   * still reaching it right now. The second is what makes a cut line or a
   * drained store darken the street the same second (`isServingNow` is sync
   * and live) rather than at the next settle. A money-only locality names no
   * supply, so the second condition is vacuously true — envelope's behaviour.
   */
  public isStreetLitTonight(streetPath: string): boolean {
    if (!this._lightingLitStreets.includes(streetPath)) return false;
    const supply = this.liveSupply();
    return supply === null ? true : supply.isServingNow(streetPath);
  }

  /** The streets this extent is lighting tonight, in seniority order. */
  public getLitStreets(): readonly string[] {
    return this._lightingLitStreets;
  }

  /** How tonight's lit lamps read (the derived epoch), or `null`. */
  public getLightingSourceLabel(): string | null {
    return this._lightingSourceLabel;
  }

  /**
   * The live supply object, resolved sync from `_publicLighting.supply`, or
   * `null` (money-only, or not yet stood up). Sync because
   * {@link isStreetLitTonight} is on the vision walk; a supply that has not
   * been stood up yet reads as "not serving", which the next settle fixes.
   */
  private liveSupply(): StreetLightingSupply | null {
    const path = this._publicLighting?.supply;
    if (!path) return null;
    const inst = StuffApi.findByTemplatePath(path) as
      | (Stuff & Partial<StreetLightingSupply>)
      | null;
    if (!inst || typeof inst.isServingNow !== 'function') return null;
    return inst as unknown as StreetLightingSupply;
  }

  /**
   * ⭐⭐ **Settle tonight's street lighting**: work out how many streets
   * the treasury can cover, pay for them, and record which.
   *
   * The whole civic shape in one method, and every part of it is the
   * honest form rather than a simplification:
   *
   *  - **The order is written in ADVANCE.** Streets are lit by
   *    `seniority`, recorded on each street's own row. Nobody is judged
   *    at the moment of refusal, because the decision was made before
   *    anybody knew there would be a shortfall — the watershed's rule
   *    for a quota (*"the quota rides the right, ordered by a seniority
   *    recorded in advance"*), applied to a service.
   *  - **`n` is computed from the balance FIRST**, so the refusal is
   *    the exception rather than the path. A treasury holding less than
   *    one street-night lights nothing, and `look at the lamps` says so.
   *  - **The goods leg** (energy build): when the funding names a `supply`,
   *    the settle asks it `lightStreets` and lights exactly what it covers —
   *    a `FuelStore` burns oil and runs dry, a `GridCatalogue` returns the
   *    energized subset. A money-only locality names no supply and behaves
   *    as envelope shipped it.
   *  - **At most one appropriation leg per night**, for `n × cost`, through
   *    the SHIPPED `BankingApi.appropriate`, and only when `costPerStreetNight
   *    > 0` and a `supplier` is named — sourced from **this locality's own
   *    treasury** when it declares one, else the realm's ({@link
   *    resolveTreasury}), destination the supplier's primary account, category
   *    `appropriation`. An oil-lit town sets cost 0 and pays through
   *    procurement instead; an electric town's own lamps cost it nothing.
   */
  public async settleStreetLighting(
    nowS: number,
    candidates: readonly string[],
  ): Promise<void> {
    const funding = this._publicLighting;
    if (funding === null) return;

    const night = Math.floor(nowS / DAY_SECONDS);
    if (this._lightingNight === night) return; // already paid tonight

    this._lightingNight = night;
    this._lightingLitStreets = [];
    this._lightingSourceLabel = null;
    if (candidates.length === 0) return;

    const currency = funding.currency ?? DEFAULT_CURRENCY;
    const cost = funding.costPerStreetNight ?? 0;

    // ── The goods leg (D10): how many can the supply physically cover
    // tonight? A `FuelStore` burns oil per street and runs dry; a
    // `GridCatalogue` returns the energized subset. `null` = money-only
    // (envelope's behaviour — nothing is consumed, everything is
    // affordable-limited).
    let covered: readonly string[] | null = null;
    const supply = await this.resolveSupply();
    if (supply !== null) {
      try {
        covered = await supply.lightStreets(candidates, nowS);
        this._lightingSourceLabel = supply.lightingSourceLabel?.() ?? null;
      } catch {
        covered = []; // a broken supply lights nothing — the streets say so
      }
    }

    // ── The money leg (D12): how many can the treasury afford? Only when a
    // per-night cost is set (an oil-lit town pays through procurement, not
    // here). Sourced from the locality's own treasury, else the realm's.
    let affordable = candidates.length;
    let treasury: { ownerPath: string; accountId: string } | null = null;
    if (cost > 0) {
      try {
        treasury = await this.resolveTreasury(currency);
        const balance = BankingApi.balanceOf(treasury.accountId);
        affordable = Math.floor(balance.minor / cost);
      } catch {
        affordable = 0; // no treasury, no light — and the street says so
      }
    }

    let n = candidates.length;
    if (covered !== null) n = Math.min(n, covered.length);
    n = Math.min(n, Math.max(0, affordable));
    if (n <= 0) return;

    const supplier = funding.supplier;
    if (cost > 0 && supplier) {
      try {
        await BankingApi.appropriate(
          supplier,
          Money.of(n * cost, currency),
          `street lighting, ${this.name || this._address}: ${n} street-night(s)`,
          treasury ? { fromOwnerPath: treasury.ownerPath } : undefined,
        );
      } catch {
        // The shipped refusal (the treasury went short between the read
        // and the post). Nothing is lit, and that is the failure mode
        // the requirements asked for rather than one this build wrote.
        return;
      }
    }

    this._lightingLitStreets = (covered ?? candidates).slice(0, n);
  }

  /**
   * Resolve the goods-leg supply object named by `_publicLighting.supply`,
   * narrowed to {@link StreetLightingSupply}, standing it up if needed
   * (`StuffApi.singleton` — a `FuelStore` self-places by its `container:`, a
   * `GridCatalogue` is a singleton Idea). `null` for a money-only locality.
   */
  private async resolveSupply(): Promise<StreetLightingSupply | null> {
    const path = this._publicLighting?.supply;
    if (!path) return null;
    try {
      const inst = (await StuffApi.singleton(path)) as unknown as
        | (Stuff & Partial<StreetLightingSupply>)
        | null;
      if (!inst || typeof inst.lightStreets !== 'function') return null;
      return inst as unknown as StreetLightingSupply;
    } catch {
      return null;
    }
  }

  /**
   * ⭐ **This locality's treasury** — its own if it declares a government
   * with one, else the realm's (envelope's behaviour). Walks the government
   * chain covering this extent's address for the first descriptor naming a
   * `treasury` Business, stands that Business up, and resolves its operating
   * account. Returns both the owner path (for `appropriate`'s source) and the
   * account id (for the balance read).
   */
  public async resolveTreasury(
    currency: string,
  ): Promise<{ ownerPath: string; accountId: string; own: boolean }> {
    let chain: ReturnType<typeof GovernmentApi.governmentChainAt> = [];
    try {
      chain = this._address
        ? GovernmentApi.governmentChainAt(this._address)
        : [];
    } catch {
      chain = []; // no government registry (a test / early boot) → the realm
    }
    for (const gov of chain) {
      const tpath = gov.treasury?.trim();
      if (!tpath) continue;
      try {
        const inst = await StuffApi.singleton(tpath);
        if (MixinApi.isBusiness(inst)) {
          const accountId = await EmploymentApi.operatingAccountOf(
            inst as Stuff & Business,
          );
          return { ownerPath: tpath, accountId, own: true };
        }
      } catch {
        // A broken treasury row falls through to the realm — the streets
        // still light from the realm rather than the whole realm's evening
        // going dark on one town's bad reference.
      }
    }
    const accountId = await BankingApi.treasuryAccountId(currency);
    return { ownerPath: TREASURY_OWNER_PATH, accountId, own: false };
  }

  /**
   * This locality's **own** treasury account, or `null` when it has none
   * (the realm's does not count). The tax-split income side asks this: a
   * locality with no treasury of its own simply gets no share of a sale.
   */
  public async ownTreasuryAccountId(
    currency: string,
  ): Promise<string | null> {
    const t = await this.resolveTreasury(currency);
    return t.own ? t.accountId : null;
  }

  /**
   * ⚠ Why the streets are HANDED IN rather than looked up here.
   *
   * Finding them means a registry-wide read (`StuffApi.findByMixin`),
   * which is gated to a reviewed `(template, method)` allowlist — *being
   * handed a slice of the world has to be asked for by name*. That read
   * belongs in the address tier, where "what does this extent cover" is
   * already the subject, and it is one walk for the whole realm per
   * game night rather than one per locality.
   *
   * What stays here is the part that is actually the extent's: the
   * order, the money, and the record of what it lit.
   *
   * ⚠ A street evicted at settle time is not billed for and reads cold
   * when it reloads. Recorded, acceptable: the residency sweep only
   * reaches the cold tail, and a street nobody has been near all day is
   * one nobody will see unlit tonight either.
   */

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
  public override async onCreate(context?: unknown): Promise<void> {
    await super.onCreate(context);
    if (this._address.length > 0) AddressApi.registerLocality(this);
  }

  /** Deregister from the coverage index on destruct / HMR re-clone. */
  public override onDestruct(): void {
    AddressApi.deregisterLocality(this);
    super.onDestruct();
  }
}
