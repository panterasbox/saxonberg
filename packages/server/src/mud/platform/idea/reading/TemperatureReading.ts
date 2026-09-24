/**
 * TemperatureReading — how warm it is where you are standing.
 *
 * The `measure temperature` controller's body, moved under the rung it
 * always was. The refusal it used to hand-roll (*"You need a thermometer
 * in hand"*) is now the base's, and it names the CAPABILITY rather than
 * the class — so a second maker's thermometer works, which the
 * `instanceof Thermometer` check silently refused.
 */

import BiomeReading from '../../../lib/instrument/BiomeReading';
import { CompetenceBand } from '../../../lib/advancement/CompetenceBand';
import type { CompetenceBandName } from '../../../lib/advancement/CompetenceBand';
import type { Tooled } from '../../../lib/craft/Tooled';
import type { CommandContext } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import { BiomeApi } from '../../../api/biome';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Quantity, Unit } from '../../../lib/quantity';
import type { MeasureChannel } from '../../../lib/perception/MeasureChannel';

/**
 * ⭐⭐ Absolute degrees, because Kelvin is not a RATIO scale.
 *
 * A fraction-of-magnitude bracket says a reader who is 5 % out reads a
 * furnace at 1200 K ± 60 and a cellar at 280 K ± 14 — and the second is
 * absurd: the hard part of reading a thermometer is the SCALE, and the
 * scale does not get easier because the room is cold. These are what a
 * person is actually out by.
 */
const KELVIN_ERROR: Readonly<Record<string, number>> = {
  untrained: 8,
  novice: 4,
  competent: 2,
  proficient: 1,
  expert: 0.5,
};

export default class TemperatureReading extends BiomeReading {
  protected override halfWidthOf(
    _truth: number,
    band: CompetenceBandName,
  ): number {
    return KELVIN_ERROR[band] ?? 8;
  }

  /**
   * ⭐ The trained eye on temperature: a body genuinely tells warm from
   * cold, and `competent` is as far as a hand on a wall gets — which is
   * why the row caps `eyeCeiling` there and the thermometer sells the
   * rest.
   *
   * ⚠ No bracket, because there is no figure: the eye rung answers in
   * WORDS, and a word with a ± on it would be pretending to be a number.
   * The bracket belongs to the instrument, which is the whole reason to
   * buy one.
   */
  protected override async analyze(
    context: CommandContext,
    target: Stuff | null,
    band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    param: string,
  ): Promise<void> {
    if (!target || !MixinApi.isContainer(target)) {
      this.decline(
        context,
        Mml.compose`You aren't anywhere to judge the air.`,
        'no-scope',
      );
      return;
    }
    const value = await this.resolve(
      target as Stuff & Container,
      param === '' ? undefined : param,
    );
    const kelvin = value.rawValue();
    const coarse = CompetenceBand.atOrAbove(band, 'novice')
      ? feelOf(kelvin)
      : crudeFeelOf(kelvin);
    const lines = [coarse];
    if (CompetenceBand.atOrAbove(band, 'competent')) {
      lines.push(keepsOf(kelvin));
    }
    this.report(context, Mml.compose`${lines.join(' ')}\n`);
  }

  protected label(): string {
    return 'Temperature';
  }

  protected mmlChannel(): MeasureChannel {
    return 'thermal';
  }

  protected override tagFamily(): string {
    return 'thermal';
  }

  protected async resolve(
    scope: Stuff & Container,
    detail: string | undefined,
  ): Promise<Quantity<Unit>> {
    return BiomeApi.resolveTemperatureFor(scope, detail) as Promise<
      Quantity<Unit>
    >;
  }
}

/** What an untrained body can say about the air, and no more. */
function crudeFeelOf(kelvin: number): string {
  if (kelvin < 273) return 'It is cold in here.';
  if (kelvin > 305) return 'It is hot in here.';
  return 'It is neither hot nor cold in here.';
}

/** What somebody who has paid attention can say. */
function feelOf(kelvin: number): string {
  if (kelvin < 250) return 'Bitter — the kind of cold that takes fingers.';
  if (kelvin < 273) return 'Below freezing; water here would ice over.';
  if (kelvin < 285) return 'Raw and chilly.';
  if (kelvin < 295) return 'Comfortable.';
  if (kelvin < 305) return 'Warm, and close.';
  if (kelvin < 330) return 'Hot — the sort of heat you work in and sweat through.';
  return 'Fierce heat; you would not stay in this long.';
}

/** ⭐ What the temperature is FOR — the decision it settles. */
function keepsOf(kelvin: number): string {
  if (kelvin < 277) return 'Cold enough to keep food a long while.';
  if (kelvin < 288) return 'Cool enough to keep food a few days, and to cellar in.';
  if (kelvin < 298) return 'Food will not keep long at this.';
  if (kelvin < 320) return 'Anything perishable will be going off by tomorrow.';
  return 'Nothing keeps in this.';
}
