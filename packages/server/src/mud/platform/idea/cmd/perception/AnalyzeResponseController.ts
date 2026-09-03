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

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MaterialApi } from '../../../../api/material';
import { MECHANICAL_CHANNELS } from '../../../../lib/material/Channel';

interface AnalyzeResponseModel extends CommandModel {
  target?: MqlOneResult;
}

const TOPIC = 'sense.reading';

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
      // A control-bearing instrument still reads: the band is the one
      // response a plain tool carries (skill embedded in the capital —
      // work done with it never lands below the band).
      if (MixinApi.isTool(stuff)) {
        const bands = stuff
          .getCapabilities()
          .map((k) => stuff.capabilityControl(k))
          .filter((b): b is string => b !== null);
        if (bands.length > 0) {
          MessageApi.scene(giver)
            .topic(TOPIC)
            .toSelf(
              Mml.compose`Control of ${Mml.thing(stuff)}: ${bands[0]!} — work done with it never lands below that band.`,
            )
            .send();
          return;
        }
      }
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

    const material = MixinApi.isTangible(stuff)
      ? stuff.getMaterial()
      : null;
    const grade = MixinApi.isGraded(stuff) ? stuff.getGrade() : undefined;
    const condition = MixinApi.isDurable(stuff)
      ? stuff.getCondition()
      : undefined;

    const armor = construction.isCovering();
    const verb = armor ? 'turns' : 'delivers';
    const lines: Mml[] = [];
    lines.push(
      Mml.compose`Response of ${Mml.thing(stuff)} (${construction.getForm()}) — how it ${verb} each channel:`,
    );
    if (MixinApi.isDurable(stuff) && stuff.isBroken()) {
      lines.push(
        Mml.compose`  It is broken — ruined until repaired; what follows is all it has left.`,
      );
    }
    // The edge band (bands only) — the working-surface axis, distinct
    // from structural condition.
    if (!armor && MixinApi.isKeen(stuff)) {
      const kb = stuff.getKeennessBand();
      lines.push(Mml.compose`  edge: ${kb}`);
    }
    // A control-bearing instrument (bands only): skill embedded in the
    // capital — work done with it never lands below this band.
    if (MixinApi.isTool(stuff)) {
      const bands = stuff
        .getCapabilities()
        .map((k) => stuff.capabilityControl(k))
        .filter((b): b is string => b !== null);
      if (bands.length > 0) {
        lines.push(Mml.compose`  control: ${bands[0]!}`);
      }
    }
    for (const channel of MECHANICAL_CHANNELS) {
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
