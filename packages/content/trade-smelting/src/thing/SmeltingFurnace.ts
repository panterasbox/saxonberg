/**
 * SmeltingFurnace — the shaft you CHARGE, the one thing in the game that
 * affords `smelt`, and ⭐⭐ **the thing that decides what the charge made.**
 *
 * ⭐ A verb an object affords is a property of what the object IS, so it
 * is declared exactly once, on the class — the `Anvil` shape. A row's
 * `commandContributions:` is read by nothing and fails silently, which
 * is exactly how `smelt` shipped unreachable.
 *
 * ⚠⚠ **The `ContainerMixin` is not decoration.** A run reads the ore and
 * the fuel out of the furnace's own contents and pours the product back
 * into it; a furnace you cannot put anything into is a hearth.
 *
 * ⚠ Why a pack class and not a `commandContributions` edit on the
 * kernel's `Forge`: a kernel static naming a trade's view crosses the
 * pack boundary, and the Hearthworks forge — a smith's fire, not a
 * smelter — must not afford `smelt`. And a charcoal CLAMP is a furnace
 * and a container too, one passable exit from the smelter; it does not
 * afford `smelt` either, so `smelt.yaml`'s `affords` term refuses it at
 * the binder (the duck-typed clamp sniff the controller carried is gone).
 *
 * ## The yield is chemistry
 *
 *     metal out = Σ (lot mass × lot grade × the mineral's metal fraction)
 *
 * Every term is a fact something else already knows: the mass is the
 * lot's, the grade is what `hew` read off the deposit at the face, and the
 * metal fraction is the mineral's `composition`. **Nobody anywhere authors
 * how much metal comes out of a smelt.**
 *
 * ## The KIND is thermodynamics
 *
 * Above copper the ladder is about **which metal**, and it turns on one
 * number — the carbon dissolved in the iron ({@link IronCarbon}):
 *
 * | what you charged | what you get | why |
 * |---|---|---|
 * | below {@link T_REDUCE} | nothing | the ore does not reduce; work the bellows |
 * | ore, modest fuel | a **bloom** (~0.05 % C) | reduced in the SOLID state — it never melts |
 * | ore, heavy fuel | a **pig** of cast iron (4 % C) | carbon lowered the melting point until it RAN |
 * | a bar, any fuel | a **steel bar** (+0.6 % C a run) | carburizing: diffusion into solid iron |
 *
 * ⭐ What those numbers produce at Rejection's furnace with the bellows
 * working (1420 K × 1.12 = 1590 K), charging 1.4 kg lumps and 8 kg baskets
 * — nothing below is authored:
 *
 * | charge             | carbon | T_melt | what you get              |
 * |--------------------|--------|--------|---------------------------|
 * | 3 lumps, 2 baskets | 0.13 % | 1799 K | a bloom                   |
 * | 3 lumps, 3 baskets | 1.56 % | 1669 K | a bloom — NATURAL STEEL   |
 * | 3 lumps, 4 baskets | 4.3 %  | 1539 K | it RAN: a cast pig        |
 * | bellows off        |    —   |    —   | 1420 K: it will not reduce|
 *
 * ## The product is the MATERIAL's to name
 *
 * A molten run goes into the crucible standing in the fire (or pools on the
 * hearth); a solid one is the row the product material names as its
 * {@link Material.getCastTemplate} — a bloom for bloom iron, a steel bar for
 * steel. It used to scan this trade's every template for a `_materialPath`
 * match (survey C41): a search for what the material already answers.
 *
 * Controller-liquidity W9 moved all of this here from `SmeltController`,
 * which now words the facts {@link smeltPlan} returns.
 */

import Forge from '@saxonberg/server/mud/platform/thing/Forge';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { AssembledMixin } from '@saxonberg/server/mud/lib/craft/Assembled';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { CompositionEntry } from '@saxonberg/server/mud/lib/material/Material';
import type { ActPlan, ActRefusal, ActDone } from '@saxonberg/server/mud/lib/craft/ActPlan';
import type { Bulkable } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import type { Thermal } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Ore from '@saxonberg/content-trade-mining/src/thing/Ore';
import IronCarbon from '@saxonberg/content-trade-smithing/src/lib/IronCarbon';
import Bloom from './Bloom';

