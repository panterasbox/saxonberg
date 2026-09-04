/**
 * JourneyController — the `journey` verb.
 *
 *   - `journey to <place> [via <lane>]` — plan a route and set off;
 *   - bare `journey` — the status readout.
 *
 * Thin: resolve the vehicle and the lane, build a `Route`, hand it to
 * the scheduler. Nothing here moves anything — the `Journey` engagement
 * issues the same `traverse` a player's `go` does, one leg at a time.
 *
 * ⚠ Stopping is the shipped `cancel`, not a subcommand of this verb: a
 * journey is an engagement like any other, and giving it a private
 * cancellation would be a second way to do a thing the framework
 * already does.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MqlApi } from '@saxonberg/server/mud/api/mql';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Engaged } from '@saxonberg/server/mud/lib/activity/Engaged';
import LaneCatalogue, {
  LANE_CATALOGUE_PATH,
  type CompiledLane,
} from '../../LaneCatalogue';
import { Journey, JOURNEY_TYPE } from '../../../lib/journey/Journey';

const TOPIC = 'act.move';

interface JourneyModel extends CommandModel {
  /** `journey to <place>` — a place name, or a durable path. */
  destination?: string;
  /** `via <lane>` — a lane key. */
  via?: string;
}

export default class JourneyController extends CommandController<JourneyModel> {
  async execute(model: JourneyModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isEngaged(giver)) {
      return this.fail(context, 'you cannot take a journey', 'not-engageable');
    }
    const driver = giver as Stuff & Engaged;

    const raw = (model.destination ?? '').trim();
    if (raw.length === 0) return this.report(driver, context);

    // The vehicle is whatever afforded this verb — a rig beside you, a
    // barge you are aboard. `content affords content`, so the command
    // source IS the answer, with a reachable scan as the fallback for a
    // dispatch that lost it.
    const vehicle = this.vehicleFor(context);
    if (!vehicle) {
      return this.fail(
        context,
        'there is nothing here to take a journey in',
        'no-vehicle',
      );
    }

    if (driver.getEngagementBySlot('hands')) {
      return this.fail(
        context,
        'your hands are already busy',
        'engagement-conflict',
      );
    }

    const catalogue = await StuffApi.singleton<LaneCatalogue>(
      LANE_CATALOGUE_PATH,
    );
    const here = context.location?.getTemplatePath() ?? '';
    if (here.length === 0) {
      return this.fail(context, 'you are nowhere a road reaches', 'nowhere');
    }
    const there = this.resolvePlace(raw, context);
    if (there.length === 0 || there === here) {
      return this.fail(
        context,
        there === here
          ? 'you are already there'
          : `nothing here answers to '${raw}'`,
        there === here ? 'already-there' : 'no-destination',
      );
    }

    const lane = await this.laneFor(catalogue, here, there, model.via);
    if (!lane) {
      return this.fail(
        context,
        model.via
          ? `there is no '${model.via}' lane running from here to there`
          : 'no way you can take runs from here to there',
        'no-lane',
      );
    }
    const route = await catalogue.planRoute(here, there, lane.key);
    if (!route || route.legsFrom(0) === 0) {
      return this.fail(
        context,
        `the ${lane.name} does not join those two places`,
        'route-not-found',
      );
    }

    const journey = new Journey({
      driver,
      vehicle,
      route,
      mode: lane.mode,
      catalogue,
    });
    const started = SchedulerApi.start(journey);
    if (!started.ok) {
      return this.fail(
        context,
        started.reason === 'engagement-conflict'
          ? 'your hands are already busy'
          : 'the journey will not start',
        started.reason,
      );
    }
    if (started.status !== 'completed-sync') context.note(started.note);

