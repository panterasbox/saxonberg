/**
 * FeedController — `feed <bed> [with <source>]`.
 *
 * {@link WaterController}'s twin: ⭐ the GROUND decides
 * (controller-liquidity W8, `Soil.amendPlanFor` — a plant named asks its
 * bed) which carried sack feeds it, which reserve the matter feeds —
 * nitrogen for compost, organic matter for a slow amendment — and how
 * much it takes, an **explicit measure** sized to the soil's headroom.
 * This file binds what was named and words the answer.
 *
 * Three things it shares with `water` deliberately:
 *
 *   1. **An explicit measure, never `{ kind: 'all' }`** — a full sack does
 *      not vanish into a bed that had room for a handful.
 *   2. **Naming either half of the assembly works.** `feed the carrots`
 *      feeds the ground the carrots stand in, the same way `water the pot`
 *      waters the lily in it.
 *   3. **The act captures the ground**, because the nitrogen is the
 *      ground's state — the same reason `water` captures it.
 *
 * ⭐ **A plant, a bed, a patch and a field** (field population D18) — the
 * same resolution as `water`: on a divided field the act names a part
 * (`feed wheat at the top end`) or the ground refuses, listing them, and
 * the compost goes into THAT part's soil. The reply says how much went in.
 *
 * And one thing it does NOT share: `feed` is not tool-afforded. You feed by
 * hand out of a sack, exactly as you pour soil by hand, so no entry joins
 * the `TOOL_CAPABILITIES` table.
 *
 * A pot authors no nitrogen reserve at all, so feeding a houseplant is
 * refused with the reason rather than silently doing nothing — a
 * windowsill plant is never short of nitrogen, and saying so is the honest
 * answer to a player who tries.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { AmendDone, AmendRefusal } from '../../../../lib/husbandry/Soil';
import { CraftingApi } from '../../../../api/crafting';

const TOPIC = 'act.deed';

type Composed = ReturnType<typeof Mml.compose>;

interface FeedModel extends CommandModel {
  target: MqlOneResult;
  /** `at <patch>` — which part of a divided field (D5). */
  part?: MqlOneResult;
  source?: MqlOneResult;
}