// ⭐ Made of parts (ceramics D19): its lining wears with every run.
const SmeltingFurnaceBase = AssembledMixin(DurableMixin(ContainerMixin(Forge)));

const SMELTING = ['trade/smelting/cmd/smelting/smelt.yaml'];

const SLAG_ROW = '/trade/smelting/thing/slag';
/** The transient source a bulk run is poured out of (the `pourTake` shape). */
const UNBOUNDED_RECEPTACLE = '/platform/thing/UnboundedReceptacle';
const DISCIPLINE = 'smelting';

/**
 * How long a run takes, in game ms. ⚠ Two game minutes — ten real seconds
 * at the default clock scale, in family with every other engaged act in the
 * trade (`hew` 9 s, `drive` 40 s, `hammer` 5 s). A real bloomery runs for
 * most of a day; the game's clock already prices that.
 */
const SMELT_MS = 120_000;
/** Metabolic watts of holding a furnace at heat. */
const SMELT_EFFORT_W = 425;
/**
 * The MINIMUM charcoal a run wants, kg — more than the ore by mass, which
 * is why the smelter sits by the fuel yard. ⭐ A run consumes EVERYTHING in
 * the furnace: you charge a furnace, you do not meter it, and the
 * fuel-to-ore ratio is the whole carbon decision.
 */
const CHARCOAL_MINIMUM_KG = 16;
/** The hold a run puts on the furnace's lining, game-seconds. */
const RUN_HOLD_S = 3600;

/**
 * Solid-state reduction, K: iron oxide gives up its oxygen to carbon
 * monoxide well BELOW iron's melting point — the reason a bloomery works
 * at all, and why the iron rung is a FUEL-TECHNOLOGY rung.
 */
const T_REDUCE = 1470;
/** Carbon a bloom picks up at the leanest workable charge. */
const C_BLOOM = 0.0005;
/**
 * ⭐⭐ The fuel a charge needs just to REDUCE, kg charcoal per kg ore. The
 * carbon that dissolves in the metal is what is left OVER — an excess, not
 * a straight ratio, which gives the ladder its real shape: lean and
 * slightly-rich both make blooms, and past a point the thing runs away.
 */
const R_STOICH = 3.7;
/** Carbon each surplus kg-per-kg of fuel dissolves into the iron. */
const K_ORE = 0.0075;
/** The most carbon a SOLID reduction from ore reaches before it runs. */
const C_ORE_MAX = 0.03;
/** Carbon one carburizing run diffuses into solid stock. */
const D_CARBURIZE = 0.006;
/** Slag trapped in a bloom, as a fraction of its mass. */
const BLOOM_SLAG = 0.3;
/**
 * ⭐⭐ Slag trapped in a bloom smelted WITH a flux. A flux lowers the
 * gangue's melting point so the waste runs OUT as a liquid slag: 30 %
 * trapped becomes 12 %, and a smith who has hammered both feels it.
 */
const BLOOM_SLAG_FLUXED = 0.12;
/** A crucible's wear per melt when the setting is unset (ceramics D19). */
const CRUCIBLE_WEAR_DEFAULT = 0.12;

/** One lot of the charge: its mass, and its grade-scaled metal fractions. */
interface ChargeLot {
  stuff: Stuff;
  massKg: number;
  metals: CompositionEntry[];
}

/** ⭐ Every reason a smelt is refused — before it starts, or as it lands. */
export type SmeltRefusal =
  | ActRefusal<'no-ore'>
  /** Ore and metal together: reducing rock and working a bar are different atmospheres. */
  | ActRefusal<'mixed-charge'>
  | ActRefusal<'no-fuel', { haveKg: number; wantKg: number }>
  /** Charged, and stone cold — a different sentence from "too cool". */
  | ActRefusal<'not-lit'>
  | ActRefusal<'too-cold', { heldK: number; wantedK: number; ferrous: boolean; bellowsGoing: boolean }>
  /** An authoring fault: the product material names no row to become. */
  | ActRefusal<'no-product-row', { material: string }>;

