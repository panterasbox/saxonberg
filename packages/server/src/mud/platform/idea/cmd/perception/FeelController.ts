/**
 * FeelController — `feel` verb.
 *
 * Bare form adds an ambient-temperature line above the inherited
 * per-Detail prose, reading via `TouchModality.touchAt` (which walks
 * the biome chain). Targeted `feel <target>` with a detail path
 * (e.g. `feel stove`) prepends a per-detail temperature line on top
 * of the per-Detail `touch` slot read.
 *
 * A `feel <object>` against a Thermal object reads the object's own
 * *surface* temperature (≈ ambient for a sealed, well-insulated vessel —
 * the insulation observable as the absence of exterior heat) and, on a
 * scalding surface, afflicts a `burn` trauma. This retires the vitals-
 * era "scalding without a damage hook" non-goal: the burn is the general
 * scalding-band contact hook, not a feel-local mechanic.
 */

import { SingleSenseControllerBase } from './SingleSenseControllerBase';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { SenseChannel } from '../../../../lib/description/Perceiver';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { ConditionApi } from '../../../../api/condition';
import { TouchModality } from '../../modalities/TouchModality';
import { Touch } from '../../../../lib/perception/Touch';
import type { Thermal } from '../../../../lib/thermal/Thermal';

interface FeelModel extends CommandModel {
  target?: MqlOneResult;
}

export default class FeelController extends SingleSenseControllerBase {
  protected readonly senseChannel: SenseChannel = 'touch';
  protected readonly sceneTopic = 'sense.survey';

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
    // `feel <thermal object>` — read the object's own SURFACE
    // temperature (sync, cached-ambient). A sealed, well-insulated
    // vessel reads ~ambient though its contents scald: insulation is
    // observable as the absence of exterior heat (the surface-vs-
    // contents sensory gate). Contact with a scalding surface burns.
    if (
      target &&
      target.stuff !== null &&
      MixinApi.isThermal(target.stuff)
    ) {
      this.feelThermalObject(target.stuff, context);
      return;
    }
    super.execute(model, context);
  }

  /**
   * Report a Thermal object's surface band, and afflict a `burn` trauma
   * on the toucher when that surface is scalding (the general scalding-
   * band contact hook — shared with bare-handed `get`/`wield`).
   */
  private feelThermalObject(
    object: Stuff & Thermal,
    context: CommandContext,
  ): void {
    const actor = context.commandGiver;
    const surface = object.getSurfaceTemperature();
    const band = Touch.bandFor(surface.rawValue());
    /*
     * ⚠ NO hardcoded article. `getPresentation()` brings its own —
     * "an ice bin", "the well", or a bare proper name — so a literal
     * "The " in front of it produced "**The an ice bin** feels
     * comfortable." and, feeling yourself, "**The senses** feels
     * comfortable." Capitalise what comes back instead.
     *
     * Nobody had seen either sentence: `feel` was gated on a `touch`
     * modality no body plan granted, so the verb had never once run.
     */
    const shown = object.getPresentation();
    const line =
      object === (actor as unknown as Stuff & Thermal)
        ? Mml.compose`You feel ${band}.`
        : Mml.compose`${shown.charAt(0).toUpperCase() + shown.slice(1)} feels ${band}.`;
    MessageApi.scene(actor)
      .topic(this.sceneTopic)
      .toSelf(line)
      .send();
    this.burnOnContact(actor, surface.rawValue());
  }

  /**
   * The scalding-band burn hook. Any contact with a surface in the
   * `scalding` touch band (>= 345 K) burns the toucher — a kettle, a forged
   * blade, the campfire. The heat routes through the `heat` materials-response
   * channel (`ConditionApi.inflict`) so a glove / gauntlet on the hand
   * insulates before the residual burns tissue. No-op below the band, or when
   * the toucher has no vitals to wound.
   */
  protected burnOnContact(actor: Stuff, surfaceK: number): void {
    const energy = Touch.contactBurnEnergy(surfaceK);
    if (energy === null || !MixinApi.isVitals(actor)) return;
    ConditionApi.inflict(actor, {
      mechanism: 'heat',
      site: 'body.hand',
      energy,
    });
  }

  private async feelAmbient(context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const location = context.location;
    if (!location) return; // defensive: placeless avatars are blocked at inbound and Login carries no sense verbs, so location is present in practice; degrade to a quiet no-op otherwise
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
    const description = host.getDetailFor(
      context.commandGiver,
      dotted,
      this.senseChannel,
    );
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
