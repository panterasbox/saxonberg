/**
 * MapClaim — one thing one player believes about one place.
 *
 * ⭐⭐ **A claim, not a view.** The server's own knowledge of the world's
 * shape lives in `location_graph`; a map is written from what a player
 * perceived, and **the two never join**. So a map is not a filter over
 * the truth — it is a separate artifact that can disagree with it.
 *
 * ⭐ **Rot is the feature.** Nothing reconciles a claim against the
 * world afterwards. Wall up an exit somebody has walked and their map
 * still shows it until they next look, at which point the new
 * observation is APPENDED and both claims render: *you recorded an exit
 * east on <date>; on <later> you saw none.* A merge algorithm would
 * pick a winner and hide that it did, which turns a knowledge model
 * back into a truth model — and *"who was there more recently"*
 * dissolves anyway once a map is many claims rather than one document
 * with one date.
 *
 * So a claim carries **its own channel**, not one date for the whole
 * document — and every channel can be wrong:
 *
 * | channel | how you came to know it | can be wrong |
 * |---|---|---|
 * | `walked` | you went that way | yes, if it changed since |
 * | `seen` | you made it out from where you stood | yes, and sooner |
 * | `searched` | you went over the place deliberately | yes, and this is the one whose ABSENCES mean something |
 * | `published` | a public timetable said so | yes, if a station went dark |
 *
 * ⭐⭐⭐ **`searched` exists because non-obvious is not permanently
 * absent.** A concealed exit is filtered out of `obviousExitsFor` until
 * the viewer **discovers** it — *"once found, always seen (the
 * per-viewer discovery belief sticks)"* — and the lounge ships one:
 * Dave's Bar's north door to the office is `concealment: hidden` with
 * an authored hint, revealed by `search`.
 *
 * ⚠⚠ So a missing edge has **two meanings** and the map used to
 * conflate them: *there is no exit east* and *I never noticed the exit
 * east*. The staleness render asserted the first — *"not seen when you
 * last looked"* — off a glance, which is not evidence when a door can
 * be hiding. A deliberate search is the observation whose absences DO
 * carry information, so it gets its own channel and the render says two
 * different, true things depending on which one is latest.
 *
 * ⭐⭐ **These are NAVIGATIONAL channels, and they used to be
 * perceptual ones.** The vocabulary was `perception` · `publication` ·
 * `told` · `bought`, and three things were wrong with it at once:
 *
 *   - ⚠⚠ **`perception` covered BOTH looking and walking**, with the
 *     writer apologizing for it in a comment — *"still `perception`:
 *     you walked it, which is the strongest form of having seen it."* A
 *     comment arguing that walking is a kind of seeing is the tell. You
 *     learn the hall is north by **going** north.
 *   - ⭐ **The renderer was already compensating**: `MapController`
 *     mapped `channel === 'perception'` to the literal word
 *     *"walked"*. The view layer had been quietly translating a wrong
 *     model, which is the strongest evidence it was wrong.
 *   - ⛔ **`told` and `bought` had no writer** — speculative vocabulary
 *     admitted on the argument that retrofitting provenance is
 *     expensive. Cut: an axis with two live values and two imaginary
 *     ones teaches a reader the wrong shape, and the retrofit argument
 *     is cheaper to make again later than a wrong vocabulary is to
 *     unlearn. `told`'s attribution (somebody lied to you, and the
 *     record should say who) belongs with the accountability ledger
 *     anyway.
 *
 * ⛔ **And two fields are gone with it.** `modality` was written as the
 * hardcoded literal `'vision'` — from a local variable misleadingly
 * named `band` — and read by **nothing**; `band` itself was declared
 * and never written at all. They were there to make a navigational
 * record look like it participated in the sense system. A map does not
 * know what a modality is.
 *
 * A value-object module: the shape and the vocabulary, no behaviour.
 */

/** How a player came to know something about a place. */
export const MAP_CHANNELS = [
  'walked',
  'seen',
  'searched',
  'published',
] as const;

export type MapChannel = (typeof MAP_CHANNELS)[number];

/** What a claim is about: a place, or a way out of one. */
export type MapClaimKind = 'place' | 'edge';

