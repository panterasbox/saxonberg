/**
 * DraughtReadController — bare `draught` / `draught at <fire>`: where the
 * dial stands, in words (over {@link DraughtControllerBase}).
 *
 * ⭐ Bare `draught` is a READ, not a refusal: asking where a dial stands
 * is not a mistake. Its own shape (`draught.yaml`), whose fire slot needs
 * its preposition — a bare word after `draught` is a SETTING, and the
 * read shape must never take one (three drive runs found a set that
 * silently became a read when it did).
 */

import type { CommandContext } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { DraughtControllerBase, type DraughtModel } from './DraughtControllerBase';

export default class DraughtReadController extends DraughtControllerBase {
  execute(model: DraughtModel, context: CommandContext): void {
    const burner = this.fireOf(model, context);
    if (!burner) return;
    MessageApi.scene(context.commandGiver)
      .topic('act.deed')
      .toSelf(
        Mml.compose`${Mml.thing(burner)}: ${DraughtControllerBase.wordFor(burner.getDraught())}.`,
      )
      .send();
  }
}