/** Where a molten run went. `solid` is a bloom or a bar — no run at all. */
export type CrucibleRun = 'crucible' | 'spilled' | 'hearth' | 'solid';

/** What the tap gave. */
export type SmeltDone =
  /** Nothing but slag: whatever was in that rock, it was not metal. */
  | { kind: 'slag' }
  | {
      kind: 'metal';
      metalName: string;
      ferrous: boolean;
      /** It ran — into the crucible or onto the hearth. */
      liquid: boolean;
      /** A bloom raked from the bottom of the shaft. */
      bloom: boolean;
      carbon: number;
      /** The melting point at that carbon, K. */
      meltK: number;
      metalKg: number;
      chargeKg: number;
      heldK: number;
      run: CrucibleRun;
      /** The flux took the gangue off (a bloom only). */
      fluxed: boolean;
      /** The coal's sulfur is in the iron. */
      soured: boolean;
    };

/** A smelt plan. */
export type SmeltPlan = ActPlan<undefined, SmeltDone, SmeltRefusal>;

/** The charge, read: what is in the furnace, sorted by what it does. */
interface Charge {
  ore: Stuff[];
  stock: Stuff[];
  fuel: Stuff[];
  flux: Stuff[];
  sour: boolean;
  fuelKg: number;
}

export default class SmeltingFurnace extends SmeltingFurnaceBase {
  static commandContributions: CommandContributions = {
    environment: SMELTING,
    peers: SMELTING,
  };

  /**
   * ⭐⭐ Run the charge: the plan, or why not. Every refusal is decided
   * here, before anything is consumed; the tap — the metal, the slag, the
   * lining's wear, the deed — is the plan's completion.
   */
  public smeltPlan(actor: Stuff): SmeltPlan | SmeltRefusal {
    const c = this.readCharge();
    if (c.ore.length === 0 && c.stock.length === 0) return { ok: false, reason: 'no-ore' };
    if (c.ore.length > 0 && c.stock.length > 0) return { ok: false, reason: 'mixed-charge' };
    if (c.fuelKg < CHARCOAL_MINIMUM_KG) {
      return { ok: false, reason: 'no-fuel', facts: { haveKg: c.fuelKg, wantKg: CHARCOAL_MINIMUM_KG } };
    }
    const lots = this.lotsOf(c.ore.length > 0 ? c.ore : c.stock);
    const metal = this.dominantMetalOf(lots);
    const held = this.getHeldTemperatureK();
    let carbon = 0;
    if (metal !== null) {
      const ferrous = metal.hasTag('ferrous');
      const wanted = ferrous ? T_REDUCE : this.meltingPointKOf(metal);
      // ⚠⚠ An unlit furnace is not a cool one: `getHeldTemperatureK()`
      // is what it WOULD pin at, so a stone-cold shaft reads 1420 K.
      if (!this.isLit()) return { ok: false, reason: 'not-lit' };
      if (held < wanted) {
        return {
          ok: false,
          reason: 'too-cold',
          facts: { heldK: held, wantedK: wanted, ferrous, bellowsGoing: this.isBellowsActive() },
        };
      }
      carbon = ferrous ? this.carbonFor(lots, c.fuelKg, c.ore.length > 0, held) : 0;
    }
    return {
      ok: true,
      durationMs: SMELT_MS,
      effortW: SMELT_EFFORT_W,
      facts: undefined,
      onComplete: () => this.tap(actor, lots, c, metal, carbon, held),
    };
  }