    const legs = route.legsFrom(0);
    MessageApi.scene(driver as unknown as Stuff)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You set off along ${lane.name} — ${String(legs)} legs to go.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(driver as unknown as Stuff)} sets off along ${lane.name}.`,
      )
      .send();
  }

  /* ─────────────────────────── the readout ─────────────────────────── */

  /**
   * Bare `journey`. **Position is free** — the vehicle is really in the
   * room, so anybody can see where it is. The ETA is computed from the
   * plan that remains, and is honestly an estimate: competence tightens
   * the window a teamster is shown, and never shortens the trip.
   */
  private async report(
    driver: Stuff & Engaged,
    context: CommandContext,
  ): Promise<void> {
    const live = driver.getEngagementBySlot('hands');
    if (!live || live.type !== JOURNEY_TYPE) {
      return this.fail(context, 'you are not on a journey', 'no-journey');
    }
    const journey = live as Journey;
    const legs = journey.legsRemaining();
    if (legs === 0) {
      this.tell(driver, 'You are at the end of the road.');
      return;
    }
    const minutes = await journey.estimateRemainingGameMinutes();
    const scale = WorldClockApi.getScale();
    const realMinutes = scale > 0 ? minutes / scale : minutes;
    this.tell(
      driver,
      `You are at ${leafOf(journey.currentNode())}, ${legs} ` +
        `${legs === 1 ? 'leg' : 'legs'} from the end — roughly ` +
        `${Math.max(1, Math.round(minutes))} minutes of road left ` +
        `(about ${Math.max(1, Math.round(realMinutes))} by the clock on the wall).`,
    );
  }

  /* ─────────────────────────── resolution ─────────────────────────── */

  /** The vehicle this verb was afforded by, or a reachable one. */
  private vehicleFor(context: CommandContext): Stuff | null {
    const source = context.commandSource;
    if (source && isVehicle(source)) return source;
    const reachable = MqlApi.resolveMany('reachable', {
      commandGiver: context.commandGiver,
      scope: 'reachable',
    }).stuff;
    return reachable.find((s) => isVehicle(s)) ?? null;
  }

  /**
   * A place the player named, as a durable path: a reachable thing
   * resolves by name, anything else is taken as a path verbatim (the
   * `job post` destination rule, reused).
   */
  private resolvePlace(raw: string, context: CommandContext): string {
    const hit = MqlApi.resolveMany(raw, {
      commandGiver: context.commandGiver,
      scope: 'reachable',
    }).stuff[0];
    const path = hit?.getTemplatePath() ?? '';
    if (path.length > 0) return path;
    return raw.startsWith('/') ? raw : '';
  }

  /**
   * The lane to take: the one named by `--via`, else the first lane both
   * ends are on.
   *
   * ⚠ Deliberately no auto-replan across lanes and no cleverness in the
   * choice: blocked means blocked, and auto-routing would hide the
   * geography this whole build exists to make real.
   */
  private async laneFor(
    catalogue: LaneCatalogue,
    here: string,
    there: string,
    via: string | undefined,
  ): Promise<CompiledLane | null> {
    if (via) {
      const named = await catalogue.laneOf(via.trim());
      return named && named.nodes.includes(here) ? named : null;
    }
    const candidates = await catalogue.lanesAt(here);
    return candidates.find((l) => l.nodes.includes(there)) ?? null;
  }

  /* ─────────────────────────── prose ─────────────────────────── */

  private tell(who: Stuff & Engaged, text: string): void {
    MessageApi.scene(who as unknown as Stuff)
      .topic(TOPIC)
      .toSelf(Mml.text(`\n${text}\n`))
      .send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.text(`\n${detail}\n`))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}

/** A thing you can take a journey in: it affords this verb. */
function isVehicle(s: Stuff): boolean {
  return (
    MixinApi.isHaulable(s) ||
    (MixinApi.isDrivable(s) && MixinApi.isMobile(s))
  );
}

/** The last path segment, for prose. */
function leafOf(path: string): string {
  const leaf = path.split('/').filter(Boolean).pop() ?? path;
  return leaf.replace(/-/g, ' ');
}
