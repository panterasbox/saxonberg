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
 * ⭐⭐ **The read is the thing's** (controller-liquidity W8): `Readable.
 * readFor(viewer, page?)` — a screen answers what it shows, marked things
 * perceive-then-decode, a book opens at the page first. This controller
 * words the answer.
 *
 * ⭐ **`read` never casts** (controllers-are-io D10). A scroll fires from
 * `recite` — a word every scroll affords, whichever working it carries, so
 * the affordance list still says nothing about what you are holding (D34:
 * verbs key on the visible **kind**; effects on the hidden **class**).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { ReadRefusal } from '../../../../lib/description/Readable';

const TOPIC = 'sense.survey';

interface ReadModel extends CommandModel {
  target: MqlOneResult;
  /** A book's page; raw from the binder, parsed here. */
  page?: string | number;
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

    if (!MixinApi.isReadable(target)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There is nothing written on ${Mml.thing(target)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-marked',
        detail: 'target bears no marks',
      });
      return;
    }

    const page = model.page !== undefined && model.page !== '' ? Number(model.page) : undefined;
    const read = await target.readFor(giver, page);
    if (!read.ok) return ReadController.refused(target, read, context);

    const facts = read.facts;
    const say = (line: Mml): void => {
      MessageApi.scene(giver).topic(TOPIC).toSelf(line).send();
    };
    switch (facts.kind) {
      case 'screen':
        return say(
          facts.shown === null
            ? Mml.compose`${Mml.thing(target)} is dark.`
            : Mml.compose`${Mml.thing(target)} reads: ${facts.shown}`,
        );
      case 'device':
        return say(
          facts.hasText
            ? Mml.compose`${Mml.thing(target)} bears ${facts.device}. There is writing on it too, but you cannot make it out.`
            : Mml.compose`${Mml.thing(target)} bears ${facts.device}.`,
        );
      case 'marks': {
        const { text, device, taught } = facts;
        say(
          text.length > 0 && device !== null
            ? Mml.compose`${Mml.thing(target)} reads: ${text} It bears ${device}.`
            : text.length > 0
              ? Mml.compose`${Mml.thing(target)} reads: ${text}`
              : device !== null
                ? Mml.compose`${Mml.thing(target)} bears ${device}.`
                : Mml.compose`${Mml.thing(target)} is blank.`,
        );
        // What reading wrote into the reader — after the marks.
        if (taught !== null) say(Mml.text(taught));
        return;
      }
      default: {
        const never: never = facts;
        return never;
      }
    }
  }

  /** The words for a refused read, and its note. */
  protected static refused(target: Stuff, refusal: ReadRefusal, context: CommandContext): void {
    const it = Mml.thing(target);
    let line: Mml;
    let detail: string;
    switch (refusal.reason) {
      case 'not-a-book':
        line = Mml.compose`${it} has no pages to turn to.`;
        detail = 'only a book has pages';
        break;
      case 'no-such-page':
        line = Mml.text(`${target.getPresentation()} has ${refusal.facts.pages} pages.`);
        detail = `${target.getPresentation()} has ${refusal.facts.pages} pages.`;
        break;
      case 'too-dark-to-read':
        line = Mml.compose`There is writing on ${it}, but you cannot make out a word of it in this light.`;
        detail = 'inked marks need light';
        break;
      case 'no-channel-for-marks':
        line = Mml.compose`There is writing on ${it}, but you have no way to make it out.`;
        detail = 'no sense reaches these marks';
        break;
      case 'script-unknown':
        line = Mml.compose`The marks on ${it} are writing of some kind, but not in any script you know.`;
        detail = `cannot decode '${refusal.facts.script}'`;
        break;
      default: {
        const never: never = refusal;
        return never;
      }
    }
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(line).send();
    context.note({ kind: 'controller-rejected', reason: refusal.reason, detail });
  }
}
