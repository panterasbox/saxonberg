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
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { AppSettingKeys } from '@saxonberg/server/mud/lib/config/AppSettings';
import { ZoneApi } from '@saxonberg/server/mud/api/zone';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
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
  /** Cubic metres per second actually delivered. */
  deliveredM3S: number;
  /** What was asked of it. */
  demandM3S: number;
  /** Metres of head in its favour; negative means it must be pumped. */
  headM: number | null;
  /** Watts the pump is drawing to deliver that, or 0 when gravity-fed. */
  pumpWatts: number;
}

const ConduitBase = DetailedMixin(SwitchableMixin(Thing));

export default class Conduit extends ConduitBase {
  static fieldMeta: FieldMeta = {
    conduitKey: { persistent: true, authorable: true },
    reachRef: { persistent: true, authorable: true },
    extent: { persistent: true, authorable: true },
    direction: { persistent: true, authorable: true },
    capacityM3S: { persistent: true, authorable: true },
    treatmentFactor: { persistent: true, authorable: true },
    dischargeLoadPerSecond: { persistent: true, authorable: true },
    dischargeKind: { persistent: true, authorable: true },
    ownerRef: { persistent: true, authorable: true },
    headM: { persistent: true },
    cut: { persistent: true },
  };

  /** Durable identity, independent of the template path. */
  public conduitKey = '';

  /** The river end — a reach citation like `kestrel:falls`. */
  public reachRef = '';

  /**
   * The land end — a **template-path prefix**, resolved longest-prefix,
   * which is the mechanism `ParcelRegistry` already uses for title. So
   * *"am I on the main?"* is the same question as *"who owns this?"*,
   * asked of a different registry.
   */
  public extent = '';

  /** `supply` (reach → extent) or `disposal` (extent → reach). */
  public direction: ConduitDirection = 'supply';

  /**
   * Cubic metres per second it carries.
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
   * Metres of head in the conduit's favour, resolved **once at
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
    return this.extent;
  }
  public setExtent(value: string): void {
    this.extent = value;
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
    if (this.extent === '' || path === '') return false;
    return path === this.extent || path.startsWith(this.extent + '/');
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
    const zone = await ZoneApi.resolveEnclosingZoneForPath(this.extent);
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
    // ρ and g are READS, not constants. Gravity ships as an authorable
    // atmospheric trace and water's density as a tabulated medium, so a
    // world with different physics gets a different pump bill without
    // anybody editing this expression.
    const rho = BiomeApi.densityOf('water').rawValue();
    const g = BiomeApi.getRootBiome().getDefaultGravity()?.rawValue() ?? 9.81;
    const eta = Math.max(0.05, dial(AppSettingKeys.waterPumpEfficiency, 0.6));
    return (rho * g * Math.abs(this.headM!) * m3s) / eta;
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

    if (this.cut) troubles.add('cut');
    if (!this.isOn()) troubles.add('off');
    if (demand > this.capacityM3S) troubles.add('overdrawn');

    const flow = await catalogue.flowAt(this.reachRef, nowS, draws);
    // ⚠ A conduit whose reach names nothing is DRY, not fine. A supply
    // that cannot find its source must fail closed.
    if (this.direction === 'supply' && (flow === null || flow.m3s < demand)) {
      troubles.add('dry');
    }

    const airK = await catalogue.airTemperatureKAt(this.reachRef, nowS);
    if (airK !== null && airK <= dial(AppSettingKeys.waterFreezeK, 273.15)) {
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
    const delivered =
      state === null ? Math.min(demand, this.capacityM3S) : 0;
    return {
      state,
      deliveredM3S: delivered,
      demandM3S: demand,
      headM: this.headM,
      pumpWatts: this.pumpWattsFor(delivered),
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
        ? `draws from ${this.reachRef} and serves ${this.extent || '(nothing)'}`
        : `takes from ${this.extent || '(nothing)'} and outfalls into ${this.reachRef}`,
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
      lines.push(
        `${Math.abs(this.headM).toFixed(0)} m of lift against it — it needs a pump, ` +
          `and that pump draws ${(reading.pumpWatts / 1000).toFixed(1)} kW for as long as it runs`,
      );
    }
    if (this.treatmentFactor > 0) {
      lines.push(
        `treatment removes ${(this.treatmentFactor * 100).toFixed(0)}% of what is in the water`,
      );
    }
    lines.push(
      reading.state === null
        ? `delivering ${reading.deliveredM3S.toFixed(2)} m³/s`
        : `NOT delivering: ${SUPPLY_STATE_GLOSS[reading.state]} (${reading.state})`,
    );
    return { label, state: reading.state, lines };
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
    return Math.min(this.capacityM3S, Math.max(0, naturalM3S));
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
