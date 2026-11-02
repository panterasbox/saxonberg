/**
 * WaterStore — ⭐⭐ **the household's water between fills** (water-supply
 * build, D5): a rain butt, a cask on its stand, a roof cistern. Its level IS
 * its interior bulk, so `fill`, `pour` and `drink` work at it with no new
 * verb; it fills from the rain on its roof or from a supply on a schedule,
 * reconciled over any gap on the next read; and a premises may cite it, so
 * the taps of a house on intermittent water run from it while the main is
 * off.
 *
 * ⭐ **A store carries what is poured in** (D25): a fouled cask poured into
 * a cistern fouls it by volume — the shipped bulk blend, nothing new.
 *
 * ⭐ **Staged or live is the content's choice** (D30): this plain class is a
 * staged store — Rejection's butts, whose rain-fill derives and whose water
 * is nobody's — and reverts to its row when its room unloads. A row names
 * {@link PersistentWaterStore} when what was poured in and drawn out is
 * somebody's water.
 *
 * Not `StorageNode` (a civic tank in m³ at an elevation: you do not `pour`
 * into a water tower) and not `WaterFixture` (a fixture does not hold its
 * water — it asks a supply).
 */

import Thing from '../../lib/stuff/Thing';
import { BulkableMixin } from '../../lib/bulk/Bulkable';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import type { FieldMeta } from '../../lib/mixin';
import type { CommandContributions } from '../../api/command';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { BulkAffordance } from '../../lib/bulk/Bulkable';
import type { Container } from '../../lib/spatial/Container';
import type Locality from '../idea/Locality';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ZoneApi } from '../../api/zone';
import { WeatherApi } from '../../api/weather';
import { AddressApi } from '../../api/address';
import { WorldClockApi } from '../../api/worldclock';
import { Quantity } from '../../lib/quantity';
import '../../lib/supply/WaterChemistry';
import {
  type SupplyReport,
  type SupplyState,
  type WaterSupply,
} from '../../lib/supply/SupplyState';

/** Where a store's water comes from: the rain on its roof, a supply, or nothing. */
export type StoreFill = 'rain' | string;

/** The longest gap a rain fill is integrated over, game seconds (a year). */
const MAX_FILL_GAP_S = 365 * 86_400;

// Thermal outer of Bulkable, as `Receptacle` and `WaterFixture` compose it:
// a holder's heat capacity derives from what is in it.
const WaterStoreBase = ThermalMixin(BulkableMixin(Thing));

export default class WaterStore extends WaterStoreBase implements WaterSupply {
  /**
   * What fills it: `rain` (its roof, `catchmentM2` of it), a supply's path
   * (a main, on the supply's own delivery), or `''` — it holds what is
   * poured into it and nothing else.
   */
  protected fillsFrom: StoreFill = '';

  /** The roof that drains into it, m² — a rain store's catchment. */
  protected catchmentM2 = 0;

  /** How fast a supply fills it while the supply delivers, L/s. */
  protected fillRateLps = 0;

  /** The level it first stands at, litres — authored; `-1` = empty. */
  protected initialLevelL = -1;

  /** When the fill was last reconciled, game s. `null` = never. */
  protected fillStamp: number | null = null;

  /**
   * How high its water stands above its room's floor, m — what gives a tap
   * fed from it its head (D4). A butt on the ground: about a meter; a roof
   * cistern: a storey and more. That is why a house puts its cistern in the
   * roof.
   */
  protected standsM = 1;

  /** How hard its water is, °dH — rain is soft. `null` = it does not say. */
  protected hardnessDgh: number | null = null;

  static fieldMeta: FieldMeta = {
    fillsFrom: { persistent: true, authorable: true },
    catchmentM2: { persistent: true, authorable: true },
    fillRateLps: { persistent: true, authorable: true },
    initialLevelL: { persistent: true, authorable: true },
    fillStamp: { persistent: true, runtimeState: true },
    hardnessDgh: { persistent: true, authorable: true },
    standsM: { persistent: true, authorable: true },
  };

