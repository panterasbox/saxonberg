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
    // ⭐⭐ A kiln reads by its GLOW (ceramics D31): incandescence is a
    // colour anybody can see, and potters fired by it for millennia —
    // dull red, cherry, orange, yellow, white. The eye reads the fire,
    // not a figure; a pyrometric cone in the spy-hole reads finer.
    if (target && MixinApi.isBurner(target) && target.isLit()) {
      const held = target.getHeldTemperatureK();
      if (held >= 800) {
        this.report(context, Mml.compose`${glowOf(held)}\n`);
        return;
      }
    }
    const value = await this.subjectValue(target, param);
    if (!value) {
      this.decline(
        context,
        Mml.compose`You aren't anywhere to judge the air.`,
        'no-scope',
      );
      return;
    }
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

  /**
   * ⭐ A THING has a temperature too (dairy, found by the drive): a
   * thermometer dipped in a vat reads the milk, not the room. Until this
   * the channel read only places, and `measure temperature vat` SILENTLY
   * read the creamery's air — the row declared `scope: [here]`, so a named
   * subject fell back to the place. A Thermal subject reads its own
   * temperature; a place reads the biome chain, as before.
   */
  protected override async subjectValue(
    target: Stuff | null,
    param: string,
  ): Promise<Quantity<Unit> | null> {
    if (target && MixinApi.isThermal(target)) {
      return target.getTemperature() as unknown as Quantity<Unit>;
    }
    return super.subjectValue(target, param);
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

/**
 * ⭐ The colour of a fire's heat — Draper's point (~800 K) onward. The
 * words a potter and a smith share; no instrument needed.
 */
function glowOf(kelvin: number): string {
  if (kelvin < 950) return 'Inside, it glows a dull red you can barely see by day.';
  if (kelvin < 1150) return 'It glows cherry red.';
  if (kelvin < 1300) return 'It glows a bright orange.';
  if (kelvin < 1500) return 'It glows yellow, too bright to look into for long.';
  return 'It is white-hot inside — you cannot look into it at all.';
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
