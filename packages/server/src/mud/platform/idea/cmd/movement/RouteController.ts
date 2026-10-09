/**
 * RouteController — the `route` verb: work out a way somewhere from
 * what you know.
 *
 * ⭐⭐⭐ **It plans over the actor's OWN CLAIMS and cannot do otherwise.**
 * The single read is `NavigationApi.routeOnMap`, whose only source is
 * `/home/<key>/map/…`; the four modules it plans through are forbidden
 * from importing `location_graph` (`lint:graph-walks`' core check, no
 * ceiling). So a destination that appears in no claim is *you do not
 * know the way there*, and there is no branch anywhere that could
 * improve on that by consulting the index. The map verb's property,
 * applied to planning.
 *
 * ⚠⚠ **Every place is named by what it CALLS ITSELF**, resolved from
 * the claims, with the path leaf as a last resort — never a template
 * path, and **not a bare leaf** either. This verb consumes durable
 * handles and row paths end to end, which is precisely the shape that
 * once printed `/world/terminus/...` at a player in the identity
 * build. A path or a raw leaf in this output is a drive failure, not a
 * cosmetic one.
 *
 * ⭐⭐ **The cost is quoted in the currency the traveller will pay**
 * (D4a). On foot: legs, and what is in the way. Under a conveyance:
 * minutes. `logistics.md` keeps ordinary movement **instantaneous and
 * free** on purpose, so quoting a walker *"about forty minutes"* for a
 * journey the world will charge nothing for teaches a figure that does
 * not exist. ⚠ A pedestrian must never see a minutes figure.
 *
 * ⚠ It plans and STOPS: nothing is started, nothing is spent, nobody
 * moves. No card either — the inspection card is laid out by
 * `StuffKind`, a plan is not a Stuff, and minting a `CardId` for one is
 * `map-slate`'s business.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { NavigationApi } from '../../../../api/navigation';
import { AppApi } from '../../../../api/app';
import { AppSettingKeys } from '../../../../lib/config/AppSettings';
import { WorldClockApi } from '../../../../api/worldclock';
import type { MapClaim, MapDocument } from '../../../../lib/location/MapClaim';
import type { RoutePlan, RouteOutcome } from '../../../../lib/location/RoutePlan';

const TOPIC = 'sense.survey';

/** The code-side floor, equal to the shipped setting. */
const BUDGET_FLOOR = 400;

interface RouteModel extends CommandModel {
  destination?: string;
  by?: string;
}

/**
 * ⭐ The word table from what a player says to a locomotion mode.
 *
 * Small and in the controller on purpose: the mode ROSTER is
 * `LocomotionApi`'s to validate, and this is only the vocabulary a
 * person types. `by wagon` and `by cart` are the same request.
 */
const BY_WORDS: ReadonlyArray<[readonly string[], string, string]> = [
  [['foot', 'walking', 'walk'], 'walk', 'ground'],
  [['wagon', 'cart', 'wheel', 'wheels', 'rig', 'coach', 'dray'], 'wheeled', 'ground'],
  [['boat', 'barge', 'water', 'sail', 'ship'], 'sailed', 'water'],
];

/** One place a player knows, with the name they would use for it. */
interface Known {
  place: string;
  name: string;
}

