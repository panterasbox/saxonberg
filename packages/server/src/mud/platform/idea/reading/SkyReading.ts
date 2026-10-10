/**
 * AnalyzeSkyController — handler for `analyze sky [<location>]`.
 * Composite celestial readout for a location: day/night, season, sun
 * altitude / azimuth, and moon phase + next full moon. No instrument
 * required. Casual prose first, analytical (degree) values after.
 */

import Reading from '../../../lib/instrument/Reading';
import type { Tooled } from '../../../lib/craft/Tooled';
import type { CompetenceBandName } from '../../../lib/advancement/CompetenceBand';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { CelestialApi } from '../../../api/celestial';
import { DefaultCalendar } from '../../../lib/time/DefaultCalendar';
import { ZoneApi } from '../../../api/zone';
import { WorldClockApi } from '../../../api/worldclock';
import { EARTH_LIKE } from '../../../lib/time/CelestialProfile';
import type { Container } from '../../../lib/spatial/Container';

interface AnalyzeSkyModel extends CommandModel {
  location?: MqlOneResult;
}

const TOPIC = 'sense.reading';

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

export default class SkyReading extends Reading {
  protected override async analyze(
    ctx: CommandContext,
    subject: Stuff | null,
    _band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    param: string,
  ): Promise<void> {
    // ⭐ The controller's body verbatim, under the rung it always was.
    // `model` is the shim that keeps the diff honest: the binder used to
    // hand this in as a named arg, and the ladder hands it in resolved.
    const model = { location: { stuff: subject, raw: param } } as unknown as AnalyzeSkyModel;
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

    // ⭐ The sky SAYS so at a pole (the climate build's AC 5): where the
    // sunrise hour angle has no solution, the sun does not rise, or does
    // not set, today — read at THIS place's latitude.
    const latitude = (
      await ZoneApi.climateSiteFor(loc as Stuff & Container)
    ).latitudeDeg;
    const h0 = CelestialApi.sunriseHourAngleDeg(
      EARTH_LIKE,
      latitude,
      WorldClockApi.getNow().rawValue()
    );
    const polar =
      h0 === 'polar-night'
        ? ' It is the polar night: the sun will not rise today.'
        : h0 === 'polar-day'
          ? ' It is the polar day: the sun will not set today.'
          : '';

    const sky = isDay ? 'Daylight' : 'Night';
    const body = Mml.compose`${sky} over ${Mml.location(
      loc
    )}; the season is ${season}.${polar} The moon is ${phaseName(phase)}.
sun altitude: ${altitude.formatMml(undefined, undefined, { channel: 'celestial' })} · azimuth: ${azimuth.formatMml(undefined, undefined, { channel: 'celestial' })}
next full moon: ${nextFullDate}
`;

    MessageApi.scene(giver).topic(TOPIC).toSelf(body).send();
  }
}
