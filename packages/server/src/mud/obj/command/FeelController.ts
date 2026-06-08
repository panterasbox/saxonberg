/**
 * FeelController — `feel` verb.
 *
 * Bare form adds an ambient-temperature line above the inherited
 * per-Detail prose, reading via `TouchModality.touchAt` (which walks
 * the biome chain). Targeted `feel <target>` with a detail path
 * (e.g. `feel stove`) prepends a per-detail temperature line on top
 * of the per-Detail `touch` slot read.
 *
 * Per the requirements doc: vitals burn damage on scalding contact
 * is an explicit non-goal — the prose surfaces "scalding" without a
 * damage hook.
 */

import { SingleSenseControllerBase } from './SingleSenseControllerBase';
import type { CommandContext, CommandModel } from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import type { SenseChannel } from '../../lib/description/Perceiver';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { TouchModality } from '../../lib/perception/modalities/TouchModality';

interface FeelModel extends CommandModel {
  target?: MqlOneResult;
}

export class FeelController extends SingleSenseControllerBase {
  protected readonly senseChannel: SenseChannel = 'touch';
  protected readonly sceneTopic = 'world.perception.sense.feel';

  /**
   * Async overload: bare form reads ambient temperature; detail-via
   * form reads the per-detail temperature override; otherwise
   * delegates to the inherited base.
   */
  override async execute(
    model: FeelModel,
    context: CommandContext,
  ): Promise<void> {
    const target = model.target;
    const detailPath = target?.via?.detailPath;

    // Detail-via (target host carries a detailPath) takes precedence —
    // `feel workbench` should read the detail's touch slot even when
    // the host *is* the current location.
    if (
      target &&
      target.stuff !== null &&
      detailPath &&
      detailPath.length > 0
    ) {
      await this.feelDetail(target.stuff, detailPath, context);
      return;
    }
    if (target && target.stuff === context.location) {
      await this.feelAmbient(context);
      return;
    }
    super.execute(model, context);
  }

  private async feelAmbient(context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const location = context.location;
    if (!MixinApi.isAtmospheric(location)) {
      super.execute({ target: undefined } as FeelModel, context);
      return;
    }
    const touch = await TouchModality.touchAt(location);
    const bandLine = Mml.compose`The air feels ${touch.band}.`;
    const filteredLong = MixinApi.isVisible(location)
      ? location
          .getMarkupLong(actor, { filter: [this.senseChannel] })
          .replace(/\s+$/, '')
      : '';
    const body = filteredLong
      ? Mml.compose`${bandLine}\n${Mml.fromMarkup(filteredLong)}`
      : bandLine;
    MessageApi.scene(actor).topic(this.sceneTopic).toSelf(body).send();
  }

  private async feelDetail(
    host: Stuff,
    detailPath: string[],
    context: CommandContext,
  ): Promise<void> {
    const actor = context.commandGiver;
    const dotted = detailPath.join('.');
    let bandPrefix: Mml | null = null;
    if (MixinApi.isAtmospheric(host) && MixinApi.isContainer(host)) {
      try {
        const touch = await TouchModality.touchAt(
          host as unknown as Stuff & Container,
          dotted,
        );
        bandPrefix = Mml.compose`It feels ${touch.band}.`;
      } catch {
        bandPrefix = null;
      }
    }
    if (!MixinApi.isDetailed(host)) {
      const body =
        bandPrefix ??
        Mml.compose`You don't perceive anything notable there.`;
      MessageApi.scene(actor).topic(this.sceneTopic).toSelf(body).send();
      return;
    }
    const description = host.getDetail(dotted, this.senseChannel);
    if (description === null) {
      const body = bandPrefix
        ? bandPrefix
        : Mml.compose`You don't perceive anything notable about '${dotted}' that way.`;
      MessageApi.scene(actor).topic(this.sceneTopic).toSelf(body).send();
      return;
    }
    const tip = detailPath[detailPath.length - 1]!;
    const body = bandPrefix
      ? Mml.compose`${bandPrefix}\n${tip}\n\n${Mml.fromMarkup(description)}`
      : Mml.compose`\n${tip}\n\n${Mml.fromMarkup(description)}\n`;
    MessageApi.scene(actor).topic(this.sceneTopic).toSelf(body).send();
  }
}
