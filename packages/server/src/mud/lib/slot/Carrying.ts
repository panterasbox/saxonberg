/**
 * CarryingMixin — **the one way a thing comes onto a body, and what the
 * body knows about the things it carries.**
 *
 * ⭐ `receive(item, opts)` is the receiving act (size-and-carrying D11): a
 * body is handed something — it picks it up, is given it, makes it, is
 * granted it — and the body decides where it goes. The census
 * (`lint:body-moves`) counts every caller that still does
 * `ContainmentApi.move(item, <a body>)` directly; the ports move them here,
 * and the flip (W7) installs the destination veto that makes this the only
 * way on.
 *
 * ## What W4 gave it
 *
 * - **Hands** (D9–D10): `handSlots` (the slots whose body part serves
 *   manipulation), `freeHands` (empty, able to grip, less a hitched cart's
 *   handles), `handsFor` (one hand, two, or too heavy — derived from the
 *   holder's own carrying capacity and stature, or two by an authored use).
 * - **Tiers** (D15): `tierOf` — hand · ready · packed · elsewhere, read off
 *   the slots, the placement pairs and the `back` slot. `PerceptionLogic`'s
 *   binder ties on it.
 * - **Homes** (D14): `setHome`/`homeOf` — runtime knowledge, persisted by
 *   contents path (`captureSlice`/`hydrateSlice`), forgotten lazily when
 *   either end leaves the body (so `drop`/`give` need no hook).
 * - **Readying** (D16): `ready` — the held thing goes home, the named one
 *   comes to hand; in a fight it is the generalized weapon switch, priced
 *   by `readySeconds` (two halves, each by its holder).
 * - **Letting go** (D13): `releaseHeld` — what the hands hold goes to the
 *   enclosing place. `Vitals` calls it when the body goes under and when a
 *   part is severed.
 * - `canReceive` (the dry resolution of D11's order), `gearNoise` (D36),
 *   `awkwardnessOf` (D12's held-load factor).
 *
 * ⚠ **What did NOT change at W4: `receive` without a slot still lands the
 * thing loose in the body's contents**, exactly as every caller's direct
 * move did (the veto is off; D31). `canReceive` already answers what the
 * flip will do — a free hand, else the worn containers in tier order, else
 * a refusal in words — so W7 swaps one line. Likewise a held thing with no
 * home is stowed LOOSE until the flip (today's carrying), and refuses
 * `hands-full` only when its home will not take it back.
 *
 * ## Why `lib/slot/`
 *
 * The folder that owns the body-side affordances (`Wearable`, `Wieldable`,
 * `Attired`, `Slotted`) is `lib/slot/` (embodiment.md's table). A
 * carrier's hands are slots and `receive` seats into them.
 *
 * ## Composition
 *
 * On `Creature`, outer of `Attired` and inner of `LoadBearing` — it reads
 * the slot substrate (inner) and the burden gauge reads it (outer, for the
 * awkwardness and the hands). Needs `Slotted` beneath it and `Container`
 * on the finished host, both of which `Creature` composes.
 *
 * Operational reference: `docs/plans/size-and-carrying-plan.md` (D9–D18)
 * until the flip graduates `docs/subsystems/carrying.md`.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Containable } from '../spatial/Containable';
import type { Container } from '../spatial/Container';
import type { Placing } from '../spatial/Placing';
import type { Slottable } from './Slottable';
import type { Slotted } from './Slotted';
import type { ActRefusal } from '../craft/ActPlan';
import type { CaptureContext, HydrateContext, HomeEnd, HomesSlice, MixinSlice } from '../persistence/PersistenceSlice';
import { ContainmentApi } from '../../api/containment';
import { Placements } from '../spatial/Placement';
import { MixinApi } from '../../api/mixin';
import { SpeciesApi } from '../../api/species';
import { CombatApi } from '../../api/combat';
import { AppApi } from '../../api/app';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { GrammarApi } from '../../api/grammar';
import { AppSettingKeys } from '../config/AppSettings';
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
  /** Awkwardness per stature-length a held load runs past the holder's height. */
  AWKWARD_LENGTH: 0.5,
  /** Awkwardness per body-volume of bulk a held load has. */
  AWKWARD_BULK: 1.0,
  /** A held load longer than this share of stature will not be run with (D35). */
  RUN_AWKWARD: 1.0,
  /** A held load more awkward than this factor will not be run with (D35). */
  RUN_AWKWARD_FACTOR: 1.5,
} as const;

/** The order a carrier tries its places in (`carry.order`, D11). */
export const CARRY_ORDERS = ['hands-first', 'pockets-first'] as const;
export type CarryOrder = (typeof CARRY_ORDERS)[number];

/** How near a carried thing is to the hand (D15). */
export type CarryTier = 'hand' | 'ready' | 'packed' | 'elsewhere';

