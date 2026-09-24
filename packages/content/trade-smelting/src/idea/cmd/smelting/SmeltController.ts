/**
 * SmeltController — `smelt`, and ⭐⭐ **the charge decides what you made.**
 *
 * The verb selects nothing. You put ore and fuel into a furnace, you
 * light it, you work the bellows or you do not, and what comes out is
 * whatever those choices actually make. There is no menu, no recipe
 * argument, and no place for a player to declare an intention the world
 * then honours.
 *
 * ## The yield is chemistry
 *
 *     metal out = Σ (lot mass × lot grade × the mineral's metal fraction)
 *
 * Every term is a fact something else already knows: the mass is the
 * lot's, the grade is what `hew` read off the deposit at the face, and
 * the metal fraction is the mineral's `composition` — which is itself
 * chemistry (two Cu in a 221.114 g/mol formula unit is 0.5748 by mass).
 * **Nobody anywhere authors how much metal comes out of a smelt.** That
 * is what makes grade load-bearing END TO END.
 *
 * ## The KIND is thermodynamics
 *
 * ⭐⭐ Above copper the ladder is not about how much metal but about
 * **which metal**, and it turns on one number: how much carbon ends up
 * dissolved in the iron.
 *
 * | what you charged | what you get | why |
 * |---|---|---|
 * | below `T_REDUCE` | nothing | the ore does not reduce; work the bellows |
 * | ore, modest fuel | a **bloom** (~0.05 % C) | reduced in the SOLID state — it never melts |
 * | ore, heavy fuel | a **pig** of cast iron (4 % C) | carbon lowered the melting point until it RAN |
 * | a bar, any fuel | a **steel bar** (+0.6 % C a run) | carburizing: diffusion into solid iron |
 *
 * ⭐ **Carbon lowers iron's melting point**, linearly toward the
 * eutectic, and that single fact is the whole mechanic: more fuel is not
 * more better. A charge that takes up enough carbon melts, and iron that
 * melted is iron you cannot forge. The player's decision is a ratio, the
 * feedback is a thing in their hands, and nothing in between is a dial
 * somebody chose for pacing.
 *
 * ## The product row is DISCOVERED, never listed
 *
 * ⚠ The run computes a material and then goes looking for the row whose
 * `_materialPath` is that material, under this trade's own `thing/`
 * namespace. An author who wants tin writes `tin-ingot.yaml` and nothing
 * here changes. A hardcoded map would make every new metal a code edit,
 * which is the shape a capability pack exists to avoid.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { CompositionEntry } from '@saxonberg/server/mud/lib/material/Material';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { Template } from '@saxonberg/server/mud/lib/stuff/Template';
import { ManualBuildStep } from '@saxonberg/server/mud/lib/craft/ManualBuildStep';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';

const TOPIC = 'act.deed';
const SMELTING = 'smelting';

const CARBON = '/stuff/idea/material/element/carbon';
const SLAG_ROW = '/trade/smelting/thing/slag';
/** Where the product rows live. The run looks them up; it never lists them. */
const PRODUCTS = '/trade/smelting/thing';

/**
 * How long a run takes, in game ms. ⚠ Two game minutes — ten real
 * seconds at the default clock scale. It was four game HOURS, which is
 * twenty real minutes of holding one key down, and out of family with
 * every other engaged act in the trade (`hew` 9 s, `drive` 40 s,
 * `hammer` 5 s). A real bloomery runs for most of a day; the game's
 * clock is the abstraction that already prices that, and an engagement
 * a player sits through is not the same fact.
 */
const SMELT_MS = 120_000;
/** Metabolic watts of holding a furnace at heat: (425 − 300) × 120 s / 1500 = the old 10 %. */
const SMELT_EFFORT_W = 425;
/**
 * The MINIMUM charcoal a run wants. ⚠ More than the ore by mass, which
 * is why the smelter sits next to the fuel yard rather than next to the
 * mine.
 *
 * ⭐⭐ A run consumes **everything in the furnace**, not this many
 * baskets. It used to take `fuel.slice(0, 2)` and strand the rest,
 * which meant the charge had no *ratio* — and the fuel-to-ore ratio is
 * the whole of the carbon decision above copper. You charge a furnace;
 * you do not meter it.
 */
const CHARCOAL_MINIMUM = 2;

// ---------- ⭐ the Fe–C facts, and they are facts ----------

