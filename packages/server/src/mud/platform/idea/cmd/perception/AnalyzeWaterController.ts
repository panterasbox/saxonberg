/**
 * AnalyzeWaterController — handler for `analyze water [<target>]`.
 *
 * Two readings, and which one you get depends on whether you point at
 * something:
 *
 *  - **bare** — the water at the place you are standing: the reach the
 *    covering locality declares, what is passing there, how much of it
 *    is snowmelt, how much snow is still on the ground above you, and
 *    whether a boat gets through.
 *  - **at a target** — that waterworks' whole working: its two ends,
 *    its head, its capacity, whether it runs on gravity or on a pump
 *    and what the pump costs, and why it is not delivering if it is not.
 *
 * ⚠ **The kernel does not import the water pack.** Both readings go
 * over shapes: a supply answers `supplyReport`
 * ({@link SupplyReporting}), and the drainage is reached by MQL class
 * name rather than by module — the `HoldingView` seam the residences
 * build established. A world with no water pack installed gets an
 * honest "nothing here knows about water", never a crash.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { AddressApi } from '../../../../api/address';
import { StuffApi } from '../../../../api/stuff';
import { WorldClockApi } from '../../../../api/worldclock';
import { Mml } from '../../../../api/mml';
import type { SupplyReporting } from '../../../../lib/supply/SupplyState';

interface AnalyzeWaterModel extends CommandModel {
  target?: Stuff;
}

/**
 * The drainage catalogue's shape, met structurally.
 *
 * Every member optional: the catalogue is a pack object, and a realm
 * that ships no water pack simply answers nothing. Reading it by shape
 * is what keeps `lint:imports` honest — the kernel asks a question, it
 * does not reach into a pack to get the answer.
 */
interface DrainageView {
  flowAt?: (
    ref: string,
    nowS: number,
  ) => Promise<{
    m3s: number;
    meltM3S: number;
    snowpackMm: number;
    navigable: boolean;
  } | null>;
}

const CATALOGUE_PATH = '/water/idea/WatercourseCatalogue';

export default class AnalyzeWaterController extends CommandController<AnalyzeWaterModel> {
  async execute(
    model: AnalyzeWaterModel,
    ctx: CommandContext,
  ): Promise<void> {
    const giver = ctx.commandGiver;
    const target = model.target ?? null;

    if (target !== null) {
      await this.reportOn(target, ctx);
      return;
    }

    const scope = (
      giver as Stuff & { getContainer?: () => unknown }
    ).getContainer?.();
    if (!scope || !MixinApi.isContainer(scope as Stuff)) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-scope',
        detail: 'no scope to read water at',
      });
      MessageApi.scene(giver)
        .topic('sense.reading')
        .toSelf(Mml.compose`You aren't anywhere to read the water.`)
        .send();
      return;
    }

    const locality = await AddressApi.resolveLocalityFor(scope as Stuff & Container);
    const reach = locality?.getReach() ?? null;
    if (reach === null) {
      // ⚠ Off the watershed is a NORMAL state of the world, not an
      // error — three localities ship rootless on purpose.
      MessageApi.scene(giver)
        .topic('sense.reading')
        .toSelf(
          Mml.compose`Nothing here drains anywhere you could name. This ground is off the watershed.`,
        )
        .send();
      return;
    }

    const drainage = this.drainage();
    const flow =
      drainage?.flowAt === undefined
        ? null
        : await drainage.flowAt(reach, WorldClockApi.getNow().rawValue());
    if (flow === null) {
      MessageApi.scene(giver)
        .topic('sense.reading')
        .toSelf(
          Mml.compose`This ground drains to ${reach}, but nothing here knows what is running through it.`,
        )
        .send();
      return;
    }

    const lines = [
      `reach: ${reach}`,
      `${flow.m3s.toFixed(2)} m³/s passing` +
        (flow.meltM3S > 0
          ? `, ${flow.meltM3S.toFixed(2)} of it snowmelt`
          : ''),
      flow.snowpackMm > 0
        ? `${flow.snowpackMm.toFixed(0)} mm of water still lying as snow above you`
        : `no snow left on the catchment`,
      flow.navigable ? `a boat would get through` : `too little for a boat`,
    ];
    MessageApi.scene(giver)
      .topic('sense.reading')
      .toSelf(Mml.compose`${lines.join('\n')}\n`)
      .send();
  }

  /** Print a waterworks' own report, over the shape. */
  private async reportOn(target: Stuff, ctx: CommandContext): Promise<void> {
    const giver = ctx.commandGiver;
    const report = (target as unknown as SupplyReporting).supplyReport;
    if (typeof report !== 'function') {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'not-a-supply',
        detail: 'the target reports no supply state',
      });
      MessageApi.scene(giver)
        .topic('sense.reading')
        .toSelf(
          Mml.compose`${target.getPresentation()} carries no water anywhere.`,
        )
        .send();
      return;
    }
    const read = await report.call(target, WorldClockApi.getNow().rawValue());
    MessageApi.scene(giver)
      .topic('sense.reading')
      .toSelf(
        Mml.compose`${read.label}\n${read.lines.map((l) => `  ${l}`).join('\n')}\n`,
      )
      .send();
  }

  /** The drainage catalogue, if this realm ships one. */
  private drainage(): DrainageView | null {
    return (
      (StuffApi.findByTemplatePath(CATALOGUE_PATH) as unknown as DrainageView) ??
      null
    );
  }
}