/** The slot a pack on the back sits in — its inside is *packed* (D15). */
const PACKED_SLOT = 'back';

/** What `receive` is asked to do. Every field is optional. */
export interface ReceiveOptions {
  /** Overrides `carry.order` for this one act. */
  prefer?: 'hands' | 'pockets';
  /** Pins the destination to a slot (equip's claim) — `seatInSlot`. */
  slot?: string;
  /** Held in the hands, or put on (`wear` → the garment's whole claim). */
  for?: 'hold' | 'wear';
}

/** Why a body cannot take a thing (D11). */
export type ReceiveRefusal =
  | ActRefusal<'too-heavy'>
  | ActRefusal<'cannot-grip', { why: string }>
  | ActRefusal<'hands-on-cart', { cart: Stuff }>
  | ActRefusal<'nowhere-to-carry', { held: Stuff[]; tried: Stuff[] }>;

/** Why readying a thing failed (D16) — every one names a way out. */
export type ReadyRefusal =
  | ActRefusal<'packed', { by: Stuff }>
  | ActRefusal<'hands-full', { held: Stuff; home: Stuff | null }>
  | ActRefusal<'hands-needed', { hands: number; held: Stuff[] }>
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
 * named region of a worn host (a coat's `left pocket`).
 */
export type CarryPlace =
  | { host: Stuff & Container; region?: undefined }
  | { host: Stuff & Placing; region: string };

/**
 * ⭐ What is directly on a body, sorted by how it is carried (D28) — the
 * model's half of the tiered `inventory`. Each list is raw: the SURFACE
 * passes it through `PerceptionApi.perceived`.
 */
export interface CarriedTiers {
  /** In the hands. */
  held: Stuff[];
  /** Placed on a worn host, by host and region in the order met (a pocket, a belt's `from`). */
  regions: { host: Stuff & Placing; region: string; items: Stuff[] }[];
  /** Worn, and not a container. */
  worn: Stuff[];
  /** Containers to hand: worn off the back, or hung from / pocketed on a worn host. */
  ready: (Stuff & Container)[];
  /** Containers on the back — what is in them is packed. */
  packed: (Stuff & Container)[];
  /** Neither held, worn nor placed — what the flip's veto refuses; empty on an honest body. */
  loose: Stuff[];
}

/** A home's host: a container on the body, or a placing host whose region it is. */
export type HomeHost = (Stuff & Container) | (Stuff & Placing);

export interface Carrying {
  /**
   * **Take `item` onto this body.** `null` when it came on; a refusal
   * when it could not — and then nothing moved.
   *
   * ⚠ Until the flip (W7) a receive without `slot` lands the thing loose
   * in the contents, as the direct move it replaced did; with `slot` it is
   * seated there (`seatInSlot`). It never refuses yet.
   */
  receive(item: Stuff & Containable, opts?: ReceiveOptions): ReceiveRefusal | null;
  /**
   * ⭐ Could this body take `item`, and where would it go — the dry run of
   * D11's order (a free hand, else the worn containers in tier order), no
   * write. The pre-check a handed thing runs before anything moves.
   */
  canReceive(item: Stuff, opts?: ReceiveOptions): ReceiveRefusal | null;
  /** ⭐ The body's hands (D9): the slots whose body part serves manipulation. */
  handSlots(): string[];
  /** What the hands hold, each thing once (a two-handed grip is one thing). */
  heldThings(): (Stuff & Slottable)[];
  /**
   * ⭐ What a lead is made fast to (size and carrying D18, W6): the first
   * worn `Tieable` off the hands — a halter, a dog's collar. A body that
   * wears one is LED by a rope tied to it, hands or no hands (a dog's mouth
   * is a hand, and a dog on a lead is still led). `null` = nothing to tie.
   */
  halter(): Stuff | null;
  /**
   * How many hands are empty and can close on something (`Vitals.canGrip`),
   * less the handles of a cart this body pulls (D18).
   */
  freeHands(): number;
  /**
   * ⭐ How many hands `item` takes in THIS body's grip (D10): `2` when its
   * use needs two (an authored two-hand claim) or it is heavy or long
   * against this body; `null` when it is past what the body can lift at
   * all; else `1`.
   */
  handsFor(item: Stuff): 1 | 2 | null;
  /** ⭐ How near `thing` is to the hand (D15); `elsewhere` when it is not on this body. */
  tierOf(thing: Stuff): CarryTier;
  /**
   * Where `item` goes back to on this body, or null (D14). Forgotten when
   * either end has left. A pocket home answers its garment;
   * {@link homeRegionOf} names the pocket.
   */
  homeOf(item: Stuff): HomeHost | null;
  /** The named region of `item`'s home (`left pocket`), or null for a container home. */
  homeRegionOf(item: Stuff): string | null;
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
   * ⭐ The places a thing handed to this body may go short of a hand, in
   * D11's order: the ready tier (worn pockets, containers hung from a worn
   * host, worn containers off the back), then the packed tier (the back).
   */
  carryPlaces(): CarryPlace[];
  /**
   * ⭐ Bring `item` to hand (D16). In hand already → ok; on you → the hand
   * it needs is freed (what is in it goes home; never dropped for you) and
   * it comes out; packed → refused, naming the pack; in the room → used
   * where it stands. In a fight it is a guarded switch priced by
   * {@link readySeconds}.
   */
  ready(item: Stuff): ReadyRefusal | null;
  /** The game-seconds readying `item` would cost in a fight: put away + draw (D16). */
  readySeconds(item: Stuff): number;
  /**
   * Put `held` away — to its home if it still takes it (else, until the
   * flip, loose on you). Refuses `hands-full` naming it when its home will
   * not take it back. Never drops it.
   */
  stow(held: Stuff): ReadyRefusal | null;
  /**
   * Seat `item` in the hand(s) it needs now, stowing what is in the way —
   * the body of `ready`, and the completion of a fight's switch. Quiet: the
   * caller tells.
   */
  bringToHand(item: Stuff): ReadyRefusal | null;
  /**
   * ⭐ Let go (D13): each occupant of `slots` (default: the hands) goes to
   * the enclosing place, with a line to the room. Worn things stay.
   */
  releaseHeld(slots?: readonly string[]): Stuff[];
  /**
   * ⭐ The slots `item` takes when wielded by THIS body (D10): its authored
   * `claim`, widened by a free hand when its weight or length takes two
   * here (the gnome's longsword; the ogre's greatsword stays one).
   */
  wieldSlots(item: Stuff, claim: readonly string[]): string[];
  /**
   * May this body wield `item` by `claim` now: `too-heavy`, the cart's
   * handles (`hands-on-cart`), or two hands by weight with the other
   * holding something (`hands-needed`, naming what is held). `null` when
   * it may — or when the claim is not a hand's.
   */
  wieldRefusal(item: Stuff, claim: readonly string[]): ReadyRefusal | null;
  /** D12's awkwardness of holding `item`: 1 for a compact load, more for a long or bulky one. */
  awkwardnessOf(item: Stuff): number;
  /** ⭐ D36: 1 when something held or hung on this body clanks (rigid and ringing), else 0. */
  gearNoise(): 0 | 1;
  /** The words for a carrying refusal, in the second person, each naming what works. */
  refusalWords(r: CarryRefusal): string;
  /** The noun of where `item` sits on this body (*your coat pocket*, *your sidearm sheath*), or null. */
  holderPhrase(item: Stuff): string | null;
  /** ⭐ What a pack holds, as `inventory` tells it shut (D28): `5 things, 3.2 kg`, or `empty`. */
  tallyWords(things: readonly Stuff[]): string;
  /** ⭐ What is directly on this body, sorted by how it is carried (D28) — raw; a surface perceives it. */
  carriedTiers(): CarriedTiers;
}

