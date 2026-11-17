/**
 * CarryingMixin — **what a body that carries knows about the things on it,
 * and where an arrival goes on it.**
 *
 * ⭐⭐ `ContainmentApi.move(item, carrier)` is the one call, and a carrier
 * ROUTES what arrives (size and carrying W8; owner, 2026-11-13). This
 * mixin's {@link arrivalFor} override is D11's order over the places that
 * ARE the body — a hanging pouch onto the belt, a stack onto its like, a
 * free hand by `carry.order`, a worn pocket. When none takes it, the
 * carrier's own arrival handling ({@link routeArrival}) takes it anyway — a
 * TRUE move onto the body, its witnesses firing — and sends it on with a
 * second true move: into the first worn or carried bag it fits, else down
 * where the body stands, with the line. Nothing is retargeted; no caller
 * chooses, and there is no way around the routing (`directMove` retired,
 * owner 2026-11-15 — a handed thing that cannot be carried lands at the
 * body's feet, honestly). The RULE that nothing sits loose is every
 * body's (`Creature.arrivalFor`); a body that does not carry (a fish) is
 * not routed, and `move` throws. The capability composes only on the
 * classes that carry: `Character`, `DraftAnimal`, `KeptAnimal` and
 * ranching's `WorkingAnimal`.
 *
 * ## What it knows — its thirteen members (plus the `arrivalFor` hook)
 *
 * - **Hands** (D9–D10): `freeHands`; `wieldPlanFor` — the slots a wield
 *   takes on THIS body (a free second hand when its weight or length takes
 *   two). Which slots are hands is `Attired.handSlots`.
 * - **Tiers** (D15): `tierOf` — hand · ready · packed · elsewhere;
 *   `isHonest` — on this body by a slot, a worn host, or inside such a thing
 *   (loose in the contents is not).
 * - **Arriving** (W8, 2026-11-13): `routeArrival` — what nothing ON the body
 *   takes lands on it and goes on into a bag it carries, or down where it
 *   stands (called by `move` alone); `wouldSetDown` — that routing read dry.
 * - **Readying** (D-W10-3): `ready` — the named thing comes into a FREE
 *   hand, or a refusal naming what holds the hands; nothing is put away for
 *   you. In a fight it is the generalized weapon switch. Its callers are the
 *   explicit *keep it in hand* acts (`get X from <on you>`, `fight switch`,
 *   `fight draw`); an instrument is used where it sits. `bringToHand` — its
 *   body, and a switch's landing.
 * - **Putting away** (D-W10-2): `stow` — off the hands into the first of
 *   the carrier's places that takes it, in D11's order; nothing takes it →
 *   refused, it stays in the hand. No homes: nothing remembers where a
 *   thing came from (retired W10, 2026-11-14). `stowPlaceFor` — where it
 *   would go, read dry.
 * - **Letting go** (D13): `releaseHeld`; `returnBorrowed` (D37 — a guest
 *   gives back what it borrowed).
 * - **Sound** (D36): `gearNoise`.
 *
 * ## Composition
 *
 * On the carrier classes, over `Creature` (the base constraint): it reads
 * the slot substrate (`Slotted`, `Attired`) and the burden gauge reads it.
 *
 * Operational reference: `docs/subsystems/carrying.md`.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Containable, PackedRefusal } from '../spatial/Containable';
import type { Container } from '../spatial/Container';
import type { Placing } from '../spatial/Placing';
import type { Slottable } from './Slottable';
import type { Slotted } from './Slotted';
import type { Creature } from '../creature/Creature';
import type { Arrival, ArrivalRefusal } from '../spatial/Container';
import type { ActRefusal } from '../craft/ActPlan';
import { ContainmentApi, ContainmentError } from '../../api/containment';
import { StuffApi } from '../../api/stuff';
import { Placements } from '../spatial/Placement';
import { MixinApi } from '../../api/mixin';
import { CallSecurity } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
import { SpeciesApi } from '../../api/species';
import { CombatApi } from '../../api/combat';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { GrammarApi } from '../../api/grammar';
import { SettingTypes, type SettingsSchemaEntry } from '../shell/Environment';

/**
 * ⭐ The carrying dials (size-and-carrying D10/D12/D35) — the
 * `LOAD_BEARING_DEFAULTS` precedent: named, greppable, retunable in one
 * place. Set so a 70 kg human holds 10 kg in one hand and needs both for a
 * 1.2 m staff, and a 27 kg, 1 m gnome needs both past 4 kg / 0.6 m — no
 * strength stat, only the holder's own capacity and stature.
 */
export const CARRYING_DEFAULTS = {
  /** Past this share of the holder's comfortable carry, a load takes both hands. */
  ONE_HAND_FRACTION: 0.3,
  /** Longer than this share of the holder's stature, a load takes both hands. */
  TWO_HAND_LENGTH: 0.6,
} as const;

/** The order a carrier tries its places in (`carry.order`, D11). */
export const CARRY_ORDERS = ['hands-first', 'pockets-first'] as const;
export type CarryOrder = (typeof CARRY_ORDERS)[number];

/** How near a carried thing is to the hand (D15). */
export type CarryTier = 'hand' | 'ready' | 'packed' | 'elsewhere';

/** The slot a pack on the back sits in — its inside is *packed* (D15). */
const PACKED_SLOT = 'back';

/**
 * Why a carrier cannot take a thing (D11) — the carrier's subset of
 * `Container`'s `ArrivalRefusal`.
 */
export type ReceiveRefusal = Extract<
  ArrivalRefusal,
  { reason: 'too-heavy' | 'cannot-grip' | 'hands-on-cart' | 'nowhere-to-carry' }
>;

/** Why readying a thing failed (D16; D-W10-3) — every one names a way out. */
export type ReadyRefusal =
  | PackedRefusal
  | ActRefusal<
      'hands-needed',
      {
        hands: number;
        held: Stuff[];
        /** A held thing that WOULD go away, and where — the `put` the words name. */
        away?: { held: Stuff; host: Stuff; region?: string } | null;
      }
    >
  | ActRefusal<'hands-on-cart', { cart: Stuff }>
  | ActRefusal<'cannot-grip', { why: string }>
  | ActRefusal<'too-heavy'>
  | ActRefusal<'not-on-you'>
  | ActRefusal<'already-switching'>;

/** Every refusal a carrier words. */
export type CarryRefusal = ReceiveRefusal | ReadyRefusal;

/**
 * Where a thing can go on a body short of a hand (D11/D15): a container
 * (a worn satchel, a pouch hung from the belt, the pack on the back), or a
 * named region of a worn container (a coat's `left pocket` — the coat is a
 * Container and the key its contents, size and carrying W9).
 */