export default class RouteController extends CommandController<RouteModel> {
  async execute(model: RouteModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const viewerKey = giver.getIdentityPath() ?? '';
    if (viewerKey.length === 0) {
      return this.declineWith(context, 'You have no map.', 'no-identity');
    }

    const asked = (model.destination ?? '').trim();
    if (asked.length === 0) {
      // ⚠ In WORDS. A required arg with no default fails closed and
      // silent at the binder — the player would type `route` and
      // nothing at all would happen.
      return this.declineWith(
        context,
        'Route to where? Try `route to <place>`, or `route between ' +
          '<a> and <b>` for what a pair costs.',
        'no-destination',
      );
    }

    // ⛔ The ONE read, and it resolves under `/home/<key>` only.
    const docs = await NavigationApi.readMap(viewerKey, '');
    const known = RouteController.placesIn(docs);
    if (known.length === 0) {
      return this.declineWith(
        context,
        'You have no map yet. Go somewhere and look around.',
        'no-maps',
      );
    }

    const here = context.location?.getDurableHandle?.() ?? '';
    const profile = RouteController.profileFor(model.by);
    if (!profile) {
      return this.declineWith(
        context,
        `You do not know how to travel '${(model.by ?? '').trim()}'.`,
        'unknown-mode',
      );
    }
    // ⭐⭐⭐ **A map cannot answer `by wagon`, and saying so is the
    // honest answer.** A claim records the CHANNEL you learned a way
    // on — walked, seen, searched, published — and not what you were
    // driving at the time. So your own map knows a way exists and does
    // not know whether a cart fits through it, and the two plausible
    // alternatives are both worse: treating "no media recorded" as
    // "a footpath" quietly refuses every conveyance with a
    // mode-break sentence about needing `ground` (which is what the
    // first version of this verb did, and it reads as nonsense), and
    // inventing an assumption would have the engine telling you
    // something your map never recorded.
    //
    // ⭐ So it refuses, in words, and NAMES THE VERB THAT KNOWS:
    // `journey` plans over the world index with the vehicle's own
    // declared mode, which is legitimate precisely because you are
    // standing next to the vehicle and it can tell you what it is.
    //
    // → Deferred, designed: a `walked` claim could record what you
    //   were driving (a fifth channel, or a flag), and then a map
    //   WOULD know. That is a claim-shape change and belongs with the
    //   map renderer's build (`map-slate`), not here.
    if (profile.spec.mode !== 'walk') {
      return this.declineWith(
        context,
        'Your map is a record of where you have been on foot — it does ' +
          'not say what a cart or a boat could get through. Stand by the ' +
          'vehicle and `journey` instead; it knows the roads.',
        'map-cannot-say',
      );
    }

    const budget = RouteController.budget();

    // ⭐ `route between <a> and <b>` — the typed reader for the cost
    // matrix. It answers what the pair costs and offers NO way to ask
    // for an order, because deciding the order is the activity.
    const pair = RouteController.parseBetween(asked);
    if (pair) {
      return this.renderPair(context, viewerKey, known, pair, profile, budget);
    }

    if (here.length === 0) {
      return this.declineWith(
        context,
        'You could not say where you are standing.',
        'nowhere',
      );
    }
    const target = RouteController.resolve(asked, known);
    if (!target) {
      // ⭐⭐ The honest refusal, and the SAME one for a place that does
      // not exist and a place you have simply never been. The realm may
      // well have a bank; this player has not found it, and improving
      // on that would mean the engine lending knowledge nobody decided
      // they should have.
      return this.declineWith(
        context,
        `You do not know the way to '${asked}'.`,
        'unknown-place',
      );
    }
    if (target.place === here) {
      return this.declineWith(context, 'You are already there.', 'already-there');
    }

    const outcome = await NavigationApi.routeOnMap(
      viewerKey,
      '',
      here,
      target.place,
      profile.spec,
      budget,
    );
    this.renderOutcome(context, outcome, known, target, profile, here);
  }

  /* ─────────────────────────── rendering ─────────────────────────── */

  private renderOutcome(
    context: CommandContext,
    outcome: RouteOutcome,
    known: readonly Known[],
    target: Known,
    profile: Profile,
    here: string,
  ): void {
    if (!outcome.ok) {
      return this.declineWith(
        context,
        RouteController.refusalProse(outcome, target, known),
        outcome.reason,
      );
    }

    const lines: string[] = [];
    const several = outcome.plans.length > 1;
    if (several) {
      // ⚠ Both, and the engine does not pick. Where the axes disagree
      // — short over a ford against long and sure — choosing is the
      // interesting part and handing it over would take it away.
      lines.push(
        `There is more than one way to ${target.name}, and they are not ` +
          `comparable. Both:`,
      );
    } else {
      lines.push(`The way to ${target.name}:`);
    }

    outcome.plans.forEach((plan, i) => {
      if (several) lines.push('', `  ${i + 1}.`);
      for (const leg of plan.legs) {
        const from = RouteController.nameOf(leg.from, known);
        lines.push(`  ${leg.dir} from ${from}`);
      }
      lines.push(`  ${RouteController.costLine(plan, profile)}`);
      for (const a of plan.assumptions) {
        lines.push(`  ⚠ ${RouteController.assumptionProse(a, known)}`);
      }
    });

    void here;
    this.say(context, lines.join('\n'));
  }

