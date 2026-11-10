/**
 * JourneyController — `journey to <place> [via <lane>]`: plan a route and
 * set off (over {@link JourneyControllerBase}). Bare `journey`, the status
 * readout, is a shape of its own ({@link JourneyStatusController}).
 *
 * Thin: resolve the vehicle, ask the lane catalogue to plan the journey
 * (`LaneCatalogue.planJourney` — which place the name means, which lane,
 * the route; controller-liquidity W12), hand the route to the scheduler.
 * Nothing here moves anything — the `Journey` engagement issues the same
 * `traverse` a player's `go` does, one leg at a time.
 *
 * ⚠ Stopping is the shipped `cancel`, not a subcommand of this verb: a
 * journey is an engagement like any other, and giving it a private
 * cancellation would be a second way to do a thing the framework
 * already does.
 */

import type { CommandContext } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MqlApi } from '@saxonberg/server/mud/api/mql';
import { VEHICULAR_MIXIN, type Vehicular } from '../../../lib/Vehicular';
import { LocomotionApi } from '@saxonberg/server/mud/api/locomotion';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Engaged } from '@saxonberg/server/mud/lib/activity/Engaged';
import LaneCatalogue, { LANE_CATALOGUE_PATH, type JourneyRefusal } from '../../LaneCatalogue';
import { Journey } from '../../../lib/journey/Journey';
import { JourneyControllerBase, TOPIC, type JourneyModel } from './JourneyControllerBase';

export default class JourneyController extends JourneyControllerBase {
  async execute(model: JourneyModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isEngaged(giver)) {
      return this.fail(context, 'you cannot take a journey', 'not-engageable');
    }
    const driver = giver as Stuff & Engaged;

    // The vehicle is whatever afforded this verb — a rig beside you, a
    // barge you are aboard. `content affords content`, so the command
    // source IS the answer, with a reachable scan as the fallback for a
    // dispatch that lost it.
    const vehicle = this.vehicleFor(context);
    if (!vehicle) {
      return this.fail(context, 'there is nothing here to take a journey in', 'no-vehicle');
    }
    if (driver.getEngagementBySlot('hands')) {
      return this.fail(context, 'your hands are already busy', 'engagement-conflict');
    }
    // ⭐⭐ **The mode is the VEHICLE's, not the lane's** (D13): a wagon
    // told to go `via estuary` does not SAIL.
    const travelMode = vehicle.getTravelMode();
    if (travelMode.length === 0) {
      return this.fail(context, `the ${vehicle.getPresentation()} does not say how it travels`, 'no-travel-mode');
    }
    const mode = await LocomotionApi.loadMode(travelMode).catch(() => null);
    if (!mode) {
      return this.fail(context, `nothing here knows how to travel '${travelMode}'`, 'unknown-travel-mode');
    }
    const here = context.location ?? null;
    if (here === null) return this.fail(context, 'you are nowhere a road reaches', 'nowhere');

    const named = (model.destination ?? '').trim();
    const catalogue = await StuffApi.singleton<LaneCatalogue>(LANE_CATALOGUE_PATH);
    const plan = await catalogue.planJourney({
      here,
      named,
      bound: this.reachableNamed(named, context),
      via: model.via ?? null,
      profile: { mode: travelMode, medium: mode.getMedium(), wheeled: travelMode === 'wheeled' },
    });
    if (!plan.ok) {
      return this.fail(context, JourneyController.refusalText(plan), plan.reason === 'no-way' ? plan.facts.why : plan.reason);
    }

    const journey = new Journey({ driver, vehicle, route: plan.route, mode: travelMode, catalogue });
    const started = SchedulerApi.start(journey);
    if (!started.ok) {
      return this.fail(
        context,
        started.reason === 'engagement-conflict' ? 'your hands are already busy' : 'the journey will not start',
        started.reason,
      );
    }
    if (started.status !== 'completed-sync') context.note(started.note);

    // ⭐ What the way is CALLED. A named lane says its own name; a plan
    // across several says all of them, sorted, so the same trip reads the
    // same on every run.
    const legs = plan.route.legsFrom(0);
    MessageApi.scene(driver as unknown as Stuff)
      .topic(TOPIC)
      .toSelf(Mml.compose`You set off along ${plan.wayName} — ${String(legs)} legs to go.`)
      .toPeers(Mml.compose`${Mml.actor(driver as unknown as Stuff)} sets off along ${plan.wayName}.`)
      .send();
  }

  /** The vehicle this verb was afforded by, or a reachable one. */
  private vehicleFor(context: CommandContext): (Stuff & Vehicular) | null {
    const isVehicle = (s: Stuff): boolean => MixinApi.isActive(s, VEHICULAR_MIXIN);
    const source = context.commandSource;
    if (source && isVehicle(source)) return source as Stuff & Vehicular;
    const reachable = MqlApi.resolveMany('reachable', {
      commandGiver: context.commandGiver,
      scope: 'reachable',
    }).stuff;
    return (reachable.find((s) => isVehicle(s)) as Stuff & Vehicular) ?? null;
  }

  /**
   * The path of a reachable thing the destination's name binds, if any —
   * the binding half of *a place the player named*; the catalogue decides
   * the rest (a stop on a road from here, else a literal path).
   */
  private reachableNamed(named: string, context: CommandContext): string | null {
    if (named === '') return null;
    const hit = MqlApi.resolveMany(named, { commandGiver: context.commandGiver, scope: 'reachable' }).stuff[0];
    const path = hit?.getTemplatePath() ?? '';
    return path.length > 0 ? path : null;
  }

  /**
   * ⭐ Every reason a journey will not plan, in words a player can act
   * on. A refusal says what you MAY name; the `breakAt` case tells you to
   * buy a boat.
   */
  protected static refusalText(r: JourneyRefusal): string {
    switch (r.reason) {
      case 'nowhere':
        return 'you are nowhere a road reaches';
      case 'open-water':
        return `there is no road to ${r.facts.sea} — it lies across open water, and \`course\` from a helm is the verb that knows`;
      case 'already-there':
        return 'you are already there';
      case 'no-destination':
        return r.facts.stops.length > 0
          ? `no road from here goes to '${r.facts.named}'. From here you can journey to: ${r.facts.stops.join(', ')}.`
          : 'no road runs from here.';
      case 'no-lane':
        return `there is no '${r.facts.via}' lane running from here to there`;
      case 'not-on-lane':
        return `the ${r.facts.lane ?? 'way'} does not join those two places`;
      case 'no-way': {
        const { why, breakAt, lane } = r.facts;
        if (breakAt) {
          return `the way runs out before you get there: ${breakAt.dir} from there needs ${breakAt.needs.join(' or ')}, and this is not the vehicle for it`;
        }
        if (why === 'budget') return 'you could not work out a way that far';
        if (why === 'graph-cold') return 'nobody has the roads to hand just now';
        if ((why === 'unknown-origin' || why === 'unknown-destination') && lane) {
          return `the ${lane} does not join those two places`;
        }
        return 'no way you can take runs from here to there';
      }
      default: {
        const never: never = r;
        return never;
      }
    }
  }
}
