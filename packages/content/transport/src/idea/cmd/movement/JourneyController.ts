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
import { VEHICULAR_MIXIN, type Vehicular } from '../../../lib/Vehicular';
import { LocomotionApi } from '@saxonberg/server/mud/api/locomotion';
import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import type { RoutePlan } from '@saxonberg/server/mud/api/navigation';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { Route } from '../../../lib/journey/Route';
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
    const there = await this.resolvePlace(raw, context, catalogue, here);
    if (there.length === 0 || there === here) {
      // ⭐ A refusal that says what you MAY name. The roads from here
      // have a knowable, short stop list, so withholding it is just
      // making the player guess.
      const stops = await this.stopsFrom(catalogue, here);
      return this.fail(
        context,
        there === here
          ? 'you are already there'
          : stops.length > 0
            ? `no road from here goes to '${raw}'. From here you can ` +
              `journey to: ${stops.join(', ')}.`
            : `no road runs from here.`,
        there === here ? 'already-there' : 'no-destination',
      );
    }

    // ⭐⭐ **The mode is the VEHICLE's, not the lane's** (D13). It used
    // to come from `lane.mode`, which meant `journey to <stop> via
    // estuary` with a wagon hitched made the wagon SAIL — and it died
    // at the first leg, because a road exit does not admit water. A
    // fact about a wagon was being read off the road it was told to
    // take.
    const travelMode = vehicle.getTravelMode();
    if (travelMode.length === 0) {
      return this.fail(
        context,
        `the ${vehicle.getPresentation()} does not say how it travels`,
        'no-travel-mode',
      );
    }
    const mode = await LocomotionApi.loadMode(travelMode).catch(() => null);
    if (!mode) {
      return this.fail(
        context,
        `nothing here knows how to travel '${travelMode}'`,
        'unknown-travel-mode',
      );
    }

    const lane = model.via
      ? await this.laneFor(catalogue, here, model.via)
      : null;
    if (model.via && !lane) {
      return this.fail(
        context,
        `there is no '${model.via}' lane running from here to there`,
        'no-lane',
      );
    }

    const budget = this.searchBudget();
    const profile = {
      mode: travelMode,
      medium: mode.getMedium(),
      wheeled: travelMode === 'wheeled',
    };

    // ⭐ Three ways to plan, and which one applies is a fact about the
    // lane rather than a preference:
    //
    //  - **an AUTHORED lane** (`edges:`) IS its own graph. Rails are
    //    not doors, and the ferrow tramway's two ends are joined by a
    //    mine passage that authors no `media` at all — so planning it
    //    over the index would refuse the only way the lane has.
    //  - **a named INDUCED lane** restricts the search to its own node
    //    set: the lane as a restriction the traveller chose.
    //  - **no lane named** plans over the whole mode graph, and the
    //    lanes the plan crosses become its LABEL.
    const outcome =
      lane && lane.authored
        ? NavigationApi.routeOverEdges(
            this.edgesOf(lane),
            here,
            there,
            budget,
          )
        : await NavigationApi.routeBetween(here, there, profile, {}, budget);

    if (!outcome.ok) {
      return this.fail(context, this.refusalProse(outcome, lane), outcome.reason);
    }

    // ⚠ A named induced lane is a RESTRICTION: the plan must stay on
    // it. Asserted after the search rather than inside it, because the
    // honest refusal is *the lane does not join those two places* and
    // not *there is no way* — the way exists, it is simply not that
    // lane's.
    const plans =
      lane && !lane.authored
        ? outcome.plans.filter((p: RoutePlan) =>
            p.nodes.every((n: string) => lane.adjacency.has(n)),
          )
        : outcome.plans;
    if (plans.length === 0) {
      return this.fail(
        context,
        `the ${lane?.name ?? 'way'} does not join those two places`,
        'route-not-found',
      );
    }

    // ⭐ The first plan, and the renderer below says which axes agreed.
    // The engine does not choose between genuinely incomparable plans
    // anywhere a person is reading; `route` is where a person sees
    // them all, and `journey` is a commitment to go.
    const plan = plans[0]!;
    const label = lane
      ? lane.key
      : (await catalogue.laneLabelFor(plan.nodes)).join(', ');
    const laneStops = lane ? lane.stops : [];
    // ⚠ The stop NARROWING moved here from the retired
    // `LaneCatalogue.planRoute`: the lane's own stop set, cut down to
    // the nodes this trip passes.
    const stops = plan.nodes.filter(
      (n: string) => laneStops.length === 0 || laneStops.includes(n),
    );
    const route = Route.computed(
      label.length > 0 ? label : 'the way',
      plan.nodes,
      stops,
    );
    const crossed = lane
      ? [lane.name]
      : await catalogue.laneNamesFor(plan.nodes);
    const wayName = crossed.length > 0 ? crossed.join(', then ') : 'the way';

    const journey = new Journey({
      driver,
      vehicle,
      route,
      mode: travelMode,
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

    // ⭐ What the way is CALLED. A named lane says its own name; a
    // plan across several says all of them, sorted, so the same trip
    // reads the same on every run.
    const legs = route.legsFrom(0);
    MessageApi.scene(driver as unknown as Stuff)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You set off along ${wayName} — ${String(legs)} legs to go.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(driver as unknown as Stuff)} sets off along ${wayName}.`,
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
  private vehicleFor(context: CommandContext): (Stuff & Vehicular) | null {
    const source = context.commandSource;
    if (source && isVehicle(source)) return source as Stuff & Vehicular;
    const reachable = MqlApi.resolveMany('reachable', {
      commandGiver: context.commandGiver,
      scope: 'reachable',
    }).stuff;
    return (reachable.find((s) => isVehicle(s)) as Stuff & Vehicular) ?? null;
  }

  /**
   * A place the player named, as a durable path.
   *
   * ⚠⚠ This was the `job post` rule copied a THIRD time — MQL-reachable,
   * else a literal template path — and a journey's destination is
   * remote by definition, so a path was the only working form and both
   * of this verb's own help examples were untypeable. Same defect as
   * `ship` had, from the same copied comment.
   *
   * ⭐⭐ But it must NOT use `ship`'s answer. `ship` names a consignee
   * PLACE, and a Locality is right for that; a journey's destination is
   * a NODE ON A LANE — a room the road actually passes through. Resolve
   * "Rejection" to a Locality here and `planRoute` gets a path that is
   * on no lane and answers "no route". Same English word, different
   * unit: the `consign`/`ship` distinction one level down.
   *
   * ⭐ So the scope is exactly right and needs no index: **the stops on
   * the roads that run from where you stand**. `journey to crossroads`
   * and `journey to the crossroads` both work; nothing else is
   * offered, because nothing else is reachable by road from here.
   */
  private async resolvePlace(
    raw: string,
    context: CommandContext,
    catalogue: LaneCatalogue,
    here: string,
  ): Promise<string> {
    const hit = MqlApi.resolveMany(raw, {
      commandGiver: context.commandGiver,
      scope: 'reachable',
    }).stuff[0];
    const path = hit?.getTemplatePath() ?? '';
    if (path.length > 0) return path;

    const want = normalizePlace(raw);
    if (want.length > 0) {
      for (const lane of await catalogue.lanesAt(here)) {
        const match = lane.nodes.find((n) => normalizePlace(leafOf(n)) === want);
        if (match) return match;
      }
    }
    return raw.startsWith('/') ? raw : '';
  }

  /** Every stop the roads from here can reach — what `journey` offers. */
  private async stopsFrom(
    catalogue: LaneCatalogue,
    here: string,
  ): Promise<string[]> {
    const out = new Set<string>();
    for (const lane of await catalogue.lanesAt(here)) {
      for (const n of lane.nodes) if (n !== here) out.add(leafOf(n));
    }
    return [...out].sort();
  }

  /**
   * The lane named by `via`, when it runs from here.
   *
   * ⭐⭐ **A lane is no longer a search scope**, which is what let the
   * `via`-less case stop being *"the first lane in compile order that
   * happens to contain both ends"*. A lane of mode M is M's induced
   * subgraph from its seeds, so *"across more than one lane of the
   * same mode"* is structurally *"over M's whole graph"* — and the
   * plan's lanes become its LABEL instead.
   *
   * ⚠ Still deliberately no auto-replan: blocked means blocked, and
   * auto-routing around a closure would hide the geography this whole
   * build exists to make real.
   */
  private async laneFor(
    catalogue: LaneCatalogue,
    here: string,
    via: string,
  ): Promise<CompiledLane | null> {
    const named = await catalogue.laneOf(via.trim());
    return named && named.nodes.includes(here) ? named : null;
  }

  /** An authored lane's declared edges, as a graph the router can plan. */
  private edgesOf(
    lane: CompiledLane,
  ): Array<{ from: string; to: string }> {
    const out: Array<{ from: string; to: string }> = [];
    for (const [from, tos] of lane.adjacency) {
      for (const to of tos) out.push({ from, to });
    }
    return out;
  }

  /**
   * The caller-declared search budget — an operator dial, not content.
   *
   * ⚠ Guarded, because `AppApi.setting` THROWS on an unwarmed cache
   * and a journey that would not plan because the settings document
   * had not loaded yet is a boot-order bug surfacing as a mysteriously
   * dead verb. The floor equals the shipped value, so a *wrong*
   * authored number still reads through — this can mask an absent
   * setting, never a misconfigured one. (`LaneCatalogue.dial`'s
   * reasoning, applied here.)
   */
  private searchBudget(): number {
    let raw: string;
    try {
      raw = AppApi.setting('navigation.attendedSearchBudget');
    } catch {
      return 400;
    }
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 400;
  }

  /**
   * Why there is no way, in words a player can act on.
   *
   * ⭐ The `breakAt` case is the one that earns its place: *there is no
   * way to the island* and *the way stops at the quay; north needs
   * water* are different sentences, and only one of them tells you to
   * buy a boat.
   */
  private refusalProse(
    outcome: { reason: string; breakAt?: { node: string; dir: string; needs: readonly string[] } },
    lane: CompiledLane | null,
  ): string {
    if (outcome.breakAt) {
      const { dir, needs } = outcome.breakAt;
      return (
        `the way runs out before you get there: ${dir} from there needs ` +
        `${needs.join(' or ')}, and this is not the vehicle for it`
      );
    }
    switch (outcome.reason) {
      case 'budget':
        return 'you could not work out a way that far';
      case 'graph-cold':
        return 'nobody has the roads to hand just now';
      case 'unknown-origin':
      case 'unknown-destination':
        return lane
          ? `the ${lane.name} does not join those two places`
          : 'no way you can take runs from here to there';
      default:
        return 'no way you can take runs from here to there';
    }
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
/**
 * ⭐ A vehicle is a thing that SAYS it is one.
 *
 * This used to re-derive the category — `isHaulable ‖ (isDrivable ∧
 * isMobile)` — which is a guard re-narrowing the host set, and the tell
 * for a mixin trying to exist. A fourth kind of vehicle had to be
 * remembered here, in a boolean, in a file nobody would think to open.
 */
function isVehicle(s: Stuff): boolean {
  return MixinApi.isActive(s, VEHICULAR_MIXIN);
}

/** The last path segment, for prose. */
function leafOf(path: string): string {
  const leaf = path.split('/').filter(Boolean).pop() ?? path;
  return leaf.replace(/-/g, ' ');
}

/**
 * A place name reduced to something two spellings of it agree on:
 * lowercase, no leading article, spaces and hyphens the same thing.
 * `"the Last Water"`, `"last-water"` and `"last water"` are one name.
 */
function normalizePlace(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/[\s-]+/g, ' ')
    .trim();
}
