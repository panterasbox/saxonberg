/**
 * AnalyzeElectricalController — handler for `analyze electrical <target>`.
 *
 * The electricity **legibility surface** (the multimeter). Point at a
 * material, a made thing, a live source, or a body and read its electrical
 * character: conductivity / resistance / path-to-ground as **bands** (banding
 * is presentation, never security), plus the **raw** `Quantity<'V'|'A'|'Ω'|
 * 'S/m'>` numbers on measurement — so a student's reading matches their
 * coursework. Reads `Material.getElectricalConductivity` +
 * `ElectricityApi.pathToGround` + the source's `getVoltage`; a target with no
 * electrical character falls through politely.
 *
 * See docs/subsystems/electricity.md.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { MaterialApi } from '../../../api/material';
import { ElectricityApi } from '../../../api/electricity';
import type { Energized } from '../../../lib/electricity/Energized';

interface AnalyzeElectricalModel extends CommandModel {
  target?: MqlOneResult;
}

const TOPIC = 'sense.reading';

export default class AnalyzeElectricalController extends CommandController<AnalyzeElectricalModel> {
  execute(model: AnalyzeElectricalModel, context: CommandContext): void {
    // Provenance: the instrument that afforded this verb, if any.
    const via = this.affordingSource(context);
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
    const lines: Mml[] = [];
    lines.push(Mml.compose`Electrical read of ${Mml.name(stuff)}:`);
    let anything = false;

    // Material conductivity — band + raw S/m (the multimeter's headline).
    const material = MixinApi.isTangible(stuff)
      ? stuff.getMaterial()
      : null;
    if (material) {
      const sigma = material.getElectricalConductivity();
      lines.push(
        Mml.compose`  conductivity: ${sigma.tag()} (${sigma.formatMml(undefined, undefined, { channel: 'electrical', via })})`,
      );
      // Its contact resistance (band + raw Ω).
      const r = MaterialApi.contactResistance(material);
      lines.push(Mml.compose`  contact resistance: ${r.tag()} (${r.formatMml(undefined, undefined, { channel: 'electrical', via })})`);
      anything = true;
    }

    // A live source — its potential.
    if (MixinApi.isEnergized(stuff)) {
      const v = (stuff as Stuff & Energized).getVoltage();
      lines.push(Mml.compose`  potential: ${v.formatMml(undefined, undefined, { channel: 'electrical', via })}`);
      anything = true;
    }

    // A body — its path to ground (the grounding legibility).
    if (MixinApi.isVitals(stuff)) {
      const grounded = ElectricityApi.pathToGround(stuff);
      lines.push(
        Mml.compose`  path to ground: ${grounded ? 'grounded' : 'insulated (no path)'}`,
      );
      anything = true;
    }

    if (!anything) {
      const detail = `${stuff.getPresentation()} has no electrical character to read.`;
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.fromMarkup(detail))
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-electrical',
        detail,
      });
      return;
    }

    let body = Mml.compose`\n`;
    for (const line of lines) {
      body = Mml.compose`${body}${line}\n`;
    }
    MessageApi.scene(giver).topic(TOPIC).toSelf(body).send();
  }
}
