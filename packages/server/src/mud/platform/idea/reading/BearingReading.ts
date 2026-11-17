/**
 * BearingReading — `measure bearing <it>`: the direction of a thing in
 * view, by a hand-bearing compass (maritime R8).
 *
 * ⭐⭐ **The fix is an ACT, not a sighting.** Nothing corrects the
 * reckoning by being seen; a navigator who takes a bearing on a light
 * whose place is known lays a line through it, and THAT is the fix. So a
 * bearing on a FIXED subject (a landmark — a light on a rock) mends the
 * reckoning to within `range × tan(bracket)`; a bearing on a sail tells
 * you where she lies and mends nothing, because she moves.
 *
 * The subject must be in sight: the answer is read off the ONE horizon
 * (`PerceptionApi.horizonFor` — geography D11), afloat or ashore, so a
 * light below your horizon cannot be taken (climb, or close it), and a
 * tower in your own streets is too near to take one across. Ashore there
 * is no reckoning to mend; a bearing on a mark is a line you stand on.
 *
 * Competence buys INFORMATION: the same true bearing with a narrower
 * bracket — and a narrower bracket is a tighter fix. The eye can judge a
 * bearing roughly (the eye rung is allowed, its bracket wide).
 */

import Reading from '../../../lib/instrument/Reading';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import { ExpanseApi } from '../../../api/expanse';
import { PerceptionApi } from '../../../api/perception';
import type { CommandContext } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type Place from '../../../lib/stuff/Place';
import type { Tooled } from '../../../lib/craft/Tool';
import type { CompetenceBandName } from '../../../lib/advancement/CompetenceBand';
import type { Positioned } from '../../../lib/expanse/Positioned';
import type { Voyaging } from '../../../lib/expanse/Voyaging';

/** Degrees either side a reader at each band can honestly claim. */
const HALF_WIDTH_DEG: Record<CompetenceBandName, number> = {
  untrained: 10,
  novice: 5,
  competent: 2,
  proficient: 1,
  expert: 0.5,
};

type Craft = Stuff & Positioned & Voyaging;

export default class BearingReading extends Reading {
  /** By compass. */
  protected override async measure(
    context: CommandContext,
    target: Stuff | null,
    _instrument: Stuff & Tooled,
    band: CompetenceBandName,
    param: string,
  ): Promise<void> {
    await this.take(context, target, band, param);
  }

  /** By eye — the same act, its bracket capped by the row's `eyeCeiling`. */
  protected override async analyze(
    context: CommandContext,
    target: Stuff | null,
    band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    param: string,
  ): Promise<void> {
    await this.take(context, target, band, param);
  }

  private async take(
    context: CommandContext,
    target: Stuff | null,
    band: CompetenceBandName,
    param: string,
  ): Promise<void> {
    const giver = this.actorOf(context);
    // ⭐ Geography D11: the subject is read off the ONE horizon — at sea or
    // ashore — standing up what the place names first (D9), so a light the
    // horizon would name is there to be taken.
    const place = this.placeOf(giver);
    if (place !== null && place.isPlace()) {
      await place.standUpHorizon().catch((err) => console.warn('measure bearing: the horizon did not stand up:', err));
    }
    const sighting = target
      ? PerceptionApi.horizonFor(giver).things.find((t) => t.stuff.stuffId === target.stuffId) ?? null
      : null;
    const what = target ? target.getPresentation() : param || 'that';
    if (sighting === null || (sighting.bearingDeg === null && sighting.closeBy !== true)) {
      this.decline(context, Mml.compose`You cannot see ${what} from here to take a bearing on.`, 'not-in-sight');
      return;
    }
    if (sighting.closeBy === true || sighting.bearingDeg === null || sighting.rangeNm === null) {
      this.decline(context, Mml.compose`${what} is too near to take a bearing across — you are in its own streets.`, 'too-close');
      return;
    }
    const half = HALF_WIDTH_DEG[band] ?? HALF_WIDTH_DEG.untrained;
    const brg = String(Math.round(sighting.bearingDeg) % 360).padStart(3, '0');
    const raw = String(target!.getPresentation());
    const name = raw.charAt(0).toUpperCase() + raw.slice(1);
    const craft = await this.craftOf(giver);
    const afloat = craft !== null && craft.getExpansePosition() !== null;
    if (sighting.fixed === true && afloat) {
      // A line through a known place: the reckoning is mended to within
      // the bracket's width at that range.
      const nm = Math.max(0.1, sighting.rangeNm * Math.tan((half * Math.PI) / 180));
      craft!.takeFix(craft!.getExpansePosition()!, nm);
      this.report(
        context,
        Mml.compose`${name} bears ${brg}° ± ${half}°. Laid off from where it stands on the chart, it fixes you to within ${nm < 1 ? 'a few cables' : `${Math.round(nm)} miles`}.\n`,
      );
    } else if (sighting.fixed === true) {
      this.report(
        context,
        Mml.compose`${name} bears ${brg}° ± ${half}°. Laid off from where it stands on the chart, it is a line you stand on; a second bearing on another mark crosses it, and where the lines meet, you are.\n`,
      );
    } else {
      this.report(
        context,
        Mml.compose`${name} bears ${brg}° ± ${half}°. She is under way; a bearing on her tells you where she lies, not where you are.\n`,
      );
    }
    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({ discipline: 'navigation', difficulty: 'standard', outcome: 'success' });
    }
  }

  private async craftOf(who: Stuff): Promise<Craft | null> {
    const root = MixinApi.isContainable(who) ? who.getRootContainer() ?? who : who;
    // The place is asked (a keyed room's craft is its warren's ship).
    const craft = root.isPlace()
      ? await (root as unknown as Place).craftHere()
      : await ExpanseApi.craftAt(root.getIdentityPath() ?? '');
    return craft && MixinApi.isVoyaging(craft) ? craft : null;
  }
}