/**
 * Solid-state reduction: the temperature at which iron oxide gives up
 * its oxygen to carbon monoxide. ⚠ Well BELOW iron's 1811 K melting
 * point, which is the entire reason a bloomery works at all and the
 * reason the iron rung is a FUEL-TECHNOLOGY rung rather than a
 * temperature one.
 */
const T_REDUCE = 1470;
/** Pure iron's melting point, and the top of the `T_melt(C)` line. */
const T_FE = 1811;
/** The eutectic floor — carbon cannot lower it past this. */
const T_EUTECTIC = 1420;
/** Saturation: what iron that actually melted takes up. The eutectic. */
const C_SAT = 0.043;
/**
 * How far each point of carbon drops the melting point, K per unit
 * fraction. Derived so that `T_melt(C_SAT) = T_EUTECTIC`: the line runs
 * from pure iron at 0 % to the eutectic at saturation, which is the
 * shape of the real phase diagram's liquidus and is the whole reason a
 * bloomery can accidentally make something it cannot forge.
 */
const K_MELT = (T_FE - T_EUTECTIC) / C_SAT;

/** Carbon a bloom picks up at the leanest workable charge. */
const C_BLOOM = 0.0005;
/**
 * ⭐⭐ **The fuel a charge needs just to REDUCE**, in kg of charcoal per
 * kg of ore. Below this the carbon has somewhere to be — it is busy
 * taking the oxygen off the iron — and the bloom comes out lean.
 *
 * The carbon that ends up dissolved in the metal is what is left OVER,
 * and modelling it as an excess rather than as a straight ratio is what
 * gives the ladder its real shape: a lean charge and a slightly-rich
 * charge both make blooms, and then there is a point past which the
 * thing runs away from you. A straight ratio makes every extra basket
 * equally dangerous, which is neither true nor interesting.
 */
const R_STOICH = 3.7;
/** Carbon each surplus kg-per-kg of fuel dissolves into the iron. */
const K_ORE = 0.0075;
/** The most carbon a SOLID reduction from ore reaches before it runs. */
const C_ORE_MAX = 0.03;
/** Carbon one carburizing run diffuses into solid stock. */
const D_CARBURIZE = 0.006;
/** Austenite's limit — solid iron cannot dissolve more than this. */
const C_STOCK_MAX = 0.021;
/**
 * The bottom of the steel band. Below it you have wrought iron, which
 * bends; above ~2 % you have cast iron, which shatters.
 */
const C_STEEL_FLOOR = 0.002;
/** Slag trapped in a bloom, as a fraction of its mass. */
const BLOOM_SLAG = 0.3;
/**
 * ⭐⭐ Slag trapped in a bloom smelted **with a flux**, and this pair of
 * numbers is the whole of why limestone matters.
 *
 * A flux lowers the gangue's melting point, so the waste runs OUT of the
 * bloom as a liquid slag instead of staying in it as sponge. 30 % trapped
 * becomes 12 %: the same rock yields a bloom with less than half the rubbish
 * in it, and a smith who has hammered both can feel the difference.
 *
 * ⚠ The demand was there first and was being met by a fiction: the metal
 * chain shipped with `flux` as a named hole and nothing in the world produced
 * one. Limestone is that producer, and the quarry is where it comes from.
 */
const BLOOM_SLAG_FLUXED = 0.12;

/*
 * ⭐ What those numbers actually produce, at Rejection's furnace with the
 * bellows working (1420 K × 1.12 = 1590 K), charging 1.4 kg lumps and
 * 8 kg baskets. Nothing below is authored; it all falls out of the two
 * lines above.
 *
 * | charge            | carbon | T_melt | what you get            |
 * |-------------------|--------|--------|-------------------------|
 * | 3 lumps, 2 baskets| 0.13 % | 1799 K | a bloom                 |
 * | 3 lumps, 3 baskets| 1.56 % | 1669 K | a bloom — NATURAL STEEL |
 * | 3 lumps, 4 baskets| 4.3 %  | 1539 K | it RAN: a cast pig      |
 * | bellows off       |    —   |    —   | 1420 K: it will not reduce |
 *
 * ⭐⭐ The middle row is the good one, and nobody designed it: charge a
 * little rich and the bloom comes out carrying enough carbon to beat
 * straight into steel. That is how most pre-modern steel was actually
 * made, and it is here because the arithmetic says so.
 */

