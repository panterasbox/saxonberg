/**
 * LatitudeReading — the noon sight: `measure latitude` with a sextant.
 *
 * ⭐ Latitude is cheap and longitude is dear. Bringing the sun down to the
 * horizon tells you how far NORTH you are and nothing about how far
 * along — so the sight corrects the reckoning's latitude only
 * (`Voyaging.takeLatitude`), and the east-west error stays where it was.
 * Longitude needs a clock, which is another build.
 *
 * ⭐ Ashore too (geography D11): the latitude a place's climate reads —
 * the one resolver, which takes a Locality's point on the chart when the
 * zone states none — under an open sky, with nothing to mend.
 *
 * ⭐ The weather denial is free and spoken in the sky's own terms: under
 * anything but a clear sky there is no sun to bring down, and the refusal
 * says what the sky is doing. So does a sun below the horizon.
 *
 * Competence buys INFORMATION: a practised hand and a novice get the SAME
 * centre with a different bracket — never a refusal, never a different
 * answer. The centre is the true latitude; the bracket is what the reader
 * can honestly claim, and the figure is printed only to the places the
 * bracket justifies.
 */

import Reading from '../../../lib/instrument/Reading';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import { ExpanseApi } from '../../../api/expanse';
import { WeatherApi } from '../../../api/weather';
import { CelestialApi } from '../../../api/celestial';
import { WorldClockApi } from '../../../api/worldclock';
import { BiomeApi } from '../../../api/biome';
import { ZoneApi } from '../../../api/zone';
import type { CommandContext } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type Place from '../../../lib/stuff/Place';
import type { Tooled } from '../../../lib/craft/Tool';
import type { CompetenceBandName } from '../../../lib/advancement/CompetenceBand';
import type { Positioned } from '../../../lib/expanse/Positioned';
import type { Voyaging } from '../../../lib/expanse/Voyaging';

/** Degrees either side a reader at each band can honestly claim. */
const HALF_WIDTH_DEG: Record<CompetenceBandName, number> = {
  untrained: 1,
  novice: 0.5,
  competent: 0.2,
  proficient: 0.1,
  expert: 0.05,
};

export default class LatitudeReading extends Reading {
  protected override async measure(
    context: CommandContext,
    _target: Stuff | null,
    _instrument: Stuff & Tooled,
    band: CompetenceBandName,
    _param: string,
  ): Promise<void> {
    const giver = this.actorOf(context);
    const craft = await this.craftOf(giver);
    const place = this.placeOf(giver);
    // ⭐ Afloat, the craft's own latitude; ashore (geography D11), the
    // latitude the place's climate reads — the one resolver, so the sextant,
    // the sun and the weather cannot disagree. Ashore the sky must be open.
    const atSea = craft?.getExpansePosition() ?? null;
    let lat: number | null = atSea?.latDeg ?? null;
    if (lat === null && place !== null) {
      if (!(BiomeApi.exposureOf(place)?.skyVisible() ?? false)) {
        this.decline(context, Mml.compose`You cannot see the sky from here to take a sight.`, 'no-horizon');
        return;
      }
      lat = (await ZoneApi.climateSiteFor(place)).latitudeDeg;
    }
    if (lat === null) {
      this.decline(
        context,
        Mml.compose`You have no horizon to bring the sun down to.`,
        'no-horizon',
      );
      return;
    }
    if (place) {
      const sky = await WeatherApi.skyReadFor(place);
      if (sky.currentType !== 'clear') {
        this.decline(
          context,
          Mml.compose`The sky is ${sky.currentType.replace(/-/g, ' ')} — there is no sun to bring down to the horizon.`,
          'sky-denies',
        );
        return;
      }
      const profile = await CelestialApi.profileFor(place);
      if (!CelestialApi.isDay(profile, lat, WorldClockApi.getNow().rawValue())) {
        this.decline(
          context,
          Mml.compose`The sun is below the horizon; there is nothing to take a sight of.`,
          'sun-down',
        );
        return;
      }
    }
    const half = HALF_WIDTH_DEG[band] ?? HALF_WIDTH_DEG.untrained;
    const places = half >= 1 ? 0 : half >= 0.1 ? 1 : 2;
    const shown = `${Math.abs(lat).toFixed(places)}° ${lat >= 0 ? 'N' : 'S'} ± ${half}°`;
    // Afloat the sight mends the reckoning's latitude; ashore there is no
    // reckoning to mend.
    if (craft !== null && atSea !== null) craft.takeLatitude(lat, half * 60);
    this.report(
      context,
      Mml.compose`Latitude ${shown}. It tells you how far north you are, and nothing about how far along.\n`,
    );
    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({ discipline: 'navigation', difficulty: 'standard', outcome: 'success' });
    }
  }

  public override async truth(target: Stuff | null): Promise<number | null> {
    if (!target) return null;
    const craft = await this.craftOf(target);
    const atSea = craft?.getExpansePosition()?.latDeg ?? null;
    if (atSea !== null) return atSea;
    const place = this.placeOf(target);
    return place !== null ? (await ZoneApi.climateSiteFor(place)).latitudeDeg : null;
  }

  private async craftOf(who: Stuff): Promise<(Stuff & Positioned & Voyaging) | null> {
    const root = MixinApi.isContainable(who) ? who.getRootContainer() ?? who : who;
    // The place is asked (a keyed room's craft is its warren's ship).
    const craft = root.isPlace()
      ? await (root as unknown as Place).craftHere()
      : await ExpanseApi.craftAt(root.getIdentityPath() ?? '');
    return craft && MixinApi.isVoyaging(craft) ? craft : null;
  }
}