export type CarryPlace =
  | { host: Stuff & Container; region?: string }
  // A hanging region of a sibling host (a belt's `from`, a halter's): a pair,
  // never containment, and its host need hold nothing.
  | { host: Stuff & Placing; region: string };

/**
 * Where a thing sits on a body, as facts (size and carrying W8 — the words
 * are the controller's): the container it is in (not the body), the worn
 * host and region it is placed on, or the non-hand slot it occupies.
 */
export interface CarriedAt {
  container: Stuff | null;
  host: Stuff | null;
  region: string | null;
  slot: string | null;
}

/**
 * ⭐ What a readying did (D16; W8 — facts, never a sentence): the thing
 * that came to hand and where it came FROM. `moved: false` — nothing needed
 * to move. Nothing else moves in a readying (D-W10-3).
 */
export interface ReadiedOutcome {
  ok: true;
  item: Stuff;
  moved: boolean;
  from: CarriedAt;
}

export interface Carrying {
  /**
   * How many hands are empty and can close on something (`Vitals.canGrip`),
   * less the handles of a cart this body pulls (D18).
   */
  freeHands(): number;
  /** ⭐ How near `thing` is to the hand (D15); `elsewhere` when it is not on this body. */
  tierOf(thing: Stuff): CarryTier;
  /**
   * ⭐ Is `item` honestly on this body (D11)? A slot occupant (held, worn);
   * or placed on a host that is itself honest here (a key in a worn coat's
   * pocket, a pouch hung from a worn belt); or inside such a thing. Loose in
   * the contents — what the flip's veto refuses — is not; nor is a thing
   * that is not on this body at all.
   */
  isHonest(item: Stuff): boolean;
  /**
   * ⭐ Bring `item` into a FREE hand (D-W10-3). In hand already → ok; on
   * you with the hand(s) it needs free → it comes out; hands in the way →
   * `hands-needed` naming what they hold (nothing is put away for you);
   * packed → refused, naming the pack; a fixture in the room → used where it
   * stands; a portable thing elsewhere → `not-on-you`. In a fight it is the
   * switch, priced by where it comes out of.
   */
  ready(item: Stuff): ReadyRefusal | ReadiedOutcome | null;
  /**
   * ⭐ Put `held` away (D-W10-2): off the hands into the first of this
   * body's places that takes it, in D11's order — a pocket of a worn
   * garment, a hook on a worn host, a container hung or pocketed there, a
   * worn bag off the back, the pack on the back. Nothing takes it →
   * `nowhere-to-carry`, nothing moves, it stays in the hand — never the
   * floor (that is `drop`), never a guess. A thing neither in a hand nor
   * just let go of on this body: null, nothing to do.
   */
  stow(held: Stuff): ArrivalRefusal | null;
  /**
   * ⭐ Where {@link stow} would put `held` — the first of this body's places
   * that takes it, in D11's order — or null when nothing takes it (stow
   * would refuse). A question, never a way to move: read by a verb that
   * says where a hand is going before the act lands (`unwield` in a fight).
   */
  stowPlaceFor(held: Stuff): CarryPlace | null;
  /**
   * Seat `item` in the free hand(s) it needs now — the body of `ready`,
   * and the completion of a fight's switch. Quiet: the caller tells.
   */
  bringToHand(item: Stuff): ReadiedOutcome | ReadyRefusal;
  /**
   * ⭐ Let go (D13): each occupant of `slots` (default: the hands) goes to
   * the enclosing place, with a line to the room. Worn things stay.
   */
  releaseHeld(slots?: readonly string[]): Stuff[];
  /**
   * ⭐ Wielding `item` by `claim` on THIS body (D10): the slots it takes —
   * its authored claim, widened by a free hand when its weight or length
   * takes two here (the gnome's longsword; the ogre's greatsword stays
   * one) — or why not now: `too-heavy`, the cart's handles
   * (`hands-on-cart`), or two hands by weight with the other holding
   * something (`hands-needed`). A claim that is not a hand's is its slots.
   */
  wieldPlanFor(item: Stuff, claim: readonly string[]): { ok: true; slots: string[] } | ReadyRefusal;
  /** ⭐ D36: 1 when something held or hung on this body clanks (rigid and ringing), else 0. */
  gearNoise(): 0 | 1;
  /**
   * ⭐⭐ The carrier's arrival handling when nothing ON it takes `item`
   * (owner, 2026-11-13) — called by `ContainmentApi.move` alone (gated).
   * A true move onto this body (its witnesses fire), then a second true
   * move: into the first worn or carried bag it fits, else down where the
   * body stands, with the line. Returns where it ended.
   *
   * @internal
   */
  routeArrival(item: Stuff & Containable, refusal: ArrivalRefusal): Stuff & Container;
  /**
   * ⭐ Would the routing set `item` down (owner, 2026-11-15)? Null when
   * `ContainmentApi.move(item, this)` keeps it — on the body (a hand, a
   * pocket, a hook) or in a bag this body carries; else the refusal the
   * routing would set it down with, read dry by the same resolution
   * {@link routeArrival} performs. A question, never a way to move: its
   * callers are `get` (which refuses rather than pick a thing up only to
   * set it back down) and a staged body's `props:` (an author's diagnostic).
   */
  wouldSetDown(item: Stuff & Containable): ArrivalRefusal | null;
  /**
   * ⭐ D37: before a guest body is reaped, what it borrowed goes back — a
   * good titled to someone else to its owner (their hands, else set down
   * where they stand), anything untitled it picked up dropped where the
   * guest stands. What it wears (the guest's own outfit) goes with it.
   */
  returnBorrowed(): Stuff[];
}