/** The melting point of iron carrying `carbon`, in K. */
function meltingPointOf(carbon: number): number {
  return Math.max(T_EUTECTIC, T_FE - K_MELT * carbon);
}

interface ChargeLot {
  stuff: Stuff;
  massKg: number;
  /** The mineral's composition entries, already scaled by this lot's grade. */
  metals: CompositionEntry[];
}

/** The fire, bound by the view. */
interface SmeltModel extends CommandModel {
  furnace?: MqlOneResult;
}

export default class SmeltController extends CommandController<SmeltModel> {
  async execute(model: SmeltModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    // ⭐ Read, never hunted. The binder resolves the fire; whether it is
    // a fire you can CHARGE — a container, not a forge — stays here,
    // because no mixin says "you can put ore in this".
    const furnace = model.furnace?.stuff ?? null;
    if (!furnace || !MixinApi.isFurnace(furnace) || !MixinApi.isContainer(furnace)) {
      this.decline(context, Mml.compose`There is no furnace here to charge.`, 'no-furnace');
      return;
    }

    // ⚠⚠ A charcoal CLAMP is a furnace and a container, and the fuel
    // yard is one passable exit from the smelter — which is exactly the
    // reach `peers` has, and the reach the anvil has had all along. So
    // the verb legitimately arrives here, finds the clamp, and must
    // decline for a reason about what a clamp IS.
    //
    // ⭐ And the reason is the clamp's own whole mechanic: it is a heap
    // kept deliberately STARVING. Charring is running a fire that is not
    // allowed enough air to burn, and you cannot reduce ore in something
    // you are keeping away from the air. Duck-typed on `draught` (the
    // shape-not-mixin rule `analyze water` uses) rather than narrowed on
    // the class, so this pack gains no dependency on the fuel trade.
    if (isClamp(furnace)) {
      this.decline(
        context,
        Mml.compose`That is a charcoal clamp, not a smelting furnace. The whole art of it is keeping the air OUT — a clamp that got enough draught to reduce an ore would have burned its own charge to ash hours ago. Take the ore to a shaft with a tuyère in it.`,
        'not-a-smelter',
      );
      return;
    }

    const contents = furnace.getContents() as Stuff[];
    const ore = contents.filter((c) => isOre(c));
    const stock = contents.filter((c) => isStock(c));
    const fuel = contents.filter((c) => isCharcoal(c));
    // ⭐ The flux, by material TAG rather than by row: limestone answers it
    // today and dolomite answers it the day somebody ships some.
    const flux = contents.filter((c) => isFlux(c));
    // ⚠⚠ And the SULFUR, which is the coal question: raw coal reduces iron
    // perfectly well and poisons it while doing so, which is exactly why coke
    // had to be invented. Read off the fuel's own material, so nothing here
    // names coal.
    const sour = fuel.some((c) => isSulfurous(c));

    if (ore.length === 0 && stock.length === 0) {
      this.decline(context, Mml.compose`The furnace holds nothing to work on.`, 'no-ore');
      return;
    }
    // ⚠ One kind of charge at a time. Reducing ore and carburizing a bar
    // are different processes wanting different atmospheres, and a run
    // that averaged them would be answering a question nobody asked.
    if (ore.length > 0 && stock.length > 0) {
      this.decline(
        context,
        Mml.compose`Ore and metal together — take one or the other out. You are either reducing rock or you are working a bar, and the furnace cannot do both at once.`,
        'mixed-charge',
      );
      return;
    }
    if (fuel.length < CHARCOAL_MINIMUM) {
      this.decline(
        context,
        Mml.compose`Not enough charcoal in the furnace — a run wants at least ${String(CHARCOAL_MINIMUM)} baskets and there ${fuel.length === 1 ? 'is' : 'are'} ${String(fuel.length)}.`,
        'no-fuel',
      );
      return;
    }

    const charge = ore.length > 0 ? lotsOf(ore) : lotsOf(stock);
    const metal = dominantMetalOf(charge);
    const held = furnace.getHeldTemperatureK();

    if (metal === null) {
      // No metal in the charge at all — it runs to slag, and saying so
      // is better than inventing a token bar. The heat gate has nothing
      // to gate on, so the run is allowed and its answer is honest.
      this.engage(context, () => {
        void runCharge(context, furnace as Stuff & Container, charge, fuel, flux, sour, null, 0, held);
      });
      return;
    }

    const ferrous = metal.hasTag('ferrous');
    const wanted = ferrous ? T_REDUCE : meltingPointKOf(metal);

    // ⚠⚠ **An unlit furnace is not a cool furnace — it is a cold one,
    // and it needs a different sentence.** `getHeldTemperatureK()` is
    // `burnTemperatureK × bellows`: the temperature this furnace WOULD
    // pin at, computed without reference to whether anything is burning
    // in it. So a stone-cold shaft reports 1420 K, and the refusal below
    // used to answer a charged-but-unlit furnace with *"it is holding
    // 1420 K … work the bellows"* — a number it is not at, and an act
    // that cannot help. ⭐ Working the bellows then says *"air without
    // fire moves nothing"*, so a player who does exactly what the game
    // told them is sent in a circle. Found by driving it in a browser;
    // every unit test lit the furnace first.
    if (!furnace.isLit()) {
      this.decline(
        context,
        Mml.compose`The charge is in and the shaft is stone cold. Nothing reduces until something is burning — light it, and then work the bellows.`,
        'not-lit',
      );
      return;
    }

    if (held < wanted) {
      // ⭐ Lit but short of the mark: NOW the bellows is the answer, and
      // only if it is not already going. Once it is, the shortfall is
      // the fuel's, not the draught's.
      const bellowsLeft = !furnace.isBellowsActive();
      this.decline(
        context,
        ferrous
          // ⭐ A DIFFERENT refusal, because it is a different physics.
          // Iron does not want to be melted; it wants to be reduced, and
          // the heat that reduces it is the fuel-technology rung.
          ? bellowsLeft
            ? Mml.compose`The furnace is holding ${String(Math.round(held))} K and the ore will not give up its oxygen below about ${String(Math.round(wanted))} K. It is not a question of melting the rock — work the bellows.`
            : Mml.compose`The furnace is holding ${String(Math.round(held))} K with the bellows already going, and the ore will not give up its oxygen below about ${String(Math.round(wanted))} K. The draught is not the problem — this fuel does not burn hot enough.`
          : bellowsLeft
            ? Mml.compose`The furnace is holding ${String(Math.round(held))} K and the run wants ${String(Math.round(wanted))} K. Work the bellows.`
            : Mml.compose`The furnace is holding ${String(Math.round(held))} K with the bellows already going, and the run wants ${String(Math.round(wanted))} K. This fuel does not burn hot enough.`,
        'too-cold',
      );
      return;
    }

    const carbon = ferrous
      ? carbonFor(charge, fuel.length, ore.length > 0, held)
      : 0;

    // ⚠⚠ A free function, never `this.<method>`: a controller is one
    // ephemeral clone per execution, destructed the moment `execute`
    // returns, and a run holds the furnace at heat. A completion calling
    // back into it would run on a destroyed Stuff and the proxy would
    // answer with a silent no-op — the charge would go in and no metal
    // would ever come out. The mining acts shipped that bug and a live
    // drive found it; this never did.
    this.engage(context, () => {
      void runCharge(context, furnace as Stuff & Container, charge, fuel, flux, sour, metal, carbon, held);
    });
  }

