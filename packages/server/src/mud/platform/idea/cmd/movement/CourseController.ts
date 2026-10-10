/**
 * CourseController — `course` reads the plot; `course <bearing>` and
 * `course <node>` lay one and get under way (maritime D11).
 *
 * ⭐ Setting a course, not choosing a destination: the craft steers a
 * bearing at its own speed and the water does the rest. A course for a
 * node is a bearing worked from where you THINK you are, so a stale
 * reckoning misses — which is why the readout teaches the three ways to
 * mend it (a sight, a sounding, a landmark) instead of a `fix` verb.
 *
 * The node resolves against the expanse's own node list by its own name,
 * never through MQL (a node is not in the room). Inside a confined linear
 * passage (a channel over a bar) only its two ends are a course.
 *
 * Afforded by the instrument of steering — the `Helm` — so a building,
 * which has none, is never offered it.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';
import { ExpanseApi } from '../../../../api/expanse';
import { AppApi } from '../../../../api/app';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Positioned } from '../../../../lib/expanse/Positioned';
import type { Voyaging } from '../../../../lib/expanse/Voyaging';

interface CourseModel extends CommandModel {
  heading?: string;
}

type Craft = Stuff & Positioned & Voyaging;

/** `070` — a bearing as a navigator writes it. */
function bearingWords(deg: number): string {
  return String(Math.round(((deg % 360) + 360) % 360)).padStart(3, '0');
}

export default class CourseController extends CommandController<CourseModel> {
  async execute(model: CourseModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const craft = await this.craftOf(giver);
    if (craft === null) {
      return this.decline(context, 'You are not aboard anything that sails.', 'not-aboard');
    }
    const expanse = await craft.liveExpanse();
    if (expanse === null) {
      return this.decline(context, 'There is no open water under you to lay a course across.', 'no-expanse');
    }
    const heading = (model.heading ?? '').trim();
    if (heading === '') return this.readout(context, craft, giver);

    let bearingDeg: number;
    let node: string | null = null;
    let nodeName = '';
    const numeric = /^\d{1,3}(\.\d+)?$/.test(heading) ? Number(heading) : NaN;
    if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 360) {
      bearingDeg = numeric % 360;
    } else {
      const target = await expanse.nodeByKeyword(heading);
      const at = target?.getExpansePosition() ?? null;
      if (!target || !at) {
        return this.decline(
          context,
          `You know of no '${heading}' on this water. Lay a course by bearing — \`course 070\`.`,
          'unknown-node',
        );
      }
      const from = craft.reckonedNow();
      if (from === null) return this.decline(context, 'You cannot say where you are.', 'no-position');
      bearingDeg = from.bearingTo(at);
      node = target.getTemplatePath();
      nodeName = target.getName();
    }

    // Inside a confined linear passage, only its two ends are a course.
    const here = craft.getExpansePosition();
    const arrivalNm = Number(AppApi.setting('expanse.arrivalNm')) || 1;
    const at = here ? await expanse.nodeNear(here, arrivalNm) : null;
    if (at?.isLinear() && at.getAlong()) {
      const band = await expanse.band(at.getAlong()!);
      const ends = band?.isConfined() ? band.getEndpoints() : null;
      if (ends && (node === null || !ends.includes(node))) {
        const names = await Promise.all(ends.map(async (p) => (await expanse.node(p))?.getName() ?? p));
        return this.decline(
          context,
          `${at.getName()} only runs two ways: to ${names[0]} or to ${names[1]}.`,
          'confined',
        );
      }
    }

    const started = await craft.steer({ bearingDeg, speedKn: craft.getSpeedKn(), node });
    if (started.ok && started.status !== 'completed-sync') context.note(started.note);
    this.tell(
      context,
      node
        ? `You lay a course ${bearingWords(bearingDeg)} for ${nodeName} and get under way.`
        : `You lay a course ${bearingWords(bearingDeg)} and get under way.`,
    );
  }

  /** The craft the giver is aboard — their root container's craft. */
  private async craftOf(giver: Stuff): Promise<Craft | null> {
    const root = MixinApi.isContainable(giver) ? giver.getRootContainer() ?? giver : giver;
    const craft = await ExpanseApi.craftAt(root.getTemplatePath() ?? '');
    return craft && MixinApi.isVoyaging(craft) ? craft : null;
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
        ? `Your course: ${bearingWords(course.bearingDeg)} at ${course.speedKn} knots.`
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

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver).topic('shell.result').toSelf(Mml.fromMarkup(text)).send();
  }

  private decline(context: CommandContext, text: string, reason: string): void {
    this.tell(context, text);
    context.note({ kind: 'controller-rejected', reason, detail: text });
  }
}
