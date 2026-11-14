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
 * chooses. `carrier.directMove(item)` goes around the routing (the body's
 * own regions, or a refusal). The RULE that nothing sits loose is every
 * body's (`Creature.arrivalFor`); a body that does not carry (a fish) is
 * not routed, and `move` throws. The capability composes only on the
 * classes that carry: `Character`, `DraftAnimal`, `KeptAnimal` and
 * ranching's `WorkingAnimal`.
 *
 * ## What it knows
 *
 * - **Hands** (D9–D10): `handSlots`, `freeHands`, `handsFor`.
 * - **Tiers** (D15): `tierOf` — hand · ready · packed · elsewhere.
 * - **Homes** (D14): `setHome`/`homeOf` — runtime, persisted by contents
 *   path (`captureSlice`/`hydrateSlice`), forgotten lazily when either end
 *   leaves the body.
 * - **Readying** (D16): `ready` — the held thing goes home, the named one
 *   comes to hand; in a fight it is the generalized weapon switch.
 * - **Routing** (W8, 2026-11-13): `routeArrival` — on the body, then a bag or the floor.
 * - **Letting go** (D13): `releaseHeld`.
 * - **The restore** (D32): `placeLoose` — the one overflow (the residence,
 *   else where the body stands), the carrier's own explicit choice.
 *
 * ## Composition
 *
 * On the carrier classes, over `Creature` (the base constraint): it reads
 * the slot substrate (`Slotted`, `Attired`) and the burden gauge reads it.
 *
 * Operational reference: `docs/subsystems/carrying.md`.
 */

import { Mixins, type MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Containable, PackedRefusal } from '../spatial/Containable';
import type { Container } from '../spatial/Container';
import type { Placing } from '../spatial/Placing';
import type { Slottable } from './Slottable';
import type { Slotted } from './Slotted';
import type { Creature } from '../creature/Creature';
import type { Arrival, ArrivalRefusal } from '../spatial/Container';
import type { ActRefusal } from '../craft/ActPlan';
import type { CaptureContext, HydrateContext, HomeEnd, HomesSlice, MixinSlice } from '../persistence/PersistenceSlice';
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

/** Why readying a thing failed (D16) — every one names a way out. */
export type ReadyRefusal =
  | PackedRefusal
  | ActRefusal<'hands-full', { held: Stuff; home: Stuff | null }>
  | ActRefusal<'hands-needed', { hands: number; held: Stuff[] }>
  | ActRefusal<'hands-on-cart', { cart: Stuff }>
  | ActRefusal<'cannot-grip', { why: string }>
  | ActRefusal<'too-heavy'>
  | ActRefusal<'not-on-you'>
  | ActRefusal<'pick-up', { item: Stuff }>
  | ActRefusal<'already-switching'>;

/**
 * ⭐ A route on a carrier, named (owner, 2026-11-13) — the routing's own
 * choices in `Arrival`'s vocabulary: `seat` these slots (a hand, a wear
 * claim), `pair` on a worn host's region (a pocket, the belt's `from`),
 * `into` a bag this body carries, or `carried` — the routing short of the
 * floor (on the body, else the first bag it fits: what `get` does).
 * {@link Carrying.directMove} takes THIS route or refuses; `move` takes the
 * first route that takes it, and sets it down when none does.
 */
export type CarryRoute =
  | Extract<Arrival, { kind: 'seat' | 'pair' }>
  | { kind: 'into'; container: Stuff & Container }
  | { kind: 'carried' };

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
 * that came to hand and where it came FROM, and each held thing put away
 * and where it went. `moved: false` — nothing needed to move.
 */
export interface ReadiedOutcome {
  ok: true;
  item: Stuff;
  moved: boolean;
  from: CarriedAt;
  stowed: { held: Stuff; at: CarriedAt }[];
}

/** A home's host: a container on the body, or a placing host whose region it is. */
export type HomeHost = (Stuff & Container) | (Stuff & Placing);