  /** What is in the furnace, sorted by what each thing does in a run. */
  protected readCharge(): Charge {
    const contents = this.getContents() as Stuff[];
    const ore = contents.filter((s) => s instanceof Ore);
    const stock = contents.filter((s) => this.isStock(s));
    const fuel = contents.filter((s) => this.isFuel(s));
    // ⭐ By material TAG: limestone answers it today, dolomite the day
    // somebody ships some. `smelting-flux` — bare `flux` is the glassmaker's.
    const flux = contents.filter((s) => MixinApi.isTangible(s) && s.hasMaterialTag('smelting-flux'));
    // ⚠⚠ Raw coal reduces iron perfectly well and poisons it while doing
    // so — the reason coke had to be invented.
    const sour = fuel.some((s) => MixinApi.isTangible(s) && s.hasMaterialTag('sulfurous'));
    let fuelKg = 0;
    for (const f of fuel) if (MixinApi.isTangible(f)) fuelKg += f.getMass().rawValue();
    return { ore, stock, fuel, flux, sour, fuelKg };
  }

  /**
   * The tap. ⚠ The smelterman may be GONE — a player can log out inside a
   * run — and the furnace is still tapped; only the deed needs a body.
   */
  protected async tap(
    actor: Stuff,
    lots: ChargeLot[],
    c: Charge,
    metal: Material | null,
    carbon: number,
    heldK: number,
  ): Promise<ActDone<SmeltDone, SmeltRefusal>> {
    // Whoever owned the charge owns what it makes; consumed only AFTER the
    // pour reads it.
    const owner = lots.map((l) => l.stuff);
    const consume = (): void => {
      for (const lot of lots) StuffApi.destruct(lot.stuff);
      for (const basket of c.fuel) StuffApi.destruct(basket);
      // ⭐ The flux leaves as part of the slag — that is what it was for.
      for (const stone of c.flux) StuffApi.destruct(stone);
    };
    const metalPath = metal?.getTemplatePath() ?? '';
    const inheritedCarbon = this.carbonIn(lots);
    // ⚠ A bar going back to carburize loses NOTHING; ore is mostly not metal.
    const fromOre = inheritedCarbon === null;
    let chargeKg = 0;
    let metalKg = 0;
    for (const lot of lots) {
      chargeKg += lot.massKg;
      if (!fromOre) metalKg += lot.massKg;
      else if (metalPath) metalKg += lot.massKg * (lot.metals.find((m) => m.materialPath === metalPath)?.fraction ?? 0);
    }
    if (metal === null || metalKg <= 0) {
      await this.pour(SLAG_ROW, Math.max(chargeKg, 1), owner);
      consume();
      await this.credit(actor, 'standard', 'failure');
      return { ok: true, facts: { kind: 'slag' } };
    }

    const ferrous = metal.hasTag('ferrous');
    const iron = new IronCarbon(carbon);
    // ⭐⭐ The one branch that decides everything: two temperatures compared.
    const liquid = !ferrous || iron.meltsAt(heldK);
    const productMaterial = ferrous
      ? this.ferrousMaterialFor(carbon, liquid, inheritedCarbon, c.sour)
      : metalPath;
    const soured = c.sour && ferrous;
    const base = {
      kind: 'metal' as const,
      metalName: metal.getName(),
      ferrous,
      liquid,
      carbon,
      meltK: iron.meltingPointK(),
      chargeKg,
      heldK,
      soured,
    };

    // ⭐⭐ Molten metal goes into the crucible standing in the fire; with
    // none it pools on the hearth. Pouring it is the player's next act.
    if (liquid) {
      const run = await this.runIntoCrucible(productMaterial, metalKg, heldK, owner, carbon);
      this.wearLining(heldK, RUN_HOLD_S);
      await this.pour(SLAG_ROW, Math.max(chargeKg - metalKg, 0), owner);
      consume();
      await this.credit(actor, 'standard', ferrous ? 'partial' : 'success');
      return { ok: true, facts: { ...base, bloom: false, metalKg, run, fluxed: false } };
    }

    const productRow = StuffApi.findByTemplatePath<Material>(productMaterial)?.getCastTemplate() ?? '';
    if (!productRow) {
      // ⚠ An authoring fault, not a game outcome — loud, never a silent
      // bad smelt.
      consume();
      return { ok: false, reason: 'no-product-row', facts: { material: productMaterial } };
    }
    // A bloom carries its slag with it; everything else leaves it behind.
    const bloom = ferrous && inheritedCarbon === null;
    const trapped = c.flux.length > 0 ? BLOOM_SLAG_FLUXED : BLOOM_SLAG;
    const productKg = bloom ? metalKg * (1 + trapped) : metalKg;
    // ⭐ Carbon and trapped slag set BEFORE it moves, so the capture is of
    // the finished product.
    await this.pour(productRow, productKg, owner, (product) => {
      if (MixinApi.isComposition(product) && carbon > 0) product.setFractionOf(IronCarbon.CARBON, carbon);
      if (bloom && product instanceof Bloom) product.setSlagFraction(trapped / (1 + trapped));
    });
    await this.pour(SLAG_ROW, Math.max(chargeKg - productKg, 0), owner);
    consume();
    // ⭐ Credit by OUTCOME: steel is the hard thing; a soured bloom, like a
    // cast, is metal but not the metal you meant.
    const steel = ferrous && inheritedCarbon !== null;
    await this.credit(actor, steel ? 'hard' : 'standard', soured ? 'partial' : 'success');
    return { ok: true, facts: { ...base, bloom, metalKg, run: 'solid', fluxed: bloom && c.flux.length > 0 } };
  }