  private async renderPair(
    context: CommandContext,
    viewerKey: string,
    known: readonly Known[],
    pair: { a: string; b: string },
    profile: Profile,
    budget: number,
  ): Promise<void> {
    const from = RouteController.resolve(pair.a, known);
    const to = RouteController.resolve(pair.b, known);
    if (!from || !to) {
      const missing = !from ? pair.a : pair.b;
      return this.declineWith(
        context,
        `You do not know the way to '${missing}'.`,
        'unknown-place',
      );
    }
    if (from.place === to.place) {
      return this.declineWith(
        context,
        'Those are the same place.',
        'same-place',
      );
    }
    const outcome = await NavigationApi.routeOnMap(
      viewerKey,
      '',
      from.place,
      to.place,
      profile.spec,
      budget,
    );
    if (!outcome.ok) {
      return this.declineWith(
        context,
        RouteController.refusalProse(outcome, to, known),
        outcome.reason,
      );
    }
    const plan = outcome.plans[0]!;
    this.say(
      context,
      `${from.name} to ${to.name}: ` +
        `${RouteController.costLine(plan, profile)}`,
    );
  }

  /**
   * ⭐⭐ The cost, in the currency this traveller will pay.
   *
   * A walker gets LEGS and what is in the way; a conveyance gets
   * MINUTES. See the file header for why that is pedagogy and not
   * presentation.
   */
  private static costLine(plan: RoutePlan, profile: Profile): string {
    const legs = plan.cost.legs;
    const ways = legs === 1 ? 'one leg' : `${legs} legs`;
    if (profile.spec.mode === 'walk') {
      const risk =
        plan.cost.conditional > 0
          ? `, ${plan.cost.conditional} of them not always passable`
          : '';
      return `${ways}${risk}.`;
    }
    // ⚠ Only a conveyance is quoted a duration, and only for the legs
    // that declare one — the rest are named as unmeasured rather than
    // quietly counted as free.
    //
    // ⚠⚠ Unreachable from `route` TODAY (a map cannot answer for a
    // conveyance — see `execute`), and kept because the cost object
    // is the plan's and this is the rule for reading it. The branch
    // exists so `journey`'s readout and a later map that records what
    // you were driving both have one place to take it from, rather
    // than two renderers inventing the same policy twice.
    const measured = legs - plan.cost.unmeasured;
    if (measured === 0) {
      return `${ways}; none of them says how long it takes.`;
    }
    const floor = plan.cost.unmeasured > 0 ? ' at least' : '';
    return `${ways},${floor} about ${plan.cost.minutes} minutes.`;
  }

  private static assumptionProse(
    a: RoutePlan['assumptions'][number],
    known: readonly Known[],
  ): string {
    if (a.kind === 'stale' && a.claim) {
      const age = RouteController.ageOf(a.claim.lastSeen);
      return `${RouteController.renamePlaces(a.text, known)} ${age}`;
    }
    return RouteController.renamePlaces(a.text, known);
  }

  /**
   * ⚠⚠ The engine's assumption text carries place IDENTITIES, which
   * are handles or row paths. Swapping them for the player's own names
   * here is the last line of defence against a path reaching a reader.
   */
  private static renamePlaces(text: string, known: readonly Known[]): string {
    let out = text;
    for (const k of known) {
      if (k.place !== k.name) out = out.split(k.place).join(k.name);
    }
    return out;
  }

  /** *you walked it 40 days ago* — the age, in words. */
  private static ageOf(lastSeen: number): string {
    let now: number;
    try {
      now = Math.floor(WorldClockApi.getNow().value);
    } catch {
      return '';
    }
    const days = Math.floor((now - lastSeen) / 86_400);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    return `${days} days ago`;
  }

  private static refusalProse(
    outcome: Extract<RouteOutcome, { ok: false }>,
    target: Known,
    known: readonly Known[],
  ): string {
    if (outcome.breakAt) {
      const at = RouteController.nameOf(outcome.breakAt.node, known);
      return (
        `You know a way, but not one you could take: ${outcome.breakAt.dir} ` +
        `from ${at} needs ${outcome.breakAt.needs.join(' or ')}.`
      );
    }
    switch (outcome.reason) {
      case 'budget':
        // ⭐ Distinguishable from "no way", in words, because it IS a
        // different answer: the search spent its allowance and stopped
        // looking. Saying "there is no way" here would be a lie the
        // player could not detect.
        return `You could not work out a way that far.`;
      case 'unknown-destination':
      case 'unknown-origin':
        return `You do not know the way to ${target.name}.`;
      default:
        return `You know of no way from here to ${target.name}.`;
    }
  }

  /* ─────────────────────────── the claims ─────────────────────────── */

