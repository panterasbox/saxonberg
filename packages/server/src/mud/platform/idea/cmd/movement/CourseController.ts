/**
 * CourseController — `course <bearing>` and `course <node>` lay a course
 * and get under way (maritime D11); bare `course` is the readout's, a
 * shape of its own ({@link CourseReadoutController}) — over {@link
 * CourseControllerBase}.
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
 */

import type { CommandContext } from '../../../../api/command';
import { MixinApi } from '../../../../api/mixin';
import { StuffApi } from '../../../../api/stuff';
import Ship from '../../Ship';
import { WorldClockApi } from '../../../../api/worldclock';
import ExpanseNode from '../../ExpanseNode';
import { Expanse } from '../../../../lib/expanse/Expanse';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { CourseControllerBase, type Craft, type CourseModel } from './CourseControllerBase';

/** A river's direction words (river D18). */
const RIVER_WAYS: Record<string, 'upstream' | 'downstream'> = {
  upstream: 'upstream',
  up: 'upstream',
  downstream: 'downstream',
  down: 'downstream',
};

export default class CourseController extends CourseControllerBase {
  async execute(model: CourseModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const craft = await this.craftOf(giver);
    if (craft === null) return this.smallBoat(context, model.heading ?? '');
    // ⭐ On a river (D18): a direction, a landing, or the bar — never a bearing.
    if (craft.getLine() !== null) return this.onRiver(model, context, craft);
    const frame = await craft.liveFrame();
    const expanse = frame instanceof Expanse ? frame : null;
    if (expanse === null) {
      return this.decline(context, 'There is no open water under you to lay a course across.', 'no-expanse');
    }
    const heading = (model.heading ?? '').trim();
    if (!this.mayHelm(context, craft, giver)) return;

    let bearingDeg: number;
    let node: string | null = null;
    let nodeName = '';
    const numeric = /^\d{1,3}(\.\d+)?$/.test(heading) ? Number(heading) : NaN;
    if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 360) {
      bearingDeg = numeric % 360;
    } else {
      const target = await expanse.nodeByKeyword(heading);
      const at = target?.getExpansePosition() ?? null;
      // ⭐ A landing inside the bar: lying at a river's
      // mouth, a quay up the river is a course — in over the bar, then up to
      // it, the way a river ship comes alongside a landing.
      if (!target || !at) {
        const inside = await this.landingInside(craft, expanse, heading);
        if (inside !== null) return this.intoRiver(context, craft, inside.river, inside.landing);
      }
      if (!target || !at) {
        return this.decline(
          context,
          `You know of no '${heading}' on this water. Lay a course by bearing — \`course 070\`.`,
          'unknown-node',
        );
      }
      // ⭐ Already there — inside its radius (maritime browser walk,
      // 2026-10-14: `course gannet` at the rock laid 049 and sailed off).
      const lying = craft.getExpansePosition();
      // ⭐ At a river's mouth, the river's name takes her in over the bar
      // and onto its line (river D29): the next course is the river's.
      // ⚠ Only the RIVER's name: `course bar` lying at the bar is where she
      // already is, never in over it.
      const river = target instanceof ExpanseNode && target.namesRiver(heading) ? target.getRiver() : null;
      if (lying !== null && target.isAt(lying) && river !== null) {
        return this.intoRiver(context, craft, river);
      }
      // ⭐ Lying off a node with a landing she is not made fast at (the
      // island's quay): its name brings her in alongside, asked of its keeper.
      const landing = target instanceof ExpanseNode ? target.getDestination() : null;
      if (lying !== null && target.isAt(lying) && landing && craft instanceof Ship && craft.getBerth() !== landing) {
        return this.comeIn(context, craft, landing);
      }
      if (lying !== null && target.isAt(lying)) {
        return this.decline(context, `You are at ${target.getName()} already.`, 'already-there');
      }
      const from = craft.reckonedNow();
      if (from === null) return this.decline(context, 'You cannot say where you are.', 'no-position');
      bearingDeg = from.bearingTo(at);
      node = target.getTemplatePath();
      nodeName = target.getName();
    }

