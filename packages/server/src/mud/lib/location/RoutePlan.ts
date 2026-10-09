/**
 * RoutePlan — a way somewhere, and what believing in it assumes.
 *
 * ⭐⭐⭐ **A plan is a hypothesis, not a promise.** It is computed from
 * a *knowledge source* — the world index, or one player's own map
 * claims — and both can be wrong, in different ways and for different
 * reasons. The index is a projection of authored rows and therefore
 * cannot know whether the ford is flooded; a map is a set of claims
 * that are never corrected, so it can be forty days stale and still
 * route you confidently over a bridge that burned. Neither of those is
 * a defect to be fixed. **The defect would be a plan that did not say
 * so**, which is why `assumptions` is a first-class field beside the
 * legs and not an afterthought.
 *
 * ⛔ Nothing in an assumption derived from a MAP may come from the
 * index. A map plan's caveats are built from the planner's own claims
 * — the channel they saw it on and when — because the alternative is
 * the engine quietly lending a player knowledge nobody decided they
 * should have.
 *
 * ⚠ This module is part of the routing **core** and its import list is
 * gated (`lint:graph-walks`' second check): it may not reach
 * `PlaceNode`, the registry, `DocumentApi`, `StuffApi` or anything
 * under `api/`. The types below are therefore plain data all the way
 * down — which is also what makes a client-side plan over a cached map
 * a later wiring job rather than a rewrite.
 */

import type { TravelProfileSpec } from './TravelProfile';

/** The four channels a map claim can arrive on. Mirrors `MapChannel`. */
export type RouteClaimChannel = 'walked' | 'seen' | 'searched' | 'published';

/** One step of a plan: leave `from` by `dir` and arrive at `to`. */
export interface RouteLeg {
  from: string;
  to: string;
  dir: string;
  /**
   * Game minutes a conveyance would spend, or `null` when the way
   * declares none. ⚠ `null` is *unmeasured*, not *free* — see
   * {@link RouteCost}.
   */
  minutes: number | null;
  /** Is this the kind of way that closes? (A ford, a tidal causeway.) */
  conditional: boolean;
}

/**
 * What a plan assumes. ⭐ `text` is the sentence a verb prints, written
 * here rather than in the renderer, because the thing that knows WHY
 * an assumption exists is the thing that made it.
 */
export interface RouteAssumption {
  kind: 'conditional' | 'stale' | 'unmeasured' | 'disputed';
  /** Index into `legs`, or `-1` for an assumption about the whole plan. */
  leg: number;
  text: string;
  /**
   * Map source only: the planner's OWN evidence for the leg. ⛔ Never
   * populated from the index.
   */
  claim?: { channel: RouteClaimChannel; lastSeen: number };
}

/**
 * Cost on every axis the search measured.
 *
 * ⭐⭐ **All of them, always — the RENDERER picks.** A walker is told
 * legs and what is in the way; a conveyance is told minutes. That is
 * not a presentation preference, it is the pedagogy: `logistics.md`
 * keeps ordinary movement **instantaneous and free** on purpose, so a
 * plan that answers *"about forty minutes"* and is then walked for
 * nothing has taught a figure the world declines to collect. ⚠ Quoting
 * a pedestrian a duration is a drive failure, not a cosmetic one.
 */
export interface RouteCost {
  /** Summed `minutes` over legs that declare one. */
  minutes: number;
  /** How many legs. The walker's currency. */
  legs: number;
  /** How many legs cross a way that closes. ⭐ A RISK axis, not a cost one. */
  conditional: number;
  /** How many legs declare no duration — what `minutes` is missing. */
  unmeasured: number;
}

/** Which knowledge the plan was built from. */
export type RouteSource = 'world' | 'map';

export interface RoutePlan {
  source: RouteSource;
  profile: TravelProfileSpec;
  /** Place identities, origin first, destination last. */
  nodes: readonly string[];
  legs: readonly RouteLeg[];
  cost: RouteCost;
  assumptions: readonly RouteAssumption[];
}

/**
 * Why there is no plan.
 *
 * ⭐⭐ `'budget'` is the one that earns its place. A search that spent
 * its allowance has **not** proved there is no way, and answering
 * *"there is no way"* when the truth is *"I stopped looking"* is a lie
 * the caller cannot detect. Every refusal carries `expanded`, which is
 * both the evidence and the input to a future compute meter.
 */
export type RouteRefusalReason =
  | 'unknown-origin'
  | 'unknown-destination'
  | 'no-way'
  | 'budget'
  | 'graph-cold';

export interface RouteRefusal {
  ok: false;
  reason: RouteRefusalReason;
  expanded: number;
  /**
   * ⭐ The **mode break**: set when a way exists but this traveller
   * cannot use all of it. `needs` is the media the first refused leg
   * admits — the difference between *"there is no way to the island"*
   * and *"the way stops at the quay; north needs water"*. One of those
   * tells you to buy a boat.
   */
  breakAt?: { node: string; dir: string; needs: readonly string[] };
}

export interface RouteSuccess {
  ok: true;
  /**
   * The non-dominated plans, at least one. ⚠ Several when the axes
   * disagree — a short way over a ford against a long sure one — and
   * the engine does NOT pick: that choice is the activity.
   */
  plans: readonly RoutePlan[];
  expanded: number;
}

export type RouteOutcome = RouteSuccess | RouteRefusal;

/*
 * ⚠ No `emptyCost()` helper here, deliberately. An exported free
 * function in `lib/` is what `no-restricted-syntax` refuses (CLAUDE.md
 * § Export discipline), and the answer the doc gives is *fold it in*,
 * not *add an exception* — a four-zero literal at the one call site
 * costs less than a module-scope export.
 */
