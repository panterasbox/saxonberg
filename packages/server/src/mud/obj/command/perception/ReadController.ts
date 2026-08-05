/**
 * ReadController — `read X`.
 *
 * `read` is not a flavour of `look`. Looking is one sense channel
 * resolving; reading is **perception plus symbolic decoding**
 * (requirements D33), and this controller is that decomposition made
 * literal:
 *
 * ```
 * read = perceive(the marks) + decode(the script)
 * ```
 *
 * **Perceive.** Ink needs light — and not merely enough light to see
 * that a scroll is there, but enough to make out lettering (the `'fine'`
 * detail band). Embossed marks skip the gate entirely: you read raised
 * lettering with your hands, in the dark. The two come apart in both
 * directions, which is the test of whether the decomposition is real.
 *
 * **Decode.** A no-op pass in v1 — everyone reads the common script.
 * The seam is what matters: literacy would slot in here without
 * disturbing `perceive`, and a spellbook's comprehension floor (wave 6)
 * is already a decoding gate in all but name.
 *
 * **Then the working, if there is one.** Reading a scroll is how a
 * scroll fires — there is no separate verb, deliberately. An `identify`
 * verb would announce what you were holding just by appearing in your
 * affordance list, and the whole unidentified-consumable mechanic would
 * collapse (D34). Verbs key on the visible **kind**; effects key on the
 * hidden **class**.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { MixinApi } from '../../../api/mixin';
import { COMMON_SCRIPT } from '../../../lib/description/Marked';
import { MessageApi } from '../../../api/message';
import { PerceptionApi } from '../../../api/perception';
import { MagicApi } from '../../../api/magic';
import { Mml } from '../../../api/mml';

const TOPIC = 'world.perception.vision';

interface ReadModel extends CommandModel {
  target: MqlOneResult;
  /** What the scroll's working acts ON, for workings that need a mark. */
  mark?: MqlOneResult;
}

export default class ReadController extends CommandController<ReadModel> {
  async execute(model: ReadModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;

    if (!target) {
      const raw = model.target?.raw ?? '';
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${raw}' to read.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: raw,
      });
      return;
    }

    if (!MixinApi.isMarked(target)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There is nothing written on ${Mml.item(target)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-marked',
        detail: 'target bears no marks',
      });
      return;
    }

    // ── Perceive ──
    //
    // One call. `canMakeOutMarks` owns the whole intersection now —
    // the reader's channels against the marks' modalities, with light
    // gating only the vision branch. The controller used to pre-filter
    // on `requiresLightToRead()`, which is what left the touch branch
    // unconditional.
    if (!PerceptionApi.canMakeOutMarks(giver, target)) {
      // The refusal names the reason the reader can actually observe.
      const lightBound = target.requiresLightToRead();
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          lightBound
            ? Mml.compose`There is writing on ${Mml.item(target)}, but you cannot make out a word of it in this light.`
            : Mml.compose`There is writing on ${Mml.item(target)}, but you have no way to make it out.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: lightBound ? 'too-dark-to-read' : 'no-channel-for-marks',
        detail: lightBound
          ? 'inked marks need light'
          : 'no sense reaches these marks',
      });
      return;
    }

    // ── Decode ──
    //
    // v1 has one script and everyone reads it, so this only fires for
    // authored braille or cipher. **Withheld, never mangled**: the
    // medium here IS text, so scrambled output is indistinguishable
    // from a bug, and "you can tell it is writing but not what it says"
    // is both honest and the more interesting state to be in.
    //
    // ⚠ THE literacy seam. When known-scripts land on the reader, this
    // condition becomes that lookup and nothing else moves.
    const script = target.getMarkScript();
    if (script !== COMMON_SCRIPT) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`The marks on ${Mml.item(target)} are writing of some kind, but not in any script you know.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'script-unknown',
        detail: `cannot decode '${script}'`,
      });
      return;
    }

    const text = target.getMarkText();
    const body =
      text.length > 0
        ? Mml.compose`${Mml.item(target)} reads: ${text}`
        : Mml.compose`${Mml.item(target)} is blank.`;
    MessageApi.scene(giver).topic(TOPIC).toSelf(body).send();

    // ── …and whatever reading it sets off ──
    await this.fireAnyWorking(target, context);
  }

  /**
   * A scroll's working fires from *reading* it. Split out because the
   * ordering matters and is easy to get wrong: the text lands first, so
   * a player sees what they read even when the working consumes the
   * scroll out from under them.
   *
   * A scroll is a **focus**, not a battery (D5) — it supplies the
   * specification and the *reader* pays. That is why the discharge names
   * the reader as the source.
   */
  private async fireAnyWorking(
    target: Stuff,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isArcane(target)) return;
    if (target.getCarriedSpellPath().length === 0) return;

    // A spent scroll still affords `read` and still shows its text — it
    // just does nothing (D34: the affordance reflects the kind, never
    // the state). Failing audibly is the requirement.
    if (MixinApi.isConsumable(target) && target.isSpent()) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`The marks are inert — whatever was bound into ${Mml.item(target)} is long spent.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'spent',
        detail: 'consumable exhausted',
      });
      return;
    }

    // ⚠ **Reading is not aimed.** `read scroll at flask` used to exist
    // and was a preposition on a verb where aiming means nothing —
    // invented because the prompt substrate went unused. When the
    // working wants a mark, ASK; a scroll is never spent on a question
    // that went unanswered.
    let mark: Stuff | undefined;
    if (MagicApi.requiresMark(target)) {
      const picked = await this.promptForObject(
        context,
        'What do you want to use it on?',
        this.reachableMarks(context),
      );
      if (!picked) {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            Mml.compose`You hold the reading in your head, unspent — there is nothing you have settled on to use it on.`,
          )
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'no-mark-chosen',
          detail: 'working needs a mark; none chosen',
        });
        return;
      }
      mark = picked;
    }

    const outcome = await MagicApi.discharge(target, mark, {
      source: giver,
    });
    const prose = outcome.ok
      ? outcome.reports.join(' ')
      : (outcome.refusal ?? '');
    if (prose.length > 0) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.text(prose)).send();
    }
    if (!outcome.ok) {
      context.note({
        kind: 'controller-rejected',
        reason: 'working-refused',
        detail: outcome.refusal ?? 'the working did not take',
      });
      return;
    }
    // Spent on use — the vessel, if any, is left behind.
    if (MixinApi.isConsumable(target)) await target.consume();
  }

}