  /** The deed, if there is still a body to hold it. */
  protected async credit(
    actor: Stuff,
    difficulty: 'standard' | 'hard',
    outcome: 'success' | 'partial' | 'failure',
  ): Promise<void> {
    if (actor.isDestroyed() || !MixinApi.isAdvancing(actor)) return;
    await actor.creditDeed({ discipline: DISCIPLINE, difficulty, outcome });
  }

  /** The charge, as mass and grade-scaled metal fractions. */
  protected lotsOf(items: Stuff[]): ChargeLot[] {
    const out: ChargeLot[] = [];
    for (const item of items) {
      if (!MixinApi.isTangible(item)) continue;
      const count = MixinApi.isStackable(item) ? item.getQuantity() : 1;
      const material = item.getMaterial() as Material | null;
      const metals: CompositionEntry[] = [];
      if (material) {
        const composition = material.getComposition();
        if (composition.length > 0) {
          for (const entry of composition) {
            const m = StuffApi.findByTemplatePath<Material>(entry.materialPath);
            if (!m || !m.hasTag('metal')) continue;
            // ⭐ An ore lot folds its GRADE in; a bar is simply itself.
            const fraction = item instanceof Ore ? item.metalFractionOf(entry.materialPath) : entry.fraction;
            metals.push({ materialPath: entry.materialPath, fraction });
          }
        } else if (material.hasTag('metal')) {
          metals.push({ materialPath: material.getTemplatePath() ?? '', fraction: 1 });
        }
      }
      out.push({ stuff: item, massKg: item.getMass().rawValue() * count, metals });
    }
    return out;
  }

  /**
   * ⭐ The metal there is most of, by mass. Chalcopyrite carries copper AND
   * iron; which you get is which there is more of — a fact about the mineral.
   */
  protected dominantMetalOf(lots: ChargeLot[]): Material | null {
    const totals = new Map<string, number>();
    for (const lot of lots) {
      for (const m of lot.metals) totals.set(m.materialPath, (totals.get(m.materialPath) ?? 0) + lot.massKg * m.fraction);
    }
    let best: { path: string; kg: number } | null = null;
    for (const [path, kg] of totals) if (kg > 0 && (best === null || kg > best.kg)) best = { path, kg };
    return best ? (StuffApi.findByTemplatePath<Material>(best.path) ?? null) : null;
  }

  /** The carbon already dissolved in the charge, or `null` if it is ore. */
  protected carbonIn(lots: ChargeLot[]): number | null {
    let found: number | null = null;
    for (const lot of lots) {
      if (!MixinApi.isComposition(lot.stuff)) continue;
      found = (found ?? 0) + lot.stuff.fractionOf(IronCarbon.CARBON);
    }
    return found;
  }

