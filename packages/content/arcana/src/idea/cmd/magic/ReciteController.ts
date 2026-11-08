/**
 * ReciteController — `recite <scroll>`: say it aloud, and it fires.
 *
 * ⭐ Split out of `read` (controllers-are-io D10), which used to cast as a side
 * effect of looking at the words. You still have to make out the marks to say
 * them, so the working is gated on perception and script exactly as reading is.
 *
 * A scroll is a **focus**, not a battery (D5) — it supplies the specification
 * and the *reciter* pays. That is why the discharge names them as the source.
 * ⚠ **It is not aimed.** When the working wants a mark, it ASKS; a scroll is
 * never spent on a question that went unanswered.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { COMMON_SCRIPT } from '@saxonberg/server/mud/lib/description/Marked';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { PerceptionApi } from '@saxonberg/server/mud/api/perception';
import { Mml } from '@saxonberg/server/mud/api/mml';

const TOPIC = 'act.deed';

interface ReciteModel extends CommandModel {
  scroll: MqlOneResult;
}

export default class ReciteController extends CommandController<ReciteModel> {
  async execute(model: ReciteModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const scroll = model.scroll?.stuff ?? null;
    if (!scroll) {
      const raw = model.scroll?.raw ?? '';
      this.say(giver, Mml.compose`You don't see any '${raw}' to recite.`);
      context.note({ kind: 'empty-result', field: 'scroll', query: raw });
      return;
    }
    if (!MixinApi.isArcane(scroll) || !MixinApi.isMarked(scroll) || scroll.getCarriedSpellPath().length === 0) {
      this.turnDown(context, Mml.compose`There is nothing bound into ${Mml.thing(scroll)} to say.`, 'nothing-bound');
      return;
    }
    // ── You have to make out the marks to say them. ──
    await scroll.refreshMarks(giver);
    if (!PerceptionApi.canMakeOutMarks(giver, scroll)) {
      const lightBound = scroll.requiresLightToRead();
      this.turnDown(
        context,
        lightBound
          ? Mml.compose`You cannot make out a word of ${Mml.thing(scroll)} in this light.`
          : Mml.compose`You have no way to make out ${Mml.thing(scroll)}.`,
        lightBound ? 'too-dark-to-read' : 'no-channel-for-marks',
      );
      return;
    }
    if (scroll.getMarkScript() !== COMMON_SCRIPT) {
      this.turnDown(
        context,
        Mml.compose`The marks on ${Mml.thing(scroll)} are writing of some kind, but not in any script you know.`,
        'script-unknown',
      );
      return;
    }
    // A spent scroll still affords the verb (D34: the affordance reflects the
    // kind, never the state). Failing audibly is the requirement.
    if (MixinApi.isConsumable(scroll) && scroll.isSpent()) {
      this.turnDown(
        context,
        Mml.compose`The marks are inert — whatever was bound into ${Mml.thing(scroll)} is long spent.`,
        'spent',
      );
      return;
    }
    let mark: Stuff | undefined;
    if (scroll.requiresMark()) {
      const picked = await this.promptForObject(
        context,
        'What do you want to use it on?',
        this.reachableMarks(giver),
      );
      if (!picked) {
        this.turnDown(
          context,
          Mml.compose`You hold the words in your head, unspent — there is nothing you have settled on to use it on.`,
          'no-mark-chosen',
        );
        return;
      }
      mark = picked;
    }
    // The text lands first, so a player hears what they said even when the
    // working consumes the scroll out from under them.
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You say ${Mml.thing(scroll)} aloud: ${scroll.readFor(giver)}`)
      .toPeers(Mml.compose`${Mml.actor(giver)} reads something aloud from ${Mml.thing(scroll)}.`)
      .send();
    const outcome = await scroll.dischargeAt(mark, { source: giver });
    const prose = outcome.ok ? outcome.reports.join(' ') : (outcome.refusal ?? '');
    if (prose.length > 0) this.say(giver, Mml.text(prose));
    if (!outcome.ok) {
      context.note({
        kind: 'controller-rejected',
        reason: 'working-refused',
        detail: outcome.refusal ?? 'the working did not take',
      });
      return;
    }
    // Spent on use — the vessel, if any, is left behind.
    if (MixinApi.isConsumable(scroll)) await scroll.consume();
  }

  private say(giver: Stuff, line: ReturnType<typeof Mml.compose>): void {
    MessageApi.scene(giver).topic(TOPIC).toSelf(line).send();
  }

  private turnDown(context: CommandContext, line: ReturnType<typeof Mml.compose>, reason: string): void {
    this.say(context.commandGiver, line);
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}
