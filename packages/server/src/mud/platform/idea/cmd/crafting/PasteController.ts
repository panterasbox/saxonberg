/**
 * PasteController — `paste <sheet> on <whole> [with <pot>]`: a label onto
 * a good's face (controller-liquidity W7c; it was a head of `fit`).
 *
 * ⭐ Dumb: the GOOD decides (`Faced.pasteOn`) — the glue in the pot goes on
 * as a coat carrying the sheet's words, and the sheet is gone into it; how
 * long it stays is the glue's own damp-resistance. The controller binds,
 * asks, and words the reason or the facts.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { PasteRefusal } from '../../../../lib/material/Faced';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';

interface PasteModel extends CommandModel {
  sheet?: MqlOneResult;
  whole?: MqlOneResult;
  pot?: MqlOneResult;
}

export default class PasteController extends CommandController<PasteModel> {
  async execute(model: PasteModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const sheet = model.sheet?.stuff ?? null;
    const whole = model.whole?.stuff ?? null;
    if (sheet === null || whole === null || !MixinApi.isFaced(whole)) {
      this.refuse(context, TOPIC, 'Paste what, on what? `paste <label> on <thing> with <pot>`.', 'nothing-named');
      return;
    }
    const pot = model.pot?.stuff ?? null;
    if (pot === null) {
      this.refuse(
        context,
        TOPIC,
        `Paste it on with what? Name the pot: \`paste ${sheet.getPresentation()} on ${whole.getPresentation()} with <pot>\`.`,
        'no-glue',
      );
      return;
    }
    const out = await whole.pasteOn(sheet, pot);
    if (!out.ok) {
      this.refuse(context, TOPIC, PasteController.refusalWords(out, sheet, pot), out.reason);
      return;
    }
    const { glue, words } = out.facts;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.text(
          words !== ''
            ? `You brush ${glue} on the back of the label and smooth it onto ${whole.getPresentation()}: "${words}".`
            : `You paste the paper onto ${whole.getPresentation()} with ${glue}.`,
        ),
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} pastes a label onto ${Mml.thing(whole)}.`)
      .send();
  }

  /** The words for a label that will not paste — every reason (D4). */
  protected static refusalWords(out: PasteRefusal, sheet: Stuff, pot: Stuff): string {
    switch (out.reason) {
      case 'not-glue':
        return `What is in ${pot.getPresentation()} will not stick paper to anything.`;
      case 'source-too-low':
        return `There is not enough left in ${pot.getPresentation()} to paste with.`;
      case 'not-paper':
        return `${sheet.getPresentation()} is not a thing you paste on.`;
      default: {
        const never: never = out;
        return never;
      }
    }
  }
}
