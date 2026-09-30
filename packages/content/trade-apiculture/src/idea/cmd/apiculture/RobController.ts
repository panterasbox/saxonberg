/**
 * RobController — `rob <hive>`, ⭐⭐ **and the refusal is the season's.**
 *
 * The trade's one verb, and it is a `TapController` because taking honey
 * really is the same act as milking a cow: point at the animal, take what
 * is standing, reset the clock. What differs is everything the tap
 * declares — and one override that is the whole product decision:
 *
 * ⭐⭐ **A rob takes ONE BOX-WORTH, not everything.** The mixin's default
 * take is *all of it*, and for milk that is right. For honey it would
 * delete the only decision the trade exists to force: how much of the
 * winter you leave them. So you rob again to take more, and you stop to
 * leave some, and **nothing warns you either way** (AC 8). The hive's
 * `takeFrom` owns that; this controller just asks.
 *
 * ⚠ Named `rob` because that is the word — you rob a hive. It is also
 * honest about what the act is: the bees made it for themselves.
 */

import { TapController, round2 } from '@saxonberg/content-trade-ranching/src/idea/cmd/ranching/TapController';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { TapSpec } from '@saxonberg/server/mud/platform/idea/species/Species';
import type { BlendPart } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import { Template } from '@saxonberg/server/mud/lib/stuff/Template';
import { APICULTURE } from '../../../lib/Colony';

export default class RobController extends TapController {
  protected tapKey(): string {
    return 'honey';
  }

  /** ⚠ Apiculture, not stockmanship — the hook the ranching base grew. */
  protected override discipline(): string {
    return APICULTURE;
  }

  protected emptyPhrase(): ReturnType<typeof Mml.compose> {
    return Mml.compose`Nothing capped. Out of the flow there is simply nothing to take, and the refusal is the season's rather than the colony's.`;
  }

  protected takePhrase(
    _animal: unknown,
    units: number,
    got: Stuff | null,
  ): ReturnType<typeof Mml.compose> {
    void got;
    return Mml.compose`You lift out frame after frame of sealed comb and set them aside — ${round2(units)} kilos of it, dripping where the knife went through.`;
  }

  /**
   * ⭐ **Comb, by the frame.** The take is a mass, and what arrives is
   * that many one-kilo frames rather than one absurd slab — because the
   * next thing that happens to comb is a recipe with an item slot in it,
   * and a recipe counts inputs.
   */
  protected override async mint(
    tap: TapSpec,
    units: number,
    giver: Stuff,
  ): Promise<Stuff | null> {
    const composition = await this.combComposition();
    const perFrame = 1;
    const frames = Math.max(1, Math.ceil(units / perFrame));
    let last: Stuff | null = null;
    for (let i = 0; i < frames; i++) {
      const mass = Math.min(perFrame, units - i * perFrame);
      let comb: Stuff;
      try {
        comb = await StuffApi.clone<Stuff>(tap.yieldRow);
      } catch {
        return last;
      }
      (comb as unknown as { setMass?(q: Quantity<'kg'>): void }).setMass?.(
        Quantity.of(round2(mass), 'kg'),
      );
      // ⭐⭐ **What the bees foraged rides the comb.** `Comb` is a
      // `Provision`, so it composes `ComposedMixin`; the crafting core
      // already sums an item input's composition into a bulk output's
      // payload, and `taste`, the label and the tags all derive from
      // that on read. So clover honey and cherry-blossom honey are
      // different honey with **no row written for either**, and nothing
      // in the recipes knows there is more than one kind.
      if (composition.length > 0 && MixinApi.isComposed(comb)) {
        comb.setComposition(composition);
      }
      if (MixinApi.isContainer(giver)) {
        ContainmentApi.move(
          comb as Stuff & Containable,
          giver as Stuff & Container,
        );
      }
      last = comb;
    }
    return last;
  }

  /**
   * Resolve the hive's forage census into a blend.
   *
   * ⭐ The sward's nectar is a Material path already; a plant's key is its
   * CROP template, which has to be read for the material the crop is made
   * of. One await, in a controller, where awaiting is allowed — the census
   * itself is sync because it runs inside a reconcile.
   */
  private async combComposition(): Promise<BlendPart[]> {
    const hive = this.hive;
    if (!hive) return [];
    const out: BlendPart[] = [];
    for (const { path, share } of hive.forageComposition()) {
      const servings = Math.round(share * 100) / 100;
      if (servings <= 0) continue;
      let materialPath = path;
      if (!path.includes('/idea/material/')) {
        materialPath = (await this.materialOf(path)) ?? '';
        if (materialPath === '') continue;
      }
      out.push({ materialPath, servings });
    }
    return out;
  }

  /** The Material a crop template is made of, or `null`. */
  private async materialOf(cropPath: string): Promise<string | null> {
    try {
      const template = await Template.findByPath(cropPath);
      const data = template?.data as Record<string, unknown> | undefined;
      const material = data?._materialPath;
      return typeof material === 'string' ? material : null;
    } catch {
      return null;
    }
  }

  /** The hive being robbed, when the target actually is one. */
  private hive: {
    forageComposition(): Array<{ path: string; share: number }>;
  } | null = null;

  /**
   * ⚠ `execute` is NOT overridden — the ranching base owns the whole
   * act. What this does is remember the target so `mint` can ask it for
   * its forage, because `mint`'s signature is the tap and the units and
   * changing it would touch three shipped controllers.
   */
  public override async execute(
    model: Parameters<TapController['execute']>[0],
    context: Parameters<TapController['execute']>[1],
  ): Promise<void> {
    const target = model.target?.stuff as unknown as {
      forageComposition?(): Array<{ path: string; share: number }>;
    } | undefined;
    this.hive =
      target && typeof target.forageComposition === 'function'
        ? (target as { forageComposition(): Array<{ path: string; share: number }> })
        : null;
    await super.execute(model, context);
  }
}
