/**
 * ElevationReading — how high the sun or the moon stands, taken with a
 * sextant.
 *
 * ⭐⭐ **The parameter path, and the reason `subject` is greedy.**
 * `measure elevation moon` binds nothing — there is no moon object in
 * the room — so the binder hands the Reading `stuff: null, raw: 'moon'`
 * and the raw word IS the argument. That is how a channel takes a
 * parameter without the view growing a second string arg for it, and it
 * is the same path a mine face's direction travels on.
 *
 * Was the `sun`/`moon` arm of `measure altitude`. It is `elevation` now
 * because that is the word for a body's angle above the horizon, and
 * because one verb phrase answering two unrelated questions with two
 * different instruments was the thing making it unfindable.
 */

import Reading from '../../../lib/instrument/Reading';
import { CelestialApi } from '../../../api/celestial';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import type { CommandContext } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Tooled } from '../../../lib/craft/Tooled';
import type { CompetenceBandName } from '../../../lib/advancement/CompetenceBand';

/**
 * ⭐ An angle is read in DEGREES of arc, and the error is absolute —
 * a sextant read badly is out by degrees, not by a percentage of the
 * angle (a body two degrees up is not read a hundred times more
 * precisely than one sixty degrees up).
 */
const ARC_ERROR: Readonly<Record<string, number>> = {
  untrained: 12,
  novice: 6,
  competent: 2,
  proficient: 0.5,
  expert: 0.1,
};

/** What a sextant can be pointed at. The sun unless you say otherwise. */
const BODIES = ['sun', 'moon'] as const;
type Body = (typeof BODIES)[number];

export default class ElevationReading extends Reading {
  protected override halfWidthOf(
    _truth: number,
    band: CompetenceBandName,
  ): number {
    return ARC_ERROR[band] ?? 12;
  }

  protected override async measure(
    context: CommandContext,
    target: Stuff | null,
    _instrument: Stuff & Tooled,
    band: CompetenceBandName,
    param: string,
  ): Promise<void> {
    const body = this.bodyOf(param);
    if (!body) {
      this.decline(
        context,
        Mml.compose`You can sight the sun or the moon. '${param}' is neither.`,
        'unknown-body',
      );
      return;
    }
    if (!target || !MixinApi.isContainer(target)) {
      this.decline(
        context,
        Mml.compose`You aren't anywhere to take a sighting.`,
        'no-scope',
      );
      return;
    }
    // ⭐ A sighting is a READING, and it has the reader's error in it —
    // which is the whole reason a sextant is a skilled instrument. The
    // drive printed `-47.35461408415376 degrees`, which is the engine's
    // float wearing an observation's clothes: nobody reads an arc to
    // fourteen places, and the bracket is what says so.
    const actor = this.actorOf(context);
    const seed = this.seedFor(actor, target, body);
    const altitude = await this.altitudeOf(body, target);
    const azimuth = await this.azimuthOf(body, target);
    this.report(
      context,
      Mml.compose`${body} altitude: ${this.bracketed(altitude, band, seed, 'celestial')} · azimuth: ${this.bracketed(azimuth, band, seed + 1, 'celestial')}\n`,
    );
  }

  public override async truth(target: Stuff | null): Promise<number | null> {
    if (!target) return null;
    return (await this.altitudeOf('sun', target)).rawValue();
  }

  /** `''` means the sun — the thing you sight when you say nothing. */
  private bodyOf(param: string): Body | null {
    const word = param.trim().toLowerCase();
    if (word === '') return 'sun';
    return (BODIES as readonly string[]).includes(word) ? (word as Body) : null;
  }

  private async altitudeOf(body: Body, loc: Stuff) {
    return body === 'sun'
      ? CelestialApi.sunAltitude(loc)
      : CelestialApi.moonAltitude(loc);
  }

  private async azimuthOf(body: Body, loc: Stuff) {
    return body === 'sun'
      ? CelestialApi.sunAzimuth(loc)
      : CelestialApi.moonAzimuth(loc);
  }
}