export interface Carrying {
  /**
   * How many hands are empty and can close on something (`Vitals.canGrip`),
   * less the handles of a cart this body pulls (D18).
   */
  freeHands(): number;
  /** ⭐ How near `thing` is to the hand (D15); `elsewhere` when it is not on this body. */
  tierOf(thing: Stuff): CarryTier;
  /**
   * Where `item` goes back to on this body, or null (D14): the host (a
   * container on the body, or a placing host) and, for a pocket, the
   * region. Forgotten when either end has left.
   */
  homeOf(item: Stuff): { host: HomeHost; region?: string } | null;
  /**
   * Remember `home` (a container on this body, or — with `region` — a
   * placing host's region: a coat's pocket) as where `item` goes back to.
   */
  setHome(item: Stuff, home: HomeHost, region?: string): void;
  /**
   * ⭐ Is `item` honestly on this body (D11)? A slot occupant (held, worn);
   * or placed on a host that is itself honest here (a key in a worn coat's
   * pocket, a pouch hung from a worn belt); or inside such a thing. Loose in
   * the contents — what the flip's veto refuses — is not; nor is a thing
   * that is not on this body at all.
   */
  isHonest(item: Stuff): boolean;
  /**
   * ⭐ Bring `item` to hand (D16). In hand already → ok; on you → the hand
   * it needs is freed (what is in it goes home; never dropped for you) and
   * it comes out; packed → refused, naming the pack; in the room → used
   * where it stands. In a fight it is a guarded switch priced by
   * {@link readySeconds}.
   */
  ready(item: Stuff): ReadyRefusal | ReadiedOutcome | null;
  /**
   * What must leave the hands for `item` to come to hand (D16) — the
   * held things in the way of its grip. Combat prices a switch by them.
   */
  handsToFree(item: Stuff): Stuff[];
  /**
   * Put `held` away — to its home if it still takes it; homeless, to the
   * first place on you it fits (which becomes its home). Refuses
   * `hands-full` naming it when neither will take it. Never drops it.
   */
  stow(held: Stuff): ReadyRefusal | null;
  /**
   * Seat `item` in the hand(s) it needs now, stowing what is in the way —
   * the body of `ready`, and the completion of a fight's switch. Quiet: the
   * caller tells.
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
  /** ⭐ D32: place everything loose on this body (a restore's first load). */
  placeLoose(): Promise<Stuff[]>;
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
   * ⭐⭐ The routing made explicit (owner, 2026-11-13): `item` takes exactly
   * one route or nothing moves and the refusal is returned. No `route`:
   * ON the body — a hand, a pocket, a hook, the body's own choice of its
   * regions (never onward to a bag). A `route` names which: `seat` these
   * slots, `pair` on a worn host's region, `into` a bag this body carries,
   * `carried` — on the body, else the first bag it fits.
   * Never the floor — that is not on the carrier; only `move`'s routing
   * sets a thing down. For a handed act that must refuse before money moves
   * (`buy`, `give`, `put X in <person>`, a store's withdrawal) and staging
   * that pins an exact state; everything else calls `ContainmentApi.move`.
   */
  directMove(item: Stuff & Containable, route?: CarryRoute): ArrivalRefusal | null;
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

    /**
     * Where this body's things go back to (D14) — runtime, keyed by
     * stuffId, persisted by contents path. ⚠ Not a field: a stuffId does
     * not survive a restart; the slice is the durable form.
     */
    private _homes = new Map<string, { host: HomeHost; region?: string }>();

    /** This carrier as the body it is (its hands are the slot substrate's — `Attired`). */
    private asBody(): Creature {
      return this as unknown as Creature;
    }

    // ── persistence (D14): the carrier persists what it knows, by path ──

    /**
     * Persistence-spine capture hook: each home as two ends named by
     * chattel id or contents path (`HomesSlice`). The `SlottedMixin`
     * precedent — never a stuffId.
     */
    static captureSlice(host: Stuff, ctx: CaptureContext): HomesSlice {
      const self = host as unknown as Stuff & Carrying;
      const homes: HomesSlice['homes'] = [];
      const c = self as unknown as CarryingMixin;
      for (const [id, home] of c._homes) {
        const item = c.homeItemById(id);
        if (item === null || self.homeOf(item) === null) continue;
        const a = endOf(host, item, ctx);
        const b = endOf(host, home.host, ctx);
        if (a !== null && b !== null) {
          homes.push({ item: a, home: b, ...(home.region !== undefined ? { region: home.region } : {}) });
        }
      }
      return { homes };
    }

    /** Restore the homes after the contents (pass 4 runs after them). */
    static async hydrateSlice(host: Stuff, slice: MixinSlice, _ctx: HydrateContext): Promise<void> {
      const homes = (slice as Partial<HomesSlice>).homes;
      if (!Array.isArray(homes)) return;
      const self = host as unknown as Stuff & Carrying;
      for (const { item, home, region } of homes) {
        const i = resolveEnd(host, item);
        const h = resolveEnd(host, home);
        if (i === null || h === null) continue;
        if (typeof region === 'string' && MixinApi.isPlacing(h)) self.setHome(i, h, region);
        else if (MixinApi.isContainer(h)) self.setHome(i, h);
      }
    }

    /** The live thing behind a home key, while it is still on this body. */
    private homeItemById(id: string): Stuff | null {
      const self = this as unknown as Stuff & Container;
      const stack: Stuff[] = [...self.getContents()];
      for (let i = 0; i < stack.length && i < 2048; i++) {
        const s = stack[i]!;
        if (s.stuffId === id) return s;
        if (MixinApi.isContainer(s) && !s.isAgent()) stack.push(...s.getContents());
      }
      return null;
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
      const longest = MixinApi.isTangible(item) ? item.getDimensions()?.longest() ?? null : null;
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

    // ── homes (D14) ──

    public homeOf(item: Stuff): { host: HomeHost; region?: string } | null {
      const home = this._homes.get(item.stuffId) ?? null;
      if (home === null) return null;
      // Lazily forgotten: a home is knowledge of THIS body's things, so
      // either end leaving the body (dropped, given, the pouch sold)
      // retires it. No hook on `drop`/`give` is needed.
      if (this.tierOf(item) === 'elsewhere' || this.tierOf(home.host) === 'elsewhere') {
        this._homes.delete(item.stuffId);
        return null;
      }
      return home;
    }

    public setHome(item: Stuff, home: HomeHost, region?: string): void {
      if (item.stuffId === home.stuffId) return;
      this._homes.set(item.stuffId, region !== undefined ? { host: home, region } : { host: home });
    }

    // ── honesty (D11) ──

    public isHonest(item: Stuff): boolean {
      const self = this as unknown as Stuff & Slotted;
      const seen = new Set<string>();
      let cur: Stuff = item;
      for (let i = 0; i < 32; i++) {
        if (seen.has(cur.stuffId)) return false;
        seen.add(cur.stuffId);
        const up: Stuff | null = MixinApi.isContainable(cur) ? cur.getContainer() : null;
        if (up === null) return false;
        if (up.stuffId !== self.stuffId) {
          // Inside something else: honest when that is, and it is not a body.
          if (up.isAgent()) return false;
          cur = up;
          continue;
        }
        // Directly on this body: a slot occupant, or placed on an honest host.
        for (const [, occ] of self.getAllOccupants()) {
          if ([...occ].some((o) => o.stuffId === cur.stuffId)) return true;
        }
        const placed = MixinApi.isContainable(cur) ? cur.getPlacement() : null;
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
     * the body and moves it on. `how.onBody` asks the body's own places
     * only (`directMove`).
     *
     * @hook
     */
    public arrivalFor(item: Stuff & Containable, how?: { placed?: boolean; onBody?: boolean }): Arrival {
      const base = super.arrivalFor(item, how);
      if (base.kind === 'contents') return base;
      // The routing's first choice (bags in `carry.order`); a bag it would
      // choose is not ON the body, so it answers `refuse` and `move` routes
      // it there. `onBody`: the body's own places only.
      return this.arrivalOf(this.resolveReceive(item, how?.onBody !== true));
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
        case 'wear':
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

    /** See {@link Carrying.directMove}. Through the chokepoint, after the route's own dry answer. */
    public directMove(item: Stuff & Containable, route?: CarryRoute): ArrivalRefusal | null {
      const self = this as unknown as Stuff & Container & Slotted;
      if (route === undefined) {
        const arrival = this.arrivalFor(item, { placed: false, onBody: true });
        if (arrival.kind === 'refuse') return arrival.refusal;
        ContainmentApi.move(item, self);
        return null;
      }
      const nowhere = (tried: Stuff[]): ArrivalRefusal => ({
        ok: false,
        reason: 'nowhere-to-carry',
        facts: { item, held: this.asBody().heldThings(), tried },
      });
      switch (route.kind) {
        case 'carried': {
          const where = this.resolveReceive(item, true);
          const onBody = this.arrivalOf(where);
          if (onBody.kind !== 'refuse') {
            ContainmentApi.move(item, self);
            return null;
          }
          const bag = this.bagOf(where);
          if (bag === null) return onBody.refusal;
          ContainmentApi.move(item, bag);
          return null;
        }
        case 'seat': {
          const ok =
            MixinApi.isSlottable(item) &&
            route.slots.length > 0 &&
            route.slots.every(
              (slot) =>
                self.canOccupy(item as Stuff & Slottable, slot) &&
                self.getOccupants(slot).size < (self.getSlotSpec(slot)?.capacity ?? 1),
            );
          if (!ok) return nowhere([]);
          self.seatInSlots(item as Stuff & Containable & Slottable, route.slots);
          return null;
        }
        case 'pair': {
          if (this.tierOf(route.host) === 'elsewhere' || !route.host.canPlace(item, route.region).ok) {
            return nowhere([route.host]);
          }
          ContainmentApi.move(item, route.host, route.region);
          return null;
        }
        case 'into': {
          const bag = route.container;
          if (this.tierOf(bag) === 'elsewhere' || within(bag, item)) return nowhere([bag]);
          // The routing's own test of a bag (`placeTakes`): its tape measure.
          const fit = bag.fitRefusal(item);
          if (fit !== null) return fit;
          ContainmentApi.move(item, bag);
          return null;
        }
      }
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
      const bag = this.bagOf(this.resolveReceive(item, true));
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
     * performs (`bags` true: a worn or carried bag too), and that
     * `directMove` reads with `bags` false (only the places that are the
     * body) — so the routing and its bypass can never disagree.
     */
    private resolveReceive(
      item: Stuff,
      bags: boolean,
    ):
      | { kind: 'held' }
      | { kind: 'wear'; slots: string[] }
      | { kind: 'merge'; into: Stuff; item: Stuff }
      | { kind: 'hand'; slots: string[] }
      | { kind: 'place'; place: CarryPlace; item: Stuff }
      | { kind: 'refused'; refusal: ReceiveRefusal } {
      if (this.tierOf(item) === 'hand') return { kind: 'held' };
      // ⭐ A body with no hands that is HANDED its tack puts it on (size and
      // carrying drive, step 18): a mule carries only in what it wears, and
      // `put pack saddle in mule` had nowhere to go — no hand, no pocket.
      // The claim's slots must be free; worn already is nothing to do.
      if (this.asBody().handSlots().length === 0 && MixinApi.isSlottable(item)) {
        const claim = this.wearClaim(item);
        const self = this as unknown as Stuff & Slotted;
        if (claim.length > 0 && claim.every((slot) => self.canOccupy(item as Stuff & Slottable, slot))) {
          return { kind: 'wear', slots: claim };
        }
      }
      const hang = this.hangHostFor(item);
      if (hang !== null) return { kind: 'place', place: { host: hang, region: Placements.FROM }, item };
      const self = this as unknown as Stuff;
      const merge = this.mergeTargetFor(item);
      if (merge !== null && (bags || merge.stuffId === self.stuffId)) return { kind: 'merge', into: merge, item };
      const hands = this.handsFor(item);
      if (hands === null) return { kind: 'refused', refusal: { ok: false, reason: 'too-heavy' } };
      const order: CarryOrder = this.carryOrder();
      const open = this.openHands();
      const handOk = this.freeHands() >= hands && MixinApi.isSlottable(item);
      const hand = { kind: 'hand' as const, slots: open.slice(0, hands) };
      // Never into itself, nor into something it holds.
      // ⭐ `bags` false: only the places that ARE the body (a worn pocket);
      // a bag is a container of its own — the routing's second move.
      const every = this.carryPlaces().filter((p) => !within(p.host, item));
      const places = bags ? every : every.filter((p) => p.region !== undefined);
      const fits = places.find((p) => this.placeTakes(p, item)) ?? null;
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
            tried: [...new Set(places.map((p) => p.host))],
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

    /** The room this body leases (its residence, D32), when it is standing; else null. */
    private async residenceRoom(): Promise<(Stuff & Container) | null> {
      const self = this as unknown as Stuff;
      if (!MixinApi.isHasInteractive(self) && !self.getIdentityPath()?.startsWith('/platform/agent/Avatar/')) return null;
      const holder = self.getIdentityPath();
      if (!holder) return null;
      const { ParcelApi } = await import('../../api/parcel');
      const unit = await ParcelApi.heldUnitOf(holder).catch(() => null);
      if (unit === null) return null;
      const extent = unit.getExtent();
      const byPath = StuffApi.findByTemplatePath(extent);
      const live = [...StuffApi.findByIdentityPath(extent), ...(byPath ? [byPath] : [])].find(
        (x) => MixinApi.isContainer(x) && x.isPlace(),
      );
      return live !== undefined ? (live as Stuff & Container) : null;
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
          if (body !== undefined && MixinApi.isCarrying(body)) {
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

    /**
     * ⭐ D32: put every thing loose on this body where a carried thing goes
     * — on a restore (`onRestored`), or after anything that could have left
     * one loose. A pre-flip inventory is placed on its first load.
     */
    public async placeLoose(): Promise<Stuff[]> {
      const self = this as unknown as Stuff & Container & Containable;
      const loose = self.getContents().filter((c) => !this.isHonest(c) && !c.isAgent());
      for (const item of loose) {
        if (item.isDestroyed() || this.isHonest(item)) continue;
        const at = self.getContainer();
        // Out of the body first, so it arrives (and with nowhere to be, it stays).
        if (at === null) continue;
        ContainmentApi.move(item as Stuff & Containable, at as Stuff & Container);
        // The body's own answer (its arrival rule, read dry): on it, else a
        // bag it carries, else the one overflow — each landing one true move.
        if (this.arrivalFor(item as Stuff & Containable).kind !== 'refuse') {
          ContainmentApi.move(item as Stuff & Containable, self);
          continue;
        }
        const bag = this.bagOf(this.resolveReceive(item, true));
        if (bag !== null) {
          ContainmentApi.move(item as Stuff & Containable, bag);
          continue;
        }
        await this.overflow(item as Stuff & Containable, at as Stuff & Container);
      }
      return loose;
    }

    /**
     * ⭐ The one overflow (D32): what a restore found loose and no place on
     * the body takes goes to a player's RESIDENCE with a line queued to
     * them (*your crate would not fit anywhere on you; it is in your
     * room*), or — an NPC, or a player with no room standing — stays where
     * the body stands, the author told (`DiagnosticApi`). Never lost.
     */
    private async overflow(item: Stuff & Containable, here: Stuff & Container): Promise<void> {
      const self = this as unknown as Stuff & Containable;
      // ⭐ Named as its owner knows it, never "something" (the drive, step
      // 21). The line is said once the thing is OFF the body, so the sight
      // gate would obscure it; `bare` consults no perception gate
      // (presentation.md) — it is yours, you know what it is.
      const yours = `Your ${item.presentationPhrase().bare()}`;
      const home = await this.residenceRoom();
      if (home !== null) {
        ContainmentApi.move(item, home);
        if (MixinApi.isSensor(self)) {
          MessageApi.scene(self)
            .topic('act.deed')
            .toSelf(Mml.compose`${yours} would not fit anywhere on you; it is in your room.`)
            .send();
        }
        return;
      }
      if (item.getContainer() !== here) ContainmentApi.move(item, here);
      if (MixinApi.isSensor(self) && MixinApi.isHasInteractive(self)) {
        MessageApi.scene(self)
          .topic('act.deed')
          .toSelf(Mml.compose`${yours} would not fit anywhere on you; it is at your feet.`)
          .send();
        return;
      }
      const { DiagnosticApi } = await import('../../api/diagnostics');
      await DiagnosticApi.record({
        path: self.getTemplatePath() ?? self.stuffId,
        severity: 'warning',
        message:
          `${item.getTemplatePath() ?? item.stuffId} found no place on ` +
          `${self.getTemplatePath() ?? self.stuffId} (no free hand, nothing worn it fits) and was ` +
          `set down where it stands — give the body something to carry it in, or fewer things.`,
        channel: 'location-graph',
      });
    }

    /**
     * ⭐ D32: a restored carrier puts anything it finds loose where a
     * carried thing goes — the first load after the flip places a pre-flip
     * inventory. Chained from `Persistable.onRestored`, after `Creature`'s
     * (the species row first).
     */
    public async onRestored(): Promise<void> {
      await super.onRestored();
      if (this.placesLooseOnRestore()) await this.placeLoose();
    }

    /**
     * Whether the restore itself places what it finds loose (D32). A body
     * nobody attaches to places it at once; a PLAYER's body waits for its
     * session (`Avatar.enter`), so the lines it says are heard live.
     *
     * @hook Default `true`. `Avatar` answers `false` and places at `enter`.
     */
    protected placesLooseOnRestore(): boolean {
      return true;
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
     * order: worn pockets, what hangs from a worn host, worn containers off
     * the back, then the pack on the back.
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
      return [...pockets, ...hung, ...ready, ...packed];
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
      // A body whose plan names no hands (an old fixture, a beast's
      // mouth before W6) switches the shipped way in a fight.
      if (this.asBody().handSlots().length === 0) {
        if (!MixinApi.isCombatant(self) || !CombatApi.sessionFor(self)) return null;
        const started = self.beginWeaponSwitch(item);
        return started.ok ? null : { ok: false, reason: 'already-switching' };
      }
      const refusal = this.readyRefusal(item);
      if (refusal !== null) return refusal;
      if (!this.wantsHand(item)) return { ok: true, item, moved: false, from: this.carriedAt(item), stowed: [] };
      // ⭐ In a fight it is the switch, generalized (D16): guard down, no
      // instrument, for the seconds the two halves cost.
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
      return tier !== 'hand' && tier !== 'elsewhere' && MixinApi.isSlottable(item) && this.gripSlotsFor(item) !== null;
    }

    /** Every check `ready` makes, writing nothing. */
    private readyRefusal(item: Stuff): ReadyRefusal | null {
      const tier = this.tierOf(item);
      if (tier === 'hand') return null;
      if (tier === 'packed') {
        return { ok: false, reason: 'packed', facts: { by: this.packOf(item) ?? item } };
      }
      if (tier === 'elsewhere') {
        // In somebody else's grasp: not yours to use. A fixture (a bench, a
        // cask, a bolted vice) is used where it stands; a thing you could
        // carry is picked up first (the flip, W7: `get` is the receiving act).
        if (insideAnotherBody(this as unknown as Stuff, item)) return { ok: false, reason: 'not-on-you' };
        const fixed = MixinApi.isContainable(item) && item.isFixedInPlace();
        return fixed || !MixinApi.isSlottable(item) ? null : { ok: false, reason: 'pick-up', facts: { item } };
      }
      if (!this.wantsHand(item)) return null;
      const hands = this.handsFor(item);
      if (hands === null) return { ok: false, reason: 'too-heavy' };
      const cart = this.cartInHand();
      const grip = this.openHands().length + this.asBody().heldThings().length - (cart?.hands ?? 0);
      if (cart !== null && this.openHands().length >= hands && this.freeHands() < hands) {
        return { ok: false, reason: 'hands-on-cart', facts: { cart: cart.cart } };
      }
      if (grip < hands) {
        const why = this.gripWhy();
        if (why !== null) return { ok: false, reason: 'cannot-grip', facts: { why } };
        return { ok: false, reason: 'hands-needed', facts: { hands, held: this.asBody().heldThings() } };
      }
      // What has to come out of the hands, and will it go?
      for (const held of this.inTheWay(item, hands)) {
        const r = this.stowRefusal(held);
        if (r !== null) return r;
      }
      return null;
    }

    /** The pack on the back that holds `item`, if it is packed. */
    private packOf(item: Stuff): Stuff | null {
      const self = this as unknown as Stuff & Slotted;
      const packs = [...self.getOccupants(PACKED_SLOT)];
      let cur: Stuff | null = item;
      for (let i = 0; cur !== null && i < 32; i++) {
        if (packs.some((p) => p.stuffId === cur!.stuffId)) return cur;
        cur = MixinApi.isContainable(cur) ? cur.getContainer() : null;
      }
      return null;
    }

    /** The hand slots `item` would take: its own claim's hands, else the first free ones. */
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
      // a FREE hand beats an occupied claimed one (D9-b — the drive, step
      // 7: with the right hand on a shield and the left empty, `fight draw`
      // tried to put the shield away to draw into the right).
      const open = this.openHands();
      if (claim.length >= n && claim.slice(0, n).every((h) => open.includes(h))) return claim.slice(0, n);
      // Free hands first (claimed ones before the rest), then the occupied ones (their holders go home).
      const order = [...claim.filter((h) => open.includes(h)), ...open, ...claim, ...hands.filter((h) => self.isSlotOccupied(h))];
      const picked = [...new Set(order)].slice(0, n);
      return picked.length >= n ? picked : null;
    }

    public handsToFree(item: Stuff): Stuff[] {
      return this.inTheWay(item, this.handsFor(item) ?? 1);
    }

    /** What must leave the hands for `item` to take `hands` of them. */
    private inTheWay(item: Stuff, hands: number): Stuff[] {
      const self = this as unknown as Stuff & Slotted;
      const slots = this.gripSlotsFor(item) ?? [];
      const out: Stuff[] = [];
      for (const s of slots.slice(0, hands)) {
        for (const o of self.getOccupants(s)) if (o.stuffId !== item.stuffId && !out.includes(o)) out.push(o);
      }
      return out;
    }

    /**
     * Would `held` go away? `null` = yes: to its home, or — homeless — to
     * the first place on you it fits (the flip, W7: never loose). Refuses
     * `hands-full` naming it otherwise; never drops it for you.
     */
    private stowRefusal(held: Stuff): ReadyRefusal | null {
      if (this.tierOf(held) !== 'hand') return null;
      const home = this.homeOf(held);
      if (home !== null && this.homeTakes(held)) return null;
      if (home === null && this.stowPlaceFor(held) !== null) return null;
      return { ok: false, reason: 'hands-full', facts: { held, home: home?.host ?? null } };
    }

    /** Where a homeless held thing would be put away: the first carry place it fits. */
    private stowPlaceFor(held: Stuff): CarryPlace | null {
      return this.carryPlaces().find((p) => !within(p.host, held) && this.placeTakes(p, held)) ?? null;
    }

    /** Would `held`'s home take it back — its pocket's `canPlace`, its container's tape measure? */
    private homeTakes(held: Stuff): boolean {
      const home = this.homeOf(held);
      if (home === null) return false;
      const { host, region } = home;
      if (region !== undefined && MixinApi.isPlacing(host) && MixinApi.isContainer(host)) {
        return this.placeTakes({ host, region }, held);
      }
      // A sibling-pair home (a clip on the belt): the region's own fit.
      if (region !== undefined && MixinApi.isPlacing(host)) {
        return MixinApi.isContainable(held) && host.canPlace(held, region).ok;
      }
      return MixinApi.isContainer(host) && this.placeTakes({ host }, held);
    }

    public stow(held: Stuff): ReadyRefusal | null {
      const refusal = this.stowRefusal(held);
      if (refusal !== null) return refusal;
      const self = this as unknown as Stuff & Slotted;
      if (MixinApi.isSlottable(held)) {
        for (const slot of this.asBody().handSlots()) {
          if ([...self.getOccupants(slot)].some((o) => o.stuffId === held.stuffId)) self.vacate(slot, held);
        }
      }
      const home = this.homeOf(held);
      if (!MixinApi.isContainable(held)) return null;
      if (home !== null) {
        const { host, region } = home;
        if (region !== undefined && MixinApi.isPlacing(host)) ContainmentApi.move(held, host, region);
        else if (MixinApi.isContainer(host)) ContainmentApi.move(held, host);
        return null;
      }
      // Homeless: the first place it fits — and that becomes its home.
      const place = this.stowPlaceFor(held);
      if (place === null) return null;
      if (place.region !== undefined) {
        ContainmentApi.move(held, place.host, place.region);
        this.setHome(held, place.host, place.region);
      } else {
        ContainmentApi.move(held, place.host);
        this.setHome(held, place.host);
      }
      return null;
    }

    public bringToHand(item: Stuff): ReadiedOutcome | ReadyRefusal {
      const refusal = this.readyRefusal(item);
      if (refusal !== null) return refusal;
      const from = this.carriedAt(item);
      const still: ReadiedOutcome = { ok: true, item, moved: false, from, stowed: [] };
      if (!this.wantsHand(item)) return still;
      const hands = this.handsFor(item) ?? 1;
      // ⭐ What each hand does is reported (size and carrying drive, step 4:
      // the readying was silent — the compass simply appeared); the
      // controller words it: *you sheathe your sword and pull out your compass.*
      const stowed: ReadiedOutcome['stowed'] = [];
      for (const held of this.inTheWay(item, hands)) {
        const r = this.stow(held);
        if (r !== null) return r;
        stowed.push({ held, at: this.carriedAt(held) });
      }
      const slots = this.gripSlotsFor(item);
      if (slots === null || !MixinApi.isContainable(item) || !MixinApi.isSlottable(item)) return still;
      const self = this as unknown as Stuff & Slotted;
      const it = item as Stuff & Containable & Slottable;
      // Out of whatever slot it sat in (a sheath), then into the hand(s).
      for (const [slot, occ] of self.getAllOccupants()) {
        if (occ.has(it)) self.vacate(slot, it);
      }
      // It remembers where it came from — that is where it goes back. ⭐ The
      // pocket before the container (W9): a key out of a pocket is the
      // coat's contents, and its home is the pocket, not the coat.
      const container = it.getContainer();
      const pair = it.getPlacement();
      if (!this.homeOf(it)) {
        if (pair !== null && pair.host.stuffId !== self.stuffId && MixinApi.isPlacing(pair.host)) {
          // Out of a pocket (or off a clip): that is where it goes back.
          this.setHome(it, pair.host, pair.name);
        } else if (container !== null && container.stuffId !== self.stuffId && MixinApi.isContainer(container)) {
          this.setHome(it, container);
        }
      }
      self.seatInSlots(it, slots);
      return { ok: true, item, moved: true, from, stowed };
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
        if (!MixinApi.isTangible(x) || x.getShape()?.isRigid() === false) return false;
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
  let cur: Stuff | null = host;
  for (let i = 0; cur !== null && i < 32; i++) {
    if (cur.stuffId === item.stuffId) return true;
    cur = MixinApi.isContainable(cur) ? cur.getContainer() : null;
  }
  return false;
}

/** Is `item` inside some other agent than `me`? */
function insideAnotherBody(me: Stuff, item: Stuff): boolean {
  let cur: Stuff | null = MixinApi.isContainable(item) ? item.getContainer() : null;
  for (let i = 0; cur !== null && i < 32; i++) {
    if (cur.stuffId === me.stuffId) return false;
    if (cur.isAgent()) return true;
    cur = MixinApi.isContainable(cur) ? cur.getContainer() : null;
  }
  return false;
}

/** One end of a home, as the slice names it: chattel id, else contents path. */
function endOf(host: Stuff, thing: Stuff, ctx: CaptureContext): HomeEnd | null {
  if (MixinApi.isChattel(thing) && thing.isOwnerPersisted()) return { kind: 'chattel', chattelId: thing.getChattelId() };
  const path: number[] = [];
  let cur: Stuff = thing;
  for (let i = 0; i < 32; i++) {
    const up: Stuff | null = MixinApi.isContainable(cur) ? cur.getContainer() : null;
    if (up === null) return null;
    if (up.stuffId === host.stuffId) {
      const top = ctx.indexOf(cur);
      if (top < 0) return null;
      path.unshift(top);
      return { kind: 'path', path, templatePath: thing.getTemplatePath() ?? '' };
    }
    if (!MixinApi.isContainer(up)) return null;
    const at = up.getContents().indexOf(cur as Stuff & Containable);
    if (at < 0) return null;
    path.unshift(at);
    cur = up;
  }
  return null;
}

/** The live thing a slice end names on `host`, or null when it no longer resolves. */
function resolveEnd(host: Stuff, end: HomeEnd): Stuff | null {
  if (end.kind === 'chattel') {
    return MixinApi.isEstate(host) ? host.getEstateLive(end.chattelId) : null;
  }
  if (!MixinApi.isContainer(host) || end.path.length === 0) return null;
  // The first index is into the body's CAPTURED order — the same three
  // skips the Container slice makes, so the restored order matches.
  const top = host.getContents().filter(
    (item) =>
      !MixinApi.isHasInteractive(item) &&
      !MixinApi.isBehaved(item) &&
      !(MixinApi.isChattel(item) && item.isOwnerPersisted()),
  );
  let cur: Stuff | null = top[end.path[0]!] ?? null;
  for (const i of end.path.slice(1)) {
    if (cur === null || !MixinApi.isContainer(cur)) return null;
    cur = cur.getContents()[i] ?? null;
  }
  return cur !== null && (cur.getTemplatePath() ?? '') === end.templatePath ? cur : null;
}