  private engage(context: CommandContext, onDone: () => void): void {
    const giver = context.commandGiver;
    if (
      MixinApi.isExerting(giver) &&
      !giver.canExert(SMELT_EFFORT_W, SMELT_MS / 1000)
    ) {
      this.decline(context, Mml.fromMarkup(giver.exhaustionRefusal()), 'too-tired');
      return;
    }
    if (!MixinApi.isEngaged(giver)) {
      onDone();
      return;
    }
    const step = new ManualBuildStep({
      actor: giver,
      slots: ['attention'],
      durationMs: SMELT_MS,
      effortW: SMELT_EFFORT_W,
      onComplete: onDone,
    });
    const result = SchedulerApi.start(step);
    if (result.ok && result.status !== 'completed-sync') context.note(result.note);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You charge the furnace and settle in to hold it at heat.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} charges the furnace.`)
      .send();
  }

  private decline(
    context: CommandContext,
    prose: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}

/**
 * The run. ⭐ Every number below comes from something else's knowledge:
 * nothing here decides how much metal there is, and nothing here decides
 * what a metal is.
 *
 * ⚠⚠ A module function: the controller is long gone by the time the
 * furnace is tapped.
 */
async function runCharge(
  context: CommandContext,
  furnace: Stuff & Container,
  charge: ChargeLot[],
  fuel: Stuff[],
  /** Flux in the charge — consumed with the fuel; it does its work and goes. */
  flux: Stuff[],
  /** Whether any fuel in the charge carries sulfur (raw coal). */
  sour: boolean,
  metal: Material | null,
  carbon: number,
  heldK: number,
): Promise<void> {
  const giver = context.commandGiver;
  // ⚠⚠ The smelterman may be GONE — a player can log out inside a run.
  // Narrating to a departed actor renders `undefined` into the scene
  // composer and throws an unhandled rejection that takes the process
  // down. ⭐ The furnace is still TAPPED, because the charge does not
  // stop reducing because somebody left; only the telling of it needs a
  // listener.
  const watching = !giver.isDestroyed();
  const metalPath = metal?.getTemplatePath() ?? '';

  let chargeKg = 0;
  let metalKg = 0;
  const inheritedCarbon = carbonIn(charge);
  // ⚠ A bar going back into the fire to carburize loses NOTHING: nothing
  // is being separated out of it, and a trace of carbon is going in. Ore
  // is the case where most of what you charged is not metal.
  const fromOre = inheritedCarbon === null;
  for (const lot of charge) {
    chargeKg += lot.massKg;
    if (!fromOre) {
      metalKg += lot.massKg;
    } else if (metalPath) {
      metalKg += lot.massKg * (lot.metals.find((m) => m.materialPath === metalPath)?.fraction ?? 0);
    }
  }
  for (const lot of charge) StuffApi.destruct(lot.stuff);
  for (const basket of fuel) StuffApi.destruct(basket);
  // ⭐ The flux goes with them. It is not a tool you get back: it leaves as
  // part of the slag, which is the whole of what it was for.
  for (const stone of flux) StuffApi.destruct(stone);

  if (metal === null || metalKg <= 0) {
    await pour(furnace, SLAG_ROW, Math.max(chargeKg, 1));
    if (!watching) return;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You tap the furnace and get slag — nothing but slag. Whatever was in that rock, it was not metal.`,
      )
      .send();
    if (MixinApi.isAdvancing(giver))
      await giver.creditDeed({ discipline: SMELTING, difficulty: 'standard', outcome: 'failure' });
    return;
  }

  const ferrous = metal.hasTag('ferrous');
  // ⭐⭐ The one branch that decides everything, and it is a comparison
  // between two temperatures rather than a choice between three names.
  const liquid = !ferrous || heldK >= meltingPointOf(carbon);
  const productMaterial = ferrous
    ? await ferrousMaterialFor(carbon, liquid, inheritedCarbon, sour)
    : metal.getTemplatePath() ?? '';

  const row = await productRowFor(productMaterial);
  if (!row) {
    // ⚠ A reachability failure, not a game outcome — and it fails LOUDLY
    // rather than eating the charge, because a missing row is an
    // authoring bug and a silent one would look like a bad smelt.
    if (watching) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`The furnace runs, and what it makes has no name anybody here knows. (No product row carries ${productMaterial} — this is an authoring fault, not your smelt.)`,
        )
        .send();
    }
    context.note({ kind: 'controller-rejected', reason: 'no-product-row', detail: productMaterial });
    return;
  }

  // A bloom carries its slag with it; everything else leaves it behind.
  const bloom = ferrous && !liquid && inheritedCarbon === null;
  // ⭐⭐ **The flux's one effect, and it is on the PRODUCT's mass as well as
  // on its grade.** Less trapped slag means a smaller, cleaner bloom out of
  // the same rock — which is the honest reading: the waste left, it did not
  // become metal.
  const trapped = flux.length > 0 ? BLOOM_SLAG_FLUXED : BLOOM_SLAG;
  const productKg = bloom ? metalKg * (1 + trapped) : metalKg;
  const product = await pour(furnace, row, productKg);
  if (product && MixinApi.isAlloyed(product) && carbon > 0) {
    product.setFractionOf(CARBON, carbon);
  }
  if (product && bloom) {
    const spongy = product as unknown as { setSlagFraction?(v: number): void };
    spongy.setSlagFraction?.(trapped / (1 + trapped));
  }
  // ⭐ Whether this run was poisoned — read for the tap scene and the deed,
  // and nothing else: the MATERIAL already carries the consequence.
  //
  // ⚠ Non-ferrous is untouched, and that is not an oversight: sulfur is
  // iron's problem. Copper is smelted FROM a sulfide.
  const soured = sour && ferrous;
  await pour(furnace, SLAG_ROW, Math.max(chargeKg - productKg, 0));

  if (!watching) return;
  // ⭐ The tap names what the flux and the fuel did, because a player who is
  // not told cannot learn it. Two sentences, each earned by a thing in the
  // charge rather than by a branch on a recipe name.
  const fluxLine =
    flux.length > 0 && bloom
      ? ' The limestone took the gangue off as a running slag — there is far less rubbish in this bloom than the rock had in it.'
      : '';
  const sourLine = soured
    ? " And the coal's sulfur is in the iron — hot-short; it will crack under the hammer rather than draw."
    : '';
  MessageApi.scene(giver)
    .topic(TOPIC)
    .toSelf(
      Mml.compose`${tapScene(metal, ferrous, liquid, bloom, carbon, metalKg, chargeKg, heldK)}${fluxLine}${sourLine}`,
    )
    .toPeers(Mml.compose`${Mml.actor(giver)} taps the furnace.`)
    .send();
  if (MixinApi.isAdvancing(giver)) {
    // ⭐ Credit by OUTCOME, not by act. Steel is the hard thing and is
    // credited as one; a cast is metal but not the metal you meant, so
    // it is a partial — the ledger agrees with what happened.
    const steel = ferrous && !liquid && inheritedCarbon !== null;
    await giver.creditDeed({
      discipline: SMELTING,
      difficulty: steel ? 'hard' : 'standard',
      // ⚠ A soured bloom is a PARTIAL, like a cast: metal came out and it is
      // not the metal you meant. The ledger agrees with what happened.
      outcome: (liquid && ferrous) || soured ? 'partial' : 'success',
    });
  }
}

