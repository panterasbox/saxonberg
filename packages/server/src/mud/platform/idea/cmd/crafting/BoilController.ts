/**
 * BoilController — `boil [<target>]`: **hold something at a rolling
 * boil**.
 *
 * ⭐ It is an **act**, not an outcome. What boiling *does* is decided by
 * what you boiled, never by this controller — which is the difference
 * between a verb one trade can use and a verb every trade can.
 *
 * Two consequences, neither privileged, and a target may earn both:
 *
 * | if the target is… | boiling… |
 * |---|---|
 * | a **build** (`Builds` — a cook pot) | latches the heat it reached and records the method `boiled`, which a recipe's reverse-match then reads |
 * | a **vessel** (`Bulkable`) whose contents declare `purifiedByBoiling` | swaps the material for what that names |
 *
 * ## Why it is shaped like `heat` and not like a purifier
 *
 * The first cut of this verb was written as *"purify the water in this
 * vessel"* — its arg required `BulkableMixin`, it recorded nothing, and
 * its single consequence was hardcoded. That is a verb the cooking trade
 * would have had to **fight rather than extend**: a `CookPot` is
 * `ManualBuild + Tool + Durable` and *not* `Bulkable`, so `boil pot`
 * refused outright; nothing was latched, so no recipe could ever require
 * "boiled"; and a second consequence would have meant editing this file
 * — a kernel edit per trade, which is exactly what the pack doctrine
 * forbids.
 *
 * So it follows the shape the crafting branch already uses twice:
 * `heat` latches `noteHeat` on any `Builds` host, `stir` records a
 * method, and the **recipes** decide what those mean. `Technique` is an
 * open vocabulary by construction, so `boiled` costs no kernel list. A
 * cooking pack gets boiling by authoring
 * `{ requiresHeatK: 373, method: boiled }` and changing nothing here.
 *
 * ## The counterplay ladder still works, and reads better for it
 *
 * Purification is now a property of the **material**
 * (`Material.purifiedByBoiling`) rather than the definition of the verb:
 * the second rung of *move your intake · boil · treat*. Personal,
 * per-use, costing fuel and time every time — which is why a town
 * eventually buys treatment instead.
 *
 * ⭐ And boiling still **does not fix everything**. A material that
 * declares no counterpart just gets hot; the command is not refused,
 * because you really did boil it. Boiling a lead-fouled river gives you
 * hot lead-fouled river, and that is how a player learns the difference
 * between organic and persistent contamination.
 *
 * See [docs/subsystems/watershed.md].
 */

import { ManualBuildController } from './ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Builds } from '../../../../lib/craft/ManualBuild';
import type { Bulkable } from '../../../../lib/bulk/Bulkable';
import type Material from '../../../../lib/material/Material';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';

const TOPIC = 'act.deed';
const BOIL_MS = 6000;

/**
 * The technique this step records. From the VERB, like `stirred` and
 * `shaken` — a tool supplies a technique's physical *effect*, but its
 * name is what the actor did.
 */
const METHOD = 'boiled';

/**
 * The floor for a target with nothing in it to ask. A `Builds` host
 * banks ingredients rather than bulk, so there is often no material to
 * read a boiling point off — and water's is the honest default, because
 * "a rolling boil" in every kitchen means water.
 */
const DEFAULT_BOIL_K = 373;

interface BoilModel extends CommandModel {
  target?: MqlOneResult;
}

