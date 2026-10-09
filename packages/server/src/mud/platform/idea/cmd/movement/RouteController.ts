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
import { AddressApi } from '../../../../api/address';
import { MixinApi } from '../../../../api/mixin';
import { StuffApi } from '../../../../api/stuff';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
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

/**
 * One place a player knows, as the three things naming it needs: the
 * durable handle to plan with, the short description to show, the
 * address collection it sits in, and the tokens it answered to.
 */
interface Known {
  /** The durable handle — what the planner uses. Works unloaded. */
  place: string;
  /** The banked short description — what a prompt shows. */
  name: string;
  /** The address COLLECTION, or `''`. Narrows; rarely identifies. */
  group: string;
  /** The targeting tokens, banked at perception. Picks within a group. */
  keywords: readonly string[];
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
    const standingGroup = await RouteController.standingGroup(context);
    const pool = RouteController.candidates(asked, known, standingGroup);
    if (pool.length === 0) {
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
    // ⭐⭐⭐ Several matches ASK. This is the whole difference from what
    // was here before: `.find()` picked whichever claim happened to be
    // enumerated first and nobody could tell.
    const target =
      pool.length === 1
        ? pool[0]!
        : await this.disambiguate(context, pool, asked);
    if (!target) return; // declined inside, or the prompt was cancelled
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

  /**
   * The address of the collection the actor is standing in, or `''`.
   *
   * ⚠ `''` is a real answer and a common one: **75 of 128 places carry
   * no address**, so a player standing in one has no locality to scope
   * a bare keyword to — which is exactly why `candidates` widens to
   * every map rather than refusing.
   */
  private static async standingGroup(context: CommandContext): Promise<string> {
    const here = context.location;
    if (!here) return '';
    // ⚠ Through the predicate, not a duck-type. The first draft of
    // this copied the Cartographer's `getDeclaredAddress?.()` — a
    // method that exists NOWHERE (`AddressableMixin`'s reader is
    // `getAddress()`), so it answered `undefined` every time and this
    // always fell through to the locality walk. See
    // `Cartographer.groupingAddressOf` for how long that hid.
    const declared = MixinApi.isAddressable(here as unknown as Stuff)
      ? (here as unknown as Stuff & { getAddress(): string | null }).getAddress()
      : null;
    if (declared && declared.length > 0) return declared;
    // Fall back to the covering Locality — the address tree's own
    // longest-prefix walk, which is what makes an unaddressed room
    // still belong somewhere.
    try {
      const locality = await AddressApi.resolveLocalityFor(
        here as unknown as Stuff & Container,
      );
      return locality?.getAddress() ?? '';
    } catch {
      return '';
    }
  }

  /**
   * ⭐⭐⭐ Ask which one, offering the **banked short descriptions**.
   *
   * A keyword is unique in a place and not in a realm, so this is the
   * mechanism that makes the keyword tier honest rather than lucky.
   * What it shows is `MapClaim.name` — what the room CALLED ITSELF
   * when you stood in it — plus its collection, because two kitchens
   * are told apart by which house they are in.
   *
   * ⚠ The shipped TPA board answers `{ambiguous: true}` and stops
   * there; prompting is an improvement on that pattern, not a copy of
   * it. ⚠ And a player with no interactive (an NPC driving the verb,
   * a stripped harness) gets the refusal in words rather than a hang.
   */
  private async disambiguate(
    context: CommandContext,
    pool: readonly Known[],
    asked: string,
  ): Promise<Known | null> {
    const giver = context.commandGiver;
    const interactive = MixinApi.isHasInteractive(giver)
      ? [...giver.getInteractives()][0]
      : undefined;
    // Deterministic order, so the same question lists the same way.
    const sorted = [...pool].sort(
      (a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name),
    );
    if (!interactive) {
      this.declineWith(
        context,
        `You know ${sorted.length} places called '${asked}'. ` +
          `Name the one you mean: ` +
          `${sorted.map((k) => RouteController.hint(k)).join('; ')}.`,
        'ambiguous-place',
      );
      return null;
    }
    try {
      const picked = await interactive.promptChoice(
        `Which '${asked}' did you mean?`,
        sorted.map((k) => ({
          label: RouteController.hint(k),
          response: k.place,
        })),
      );
      return sorted.find((k) => k.place === picked) ?? null;
    } catch {
      // Cancelled, timed out, or the socket went. Not a finding.
      this.declineWith(context, 'Never mind, then.', 'prompt-cancelled');
      return null;
    }
  }

  /** One candidate, as a line a player can tell from the others. */
  private static hint(k: Known): string {
    return k.group.length > 0 ? `${k.name} (${k.group})` : k.name;
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
      /*
       * ⚠⚠ Plain prose, NOT a `⚠` glyph, and that was a real finding
       * rather than taste. Of 406 `⚠` in the command tree, exactly
       * TWO are in a string a player reads — `git` and shell `write`,
       * both AUTHOR surface. The glyph is a doc convention here, and
       * `route` is a player's verb.
       *
       * ⭐ The precedent for this exact kind of caveat is right next
       * door: `map` renders a disagreement between two claims as
       * ordinary prose with a parenthetical date, because the dates
       * are what let the player judge. An assumption is the same
       * shape of thing — something the world is telling you it is not
       * sure of — so it reads the same way.
       */
      // ⭐ Nested by INDENT and with no bullet, which is `map`'s
      // shape exactly. A `—` bullet put two em-dashes on one line
      // (one structural, one punctuation) and read as a stutter;
      // reading the actual output is the only way that shows up.
      for (const a of plan.assumptions) {
        lines.push(`    ${RouteController.assumptionProse(a, known)}`);
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
    // ⚠ The pair form takes the UNAMBIGUOUS reading only. Two prompts
    // in one command is a worse experience than being asked to say
    // which pair you meant, so an ambiguous end refuses with the
    // candidates named.
    const fromPool = RouteController.candidates(pair.a, known, '');
    const toPool = RouteController.candidates(pair.b, known, '');
    if (fromPool.length > 1 || toPool.length > 1) {
      const which = fromPool.length > 1 ? fromPool : toPool;
      return this.declineWith(
        context,
        `You know more than one of those: ` +
          `${which.map((k) => RouteController.hint(k)).join('; ')}. ` +
          `Name one exactly.`,
        'ambiguous-place',
      );
    }
    const from = fromPool[0] ?? null;
    const to = toPool[0] ?? null;
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
      // ⚠ Agreement, and it took READING the output to see: *"one leg,
      // 1 of them not always passable"* was both ungrammatical and a
      // word and a digit in one breath. Wire asserted the content and
      // passed straight through it.
      const n = plan.cost.conditional;
      const risk =
        n === 0
          ? ''
          : legs === 1
            ? ', and it is not always passable'
            : n === legs
              ? ', and none of them is always passable'
              : `, ${n} of them not always passable`;
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
      return legs === 1
        ? `${ways}, and it does not say how long it takes.`
        : `${ways}; none of them says how long it takes.`;
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
    const note = (
      place: string,
      claim?: { name?: string | null; group?: string; keywords?: string[] },
    ): void => {
      if (place.length === 0) return;
      const prior = byPlace.get(place);
      const name = (claim?.name ?? '').trim();
      const next: Known = {
        place,
        name: name.length > 0 ? name : (prior?.name ?? RouteController.leaf(place)),
        group: claim?.group ?? prior?.group ?? '',
        keywords: claim?.keywords ?? prior?.keywords ?? [],
      };
      // ⚠ A later claim ENRICHES rather than replaces: an edge claim
      // names a far place with only a row path, and must not wipe the
      // name and keywords a place claim banked when you stood in it.
      byPlace.set(place, next);
    };
    for (const doc of docs) {
      for (const claim of doc.claims as MapClaim[]) {
        if (claim.kind === 'place') {
          note(claim.place, {
            name: claim.name,
            ...(claim.group !== undefined ? { group: claim.group } : {}),
            ...(claim.keywords !== undefined ? { keywords: claim.keywords } : {}),
          });
        } else if (claim.to) note(claim.to, { name: claim.toLabel });
        else if (claim.toLabel) note(claim.toLabel, {});
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
   * ⭐⭐⭐ **Resolve a destination against the claims, and nothing else.**
   *
   * ⚠⚠ This replaced a five-rung substring ladder over the place's
   * short description that ended in `.find()` — **first match wins in
   * claim-insertion order**. That is not reducing to a single
   * location; it is an arbitrary pick, and it is the ambiguity
   * antipattern the engine has a prompt for. Nothing told me, because
   * every test asserted the content of an answer and none asked
   * whether the answer was the only one.
   *
   * The model, which is the addressing subsystem's and not a new one:
   *
   *  - an **address** (`MapClaim.group`) names a **COLLECTION** of
   *    rooms — a terrace, a lot, a quarter. ⭐ It is deliberately NOT
   *    unique per room, because giving every room a unique address
   *    does not work: you get `old-road-12` and `desert-34x95`, and
   *    only half of that is legible.
   *  - a **keyword** (`MapClaim.keywords`) picks within the
   *    collection. Globally they collide hard — `yard` names 14
   *    places in the shipped realm, `floor` 12 — and **scoped to one
   *    address exactly one bucket in the whole realm collides.**
   *  - anything still ambiguous **prompts**, with the banked short
   *    descriptions, because that is the only thing that can tell two
   *    kitchens apart.
   *
   * Four forms, and the first two are the ones a player types:
   *
   * ```
   *   route to kitchen                 the standing locality, then every map
   *   route to lot-123 kitchen         a collection, then a keyword
   *   route to terminus/city/market    a collection alone → prompt
   *   route to #<stuffId>              exact, and loaded-only
   * ```
   *
   * ⚠ `#<stuffId>` is MQL's own anchor form and resolves through
   * `StuffApi.findById`, so it works **iff the room is resident** —
   * which routing is least likely to be. Rooms are lazily loaded and
   * the usual handle for reaching one is an **exit**; pathfinding
   * cannot take that deal, because the exit sequence is its OUTPUT.
   * Routing is the one consumer in the engine that must name NODES,
   * which is why the durable handle is load-bearing here and the id
   * is a convenience.
   */
  private static candidates(
    asked: string,
    known: readonly Known[],
    standingGroup: string,
  ): Known[] {
    const want = asked.trim();
    if (want.length === 0) return [];

    // `#<stuffId>` — exact, and only for a loaded room. ⚠ Still
    // checked against the claims: an id for a place you have never
    // been to must refuse, or the id form would be a hole in the
    // firewall rather than a shortcut through it.
    if (want.startsWith('#') && want.length > 1) {
      const live = StuffApi.findById(want.slice(1));
      const handle = live?.getDurableHandle?.() ?? null;
      if (!handle) return [];
      return known.filter((k) => k.place === handle);
    }

    const tokens = want.split(/\s+/).filter((t) => t.length > 0);
    const head = (tokens[0] ?? '').toLowerCase();

    // An address token carries no spaces, so a leading token that
    // matches a known collection splits the two halves cleanly.
    const addressed = known.filter((k) => RouteController.inGroup(k, head));
    if (tokens.length > 1 && addressed.length > 0) {
      const keyword = tokens.slice(1).join(' ');
      const hit = RouteController.pick(addressed, keyword);
      return hit.length > 0 ? hit : addressed;
    }
    // A collection ALONE: every room in it, for the prompt to offer.
    if (tokens.length === 1 && addressed.length > 0) return addressed;

    // ⭐ A bare keyword prefers THE LOCALITY YOU ARE STANDING IN, and
    // widens to every map you hold only if that finds nothing. The
    // common case is the room next door, and trawling the realm for
    // `kitchen` would make the common case the ambiguous one — but a
    // player who asks for somewhere they know must never be stuck
    // because they happen to be standing somewhere unaddressed.
    if (standingGroup.length > 0) {
      const near = RouteController.pick(
        known.filter((k) => RouteController.sharesLocality(k, standingGroup)),
        want,
      );
      if (near.length > 0) return near;
    }
    return RouteController.pick(known, want);
  }

  /**
   * Does this place sit in the collection `addr` names? Matched by
   * path SUFFIX, so `lot-123` reaches
   * `terminus/hinkley-hills/evergreen-terrace/lot-123` and
   * `market` reaches `terminus/city/market/bakery`.
   */
  private static inGroup(k: Known, addr: string): boolean {
    if (k.group.length === 0 || addr.length === 0) return false;
    const g = k.group.toLowerCase();
    if (g === addr) return true;
    const segs = g.split('/');
    // Any contiguous run of segments ending anywhere — a right-anchored
    // or interior path fragment, which is how a person shortens a path.
    for (let i = 0; i < segs.length; i += 1) {
      for (let j = i + 1; j <= segs.length; j += 1) {
        if (segs.slice(i, j).join('/') === addr) return true;
      }
    }
    return false;
  }

  /** Two places share a locality when one address prefixes the other. */
  private static sharesLocality(k: Known, standing: string): boolean {
    if (k.group.length === 0) return false;
    const a = k.group.toLowerCase();
    const b = standing.toLowerCase();
    return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
  }

  /**
   * Pick within a candidate pool by keyword, then by name.
   *
   * ⭐ Keyword first and EXACT, because that is what a keyword is — a
   * targeting token the place answered to. The name rungs are the
   * convenience tail, and they are last because a short description
   * is prose: substring-matching it is how `the yard` came to mean
   * whichever of fourteen yards was enumerated first.
   */
  private static pick(pool: readonly Known[], asked: string): Known[] {
    const want = asked.trim().toLowerCase();
    if (want.length === 0) return [];
    const rungs: Array<(k: Known) => boolean> = [
      (k) => k.keywords.some((kw) => kw.toLowerCase() === want),
      (k) => k.name.toLowerCase() === want,
      (k) => k.place.toLowerCase() === want,
      (k) => k.keywords.some((kw) => kw.toLowerCase().startsWith(want)),
      (k) => k.name.toLowerCase().startsWith(want),
      (k) => k.name.toLowerCase().includes(want),
    ];
    // ⚠ Every rung returns EVERY match, and the first rung that
    // matches anything wins the whole pool. One match plans; several
    // prompt. Nothing here picks.
    for (const rung of rungs) {
      const hits = pool.filter(rung);
      if (hits.length > 0) return hits;
    }
    return [];
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
