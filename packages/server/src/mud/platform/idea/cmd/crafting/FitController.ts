/**
 * FitController — `fit <part> [to <whole>]` / `fit <recipe>`: the ONE
 * assembly verb (assembly D5).
 *
 * Two arms, decided by what bound:
 *
 * - **replace** — a part in reach and a whole (named, or the one reachable
 *   assembly with a line that part fits): `CraftingApi.fit` amends that
 *   line and re-makes its joints under the fitter's hand.
 * - **raise** — a word that names no thing in reach but names a recipe:
 *   an ordinary craft through `CraftingApi.fit`, whose mint keeps each
 *   part's identity on the thing it made.
 *
 * ⭐ No can-make deed gate (the `requireDeed` the one-shots run): fitting
 * parts together BY HAND is the hand build that gate asks for — the act
 * is the learning, and a fit records the made-deed like any craft. The
 * joint's own band is the gate that remains, and it is the Api's.
 *
 * Every refusal names what would lift it: the part that has no line, the
 * tool a joint wants, the band it wants.
 */

import { CraftController } from './CraftController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlManyResult, MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import { CraftingApi } from '../../../../api/crafting';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';

interface FitModel extends CommandModel {
  thing?: MqlOneResult;
  whole?: MqlOneResult;
  tool?: MqlManyResult;
}

export default class FitController extends CraftController<FitModel> {
  async execute(model: FitModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const part: Stuff | null = model.thing?.stuff ?? null;
    const raw = (model.thing?.raw ?? '').trim();
    let whole: Stuff | null = model.whole?.stuff ?? null;

    if (!part && !raw) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Fit what? Name a part and the thing it goes on — or a thing to raise from its parts.`)
        .send();
      context.note({ kind: 'controller-rejected', reason: 'nothing-named', detail: '' });
      return;
    }

    // ── the raise arm: a word naming no thing in reach.
    if (!part) {
      if (model.whole?.raw && !whole) {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You don't see any '${model.whole.raw}' here to fit anything to.`)
          .send();
        context.note({ kind: 'empty-result', field: 'whole', query: model.whole.raw });
        return;
      }
      const outcome = await CraftingApi.fit({ recipeRef: raw });
      if (!outcome.ok) {
        if (outcome.reason === 'no-recipe') {
          MessageApi.scene(giver)
            .topic(TOPIC)
            .toSelf(Mml.compose`You don't see any '${raw}' here, and it isn't anything you could raise from parts.`)
            .send();
          context.note({ kind: 'empty-result', field: 'thing', query: raw });
          return;
        }
        this.declineToScene(giver, outcome, context);
        return;
      }
      if (outcome.arm !== 'raise') return;
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You fit the parts together into ${Mml.thing(outcome.output)}.`)
        .toPeers(Mml.compose`${Mml.actor(giver)} fits together ${Mml.thing(outcome.output)}.`)
        .send();
      return;
    }

    // ── the replace arm: find the whole when none was named.
    if (!whole) whole = this.wholeFor(part, giver);
    if (!whole) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's nothing here ${Mml.thing(part)} would fit — name the thing you mean to fit it to.`)
        .send();
      context.note({ kind: 'controller-rejected', reason: 'no-whole', detail: '' });
      return;
    }
    const outcome = await CraftingApi.fit({ part, whole });
    if (!outcome.ok) {
      this.declineToScene(giver, outcome, context);
      return;
    }
    if (outcome.arm !== 'replace') return;
    const what = outcome.replaced === 1 ? `a new ${outcome.part}` : `${outcome.replaced} new ${outcome.part}s`;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        outcome.returned
          ? Mml.compose`You fit ${what} to ${Mml.thing(whole)}, and take the old one back.`
          : Mml.compose`You fit ${what} to ${Mml.thing(whole)}.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} fits ${what} to ${Mml.thing(whole)}.`)
      .send();
  }

  /**
   * The one assembly in reach that this part would mend — held first, then
   * the room. An assembly with a FAILED line the part fits wins over one
   * that is merely worn; `null` when none, or when it is ambiguous.
   */
  private wholeFor(part: Stuff, giver: Stuff): Stuff | null {
    const pools: Stuff[] = [];
    if (MixinApi.isContainer(giver)) pools.push(...(giver as Stuff & Container).getContents());
    const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (room && MixinApi.isContainer(room)) pools.push(...room.getContents());
    const tpl = part.getTemplatePath() ?? '';
    const fits = (s: Stuff): { failed: boolean } | null => {
      if (s === part || !MixinApi.isAssembled(s) || !s.isAssembly()) return null;
      const lines = s
        .getParts()
        .filter(
          (l) => l.template === tpl || (MixinApi.isPerceptible(part) && part.hasKeyword(l.part)),
        );
      if (lines.length === 0) return null;
      return { failed: lines.some((l) => l.failed > 0) };
    };
    const hits = pools.map((s) => ({ s, f: fits(s) })).filter((h) => h.f !== null);
    const failed = hits.filter((h) => h.f!.failed);
    if (failed.length === 1) return failed[0]!.s;
    if (failed.length === 0 && hits.length === 1) return hits[0]!.s;
    return null;
  }
}