/** What the tap looks like, and it says WHY. */
function tapScene(
  metal: Material,
  ferrous: boolean,
  liquid: boolean,
  bloom: boolean,
  carbon: number,
  metalKg: number,
  chargeKg: number,
  heldK: number,
): ReturnType<typeof Mml.compose> {
  const pct = (carbon * 100).toFixed(2);
  if (!ferrous) {
    return Mml.compose`You tap the furnace. Red metal runs into the sand and stiffens as you watch — ${metalKg.toFixed(2)} kg of ${metal.getName()} out of ${chargeKg.toFixed(2)} kg of rock, and a heap of slag for the rest.`;
  }
  if (liquid) {
    // ⭐ It ran EASIER, and the prose says so, because that is the trap:
    // the failure looks like the success.
    return Mml.compose`It runs. You were expecting to rake a mass out of the bottom and instead the furnace pours, easily, a grey stream into the sand — ${metalKg.toFixed(2)} kg of it. Too much charcoal: at ${pct}% carbon this melted at ${String(Math.round(meltingPointOf(carbon)))} K instead of ${String(T_FE)}, and what is cooling there is hard, grey and good for nothing you can hammer.`;
  }
  if (bloom) {
    return Mml.compose`Nothing pours. You rake the bottom of the shaft and drag out a mass the size of a loaf, glowing dull and shot through with glass — ${metalKg.toFixed(2)} kg of iron out of ${chargeKg.toFixed(2)} kg of rock, at ${pct}% carbon, and it never melted at all. It will not be a bar until it has been beaten into one.`;
  }
  return Mml.compose`You draw the bar out and let it cool. It went in soft and it is coming out hard: the charcoal has worked ${pct}% carbon into it at ${String(Math.round(heldK))} K, which is the band — you have made steel, and you could just as easily have overshot it.`;
}