  /** The supply it fills from, loaded on use. */
  private _source: (Stuff & WaterSupply) | null = null;
  /** Where its rain falls — resolved once, on the async path. */
  private _site: { locality: Locality | null; site: unknown } | null = null;

  constructor() {
    super();
    // A store stands where it stands: a butt is not carried off full.
    this.fixedInPlace = true;
  }

  public getFillsFrom(): StoreFill {
    return this.fillsFrom;
  }
  public setFillsFrom(value: StoreFill): void {
    this.fillsFrom = typeof value === 'string' ? value.trim() : '';
    this._source = null;
  }
  public getCatchmentM2(): number {
    return this.catchmentM2;
  }
  public setCatchmentM2(value: number): void {
    this.catchmentM2 = Number.isFinite(value) && value > 0 ? value : 0;
  }
  public setFillRateLps(value: number): void {
    this.fillRateLps = Number.isFinite(value) && value > 0 ? value : 0;
  }
  public setInitialLevelL(value: number): void {
    this.initialLevelL = Number.isFinite(value) ? value : -1;
  }

  /** How much water it holds, litres. */
  public levelL(): number {
    return this.getBulkAmount('interior').rawValue();
  }

  /** How much it can hold, litres — `Infinity` for a store with no capacity authored. */
  public capacityL(): number {
    return this.getBulkCapacity('interior')?.rawValue() ?? Infinity;
  }

  /** Stand the level at `litres`, clamped to the store. */
  private standAt(litres: number): void {
    const l = Math.max(0, Math.min(this.capacityL(), litres));
    this.setBulkAmount('interior', Quantity.of(l, 'L'));
  }

  // ---------- the fill, reconciled on read ----------

  /**
   * ⭐ Bring the level up to `nowS`: the rain that fell on its roof
   * (`precipitationBetween × catchmentM2` — the soil edge's expression
   * pointed at a roof, liquid only), or its supply's delivery × the fill
   * rate. The first read stamps and stands it at its authored first level.
   */
  public reconcileFill(nowS: number): void {
    if (this.fillStamp === null) {
      if (this.initialLevelL >= 0 && this.levelL() <= 0) this.standAt(this.initialLevelL);
      this.fillStamp = nowS;
      return;
    }
    const from = Math.max(this.fillStamp, nowS - MAX_FILL_GAP_S);
    if (!(nowS > from)) return;
    let gained = 0;
    if (this.fillsFrom === 'rain') {
      // ⚠ Unresolved → the stamp does NOT advance: the backlog waits for
      // the async resolve rather than reading as a dry month.
      if (this._site === null) return;
      const fell = WeatherApi.precipitationBetween(
        Quantity.of(from, 's'),
        Quantity.of(nowS, 's'),
        this._site.locality,
        this._site.site as never,
      );
      gained = fell.liquid.rawValue() * this.catchmentM2;
    } else if (this.fillsFrom !== '' && this.fillRateLps > 0) {
      const src = this._source;
      if (src === null) return;
      gained = src.supplyStateNow() === null ? (nowS - from) * this.fillRateLps : 0;
    }
    if (gained > 0) this.standAt(this.levelL() + gained);
    this.fillStamp = nowS;
  }

  /** Resolve what the fill reads — the rain's place, the supply — once, async. */
  private async ensureFill(): Promise<void> {
    if (this.fillsFrom === 'rain' && this._site === null) {
      const room = this.roomOf();
      if (room !== null && MixinApi.isContainer(room)) {
        const locality = await AddressApi.resolveLocalityFor(room as Stuff & Container).catch(() => null);
        const site = MixinApi.isAtmospheric(room) ? room.climateSite() : null;
        this._site = { locality, site };
      }
    } else if (this.fillsFrom !== '' && this.fillsFrom !== 'rain' && this._source === null) {
      try {
        this._source = await StuffApi.singleton<Stuff & WaterSupply>(this.fillsFrom);
      } catch {
        this._source = null;
      }
    }
  }

  /** The room it stands in — the end of the containment walk. */
  private roomOf(): Stuff | null {
    const self = this as unknown as Stuff;
    let cursor: Stuff = self;
    while (MixinApi.isContainable(cursor)) {
      const next = cursor.getContainer() as Stuff | null;
      if (next === null) break;
      cursor = next;
    }
    return cursor === self ? null : cursor;
  }