export interface MapClaim {
  kind: MapClaimKind;
  /**
   * ⭐ The place's **durable handle** (`Stuff.getDurableHandle()`) —
   * never its template path, which forty dorm rooms share, and never
   * its `stuffId`, which is fresh every construction.
   *
   * ⚠ **A place with no handle writes no claim.** A lounge satellite is
   * a fresh clone per landing, named by nothing durable, so an honest
   * map of it is *nothing* rather than a stale entry for a room that no
   * longer exists.
   */
  place: string;
  /** The row behind the place — what it IS, for grouping and debugging. */
  label?: string;
  /** What the place was CALLED when it was perceived. */
  name?: string;
  /**
   * ⭐⭐ **The targeting tokens the place answered to when you saw it**
   * — `kitchen`, `yard`, `shop-floor`.
   *
   * This is the LAST LEG of naming a destination, and the reason it is
   * banked rather than derived is the whole shape of addressing a
   * room: **giving every room a unique address does not work.** You
   * get `old-road-12` and `desert-34x95`, and only half of that is
   * legible. So an {@link MapClaim.group | address} names a
   * COLLECTION of rooms — a terrace, a lot, a quarter — and the
   * keyword picks within it. `terminus/hinkley-hills/evergreen-terrace/lot-123`
   * is as specific as the address tier needs to get; inside it there
   * is a `kitchen` and a `master bedroom`.
   *
   * ⭐ Measured on the shipped realm, which is what settles it: **127
   * of 128 places already author keywords**, so this costs no content
   * work at all. Globally they collide hard (`yard` names 14 places,
   * `floor` 12) — and **scoped to one address, exactly one bucket in
   * the entire realm has an internal collision.** A keyword does not
   * need to be unique; it needs to be unique *in a place*.
   *
   * ⚠ Banked, not read live, for the same reason the handle is: the
   * room may not be loaded. It is also honest — you stood in it, so
   * what it answered to is something you learned.
   *
   * ⭐ And it keeps the firewall tight for free: keyword matching runs
   * over your OWN claims, so there is no form of a destination name
   * that can reach a place you have never been. The authorization
   * stops being a separate check and becomes the resolution itself.
   *
   * The shipped precedent is the TPA board, which targets a finite
   * destination list by keyword (`FastTravel.resolveRouteByKeyword`).
   * ⚠ That one answers `{ambiguous: true}` and stops; `route` prompts
   * with the banked {@link MapClaim.name | short descriptions}, which
   * is an improvement on the pattern rather than a copy of it.
   */
  keywords?: string[];
  /**
   * The grouping address the content declares, when it declares one.
   * ⭐ A grouping key, never display chrome and never an identity: it
   * is what lets a map read Duncan Hall's four rooms as *Duncan Hall*
   * rather than as four unrelated places.
   */
  group?: string;
  /** For an edge: the direction. */
  dir?: string;
  /** For an edge: the destination's handle, when the player knows it. */
  to?: string | null;
  /** For an edge: what the far side was called, when `to` is unknown. */
  toLabel?: string | null;
  channel: MapChannel;
  /**
   * ⭐ For an edge you WALKED: was it the kind of way that closes — a
   * ford, a causeway? You were standing at it, so you saw that much,
   * and a plan over your own map can carry the caveat.
   *
   * ⚠⚠ **There is deliberately no `minutes` beside this**, and the
   * reason is the pedagogy rather than the plumbing. Ordinary movement
   * is **instantaneous and free** by design (`logistics.md`), so a
   * walker who crossed in zero game time **did not learn how long the
   * way takes** — recording a duration from a free walk would write a
   * number the world never charged. `edgeMinutes` is what a Journey
   * spends; a map plan costs in LEGS, which is also what a pedestrian
   * is answered in.
   *
   * A `seen` claim carries neither: a glance measures nothing.
   */
  conditional?: boolean;
  /** Game-second of the first observation of this exact claim. */
  firstSeen: number;
  /** Game-second of the most recent one. Bumped, never replaced. */
  lastSeen: number;
  /** The viewer key that recorded it — a map can be given away. */
  recordedBy: string;
}

/** A map document's `data`. */
export interface MapDocument {
  /** The locality address this map is of. */
  locality: string;
  claims: MapClaim[];
}

/*
 * ⚠ No `mapClaimKey` helper here. A free exported function in `lib/` is
 * drift by definition (CLAUDE.md § Export discipline — this module
 * exports its shape and its vocabulary, which is what a value-object
 * module is for), and the dedupe key is the WRITER's business anyway:
 * `NavigationLogic` owns the growth rule, so it owns the key the rule
 * is expressed in.
 *
 * ⭐ Worth recording wherever that key lives: `channel` is part of it.
 * *You saw an exit east* and *somebody told you there is an exit east*
 * are two different claims about the world, and collapsing them would
 * lose exactly the provenance the channel exists to carry.
 */
