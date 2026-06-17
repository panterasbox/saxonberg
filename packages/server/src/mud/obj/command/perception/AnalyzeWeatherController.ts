/**
 * AnalyzeWeatherController — handler for `analyze weather [<location>]`.
 *
 * Reports the procedural weather at a place: the current weather type
 * with its cloud / precipitation descriptors, the four per-field
 * deviations folded into a SkyExposed scope's biome reads, the covering
 * Locality (or global / off-grid), and a short forecast (the next
 * segments' types — free from determinism). No instrument required —
 * cheap; the developer/pedagogical companion to `analyze atmosphere` /
 * `analyze address`. The Barometer separately reads the
 * weather-deviated pressure with no new code.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { WeatherApi } from '../../../api/weather';
import { AddressApi } from '../../../api/address';
import {
  WEATHER_DEFAULTS,
  type WeatherField,
  type WeatherDeviation,
} from '../../../lib/weather/WeatherType';

interface AnalyzeWeatherModel extends CommandModel {
  location?: MqlOneResult;
}

const TOPIC = 'world.perception.measurement.analyze-weather';

/** Human label per deviated field. */
const FIELD_LABELS: Record<WeatherField, string> = {
  temperature: 'temperature',
  humidity: 'humidity',
  wind: 'wind',
  pressure: 'pressure',
};

const FIELD_ORDER: WeatherField[] = [
  'temperature',
  'humidity',
  'wind',
  'pressure',
];

/** A signed deviation reads "+3 m/s" / "−800 Pa" / "0 K" (delta, not band). */
function describeDeviation(dev: WeatherDeviation, field: WeatherField): string {
  const v = dev[field].rawValue();
  const sign = v > 0 ? '+' : '';
  return `${sign}${dev[field].format()}`;
}

export default class AnalyzeWeatherController extends CommandController<AnalyzeWeatherModel> {
  async execute(
    model: AnalyzeWeatherModel,
    ctx: CommandContext,
  ): Promise<void> {
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

    const scope = target.stuff as Stuff & Container;
    const forecast = await WeatherApi.forecastFor(
      scope,
      WEATHER_DEFAULTS.FORECAST_SEGMENTS,
    );
    const locality = await AddressApi.resolveLocalityFor(scope);
    const sample = forecast.current;

    const lines: Mml[] = [];
    lines.push(Mml.compose`Weather at ${Mml.location(scope)}:`);
    lines.push(
      Mml.compose`  type: ${sample.type} (${sample.season}) — cloud ${sample.cloud.toFixed(2)}, ${sample.precipitation} precipitation`,
    );
    lines.push(Mml.compose`  deviations from the local climate:`);
    for (const field of FIELD_ORDER) {
      lines.push(
        Mml.compose`    ${FIELD_LABELS[field]}: ${describeDeviation(sample.deviation, field)}`,
      );
    }
    if (locality !== null) {
      lines.push(
        Mml.compose`  covering Locality: ${locality.getName()} (claims '${locality.getAddress()}')`,
      );
    } else {
      lines.push(Mml.compose`  covering Locality: (none — global / off-grid)`);
    }
    if (forecast.upcoming.length > 0) {
      const types = forecast.upcoming.map((e) => e.type).join(' → ');
      lines.push(Mml.compose`  forecast: ${types}`);
    }

    let body = Mml.compose`\n`;
    for (const line of lines) {
      body = Mml.compose`${body}${line}\n`;
    }
    MessageApi.scene(giver).topic(TOPIC).toSelf(body).send();
  }
}