  /**
   * ⭐⭐ The one number. From ore it is the fuel-to-ore RATIO; from stock
   * it is DIFFUSION — each run adds about the same, which is why steel is
   * made by repeating a thing. Either way, iron that took up enough carbon
   * to melt at the furnace's heat melted, and a melt saturates.
   */
  protected carbonFor(lots: ChargeLot[], fuelKg: number, fromOre: boolean, heldK: number): number {
    const chargeKg = lots.reduce((sum, l) => sum + l.massKg, 0);
    if (chargeKg <= 0) return C_BLOOM;
    const solid = fromOre
      ? Math.min(C_ORE_MAX, C_BLOOM + K_ORE * Math.max(0, fuelKg / chargeKg - R_STOICH))
      : Math.min((this.carbonIn(lots) ?? 0) + D_CARBURIZE, IronCarbon.C_AUSTENITE);
    return new IronCarbon(solid).meltsAt(heldK) ? IronCarbon.C_SAT : solid;
  }

  /**
   * The ferrous material a carbon figure and a phase add up to. ⚠⚠ The
   * sulfur decides the MATERIAL (hot-short iron, tagged `brittle`), never a
   * grade — `Bloom` and `Ingot` compose no grade, and the smith's verbs
   * already refuse a brittle metal.
   */
  protected ferrousMaterialFor(carbon: number, liquid: boolean, inheritedCarbon: number | null, sour: boolean): string {
    if (sour) return '/stuff/idea/material/alloy/sulfurous-iron';
    if (liquid) return '/stuff/idea/material/alloy/cast-iron';
    if (inheritedCarbon === null) return '/stuff/idea/material/alloy/bloom-iron';
    return carbon >= IronCarbon.C_STEEL_FLOOR ? '/stuff/idea/material/alloy/steel' : '/stuff/idea/material/element/iron';
  }

  /** A material's melting point, K, off the material's own row. */
  protected meltingPointKOf(metal: Material): number {
    const point = metal.getMeltingPoint?.();
    const value = typeof point === 'number' ? point : (point?.rawValue() ?? 0);
    return value > 0 ? value : IronCarbon.T_FE;
  }

  /**
   * Metal STOCK going back in to carburize — a piece of METAL that can say
   * what is in it, and not ore. (A firebrick carries a makeup too; it is not
   * metal, so it is not stock.)
   */
  protected isStock(item: Stuff): boolean {
    return !(item instanceof Ore) && MixinApi.isComposition(item) && MixinApi.isTangible(item) && item.hasMaterialTag('metal');
  }

  /** Charcoal (or coke, or coal): a material tagged `fuel` and `carbon`. */
  protected isFuel(item: Stuff): boolean {
    return MixinApi.isTangible(item) && item.hasMaterialTag('fuel') && item.hasMaterialTag('carbon');
  }

  /**
   * ⭐ The crucible standing IN the furnace — the first plain bulk vessel
   * that is not a mould and holds nothing or this same metal.
   */
  protected crucibleFor(metalPath: string): (Stuff & Bulkable & Thermal) | null {
    for (const item of this.getContents()) {
      const s = item as unknown as Stuff;
      if (!MixinApi.isBulkable(s) || !MixinApi.isThermal(s) || MixinApi.isMould(s)) continue;
      if (!s.hasInteriorBulk()) continue;
      const held = s.getBulkMaterialPath('interior');
      if (held !== null && held !== metalPath) continue;
      return s as Stuff & Bulkable & Thermal;
    }
    return null;
  }