// ---------- the reads the decision is built from ----------

/** The charge, as mass and grade-scaled metal fractions. */
function lotsOf(items: Stuff[]): ChargeLot[] {
  const out: ChargeLot[] = [];
  for (const item of items) {
    const lump = item as unknown as {
      getQuantity?(): number;
      getMass?(): Quantity<'kg'>;
      metalFractionOf?(path: string): number;
      getMaterial?(): Material | null;
    };
    const count = lump.getQuantity?.() ?? 1;
    const each = lump.getMass?.().rawValue() ?? 0;
    const material = lump.getMaterial?.() ?? null;
    const metals: CompositionEntry[] = [];
    if (material) {
      const composition = material.getComposition();
      if (composition.length > 0) {
        for (const entry of composition) {
          const metal = StuffApi.findByTemplatePath<Material>(entry.materialPath);
          if (!metal || !metal.hasTag('metal')) continue;
          // ⭐ `metalFractionOf` already folds the lump's GRADE in. A bar
          // has no grade and is simply itself.
          const fraction = lump.metalFractionOf?.(entry.materialPath) ?? entry.fraction;
          metals.push({ materialPath: entry.materialPath, fraction });
        }
      } else if (material.hasTag('metal')) {
        // A pure metal bar: it IS the metal, whole.
        metals.push({ materialPath: material.getTemplatePath() ?? '', fraction: 1 });
      }
    }
    out.push({ stuff: item, massKg: each * count, metals });
  }
  return out;
}

