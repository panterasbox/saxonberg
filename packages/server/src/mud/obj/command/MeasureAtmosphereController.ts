/**
 * MeasureAtmosphereController — handler for `measure atmosphere
 * [<detail>]`. Reads `BiomeApi.resolveAtmosphereFor` with the
 * actor's container as scope; refuses without a GasAnalyzer in
 * hand. Reports the bulk medium tag (`air` / `water` / `vacuum`
 * / …) plus its density at standard conditions.
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../api/command';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { MessageApi } from '../../api/message';
import { BiomeApi } from '../../api/biome';
import { Mml } from '../../api/mml';
import GasAnalyzer from '../instrument/GasAnalyzer';

interface MeasureAtmosphereModel extends CommandModel {
  detail?: string;
}

export default class MeasureAtmosphereController extends CommandController<MeasureAtmosphereModel> {
  async execute(
    model: MeasureAtmosphereModel,
    ctx: CommandContext,
  ): Promise<void> {
    const giver = ctx.commandGiver;
    const inv = MixinApi.isContainer(giver)
      ? ContainmentApi.getContents(giver as Stuff & Container)
      : [];
    if (!inv.some((i) => i instanceof GasAnalyzer)) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-instrument',
        detail: 'no gas analyzer in hand',
      });
      MessageApi.scene(giver)
        .topic('world.perception.measurement.measure-atmosphere')
        .toSelf(Mml.compose`You need a gas analyzer in hand.`)
        .send();
      return;
    }
    const scope = (giver as Stuff & {
      getContainer?: () => unknown;
    }).getContainer?.();
    if (!scope || !MixinApi.isContainer(scope as Stuff)) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-scope',
        detail: 'no atmospheric scope',
      });
      MessageApi.scene(giver)
        .topic('world.perception.measurement.measure-atmosphere')
        .toSelf(Mml.compose`You aren't anywhere to measure.`)
        .send();
      return;
    }

    const a = await BiomeApi.resolveAtmosphereFor(
      scope as Stuff & Container,
      model.detail,
    );
    let densityLine: Mml | null = null;
    try {
      const d = BiomeApi.densityOf(a);
      densityLine = Mml.compose`  density: ${d.formatMml()}\n`;
    } catch {
      // Unknown atmosphere tag — surface the tag without a density.
      densityLine = null;
    }
    const body = densityLine
      ? Mml.compose`Atmosphere: ${a}\n${densityLine}`
      : Mml.compose`Atmosphere: ${a}\n`;
    MessageApi.scene(giver)
      .topic('world.perception.measurement.measure-atmosphere')
      .toSelf(body)
      .send();
  }
}
