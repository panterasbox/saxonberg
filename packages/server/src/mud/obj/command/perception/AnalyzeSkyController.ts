/**
 * AnalyzeSkyController — handler for `analyze sky [<location>]`.
 * Composite celestial readout for a location: day/night, season, sun
 * altitude / azimuth, and moon phase + next full moon. No instrument
 * required. Casual prose first, analytical (degree) values after.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { CelestialApi } from '../../../api/celestial';
import { DefaultCalendar } from '../../../lib/time/DefaultCalendar';

interface AnalyzeSkyModel extends CommandModel {
  location?: MqlOneResult;
}

const TOPIC = 'world.perception.measurement.analyze-sky';

/** Coarse moon-phase label from the [0,1) phase fraction. */
function phaseName(phase: number): string {
  if (phase < 0.03 || phase >= 0.97) return 'new';
  if (phase < 0.22) return 'waxing crescent';
  if (phase < 0.28) return 'first quarter';
  if (phase < 0.47) return 'waxing gibbous';
  if (phase < 0.53) return 'full';
  if (phase < 0.72) return 'waning gibbous';
  if (phase < 0.78) return 'last quarter';
  return 'waning crescent';
}

export default class AnalyzeSkyController extends CommandController<AnalyzeSkyModel> {
  async execute(model: AnalyzeSkyModel, ctx: CommandContext): Promise<void> {
    // Provenance: the instrument that afforded this verb, if any.
    const via = this.affordingSource(ctx);
    const giver = ctx.commandGiver;
    const target = model.location;
    if (!target || target.stuff === null) {
      const raw = target?.raw ?? '';
      ctx.note({ kind: 'empty-result', field: 'location', query: raw });
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${raw}' here.`)
        .send();
      return;
    }
    if (!MixinApi.isContainer(target.stuff)) {
      const detail = `${target.stuff.getPresentation()} isn't a place`;
      ctx.note({ kind: 'controller-rejected', reason: 'not-a-place', detail });
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.fromMarkup(detail)).send();
      return;
    }

    const loc = target.stuff as Stuff;
    const isDay = await CelestialApi.isDayAt(loc);
    const season = await CelestialApi.currentSeason(loc);
    const altitude = await CelestialApi.sunAltitude(loc);
    const azimuth = await CelestialApi.sunAzimuth(loc);
    const phase = CelestialApi.moonPhase();
    const nextFull = CelestialApi.nextFullMoon();
    const nextFullDate = DefaultCalendar.singleton().formatDate(nextFull);

    const sky = isDay ? 'Daylight' : 'Night';
    const body = Mml.compose`${sky} over ${Mml.location(
      loc
    )}; the season is ${season}. The moon is ${phaseName(phase)}.
sun altitude: ${altitude.formatMml(undefined, undefined, { channel: 'celestial', via })} · azimuth: ${azimuth.formatMml(undefined, undefined, { channel: 'celestial', via })}
next full moon: ${nextFullDate}
`;

    MessageApi.scene(giver).topic(TOPIC).toSelf(body).send();
  }
}
