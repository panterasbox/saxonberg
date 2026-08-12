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
  type WeatherProvenance,
  type CloudForm,
} from '../../../lib/weather/WeatherType';

interface AnalyzeWeatherModel extends CommandModel {
  location?: MqlOneResult;
}

const TOPIC = 'sense.reading';

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

/** How the resolved state was reached (the legibility acceptance criterion). */
const PROVENANCE_LABELS: Record<WeatherProvenance, string> = {
  'pin-frozen': 'authored — a frozen pin (never changes here)',
  'pin-alive': 'authored — a living pin (type forced, intensity animated)',
  'climate-leaned': 'modelled — procedural, climate-leaned',
  procgen: 'modelled — procedural',
  biome: 'biome baseline (no active sky weather here)',
};

/** A plain-language gloss of the visible cloud form. */
const CLOUD_FORM_LABELS: Record<CloudForm, string> = {
  clear: 'a clear sky',
  cirrus: 'high, thin wisps (cirrus)',
  cirrostratus: 'a thin, spreading veil (cirrostratus)',
  cumulus: 'fair-weather heaps (cumulus)',
  stratus: 'a flat grey sheet (stratus)',
  nimbostratus: 'a low, sodden ceiling (nimbostratus)',
  cumulonimbus: 'a towering anvil (cumulonimbus)',
};

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
    // The Wave-2 resolved state (authored pin → procgen(lean) → biome) — the
    // ONE read every consumer sees. `forecastFor` still supplies the upcoming
    // types; `skyReadFor` the cloud form + hedged tell.
    const resolved = await WeatherApi.resolveWeatherFor(scope);
    const skyRead = await WeatherApi.skyReadFor(scope);
    const forecast = await WeatherApi.forecastFor(
      scope,
      WEATHER_DEFAULTS.FORECAST_SEGMENTS,
    );
    const locality = await AddressApi.resolveLocalityFor(scope);
    const sample = resolved.sample;

    const lines: Mml[] = [];
    lines.push(Mml.compose`Weather at ${Mml.location(scope)}:`);
    lines.push(
      Mml.compose`  type: ${sample.type} (${sample.season}) — cloud ${sample.cloud.toFixed(2)}, ${resolved.precipitationHere} precipitation here`,
    );
    lines.push(
      Mml.compose`  provenance: ${PROVENANCE_LABELS[resolved.provenance]}`,
    );
    // The cloud form + the honestly-hedged forecast tell (Phase H).
    if (skyRead.presageFront) {
      lines.push(
        Mml.compose`  sky: ${CLOUD_FORM_LABELS[skyRead.cloudForm]} — a front *may* be moving in`,
      );
    } else {
      lines.push(Mml.compose`  sky: ${CLOUD_FORM_LABELS[skyRead.cloudForm]}`);
    }
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
