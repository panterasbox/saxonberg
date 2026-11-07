/**
 * Conduit — **the conveyance ladder's one object**: a river end, a land
 * end, a capacity, an owner, and a state.
 *
 * ⚠ **Three unrelated things in this codebase are called `Conduit`** —
 * the kernel's sensory pass-through interfaces (`lib/boundary/Conduit`),
 * arcana's magical coupling item (`/system/arcana/thing/Conduit`), and this.
 * They are told apart by namespace, which is what namespaces are for,
 * and the codebase already does this deliberately elsewhere
 * (`platform/agent/NPC`, `platform/thing/Vessel`). Player-facing content
 * gives its rows real names — *the city intake*, *the Kestrel
 * aqueduct*, *the Wharfside outfall* — so nobody in the world ever
 * meets the word twice.
 *
 * ## A ladder, not a network
 *
 * Getting water from a source to a place is not a topology. It is a
 * question terrain asks of every place, with three answers:
 *
 * | mode | requires | costs |
 * |---|---|---|
 * | **haul** | nothing | labour and encumbrance — *ships already* |
 * | **gravity conduit** | the source above the destination | capital only |
 * | **pumped conduit** | power | capital **and** energy, forever |
 *
 * The last two are the same object; which one you have is
 * {@link getHeadM}'s sign, and nobody declares it.
 *
 * ⛔ **Nothing inside the delivered extent is modelled.** No pipe
 * segments, no street network, no `Street.ts`. *Coverage is legal,
 * connection is physical* — a conduit has two ends, and the review test
 * for anything proposed here is **does this add a node between an
 * intake and a delivery?** If yes, it is out of scope.
 *
 * ## ⭐ A sewer is the same object reversed
 *
 * `direction` is the only difference. A **supply** conduit takes from a
 * reach and delivers to an extent; a **disposal** conduit takes from an
 * extent and outfalls into a reach. Storm drains likewise. One
 * primitive serves supply and disposal, and the head calculation, the
 * capacity, the failure vocabulary and the pump are all shared — which
 * is how an outfall above an intake becomes a fact about terrain that
 * nobody authored.
 *
 * ## Excludability is why this is a business and a river is a law
 *
 * A river is non-excludable and a conduit is not: you cannot keep
 * someone off a river, and you can close a valve on your aqueduct. So
 * the river gets **rights** and the conduit gets an **owner** — and the
 * split is a consequence of physics rather than a declaration.
 *
 * See [docs/subsystems/watershed.md].
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { SwitchableMixin } from '@saxonberg/server/mud/lib/boundary/Switchable';
import { StagedMixin } from '@saxonberg/server/mud/lib/stuff/Staged';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type { Pumping } from '@saxonberg/server/mud/lib/pump/Pumping';
import type { PumpSource } from '@saxonberg/server/mud/lib/pump/Pumpable';
import type { SupplyServing, SupplyShares, WaterSupply } from '@saxonberg/server/mud/lib/supply/SupplyState';
import { TrajectoryLog, Piecewise, type Breakpoint } from '@saxonberg/server/mud/lib/Trajectory';
import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { AppSettingKeys } from '@saxonberg/server/mud/lib/config/AppSettings';
import { ZoneApi } from '@saxonberg/server/mud/api/zone';
import { SpatialZone } from '@saxonberg/server/mud/lib/zone/SpatialZone';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { AddressApi } from '@saxonberg/server/mud/api/address';
import { WeatherApi } from '@saxonberg/server/mud/api/weather';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import {
  type SupplyState,
  type SupplyReport,
  SUPPLY_STATE_PRECEDENCE,
  SUPPLY_STATE_GLOSS,
} from '@saxonberg/server/mud/lib/supply/SupplyState';
import WatercourseCatalogue, {
  WATERCOURSE_CATALOGUE_PATH,
  CONTAMINANT_KINDS,
} from '../idea/WatercourseCatalogue';
import type {
  DrawLedger,
  ContaminantKind,
} from '../idea/WatercourseCatalogue';

/** Which way the water runs through it. */
export type ConduitDirection = 'supply' | 'disposal';

/** Everything a `state` question worked out, for `analyze` and for tests. */
export interface ConduitReading {
  /** `null` when it is working. The six-word vocabulary otherwise. */
  state: SupplyState | null;
  /** Cubic meters per second actually delivered. */
  deliveredM3S: number;
  /** What was asked of it. */
  demandM3S: number;
  /** Meters of head in its favour; negative means it must be pumped. */
  headM: number | null;
  /** Watts the pump is drawing to deliver that, or 0 when gravity-fed. */
  pumpWatts: number;
  /**
   * ⭐ What it can physically CARRY against the demand right now, m³/s —
   * the pump's lift, the capacity, the river's flow — whatever words the
   * reading says (water-supply D6). The share rule divides THIS among the
   * ranks: an overdrawn main still carries its capacity to somebody.
   */
  carriesM3S: number;
}

