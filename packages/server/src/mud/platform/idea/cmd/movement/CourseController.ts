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
import { NavigationApi } from '../../../../api/navigation';
import { StuffApi } from '../../../../api/stuff';
import Ship from '../../Ship';
import { WorldClockApi } from '../../../../api/worldclock';
import ExpanseNode from '../../ExpanseNode';
import { Expanse } from '../../../../lib/expanse/Expanse';
import { AccountabilityApi } from '../../../../api/accountability';
import { SpeciesApi } from '../../../../api/species';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Positioned } from '../../../../lib/expanse/Positioned';
import type { Voyaging } from '../../../../lib/expanse/Voyaging';

interface CourseModel extends CommandModel {
  heading?: string;
  /** `--leaving-them`: sail with her own people in the water, on purpose. */
  leavingThem?: boolean;
}

/** A river's direction words (river D18). */
const RIVER_WAYS: Record<string, 'upstream' | 'downstream'> = {
  upstream: 'upstream',
  up: 'upstream',
  downstream: 'downstream',
  down: 'downstream',
};

/** The words for a river's line, in km — a pilot's, not a navigator's. */
function kmWords(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} meters above the mouth` : `${km.toFixed(1)} km above the mouth`;
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
      // ⭐ A small boat with a sail (river D20): the boat you sit in sails
      // herself on the river's water (`SmallCraft.sailCourse`).
      const boat = MixinApi.isContainable(giver) ? giver.getContainer() : null;
      if (boat !== null && MixinApi.isSmallCraft(boat)) {
        const out = await boat.sailCourse(model.heading ?? '', giver);
        return out.ok ? this.tell(context, out.line) : this.decline(context, out.line, 'cannot-sail');
      }
      return this.decline(context, 'You are not aboard anything that sails.', 'not-aboard');
    }
    // ⭐ On a river (D18): a direction, a landing, or the bar — never a bearing.
    if (craft.getLine() !== null) return this.onRiver(model, context, craft);
    const frame = await craft.liveFrame();
    const expanse = frame instanceof Expanse ? frame : null;
    if (expanse === null) {
      return this.decline(context, 'There is no open water under you to lay a course across.', 'no-expanse');
    }
    const heading = (model.heading ?? '').trim();
    if (heading === '') return this.readout(context, craft, giver);
    if (!this.mayHelm(context, craft, giver)) return;
    if (!(await this.mayLeave(model, context, craft, giver))) return;

    let bearingDeg: number;
    let node: string | null = null;
    let nodeName = '';
    const numeric = /^\d{1,3}(\.\d+)?$/.test(heading) ? Number(heading) : NaN;
    if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 360) {
      bearingDeg = numeric % 360;
    } else {
      const target = await expanse.nodeByKeyword(heading);
      const at = target?.getExpansePosition() ?? null;
      // ⭐ A landing inside the bar (harbors P5, P10): lying at a river's
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
      const river = target instanceof ExpanseNode ? target.getRiver() : null;
      if (lying !== null && target.isAt(lying) && river !== null) {
        return this.intoRiver(context, craft, river);
      }
      // ⭐ Lying off a node with a landing she is not made fast at (A3 — the
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

    const started = await craft.steer({ bearingDeg, speedKn: craft.getSpeedKn(), toward: node });
    if ('refused' in started) return this.decline(context, started.refused, 'course-refused');
    if (started.ok && started.status !== 'completed-sync') context.note(started.note);
    this.tell(
      context,
      node
        ? `You lay a course ${bearingWords(bearingDeg)} for ${nodeName} and get under way.`
        : `You lay a course ${bearingWords(bearingDeg)} and get under way.`,
    );
  }

  /** The craft the giver is aboard — their root container's craft, at sea or on a river. */
  private async craftOf(giver: Stuff): Promise<Craft | null> {
    const root = MixinApi.isContainable(giver) ? giver.getRootContainer() ?? giver : giver;
    const path = root.getTemplatePath() ?? '';
    const craft = await ExpanseApi.craftAt(path);
    if (craft && MixinApi.isVoyaging(craft)) return craft;
    const s = path ? await NavigationApi.structureAt(path) : null;
    return s && MixinApi.isPositioned(s) && MixinApi.isVoyaging(s) && s.getLine() !== null ? s : null;
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
    if (heading === '') {
      const course = craft.getCourse()?.line ?? null;
      const at = frame.landingNear(here, 60);
      const lines = [
        course
          ? `Your course: ${course.direction}${course.landing ? `, for ${(await StuffApi.singleton<Stuff>(course.landing).catch(() => null))?.getPresentation() ?? 'a landing'}` : ''}.`
          : 'You are not under way.',
        at
          ? `She lies at ${(await StuffApi.singleton<Stuff>(at).catch(() => null))?.getPresentation() ?? 'a landing'}, ${kmWords(here.km)}.`
          : `She is ${kmWords(here.km)}.`,
      ];
      return this.tell(context, lines.join('\n'));
    }
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
    if (!this.mayHelm(context, craft, context.commandGiver)) return;
    if (!(await this.mayLeave(model, context, craft, context.commandGiver))) return;
    const started = await craft.steer({ speedKn: craft.getSpeedKn(), direction, toward: landing, slow });
    if ('refused' in started) return this.decline(context, started.refused, 'river-refused');
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
   * ⭐ Only her master takes the helm (harbors P12): her charterer, or
   * whoever holds her company's `master` seat. `true` when `giver` may.
   */
  private mayHelm(context: CommandContext, craft: Craft, giver: Stuff): boolean {
    if (craft.mayBeSteeredBy(giver)) return true;
    this.decline(context, 'Only her master takes the helm — charter her, or be appointed to command her.', 'not-her-master');
    return false;
  }

  /**
   * ⭐ In alongside the landing of the node she lies at (A3): the keeper's
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
   * ⭐ Her own people in the water (river D30): `course` refuses until they
   * are aboard — or, with `--leaving-them`, sails and records who was left.
   * `true` when she may go.
   */
  private async mayLeave(model: CourseModel, context: CommandContext, craft: Craft, giver: Stuff): Promise<boolean> {
    if (!(craft instanceof Ship)) return true;
    const left = await craft.peopleInTheWater();
    if (left.length === 0) return true;
    const names = left.map((x) => x.getPresentation()).join(', ');
    if (model.leavingThem !== true) {
      this.decline(context, `You have people in the water: ${names}. Get them aboard first — or sail \`--leaving-them\`, and own it.`, 'people-in-the-water');
      return false;
    }
    const master = giver.getIdentityPath() ?? giver.getTemplatePath() ?? '';
    for (const who of left) {
      AccountabilityApi.record({
        kind: 'abandonment',
        sessionId: `abandonment:${craft.getTemplatePath()}:${Date.now()}`,
        initiator: master,
        opponent: who.getIdentityPath() ?? who.getTemplatePath() ?? '',
        consented: false,
        sentient: SpeciesApi.isSentient(who),
      });
    }
    craft.leaveThem();
    this.tell(context, `You leave ${names} in the water.`);
    return true;
  }

  /**
   * ⭐ The landing named `heading` up the river whose mouth she lies at
   * (harbors P5) — `null` when she lies at no river's mouth or it has none
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
   * over the bar only when the water over it now will float her (harbors
   * P10), and on up to `landing` when she was set for one.
   */
  private async intoRiver(context: CommandContext, craft: Craft, river: string, landing?: { path: string; name: string }): Promise<void> {
    const frame = await StuffApi.singleton<Stuff>(river).catch(() => null);
    if (frame === null || !MixinApi.isLineFrame(frame)) {
      return this.decline(context, 'There is no river there you can take her into.', 'no-river');
    }
    if (!(craft instanceof Ship)) {
      return this.decline(context, 'She cannot go up a river.', 'not-a-river-craft');
    }
    // ⭐ The tide's window (P10): her draft against the water over the bar.
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