    // Inside a confined linear passage, only its two ends are a course.
    const here = craft.getExpansePosition();
    const at = here ? await expanse.nodeAt(here) : null;
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

    const left = await CourseController.inTheWater(craft);
    const started = await craft.steer({ bearingDeg, speedKn: craft.getSpeedKn(), toward: node, by: giver, leavingThem: model.leavingThem === true });
    if ('refused' in started) return this.decline(context, started.refused, left && model.leavingThem !== true ? 'people-in-the-water' : 'course-refused');
    if (left) this.tell(context, `You leave ${left} in the water.`);
    if (started.ok && started.status !== 'completed-sync') context.note(started.note);
    this.tell(
      context,
      node
        ? `You lay a course ${CourseController.bearingWords(bearingDeg)} for ${nodeName} and get under way.`
        : `You lay a course ${CourseController.bearingWords(bearingDeg)} and get under way.`,
    );
  }

  /**
   * ⭐ `course` on a river (river D18, D28): `upstream` / `downstream`, a
   * landing by name, or `bar` to go out to sea. The river works out the
   * passage, and refuses what it will not let her do in its own words.
   */
  private async onRiver(model: CourseModel, context: CommandContext, craft: Craft): Promise<void> {
    const live = await craft.liveFrame();
    const frame = live !== null && MixinApi.isLineFrame(live) ? live : null;
    const here = craft.getLinePosition();
    if (frame === null || here === null) {
      return this.decline(context, 'There is no river under her to set a course along.', 'no-line');
    }
    let heading = (model.heading ?? '').trim().toLowerCase();
    // ⭐ `slow` (D29): through snag water a master who has seen the snags
    // runs at a crawl, slow enough to read the water ahead.
    const slow = /\s+slow$/.test(heading);
    if (slow) heading = heading.replace(/\s+slow$/, '');
    // ⭐ Her helm before her heading: somebody
    // who is not her master is told so whatever they name — not that the
    // river has no such landing, which reads as if naming the right one
    // would have worked.
    if (!this.mayHelm(context, craft, context.commandGiver)) return;
    let direction = RIVER_WAYS[heading];
    let landing: string | null = null;
    if (direction === undefined && (heading === 'bar' || heading === 'sea' || heading === 'mouth')) {
      direction = 'downstream';
    } else if (direction === undefined) {
      const named = frame.landingNamed(heading);
      if (named === null) {
        return this.decline(context, `You know of no '${heading}' on this river. Say \`course upstream\`, \`course downstream\`, or a landing by name.`, 'unknown-landing');
      }
      if (Math.abs(named.km - here.km) < 0.05) {
        return this.decline(context, `You are at ${named.name} already.`, 'already-there');
      }
      direction = named.km > here.km ? 'upstream' : 'downstream';
      landing = named.path;
    }
    const left = await CourseController.inTheWater(craft);
    const started = await craft.steer({ speedKn: craft.getSpeedKn(), direction, toward: landing, slow, by: context.commandGiver, leavingThem: model.leavingThem === true });
    if ('refused' in started) return this.decline(context, started.refused, left && model.leavingThem !== true ? 'people-in-the-water' : 'river-refused');
    if (left) this.tell(context, `You leave ${left} in the water.`);
    if (started.ok && started.status !== 'completed-sync') context.note(started.note);
    const name = landing ? (await StuffApi.singleton<Stuff>(landing).catch(() => null))?.getPresentation() ?? 'the landing' : null;
    this.tell(
      context,
      name
        ? `You ring for ${slow ? 'slow ahead' : 'steam'} and she gets under way ${direction}, for ${name}.`
        : `You ring for ${slow ? 'slow ahead' : 'steam'} and she gets under way ${direction}.`,
    );
  }

  /**
   * ⭐ Only her master takes the helm: her charterer, or
   * whoever holds her company's `master` seat. `true` when `giver` may.
   */
  private mayHelm(context: CommandContext, craft: Craft, giver: Stuff): boolean {
    if (craft.mayBeSteeredBy(giver)) return true;
    this.decline(context, 'Only her master takes the helm — charter her, or be appointed to command her.', 'not-her-master');
    return false;
  }

  /**
   * ⭐ In alongside the landing of the node she lies at: the keeper's
   * criteria first, then her lines go ashore.
   */
  private async comeIn(context: CommandContext, craft: Ship, landing: string): Promise<void> {
    const refused = await craft.courseRefusal(landing);
    if (refused !== null) return this.decline(context, refused, 'course-refused');
    const name = (await StuffApi.singleton<Stuff>(landing).catch(() => null))?.getPresentation() ?? 'the landing';
    const words = await craft.comeAlongside(landing);
    this.tell(context, `You bring her in to ${name}. ${words}`);
  }

  /**
   * ⭐ Her own people in the water (river D30), named — for the WORDS only.
   * Whether she may sail without them, and the record when she does, are
   * the ship's (`Ship.steer` with `leavingThem`, controller-liquidity D10).
   */
  protected static async inTheWater(craft: Craft): Promise<string | null> {
    if (!(craft instanceof Ship)) return null;
    const left = await craft.peopleInTheWater();
    return left.length > 0 ? left.map((x) => x.getPresentation()).join(', ') : null;
  }

  /**
   * ⭐ The landing named `heading` up the river whose mouth she lies at
   * — `null` when she lies at no river's mouth or it has none
   * by that name.
   */
  private async landingInside(craft: Craft, expanse: Expanse, heading: string): Promise<{ river: string; landing: { path: string; name: string } } | null> {
    const lying = craft.getExpansePosition();
    const node = lying !== null ? await expanse.nodeAt(lying) : null;
    const river = node instanceof ExpanseNode ? node.getRiver() : null;
    if (river === null) return null;
    const frame = await StuffApi.singleton<Stuff>(river).catch(() => null);
    if (frame === null || !MixinApi.isLineFrame(frame)) return null;
    const named = frame.landingNamed(heading);
    return named === null ? null : { river, landing: { path: named.path, name: named.name } };
  }

  /**
   * At a river's mouth: off the chart and onto the river's line (D29) —
   * over the bar only when the water over it now will float her,
   * and on up to `landing` when she was set for one.
   */
  private async intoRiver(context: CommandContext, craft: Craft, river: string, landing?: { path: string; name: string }): Promise<void> {
    const frame = await StuffApi.singleton<Stuff>(river).catch(() => null);
    if (frame === null || !MixinApi.isLineFrame(frame)) {
      return this.decline(context, 'There is no river there you can take her into.', 'no-river');
    }
    if (!(craft instanceof Ship)) {
      return this.decline(context, 'She cannot go up a river.', 'not-a-river-craft');
    }
    // ⭐ The tide's window: her draft against the water over the bar.
    const nowS = WorldClockApi.getNow().rawValue();
    const bar = await craft.barRefusal(frame, nowS);
    if (bar !== null) return this.decline(context, bar, 'bar-too-shallow');
    if (landing) {
      // Asked before she moves: a quay that will not have her refuses here.
      const refused = await craft.courseRefusal(landing.path);
      if (refused !== null) return this.decline(context, refused, 'course-refused');
    }
    // The line is km from the mouth: she comes in at nought, mid-river.
    await craft.enterRiver(river, frame.courseKey(), 0, 0);
    await craft.anchorHere();
    if (!landing) {
      this.tell(context, `You take her in over the bar, and she is in the river's mouth: ${frame.getPresentation()}. The next course is the river's — \`course upstream\`.`);
      return;
    }
    const started = await craft.steer({ speedKn: craft.getSpeedKn(), direction: 'upstream', toward: landing.path });
    if ('refused' in started) {
      return this.decline(context, `You take her in over the bar. ${started.refused}`, 'river-refused');
    }
    if (started.ok && started.status !== 'completed-sync') context.note(started.note);
    const name = (await StuffApi.singleton<Stuff>(landing.path).catch(() => null))?.getPresentation() ?? landing.name;
    this.tell(context, `You take her in over the bar and up the river, for ${name}.`);
  }
}
