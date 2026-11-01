/**
 * UnmarkController — `unmark <field>`: **take a field's stakes up** (tracts
 * build D29). Its ground goes back into the tract's unmarked ground, its
 * soil folded in with what is there.
 *
 * ⭐ Dumb: the tract refuses (not yours; a crop stands in it) and words
 * every line. The arg gate binds a field fixture by its name (`requires:
 * SoilMixin`), so a thing that is not ground never reaches here.
 */

import { FieldWorkController, FIELD_TOPIC } from './FieldWorkController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import Field from '../../../thing/Field';

interface UnmarkModel extends CommandModel {
  field?: MqlOneResult;
}

export default class UnmarkController extends FieldWorkController {
  async execute(model: UnmarkModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const reading = await this.fieldOf(giver);
    if (!reading) {
      this.decline(context, Mml.compose`There is no field here to unmark.`, 'no-tract');
      return;
    }
    const named = model.field?.stuff ?? null;
    if (!(named instanceof Field) || named.getTract() !== reading.tract) {
      this.decline(
        context,
        Mml.compose`Unmark which field? Name one marked here.`,
        'not-a-field-here',
      );
      return;
    }
    const outcome = await reading.tract.unmarkField(giver, named);
    if (!outcome.ok) {
      this.decline(context, Mml.fromMarkup(outcome.line), outcome.reason);
      return;
    }
    MessageApi.scene(giver)
      .topic(FIELD_TOPIC)
      .toSelf(Mml.fromMarkup(outcome.line))
      .toPeers(Mml.compose`${Mml.actor(giver)} pulls up a line of stakes.`)
      .send();
  }
}
