/**
 * HeadReading — `measure head` / `analyze head`, ⭐⭐ **the gauge the
 * whole decline arc is read off, and the reason nothing has to announce
 * anything.**
 *
 * A well declines along a curve. The design's requirement is that the
 * player *sees the pressure fall over repeated visits and chooses when
 * to stop paying the crew — with nothing having told them to.* This is
 * the only instrument in the game that makes that decision possible, and
 * it is deliberately the only one: there is no notice, no warning, no
 * *the well is played out* message anywhere in this build. You read the
 * gauge, you do the arithmetic, and you decide.
 *
 * ⚠⚠ **It is NOT the shipped `pressure` channel, and that is not a
 * naming accident.** `pressure` is **atmospheric**: `scope: [here]`,
 * `BiomeApi.resolvePressureFor(scope: Stuff & Container)`, a barometer
 * reading the weather. What a wellhead has is **head** — the reservoir's
 * own drive, measured at the collar — and the two are different
 * quantities about different things. A channel token is unique, so
 * taking `pressure` would have collided; wanting to take it would have
 * been the tell that the design was confused.
 *
 * ## ⭐ The eye rung answers in WORDS, and has no bracket to be wrong about
 *
 * *It is flowing hard · it has slackened · it is not flowing.* That is a
 * real read with a real rung above it: a driller who stands at a
 * wellhead can tell those three apart without an instrument, and cannot
 * tell 2.4 atm from 1.9. The gauge buys the figure, and the figure is
 * what lets somebody do the arithmetic a week ahead rather than a day.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { GroundChannel, PHYSICS, READING_TOPIC } from '../../lib/GroundChannel';
import Wellhead from '../../thing/Wellhead';

/** Below this, in atmospheres, a well is no longer driving its own fluid up. */
const SLACK_ATM = 0.25;
/** Above this it is flowing hard enough to fill a cask as fast as you can swap them. */
const STRONG_ATM = 1.5;

/** ⚠ See the `measure` rung: the figure goes out in Pa, which the shipped barometer channel already renders. */
const PASCALS_PER_ATM = 101_325;

export default class HeadReading extends GroundChannel {
  /** The gauge: the figure, bracketed by the reader's band. */
  protected override async measure(
    context: CommandContext,
    subject: Stuff | null,
    _instrument: Stuff & Tooled,
    band: CompetenceBandName,
    param: string,
  ): Promise<void> {
    const giver = this.actorOf(context);
    const hole = subject instanceof Wellhead ? subject : null;
    if (hole === null) {
      // ⚠ The channel's OWN words, not a binder refusal: `subjectRequires`
      // would refuse at the binder, where the message teaches nothing.
      this.decline(
        context,
        Mml.compose`Head is a thing a wellhead has. There is nothing to put a gauge on${param ? ` called ${param}` : ''}.`,
        'not-a-wellhead',
      );
      return;
    }
    await hole.reconcileRig();
    const atm = await hole.headAtm();
    // ⭐ A ratio quantity, so the ladder's own bracket is right — no
    // override. The observation carries the band's error and the figure
    // is rounded to the decade its own half-width justifies.
    //
    // ⚠ In PASCALS, with the shipped `atmosphere` measure channel doing
    // the rendering. The `Unit` vocabulary is the kernel's and closed,
    // and `'atm'` is not in it — adding a unit so that one pack's
    // channel could print its favourite scale would be a kernel
    // vocabulary edit for a presentation preference. `Pa` is already
    // there, the barometer already renders it as an atmosphere, and the
    // conversion is a constant.
    const shown = this.bracketed(
      Quantity.of(atm * PASCALS_PER_ATM, 'Pa'),
      band,
      this.seedFor(giver, hole, 'head'),
      'atmosphere',
    );
    this.report(
      context,
      atm <= 0
        ? Mml.compose`The gauge does not move. There is nothing pushing anything up this hole — what comes out of it, comes out on a rope.`
        : Mml.compose`${shown} on the gauge, ${words(atm)}`,
    );
    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: PHYSICS,
        difficulty: 'standard',
        outcome: 'success',
      });
    }
  }

  /**
   * The eye rung — three words, and ⚠ **no digit anywhere in it.** A
   * driller can tell flowing from slackened from dead by standing there;
   * he cannot tell 2.4 atm from 1.9, and a sentence that implied he
   * could would be the gauge this game does not have.
   */
  protected override async analyze(
    context: CommandContext,
    subject: Stuff | null,
    _band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    _param: string,
  ): Promise<void> {
    const hole = subject instanceof Wellhead ? subject : null;
    if (hole === null) {
      this.decline(
        context,
        Mml.compose`Head is a thing a wellhead has.`,
        'not-a-wellhead',
      );
      return;
    }
    await hole.reconcileRig();
    const atm = await hole.headAtm();
    MessageApi.scene(this.actorOf(context))
      .topic(READING_TOPIC)
      .toSelf(Mml.compose`${words(atm)}`)
      .send();
  }
}

/** The three words, and never a number. */
function words(atm: number): string {
  if (atm <= 0) {
    return 'It is not flowing at all, and whatever is down there has to be lifted.';
  }
  if (atm < SLACK_ATM) {
    return 'It has all but stopped — a wet sigh at the collar and nothing more.';
  }
  if (atm < STRONG_ATM) {
    return 'It has slackened. It is still coming, and it is not coming the way it was.';
  }
  return 'It is flowing hard — you can hear it in the pipe from twenty feet.';
}
