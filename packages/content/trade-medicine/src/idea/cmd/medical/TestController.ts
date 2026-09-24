/**
 * TestController — `test [patient] [with <syringe>]` (blood build D5).
 * Reads a body's blood type, marks it labelled, and reports it. Works on
 * self (the autarkist). Credits `nursing easy`.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const TOPIC = 'act.deed';

interface TestModel extends CommandModel {
  patient?: MqlOneResult;
}

export default class TestController extends CommandController<TestModel> {
  async execute(model: TestModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.patient?.stuff as Stuff | undefined;
    const target: Stuff = named ?? (giver as unknown as Stuff);
    const self = named === undefined;

    if (!MixinApi.isVitals(target)) {
      return this.fail(context, 'There is no blood there to test.', 'no-body');
    }
    const type = target.bloodType();
    if (type === null) {
      return this.fail(context, 'That body has no blood to type.', 'no-blood');
    }
    target.markBloodTyped();

    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: 'nursing',
        difficulty: 'easy',
        outcome: 'success',
      });
    }

    const whose = self ? 'Your' : `${target.getPresentation()}'s`;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(`${Mml.escape(whose)} blood is type ${Mml.escape(type)}.`))
      .send();
  }

  private fail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }
}
