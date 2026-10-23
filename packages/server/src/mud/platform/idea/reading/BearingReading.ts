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
 * The subject must be in sight: the answer is read off the expanse's own
 * contacts from the reader's eye, so a light below your horizon cannot be
 * taken (climb, or close it).
 *
 * Competence buys INFORMATION: the same true bearing with a narrower
 * bracket — and a narrower bracket is a tighter fix. The eye can judge a
 * bearing roughly (the eye rung is allowed, its bracket wide).
 */

import { Expanse } from '../../../lib/expanse/Expanse';
import Reading from '../../../lib/instrument/Reading';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import { ExpanseApi } from '../../../api/expanse';
import { WorldClockApi } from '../../../api/worldclock';
import type { CommandContext } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Tooled } from '../../../lib/craft/Tooled';
import type { CompetenceBandName } from '../../../lib/advancement/CompetenceBand';
import type { Positioned } from '../../../lib/expanse/Positioned';
import type { Voyaging } from '../../../lib/expanse/Voyaging';
import type { Contact } from '../../../lib/expanse/Expanse';

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
    const craft = await this.craftOf(giver);
    if (craft === null || craft.getExpansePosition() === null) {
      this.decline(context, Mml.compose`There is nothing out here to take a bearing across — you are not afloat.`, 'not-afloat');
      return;
    }
    const contact = target ? await this.contactFor(craft, giver, target) : null;
    if (contact === null) {
      const what = target ? target.getPresentation() : param || 'that';
      this.decline(context, Mml.compose`You cannot see ${what} from here to take a bearing on.`, 'not-in-sight');
      return;
    }
    const half = HALF_WIDTH_DEG[band] ?? HALF_WIDTH_DEG.untrained;
    const brg = String(Math.round(contact.bearingDeg) % 360).padStart(3, '0');
    const name = contact.name.charAt(0).toUpperCase() + contact.name.slice(1);
    if (contact.fixed) {
      // A line through a known place: the reckoning is mended to within
      // the bracket's width at that range.
      const nm = Math.max(0.1, contact.rangeNm * Math.tan((half * Math.PI) / 180));
      craft.takeFix(craft.getExpansePosition()!, nm);
      this.report(
        context,
        Mml.compose`${name} bears ${brg}° ± ${half}°. Laid off from where it stands on the chart, it fixes you to within ${nm < 1 ? 'a few cables' : `${Math.round(nm)} miles`}.\n`,
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

  /** `target` as the expanse sees it from the reader's eye, or `null` out of sight. */
  private async contactFor(craft: Craft, eye: Stuff, target: Stuff): Promise<Contact | null> {
    const expanse = await craft.liveFrame();
    if (!(expanse instanceof Expanse)) return null;
    const hour = Math.floor(WorldClockApi.getNow().rawValue() / 3600);
    const contacts = await expanse.contactsFrom(craft, eye, 'visual', hour);
    return contacts.find((c) => c.craft !== null && c.craft.stuffId === target.stuffId) ?? null;
  }

  private async craftOf(who: Stuff): Promise<Craft | null> {
    const root = MixinApi.isContainable(who) ? who.getRootContainer() ?? who : who;
    const craft = await ExpanseApi.craftAt(root.getTemplatePath() ?? '');
    return craft && MixinApi.isVoyaging(craft) ? craft : null;
  }
}