/** A numeric dial with a fallback (the `LoadBearing` shape). */
function dialSeconds(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    const n = raw === '' || raw == null ? NaN : Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

// ⚠ The base constraint is `Slotted` only: `Container` composes OUTER of
// this on `Creature` (it wraps the whole body stack), so the host is a
// container at runtime but not yet at this rung's type — the same cast
// `Slotted.seatInSlot` makes.
export function CarryingMixin<TBase extends MixinConstructor<Stuff & Slotted>>(Base: TBase) {
  return class CarryingMixin extends Base {
    static _mixinName = 'CarryingMixin';

    /**
     * `carry.order` — where a carrier tries first when it is handed a
     * thing: its free hands, or its worn containers. Read by
     * `canReceive`; `receive` reads it from the flip (W7).
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

    public handSlots(): string[] {
      const self = this as unknown as Stuff & Slotted;
      if (!MixinApi.isAttired(self)) return [];
      const sites = new Set(self.handSites());
      if (sites.size === 0) return [];
      return self.getSlotNames().filter((name) => {
        const part = self.getSlotSpec(name)?.bodyPart;
        return part !== undefined && sites.has(part);
      });
    }

    public heldThings(): (Stuff & Slottable)[] {
      const self = this as unknown as Stuff & Slotted;
      const out: (Stuff & Slottable)[] = [];
      for (const slot of this.handSlots()) {
        for (const held of self.getOccupants(slot)) {
          if (!out.includes(held)) out.push(held);
        }
      }
      return out;
    }

    public halter(): Stuff | null {
      const self = this as unknown as Stuff & Slotted;
      const hands = new Set(this.handSlots());
      for (const name of self.getSlotNames()) {
        if (hands.has(name)) continue;
        const worn = [...self.getOccupants(name)].find((o) => MixinApi.isTieable(o));
        if (worn !== undefined) return worn;
      }
      return null;
    }

    /** Hand slots that are empty and can close on something. */
    private openHands(): string[] {
      const self = this as unknown as Stuff & Slotted;
      const vitals = MixinApi.isVitals(self) ? self : null;
      return this.handSlots().filter(
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

    public handsFor(item: Stuff): 1 | 2 | null {
      const self = this as unknown as Stuff;
      const mass = MixinApi.isTangible(item) ? item.getMass().rawValue() : 0;
      // A body whose capacity is unknown (no mass yet) is not asked by weight.
      const capacity = MixinApi.isLoadBearing(self) ? self.getCarryCapacity().rawValue() : 0;
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
          const hands = new Set(this.handSlots());
          if (item.getSlotClaim(plan).filter((s) => hands.has(s)).length >= 2) return 2;
        }
      }
      return 1;
    }

    public wieldSlots(item: Stuff, claim: readonly string[]): string[] {
      const hands = this.handSlots();
      const held = claim.filter((sl) => hands.includes(sl));
      const need = this.handsFor(item) ?? 1;
      if (held.length === 0 || held.length >= need) return [...claim];
      return [...claim, ...hands.filter((h) => !claim.includes(h)).slice(0, need - held.length)];
    }

    public wieldRefusal(item: Stuff, claim: readonly string[]): ReadyRefusal | null {
      const self = this as unknown as Stuff & Slotted;
      const need = this.handsFor(item);
      if (need === null) return { ok: false, reason: 'too-heavy' };
      const hands = this.handSlots();
      const slots = this.wieldSlots(item, claim);
      const gripped = slots.filter((sl) => hands.includes(sl));
      // The handles first: taking anything up takes at least a hand.
      const cart = this.cartInHand();
      if (cart !== null && this.freeHands() < Math.max(1, gripped.length)) {
        return { ok: false, reason: 'hands-on-cart', facts: { cart: cart.cart } };
      }
      if (gripped.length === 0) return null; // not a hand's question
      const extra = slots.filter((sl) => !claim.includes(sl));
      if (extra.some((sl) => self.isSlotFull(sl)) || need > gripped.length) {
        return { ok: false, reason: 'hands-needed', facts: { hands: need, held: this.heldThings() } };
      }
      return null;
    }

    /** Why no hand can take a thing: the hurt hand's own words, or null. */
    private gripWhy(): string | null {
      const self = this as unknown as Stuff & Slotted;
      if (!MixinApi.isVitals(self)) return null;
      for (const slot of this.handSlots()) {
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
      const hands = this.handSlots();
      if (slots.some((s) => hands.includes(s))) return 'hand';
      // Worn itself, or (until the flip) loose on the body: one draw.
      return 'ready';
    }

    // ── homes (D14) ──

    public homeOf(item: Stuff): HomeHost | null {
      const home = this._homes.get(item.stuffId) ?? null;
      if (home === null) return null;
      // Lazily forgotten: a home is knowledge of THIS body's things, so
      // either end leaving the body (dropped, given, the pouch sold)
      // retires it. No hook on `drop`/`give` is needed.
      if (this.tierOf(item) === 'elsewhere' || this.tierOf(home.host) === 'elsewhere') {
        this._homes.delete(item.stuffId);
        return null;
      }
      return home.host;
    }

    public homeRegionOf(item: Stuff): string | null {
      return this.homeOf(item) === null ? null : (this._homes.get(item.stuffId)?.region ?? null);
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

    // ── receiving (D11) ──

    public receive(item: Stuff & Containable, opts: ReceiveOptions = {}): ReceiveRefusal | null {
      const self = this as unknown as Stuff & Container & Slotted;
      if (opts.slot !== undefined) {
        self.seatInSlot(item as Stuff & Containable & Slottable, opts.slot);
        return null;
      }
      // Put on: the garment's whole claim on this body (`wear`, an outfit).
      const claim = opts.for === 'wear' ? this.wearClaim(item) : [];
      if (claim.length > 0) {
        ContainmentApi.move(item, self);
        self.occupyAll(item as Stuff & Containable & Slottable, claim);
        return null;
      }
      // ⭐ A thing that hangs (a pouch, a holster: a worn container that
      // claims no slot of this body) goes onto the first worn host it hangs
      // from — the belt — before anything else (W7).
      const hang = this.hangHostFor(item);
      if (hang !== null) {
        ContainmentApi.move(item, hang, Placements.FROM);
        return null;
      }
      // ⚠ Until the flip (D31): loose, exactly as the direct move did.
      ContainmentApi.move(item, self);
      return null;
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
      const hands = new Set(this.handSlots());
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

    public canReceive(item: Stuff, opts: ReceiveOptions = {}): ReceiveRefusal | null {
      if (this.hangHostFor(item) !== null) return null;
      const hands = this.handsFor(item);
      if (hands === null) return { ok: false, reason: 'too-heavy' };
      const self = this as unknown as Stuff;
      const order: CarryOrder =
        opts.prefer === 'pockets'
          ? 'pockets-first'
          : opts.prefer === 'hands'
            ? 'hands-first'
            : this.carryOrder();
      const handOk = this.freeHands() >= hands && MixinApi.isSlottable(item);
      const places = this.carryPlaces();
      const fits = places.find((p) => this.placeTakes(p, item)) ?? null;
      if (order === 'hands-first' ? handOk || fits !== null : fits !== null || handOk) return null;
      const cart = this.cartInHand();
      if (cart !== null && this.openHands().length >= hands) {
        return { ok: false, reason: 'hands-on-cart', facts: { cart: cart.cart } };
      }
      const why = this.gripWhy();
      if (why !== null && this.heldThings().length === 0) {
        return { ok: false, reason: 'cannot-grip', facts: { why } };
      }
      void self;
      return {
        ok: false,
        reason: 'nowhere-to-carry',
        facts: { held: this.heldThings(), tried: [...new Set(places.map((p) => p.host))] },
      };
    }

    /** The `carry.order` setting, else the default. */
    private carryOrder(): CarryOrder {
      const self = this as unknown as Stuff;
      if (!MixinApi.isEnvironment(self)) return 'hands-first';
      const v = self.getSetting('carry.order');
      return v === 'pockets-first' ? 'pockets-first' : 'hands-first';
    }

    public carryPlaces(): CarryPlace[] {
      const self = this as unknown as Stuff & Slotted & Container;
      const hands = new Set(this.handSlots());
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
          // A worn host's pockets — the regions whose way of sitting encloses.
          if (MixinApi.isPlacing(o)) {
            for (const name of o.getPlacements()) {
              const member = o.placementOf(name);
              if (member.getEncloses() && !member.getHangs()) pockets.push({ host: o, region: name });
            }
          }
          if (MixinApi.isContainer(o) && !o.isAgent()) (slot === PACKED_SLOT ? packed : ready).push({ host: o });
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
      return [...pockets, ...hung, ...ready, ...packed];
    }

    /** Would `place` take `item` — the region's `canPlace`, the container's tape measure? */
    private placeTakes(place: CarryPlace, item: Stuff): boolean {
      if (place.region !== undefined) {
        return MixinApi.isContainable(item) && place.host.canPlace(item, place.region).ok;
      }
      return place.host.fitRefusal(item) === null;
    }

    // ── readying (D16) ──

    public ready(item: Stuff): ReadyRefusal | null {
      const self = this as unknown as Stuff;
      // A body whose plan names no hands (an old fixture, a beast's
      // mouth before W6) switches the shipped way in a fight.
      if (this.handSlots().length === 0) {
        if (!MixinApi.isCombatant(self) || !CombatApi.sessionFor(self)) return null;
        const started = self.beginWeaponSwitch(item);
        return started.ok ? null : { ok: false, reason: 'already-switching' };
      }
      const refusal = this.readyRefusal(item);
      if (refusal !== null) return refusal;
      if (!this.wantsHand(item)) return null;
      // ⭐ In a fight it is the switch, generalized (D16): guard down, no
      // instrument, for the seconds the two halves cost.
      if (MixinApi.isCombatant(self) && CombatApi.sessionFor(self)) {
        const started = self.beginWeaponSwitch(item, { seconds: this.readySeconds(item) });
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
        // In somebody else's grasp: not yours to use. Anything else the
        // binder let through is used where it stands (a bench, a cask, a
        // tape on the floor) — ⚠ until the flip, when `get` means receive.
        return insideAnotherBody(this as unknown as Stuff, item) ? { ok: false, reason: 'not-on-you' } : null;
      }
      if (!this.wantsHand(item)) return null;
      const hands = this.handsFor(item);
      if (hands === null) return { ok: false, reason: 'too-heavy' };
      const cart = this.cartInHand();
      const grip = this.openHands().length + this.heldThings().length - (cart?.hands ?? 0);
      if (cart !== null && this.openHands().length >= hands && this.freeHands() < hands) {
        return { ok: false, reason: 'hands-on-cart', facts: { cart: cart.cart } };
      }
      if (grip < hands) {
        const why = this.gripWhy();
        if (why !== null) return { ok: false, reason: 'cannot-grip', facts: { why } };
        return { ok: false, reason: 'hands-needed', facts: { hands, held: this.heldThings() } };
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
      // A hand takes what can be wielded (the hand slots' `accepts`); a
      // thing that cannot is used where it is.
      if (!MixinApi.isSlottable(item) || !MixinApi.isWieldable(item)) return null;
      const self = this as unknown as Stuff & Slotted;
      const hands = this.handSlots();
      if (hands.length === 0) return null;
      const n = this.handsFor(item) ?? 1;
      let claim: string[] = [];
      if (MixinApi.isWieldable(item)) {
        const plan = SpeciesApi.tryGetBodyPlanPath(self);
        if (plan !== null) claim = item.getSlotClaim(plan).filter((s) => hands.includes(s));
      }
      if (claim.length >= n) return claim.slice(0, n);
      // Free hands first, then the occupied ones (their holders go home).
      const order = [...this.openHands(), ...hands.filter((h) => self.isSlotOccupied(h))];
      const picked = [...new Set([...claim, ...order])].slice(0, n);
      return picked.length >= n ? picked : null;
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

    /** Would `held` go away? `null` = yes (home, or loose until the flip). */
    private stowRefusal(held: Stuff): ReadyRefusal | null {
      const home = this.homeOf(held);
      if (home === null) return null; // ⚠ until the flip: loose on you
      if (this.homeTakes(held) || this.tierOf(held) !== 'hand') return null;
      return { ok: false, reason: 'hands-full', facts: { held, home } };
    }

    /** Would `held`'s home take it back — its pocket's `canPlace`, its container's tape measure? */
    private homeTakes(held: Stuff): boolean {
      const home = this.homeOf(held);
      if (home === null) return false;
      const region = this.homeRegionOf(held);
      if (region !== null && MixinApi.isPlacing(home)) return this.placeTakes({ host: home, region }, held);
      return MixinApi.isContainer(home) && this.placeTakes({ host: home }, held);
    }

    public stow(held: Stuff): ReadyRefusal | null {
      const refusal = this.stowRefusal(held);
      if (refusal !== null) return refusal;
      const self = this as unknown as Stuff & Slotted;
      if (MixinApi.isSlottable(held)) {
        for (const slot of this.handSlots()) {
          if ([...self.getOccupants(slot)].some((o) => o.stuffId === held.stuffId)) self.vacate(slot, held);
        }
      }
      const home = this.homeOf(held);
      const region = this.homeRegionOf(held);
      if (home !== null && MixinApi.isContainable(held)) {
        if (region !== null && MixinApi.isPlacing(home)) ContainmentApi.move(held, home, region);
        else if (MixinApi.isContainer(home)) ContainmentApi.move(held, home);
      }
      return null;
    }

    public bringToHand(item: Stuff): ReadyRefusal | null {
      const refusal = this.readyRefusal(item);
      if (refusal !== null) return refusal;
      if (!this.wantsHand(item)) return null;
      const hands = this.handsFor(item) ?? 1;
      for (const held of this.inTheWay(item, hands)) {
        const r = this.stow(held);
        if (r !== null) return r;
      }
      const slots = this.gripSlotsFor(item);
      if (slots === null || !MixinApi.isContainable(item) || !MixinApi.isSlottable(item)) return null;
      const self = this as unknown as Stuff & Slotted;
      const it = item as Stuff & Containable & Slottable;
      // Out of whatever slot it sat in (a sheath), then into the hand(s).
      if (MixinApi.isSlottable(it)) {
        for (const [slot, occ] of self.getAllOccupants()) {
          if (occ.has(it)) self.vacate(slot, it);
        }
      }
      // It remembers where it came from — that is where it goes back.
      const from = MixinApi.isContainable(it) ? it.getContainer() : null;
      const pair = it.getPlacement();
      if (!this.homeOf(it)) {
        if (from !== null && from.stuffId !== self.stuffId && MixinApi.isContainer(from)) this.setHome(it, from);
        else if (pair !== null && pair.host.stuffId !== self.stuffId && MixinApi.isPlacing(pair.host)) {
          // Out of a pocket (or off a clip): that is where it goes back.
          this.setHome(it, pair.host, pair.name);
        }
      }
      if (slots.length === 1) this.receive(it, { slot: slots[0]! });
      else {
        ContainmentApi.move(it, self as unknown as Stuff & Container);
        self.occupyAll(it, slots);
      }
      return null;
    }

    /** One half of a readying: where `item` goes to or comes from, in seconds (D16). */
    private holderSeconds(item: Stuff): number {
      const self = this as unknown as Stuff & Slotted;
      const draw = dialSeconds(AppSettingKeys.combatDrawSeconds, 1.5);
      const reach = dialSeconds(AppSettingKeys.combatReachSeconds, 3);
      const unfasten = dialSeconds(AppSettingKeys.combatUnfastenSeconds, 3);
      const placed = MixinApi.isContainable(item) ? item.getPlacement() : null;
      if (placed !== null && placed.host.stuffId !== self.stuffId) {
        // A clip, a hook: the draw. A pocket: a reach — and a fastened one
        // is undone first (D26's `closes`).
        if (!MixinApi.isPlacing(placed.host)) return draw;
        const member = placed.host.placementOf(placed.name);
        if (!member.getEncloses()) return draw;
        return reach + (placed.host.getPlacementEntry(placed.name)?.closes === true ? unfasten : 0);
      }
      const at = MixinApi.isContainable(item) ? item.getContainer() : null;
      if (at === null || at.stuffId === self.stuffId) {
        // On the body: a sheath slot is a shaped holder; loose is a reach.
        const hands = new Set(this.handSlots());
        for (const [slot, occ] of self.getAllOccupants()) {
          if (!hands.has(slot) && [...occ].some((o) => o.stuffId === item.stuffId)) return draw;
        }
        return reach;
      }
      // ⭐ A container shaped to the thing (a holster, a scabbard) is the draw (D27).
      if (MixinApi.isContainer(at) && at.getShapedTo() !== null) return draw;
      const fastened = MixinApi.isSealable(at) && !at.isOpen();
      return reach + (fastened ? unfasten : 0);
    }

    public readySeconds(item: Stuff): number {
      if (this.tierOf(item) === 'hand') return 0;
      const hands = this.handsFor(item) ?? 1;
      let away = 0;
      for (const held of this.inTheWay(item, hands)) {
        const home = this.homeOf(held);
        away += home === null ? dialSeconds(AppSettingKeys.combatReachSeconds, 3) : this.holderSecondsInto(home);
      }
      return away + this.holderSeconds(item);
    }

    /** Putting a thing INTO `home`: a reach (a shaped one is the draw), plus the undoing of a fastened one. */
    private holderSecondsInto(home: Stuff): number {
      const reach = dialSeconds(AppSettingKeys.combatReachSeconds, 3);
      const unfasten = dialSeconds(AppSettingKeys.combatUnfastenSeconds, 3);
      if (MixinApi.isContainer(home) && home.getShapedTo() !== null) {
        return dialSeconds(AppSettingKeys.combatDrawSeconds, 1.5);
      }
      return reach + (MixinApi.isSealable(home) && !home.isOpen() ? unfasten : 0);
    }

    public tallyWords(things: readonly Stuff[]): string {
      if (things.length === 0) return 'empty';
      let kg = 0;
      for (const x of things) if (MixinApi.isTangible(x)) kg += x.getMass().rawValue();
      const n = things.length === 1 ? 'one thing' : `${things.length} things`;
      return `${n}, ${roundForReading(kg)} kg`;
    }

    public carriedTiers(): CarriedTiers {
      const self = this as unknown as Stuff & Slotted & Container;
      const slotOf = new Map<string, string[]>();
      for (const [slot, occ] of self.getAllOccupants()) {
        for (const o of occ) slotOf.set(o.stuffId, [...(slotOf.get(o.stuffId) ?? []), slot]);
      }
      const out: CarriedTiers = { held: [], regions: [], worn: [], ready: [], packed: [], loose: [] };
      const regions = new Map<string, CarriedTiers['regions'][number]>();
      const isHolder = (x: Stuff): x is Stuff & Container => MixinApi.isContainer(x) && !x.isAgent();
      for (const x of self.getContents()) {
        const tier = this.tierOf(x);
        const pair = MixinApi.isContainable(x) ? x.getPlacement() : null;
        if (tier === 'hand') {
          out.held.push(x);
        } else if (pair !== null && pair.host.stuffId !== self.stuffId && MixinApi.isPlacing(pair.host)) {
          const key = `${pair.host.stuffId}\u0000${pair.name}`;
          let g = regions.get(key);
          if (g === undefined) {
            g = { host: pair.host, region: pair.name, items: [] };
            regions.set(key, g);
            out.regions.push(g);
          }
          g.items.push(x);
          if (isHolder(x)) out.ready.push(x);
        } else if (slotOf.has(x.stuffId)) {
          if (!isHolder(x)) out.worn.push(x);
          else if (tier === 'packed' || (slotOf.get(x.stuffId) ?? []).includes(PACKED_SLOT)) out.packed.push(x);
          else out.ready.push(x);
        } else {
          out.loose.push(x);
        }
      }
      return out;
    }

    public holderPhrase(item: Stuff): string | null {
      const self = this as unknown as Stuff & Slotted;
      const placed = MixinApi.isContainable(item) ? item.getPlacement() : null;
      if (placed !== null && placed.host.stuffId !== self.stuffId) {
        // A named region is the place (*your coat's breast pocket*).
        const named = MixinApi.isPlacing(placed.host) && placed.host.namedRegions().includes(placed.name);
        return named
          ? `your ${placed.host.presentationPhrase().bare()}'s ${placed.name}`
          : `your ${placed.host.presentationPhrase().bare()}`;
      }
      const at = MixinApi.isContainable(item) ? item.getContainer() : null;
      if (at !== null && at.stuffId !== self.stuffId) return `your ${at.presentationPhrase().bare()}`;
      const hands = new Set(this.handSlots());
      for (const [slot, occ] of self.getAllOccupants()) {
        if (!hands.has(slot) && [...occ].some((o) => o.stuffId === item.stuffId)) {
          return `your ${slot.split(':')[0]}`;
        }
      }
      return null;
    }

    // ── letting go (D13) ──

    public releaseHeld(slots?: readonly string[]): Stuff[] {
      const self = this as unknown as Stuff & Slotted;
      const which = slots ?? this.handSlots();
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

    // ── shape and sound (D12, D36) ──

    public awkwardnessOf(item: Stuff): number {
      const self = this as unknown as Stuff;
      const stature = MixinApi.isPosed(self) ? self.getStature() : null;
      if (!MixinApi.isTangible(item) || !MixinApi.isTangible(self)) return 1;
      const longest = item.getDimensions()?.longest() ?? 0;
      const vol = item.getVolumeM3() ?? 0;
      const body = self.getVolumeM3() ?? 0;
      const length = stature !== null && stature > 0 ? Math.max(0, longest / stature - 1) : 0;
      const bulk = body > 0 ? vol / body : 0;
      return 1 + CARRYING_DEFAULTS.AWKWARD_LENGTH * length + CARRYING_DEFAULTS.AWKWARD_BULK * bulk;
    }

    public gearNoise(): 0 | 1 {
      const self = this as unknown as Stuff & Container;
      const loud = (x: Stuff): boolean => {
        if (!MixinApi.isTangible(x) || x.getShape()?.isRigid() === false) return false;
        if (MixinApi.isIntegrity(x)) return x.ringSound().rings;
        return x.getMaterial()?.hasTag('metal') ?? false;
      };
      if (this.heldThings().some(loud)) return 1;
      for (const item of self.getContents()) {
        const placed = MixinApi.isContainable(item) ? item.getPlacement() : null;
        if (placed !== null && placed.name === 'from' && loud(item)) return 1;
      }
      return 0;
    }

    // ── words ──

    public refusalWords(r: CarryRefusal): string {
      const a = (s: Stuff): string => s.presentationPhrase().definite();
      switch (r.reason) {
        case 'too-heavy':
          return "That's more than you can lift.";
        case 'cannot-grip':
          return `You can't hold it — ${r.facts.why}.`;
        case 'hands-on-cart':
          return `Your hands are on ${a(r.facts.cart)} — \`unhitch\` it first.`;
        case 'nowhere-to-carry': {
          if (this.handSlots().length === 0) return 'You have nowhere to carry that.';
          const held = r.facts.held.map((h) => h.presentationPhrase().indefinite());
          const tried = r.facts.tried.map(a);
          const hands = held.length > 0 ? `your hands are full (${GrammarApi.joinList(held)})` : 'your hands are full';
          return tried.length > 0
            ? `${cap(hands)} and it won't fit in ${GrammarApi.joinList(tried)}.`
            : `${cap(hands)}.`;
        }
        case 'packed':
          return `It's packed in ${a(r.facts.by)} — take it off first (\`remove ${r.facts.by.presentationPhrase().bare()}\`).`;
        case 'hands-full': {
          const held = r.facts.held.presentationPhrase().bare();
          const where = r.facts.home !== null ? ` — ${a(r.facts.home)} won't take it back` : ' — it has nowhere to go';
          return `Your hands are full${where}. Drop it (\`drop ${held}\`) or put it away first.`;
        }
        case 'hands-needed': {
          const held = r.facts.held.map((h) => h.presentationPhrase().indefinite());
          const need = r.facts.hands >= 2 ? 'both hands' : 'a free hand';
          return held.length > 0
            ? `That takes ${need} — you're holding ${GrammarApi.joinList(held)}.`
            : `That takes ${need}.`;
        }
        case 'not-on-you':
          return "That isn't yours to use.";
        case 'already-switching':
          return "You're already reaching for something.";
        default: {
          const never: never = r;
          return never;
        }
      }
    }
  };
}

/** Two significant places for a reading off a list — `0.42`, `3.2`, `12`. */
function roundForReading(n: number): number {
  if (!(n > 0)) return 0;
  if (n >= 10) return Math.round(n);
  if (n >= 1) return Math.round(n * 10) / 10;
  return Math.round(n * 100) / 100;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