export default class BoilController extends ManualBuildController<BoilModel> {
  async execute(model: BoilModel, ctx: CommandContext): Promise<void> {
    const giver = ctx.commandGiver;

    // Bare `boil` falls back to the build you are working, exactly as
    // `heat` and `stir` do.
    const target: Stuff | null =
      (model.target?.stuff as Stuff | null) ?? this.findBuildVessel(giver);

    const build =
      target !== null && MixinApi.isBuildVessel(target)
        ? (target as Stuff & Builds)
        : null;
    const vessel =
      target !== null && MixinApi.isBulkable(target)
        ? (target as Stuff & Bulkable)
        : null;

    if (target === null || (build === null && vessel === null)) {
      this.declineStep(
        ctx,
        Mml.compose`Boil what? You need something that holds what you are boiling.`,
        'no-vessel',
      );
      return;
    }

    // What is actually in it, if anything — the boiling point to clear,
    // and the material a purification arrow would come from.
    const contents = vessel === null ? null : this.contentsOf(vessel);
    if (build === null && contents === null) {
      this.declineStep(
        ctx,
        Mml.compose`${Mml.thing(target)} is empty.`,
        'empty-vessel',
      );
      return;
    }

    const reachableK = (MixinApi.isThermal(giver) ? giver.reachableHeatK() : 0);
    if (reachableK <= 0) {
      this.declineStep(
        ctx,
        Mml.compose`There's no fire here to boil anything on.`,
        'no-heat',
      );
      return;
    }

    // ⭐ The threshold is the CONTENTS' own boiling point, never a dial.
    const boilK = contents?.getBoilingPoint().rawValue() ?? 0;
    const needK = boilK > 0 ? boilK : DEFAULT_BOIL_K;
    if (reachableK < needK) {
      this.declineStep(
        ctx,
        Mml.compose`The fire isn't hot enough to bring ${Mml.thing(target)} to a boil.`,
        'insufficient-heat',
      );
      return;
    }

    const purifiedInto = contents?.getPurifiedByBoiling() ?? '';
    const commandText = ctx.commandText;

    this.engageStep(ctx, {
      // The pot paces its own boil, like every other step.
      durationMs: this.paceMs(BOIL_MS, target, ['pot', 'cauldron']),
      beginSelf: Mml.compose`You set ${Mml.thing(target)} over the fire and bring it up to a boil.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} sets ${Mml.thing(target)} over the fire.`,
      onComplete: () => {
        void this.applyBoil(
          giver,
          target,
          build,
          vessel,
          purifiedInto,
          commandText,
        );
      },
    });
  }

  /**
   * Both consequences, in the order they are true: the build remembers
   * what happened to it, and the matter changes if the matter says so.
   */
  private async applyBoil(
    giver: Stuff,
    target: Stuff,
    build: (Stuff & Builds) | null,
    vessel: (Stuff & Bulkable) | null,
    purifiedInto: string,
    commandText: string,
  ): Promise<void> {
    if (build !== null) {
      // Re-read at completion — the fire may have died mid-step; you
      // latch the heat you actually finished at (the `heat` rule).
      const finalK = (MixinApi.isThermal(giver) ? giver.reachableHeatK() : 0);
      if (finalK > 0) build.noteHeat(finalK);
      build.setBuildMethod(METHOD);
      build.recordCommand(commandText);
    }

    let purified = false;
    if (vessel !== null && purifiedInto !== '') {
      try {
        const into = await StuffApi.singleton<Material>(purifiedInto);
        vessel.getBulk().setMaterial(into);
        purified = true;
      } catch {
        // A material path that resolves to nothing leaves the contents
        // alone — you boiled it, and it is unchanged. Never a crash on
        // the completion path of an engaged step.
      }
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        purified
          ? Mml.compose`You hold ${Mml.thing(target)} at a rolling boil until it is fit to drink.`
          : build !== null
            ? Mml.compose`You hold ${Mml.thing(target)} at a rolling boil.`
            : Mml.compose`You bring ${Mml.thing(target)} to a rolling boil. It is exactly as it was, only hotter.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} boils ${Mml.thing(target)}.`)
      .send();
  }

  /** The material in a vessel's bulk slot, or `null` when it is empty. */
  private contentsOf(vessel: Stuff & Bulkable): Material | null {
    try {
      const slot = vessel.getBulk();
      if (slot.isEmpty()) return null;
      return slot.getMaterial();
    } catch {
      // A holder with both slots or neither throws rather than guessing;
      // for `boil` that is simply "nothing here to boil".
      return null;
    }
  }
}
