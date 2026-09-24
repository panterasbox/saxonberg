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

/** What a sextant can be pointed at. The sun unless you say otherwise. */
const BODIES = ['sun', 'moon'] as const;
type Body = (typeof BODIES)[number];

export default class ElevationReading extends Reading {
  protected override async measure(
    context: CommandContext,
    target: Stuff | null,
    _instrument: Stuff & Tooled,
    _band: CompetenceBandName,
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
    const altitude = await this.altitudeOf(body, target);
    const azimuth = await this.azimuthOf(body, target);
    this.report(
      context,
      Mml.compose`${body} altitude: ${altitude.formatMml(undefined, undefined, { channel: 'celestial' })} · azimuth: ${azimuth.formatMml(undefined, undefined, { channel: 'celestial' })}\n`,
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