  /**
   * Run `kg` of molten metal into the crucible, as BULK at the furnace's
   * held heat; what will not fit (all of it, with no crucible) pools on the
   * hearth and sets as the metal's own cast. Mass is conserved on every path.
   */
  protected async runIntoCrucible(
    metalPath: string,
    kg: number,
    heldK: number,
    madeFrom: readonly Stuff[],
    carbon: number,
  ): Promise<CrucibleRun> {
    const metal = StuffApi.findByTemplatePath<Material>(metalPath) ?? null;
    if (metal === null || kg <= 0) return 'hearth';
    const density = metal.getDensity().rawValue() || 8000;
    const litres = (kg / density) * 1000;
    const crucible = this.crucibleFor(metalPath);
    let keptL = 0;
    if (crucible !== null) {
      // ⭐ Both ends of the run at the furnace's heat BEFORE the metal
      // moves — a lazily-read pot (or a fresh receptacle at the ambient)
      // would set the copper in one step. Its cached ambient is restamped
      // first, so a furnace that went out in the preheat hands it its heat.
      await crucible.restamp();
      crucible.setContentsTemperature(heldK);
      const to = BulkableApi.slotFor(crucible, undefined);
      const source = await StuffApi.clone<Stuff & Bulkable & Thermal>(UNBOUNDED_RECEPTACLE);
      try {
        source.setContentsTemperature(heldK);
        source.setBulkMaterial('interior', metal);
        // ⭐ The carbon rides the run: the ingot the crucible pours takes it.
        if (carbon > 0) source.setBulkPayload('interior', { makeup: [{ materialPath: IronCarbon.CARBON, fraction: carbon }] });
        source.setContentsTemperature(heldK);
        const from = BulkableApi.slotFor(source, undefined);
        if (from && to) {
          const cap = crucible.getBulkCapacity('interior')?.rawValue() ?? 0;
          const room = Math.max(0, cap - crucible.getBulkAmount('interior').rawValue());
          keptL = BulkableApi.transfer(from, to, { kind: 'measure', litres: Math.min(litres, room), mode: 'lenient' }).applied ?? 0;
        }
      } finally {
        StuffApi.destruct(source);
      }
      if (keptL > 0) crucible.setContentsTemperature(heldK);
      // ⭐ A crucible wears with every melt, and at the end it CRACKS.
      if (keptL > 0 && MixinApi.isDurable(crucible)) {
        crucible.wear(this.crucibleWearPerMelt());
        if (crucible.isBroken() && MixinApi.isIntegrity(crucible) && !crucible.getFlaws().some((f) => f.kind === 'crack')) {
          crucible.addFlaw('crack', true);
        }
      }
    }
    const spilledKg = ((litres - keptL) / 1000) * density;
    if (spilledKg > 0.001) await this.hearthLump(metal, spilledKg, madeFrom);
    if (keptL <= 0) return 'hearth';
    return spilledKg > 0.001 ? 'spilled' : 'crucible';
  }

  /** A pool on the hearth, set: the metal's own cast, in the furnace. */
  protected async hearthLump(metal: Material, kg: number, madeFrom: readonly Stuff[]): Promise<void> {
    await this.pour(metal.getCastTemplate(), kg, madeFrom, (lump) => {
      if (!MixinApi.isTangible(lump) || lump.getMaterial()) return;
      lump.setMaterial(metal);
      if (MixinApi.isVisible(lump)) lump.setShortDescription(`cast lump of ${metal.getName()}`);
      if (MixinApi.isPerceptible(lump)) lump.setKeywords(['lump', 'cast', ...metal.getName().split(/\s+/)]);
    });
  }

  /**
   * Clone one product into the furnace, made FROM the charge (so it is the
   * charge's owner's), stamp its real mass, shape it, and put it there.
   */
  protected async pour(row: string, kg: number, madeFrom: readonly Stuff[], shape?: (item: Stuff) => void): Promise<void> {
    if (kg <= 0) return;
    const item = await StuffApi.clone<Stuff>(row, undefined, { madeFrom });
    if (MixinApi.isTangible(item)) item.setMass(Quantity.of(Number(kg.toFixed(3)), 'kg'));
    shape?.(item);
    ContainmentApi.move(item as unknown as Stuff & Containable, this as unknown as Stuff & Container);
  }

  /** How much one melt wears a crucible (`ceramics.crucible.wearPerMelt`). */
  protected crucibleWearPerMelt(): number {
    try {
      const raw = AppApi.setting('ceramics.crucible.wearPerMelt');
      const n = raw == null || raw === '' ? NaN : Number.parseFloat(raw);
      return Number.isFinite(n) && n > 0 ? n : CRUCIBLE_WEAR_DEFAULT;
    } catch {
      return CRUCIBLE_WEAR_DEFAULT;
    }
  }
}