/**
 * ⭐ The metal there is most of, by mass. Chalcopyrite carries copper
 * AND iron; which one you get out of it is which one there is more of,
 * which is a fact about the mineral rather than a rule about the game.
 */
function dominantMetalOf(charge: ChargeLot[]): Material | null {
  const totals = new Map<string, number>();
  for (const lot of charge) {
    for (const m of lot.metals) {
      totals.set(m.materialPath, (totals.get(m.materialPath) ?? 0) + lot.massKg * m.fraction);
    }
  }
  let best: { path: string; kg: number } | null = null;
  for (const [path, kg] of totals) {
    if (kg > 0 && (best === null || kg > best.kg)) best = { path, kg };
  }
  return best ? StuffApi.findByTemplatePath<Material>(best.path) ?? null : null;
}

/** The carbon already dissolved in the charge, or `null` if it is ore. */
function carbonIn(charge: ChargeLot[]): number | null {
  let found: number | null = null;
  for (const lot of charge) {
    if (!MixinApi.isAlloyed(lot.stuff)) continue;
    found = (found ?? 0) + lot.stuff.fractionOf(CARBON);
  }
  return found;
}

/**
 * ⭐⭐ **The one number.** From ore it is the fuel-to-ore RATIO: more
 * charcoal, more carbon, and past a point the charge melts. From stock
 * it is DIFFUSION: carbon migrates into solid iron over time, so the
 * ratio only has to clear the minimum and each run adds about the same
 * amount — which is why steel is made by repeating a thing, not by
 * getting one thing exactly right.
 */
function carbonFor(
  charge: ChargeLot[],
  baskets: number,
  fromOre: boolean,
  heldK: number,
): number {
  const chargeKg = charge.reduce((sum, l) => sum + l.massKg, 0);
  if (chargeKg <= 0) return C_BLOOM;

  if (!fromOre) {
    const already = carbonIn(charge) ?? 0;
    const carburized = Math.min(already + D_CARBURIZE, C_STOCK_MAX);
    // A bar hot enough to melt at its own carbon saturates like any melt.
    return heldK >= meltingPointOf(carburized) ? C_SAT : carburized;
  }

  const ratio = (baskets * FUEL_KG_PER_BASKET) / chargeKg;
  // ⭐ The EXCESS over what reduction itself consumes — see `R_STOICH`.
  const surplus = Math.max(0, ratio - R_STOICH);
  const solid = Math.min(C_ORE_MAX, C_BLOOM + K_ORE * surplus);
  // ⭐ …and then the check that makes the ratio matter: if the iron took
  // up enough carbon to melt at the heat the furnace is holding, it
  // melted, and a melted charge saturates.
  return heldK >= meltingPointOf(solid) ? C_SAT : solid;
}

/**
 * Charcoal in a basket, kg. ⚠ A constant here rather than the basket's
 * own mass so the ratio is about how many baskets a player counted in,
 * which is the thing they can actually decide.
 */
const FUEL_KG_PER_BASKET = 8;

/** The ferrous material a carbon figure and a phase add up to. */
async function ferrousMaterialFor(
  carbon: number,
  liquid: boolean,
  inheritedCarbon: number | null,
  /** Whether the fuel carried sulfur — raw coal (extraction build). */
  sour: boolean,
): Promise<string> {
  // ⚠⚠ **The sulfur decides the MATERIAL, not a grade**, and that correction
  // matters: the plan said to write the product's *Graded* face down to
  // `poor`, and **neither `Bloom` nor `Ingot` composes `GradedMixin`** — so
  // `setGrade` would have been a silent no-op and coal would have made
  // perfectly good iron. A test caught it.
  //
  // ⭐ The material is also the BETTER answer, because the smith's own verbs
  // already read it: `hammer`, `forge` and `quench` all refuse a
  // `brittle`-tagged metal, so *"it will crack under the hammer"* stops being
  // prose and becomes a fact the world enforces. Which is how cast iron has
  // always said the same thing.
  if (sour) return '/stuff/idea/material/alloy/sulfurous-iron';
  if (liquid) return '/stuff/idea/material/alloy/cast-iron';
  // From ore, solid: a bloom, whatever its carbon — it is still full of
  // the slag it was reduced in, and that is what makes it a bloom.
  if (inheritedCarbon === null) return '/stuff/idea/material/alloy/bloom-iron';
  // From stock, solid: in the band it is steel, under it still iron.
  return carbon >= C_STEEL_FLOOR
    ? '/stuff/idea/material/alloy/steel'
    : '/stuff/idea/material/element/iron';
}

