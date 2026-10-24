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
import { StuffApi } from '../../../api/stuff';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import { Quantity, type Unit } from '../../../lib/quantity';
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
    handTool: (Stuff & Tooled) | null,
    param: string,
  ): Promise<void> {
    // ⭐⭐ A kiln reads by its GLOW (ceramics D31): incandescence is a
    // colour anybody can see, and potters fired by it for millennia —
    // dull red, cherry, orange, yellow, white. The eye reads the fire,
    // not a figure; a pyrometric cone in the spy-hole reads finer.
    if (target && MixinApi.isBurner(target) && target.isLit()) {
      const held = target.getHeldTemperatureK();
      if (held >= 800) {
        // ⭐ (ceramics W6) The cones: a set stood in the spy-hole bends
        // one by one as the kiln comes to its heat — the potter reads which
        // have gone over, and what that means for the ware is the trained
        // part. The set is SPENT by the firing it reads (a bent cone does
        // not stand up again).
        const cones = handTool !== null && handTool.getCapabilities().includes('pyrometry');
        const line = cones ? `${glowOf(held)} ${conesOf(held, band)}` : glowOf(held);
        this.report(context, Mml.compose`${line}\n`);
        if (cones && handTool !== null && !handTool.isDestroyed()) {
          await StuffApi.destruct(handTool);
        }
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
    // ⭐ In the water, or naming it from the bank, the reading is the
    // WATER's (river D32): a thermometer over the side reads the river, not
    // the air over it — the number that decides how long you have in it.
    if (target && MixinApi.isWaterPlace(target)) {
      return Quantity.of(target.waterTemperatureK(), 'K') as unknown as Quantity<Unit>;
    }
    if (target && param !== '' && MixinApi.isShore(target)) {
      const pick = target.waterFor(param);
      if ('key' in pick) {
        const read = await target.settleWater(pick.key);
        const k = read?.draw?.temperatureK ?? read?.underIce?.temperatureK;
        if (typeof k === 'number') return Quantity.of(k, 'K') as unknown as Quantity<Unit>;
      }
    }
    return super.subjectValue(target, param);
  }

  /** ⭐ A shore whose water you named: the thermometer goes in the water (river D32). */
  protected override acceptsSubject(subject: Stuff, raw: string): boolean {
    if (MixinApi.isWaterPlace(subject)) return true;
    return raw !== '' && MixinApi.isShore(subject) && 'key' in subject.waterFor(raw);
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

/**
 * ⭐ The three cones of a set, and the heat each goes over at (an Orton
 * self-supporting cone at a steady rise): 08 at terracotta heat, 04 at
 * earthenware, 6 at stoneware — the three bodies clay's own transitions
 * name. A cone within {@link CONE_SOFT_K} of its point is bending.
 */
const CONES: ReadonlyArray<{ name: string; atK: number; body: string }> = [
  { name: '08', atK: 1218, body: 'terracotta' },
  { name: '04', atK: 1333, body: 'earthenware' },
  { name: '6', atK: 1495, body: 'stoneware' },
];
const CONE_SOFT_K = 15;

/**
 * The cones in the spy-hole, in the reader's words. Anybody sees how many
 * have gone over; a competent potter reads them by number; a proficient
 * one says what the ware is coming to.
 */
function conesOf(kelvin: number, band: CompetenceBandName): string {
  const state = (atK: number): 'standing' | 'bending' | 'down' =>
    kelvin >= atK + CONE_SOFT_K ? 'down' : kelvin >= atK - CONE_SOFT_K ? 'bending' : 'standing';
  const down = CONES.filter((c) => state(c.atK) === 'down').length;
  const bending = CONES.some((c) => state(c.atK) === 'bending');
  if (!CompetenceBand.atOrAbove(band, 'competent')) {
    const n = ['none of the cones has', 'one cone has', 'two cones have', 'all three cones have'][down]!;
    return `Through the spy-hole, ${n} gone over${bending ? ', and another is leaning' : ''}.`;
  }
  const parts = CONES.map((c) => `cone ${c.name} ${state(c.atK)}`);
  const said = `Through the spy-hole: ${parts.join(', ')}.`;
  if (!CompetenceBand.atOrAbove(band, 'proficient')) return said;
  const reached = [...CONES].reverse().find((c) => state(c.atK) !== 'standing');
  const coming = reached
    ? state(reached.atK) === 'down'
      ? `The ware has had ${reached.body} heat.`
      : `The ware is coming to ${reached.body} heat.`
    : 'The ware has not had the heat of a terracotta firing yet.';
  return `${said} ${coming}`;
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
