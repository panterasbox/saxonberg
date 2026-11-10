/**
 * CourseReadoutController — bare `course`: your course and where you are
 * BY RECKONING, labelled as such, with how uncertain that is; on a river,
 * her course and where she lies on its line (over {@link
 * CourseControllerBase}). It never says where you truly are.
 */

import type { CommandContext } from '../../../../api/command';
import { MixinApi } from '../../../../api/mixin';
import { StuffApi } from '../../../../api/stuff';
import { Expanse } from '../../../../lib/expanse/Expanse';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { CourseControllerBase, type Craft, type CourseModel } from './CourseControllerBase';

export default class CourseReadoutController extends CourseControllerBase {
  async execute(_model: CourseModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const craft = await this.craftOf(giver);
    if (craft === null) return this.smallBoat(context, '');
    if (craft.getLine() !== null) return this.onRiver(context, craft);
    const frame = await craft.liveFrame();
    const expanse = frame instanceof Expanse ? frame : null;
    if (expanse === null) {
      return this.decline(context, 'There is no open water under you to lay a course across.', 'no-expanse');
    }
    return this.readout(context, craft, giver);
  }

  /** ⭐ On a river (river D18): her course and where she lies on the line. */
  private async onRiver(context: CommandContext, craft: Craft): Promise<void> {
    const live = await craft.liveFrame();
    const frame = live !== null && MixinApi.isLineFrame(live) ? live : null;
    const here = craft.getLinePosition();
    if (frame === null || here === null) {
      return this.decline(context, 'There is no river under her to set a course along.', 'no-line');
    }
    const course = craft.getCourse()?.line ?? null;
    const at = frame.landingNear(here, 60);
    const lines = [
      course
        ? `Your course: ${course.direction}${course.landing ? `, for ${(await StuffApi.singleton<Stuff>(course.landing).catch(() => null))?.getPresentation() ?? 'a landing'}` : ''}.`
        : 'You are not under way.',
      at
        ? `She lies at ${(await StuffApi.singleton<Stuff>(at).catch(() => null))?.getPresentation() ?? 'a landing'}, ${CourseReadoutController.kmWords(here.km)}.`
        : `She is ${CourseReadoutController.kmWords(here.km)}.`,
    ];
    return this.tell(context, lines.join('\n'));
  }

  /** The zero-arg readout: the course and the RECKONED position, labelled. */
  private async readout(context: CommandContext, craft: Craft, giver: Stuff): Promise<void> {
    const course = craft.getCourse();
    const reckoned = craft.reckonedNow();
    const plot = craft.getPlot();
    const nm = craft.reckoningUncertaintyNm();
    const band = MixinApi.isAdvancing(giver)
      ? await giver.competenceBandFor('navigation')
      : 'untrained';
    const lines: string[] = [];
    lines.push(
      course
        ? `Your course: ${CourseReadoutController.bearingWords(course.bearingDeg)} at ${course.speedKn} knots.`
        : 'You are not under way.',
    );
    if (reckoned) {
      const bracket = plot ? plot.statedBracket(nm, band) : 'exactly';
      lines.push(`Your position, by reckoning: ${reckoned.toString()} — ${bracket}.`);
    }
    if (nm >= 1) {
      lines.push('A sight, a sounding or a landmark would tighten it.');
    }
    this.tell(context, lines.join('\n'));
  }
}
