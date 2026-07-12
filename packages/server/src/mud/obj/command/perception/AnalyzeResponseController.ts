/**
 * AnalyzeResponseController — handler for `analyze response <target>`.
 *
 * The materials-response **legibility preview**: point at a made thing and
 * read what it would do, per channel. A weapon reports the outcome band it
 * *delivers* on each channel (edge / point / blunt); a piece of armor
 * reports how well it *turns* each. Pure server projection over
 * `MaterialApi.previewBand` — the SAME chokepoint `ConditionApi.inflict`
 * reads, so the previewed band always matches what an actual blow lands.
 *
 * A target without a `Construction` falls through to a polite "nothing to
 * analyze" — the model isn't authored on it.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { MaterialApi } from '../../../api/material';
import { CHANNELS } from '../../../lib/material/Channel';

interface AnalyzeResponseModel extends CommandModel {
  target?: MqlOneResult;
}

const TOPIC = 'world.perception.measurement.analyze-response';

export default class AnalyzeResponseController extends CommandController<AnalyzeResponseModel> {
  execute(model: AnalyzeResponseModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const target = model.target;
    if (!target || target.stuff === null) {
      const raw = target?.raw ?? '';
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: raw });
      return;
    }

    const stuff = target.stuff as Stuff;
    if (!MixinApi.isConstructed(stuff)) {
      const detail = `${stuff.getPresentation()} isn't a made thing you can read for a response.`;
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.fromMarkup(detail))
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-constructed',
        detail,
      });
      return;
    }

    const construction = stuff.getConstruction();
    if (!construction) {
      const detail = `${stuff.getPresentation()} carries no construction to analyze.`;
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.fromMarkup(detail))
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-construction',
        detail,
      });
      return;
    }

    const material = MaterialApi.materialOf(stuff);
    const grade = MixinApi.isGraded(stuff) ? stuff.getGrade() : undefined;
    const condition = MixinApi.isTool(stuff) ? stuff.getCondition() : undefined;

    const armor = construction.isArmor();
    const verb = armor ? 'turns' : 'delivers';
    const lines: Mml[] = [];
    lines.push(
      Mml.compose`Response of ${Mml.name(stuff)} (${construction.getForm()}) — how it ${verb} each channel:`,
    );
    for (const channel of CHANNELS) {
      if (!armor && construction.deliveryFor(channel) === 'none') {
        lines.push(Mml.compose`  ${channel}: — (not delivered)`);
        continue;
      }
      const band = MaterialApi.previewBand(
        channel,
        material,
        construction,
        grade,
        condition,
      );
      lines.push(Mml.compose`  ${channel}: ${band}`);
    }

    let body = Mml.compose`\n`;
    for (const line of lines) {
      body = Mml.compose`${body}${line}\n`;
    }
    MessageApi.scene(giver).topic(TOPIC).toSelf(body).send();
  }
}