/**
 * ⭐ The row whose `_materialPath` is this material, found under the
 * trade's own namespace. An author adds tin by authoring
 * `tin-ingot.yaml`; no code anywhere changes.
 */
async function productRowFor(materialPath: string): Promise<string | null> {
  if (!materialPath) return null;
  for (const tpl of await Template.findDescendants(PRODUCTS)) {
    const data = (tpl.data ?? {}) as Record<string, unknown>;
    if (data['_materialPath'] === materialPath) return tpl.path;
  }
  return null;
}

/** Clone one product into the furnace and stamp its real mass. */
async function pour(furnace: Stuff & Container, row: string, kg: number): Promise<Stuff | null> {
  if (kg <= 0) return null;
  const item = await StuffApi.clone<Stuff>(row);
  const massed = item as unknown as { setMass?(q: Quantity<'kg'>): void };
  massed.setMass?.(Quantity.of(Number(kg.toFixed(3)), 'kg'));
  ContainmentApi.move(item as unknown as Stuff & Containable, furnace as never);
  return item;
}

/** A material's melting point in K, off the material's own row. */
function meltingPointKOf(metal: Material): number {
  const point = metal.getMeltingPoint?.();
  const value = typeof point === 'number' ? point : point?.rawValue() ?? 0;
  return value > 0 ? value : T_FE;
}

/**
 * A charcoal clamp: the one furnace in the game whose draught is a dial
 * somebody sets, because keeping the air out is what it is FOR.
 */
function isClamp(item: Stuff): boolean {
  return typeof (item as unknown as { getDraught?: unknown }).getDraught === 'function';
}

/** An ore lot: anything that can say what fraction of it is a given metal. */
function isOre(item: Stuff): boolean {
  return typeof (item as unknown as { metalFractionOf?: unknown }).metalFractionOf === 'function';
}

/**
 * Metal STOCK: a bar you are putting back in the fire to carburize.
 * ⚠ Alloyed and not ore — the mixin is exactly the "this is a piece of
 * metal that can say what is in it" test, which is what the second
 * charge regime needs and what an ore lump is not.
 */
function isStock(item: Stuff): boolean {
  return !isOre(item) && MixinApi.isAlloyed(item) && MixinApi.isTangible(item);
}

/**
 * ⭐ A FLUX: a thing whose material carries the `flux` tag.
 *
 * ⚠ A tag and not a row, deliberately — limestone answers it today, dolomite
 * or fluorspar answer it the day somebody ships one, and this file never
 * learns either word. The metal chain named `flux` as a hole and nothing in
 * the world filled it until the quarry did.
 */
function isFlux(item: Stuff): boolean {
  if (!MixinApi.isTangible(item)) return false;
  return item.hasMaterialTag('flux');
}

/**
 * ⚠⚠ A SULFUROUS fuel — raw coal, and the reason coke exists.
 *
 * Coal reduces iron perfectly well and poisons it while doing so: the sulfur
 * goes into the metal and makes it hot-short, so it cracks under the hammer
 * instead of drawing. That is a real historical wall and it is why the whole
 * coke chain had to be invented; `metal-chain-slate` owns the way through it.
 */
function isSulfurous(item: Stuff): boolean {
  if (!MixinApi.isTangible(item)) return false;
  return item.hasMaterialTag('sulfurous');
}

/** Charcoal: a thing whose material is tagged `fuel` and `carbon`. */
function isCharcoal(item: Stuff): boolean {
  if (!MixinApi.isTangible(item)) return false;
  const material = item.getMaterial() as Material | null;
  const tags = material?.getTags?.() ?? [];
  return tags.includes('fuel') && tags.includes('carbon');
}
