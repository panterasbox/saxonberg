/**
 * LightReading — how much light there is, and where it is coming from.
 *
 * ⭐ The channel that shows the ladder's whole shape in one row. The eye
 * rung says what the light is GOOD FOR (`analyze light` — the
 * per-source working); the photometer says how much of it there is in
 * lux (`measure light`). Same fact, two resolutions, and neither is a
 * permission.
 */

import Reading from '../../../lib/instrument/Reading';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { PerceptionApi } from '../../../api/perception';
import { StuffApi } from '../../../api/stuff';
import { Light } from '../../../lib/perception/Light';
import { Mml } from '../../../api/mml';
import { Quantity } from '../../../lib/quantity';
import type { CommandContext } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Tooled } from '../../../lib/craft/Tooled';
import type { CompetenceBandName } from '../../../lib/advancement/CompetenceBand';

export default class LightReading extends Reading {
  protected override async measure(
    context: CommandContext,
    target: Stuff | null,
    _instrument: Stuff & Tooled,
    _band: CompetenceBandName,
    _param: string,
  ): Promise<void> {
    const loc = this.asPlace(context, target);
    if (!loc) return;
    const light = this.lightAt(loc);
    this.report(
      context,
      Mml.compose`light at ${Mml.location(loc)}: ${light.intensity.formatMml(undefined, undefined, { channel: 'light' })}\n`,
    );
  }

  protected override async analyze(
    context: CommandContext,
    target: Stuff | null,
    _band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    _param: string,
  ): Promise<void> {
    const loc = this.asPlace(context, target);
    if (!loc) return;
    const light = this.lightAt(loc);

    const lines: Mml[] = [];
    lines.push(Mml.compose`Light analysis at ${Mml.location(loc)}:`);
    lines.push(
      Mml.compose`  total: ${light.intensity.formatMml(undefined, undefined, { channel: 'light' })}`,
    );
    if (light.colorTemperature) {
      lines.push(
        Mml.compose`  color temperature: ${light.colorTemperature.formatMml(undefined, undefined, { channel: 'light' })}`,
      );
    }
    if (light.sources.length === 0) {
      lines.push(Mml.compose`  contributing sources: none`);
    } else {
      lines.push(Mml.compose`  contributing sources:`);
      for (const s of light.sources) {
        const src = StuffApi.findById(s.stuffId);
        const sourceName = src
          ? Mml.thing(src as Stuff)
          : Mml.fromMarkup(`<unknown>${s.stuffId}</unknown>`);
        const flux = Quantity.of(s.flux, 'lumen');
        if (s.colorTemperature !== null) {
          const colorTempQ = Quantity.of(s.colorTemperature, 'K');
          lines.push(
            Mml.compose`    - ${sourceName}: ${flux.formatMml(undefined, undefined, { channel: 'light' })} @ ${colorTempQ.formatMml(undefined, undefined, { channel: 'light' })}`,
          );
        } else {
          lines.push(
            Mml.compose`    - ${sourceName}: ${flux.formatMml(undefined, undefined, { channel: 'light' })}`,
          );
        }
      }
    }

    let body = Mml.compose`\n`;
    for (const line of lines) body = Mml.compose`${body}${line}\n`;
    this.report(context, body);
  }

  public override async truth(target: Stuff | null): Promise<number | null> {
    if (!target || !MixinApi.isContainer(target)) return null;
    return this.lightAt(target as Stuff & Container).intensity.rawValue();
  }

  /** The named thing as a place, refusing in the old words when it is not. */
  private asPlace(
    context: CommandContext,
    target: Stuff | null,
  ): (Stuff & Container) | null {
    if (!target) {
      this.decline(context, Mml.compose`You don't see any '' here.`, 'no-place');
      return null;
    }
    if (!MixinApi.isContainer(target)) {
      const detail = `${target.getPresentation()} isn't a place`;
      MessageApi.scene(context.commandGiver)
        .topic('sense.reading')
        .toSelf(Mml.fromMarkup(detail))
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-place',
        detail,
      });
      return null;
    }
    return target as Stuff & Container;
  }

  private lightAt(loc: Stuff & Container): Light {
    const vision = PerceptionApi.modalityByName('vision');
    return (vision.signalAt(loc) as Light | null) ?? Light.ZERO;
  }
}