// ⭐ Staged + Container since the pump build: a pumped main HOLDS its pump
// (`props: [intake-pump]`), and vetoes everything else. The claim is true —
// a conduit's pump is part of the conduit — and the water pack still ships
// no mover and no verb: the pump is the energy pack's appliance.
//
// ⭐ Singleton since the water-supply build: a premises cites a main by its
// row path and a tap LOADS it on use (`StuffApi.singleton`); the room that
// props it later adopts the same instance rather than minting a second.
const ConduitBase = StagedMixin(ContainerMixin(SwitchableMixin(SingletonMixin(Thing))));

export default class Conduit
  extends ConduitBase
  implements PumpSource, SupplyServing, WaterSupply
{
  static fieldMeta: FieldMeta = {
    conduitKey: { persistent: true, authorable: true },
    reachRef: { persistent: true, authorable: true },
    at: { persistent: true, authorable: true },
    extent: { persistent: true, authorable: true },
    extents: { persistent: true, authorable: true },
    direction: { persistent: true, authorable: true },
    capacityM3S: { persistent: true, authorable: true },
    treatmentFactor: { persistent: true, authorable: true },
    dischargeLoadPerSecond: { persistent: true, authorable: true },
    dischargeKind: { persistent: true, authorable: true },
    ownerRef: { persistent: true, authorable: true },
    headM: { persistent: true },
    cut: { persistent: true },
    demandM3S: { persistent: true, authorable: true },
    shares: { persistent: true, authorable: true },
    demandSplit: { persistent: true, authorable: true },
    deliveryLog: { persistent: true, runtimeState: true },
  };

  /** Durable identity, independent of the template path. */
  public conduitKey = '';

  /** The river end — a reach citation like `kestrel:falls`. */
  public reachRef = '';

  /**
   * ⭐ Where on the river it sits (river D3) — `kestrel:confluence+0.05,left`.
   * The node in {@link reachRef} keeps the works' index; this is its own
   * position on the line (an intake really is 100 m above the outfall), and
   * a weir's hydraulic forms just below it. `''` = at the node.
   */
  public at = '';

  /** Where on the line this work sits, or its node when it says nothing. */
  public getAt(): string {
    return this.at !== '' ? this.at : this.reachRef;
  }
  public setAt(value: string): void {
    this.at = typeof value === 'string' ? value : '';
  }

  /**
   * The land end — a **template-path prefix**, resolved longest-prefix,
   * which is the mechanism `ParcelRegistry` already uses for title. So
   * *"am I on the main?"* is the same question as *"who owns this?"*,
   * asked of a different registry.
   */
  public extent = '';

  /**
   * ⭐ The served area as a LIST of prefixes (water-supply D23) — the city
   * intake serves the city's districts, not every locality under the realm
   * root. Longest-prefix over all of them. Empty → the single
   * {@link extent} (every row authored before the list existed).
   */
  public extents: string[] = [];

  /** `supply` (reach → extent) or `disposal` (extent → reach). */
  public direction: ConduitDirection = 'supply';

  /**
   * Cubic meters per second it carries.
   *
   * **A number, not an ideal**, because an over-subscribed main in a dry
   * August is what gives the rights layer something to bind against. A
   * conduit that always delivered would make seniority decorative.
   */
  public capacityM3S = 0;

  /**
   * The fraction of contaminant this conduit removes, `0..1`.
   *
   * Treatment is an **attribute of a conduit**, not a plant with stages
   * — the third rung of the counterplay ladder (move the intake, boil,
   * treat) and the one a town invests in rather than a person.
   */
  public treatmentFactor = 0;

  /**
   * Load units per second this conduit puts into its reach.
   *
   * ⭐ Meaningful only for a **disposal** conduit, which is exactly
   * right: an outfall is the same object as an intake with its ends
   * swapped, so the thing that fouls a river and the thing that drinks
   * from it are one class. Zero for a supply main, and for a sewer
   * discharging nothing worth modelling.
   */
  public dischargeLoadPerSecond = 0;

  /**
   * What kind of dirt it discharges — and therefore whether the river
   * recovers below it. `organic` decays over a few reaches; `persistent`
   * never does.
   */
  public dischargeKind: ContaminantKind = 'organic';

  /** Who holds it — a group / business / office ref. Opaque here. */
  public ownerRef = '';

  /**
   * Meters of head in the conduit's favour, resolved **once at
   * construction** and stored.
   *
   * ⭐ This is the P0 discipline in one field. Elevation resolution is
   * an async ancestor walk and a conduit is asked for its state on hot
   * paths, so the walk happens where it is already asynchronous — a
   * build act — and every runtime read is a scalar comparison. `null`
   * means the head has never been resolved, which reads as *unknown*
   * and never as *flat*.
   */
  public headM: number | null = null;

  /** Physically broken. The one failure state that is stored. */
  public cut = false;

  /**
   * ⭐ What the district actually draws, m³/s (water-supply D5/D6) — the
   * authored household rate, **never a sum over live taps**. `0` = the
   * shipped behavior: a main on is a main drawing its capacity.
   */
  public demandM3S = 0;

  /**
   * ⭐ How it shares a shortage (D6): `priority` — the public outlets first,
   * then the trades, then the houses (Vitruvius's order, read off each
   * premises' land use) — or `proportion`, everybody the same fraction.
   */
  public shares: SupplyShares = 'priority';

  /**
   * The fraction of {@link demandM3S} each rank draws, for the priority
   * rule: civic outlets, the trades (commercial + industrial), and houses.
   */
  public demandSplit: { civic: number; trades: number; residential: number } = {
    civic: 0.15,
    trades: 0.35,
    residential: 0.5,
  };

  /**
   * ⭐ When it delivered and when it did not — a 0/1 ring of breakpoints,
   * written on every cut and every switch, so a tank it fills integrates an
   * outage it never saw (D5). Rides a record only on the `PersistentConduit`
   * twin (D30).
   */
  public deliveryLog: Breakpoint[] = [];

  /** The share rule's last answer: deliverable over demand, and when. */
  private _shareCache: { atS: number; deliverableM3S: number } | null = null;

  // ---------- the ends ----------

  public getConduitKey(): string {
    return this.conduitKey;
  }
  public setConduitKey(value: string): void {
    this.conduitKey = value;
  }

  public getReachRef(): string {
    return this.reachRef;
  }
  public setReachRef(value: string): void {
    this.reachRef = value;
  }

  public getExtent(): string {
    return this.servedExtents()[0] ?? '';
  }
  public setExtent(value: string): void {
    this.extent = value;
  }

  /** Every prefix this conduit serves (D23). */
  public servedExtents(): string[] {
    if (this.extents.length > 0) return [...this.extents];
    return this.extent === '' ? [] : [this.extent];
  }

  /**
   * The districts this main serves, as a reader says them — the last
   * word of each extent (`/world/terminus/mayfield-row` → `mayfield row`),
   * never the path (the water-supply drive read the paths aloud).
   */
  private servedPlaceNames(): string[] {
    return this.servedExtents().map(
      (extent) => (extent.split('/').filter(Boolean).pop() ?? extent).replace(/-/g, ' '),
    );
  }
  public setExtents(value: string[] | string | null): void {
    const list = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
    this.extents = list
      .filter((e): e is string => typeof e === 'string')
      .map((e) => e.trim().replace(/\/+$/, ''))
      .filter((e) => e !== '');
  }

  public getDirection(): ConduitDirection {
    return this.direction;
  }
  public setDirection(value: ConduitDirection): void {
    this.direction = value === 'disposal' ? 'disposal' : 'supply';
  }

  public getCapacityM3S(): number {
    return this.capacityM3S;
  }
  public setCapacityM3S(value: number): void {
    this.capacityM3S = Number.isFinite(value) && value > 0 ? value : 0;
  }

  public getTreatmentFactor(): number {
    return this.treatmentFactor;
  }
  public setTreatmentFactor(value: number): void {
    this.treatmentFactor =
      !Number.isFinite(value) || value <= 0 ? 0 : Math.min(1, value);
  }

  public getDischargeLoadPerSecond(): number {
    return this.dischargeLoadPerSecond;
  }
  public setDischargeLoadPerSecond(value: number): void {
    this.dischargeLoadPerSecond =
      Number.isFinite(value) && value > 0 ? value : 0;
  }

  public getDischargeKind(): ContaminantKind {
    return this.dischargeKind;
  }
  public setDischargeKind(value: ContaminantKind): void {
    this.dischargeKind = CONTAMINANT_KINDS.includes(value) ? value : 'organic';
  }

  /**
   * The `Discharging` shape the catalogue's contamination scan reads.
   *
   * A **supply** conduit discharges nothing, and a **closed or severed**
   * one discharges nothing either — which is the small, satisfying
   * consequence that shutting a sewer's gate really does clean the
   * river below it, with no rule saying so.
   */
  public getDischargeReach(): string {
    if (this.direction !== 'disposal') return '';
    if (this.cut || !this.isOn()) return '';
    return this.reachRef;
  }

  public dischargeLoad(): { load: number; kind: ContaminantKind } {
    return { load: this.dischargeLoadPerSecond, kind: this.dischargeKind };
  }

  public getOwnerRef(): string {
    return this.ownerRef;
  }
  public setOwnerRef(value: string): void {
    this.ownerRef = value;
  }

  public getHeadM(): number | null {
    return this.headM;
  }
  public setHeadM(value: number | null): void {
    this.headM = value === null || !Number.isFinite(value) ? null : value;
  }

  public isCut(): boolean {
    return this.cut;
  }
  public setCut(value: boolean): void {
    this.cut = value === true;
    this.recordDelivery();
  }

  public override setOn(value: boolean): void {
    super.setOn(value);
    this.recordDelivery();
  }
  public override switchOn(): void {
    super.switchOn();
    this.recordDelivery();
  }
  public override switchOff(): void {
    super.switchOff();
    this.recordDelivery();
  }

  public getDemandM3S(): number {
    return this.demandM3S;
  }
  public setDemandM3S(value: number): void {
    this.demandM3S = Number.isFinite(value) && value > 0 ? value : 0;
    this._shareCache = null;
  }

  public getShares(): SupplyShares {
    return this.shares;
  }
  public setShares(value: SupplyShares): void {
    this.shares = value === 'proportion' ? 'proportion' : 'priority';
  }

  public setDemandSplit(value: Partial<{ civic: number; trades: number; residential: number }> | null): void {
    const n = (x: unknown, d: number): number =>
      typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : d;
    this.demandSplit = {
      civic: n(value?.civic, 0.15),
      trades: n(value?.trades, 0.35),
      residential: n(value?.residential, 0.5),
    };
  }

  /** Record whether it delivers, now — on every change of cut or switch. */
  private recordDelivery(): void {
    const now = WorldClockApi.getNow().rawValue();
    const v = !this.cut && this.isOn() ? 1 : 0;
    new TrajectoryLog(this.deliveryLog).record(now, v, v, 0);
  }

  /**
   * ⭐ When it delivered over `[fromS, toS]`, as a 0/1 trajectory — read by
   * a tank it fills, so an outage in an unwatched night still shorts the
   * morning's fill. An empty log holds today's state.
   */
  public deliveryTrajectory(fromS: number, toS: number): Piecewise {
    const now = !this.cut && this.isOn() ? 1 : 0;
    return new TrajectoryLog(this.deliveryLog).window(fromS, toS, now);
  }

  // ---------- coverage ----------

  /**
   * Whether `path` lies inside this conduit's served extent.
   *
   * Longest-prefix on the template path, the parcel registry's own
   * rule. An empty extent serves nothing — *not everything*, which is
   * the direction that would be catastrophic.
   */
  public serves(path: string): boolean {
    if (path === '') return false;
    return this.servedExtents().some(
      (e) => path === e || path.startsWith(e + '/'),
    );
  }

  // ---------- head, and therefore the pump ----------

  /**
   * Resolve Δh between the two ends and stamp it.
   *
   * Positive = the source is above the destination and the thing runs
   * on gravity; negative = it must be lifted, forever, at a cost.
   * Direction decides which end is which, so a sewer's head is computed
   * by the same expression read the other way.
   *
   * Async and **called at construction**, never on a read path (P0).
   * Returns `null` — leaving the stamp untouched — when either end has
   * no elevation to resolve, because an unresolved head must read as
   * unknown rather than as flat.
   */
  public async resolveHead(
    catalogue: WatercourseCatalogue,
  ): Promise<number | null> {
    const reach = await catalogue.reachOf(this.reachRef);
    if (reach === null) return null;
    // `resolveEnclosingZoneForPath`, not `resolveZoneForPath`: the
    // extent is a SERVED AREA and is very often a zone in its own right
    // (a district's own namespace), and the spatial variant deliberately
    // returns null for a path that IS a zone — a zone is not inside
    // itself. The enclosing variant answers for both cases, and
    // elevation inherits through the ancestor walk either way.
    const zone = await ZoneApi.resolveEnclosingZoneForPath(this.getExtent());
    const landM = zone === null
      ? null
      : await zone.lookupField<number>('elevation');
    if (landM === null) return null;
    const head =
      this.direction === 'supply'
        ? reach.elevation - landM
        : landM - reach.elevation;
    this.setHeadM(head);
    return head;
  }

  /**
   * The air (K) over the extent this conduit serves — the zone the extent
   * names, at its own latitude, elevation, continentality and offset,
   * under the weather of the place the conduit stands in. `null` when the
   * extent resolves no zone.
   */
  public async extentAirK(nowS: number): Promise<number | null> {
    if (this.getExtent() === '') return null;
    const zone = await ZoneApi.resolveEnclosingZoneForPath(this.getExtent());
    // Only a region in space has a site (geography is `SpatialZone`'s); an
    // extent naming a folder or nothing has no air of its own to read.
    if (!(zone instanceof SpatialZone)) return null;
    const site = await zone.climateSite();
    const self = this as unknown as Stuff;
    const room = MixinApi.isContainable(self) ? self.getContainer() : null;
    const locality =
      room !== null && MixinApi.isContainer(room)
        ? await AddressApi.resolveLocalityFor(room as Stuff & Container)
        : null;
    return WeatherApi.temperatureAt(site, locality, Quantity.of(nowS, 's')).rawValue();
  }

  /** Whether it runs on gravity. `false` while the head is unresolved. */
  public isGravityFed(): boolean {
    return this.headM !== null && this.headM >= 0;
  }

  /**
   * Whether it needs a pump — **derived from terrain, not declared**.
   *
   * ⚠ Unknown is not "no". A conduit whose head has never been resolved
   * reports `false` here and `null` from {@link getHeadM}, and callers
   * that care about the difference must ask for the head.
   */
  public requiresPump(): boolean {
    return this.headM !== null && this.headM < 0;
  }

  /**
   * Watts to lift `m3s` against the head — `ρ·g·Δh·Q / η`.
   *
   * The **same equation** as hydro generation, read in the other
   * direction: water falling makes power, water rising costs it. Zero
   * for a gravity-fed conduit, which is the entire economic argument
   * for building one.
   */
  public pumpWattsFor(m3s: number): number {
    if (!this.requiresPump() || m3s <= 0) return 0;
    // ⭐ The equation lives on the thing that does the work now: a fitted
    // pump answers for its own efficiency. With none fitted the conduit
    // still knows what a pump WOULD draw, which is what a survey reports.
    const pump = this.pump();
    if (pump !== null) return pump.powerForDuty(Math.abs(this.headM!), m3s);
    // ρ and g are READS, not constants. Gravity ships as an authorable
    // atmospheric trace and water's density as a tabulated medium, so a
    // world with different physics gets a different pump bill without
    // anybody editing this expression.
    const rho = BiomeApi.densityOf('water').rawValue();
    const g = BiomeApi.getRootBiome().getDefaultGravity()?.rawValue() ?? 9.81;
    const eta = Math.max(0.05, dial(AppSettingKeys.waterPumpEfficiency, 0.6));
    return (rho * g * Math.abs(this.headM!) * m3s) / eta;
  }

  // ---------- ⭐ the pump it holds (the pump build) ----------

  /** The pump set in this conduit, or `null`. */
  public pumpFitted(): Stuff | null {
    for (const c of this.getContents()) {
      if (MixinApi.isPumping(c)) return c;
    }
    return null;
  }

  private pump(): (Stuff & Pumping) | null {
    const p = this.pumpFitted();
    return p && MixinApi.isPumping(p) ? p : null;
  }

  /** ⭐ Only a pump goes in a main, and only one. */
  public canAddContainable(thing: Stuff & Containable): VetoResult {
    if (!MixinApi.isPumping(thing)) {
      return { ok: false, reason: 'Only a pump goes in a main.' };
    }
    if (this.pumpFitted() !== null) {
      return { ok: false, reason: 'There is a pump in it already.' };
    }
    return { ok: true };
  }

  /**
   * Is the lift this main needs actually being done right now? `true` for a
   * gravity main (nothing to do); for a pumped one, only while a pump is
   * fitted and running.
   */
  public isLifting(): boolean {
    // A head known to be in its favour runs on gravity, pump or no pump.
    if (this.headM !== null && this.headM >= 0) return true;
    const pump = this.pump();
    // ⚠ An UNKNOWN head with a pump fitted is a pumped main: somebody set a
    // pump in it, and the sync tap read cannot await a survey. Only an
    // unknown head with no pump at all is given the benefit of the doubt.
    if (pump !== null) return pump.isRunning();
    return this.headM === null;
  }

  /**
   * ⭐ The SYNCHRONOUS subset of the six words — what a tap asks on every
   * draw. A cut line, a closed valve, and a pumped main whose pump is not
   * running: all `off` but the cut, which is the vocabulary's word for
   * *somebody closed it, and somebody can open it again*. ⚠ A power cut at
   * the pump reads `off` too; the six words have no *unpowered*, and a
   * seventh is a design conversation. `dry` / `frozen` / `fouled` need the
   * river and stay in the async report.
   */
  public supplyStateNow(): SupplyState | null {
    if (this.cut) return 'cut';
    if (!this.isOn()) return 'off';
    if (!this.isLifting()) return 'off';
    return null;
  }

  /**
   * ⭐ How hard the water this main delivers is, °dH — its REACH's
   * (cleanliness D12). The chemistry is the course's seed, flow-weighted at
   * the joins upstream, so every tap on the Cold Fell aqueduct runs soft
   * and every tap on the city intake runs as hard as the Kestrel.
   */
  public async readWaterHardnessDgh(): Promise<number | null> {
    if (this.direction !== 'supply' || this.reachRef === '') return null;
    const catalogue = await StuffApi.singleton<WatercourseCatalogue>(
      WATERCOURSE_CATALOGUE_PATH,
    );
    const state = await catalogue.waterStateAt(
      this.reachRef,
      WorldClockApi.getNow().rawValue(),
    );
    return state?.hardnessDgh ?? null;
  }

  // ---------- ⭐ the WaterSupply a premises cites (water-supply D3) ----------

  /**
   * The water surface a tap's head is measured from, m ASL. A gravity main
   * gives its source's elevation; a PUMPED main gives its served ground plus
   * the pressure its pump holds the line at (`water.mainPressureHeadM`) —
   * the city's pump lifts the Kestrel five metres to the streets and then
   * twenty more into the houses. `null` = unknown (the tap runs full).
   */
  public async supplyHeadM(): Promise<number | null> {
    if (this.direction !== 'supply' || this.reachRef === '') return null;
    const catalogue = await catalogueOf();
    if (catalogue === null) return null;
    if (this.headM === null) await this.resolveHead(catalogue);
    const reach = await catalogue.reachOf(this.reachRef);
    if (reach === null) return null;
    if (this.headM === null || this.headM >= 0) return reach.elevation;
    const landM = reach.elevation - this.headM;
    return landM + dial(AppSettingKeys.waterMainPressureHeadM, 20);
  }

  /** ⭐ A main gives all it is asked while it delivers, and nothing when not. */
  public drawL(litres: number): number {
    return this.supplyStateNow() === null ? Math.max(0, litres) : 0;
  }

  /** A delivering main is unbounded at the tap; a failed one gives nothing. */
  public availableL(): number {
    return this.supplyStateNow() === null ? Infinity : 0;
  }

  /**
   * ⭐⭐ The share an outlet of `landUse` gets (D6). The main's deliverable —
   * what the river, its capacity and its pump actually carry against the
   * district's demand — is read async and held for a game minute. With no
   * authored demand there is no shortage to share: every outlet gets all.
   */
  public async shareFor(landUse: string): Promise<number> {
    const demand = this.demandM3S;
    if (demand <= 0) return 1;
    const nowS = WorldClockApi.getNow().rawValue();
    if (this._shareCache === null || nowS - this._shareCache.atS >= 60) {
      const catalogue = await catalogueOf();
      const deliverable =
        catalogue === null
          ? 0
          : (await this.readingFor(catalogue, nowS, demand, await catalogue.liveDraws(nowS)))
              .carriesM3S;
      this._shareCache = { atS: nowS, deliverableM3S: deliverable };
    }
    const deliverable = this._shareCache.deliverableM3S;
    if (deliverable >= demand) return 1;
    if (this.shares === 'proportion') return Math.max(0, deliverable / demand);
    // Priority: civic first, then the trades, then houses — each rank is
    // served in full before the next gets anything.
    const split = this.demandSplit;
    const total = split.civic + split.trades + split.residential || 1;
    const ranks: Array<[string, number]> = [
      ['civic', (split.civic / total) * demand],
      ['trades', (split.trades / total) * demand],
      ['residential', (split.residential / total) * demand],
    ];
    const rank =
      landUse === 'civic'
        ? 'civic'
        : landUse === 'commercial' || landUse === 'industrial'
          ? 'trades'
          : 'residential';
    let before = 0;
    for (const [key, need] of ranks) {
      if (key === rank) {
        if (need <= 0) return 1;
        return Math.max(0, Math.min(1, (deliverable - before) / need));
      }
      before += need;
    }
    return 1;
  }

  /**
   * ⭐ The chemistry of the water this main delivers — its REACH's
   * (water-supply D8): pH, hardness and salt, after nothing (treatment
   * removes dirt, not chemistry). `null` for a disposal conduit or a main
   * whose reach names no water.
   */
  public async readWaterChemistry(): Promise<{ pH: number; hardnessDgh: number; salinityPpt: number; fouled?: boolean } | null> {
    if (this.direction !== 'supply' || this.reachRef === '') return null;
    const catalogue = await catalogueOf();
    if (catalogue === null) return null;
    const nowS = WorldClockApi.getNow().rawValue();
    const state = await catalogue.waterStateAt(this.reachRef, nowS).catch(() => null);
    if (state === null) return null;
    // ⭐ Whether what arrives is fit, after this main's treatment — the same
    // test its report's `fouled` makes. The tap delivers it as fouled water
    // (the browser walk: a fouled main poured clean water, and nobody who
    // drank from it ever fell ill).
    const dirt = await catalogue.contaminationAt(this.reachRef, nowS).catch(() => null);
    const fouled = this.foulingOf(dirt?.level ?? 0) > dial(AppSettingKeys.waterFouledAt, 0.35);
    return { pH: state.pH, hardnessDgh: state.hardnessDgh, salinityPpt: state.salinityPpt, fouled };
  }

  // ---------- state ----------

  /**
   * What this conduit is doing, and why it is not doing more.
   *
   * The six-word vocabulary, reported in
   * {@link SUPPLY_STATE_PRECEDENCE} order: the trouble furthest from
   * being fixed by whoever is asking wins, so a severed pipe never
   * reports `overdrawn`.
   *
   * Only `cut` and `off` are stored. `dry`, `frozen`, `fouled` and
   * `overdrawn` are **derived on read** from the river, the season and
   * the demand — which is why a drought closes a main without anybody
   * running a job.
   */
  public async readingFor(
    catalogue: WatercourseCatalogue,
    nowS: number,
    demandM3S: number,
    draws: DrawLedger = new Map(),
  ): Promise<ConduitReading> {
    const demand = Math.max(0, demandM3S);
    const troubles = new Set<SupplyState>();
    // ⚠⚠ Resolve the head ON READ. `resolveHead` had no caller outside its
    // tests, so in a live world every conduit's head was "never surveyed":
    // the aqueduct could not say it runs on gravity and the intake could
    // not say it needs a pump — the pump build's drive found it. This is
    // the async read with the catalogue in hand, and the result persists.
    if (this.headM === null) await this.resolveHead(catalogue);

    if (this.cut) troubles.add('cut');
    if (!this.isOn()) troubles.add('off');
    // ⭐ A pumped main whose pump is not running is shut, as surely as a
    // closed valve. Its wear is reconciled first — integrated, not sampled.
    this.pump()?.reconcileRunning(nowS);
    if (!this.isLifting()) troubles.add('off');
    if (demand > this.capacityM3S) troubles.add('overdrawn');

    const flow = await catalogue.flowAt(this.reachRef, nowS, draws);
    // ⚠ A conduit whose reach names nothing is DRY, not fine. A supply
    // that cannot find its source must fail closed.
    if (this.direction === 'supply' && (flow === null || flow.m3s < demand)) {
      troubles.add('dry');
    }

    // ⭐ A line is frozen if ANY part of it is (the climate build, D7): the
    // intake's air at the reach, or the delivered extent's air where the
    // pipes run. Both are the realm's one temperature, so the main and the
    // street it serves agree — and an aqueduct whose intake sits high on a
    // fell freezes before the town below it does, which is true of one.
    const freezeK = dial(AppSettingKeys.waterFreezeK, 273.15);
    const intakeK = await catalogue.airTemperatureKAt(this.reachRef, nowS);
    const extentK = await this.extentAirK(nowS);
    if (
      (intakeK !== null && intakeK <= freezeK) ||
      (extentK !== null && extentK <= freezeK)
    ) {
      troubles.add('frozen');
    }

    // `fouled` — what ARRIVES, after this conduit's own treatment. A
    // supply main below an outfall is fouled; the same main moved above
    // it is not; and a treated one may be neither. Only a supply can be
    // fouled: a sewer carrying filth is a sewer working.
    if (this.direction === 'supply') {
      const dirt = await catalogue.contaminationAt(this.reachRef, nowS);
      const arriving = this.foulingOf(dirt?.level ?? 0);
      if (arriving > dial(AppSettingKeys.waterFouledAt, 0.35)) {
        troubles.add('fouled');
      }
    }

    const state =
      SUPPLY_STATE_PRECEDENCE.find((s) => troubles.has(s)) ?? null;
    // ⭐⭐ A pump delivers what its power lifts. The city intake asks more
    // of its premises' band than the band carries, and the answer is
    // physics, printed — never a silent shortfall (see supplyReport).
    const pump = this.pump();
    const lifted =
      this.requiresPump() && pump !== null
        ? pump.deliverableM3S(this.headM ?? 0, Math.min(demand, this.capacityM3S))
        : this.requiresPump()
          ? 0
          : Math.min(demand, this.capacityM3S);
    // ⭐ Fouled water is still delivered — it is what a drinker falls ill
    // of (the browser walk: a fouled main read "lifts 0.00 m³/s" while its
    // taps poured). Every other trouble stops the water.
    const delivered = state === null || state === 'fouled' ? lifted : 0;
    // A main that is cut, off, or not lifting carries nothing; otherwise it
    // carries what it lifts, up to what the river passes.
    const carries =
      this.cut || !this.isOn() || !this.isLifting()
        ? 0
        : Math.max(0, Math.min(lifted, flow?.m3s ?? 0));
    return {
      state,
      deliveredM3S: delivered,
      demandM3S: demand,
      headM: this.headM,
      pumpWatts: this.pumpWattsFor(delivered),
      carriesM3S: carries,
    };
  }

  /**
   * The `analyze water` answer — this conduit's whole working, as data
   * the kernel can print without importing anything from this pack.
   *
   * Demand is taken as its own capacity: *analyse* asks what the thing
   * can do, and the honest reading of a main nobody is drawing from is
   * what it would carry if they did.
   */
  public async supplyReport(nowS: number): Promise<SupplyReport> {
    const catalogue = await catalogueOf();
    const label = this.getPresentation();
    if (catalogue === null) {
      return {
        label,
        state: null,
        lines: ['No drainage is loaded, so nothing can be said about it.'],
      };
    }
    // ⚠ Against the LIVE draws, not against nature. A report that
    // ignored every other intake on the river would tell a player their
    // main is fine on exactly the August day it is not.
    const draws = await catalogue.liveDraws(nowS);
    const reading = await this.readingFor(
      catalogue,
      nowS,
      this.capacityM3S,
      draws,
    );
    const flow = await catalogue.flowAt(this.reachRef, nowS, draws);
    const lines: string[] = [];

    lines.push(
      this.direction === 'supply'
        ? `draws from ${this.reachRef} and serves ${this.servedPlaceNames().join(', ') || '(nothing)'}`
        : `takes from ${this.getExtent() || '(nothing)'} and outfalls into ${this.reachRef}`,
    );
    lines.push(
      flow === null
        ? `its reach names no water at all`
        : `${flow.m3s.toFixed(2)} m³/s passing there` +
          (flow.meltM3S > 0 ? `, ${flow.meltM3S.toFixed(2)} of it snowmelt` : ''),
    );
    lines.push(`capacity ${this.capacityM3S.toFixed(2)} m³/s`);

    if (this.headM === null) {
      lines.push(`its head has never been surveyed — unknown, not flat`);
    } else if (this.headM >= 0) {
      lines.push(
        `${this.headM.toFixed(0)} m of head in its favour — it runs on gravity, and costs nothing to run`,
      );
    } else {
      lines.push(...this.pumpLines(reading));
    }
    if (this.treatmentFactor > 0) {
      lines.push(
        `treatment removes ${(this.treatmentFactor * 100).toFixed(0)}% of what is in the water`,
      );
    }
    lines.push(
      reading.state === null
        ? `delivering ${reading.deliveredM3S.toFixed(2)} m³/s`
        : reading.state === 'fouled'
          ? `delivering ${reading.deliveredM3S.toFixed(2)} m³/s — fouled: ${SUPPLY_STATE_GLOSS.fouled}`
          : `NOT delivering: ${SUPPLY_STATE_GLOSS[reading.state]} (${reading.state})`,
    );
    return { label, state: reading.state, lines };
  }

  /**
   * ⭐⭐ What the pump is doing, legibly. The intake's own numbers ask more
   * of its premises than the band carries, and that must never read as a
   * main quietly delivering less: the report says what the pump wants,
   * what the line gives it, and what it lifts.
   */
  private pumpLines(reading: ConduitReading): string[] {
    const lift = Math.abs(this.headM ?? 0);
    const head = `${lift.toFixed(0)} m of lift against it`;
    const pump = this.pump();
    if (pump === null) {
      return [`${head} — it needs a pump, and none is fitted`];
    }
    if (!pump.isRunning()) {
      return [`${head} — its pump is not running, so nothing is lifted`];
    }
    const askedM3S = Math.min(reading.demandM3S, this.capacityM3S);
    const wantW = pump.powerForDuty(lift, askedM3S);
    const haveW = pump.moverPowerW();
    if (wantW > haveW + 1) {
      return [
        `${head} — its pump would draw ${(wantW / 1000).toFixed(1)} kW to lift ` +
          `${askedM3S.toFixed(2)} m³/s, and the line gives it ${(haveW / 1000).toFixed(1)} kW`,
        `so it draws all the line gives it and lifts ${reading.deliveredM3S.toFixed(2)} m³/s — ` +
          `less than is asked of it`,
      ];
    }
    return [
      `${head} — its pump draws ${(reading.pumpWatts / 1000).toFixed(1)} kW for as long as it runs`,
    ];
  }

  /**
   * What this conduit is taking out of its reach right now.
   *
   * ⚠ **A supply conduit draws its capacity, not its demand.** Domestic
   * metering is an explicit non-goal — the mains stay effectively
   * unlimited at the household tap — so there is no demand model to
   * ask, and a main that is on is a main that is running. Rivalry lives
   * at the scale where it belongs: the capacity is the diversion, and
   * an over-subscribed main in a dry August is what gives the rights
   * layer something to bind against.
   *
   * A **disposal** conduit takes nothing from the river; it puts things
   * into it.
   */
  public withdrawalM3S(naturalM3S: number): number {
    if (this.direction !== 'supply') return 0;
    if (this.cut || !this.isOn()) return 0;
    // ⭐ A main with an authored district demand draws THAT (water-supply
    // D5) — a city does not drink its intake's whole capacity at 3 a.m.
    const drawn = this.demandM3S > 0 ? Math.min(this.demandM3S, this.capacityM3S) : this.capacityM3S;
    return Math.min(drawn, Math.max(0, naturalM3S));
  }

  /**
   * What arrives after treatment — the contaminant level at the intake
   * reduced by this conduit's treatment factor.
   *
   * Capital, systemic, and the thing a town invests in rather than a
   * person: the third rung of the counterplay ladder above *move the
   * intake* and *boil*.
   */
  public foulingOf(intakeLevel: number): number {
    if (intakeLevel <= 0) return 0;
    return intakeLevel * (1 - this.treatmentFactor);
  }
}

/**
 * The realm's drainage, resolved lazily and shared. A conduit asks for
 * it rather than being handed it, so the platform's `analyze water`
 * never has to know the catalogue exists — the kernel meets a pack
 * object over a SHAPE, not an import.
 */
async function catalogueOf(): Promise<WatercourseCatalogue | null> {
  try {
    return await StuffApi.singleton<WatercourseCatalogue>(
      WATERCOURSE_CATALOGUE_PATH,
    );
  } catch {
    return null;
  }
}

/** Numeric AppSetting read with a seeded-literal fallback. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}
