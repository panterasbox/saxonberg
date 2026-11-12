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
 * ⭐⭐ **The flip (W7): nothing sits loose on a body.** `receive` resolves
 * D11's order — a hanging pouch onto the belt, a stack onto its like, a
 * free hand (`carry.order`), the worn pockets and containers in tier order
 * — and moves the thing there, or refuses in words and moves nothing;
 * `Creature.canAddContainable` vetoes any other way on (`admitWhile` is the
 * body's own seating and the restore). The idioms by counterparty
 * (D-W7a): `receiveOrSetDown` for a made thing, `canReceive` before any
 * write for a handed one, `receiveGranted` for what the engine grants and
 * `placeLoose` for what a restore found loose. A homeless held thing is
 * stowed in the first place it fits, which becomes its home.
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

import { Mixins, type MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Containable } from '../spatial/Containable';
import type { Container } from '../spatial/Container';
import type { Placing } from '../spatial/Placing';
import type { Slottable } from './Slottable';
import type { Slotted } from './Slotted';
import type { ActRefusal } from '../craft/ActPlan';
import type { CaptureContext, HydrateContext, HomeEnd, HomesSlice, MixinSlice } from '../persistence/PersistenceSlice';
import { ContainmentApi } from '../../api/containment';
import { StuffApi } from '../../api/stuff';
import { CallSecurity } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
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

/**
 * Who may admit a thing past the flip's veto (D11): the body itself (its
 * own `receive`, `seatInSlot`, readying) and the restore, which replays a
 * record of what the body already carried (`PersistableLogic.restoreItem`).
 */
const ADMIT_CALLERS = SecurityPolicies.AnyOf(
  SecurityPolicies.SelfOnly,
  SecurityPolicies.FromModule('/platform/idea/api/PersistableLogic#PersistableLogic'),
);

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
  /** Pins it to several slots at once (a worn or wielded claim) — `occupyAll`. */
  slots?: readonly string[];
  /** Held in the hands, or put on (`wear` → the garment's whole claim). */
  for?: 'hold' | 'wear';
}

/** Why a body cannot take a thing (D11). */
export type ReceiveRefusal =
  | ActRefusal<'too-heavy'>
  | ActRefusal<'cannot-grip', { why: string }>
  | ActRefusal<'hands-on-cart', { cart: Stuff }>
  | ActRefusal<'nowhere-to-carry', { item?: Stuff; held: Stuff[]; tried: Stuff[] }>;