export default class FeedController extends CommandController<FeedModel> {
  async execute(model: FeedModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.target.stuff;

    if (!named) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: model.target.raw,
      });
      return;
    }

    const patchRaw = model.part?.raw ?? '';
    const patch = model.part?.stuff ?? null;
    if (!patch && patchRaw.trim() !== '') {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${patchRaw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'patch', query: patchRaw });
      return;
    }
    const aimed = MixinApi.isGrowing(named) ? named : MixinApi.isSoil(named) ? named : null;
    if (aimed === null) {
      return FeedController.deny(context, FeedController.refusalWords({ ok: false, reason: 'not-cultivable', facts: { target: named } })[0],
        'not-cultivable', `${named.getPresentation()} is not cultivable ground`);
    }

    const source = model.source?.stuff ?? null;
    const answer = await aimed.amendPlanFor({
      by: giver,
      amend: 'feed',
      target: named,
      // Named: taken as named. Bare: what you carry — the ground takes the
      // first sack of compost or a slow amendment.
      sources: source ? [source] : MixinApi.isContainer(giver) ? giver.getContents() : [],
      named: source !== null,
      via: model.source?.via,
      part: patch && MixinApi.isSoil(patch) ? patch : null,
    });
    if (answer.ok === 'choose' || (answer.ok === false && answer.reason === 'not-a-part-here')) {
      const line = this.partLine(answer);
      return FeedController.deny(context, Mml.fromMarkup(line), answer.reason, line);
    }
    if (!answer.ok) {
      const [prose, reason] = FeedController.refusalWords(answer);
      return FeedController.deny(context, prose, reason, reason);
    }
    await this.engagePlan(context, answer, {
      beginSelf: () => Mml.compose``,
      onRefused: (r) => FeedController.refusalWords(r)[0],
      onDone: (f) => {
        for (const note of f.notes) context.note(note);
        return FeedController.doneWords(f, giver);
      },
    });
  }

  /** A refusal's words, and the note's reason. */
  protected static refusalWords(r: AmendRefusal): [Composed, string] {
    switch (r.reason) {
      case 'not-cultivable':
        return [Mml.compose`${Mml.thing(r.facts.target)} isn't ground you can feed.`, r.reason];
      case 'not-rooted':
        return [Mml.compose`${Mml.thing(r.facts.plant)} isn't ground you can feed.`, 'not-cultivable'];
      case 'not-standing-at':
        return [Mml.compose`${Mml.thing(r.facts.plant)} does not stand at ${Mml.thing(r.facts.part)}.`, 'not-a-part-here'];
      case 'nothing-planted':
        return [Mml.compose`${Mml.thing(r.facts.ground)} isn't ground you can feed.`, 'not-cultivable'];
      case 'no-nutrient-reserve':
        // A pot. Say why rather than no-op'ing.
        return [Mml.compose`${Mml.thing(r.facts.ground)} holds too little soil to need feeding.`, r.reason];
      case 'no-water-source':
      case 'no-compost-source':
        return [Mml.compose`You have nothing to feed it with.`, 'no-compost-source'];
      case 'source-empty':
        return [Mml.compose`${Mml.thing(r.facts.source)} is empty.`, r.reason];
      case 'no-amendment-reserve':
        // Deep enough to need nitrogen, too shallow for a long investment.
        return [
          Mml.compose`${Mml.thing(r.facts.ground)} is too little soil to be worth improving — it wants feeding, not amending.`,
          r.reason,
        ];
      case 'already-fed':
        return [
          r.facts.slow
            ? Mml.compose`The soil in ${Mml.thing(r.facts.ground)} is in as good heart as it will get.`
            : Mml.compose`The soil in ${Mml.thing(r.facts.ground)} is already rich.`,
          r.reason,
        ];
      case 'already-wet':
        return [Mml.compose`The soil in ${Mml.thing(r.facts.ground)} is already rich.`, r.reason];
      case 'nothing-poured':
      case 'nothing-spread':
        return [Mml.compose`Nothing comes out of ${Mml.thing(r.facts.source)}.`, 'nothing-spread'];
      default: {
        const unworded: never = r;
        throw new Error(`FeedController: no words for ${String(unworded)}`);
      }
    }
  }

  /** What the feeding came to. */
  protected static doneWords(f: AmendDone, giver: Stuff): { self: Composed; peers: Composed } | null {
    if (f.kind !== 'fed') return null;
    const appearance = CraftingApi.blendAppearance(f.payload, f.material) || 'compost';
    const amount = FeedController.amountPhrase(f.litres, f.material?.getDensity().rawValue() ?? 0);
    return {
      self: f.zone
        ? Mml.compose`You work ${amount} of ${appearance} into the soil around ${Mml.thing(f.zone)}.`
        : f.part
          ? Mml.compose`You work ${amount} of ${appearance} into the soil at ${Mml.thing(f.part)}.`
          : Mml.compose`You work ${amount} of ${appearance} into the soil of ${Mml.thing(f.ground)}.`,
      peers: Mml.compose`${Mml.actor(giver)} feeds ${Mml.thing(f.part ?? f.ground)}.`,
    };
  }

  /**
   * How much went in, by weight when the matter has a density (*7 kg*) and
   * by volume when it has none.
   */
  protected static amountPhrase(litres: number, densityKgPerM3: number): string {
    const unit = densityKgPerM3 > 0 ? 'kg' : 'L';
    const v = densityKgPerM3 > 0 ? (litres * densityKgPerM3) / 1000 : litres;
    const n = v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
    // ⚠ Something WAS worked in (the transfer moved it), so never "0 kg".
    if (n === 0) return `less than 0.1 ${unit}`;
    return `${n.toLocaleString('en-US')} ${unit}`;
  }

  /** Say no, and record why. */
  protected static deny(context: CommandContext, prose: Composed, reason: string, detail: string): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