// ⭐ The base constraint is `Creature` (size and carrying W8): only a body
// carries, and the arrival rule it refines (`Creature.arrivalFor`) is the
// body's.
export function CarryingMixin<TBase extends MixinConstructor<Creature>>(Base: TBase) {
  // Declared-then-returned (the Slottable shape) so method decorators are
  // legal — a class EXPRESSION cannot carry them.
  class CarryingMixin extends Base {
    static _mixinName = 'CarryingMixin';

    /**
     * `carry.order` — where a carrier tries first when it is handed a
     * thing: its free hands, or its worn containers. Read by
     * {@link arrivalFor}.
     */
    static settings: SettingsSchemaEntry[] = [
      {
        key: 'carry.order',
        type: SettingTypes.Enum,
        default: 'hands-first',
        enumValues: [...CARRY_ORDERS],
        description:
          'Where a thing you are handed goes first: `hands-first` (a free ' +
          'hand, then your pockets and packs) or `pockets-first` (your ' +
          'pockets and packs, then a free hand). Either way, when nothing ' +
          'fits you are told so and nothing moves.',
      },
    ];

    /** This carrier as the body it is (its hands are the slot substrate's — `Attired`). */
    private asBody(): Creature {
      return this as unknown as Creature;
    }

    // ── hands (D9–D10) ──

    /** Hand slots that are empty and can close on something. */
    private openHands(): string[] {
      const self = this as unknown as Stuff & Slotted;
      const vitals = MixinApi.isVitals(self) ? self : null;
      return this.asBody().handSlots().filter(
        (slot) => !self.isSlotOccupied(slot) && (vitals === null || vitals.canGrip(slot)),
      );
    }

    /** The cart whose handles this body holds, and how many hands they take. */
    private cartInHand(): { cart: Stuff; hands: number } | null {
      const self = this as unknown as Stuff;
      if (!MixinApi.isHauling(self)) return null;
      const cart = self.getHauledCart();
      if (cart === null) return null;
      return { cart, hands: cart.getHandedness() };
    }

    public freeHands(): number {
      const onCart = this.cartInHand()?.hands ?? 0;
      return Math.max(0, this.openHands().length - onCart);
    }

    /**
     * ⭐ How many hands `item` takes in THIS body's grip (D10): `2` when its
     * use needs two (an authored two-hand claim) or it is heavy or long
     * against this body; `null` when it is past what it can lift; else `1`.
     */
    private handsFor(item: Stuff): 1 | 2 | null {
      const self = this as unknown as Stuff;
      // ⭐ The grip judges MASS, never weight (D10-d): a thing and all that
      // is in it, at any gravity — a full pack takes both hands weightless,
      // because it still takes effort to stop. Weight is the burden line's.
      const loadBearing = MixinApi.isLoadBearing(self);
      const mass = loadBearing
        ? self.ladenMassOf(item).rawValue()
        : MixinApi.isTangible(item) ? item.getMass().rawValue() : 0;
      // A body whose capacity is unknown (no mass yet) is not asked by mass.
      const capacity = loadBearing ? self.getCarryCapacity().rawValue() : 0;
      if (capacity > 0 && MixinApi.isLoadBearing(self)) {
        if (mass > self.getStrainCeiling().rawValue()) return null;
        if (mass > capacity * CARRYING_DEFAULTS.ONE_HAND_FRACTION) return 2;
      }
      const stature = MixinApi.isPosed(self) ? self.getStature() : null;
      const longest = MixinApi.isShaped(item) ? item.getDimensions()?.longest() ?? null : null;
      if (stature !== null && stature > 0 && longest !== null && longest > stature * CARRYING_DEFAULTS.TWO_HAND_LENGTH) {
        return 2;
      }
      // ⭐ Two hands BY USE is authored (a bow, a pike): a claim naming two
      // of this body's hands. Two by weight is derived above, never authored.
      if (MixinApi.isWieldable(item)) {
        const plan = SpeciesApi.tryGetBodyPlanPath(self);
        if (plan !== null) {
          const hands = new Set(this.asBody().handSlots());
          if (item.getSlotClaim(plan).filter((s) => hands.has(s)).length >= 2) return 2;
        }
      }
      return 1;
    }

    /** The slots `item` takes wielded by `claim` here: the claim, widened by a free hand. */
    private wieldSlots(item: Stuff, claim: readonly string[]): string[] {
      const hands = this.asBody().handSlots();
      const held = claim.filter((sl) => hands.includes(sl));
      const need = this.handsFor(item) ?? 1;
      if (held.length === 0 || held.length >= need) return [...claim];
      return [...claim, ...hands.filter((h) => !claim.includes(h)).slice(0, need - held.length)];
    }

    public wieldPlanFor(item: Stuff, claim: readonly string[]): { ok: true; slots: string[] } | ReadyRefusal {
      const self = this as unknown as Stuff & Slotted;
      const need = this.handsFor(item);
      if (need === null) return { ok: false, reason: 'too-heavy' };
      const hands = this.asBody().handSlots();
      const slots = this.wieldSlots(item, claim);
      const gripped = slots.filter((sl) => hands.includes(sl));
      // The handles first: taking anything up takes at least a hand.
      const cart = this.cartInHand();
      if (cart !== null && this.freeHands() < Math.max(1, gripped.length)) {
        return { ok: false, reason: 'hands-on-cart', facts: { cart: cart.cart } };
      }
      if (gripped.length === 0) return { ok: true, slots }; // not a hand's question
      const extra = slots.filter((sl) => !claim.includes(sl));
      if (extra.some((sl) => self.isSlotFull(sl)) || need > gripped.length) {
        return { ok: false, reason: 'hands-needed', facts: { hands: need, held: this.asBody().heldThings() } };
      }
      return { ok: true, slots };
    }

    /** Why no hand can take a thing: the hurt hand's own words, or null. */
    private gripWhy(): string | null {
      const self = this as unknown as Stuff & Slotted;
      if (!MixinApi.isVitals(self)) return null;
      for (const slot of this.asBody().handSlots()) {
        if (self.isSlotOccupied(slot)) continue;
        const why = self.slotRefusalReason(slot);
        if (why !== null) return why;
      }
      return null;
    }

    // ── tiers (D15) ──

    public tierOf(thing: Stuff): CarryTier {
      const self = this as unknown as Stuff & Slotted;
      // Walk up to this body; `top` is the thing directly on it.
      let top: Stuff = thing;
      for (let i = 0; ; i++) {
        if (i >= 32) return 'elsewhere';
        const up: Stuff | null = MixinApi.isContainable(top) ? top.getContainer() : null;
        if (up === null) return 'elsewhere';
        if (up.stuffId === self.stuffId) break;
        if (up.isAgent()) return 'elsewhere';
        top = up;
      }
      const slotsOf = (x: Stuff): string[] => {
        const out: string[] = [];
        for (const [slot, occ] of self.getAllOccupants()) {
          if ([...occ].some((o) => o.stuffId === x.stuffId)) out.push(slot);
        }
        return out;
      };
      // Hung from or pocketed on a worn host — everything on a belt is ready.
      const placed = MixinApi.isContainable(top) ? top.getPlacement() : null;
      if (placed !== null && placed.host.stuffId !== self.stuffId) return 'ready';
      const slots = slotsOf(top);
      if (top !== thing) return slots.includes(PACKED_SLOT) ? 'packed' : 'ready';
      const hands = this.asBody().handSlots();
      if (slots.some((s) => hands.includes(s))) return 'hand';
      // Worn itself (or, never after the flip, loose on the body): one draw.
      return 'ready';
    }

    // ── honesty (D11) ──

    public isHonest(item: Stuff): boolean {
      const self = this as unknown as Stuff & Slotted;
      const seen = new Set<string>();
      let cur: Stuff = item;
      while (!seen.has(cur.stuffId) && MixinApi.isContainable(cur)) {
        seen.add(cur.stuffId);
        const chain = [cur, ...cur.getContainerChain()];
        const at = chain.findIndex((c) => c.stuffId === self.stuffId);
        if (at <= 0) return false;
        // Inside something else on the way: honest when that is, and it is not a body.
        if (chain.slice(1, at).some((c) => c.isAgent())) return false;
        // Directly on this body: a slot occupant, or placed on an honest host.
        const direct = chain[at - 1]!;
        for (const [, occ] of self.getAllOccupants()) {
          if ([...occ].some((o) => o.stuffId === direct.stuffId)) return true;
        }
        const placed = MixinApi.isContainable(direct) ? direct.getPlacement() : null;
        if (placed === null || placed.host.stuffId === self.stuffId) return false;
        cur = placed.host;
      }
      return false;
    }

    // ── arriving (D11, W8) ──

    /**
     * ⭐⭐ Where `item` arrives ON this body (size and carrying W8; owner,
     * 2026-11-13): the body's admissions first (`Creature.arrivalFor` —
     * placed, an agent, seated, admitted), else the routing's first choice
     * by D11's order — a hook on the belt, a stack onto its like, a free
     * hand or a pocket (`carry.order`), a worn or carried bag. A choice ON
     * the body is answered (`seat`, `pair`, `contents`); a bag, or nothing,
     * answers `refuse` — a thing in a satchel is in the satchel, not on the
     * body — and `move` hands it to {@link routeArrival}, which lands it on
     * the body and moves it on.
     *
     * @hook
     */
    public arrivalFor(item: Stuff & Containable, how?: { placed?: boolean }): Arrival {
      const base = super.arrivalFor(item, how);
      if (base.kind === 'contents') return base;
      // The routing's first choice (bags in `carry.order`); a bag it would
      // choose is not ON the body, so it answers `refuse` and `move` routes
      // it there.
      return this.arrivalOf(this.resolveReceive(item));
    }

    /** The bag {@link resolveReceive} chose (a worn container, a stack's), else null. */
    private bagOf(where: ReturnType<CarryingMixin['resolveReceive']>): (Stuff & Container) | null {
      const self = this as unknown as Stuff;
      if (where.kind === 'merge' && where.into.stuffId !== self.stuffId) return where.into as Stuff & Container;
      if (where.kind === 'place' && where.place.region === undefined) return where.place.host as Stuff & Container;
      return null;
    }

    /** {@link resolveReceive}'s answer as the hook's: on this body, or refused. */
    private arrivalOf(where: ReturnType<CarryingMixin['resolveReceive']>): Arrival {
      const self = this as unknown as Stuff;
      switch (where.kind) {
        case 'held':
          return { kind: 'contents' };
        case 'hand':
          return { kind: 'seat', slots: where.slots };
        case 'merge':
          // ⭐ A stack meets its like and takes no hand (requirements §
          // Collisions): onto the coins in a hand or a pocket.
          return where.into.stuffId === self.stuffId
            ? { kind: 'contents' }
            : { kind: 'refuse', refusal: { ok: false, reason: 'nowhere-to-carry', facts: { item: where.item, held: [], tried: [where.into] } } };
        case 'place':
          return where.place.region !== undefined
            ? { kind: 'pair', host: where.place.host as unknown as Stuff & Placing, region: where.place.region }
            : { kind: 'refuse', refusal: { ok: false, reason: 'nowhere-to-carry', facts: { item: where.item, held: [], tried: [where.place.host] } } };
        case 'refused':
          return { kind: 'refuse', refusal: where.refusal };
      }
    }

    /** The things this carrier is routing right now (the re-entry guard). Runtime only. */
    private _routing = new Set<string>();

    /** See {@link Carrying.wouldSetDown}. */
    public wouldSetDown(item: Stuff & Containable): ArrivalRefusal | null {
      if (this.bagOf(this.resolveReceive(item)) !== null) return null;
      const arrival = this.arrivalFor(item, { placed: false });
      return arrival.kind === 'refuse' ? arrival.refusal : null;
    }

    /**
     * ⭐⭐ The honest cascade (owner, 2026-11-13) — `ContainmentApi.move(item,
     * this)` lands here when nothing ON the body takes `item`. Where it goes
     * on is decided BEFORE it lands (so a move that has nowhere to end
     * throws with nothing moved); then every step is a TRUE move with its
     * own witnesses: onto this body (admitted for the moment it is loose —
     * nothing observes it between the two), then into the first worn or
     * carried bag it fits by `carry.order` and D11's tier order, else down
     * where the body stands, and the body is told — *Your hands are full —
     * you set the cup down.* Observers see it reach the body and the body
     * put it away or set it down.
     *
     * @throws ContainmentError when there is no bag and nowhere to set it down.
     */
    @CallSecurity(SecurityPolicies.FromModule('/platform/idea/api/ContainmentLogic#ContainmentLogic'))
    public routeArrival(item: Stuff & Containable, refusal: ArrivalRefusal): Stuff & Container {
      const self = this as unknown as Stuff & Container & Containable;
      const bag = this.bagOf(this.resolveReceive(item));
      const here = bag === null ? self.getEnclosingPlace() : null;
      if (bag === null && here === null) {
        throw new ContainmentError(
          `move: ${item.getTemplatePath() ?? item.stuffId} has no place on ` +
            `${self.getTemplatePath() ?? self.stuffId}, no bag it carries takes it, and it stands nowhere to set it down`,
          { reason: refusal.reason, facts: refusal.facts },
        );
      }
      // The first true move: it reaches this body (admitted — a re-entry
      // here would be an arrival rule that ignores the admission).
      if (this._routing.has(item.stuffId)) {
        throw new ContainmentError(`move: routing ${item.stuffId} onto ${self.stuffId} re-entered`);
      }
      this._routing.add(item.stuffId);
      try {
        this.asBody().admitWhile(item, () => ContainmentApi.move(item, self));
      } finally {
        this._routing.delete(item.stuffId);
      }
      if (item.isDestroyed() || item.getContainer() !== self) return self;
      if (bag !== null) {
        ContainmentApi.move(item, bag);
        return bag;
      }
      ContainmentApi.move(item, here!);
      if (!item.isDestroyed() && MixinApi.isSensor(self)) {
        const why = refusal;
        const thing = Mml.thing(item);
        const line =
          why.reason === 'too-heavy'
            ? Mml.compose`${thing} is more than you can lift — you set it down.`
            : why.reason === 'cannot-grip'
              ? Mml.compose`You cannot grip ${thing} — you set it down.`
              : why.reason === 'hands-on-cart'
                ? Mml.compose`Your hands are on ${Mml.thing(why.facts.cart)} — you set ${thing} down.`
                : Mml.compose`Your hands are full — you set ${thing} down.`;
        MessageApi.scene(self)
          .topic('act.deed')
          .toSelf(line)
          .toPeers(Mml.compose`${Mml.actor(self)} sets ${thing} down.`)
          .send();
      }
      return here!;
    }

    /**
     * ⭐ Where `item` would go on this body, by D11's order — the one
     * resolution `move` performs (via `arrivalFor`) and {@link routeArrival}
     * performs (a worn or carried bag too), and that {@link wouldSetDown}
     * reads — so the routing and the question can never disagree.
     */
    private resolveReceive(
      item: Stuff,
    ):
      | { kind: 'held' }
      | { kind: 'merge'; into: Stuff; item: Stuff }
      | { kind: 'hand'; slots: string[] }
      | { kind: 'place'; place: CarryPlace; item: Stuff }
      | { kind: 'refused'; refusal: ReceiveRefusal } {
      if (this.tierOf(item) === 'hand') return { kind: 'held' };
      const hang = this.hangHostFor(item);
      if (hang !== null) return { kind: 'place', place: { host: hang, region: Placements.FROM }, item };
      const merge = this.mergeTargetFor(item);
      if (merge !== null) return { kind: 'merge', into: merge, item };
      const hands = this.handsFor(item);
      if (hands === null) return { kind: 'refused', refusal: { ok: false, reason: 'too-heavy' } };
      const order: CarryOrder = this.carryOrder();
      const open = this.openHands();
      const handOk = this.freeHands() >= hands && MixinApi.isSlottable(item);
      const hand = { kind: 'hand' as const, slots: open.slice(0, hands) };
      // Never into itself, nor into something it holds.
      const every = this.carryPlaces().filter((p) => !within(p.host, item));
      const fits = every.find((p) => this.placeTakes(p, item)) ?? null;
      const place = fits !== null ? { kind: 'place' as const, place: fits, item } : null;
      if (order === 'hands-first') {
        if (handOk) return hand;
        if (place !== null) return place;
      } else {
        if (place !== null) return place;
        if (handOk) return hand;
      }
      const cart = this.cartInHand();
      if (cart !== null && open.length >= hands) {
        return { kind: 'refused', refusal: { ok: false, reason: 'hands-on-cart', facts: { cart: cart.cart } } };
      }
      const why = this.gripWhy();
      if (why !== null && this.asBody().heldThings().length === 0) {
        return { kind: 'refused', refusal: { ok: false, reason: 'cannot-grip', facts: { why } } };
      }
      // ⭐ The refusal is the tutorial (requirements § Collisions): it
      // carries what is held, where it was tried, a held thing that WOULD
      // go away (the next command), and the grip — the controller words it.
      const held = this.asBody().heldThings();
      let away: { held: Stuff; host: Stuff; region?: string } | null = null;
      for (const h of held) {
        const p = every.find((x) => !within(x.host, h) && this.placeTakes(x, h));
        if (p !== undefined) {
          away = p.region !== undefined ? { held: h, host: p.host, region: p.region } : { held: h, host: p.host };
          break;
        }
      }
      return {
        kind: 'refused',
        refusal: {
          ok: false,
          reason: 'nowhere-to-carry',
          facts: {
            item,
            held,
            tried: [...new Set(every.map((p) => p.host))],
            away,
            needsBoth: hands !== null && hands > held.length && this.freeHands() > 0,
          },
        },
      };
    }

    /**
     * A carried stack `item` would merge into — in a hand, a pocket or a
     * carried container — answered as the container it would be moved into
     * (this body for a held or pocketed stack). Null when none.
     */
    private mergeTargetFor(item: Stuff): Stuff | null {
      if (!MixinApi.isStackable(item)) return null;
      const self = this as unknown as Stuff & Container;
      for (const x of self.getCarriedContents()) {
        if (x.stuffId === item.stuffId || !MixinApi.isStackable(x) || !x.canMergeWith(item)) continue;
        if (this.tierOf(x) === 'packed' || this.tierOf(x) === 'elsewhere') continue;
        const at = x.getContainer();
        if (at !== null) return at;
      }
      return null;
    }

    public returnBorrowed(): Stuff[] {
      const self = this as unknown as Stuff & Container & Slotted;
      const me = self.getIdentityPath() ?? self.getTemplatePath() ?? '';
      const place = (self as unknown as Stuff & Containable).getContainer();
      const hands = new Set(this.asBody().handSlots());
      const worn = new Set<string>();
      for (const [slot, occ] of self.getAllOccupants()) {
        if (hands.has(slot)) continue;
        for (const o of occ) worn.add(o.stuffId);
      }
      const out: Stuff[] = [];
      // Top-level first: a borrowed bag goes back whole, with what is in it.
      for (const item of [...self.getCarriedContents()]) {
        if (item.isDestroyed() || item.isAgent()) continue;
        const owner = MixinApi.isChattel(item) ? item.stampedOwner() : null;
        const ownerPath = owner !== null && owner.kind !== 'group' ? owner.templatePath : null;
        if (ownerPath !== null && ownerPath !== me) {
          // To the owner — `move` routes it: on them, their bag, else set
          // down where the owner stands.
          const body = StuffApi.findByIdentityPath(ownerPath).find((b) => MixinApi.isCarrying(b) && !b.isDestroyed());
          if (body !== undefined && MixinApi.isContainer(body)) {
            ContainmentApi.move(item as Stuff & Containable, body);
          } else if (place !== null) ContainmentApi.move(item, place as Stuff & Container);
          out.push(item);
          continue;
        }
        // Untitled and not the guest's own clothes: found here, left here.
        // ⭐ In a pocket of what the guest wears is on the guest too (W9: the
        // pocket's thing is its garment's contents).
        const at = item.getContainer();
        const pair = item.getPlacement();
        const inWornPocket = at !== null && worn.has(at.stuffId) && pair !== null && pair.host.stuffId === at.stuffId;
        const onBody = at?.stuffId === self.stuffId || inWornPocket;
        if (ownerPath === null && onBody && !worn.has(item.stuffId) && place !== null) {
          const onWorn = pair !== null && worn.has(pair.host.stuffId);
          // A thing in the guest's own pocket, or held: found, so dropped.
          if (onWorn || this.tierOf(item) === 'hand') {
            if (MixinApi.isSlottable(item)) {
              for (const slot of this.asBody().handSlots()) if (self.getOccupants(slot).has(item)) self.vacate(slot, item);
            }
            ContainmentApi.move(item, place as Stuff & Container);
            out.push(item);
          }
        }
      }
      return out;
    }

    /** The slots `item` claims on this body when put on — empty when it is not worn here. */
    private wearClaim(item: Stuff): string[] {
      if (!MixinApi.isWearable(item)) return [];
      const plan = SpeciesApi.tryGetBodyPlanPath(this as unknown as Stuff);
      return plan === null ? [] : [...item.getSlotClaim(plan)];
    }

    /**
     * ⭐ Where a thing that HANGS goes on this body (size and carrying W7):
     * a worn container that claims no slot of this body (a belt pouch, a
     * medic's pouch, a holster) arriving from off the body is hung `from`
     * the first worn host that offers it and has room — the belt, a
     * bandolier, a pack's strap. Null for anything else, for a thing
     * already on this body, or when nothing worn will take it.
     */
    private hangHostFor(item: Stuff): (Stuff & Placing) | null {
      if (!MixinApi.isWearable(item) || !MixinApi.isContainer(item) || !MixinApi.isContainable(item)) return null;
      if (this.wearClaim(item).length > 0) return null;
      // Only a thing arriving from off the body: one already on it is being
      // taken in hand (`get holster from belt`), not hung again.
      if (this.tierOf(item) !== 'elsewhere') return null;
      const self = this as unknown as Stuff & Slotted;
      const hands = new Set(this.asBody().handSlots());
      const seen = new Set<string>();
      for (const [slot, occ] of self.getAllOccupants()) {
        if (hands.has(slot)) continue;
        for (const host of occ) {
          if (seen.has(host.stuffId) || host.stuffId === item.stuffId) continue;
          seen.add(host.stuffId);
          if (!MixinApi.isPlacing(host) || !host.getPlacements().includes(Placements.FROM)) continue;
          if (host.canPlace(item, Placements.FROM).ok) return host;
        }
      }
      return null;
    }

    /** The `carry.order` setting, else the default. */
    private carryOrder(): CarryOrder {
      const self = this as unknown as Stuff;
      if (!MixinApi.isEnvironment(self)) return 'hands-first';
      const v = self.getSetting('carry.order');
      return v === 'pockets-first' ? 'pockets-first' : 'hands-first';
    }

    /**
     * ⭐ The places a thing may go on this body short of a hand, in D11's
     * order: a holder shaped for its kind, worn pockets, what hangs from a
     * worn host, worn containers off the back, then the pack on the back.
     */
    private carryPlaces(): CarryPlace[] {
      const self = this as unknown as Stuff & Slotted & Container;
      const hands = new Set(this.asBody().handSlots());
      const pockets: CarryPlace[] = [];
      const hung: CarryPlace[] = [];
      const ready: CarryPlace[] = [];
      const packed: CarryPlace[] = [];
      const seen = new Set<string>();
      const worn: Stuff[] = [];
      for (const [slot, occ] of self.getAllOccupants()) {
        if (hands.has(slot)) continue;
        for (const o of occ) {
          if (seen.has(o.stuffId)) continue;
          seen.add(o.stuffId);
          worn.push(o);
          // A worn host's pockets — the regions whose way of sitting encloses
          // (a host offering one is a Container: refusal 3, W9).
          if (MixinApi.isPlacing(o) && MixinApi.isContainer(o)) {
            for (const name of o.getPlacements()) {
              const member = o.placementOf(name);
              if (member.getEncloses() && !member.getHangs()) pockets.push({ host: o, region: name });
            }
          }
          // A worn container with an inside of its own — a satchel, the pack;
          // never a coat, whose insides are the pockets above (W9).
          if (MixinApi.isContainer(o) && !o.isAgent() && o.hasInterior()) (slot === PACKED_SLOT ? packed : ready).push({ host: o });
        }
      }
      // What hangs from (or is pocketed on) a worn host and holds things: a
      // pouch on the belt, a canteen clip on the pack's strap.
      const wornIds = new Set(worn.map((w) => w.stuffId));
      for (const c of self.getContents()) {
        if (seen.has(c.stuffId) || !MixinApi.isContainer(c) || c.isAgent()) continue;
        const placed = MixinApi.isContainable(c) ? c.getPlacement() : null;
        if (placed === null || !wornIds.has(placed.host.stuffId)) continue;
        seen.add(c.stuffId);
        hung.push({ host: c });
      }
      // ⭐ …and one level into each worn host's pockets for a container
      // pocketed there (a purse in a coat pocket — W9: it is the coat's
      // contents, not the body's), ready.
      for (const w of worn) {
        if (!MixinApi.isContainer(w) || w.isAgent()) continue;
        for (const c of w.getContents()) {
          if (seen.has(c.stuffId) || !MixinApi.isContainer(c) || c.isAgent()) continue;
          const placed = MixinApi.isContainable(c) ? c.getPlacement() : null;
          if (placed === null || placed.host.stuffId !== w.stuffId) continue;
          seen.add(c.stuffId);
          hung.push({ host: c });
        }
      }
      // ⭐ A holder SHAPED for its kind — a scabbard, a holster — comes
      // first: it takes nothing else (`isShapedFor`), so it changes the
      // order only for the thing it was made for, and that thing is put up
      // there rather than standing out of an open pouch hung before it
      // (finalize drive run 15, step 6). Off the back is still off the back.
      const near = [...pockets, ...hung, ...ready];
      const shaped = near.filter((p) => p.region === undefined && (p.host as Stuff & Container).getShapedTo() !== null);
      return [...shaped, ...near.filter((p) => !shaped.includes(p)), ...packed];
    }

    /** Would `place` take `item` — the region's `canPlace`, the container's tape measure? */
    private placeTakes(place: CarryPlace, item: Stuff): boolean {
      if (place.region !== undefined) {
        const host = place.host as Stuff;
        return MixinApi.isContainable(item) && MixinApi.isPlacing(host) && host.canPlace(item, place.region).ok;
      }
      return (place.host as Stuff & Container).fitRefusal(item) === null;
    }

    // ── readying (D16) ──

    public ready(item: Stuff): ReadyRefusal | ReadiedOutcome | null {
      const self = this as unknown as Stuff;
      // A body whose plan names no hands (a beast's jaws) switches the
      // shipped way in a fight; the landing grips the weapon in the slot it
      // claims (`bringToHand`).
      if (this.asBody().handSlots().length === 0) {
        if (!MixinApi.isCombatant(self) || !CombatApi.sessionFor(self)) return null;
        const started = self.beginWeaponSwitch(item);
        return started.ok ? null : { ok: false, reason: 'already-switching' };
      }
      const refusal = this.readyRefusal(item);
      if (refusal !== null) return refusal;
      if (!this.wantsHand(item)) return { ok: true, item, moved: false, from: this.carriedAt(item) };
      // ⭐ In a fight it is the switch, generalized (D16): guard down, no
      // instrument, for the seconds its holder costs.
      if (MixinApi.isCombatant(self) && CombatApi.sessionFor(self)) {
        const started = self.beginWeaponSwitch(item);
        if (!started.ok) {
          return started.reason === 'already-switching'
            ? { ok: false, reason: 'already-switching' }
            : { ok: false, reason: 'not-on-you' };
        }
        return null;
      }
      return this.bringToHand(item);
    }

    /** Does readying `item` move it into a hand (on you, holdable, not there yet)? */
    private wantsHand(item: Stuff): boolean {
      const tier = this.tierOf(item);
      return tier !== 'hand' && tier !== 'elsewhere' && MixinApi.isSlottable(item) && this.asBody().handSlots().length > 0;
    }

    /** Every check `ready` makes, writing nothing (D-W10-3: nothing is put away for you). */
    private readyRefusal(item: Stuff): ReadyRefusal | null {
      const tier = this.tierOf(item);
      if (tier === 'hand') return null;
      if (tier === 'packed') {
        return { ok: false, reason: 'packed', facts: { by: this.packOf(item) ?? item } };
      }
      if (tier === 'elsewhere') {
        // A fixture (a bench, a cask, a bolted vice) is used where it
        // stands; anything else off this body is not yours to ready — a
        // portable thing in the room is `get`'s, one in another's grasp theirs.
        if (insideAnotherBody(this as unknown as Stuff, item)) return { ok: false, reason: 'not-on-you' };
        const fixed = MixinApi.isContainable(item) && item.isFixedInPlace();
        return fixed || !MixinApi.isSlottable(item) ? null : { ok: false, reason: 'not-on-you' };
      }
      if (!this.wantsHand(item)) return null;
      const hands = this.handsFor(item);
      if (hands === null) return { ok: false, reason: 'too-heavy' };
      const cart = this.cartInHand();
      const held = this.asBody().heldThings();
      const grip = this.openHands().length + held.length - (cart?.hands ?? 0);
      if (cart !== null && this.openHands().length >= hands && this.freeHands() < hands) {
        return { ok: false, reason: 'hands-on-cart', facts: { cart: cart.cart } };
      }
      if (grip < hands) {
        const why = this.gripWhy();
        if (why !== null) return { ok: false, reason: 'cannot-grip', facts: { why } };
      }
      // ⭐ The hands it needs must be FREE (D-W10-3): what holds them is
      // named, and the player frees them (`drop`, `unwield`, `put`).
      if (this.inTheWay(item).length > 0 || grip < hands) {
        return { ok: false, reason: 'hands-needed', facts: { hands, held, away: this.awayFor(held) } };
      }
      return null;
    }

    /** The pack on the back that holds `item`, if it is packed. */
    private packOf(item: Stuff): Stuff | null {
      const self = this as unknown as Stuff & Slotted;
      const packs = [...self.getOccupants(PACKED_SLOT)];
      const chain = MixinApi.isContainable(item) ? [item, ...item.getContainerChain()] : [item];
      return chain.find((c) => packs.some((p) => p.stuffId === c.stuffId)) ?? null;
    }

    /**
     * The FREE hand slots `item` would take: its own claim's hands when they
     * are free, else the first free ones; null when too few are free
     * (D-W10-3 — an occupied hand is never emptied for you).
     */
    private gripSlotsFor(item: Stuff): string[] | null {
      // A hand takes any slottable thing — every good (W7); a fixture or a
      // place cannot be held and is used where it is.
      if (!MixinApi.isSlottable(item)) return null;
      const self = this as unknown as Stuff & Slotted;
      const hands = this.asBody().handSlots();
      if (hands.length === 0) return null;
      const n = this.handsFor(item) ?? 1;
      let claim: string[] = [];
      if (MixinApi.isWieldable(item)) {
        const plan = SpeciesApi.tryGetBodyPlanPath(self);
        if (plan !== null) claim = item.getSlotClaim(plan).filter((s) => hands.includes(s));
      }
      // ⭐ The claim names where `wield` puts a thing when the hand is free;
      // a FREE hand beats an occupied claimed one (D9-b).
      const open = this.openHands();
      if (claim.length >= n && claim.slice(0, n).every((h) => open.includes(h))) return claim.slice(0, n);
      const picked = [...new Set([...claim.filter((h) => open.includes(h)), ...open])].slice(0, n);
      return picked.length >= n ? picked : null;
    }

    /** What holds the hands `item` needs, when too few are free — the facts of `hands-needed`. */
    private inTheWay(item: Stuff): Stuff[] {
      return this.gripSlotsFor(item) === null ? this.asBody().heldThings() : [];
    }

    /** The first held thing that WOULD go somewhere on this body, and where (the `put` a refusal names). */
    private awayFor(held: readonly Stuff[]): { held: Stuff; host: Stuff; region?: string } | null {
      for (const h of held) {
        const p = this.stowPlaceFor(h);
        if (p !== null) return p.region !== undefined ? { held: h, host: p.host, region: p.region } : { held: h, host: p.host };
      }
      return null;
    }

    /** Where `held` would be put away: the first carry place it fits, in D11's order. */
    public stowPlaceFor(held: Stuff): CarryPlace | null {
      return this.carryPlaces().find((p) => !within(p.host, held) && this.placeTakes(p, held)) ?? null;
    }

    public stow(held: Stuff): ArrivalRefusal | null {
      // In a hand — or just let go of and still on this body (`unwield`
      // releases first, so the cursed gate fires before anything moves).
      const self = this as unknown as Stuff & Slotted;
      const loose = MixinApi.isContainable(held) && held.getContainer()?.stuffId === self.stuffId && !this.isHonest(held);
      if ((this.tierOf(held) !== 'hand' && !loose) || !MixinApi.isContainable(held)) return null;
      const place = this.stowPlaceFor(held);
      if (place === null) {
        return {
          ok: false,
          reason: 'nowhere-to-carry',
          facts: { item: held, held: this.asBody().heldThings(), tried: [...new Set(this.carryPlaces().map((p) => p.host))] },
        };
      }
      if (MixinApi.isSlottable(held)) {
        for (const slot of this.asBody().handSlots()) {
          if ([...self.getOccupants(slot)].some((o) => o.stuffId === held.stuffId)) self.vacate(slot, held);
        }
      }
      if (place.region !== undefined) ContainmentApi.move(held, place.host, place.region);
      else ContainmentApi.move(held, place.host);
      return null;
    }

    public bringToHand(item: Stuff): ReadiedOutcome | ReadyRefusal {
      const self = this as unknown as Stuff & Slotted;
      // ⭐ A body whose plan names no hands grips a weapon in the slot the
      // weapon claims on that plan (a beast's jaws) — the switch's landing
      // for a handless body, here on the body rather than in combat's
      // caller (finalize A2, P11).
      if (this.asBody().handSlots().length === 0) {
        const from = this.carriedAt(item);
        const plan = SpeciesApi.tryGetBodyPlanPath(self);
        const grip = MixinApi.isWieldable(item) && plan !== null ? item.getSlotClaim(plan)[0] : undefined;
        if (grip === undefined || !MixinApi.isSlottable(item) || !self.getSlotNames().includes(grip)) {
          return { ok: true, item, moved: false, from };
        }
        const it = item as Stuff & Slottable;
        for (const occ of [...self.getOccupants(grip)]) {
          if (MixinApi.isSlottable(occ)) self.vacate(grip, occ);
        }
        for (const [slot, occ] of self.getAllOccupants()) {
          if (occ.has(it)) self.vacate(slot, it);
        }
        self.occupy(it, grip);
        return { ok: true, item, moved: true, from };
      }
      const refusal = this.readyRefusal(item);
      if (refusal !== null) return refusal;
      const from = this.carriedAt(item);
      const still: ReadiedOutcome = { ok: true, item, moved: false, from };
      if (!this.wantsHand(item)) return still;
      const slots = this.gripSlotsFor(item);
      if (slots === null || !MixinApi.isContainable(item) || !MixinApi.isSlottable(item)) return still;
      const it = item as Stuff & Containable & Slottable;
      // Out of whatever slot it sat in (a sheath), then into the hand(s).
      // Nothing is remembered (D-W10-2): where it goes after is `stow`'s
      // one documented order, or the player's `put`.
      for (const [slot, occ] of self.getAllOccupants()) {
        if (occ.has(it)) self.vacate(slot, it);
      }
      self.seatInSlots(it, slots);
      return { ok: true, item, moved: true, from };
    }

    /** Where `item` sits on this body, as facts — the readying's report. */
    private carriedAt(item: Stuff): CarriedAt {
      const self = this as unknown as Stuff & Slotted;
      const at: CarriedAt = { container: null, host: null, region: null, slot: null };
      const placed = MixinApi.isContainable(item) ? item.getPlacement() : null;
      if (placed !== null && placed.host.stuffId !== self.stuffId) {
        at.host = placed.host;
        at.region = placed.name;
        return at;
      }
      const container = MixinApi.isContainable(item) ? item.getContainer() : null;
      if (container !== null && container.stuffId !== self.stuffId) {
        at.container = container;
        return at;
      }
      const hands = new Set(this.asBody().handSlots());
      for (const [slot, occ] of self.getAllOccupants()) {
        if (!hands.has(slot) && [...occ].some((o) => o.stuffId === item.stuffId)) {
          at.slot = slot;
          return at;
        }
      }
      return at;
    }

    // ── letting go (D13) ──

    public releaseHeld(slots?: readonly string[]): Stuff[] {
      const self = this as unknown as Stuff & Slotted;
      const which = slots ?? this.asBody().handSlots();
      const place = MixinApi.isContainable(self) ? self.getContainer() : null;
      const dropped: Stuff[] = [];
      for (const slot of which) {
        if (!self.getSlotNames().includes(slot)) continue;
        for (const occupant of [...self.getOccupants(slot)]) {
          self.vacate(slot, occupant);
          // A body with nowhere to be (mid-construction, a test fixture)
          // simply drops the reference — the slot is still released.
          if (place !== null && MixinApi.isContainable(occupant)) {
            ContainmentApi.move(occupant, place);
            if (!dropped.includes(occupant)) dropped.push(occupant);
          }
        }
      }
      if (dropped.length > 0 && place !== null) {
        const things = GrammarApi.joinList(dropped.map((d) => d.presentationPhrase().indefinite()));
        const scene = MessageApi.scene(self)
          .topic('act.deed')
          .toPeers(Mml.compose`${Mml.actor(self)} lets go of ${Mml.text(things)}.`);
        if (MixinApi.isSensor(self)) {
          scene.toSelf(Mml.compose`Your grip fails, and ${Mml.text(things)} falls from your hands.`);
        }
        scene.send();
      }
      return dropped;
    }

    // ── sound (D36) ──

    public gearNoise(): 0 | 1 {
      const self = this as unknown as Stuff & Container;
      const loud = (x: Stuff): boolean => {
        if (!MixinApi.isTangible(x) || !MixinApi.isShaped(x) || !x.getShape().isRigid()) return false;
        if (MixinApi.isIntegrity(x)) return x.ringSound().rings;
        return x.getMaterial()?.hasTag('metal') ?? false;
      };
      if (this.asBody().heldThings().some(loud)) return 1;
      for (const item of self.getContents()) {
        const placed = MixinApi.isContainable(item) ? item.getPlacement() : null;
        if (placed !== null && placed.name === 'from' && loud(item)) return 1;
      }
      return 0;
    }

  }
  return CarryingMixin;
}

/** Is `host` the thing `item` itself, or inside it? */
function within(host: Stuff, item: Stuff): boolean {
  if (host.stuffId === item.stuffId) return true;
  return MixinApi.isContainable(host) && host.getContainerChain().some((c) => c.stuffId === item.stuffId);
}

/** Is `item` inside some other agent than `me`? The first body up its chain answers. */
function insideAnotherBody(me: Stuff, item: Stuff): boolean {
  const body = MixinApi.isContainable(item) ? item.getContainerChain().find((c) => c.isAgent()) : undefined;
  return body !== undefined && body.stuffId !== me.stuffId;
}