  /** ⭐ Read the fill before anybody draws or looks in. */
  public override async settleBulk(affordance: BulkAffordance): Promise<void> {
    await super.settleBulk(affordance);
    if (affordance !== 'interior') return;
    await this.ensureFill();
    this.reconcileFill(WorldClockApi.getNow().rawValue());
    if (this.hardnessDgh !== null && !this.isBulkEmpty('interior')) {
      this.setBulkPayload('interior', {
        ...(this.getBulkPayload('interior') ?? {}),
        hardnessDgh: this.hardnessDgh,
      });
    }
  }

  /** ⭐ What its water IS (water-supply D8) — what was rained or poured into it. */
  public async readWaterChemistry(): Promise<{ pH: number; hardnessDgh: number; salinityPpt: number } | null> {
    const p = this.getBulkPayload('interior');
    const dgh = typeof p?.hardnessDgh === 'number' ? p.hardnessDgh : this.hardnessDgh;
    if (typeof p?.pH !== 'number' && dgh === null) return null;
    return {
      pH: typeof p?.pH === 'number' ? p.pH : 7,
      hardnessDgh: dgh ?? 8,
      salinityPpt: typeof p?.salinityPpt === 'number' ? p.salinityPpt : 0,
    };
  }

  /** How hard its water is (cleanliness D12) — what a supply reports up a tap. */
  public async readWaterHardnessDgh(): Promise<number | null> {
    const dgh = this.getBulkPayload('interior')?.hardnessDgh;
    return typeof dgh === 'number' ? dgh : this.hardnessDgh;
  }

  // ---------- ⭐ the WaterSupply a premises cites ----------

  public supplyStateNow(): SupplyState | null {
    return this.levelL() <= 0 ? 'dry' : null;
  }

  public setStandsM(value: number): void {
    this.standsM = Number.isFinite(value) && value >= 0 ? value : 1;
  }

  /** Its water surface: its room's elevation plus how high it stands. */
  public async supplyHeadM(): Promise<number | null> {
    await this.ensureFill();
    this.reconcileFill(WorldClockApi.getNow().rawValue());
    const room = this.roomOf();
    if (room === null) return null;
    const ground = await ZoneApi.elevationFor(room).catch(() => null);
    return ground === null ? null : ground + this.standsM;
  }

  public drawL(litres: number): number {
    const given = Math.min(Math.max(0, litres), this.levelL());
    if (given > 0) this.standAt(this.levelL() - given);
    return given;
  }

  public availableL(): number {
    return this.levelL();
  }

  /** A store has no ranks: whoever draws first gets it. */
  public async shareFor(_landUse: string): Promise<number> {
    await this.ensureFill();
    this.reconcileFill(WorldClockApi.getNow().rawValue());
    return 1;
  }

  /**
   * Sideways: anyone standing at a butt can wash, scrub, rinse and cool at
   * it, exactly as at a basin — it is water in reach (the `WaterFixture`
   * bucket, the same four views).
   */
  static commandContributions: CommandContributions = {
    peers: [
      'platform/cmd/crafting/wash.yaml',
      'platform/cmd/crafting/scrub.yaml',
      'platform/cmd/medical/rinse.yaml',
      'platform/cmd/medical/cool.yaml',
    ],
  };

  public async supplyReport(nowS: number): Promise<SupplyReport> {
    await this.ensureFill();
    this.reconcileFill(nowS);
    const cap = this.capacityL();
    const lines = [
      Number.isFinite(cap)
        ? `holds ${this.levelL().toFixed(0)} of ${cap.toFixed(0)} litres`
        : `holds ${this.levelL().toFixed(0)} litres`,
      this.fillsFrom === 'rain'
        ? `fills from the rain on ${this.catchmentM2.toFixed(0)} m² of roof`
        : this.fillsFrom === ''
          ? 'nothing fills it but what is poured in'
          : `fills from ${this.fillsFrom}`,
    ];
    return { label: this.getPresentation(), state: this.supplyStateNow(), lines };
  }
}
