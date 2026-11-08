/**
 * TasteController — the `taste` verb. The body does the act and this words it:
 * the tongue first, then the nose, then what a trained palate can also tell.
 */

import { SingleSenseControllerBase, type SingleSenseModel } from './SingleSenseControllerBase';
import type { SenseChannel } from '../../../../lib/description/Perceiver';
import type { CommandContext } from '../../../../api/command';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { GrammarApi } from '../../../../api/grammar';
import type { Savor } from '../../../../lib/perception/Flavor';

export default class TasteController extends SingleSenseControllerBase {
  protected readonly senseChannel: SenseChannel = 'taste';
  protected readonly sceneTopic = 'sense.survey';

  override execute(model: SingleSenseModel, context: CommandContext): void | Promise<void> {
    if (!model.target) {
      return this.decline(context, Mml.compose`You'd need something in reach to taste.`, 'nothing-to-taste');
    }
    return super.execute(model, context);
  }

  protected override senseLocation(context: CommandContext): void {
    this.decline(context, Mml.compose`You'd need something in reach to taste.`, 'nothing-to-taste');
  }

  protected override senseTarget(target: Stuff, context: CommandContext): void | Promise<void> {
    return this.tasteIt(target, context);
  }

  private async tasteIt(target: Stuff, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isPalate(giver)) {
      return this.decline(context, Mml.compose`You have no way to taste that.`, 'no-palate');
    }
    const outcome = await giver.taste(target);
    if (!outcome.ok) {
      switch (outcome.reason) {
        case 'airway':
          return this.decline(context, Mml.compose`${outcome.line}`, 'airway');
        case 'closed':
          return this.decline(context, Mml.compose`You'd have to open ${Mml.thing(target)} first.`, 'closed');
        case 'nothing-left':
          return this.decline(context, Mml.compose`There's nothing to taste.`, 'nothing-left');
        default: {
          const never: never = outcome;
          return never;
        }
      }
    }
    const opening = {
      bite: Mml.compose`You take a small bite of ${outcome.foodName}.`,
      sip: Mml.compose`You take a small sip from ${outcome.foodName}.`,
      lick: Mml.compose`You touch your tongue to ${outcome.foodName}.`,
    }[outcome.mouthful];
    const burn = outcome.burned ? ' It burns.' : '';
    MessageApi.scene(giver)
      .topic(this.sceneTopic)
      .toSelf(Mml.compose`${opening}${burn}${TasteController.readingLines(outcome.savor)}`)
      .toPeers(Mml.compose`${Mml.actor(giver)} tastes ${outcome.foodName}.`)
      .send();
  }

  private decline(context: CommandContext, line: Mml, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(this.sceneTopic).toSelf(line).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }

  /** Each thing a mouth read, in sentences; never a digit. */
  private static readingLines(savor: Savor): string {
    const out: string[] = [];
    const tastes = savor.tastePhrases();
    out.push(tastes.length > 0 ? `It tastes ${GrammarApi.joinList(tastes)}.` : 'It tastes of very little.');
    if (!savor.scent.isEmpty()) out.push(`It smells ${GrammarApi.joinList(savor.scent.phrases())}.`);
    const { parts, gradeBand } = savor.details;
    if (parts.length > 0) out.push(`You pick out ${GrammarApi.joinList(parts)}.`);
    if (gradeBand) out.push(`The making of it reads ${gradeBand}.`);
    if (savor.hasAged()) out.push(`It has had ${savor.ageInWords()} in the wood.`);
    const verdict = {
      revolting: 'It is revolting.',
      unpleasant: 'You do not like it.',
      indifferent: '',
      good: 'You like it.',
      delicious: 'It is delicious.',
    }[savor.liking.word];
    if (verdict) out.push(verdict);
    return ` ${out.join(' ')}`;
  }
}
