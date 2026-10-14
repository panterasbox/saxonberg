/**
 * SpatialZone — abstract intermediate layering location-aware behavior on Zone.
 *
 * The bare `Zone` is a scope/folder unit (templates use Zone-class folders to
 * carry policy that descendants inherit). `SpatialZone` adds the REGION: the
 * fields only a place in space can carry (what it stocks, its address, the
 * ground under it, what can be seen from it).
 *
 * ⭐ It does NOT hold rooms. That half is `LocationZoneMixin`
 * (`lib/zone/LocationZone.ts`), composed by `CartesianZone` and
 * `SphericalZone`; an `Expanse` (`lib/expanse/Expanse.ts`) is a region in
 * space whose points of interest are Ideas, and it composes no Location
 * half. Until the maritime build the two were one class, which made every
 * future frame inherit a room set it had to guard against.
 *
 * Non-spatial Zone subclasses (`Clade`, future permission-grouping zones,
 * future runtime-rule scopes) extend bare `Zone`. They reuse the
 * folder-of-templates contract without inheriting location-aware behavior.
 */
import { Zone } from './Zone';
import type { FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type Structure from '../../platform/idea/Structure';
import { StuffApi } from '../../api/stuff';
import {
  DEFAULT_CLIMATE_SITE,
  type ClimateSite,
} from '../weather/WeatherType';
import type { BlessingOdds } from '../magic/Blessing';
import type { CelestialProfile } from '../time/CelestialProfile';
import { Suppressions } from '../magic/Suppression';
import type { MagicSuppression } from '../magic/Suppression';

/**
 * Abstract base for every region in space: the room-holding zones
 * (`CartesianZone`, `SphericalZone`, via `LocationZoneMixin`) and the
 * frames that hold no rooms (`Expanse`).
 */
export abstract class SpatialZone extends Zone {
  /**
   * The region fields the spawn sweep reads, all three off the ordinary
   * `lookupField` walk so a parent region's declaration covers its
   * descendants and a child can narrow it.
   *
   * ⭐ They are declared HERE, not on `Zone`, and that is the point: only
   * a region **in space** can stock goods. A `FolderZone` is a namespace
   * root (`/wiki`, `/home`, `/studio`) and "how many bottles of vodka
   * stand in the wiki namespace" is not a question — but an `authorable`
   * field on the base offers exactly that, for every zone in the game, in
   * the studio's composition panel. Behaviour is unchanged either way:
   * `lookupField` consults ancestors, so a zone that does not declare
   * them walks on and the reader takes its empty default.
   */
  static fieldMeta: FieldMeta = {
    stocks: { persistent: true, authorable: true },
    favours: { persistent: true, authorable: true },
    blessingOdds: { persistent: true, authorable: true },
    address: { persistent: true, authorable: true },
    // ⭐ Two CITATIONS the kernel stores and does not interpret: each
    // names a `/system/ground` model (`Deposit`, `GroundCharacter`) that
    // the kernel cannot import. They are declared here — on a kernel class
    // — because a pack cannot add a field to one: the hydrator silently
    // discards what no `fieldMeta` declares, and that is exactly how the
    // authored soil layer shipped unreachable the first time. Since the
    // ground build a `Floor` on grade follows them through
    // `GroundSourceMixin`, which is the seam that lets the kernel ask a
    // question it cannot import the answer to.
    deposit: { persistent: true, authorable: true },
    groundCharacter: { persistent: true, authorable: true },
    celestialProfile: { persistent: true, authorable: true },
    suppressesMagic: { persistent: true, authorable: true },
    horizon: { persistent: true, authorable: true },
    // ⭐ The Structures standing in this region — an INSTRUCTION, applied
    // as `props:` is: loading the zone loads them (`applyStructures`).
    structures: { instruction: true, authorable: true },
    // ⭐ The region's GEOGRAPHY (the water and climate builds): where on
    // the world it is. On `Zone` until the climate build's review, which
    // offered a latitude to `/wiki` and to Animalia — see the block at
    // the end of this class.
    elevation: { persistent: true, authorable: true },
    latitude: { persistent: true, authorable: true },
    continentality: { persistent: true, authorable: true },
    climateOffsetK: { persistent: true, authorable: true },
  };

  /**
   * What this region STOCKS: census key → target count, the zone-side
   * override of a floor row's own `regionTarget` (`ResidencyLogic` reads
   * it through `lookupField('stocks')`). `null` = not declared here. A
   * distillery's yard authors `{ 'spirit:vodka': 24 }` and the spawn
   * sweep stands the floor at that count; a `0` means "none of that here".
   */
  protected stocks: Record<string, number> | null = null;

  public getStocks(): Record<string, number> | null { return this.stocks; }
  public setStocks(value: Record<string, number> | null): void { this.stocks = value; }

  /**
   * Material tags this region FAVOURS (place affinity — a mine stocks
   * metal, a grove wood): the spawn table's second multiplier
   * (`SpawnTable.weightFor` multiplies rarity by it), read by the same
   * walk. `null` = not declared here.
   */
  protected favours: string[] | null = null;

  public getFavours(): string[] | null { return this.favours; }
  public setFavours(value: string[] | null): void { this.favours = value; }

  /**
   * BUC weights this region imposes, overriding an item's own generation
   * odds zone-wide — *this PLACE is like that*
   * ([magic-items.md](../../../../docs/subsystems/magic-items.md)).
   *
   * ⚠ `ResidencyLogic` has read this through `lookupField('blessingOdds')`
   * since the magic-items build, but **no Zone class declared it**, so the
   * applier silently dropped any authored zone-level value and the
   * documented override could never fire — the same silent-drop bug
   * `stocks`/`favours` had. Declared here with them. Nothing ships an
   * authored zone value yet; the item-level field is a different one, on
   * the item.
   */
  protected blessingOdds: BlessingOdds | null = null;

  public getBlessingOdds(): BlessingOdds | null { return this.blessingOdds; }
  public setBlessingOdds(value: BlessingOdds | null): void { this.blessingOdds = value; }

  /**
   * ⭐ **The address this region sits at** — `terminus/rejection`, or
   * `null` to walk on.
   *
   * `AddressLogic.resolveAddressString` has always had this as its step
   * 2: walk containment-outward for a place declaring its own address,
   * and failing that ask the zone. ⚠⚠ **Step 2 could never fire.** No
   * zone class declared `address` in `fieldMeta`, so an authored value
   * was silently discarded by the hydrator and `lookupField('address')`
   * always answered `null` — the documented `source: 'zone'` was an
   * unreachable branch of a shipped enum. Declaring it here is the whole
   * fix; the resolver is unchanged.
   *
   * ⭐ It is the reason the field belongs on a ZONE rather than on each
   * room. A locality is a region, and its rooms are in it — so one
   * declaration on the region covers every room the zone walk reaches,
   * including **minted** ones, which can never declare anything for
   * themselves. Hinkley authors `_address` on two rooms and the rest of
   * the suburb resolves nothing; a mine that grows new workings at
   * runtime cannot use that pattern at all.
   *
   * ⚠ On `SpatialZone` and not on `Zone`, for the same reason
   * `stocks`/`favours` are: a `FolderZone` is a namespace root, and
   * *"what is the street address of `/wiki`"* is not a question.
   */
  protected address: string | null = null;

  public getAddress(): string | null { return this.address; }
  public setAddress(value: string | null): void { this.address = value ?? null; }

  /**
   * ⭐ **The `Deposit` row governing the ground under this region**, or
   * `null` to walk on.
   *
   * The ground model — stratigraphy, water table, the lode and its
   * gangue — is a property of the LAND, in exactly the sense elevation
   * is. So it is inherited by the ordinary `lookupField` walk, and a
   * declaration on a region covers the surface outcrop and the workings
   * beneath it alike: the outcrop, the float and the three-point problem
   * are all played above ground, so a deposit declared only on a mine's
   * own zone would leave a prospector standing on the stain with nothing
   * to measure.
   *
   * ⚠⚠ **This replaces `trade-mining`'s `MineZone`, and the deletion is
   * the point.** A pack cannot add a field to a kernel class — the
   * failure is silent, and it cost a live drive to find — so mining
   * shipped a `CartesianZone` subclass carrying this one field. But then
   * the zone covering a whole town had to be classed `MineZone`, which
   * said *this town is a mine*. It is not: Rejection is the town, the
   * Ferrow is the orebody, and the diggings are the workings on it. A
   * region that declares what is under it is not thereby a mine.
   *
   * ⭐ The string is **opaque to the kernel** — it is interpreted by
   * whichever pack owns the `Deposit` class, exactly as `Locality._reach`
   * carries a watercourse citation the kernel never resolves. Carrying a
   * citation is not importing a concept.
   */
  protected deposit: string | null = null;

  public getDeposit(): string | null { return this.deposit; }
  public setDeposit(value: string | null): void { this.deposit = value ?? null; }

  /**
   * ⭐ **The `GroundCharacter` row governing the SOIL over this region**,
   * or `null` to walk on. `deposit`'s sibling, one layer up: the same
   * land, read by the farmer instead of the miner.
   *
   * ⚠⚠ **It is declared here for the reason `deposit` is, and the reason
   * is a defect this build repeated.** A pack cannot add a field to a
   * kernel class and the failure is SILENT — the hydrator discards what
   * no `fieldMeta` declares, `lookupField` then answers `null` forever,
   * and the authored half of a three-layer model becomes an unreachable
   * branch that every test still passes because tests hand the model in
   * directly. Mining paid for that lesson with a live drive; farming
   * shipped `zone.lookupField('groundCharacter')` against nothing and
   * cost a second one.
   *
   * ⭐ Soil is a property of the LAND, so the ordinary ancestor walk is
   * the right carrier: a farm's own zone declares its ground, or a
   * region declares the ground under a whole valley and every field cut
   * in it inherits the same clay.
   *
   * The string is **opaque to the kernel** — `trade-farming` owns the
   * `GroundCharacter` class and the fold that reads it. Carrying a
   * citation is not importing a concept.
   */
  protected groundCharacter: string | null = null;

  public getGroundCharacter(): string | null { return this.groundCharacter; }
  public setGroundCharacter(value: string | null): void {
    this.groundCharacter = value ?? null;
  }

  /**
   * ⚠⚠ **Two more that were never declared, and the gate that found
   * them.** Both are documented, shipped read paths — `CelestialLogic`
   * asks `lookupField('celestialProfile')` and `MagicLogic` asks
   * `lookupField('suppressesMagic')`, the second being the region-scale
   * ward magic.md describes — and until now **no zone class declared
   * either**, so both walks answered `null` for every zone in the game
   * and no author could have made them do otherwise.
   *
   * `suppressesMagic` is declared on `Location`, which is why it looked
   * fine: a ROOM can carry a ward, and the region-scale one the doc
   * promises was the unreachable half.
   *
   * ⭐ They were found by asking the question from the reader's end —
   * *every name any code looks up must be declared somewhere* — after
   * `groundCharacter` made it three. That check is
   * `SpatialZone.authoredFields.test.ts`.
   */
  protected celestialProfile: CelestialProfile | null = null;

  public getCelestialProfile(): CelestialProfile | null {
    return this.celestialProfile;
  }
  public setCelestialProfile(value: CelestialProfile | null): void {
    this.celestialProfile = value ?? null;
  }

  /** The region-scale anti-magic field, or `null`. See above. */
  protected suppressesMagic: MagicSuppression | null = null;

  public getSuppressesMagic(): MagicSuppression | null {
    return this.suppressesMagic;
  }
  public setSuppressesMagic(value: MagicSuppression | null): void {
    // Per-field invariant on the setter, exactly as `Location` has it:
    // `Suppressions.validate` throws on a bad verbs/nouns filter.
    this.suppressesMagic = Suppressions.validate(value);
  }

  /**
   * ⭐ **The ZONES scanned from here** — `look horizon`'s authority
   * (maritime R3): template paths of zones whose Structures may be in
   * view, or `null` to walk on up the tree.
   *
   * Zones, because a zone is an authorial partition — whoever owns it owns
   * everything in it — so naming one says *what over there may be seen*
   * without naming every tower in it. One declaration on the avenue covers
   * every room in it; a nested zone or a room narrows it; an authored `[]`
   * is an answer — *nothing from in here* — and stops the walk.
   *
   * ⭐ WHETHER a structure in a named zone is in view is derived, never
   * authored: the viewer's room must be open to the sky, and its height
   * must clear the distance the zones' size in metres implies
   * (`PerceptionApi.horizonFor`). At sea nothing is named at all — the
   * range is computed from two heights (`Expanse.contactsFrom`).
   */
  protected horizon: string[] | null = null;

  public getHorizon(): string[] | null { return this.horizon; }
  public setHorizon(value: string[] | null): void {
    this.horizon = Array.isArray(value) ? value.map((p) => String(p)) : null;
  }

  /**
   * ⭐ **The Structures standing in this region** (maritime review,
   * 2026-10-14 — replaces a boot-warmed catalogue of every structure row).
   * Nothing is loaded at boot and nothing is found by searching: a zone
   * NAMES what stands in it, and loading the zone loads them, exactly as a
   * room's `props:` load with the room. So the clock tower exists once
   * somebody is in the terminal's zone or can see into it, the Hesper once
   * somebody is aboard or on her sea, and never before.
   *
   * Kicked, never awaited, here: a ship standing up reaches back for the
   * sea it sails on, and a sea that awaited its ships inside its own load
   * would wait on itself. A caller that must have them awaits
   * {@link structuresLoaded}; a synchronous reader sees whichever are up.
   */
  private structurePaths: string[] = [];
  private structuresLoading: Promise<void> | null = null;

  public async applyStructures(paths: string[] | null): Promise<void> {
    this.structurePaths = Array.isArray(paths) ? paths.map((p) => String(p)) : [];
    const run = Promise.all(
      this.structurePaths.map((p) =>
        StuffApi.singleton<Stuff>(p).catch((err) => {
          console.warn(`SpatialZone: '${this.getTemplatePath() ?? '?'}' names structure '${p}', which did not stand up:`, err);
          return null;
        }),
      ),
    ).then(() => undefined);
    this.structuresLoading = run;
  }

  /** Resolves once every structure this zone names has been stood up. */
  public structuresLoaded(): Promise<void> {
    return this.structuresLoading ?? Promise.resolve();
  }

  /** The named structures that are standing now. */
  public getStructures(): Structure[] {
    const out: Structure[] = [];
    for (const p of this.structurePaths) {
      const s = StuffApi.findByTemplatePath<Structure>(p);
      if (s && !s.isDestroyed()) out.push(s);
    }
    return out;
  }

  /**
   * The standing structure in this zone that `locationPath` is a member
   * of — the innermost (longest extent) when one stands inside another, a
   * wing in a mansion — or `null`.
   */
  public structureOf(locationPath: string): Structure | null {
    let best: Structure | null = null;
    for (const s of this.getStructures()) {
      if (!s.hasMember(locationPath)) continue;
      if (best === null || s.getExtent().length > best.getExtent().length) best = s;
    }
    return best;
  }

  /**
   * This zone's span in metres, or `null` when it cannot say — what the
   * horizon reads as distance (maritime R4). The frame knows no geometry;
   * a gridded zone derives it from its cell size and its rooms.
   */
  public getExtentM(): number | null {
    return null;
  }

  // ─────────────────────────── geography ────────────────────────────
  //
  // ⭐ Where on the world this region is. Declared HERE, the region in
  // space, and not on `Zone` — every zone flavour inherits `Zone`, so a
  // field there is offered for a `FolderZone`, a `Clade` and the
  // `HomeZone`, none of which has a height or a latitude. A region with
  // no rooms of its own that only carries geography for the districts
  // below it (Terminus, the city's ground) is a spatial zone holding no
  // rooms. The inheritance walk reads a field by NAME on each ancestor,
  // so a room under a `FolderZone` under a region still inherits it.

  /**
   * **Height above sea level, in metres** — the watershed's organising
   * input, and the one field water's whole behaviour is derived from.
   *
   * Inherited through the ordinary `lookupField` walk, so a district
   * declares its own and a room inside it needs say nothing; an authored
   * value anywhere in the chain wins over anything above it. `null` =
   * not declared here (walk further).
   *
   * ## Why the ZONE, and not the biome
   *
   * The zone already owns spatial geometry (`cellSize` drives volume,
   * light-scale and extent) and already does field inheritance. Biome
   * owns properties of the **air**; elevation is a property of the
   * **ground**.
   *
   * ⭐ But the decisive reason is a **circularity**. `measure altitude`
   * computes `(P_sea − P_local) / (ρ·g)` from the biome chain's authored
   * `_pressure` — so before this field, altitude was back-computed from
   * a number an author typed, and putting elevation on the biome too
   * would have given one physical fact two sources of truth. Elevation
   * on the zone makes pressure the *consequence* (see
   * `BiomeLogic`'s derive-from-elevation fallback) and the altimeter an
   * honest instrument: it reads a cause rather than its own input.
   *
   * ## ⚠ `coords.z` is NOT elevation
   *
   * `z` is local, and measured in zone **cells** — which floor of a
   * building you are on. A place's height above the ground is
   * `zone elevation + z × cellSize`; **hydrology reads the zone**, so a
   * third-floor flat and the lobby are the same point on the watershed.
   * A stairwell is not a waterfall. Terrain variation *within* a
   * district is obtained by zoning finer, which is what zones are for.
   *
   * See [docs/subsystems/watershed.md].
   */
  protected elevation: number | null = null;

  /** Metres above sea level declared HERE (no ancestor walk). */
  public getElevation(): number | null { return this.elevation; }

  public setElevation(value: number | null): void {
    this.elevation = value === null || Number.isFinite(value) ? value : null;
  }

  /**
   * **Where on the world this place is: degrees from the equator,
   * signed** — negative is the southern hemisphere. With elevation,
   * continentality and the offset it is one of the four levers the
   * climate derives a place's temperature from
   * (`WeatherApi.temperatureAt`); the sun's path, the day's length and
   * the local season all read it too.
   *
   * Inherited like `elevation` — a realm authors it once on its region
   * root and every room beneath agrees. `null` = not declared here; a
   * chain that declares it nowhere resolves the realm default (42°,
   * `DEFAULT_CLIMATE_SITE`).
   *
   * See [docs/subsystems/weather.md § the climate].
   */
  protected latitude: number | null = null;

  /** Degrees of latitude declared HERE (no ancestor walk). */
  public getLatitude(): number | null { return this.latitude; }

  public setLatitude(value: number | null): void {
    this.latitude =
      value === null || !Number.isFinite(value)
        ? null
        : Math.max(-90, Math.min(90, value));
  }

  /**
   * **How far the place is from the sea's influence**, 0 (maritime) …
   * 1 (continental). A coast's winters are mild and late; a continent's
   * are hard and early — the Seattle-versus-Minneapolis lever, at one
   * latitude. `null` = not declared here (walk further; the realm default
   * is 0.5).
   */
  protected continentality: number | null = null;

  /** Continentality declared HERE (no ancestor walk). */
  public getContinentality(): number | null { return this.continentality; }

  public setContinentality(value: number | null): void {
    this.continentality =
      value === null || !Number.isFinite(value)
        ? null
        : Math.max(0, Math.min(1, value));
  }

  /**
   * **The anomaly no local term derives**, in kelvin — a warm current, a
   * cold upwelling, a frost hollow. The honest tool for *this place is
   * warmer than its latitude says*; authoring a flat temperature on an
   * outdoor biome is not (`lint:biome` refuses it). `null` = not declared
   * here (walk further; default 0).
   */
  protected climateOffsetK: number | null = null;

  /** The climate offset declared HERE (no ancestor walk). */
  public getClimateOffsetK(): number | null { return this.climateOffsetK; }

  public setClimateOffsetK(value: number | null): void {
    this.climateOffsetK =
      value === null || Number.isFinite(value) ? value : null;
  }

  /**
   * ⭐ **Where on the world this zone is, as the climate reads it** — the
   * four levers, each resolved through this zone's own inheritance walk
   * ({@link lookupField}), with the realm default for any the chain does
   * not declare. The one place the levers are folded into a
   * `ClimateSite`; `ZoneApi.climateSiteFor` asks the zone a thing stands
   * in, and a conduit asks the zone it serves.
   */
  public async climateSite(): Promise<ClimateSite> {
    const [lat, elev, cont, off] = await Promise.all([
      this.lookupField<number>('latitude'),
      this.lookupField<number>('elevation'),
      this.lookupField<number>('continentality'),
      this.lookupField<number>('climateOffsetK'),
    ]);
    return {
      latitudeDeg: lat ?? DEFAULT_CLIMATE_SITE.latitudeDeg,
      elevationM: elev ?? DEFAULT_CLIMATE_SITE.elevationM,
      continentality: cont ?? DEFAULT_CLIMATE_SITE.continentality,
      offsetK: off ?? DEFAULT_CLIMATE_SITE.offsetK,
    };
  }
}