/** Why readying a thing failed (D16) — every one names a way out. */
export type ReadyRefusal =
  | ActRefusal<'packed', { by: Stuff }>
  | ActRefusal<'hands-full', { held: Stuff; home: Stuff | null }>
  | ActRefusal<'hands-needed', { hands: number; held: Stuff[] }>
  | ActRefusal<'hands-on-cart', { cart: Stuff }>
  | ActRefusal<'cannot-grip', { why: string }>
  | ActRefusal<'too-heavy'>
  | ActRefusal<'not-on-you'>
  | ActRefusal<'pick-up', { item: Stuff }>
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
   * `slot` pins it (`seatInSlot`); `for: 'wear'` puts it on by its claim;
   * otherwise D11's order (see the module doc).
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
  /**
   * Run `fn` with `item` admitted past the flip's veto (D11) — the body's
   * own seating and the restore only (gated).
   */
  admitWhile<T>(item: Stuff, fn: () => T): T;
  /** Is `item` being admitted onto this body right now? Read by the veto. */
  isAdmitting(item: Stuff): boolean;
  /**
   * ⭐ The made idiom (D-W7a): `receive`, else set it down on `at` (the
   * bench) or where the body stands, with a line. Never a refusal.
   */
  receiveOrSetDown(item: Stuff & Containable, at?: Stuff | null): 'carried' | 'set-down';
  /** ⭐ The granted idiom (D-W7a/D32): `receive`, else the residence, else here — never lost. */
  receiveGranted(item: Stuff & Containable, opts?: ReceiveOptions): Promise<'carried' | 'home' | 'here'>;
  /** ⭐ D32: place everything loose on this body (a restore's first load). */
  placeLoose(): Promise<Stuff[]>;
  /**
   * ⭐ What came off one of this body's slots — a garment taken off, a
   * weapon put up — and is still on it with no place (size and carrying
   * drive, step 9: `remove backpack` left the pack LOOSE on the body). A
   * thing taken off comes to hand (else a carry place, else it is set down
   * where the body stands, said so); a thing put up goes home (its sheath,
   * else the first carry place it fits, else set down).
   */
  settleReleased(item: Stuff & Containable, how: 'hold' | 'put-up'): 'carried' | 'set-down';
  /**
   * ⭐ D37: before a guest body is reaped, what it borrowed goes back — a
   * good titled to someone else to its owner (their hands, else set down
   * where they stand), anything untitled it picked up dropped where the
   * guest stands. What it wears (the guest's own outfit) goes with it.
   */
  returnBorrowed(): Stuff[];
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
  // Declared-then-returned (the Slottable shape) so method decorators are
  // legal — a class EXPRESSION cannot carry them.
  class CarryingMixin extends Base {
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
      // ⭐ A slot AT a hand is not always a hand (size and carrying drive,
      // step 1): the biped's ring slots attach at the hand too, and a mug
      // went onto a finger — four "hands". What is worn at a hand (a ring,
      // a glove) accepts a wearable; what a hand HOLDS is the slot that
      // does not.
      return self.getSlotNames().filter((name) => {
        const spec = self.getSlotSpec(name);
        const part = spec?.bodyPart;
        return part !== undefined && sites.has(part) && spec?.accepts !== Mixins.Wearable;
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
      // Worn itself (or, never after the flip, loose on the body): one draw.
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

    /**
     * The things this body is admitting right now — the only way past the
     * flip's veto (`Creature.canAddContainable`, D11). Runtime only.
     */
    private _admitting = new Set<string>();

    @CallSecurity(ADMIT_CALLERS)
    public admitWhile<T>(item: Stuff, fn: () => T): T {
      const id = item.stuffId;
      const had = this._admitting.has(id);
      this._admitting.add(id);
      try {
        return fn();
      } finally {
        if (!had) this._admitting.delete(id);
      }
    }

    public isAdmitting(item: Stuff): boolean {
      return !this.isJudged() || this._admitting.has(item.stuffId);
    }

    /** Does this body have a known plan — so hands, slots and the veto apply? */
    private isJudged(): boolean {
      return SpeciesApi.tryGetBodyPlanPath(this as unknown as Stuff) !== null;
    }

    public receive(item: Stuff & Containable, opts: ReceiveOptions = {}): ReceiveRefusal | null {
      const self = this as unknown as Stuff & Container & Slotted;
      if (opts.slot !== undefined) {
        self.seatInSlot(item as Stuff & Containable & Slottable, opts.slot);
        return null;
      }
      // Put on: the garment's whole claim on this body (`wear`, an outfit),
      // or the slots a caller names.
      const claim = opts.slots !== undefined ? [...opts.slots] : opts.for === 'wear' ? this.wearClaim(item) : [];
      if (claim.length > 0) {
        this.admitWhile(item, () => {
          ContainmentApi.move(item, self);
          self.occupyAll(item as Stuff & Containable & Slottable, claim);
        });
        return null;
      }
      // ⭐ A body whose plan is not known yet (a fixture, a body mid-mint)
      // is not judged (the D18-b precedent): it takes the thing as the
      // pre-flip body did, and the veto admits it (`isJudged`).
      if (!this.isJudged()) {
        ContainmentApi.move(item, self);
        return null;
      }
      const where = this.resolveReceive(item, opts);
      if (where.kind === 'refused') return where.refusal;
      switch (where.kind) {
        case 'held':
          return null;
        case 'wear':
          this.admitWhile(item, () => {
            ContainmentApi.move(item, self);
            self.occupyAll(item as Stuff & Containable & Slottable, where.slots);
          });
          return null;
        case 'merge':
          // ⭐ A stack meets its like and takes no hand (requirements §
          // Collisions): onto the coins in the purse, the apples in a hand.
          if (where.into.stuffId === self.stuffId) this.admitWhile(item, () => ContainmentApi.move(item, self));
          else ContainmentApi.move(item, where.into as Stuff & Container);
          return null;
        case 'hand': {
          const it = item as Stuff & Containable & Slottable;
          if (where.slots.length === 1) {
            self.seatInSlot(it, where.slots[0]!);
          } else {
            this.admitWhile(item, () => {
              ContainmentApi.move(it, self);
              self.occupyAll(it, where.slots);
            });
          }
          return null;
        }
        case 'place':
          if (where.place.region !== undefined) ContainmentApi.move(item, where.place.host, where.place.region);
          else ContainmentApi.move(item, where.place.host);
          return null;
      }
    }

    /**
     * ⭐ Where `item` would go on this body, by D11's order — the one
     * resolution `receive` performs and `canReceive` reports, so the dry
     * run and the act can never disagree.
     */
    private resolveReceive(
      item: Stuff,
      opts: ReceiveOptions,
    ):
      | { kind: 'held' }
      | { kind: 'wear'; slots: string[] }
      | { kind: 'merge'; into: Stuff }
      | { kind: 'hand'; slots: string[] }
      | { kind: 'place'; place: CarryPlace }
      | { kind: 'refused'; refusal: ReceiveRefusal } {
      if (this.tierOf(item) === 'hand') return { kind: 'held' };
      // ⭐ A body with no hands that is HANDED its tack puts it on (size and
      // carrying drive, step 18): a mule carries only in what it wears, and
      // `put pack saddle in mule` had nowhere to go — no hand, no pocket.
      // The claim's slots must be free; worn already is nothing to do.
      if (this.handSlots().length === 0 && MixinApi.isSlottable(item)) {
        const claim = this.wearClaim(item);
        const self = this as unknown as Stuff & Slotted;
        if (claim.length > 0 && claim.every((slot) => self.canOccupy(item as Stuff & Slottable, slot))) {
          return { kind: 'wear', slots: claim };
        }
      }
      const hang = this.hangHostFor(item);
      if (hang !== null) return { kind: 'place', place: { host: hang, region: Placements.FROM } };
      const merge = this.mergeTargetFor(item);
      if (merge !== null) return { kind: 'merge', into: merge };
      const hands = this.handsFor(item);
      if (hands === null) return { kind: 'refused', refusal: { ok: false, reason: 'too-heavy' } };
      const order: CarryOrder =
        opts.prefer === 'pockets'
          ? 'pockets-first'
          : opts.prefer === 'hands'
            ? 'hands-first'
            : this.carryOrder();
      const open = this.openHands();
      const handOk = this.freeHands() >= hands && MixinApi.isSlottable(item);
      const hand = { kind: 'hand' as const, slots: open.slice(0, hands) };
      // Never into itself, nor into something it holds.
      const places = this.carryPlaces().filter((p) => !within(p.host, item));
      const fits = places.find((p) => this.placeTakes(p, item)) ?? null;
      const place = fits !== null ? { kind: 'place' as const, place: fits } : null;
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
      if (why !== null && this.heldThings().length === 0) {
        return { kind: 'refused', refusal: { ok: false, reason: 'cannot-grip', facts: { why } } };
      }
      return {
        kind: 'refused',
        refusal: {
          ok: false,
          reason: 'nowhere-to-carry',
          facts: { item, held: this.heldThings(), tried: [...new Set(places.map((p) => p.host))] },
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

    /**
     * ⭐ The made idiom (D-W7a): a thing made, yielded, caught or left by an
     * act comes to this body if it can; otherwise it is SET DOWN where it
     * was made — on `at` (the workbench) when that will take it, else in
     * the place the body stands in — and the body is told. Never refused
     * after the inputs are spent; never lost. Returns where it went.
     */
    public receiveOrSetDown(item: Stuff & Containable, at?: Stuff | null): 'carried' | 'set-down' {
      if (this.receive(item) === null) return 'carried';
      const self = this as unknown as Stuff & Containable;
      const place = self.getContainer();
      const bench = at !== undefined && at !== null && MixinApi.isPlacing(at) && at.canPlace(item, Placements.ON).ok
        ? at
        : null;
      if (bench !== null) ContainmentApi.move(item, bench, Placements.ON);
      else if (place !== null) ContainmentApi.move(item, place as Stuff & Container);
      else return 'set-down';
      if (!item.isDestroyed() && MixinApi.isSensor(self)) {
        const where = bench !== null ? Mml.compose`on ${Mml.thing(bench)}` : Mml.compose`down`;
        MessageApi.scene(self)
          .topic('act.deed')
          .toSelf(Mml.compose`Your hands are full — you set ${Mml.thing(item)} ${where}.`)
          .send();
      }
      return 'set-down';
    }

    /**
     * ⭐ The granted idiom (D-W7a, D32): what the engine gives a body — a
     * loadout, the Arrival Note, a card, a key, what a restore found loose
     * — is placed as `receive` would; what fits nowhere goes to a player's
     * RESIDENCE with a line queued to them (*your crate would not fit
     * anywhere on you; it is in your room*), or — an NPC, or a player with
     * no room standing — the place it stands in, the author told
     * (`DiagnosticApi`). Never destroyed, never lost.
     */
    public async receiveGranted(item: Stuff & Containable, opts: ReceiveOptions = {}): Promise<'carried' | 'home' | 'here'> {
      if (this.receive(item, opts) === null) return 'carried';
      const self = this as unknown as Stuff & Containable;
      const home = await this.residenceRoom();
      if (home !== null) {
        ContainmentApi.move(item, home);
        if (MixinApi.isSensor(self)) {
          MessageApi.scene(self)
            .topic('act.deed')
            .toSelf(Mml.compose`${Mml.thing(item)} would not fit anywhere on you; it is in your room.`)
            .send();
        }
        return 'home';
      }
      const place = self.getContainer();
      if (place !== null) ContainmentApi.move(item, place as Stuff & Container);
      if (MixinApi.isSensor(self) && MixinApi.isHasInteractive(self)) {
        MessageApi.scene(self)
          .topic('act.deed')
          .toSelf(Mml.compose`${Mml.thing(item)} would not fit anywhere on you; it is at your feet.`)
          .send();
      } else {
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
      return 'here';
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
      const hands = new Set(this.handSlots());
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
          const body = StuffApi.findByIdentityPath(ownerPath).find((b) => MixinApi.isCarrying(b) && !b.isDestroyed());
          if (body !== undefined && MixinApi.isCarrying(body)) body.receiveOrSetDown(item);
          else if (place !== null) ContainmentApi.move(item, place as Stuff & Container);
          out.push(item);
          continue;
        }
        // Untitled and not the guest's own clothes: found here, left here.
        const onBody = item.getContainer()?.stuffId === self.stuffId;
        if (ownerPath === null && onBody && !worn.has(item.stuffId) && place !== null) {
          const pair = item.getPlacement();
          const onWorn = pair !== null && worn.has(pair.host.stuffId);
          // A thing in the guest's own pocket, or held: found, so dropped.
          if (onWorn || this.tierOf(item) === 'hand') {
            if (MixinApi.isSlottable(item)) {
              for (const slot of this.handSlots()) if (self.getOccupants(slot).has(item)) self.vacate(slot, item);
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
      const self = this as unknown as Stuff & Container;
      const loose = self.getContents().filter((c) => !this.isHonest(c) && !c.isAgent());
      for (const item of loose) {
        if (item.isDestroyed() || this.isHonest(item)) continue;
        // Out of the body first, so `receive` treats it as arriving.
        const at = (self as unknown as Stuff & Containable).getContainer();
        if (at !== null) ContainmentApi.move(item as Stuff & Containable, at as Stuff & Container);
        await this.receiveGranted(item as Stuff & Containable);
      }
      return loose;
    }

    public settleReleased(item: Stuff & Containable, how: 'hold' | 'put-up'): 'carried' | 'set-down' {
      const self = this as unknown as Stuff & Container;
      const at = item.getContainer();
      if (item.isDestroyed() || at === null || at.stuffId !== self.stuffId || this.isHonest(item)) return 'carried';
      if (how === 'put-up') {
        // Home first — the sheath it came out of — else the first carry place.
        const home = this.homeOf(item);
        const region = this.homeRegionOf(item);
        if (home !== null && region !== null && MixinApi.isPlacing(home) && home.canPlace(item, region).ok) {
          ContainmentApi.move(item, home, region);
          return 'carried';
        }
        if (home !== null && MixinApi.isContainer(home) && home.fitRefusal(item) === null) {
          ContainmentApi.move(item, home);
          return 'carried';
        }
        const place = this.stowPlaceFor(item);
        if (place !== null) {
          if (place.region !== undefined) ContainmentApi.move(item, place.host, place.region);
          else ContainmentApi.move(item, place.host);
          this.setHome(item, place.host, place.region);
          return 'carried';
        }
      }
      // Out of the body first, so `receive` treats it as arriving (placeLoose's shape).
      const placeOf = (self as unknown as Stuff & Containable).getContainer();
      if (placeOf !== null) ContainmentApi.move(item, placeOf as Stuff & Container);
      // A body with no hands sets down what came off it — handed back, the
      // tack rule would only put it on again.
      if (this.handSlots().length === 0) return 'set-down';
      return this.receiveOrSetDown(item);
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
      if (!this.isJudged()) return null;
      const where = this.resolveReceive(item, opts);
      return where.kind === 'refused' ? where.refusal : null;
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
      // A hand takes any slottable thing — every good (W7); a fixture or a
      // place cannot be held and is used where it is.
      if (!MixinApi.isSlottable(item)) return null;
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
      return { ok: false, reason: 'hands-full', facts: { held, home } };
    }

    /** Where a homeless held thing would be put away: the first carry place it fits. */
    private stowPlaceFor(held: Stuff): CarryPlace | null {
      return this.carryPlaces().find((p) => !within(p.host, held) && this.placeTakes(p, held)) ?? null;
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
      if (!MixinApi.isContainable(held)) return null;
      if (home !== null) {
        if (region !== null && MixinApi.isPlacing(home)) ContainmentApi.move(held, home, region);
        else if (MixinApi.isContainer(home)) ContainmentApi.move(held, home);
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

    public bringToHand(item: Stuff): ReadyRefusal | null {
      const refusal = this.readyRefusal(item);
      if (refusal !== null) return refusal;
      if (!this.wantsHand(item)) return null;
      const hands = this.handsFor(item) ?? 1;
      // ⭐ What each hand does, said (size and carrying drive, step 4: the
      // readying was silent — the compass simply appeared): *you sheathe
      // your sword and pull out your compass.*
      const away: string[] = [];
      for (const held of this.inTheWay(item, hands)) {
        const r = this.stow(held);
        if (r !== null) return r;
        away.push(this.putAwayPhrase(held));
      }
      const slots = this.gripSlotsFor(item);
      if (slots === null || !MixinApi.isContainable(item) || !MixinApi.isSlottable(item)) return null;
      const self = this as unknown as Stuff & Slotted;
      const it = item as Stuff & Containable & Slottable;
      const out = this.drawPhrase(it);
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
        this.admitWhile(it, () => {
          ContainmentApi.move(it, self as unknown as Stuff & Container);
          self.occupyAll(it, slots);
        });
      }
      if (MixinApi.isSensor(self)) {
        const line = `You ${[...away, out.self].join(' and ')}.`;
        MessageApi.scene(self)
          .topic('act.deed')
          .toSelf(Mml.text(line))
          .toPeers(Mml.compose`${Mml.actor(self)} ${Mml.text(out.peer)}.`)
          .send();
      }
      return null;
    }

    /** How a held thing went home, in the readying line: *sheathe your sword*, *put the mug in your coat's left pocket*. */
    private putAwayPhrase(held: Stuff): string {
      const bare = held.presentationPhrase().bare();
      const at = MixinApi.isContainable(held) ? held.getContainer() : null;
      // A holder shaped to it (a scabbard, a sheath, a holster) is a sheathing.
      if (at !== null && MixinApi.isContainer(at) && !at.isAgent() && at.getShapedTo() !== null) return `sheathe your ${bare}`;
      const where = this.holderPhrase(held);
      return where !== null ? `put your ${bare} in ${where}` : `put your ${bare} away`;
    }

    /** How a thing comes to hand, in the readying line — to the giver and to the room. */
    private drawPhrase(item: Stuff & Containable): { self: string; peer: string } {
      const bare = item.presentationPhrase().bare();
      const at = item.getContainer();
      const shaped = at !== null && MixinApi.isContainer(at) && !at.isAgent() && at.getShapedTo() !== null;
      const where = this.holderPhrase(item);
      if (shaped) return { self: `draw your ${bare}`, peer: `draws ${item.presentationPhrase().indefinite()}` };
      return {
        self: where !== null ? `pull out your ${bare} from ${where}` : `pull out your ${bare}`,
        peer: `pulls out ${item.presentationPhrase().indefinite()}`,
      };
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

    /**
     * ⭐ The hands-full refusal is the tutorial (requirements § Collisions):
     * it names what is in the hands, what did not fit and where it was
     * tried, and the next command in this body's OWN pocket names — *"Your
     * hands are full — the cup and the lantern — and the map won't fit in
     * your pockets. Put something away (`put cup in left pocket`) or set it
     * down (`drop lantern`)."*
     */
    private nowhereWords(item: Stuff | null, held: Stuff[], tried: Stuff[]): string {
      const def = (x: Stuff): string => x.presentationPhrase().definite();
      const kw = (x: Stuff): string =>
        (MixinApi.isPerceptible(x) ? x.getPrimaryKeyword() : undefined) ?? x.presentationPhrase().bare();
      const it = item !== null ? def(item) : 'it';
      const where = [
        ...new Set(
          tried.map((h) =>
            MixinApi.isPlacing(h) && h.namedRegions().length > 0 ? 'your pockets' : `your ${h.presentationPhrase().bare()}`,
          ),
        ),
      ];
      const fit = where.length > 0 ? ` won't fit in ${GrammarApi.joinList(where)}` : ` has nowhere to go`;
      if (held.length === 0) return `${cap(it)}${fit}, and your hands can't take it.`;
      // ⭐ A thing that takes both hands while one is still free (drive
      // step 8's pole beside a lantern) says so — "your hands are full"
      // was untrue with a hand open.
      const need = item !== null ? this.handsFor(item) : null;
      const hands = need !== null && need > held.length && this.freeHands() > 0
        ? `${cap(it)} takes both hands — you're holding ${GrammarApi.joinList(held.map(def))} —`
        : `Your hands are full — ${GrammarApi.joinList(held.map(def))} —`;
      // The next command, in this body's own words: a held thing that WOULD
      // go away somewhere, and one to set down.
      let away: string | null = null;
      for (const h of held) {
        for (const p of this.carryPlaces()) {
          if (within(p.host, h) || !this.placeTakes(p, h)) continue;
          away = p.region !== undefined && MixinApi.isPlacing(p.host) && p.host.namedRegions().includes(p.region)
            ? `put ${kw(h)} in ${p.region}`
            : `put ${kw(h)} in ${kw(p.host)}`;
          break;
        }
        if (away !== null) break;
      }
      const drop = `drop ${kw(held[held.length - 1]!)}`;
      const next = away !== null
        ? `Put something away (\`${away}\`) or set it down (\`${drop}\`).`
        : `Set something down (\`${drop}\`).`;
      return `${hands} and ${need !== null && need > held.length && this.freeHands() > 0 ? 'it' : it}${fit}. ${next}`;
    }

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
          return this.nowhereWords(r.facts.item ?? null, r.facts.held, r.facts.tried);
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
        case 'pick-up': {
          const it = r.facts.item;
          const kw = (MixinApi.isPerceptible(it) ? it.getPrimaryKeyword() : undefined) ?? it.presentationPhrase().bare();
          return `You'd have to pick ${it.presentationPhrase().definite()} up first (\`get ${kw}\`).`;
        }
        case 'already-switching':
          return "You're already reaching for something.";
        default: {
          const never: never = r;
          return never;
        }
      }
    }
  }
  return CarryingMixin;
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
