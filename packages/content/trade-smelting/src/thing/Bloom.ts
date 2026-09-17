/**
 * Bloom — ⭐⭐ **what actually comes out of a bloomery, and it is not a
 * bar.**
 *
 * A bloomery never melts its charge. Iron oxide is REDUCED in the solid
 * state at around 1470 K, well below iron's 1811 K melting point, so
 * what forms at the bottom of the shaft is not a pour but a *mass*: a
 * spongy lump of iron particles welded to each other with the slag that
 * was in the rock still trapped in the holes between them.
 *
 * ⚠ **A bloom is not stock**, and the whole of `hammer`'s existence is
 * the reason why. You cannot make a knife out of a bloom, because a
 * bloom is a quarter glass by mass and full of voids. What you do is
 * beat it, hot, until the slag is squeezed out and the iron has welded
 * to itself — and what you have then is a bar. That step is visible, it
 * costs mass, and a player who has done it once knows why a bar is worth
 * what a bar is worth.
 *
 * ⭐ **The class is what makes the rule data rather than a special
 * case.** Its material (`alloy/bloom-iron`) is not tagged `forgeable`,
 * so no anvil recipe can take one and the kernel's one-shot gather never
 * picks one up — silently and correctly. Nothing anywhere had to say
 * *"if it is a bloom, refuse"*.
 *
 * ⚠ **Not `extends Ingot`.** *A bloom is not a bar* is the requirement,
 * and a class saying it IS one would undo it in the one place a reader
 * would believe. It composes the same three things an `Ingot` does — it
 * is a build vessel so `heat` and `hammer` reach it, it melts because it
 * is iron, and it alloys because it has carbon in it — and it is its own
 * thing.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { MeltableMixin } from '@saxonberg/server/mud/lib/thermal/Meltable';
import { ManualBuildMixin } from '@saxonberg/server/mud/lib/craft/ManualBuild';
import { AlloyedMixin } from '@saxonberg/server/mud/lib/material/Alloyed';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';

const BloomBase = AlloyedMixin(ManualBuildMixin(MeltableMixin(ThermalMixin(Thing))));

/** The two bars a consolidated bloom can become, and the slag it leaves. */
const IRON_BAR = '/trade/smithing/thing/iron-ingot';
const STEEL_BAR = '/trade/smelting/thing/steel-ingot';
const SLAG_ROW = '/trade/smelting/thing/slag';
const CARBON = '/stuff/idea/material/element/carbon';

/**
 * ⭐⭐ The bottom of the steel band. A bloom off a rich charge comes out
 * carrying enough carbon to beat straight into steel without ever being
 * carburized — **natural steel**, which is how most pre-modern steel was
 * actually made. Nobody designed that rung in; it falls out of the
 * smelt's own arithmetic, and honouring it here is what stops the bar
 * lying about what it is.
 */
const C_STEEL_FLOOR = 0.002;

/** What a consolidation actually did, for the verb to narrate. */
export interface Consolidation {
  /** The bar that is now standing where the bloom was. */
  bar: Stuff;
  /** Whether the carbon it carried made it steel rather than iron. */
  steel: boolean;
  /** Kilograms of slag squeezed out and left on the floor. */
  slagKg: number;
  /** Kilograms of iron in the bar. */
  barKg: number;
}

export default class Bloom extends BloomBase {
  static fieldMeta: FieldMeta = {
    slagFraction: { persistent: true, authorable: true },
  };

  /**
   * How much of this bloom's mass is slag rather than iron, `[0, 1]`.
   *
   * ⭐ Stamped by the smelt from the charge it actually ran, so a bloom
   * off a lean charge carries more glass than one off a rich charge —
   * and the mass a player loses at the anvil is the ore's grade arriving
   * one hop further down the chain.
   *
   * ⚠ On `Bloom` and not on `AlloyedMixin`: a steel bar has no slag in
   * it, and a field there would need a guard asking *"is this a
   * bloom?"* — which is the wrong-host tell.
   */
  protected slagFraction: number = 0.3;

  public getSlagFraction(): number { return this.slagFraction; }
  public setSlagFraction(value: number): void {
    this.slagFraction = value < 0 ? 0 : value > 1 ? 1 : value;
  }

  /**
   * ⭐⭐ **Beat the slag out of it, and what is left is a bar.**
   *
   * The whole transform, in one act, because that is how many acts it is
   * in the world: the slag goes on the floor, the iron welds to itself,
   * the carbon stays where it was, and the bloom stops existing. The
   * caller (`hammer`) narrates what it returns.
   *
   * ⚠⚠ **A transform and not a recipe**, and the reason is a pincer in
   * the kernel rather than a preference: `CraftingLogic.mintWorkpiece`
   * requires a recipe's output to compose `CraftedMixin`, and
   * `isItemCandidate` excludes a Crafted non-food from the one-shot
   * `forge` gather. So a consolidate recipe minting a plain `Ingot`
   * throws, and one minting a Crafted bar produces stock that `forge`
   * can never pick up. Doing it here is also simply truer: consolidation
   * is what the HAMMER does, and quenching a bloom would be actively
   * wrong.
   *
   * ⚠ Idempotent in the only sense that matters — the bloom is gone
   * afterwards, so there is no second call to guard against. Hammering
   * twice cannot double the metal, and it cannot halve it either.
   */
  public async consolidate(): Promise<Consolidation | null> {
    const wholeKg = this.getMass().rawValue();
    if (wholeKg <= 0) return null;
    const slagKg = wholeKg * this.slagFraction;
    const barKg = wholeKg - slagKg;
    if (barKg <= 0) return null;

    const where = this.getContainer();
    // ⭐ The bar's KIND is the bloom's own carbon, read at the anvil. A
    // lean bloom beats into wrought iron; a rich one beats into steel.
    const carbon = this.fractionOf(CARBON);
    const bar = await StuffApi.clone<Stuff>(
      carbon >= C_STEEL_FLOOR ? STEEL_BAR : IRON_BAR,
    );
    if (MixinApi.isTangible(bar)) bar.setMass(Quantity.of(round3(barKg), 'kg'));
    // ⭐ The carbon survives the beating, because it is dissolved in the
    // iron and the slag is not. A carburized bloom is a steel bar.
    if (MixinApi.isAlloyed(bar)) {
      bar.setAlloying(this.getAlloying());
      bar.setTemper(this.getTemper());
    }
    place(bar, where);

    if (slagKg > 0) {
      const slag = await StuffApi.clone<Stuff>(SLAG_ROW);
      if (MixinApi.isTangible(slag)) slag.setMass(Quantity.of(round3(slagKg), 'kg'));
      place(slag, where);
    }

    StuffApi.destruct(this as unknown as Stuff);
    return { bar, steel: carbon >= C_STEEL_FLOOR, slagKg: round3(slagKg), barKg: round3(barKg) };
  }
}

/** Put a freshly cloned thing where the bloom was standing. */
function place(item: Stuff, where: Stuff | null): void {
  if (!where || !MixinApi.isContainer(where)) return;
  ContainmentApi.move(
    item as unknown as Stuff & Containable,
    where as unknown as Stuff & Container,
  );
}

function round3(kg: number): number {
  return Number(kg.toFixed(3));
}
