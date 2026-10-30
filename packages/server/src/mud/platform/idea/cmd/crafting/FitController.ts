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
import { CraftingApi, type FitReplaced } from '../../../../api/crafting';
import type { Assembled } from '../../../../lib/craft/Assembled';
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

    // ⭐ A word that bound a PART, with no whole named, that names a recipe
    // and is not one of the part's own words, means RAISE: `fit pick` with
    // a pick head and a pick haft on the bench binds "pick" to one of them
    // by substring, and the person meant the pick — and `fit cask` beside
    // a slack barrel bound the cask HEAD ("cask head") and fitted it into
    // the barrel (the assembly drive). `fit head` still means the head.
    const ownWord =
      part !== null && MixinApi.isPerceptible(part) && part.hasKeyword(raw.toLowerCase());
    if (part && !whole && raw && (!ownWord || !this.wholeFor(part, giver))) {
      const recipe = await CraftingApi.lookupRecipe(raw);
      if (recipe) return this.raise(raw, giver, context);
    }

    // ── the line arm (ceramics W5): a word naming no thing in reach but a
    // LINE of the named whole — `fit lining to furnace` with firebrick in
    // reach. The logic finds the part by the line's row.
    if (
      !part &&
      raw &&
      whole &&
      MixinApi.isAssembled(whole) &&
      !whole.isOnePiece() &&
      this.namesLine(whole, raw)
    ) {
      const outcome = await CraftingApi.fit({ whole, line: raw });
      if (!outcome.ok) {
        this.declineToScene(giver, outcome, context);
        return;
      }
      if (outcome.arm === 'replace') this.tellReplaced(giver, whole, outcome);
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
      return this.raise(raw, giver, context);
    }

    // ⚠ A named whole that is not made of parts is a mis-bind when the
    // word also names one that is: `fit share to plough` with two plough
    // SHARES in hand bound "plough" to a share (inventory is searched
    // first, and a share is a Tool like the plough) — the assembly drive.
    // The thing the part fits, answering to the word, is what was meant.
    if (
      whole &&
      (!MixinApi.isAssembled(whole) || whole.isOnePiece()) &&
      model.whole?.raw
    ) {
      const meant = this.wholeFor(part, giver, model.whole.raw.trim().toLowerCase());
      if (meant) whole = meant;
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
    this.tellReplaced(giver, whole, outcome);
  }

  /** Does `word` name one of `whole`'s lines (`lining`, `staves`)? */
  private namesLine(whole: Stuff & Assembled, word: string): boolean {
    const w = word.trim().toLowerCase();
    whole.ensureParts();
    return whole
      .getParts()
      .some((l) => l.part.toLowerCase() === w || `${l.part.toLowerCase()}s` === w);
  }

  /** Say the replace arm's outcome to the room. */
  private tellReplaced(
    giver: Stuff,
    whole: Stuff,
    outcome: FitReplaced,
  ): void {
    const what = outcome.replaced === 1 ? `a new ${outcome.part}` : `${outcome.replaced} new ${outcome.part}s`;
    // ⭐ (ceramics D27) Cast to the old one's pattern, it drops into the
    // joint as it stands — nothing to cut, fit or wedge.
    const drops = outcome.interchangeable
      ? ' Cast to the same pattern as the one it replaces, it drops straight into the old joint — no new joint to make.'
      : '';
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        outcome.returned
          ? Mml.compose`You fit ${what} to ${Mml.thing(whole)}, and take the old one back.${drops}`
          : Mml.compose`You fit ${what} to ${Mml.thing(whole)}.${drops}`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} fits ${what} to ${Mml.thing(whole)}.`)
      .send();
  }

  /** The raise arm: make the whole named by `raw` from the parts in reach. */
  private async raise(raw: string, giver: Stuff, context: CommandContext): Promise<void> {
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
  }

  /**
   * The one assembly in reach that this part would mend — held first, then
   * the room. An assembly with a FAILED line the part fits wins over one
   * that is merely worn; `null` when none, or when it is ambiguous.
   */
  private wholeFor(part: Stuff, giver: Stuff, named?: string): Stuff | null {
    const pools: Stuff[] = [];
    if (MixinApi.isContainer(giver)) pools.push(...(giver as Stuff & Container).getContents());
    const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (room && MixinApi.isContainer(room)) pools.push(...room.getContents());
    const tpl = part.getTemplatePath() ?? '';
    const fits = (s: Stuff): { failed: boolean } | null => {
      if (s === part || !MixinApi.isAssembled(s)) return null;
      if (named && !(MixinApi.isPerceptible(s) && s.hasKeyword(named))) return null;
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