  /**
   * Every place in the actor's own claims, with the name they would
   * use for it.
   *
   * ⭐ `name` is what the place CALLED ITSELF when it was perceived —
   * a claim records it. The path leaf is the fallback and is
   * deliberately tidied into words: a reader should never meet
   * `pithead-yard`.
   */
  private static placesIn(docs: readonly MapDocument[]): Known[] {
    const byPlace = new Map<string, Known>();
    const note = (place: string, name?: string | null): void => {
      if (place.length === 0) return;
      const prior = byPlace.get(place);
      const better = (name ?? '').trim();
      if (prior && (better.length === 0 || prior.name !== RouteController.leaf(place))) {
        return;
      }
      byPlace.set(place, {
        place,
        name: better.length > 0 ? better : RouteController.leaf(place),
      });
    };
    for (const doc of docs) {
      for (const claim of doc.claims as MapClaim[]) {
        if (claim.kind === 'place') note(claim.place, claim.name);
        else if (claim.to) note(claim.to, claim.toLabel ?? null);
        else if (claim.toLabel) note(claim.toLabel, null);
      }
    }
    return [...byPlace.values()];
  }

  /**
   * ⚠⚠ The path leaf, in WORDS — never the raw segment. `pithead-yard`
   * is a path and `the pithead yard` is a place; printing the first at
   * a player is the defect this verb's header is about.
   */
  private static leaf(place: string): string {
    const raw = place.split('/').filter((s) => s.length > 0).pop() ?? place;
    return raw.split('-').join(' ');
  }

  private static nameOf(place: string, known: readonly Known[]): string {
    return known.find((k) => k.place === place)?.name ?? RouteController.leaf(place);
  }

  /**
   * Resolve a typed name against the claims, and NOTHING else.
   *
   * Exact name, then a prefix, then a substring, then the path leaf —
   * so `route to bakery` finds *the market bakery* and `route to
   * /world/...` still works for somebody who typed a path.
   */
  private static resolve(asked: string, known: readonly Known[]): Known | null {
    const want = asked.trim().toLowerCase();
    if (want.length === 0) return null;
    const by = (f: (k: Known) => boolean): Known | undefined => known.find(f);
    return (
      by((k) => k.name.toLowerCase() === want) ??
      by((k) => k.place.toLowerCase() === want) ??
      by((k) => k.name.toLowerCase().startsWith(want)) ??
      by((k) => k.name.toLowerCase().includes(want)) ??
      by((k) => RouteController.leaf(k.place).toLowerCase().includes(want)) ??
      null
    );
  }

  /** `between <a> and <b>` → the pair, or null for the ordinary form. */
  private static parseBetween(
    asked: string,
  ): { a: string; b: string } | null {
    // The greedy arg swallows `between` as part of the destination when
    // the parser binds it as a preposition, so both spellings land
    // here: `between a and b` and `a and b`.
    const body = asked.replace(/^between\s+/i, '');
    if (body === asked && !/^.+\s+and\s+.+$/i.test(asked)) return null;
    const m = /^(.+?)\s+and\s+(.+)$/i.exec(body);
    if (!m) return null;
    return { a: m[1]!.trim(), b: m[2]!.trim() };
  }

  /* ─────────────────────────── the traveller ─────────────────────── */

  private static profileFor(by: string | undefined): Profile | null {
    const want = (by ?? '').trim().toLowerCase();
    if (want.length === 0) {
      return { spec: { mode: 'walk', medium: 'ground' } };
    }
    for (const [words, mode, medium] of BY_WORDS) {
      if (words.includes(want)) return { spec: { mode, medium } };
    }
    return null;
  }

  /**
   * ⚠ Guarded: `AppApi.setting` THROWS on an unwarmed cache, and a
   * verb that refused because the settings document had not loaded is
   * a boot-order bug surfacing as a dead verb. The floor equals the
   * shipped value, so a *wrong* authored number still reads through.
   */
  private static budget(): number {
    let raw: string;
    try {
      raw = AppApi.setting(AppSettingKeys.navigationAttendedSearchBudget);
    } catch {
      return BUDGET_FLOOR;
    }
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : BUDGET_FLOOR;
  }

  /* ─────────────────────────── output ─────────────────────────── */

  private say(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.text(`\n${text}\n`))
      .send();
  }

  private declineWith(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    this.say(context, detail);
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}

interface Profile {
  spec: { mode: string; medium: string | null; wheeled?: boolean };
}
