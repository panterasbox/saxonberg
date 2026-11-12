/**
 * PlacingMixin — a Stuff that offers one or more **placements**: named
 * ways of sitting on or in it.
 *
 * A placement is the relation *where inside its container a thing sits*,
 * and it is named by the preposition a player types: `on` a desk, `in` a
 * compartment, `from` a hook. One host may offer several
 * (`placements: [on, in]` — a range is a firebox and a hot plate), and a
 * host that says nothing offers `on`, which is what every shipped
 * surface did before the relation had a name.
 *
 * Placement is auxiliary to containment, not a replacement for it. An
 * apple on a desk has `container = the desk's container` (the room) and
 * `placement = { host: the desk, name: 'on' }`. Placing doesn't enclose
 * — the member row says whether the relation encloses, and `in` does.
 *
 * No storage on the mixin itself for the placed items. `getPlaced()`
 * lazily walks the host's environment and filters by
 * `Containable.getPlacement()` resolving to this host. The Placing host
 * carries only the per-host MQL-keyword bridge field
 * (`userFacingDetail`), the offered names, and the per-host `canPlace`
 * veto.
 *
 * **Two composition refusals**, both enforced at runtime by the
 * `__validateComposition__` hook `StuffApi.register` dispatches once per
 * concrete class:
 *
 * 1. A Placing host MUST compose `ContainableMixin` — the host has to
 *    live somewhere for the lazy walk to have an environment. This is
 *    what keeps `Location` out: a room is not a thing you put things on,
 *    its floor is.
 * 2. A Placing host must NOT compose `ExitableMixin` — a thing you can
 *    go inside cannot also be something you put things on, because
 *    *which exits does each region afford* is a question the model
 *    refuses to answer. Put a `Fitting` or a `Chamber` in its contents
 *    instead.
 *
 * PlacingMixin does NOT require `Container` on the host. A simple table
 * has no interior — just a top. A desk with a drawer composes both, and
 * each works independently.
 *
 * See `docs/subsystems/spatial.md` and the `Placement` vocabulary Idea
 * (`/platform/idea/Placement/<name>`).
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { Mixins } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Sensor } from '../message/Sensor';
import type { VetoResult } from '../errors';
import type { StuffPlacedGroup } from '@saxonberg/types';
import type { Containable } from './Containable';
import { MixinApi, type AnyConstructor } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { PlacementOffers, type PlacementChoice } from './PlacementOffers';
import { PerceptionApi } from '../../api/perception';
import {
  MqlSubscriptionApi,
  REF_FIELDS,
  type SubscribableFieldDescriptor,
} from '../../api/mql-subscription';
import { Placement } from './Placement';
import { Placements } from './Placement';
import type { BoundaryOpening } from '../boundary/Conduit';
import { SIZE_DEFAULTS } from './Dimensions';

/**
 * ⭐ One region a host offers (size and carrying, the `placements` entry
 * widening): the way of sitting it is (`member`, a `Placement` path), and —
 * when a host offers more than one of a kind — its own name (a coat's
 * `breast pocket`, a range's `back plate`). A bare path in the list is an
 * entry whose name is its member, exactly as every shipped host wrote it.
 * `mouth`/`volumeM3` bound an enclosing region (a pocket); `covered`/`closes`
 * say whether a flap hides and shuts it.
 */
export interface PlacementEntry {
  member: string;
  name?: string;
  mouth?: BoundaryOpening;
  volumeM3?: number;
  covered?: boolean;
  closes?: boolean;
}

/** What room is left along a hanging length, in words — never a number. */
export type HangingRoom = 'none' | 'a small thing' | 'one more pouch' | 'plenty';

/**
 * Public shape provided by PlacingMixin.
 */
export interface Placing {
  /**
   * ⭐ What `word` means on this host (`PlacementOffers`): a member by its
   * primary word, else by any word it answers to, and the host's interior
   * when it has one. No word: its only offer, or which of them.
   */
  placementFor(word: string | undefined): PlacementChoice;
  /**
   * The placement names this host offers, primary first. Defaults to
   * `['on']` — every host that says nothing is a surface, which is
   * exactly what they all were. Authorable per row.
   */
  getPlacements(): readonly string[];
  setPlacements(paths: readonly (string | PlacementEntry)[]): Promise<void>;
  /**
   * The region `key` names — one of {@link getPlacements} — as a whole
   * entry (a bare member path reads as `{ member }`); `null` when this host
   * offers no such region.
   */
  getPlacementEntry(key: string): PlacementEntry | null;
  /**
   * ⭐ The way of sitting a region IS — its `Placement` document, resident
   * with the host (documents D7). Every reader of a placed pair asks the
   * host this, never the catalogue by the pair's name: a named region
   * (`breast pocket`) is not a path.
   */
  placementOf(key: string): Placement;

  /**
   * ⭐ How long this host's hanging edge is, m (size and carrying D4): its
   * own longest side by default (a tool rail, a strap); a `round` host its
   * circumference (a key ring). A worn belt answers its wearer's waist.
   */
  hangingLengthM(): number;
  /**
   * ⭐ The mass this host holds up hung from it, kg: its material's tensile
   * strength × its cross-section ÷ g ÷ a safety factor. `Infinity` for a
   * material with no strength given (a pegboard's authors need not care).
   */
  bearsKg(): number;
  /** The room left along the hanging region `key`, in words. */
  roomFor(key: string): HangingRoom;

  /**
   * Items currently placed on this host. Computed lazily by walking the
   * host's environment and filtering by
   * `Containable.getPlacement()?.host === this`. With `name`, only the
   * items placed under that member. Returned readonly; mutate via
   * `ContainmentApi.move`.
   */
  getPlaced(name?: string): readonly (Stuff & Containable)[];

  /**
   * Resolve a typed preposition to one of this host's placement names.
   * Primary word first (`words[0]` of the member's row), then any
   * secondary word. With no word: the sole member when there is one,
   * else the first offered. `null` when the word matches nothing.
   */
  resolvePlacement(word?: string): string | null;

  /**
   * MQL keyword bridge. If set, `put X on <keyword>` resolves the
   * keyword against the host's Detailed map and lands on this host.
   * Mirrors `SlotSpec.userFacingDetail`
   * (see slot.md § Detail-targeted resolution).
   */
  getUserFacingDetail(): string | undefined;
  setUserFacingDetail(v: string | undefined): void;

  /**
   * Per-host gate on placing `item` under the member `name`. Defaults
   * to refusing a name this host does not offer and, once the
   * vocabulary ships, refusing an enclosing member on a shut host;
   * authors override to reject specific items (a fragile shelf rejects
   * heavy items; a sloped surface rejects round ones; a wax tabletop
   * rejects hot ones). The refusal's `reason` is what the verb reads
   * into its prose, so name it for a player.
   */
  canPlace(item: Stuff & Containable, name: string): VetoResult;

  /**
   * @hook ⭐ The force this host bears down on `item`, placed on or in it,
   * N — beyond the item's own weight (B104). A shelf, a bench, a floor:
   * `0`. A screw press: its platen. Read by whatever a load matters to (a
   * mould's drain set and its press).
   */
  bearingLoadN(item: Stuff & Containable): number;

  /**
   * ⭐ **How much of a thing placed here the air can reach**, `[0, 1]`.
   *
   * Drying is **surface-limited** — the air has to get to the water. A ham
   * on a slatted rack dries all over; the same ham flat on a stone slab
   * dries on top and goes off underneath; cheese sits on open shelves and
   * turf is built into an openwork lattice for exactly this reason; and a
   * ham hung from a hook is in the air on every side.
   *
   * `1` is the default, because a host a thing is *put on* to be worked
   * with is normally an airy one, and because the alternative was a list of
   * blessed drying furniture. An author who wants a close, stifling host
   * turns the number down — which is the whole affordance: a drying rack, a
   * meat hook, a cheese shelf, a turf stack, a wire line and a bad drying
   * shed all come out of rows.
   *
   * ⚠ This is the *host's* claim about its own airiness, not a claim
   * about the room. Read by `MoistureMixin`'s two-way arm off
   * `Containable.getPlacement()`; a thing merely dropped on the floor is
   * placed on nothing and reads the `cure.groundExposure` dial instead.
   */
  getAirExposure(): number;
  setAirExposure(v: number): void;

  /** Public so the applier can reflect into it. Not the contract. */
  airExposure: number;
  /** Public so the applier can reflect into it. Not the contract. */
  placements: (string | PlacementEntry)[];
}

export function PlacingMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class PlacingMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName: string = 'PlacingMixin';

    static fieldMeta: FieldMeta = {
      userFacingDetail: { persistent: true, authorable: true },
      airExposure: { persistent: true, authorable: true },
      placements: { persistent: true, authorable: true },
    };

    /**
     * ⭐ Rung 1 of the containment read.
     *
     * - `holds` — this host holds more (things sit on/in it). Capability,
     *   not a count, so `static` and always true; a thing composing both
     *   `Container` and `Placing` reads one `holds: true` (same-named
     *   descriptor, map-deduped by name).
     * - `placed` — a DETAIL field: the items placed on this host, grouped
     *   by member with the member's own heading off its `Placement` row
     *   (`On it` / `In it` / `Hanging from it`). Per-viewer filtered the
     *   way `Container.contents` is. Name-keyed, woken by a `placement` or
     *   `contents` fire. NOT a recursive nesting view — one flat grouping.
     */
    static subscribableFields: SubscribableFieldDescriptor[] = [
      {
        name: 'holds',
        static: true,
        read: () => true,
      },
      {
        name: 'placed',
        dependsOnFields: ['placement', 'contents'],
        read: (stuff, viewer) => {
          const host = stuff as unknown as Stuff & Placing;
          const groups: StuffPlacedGroup[] = [];
          for (const member of host.getPlacements()) {
            const items = host.getPlaced(member).filter(
              (c) =>
                c.stuffId !== viewer.stuffId &&
                MixinApi.isVisible(c) &&
                PerceptionApi.perceives(viewer, c),
            );
            if (items.length === 0) continue;
            const row = host.placementOf(member);
            groups.push({
              name: row.getName(),
              heading: row.getHeading() || 'With it',
              items: items.map(
                (c) =>
                  MqlSubscriptionApi.projectFields(
                    c,
                    REF_FIELDS,
                    viewer as Stuff & Sensor,
                  ) as unknown as StuffPlacedGroup['items'][number],
              ),
            });
          }
          return groups.length > 0 ? groups : undefined;
        },
      },
    ];

    /**
     * Composition-time check — the two refusals in the module
     * docstring. Dispatched once per concrete class by
     * `StuffApi.register`.
     */
    static __validateComposition__(ctor: AnyConstructor): void {
      const name = (ctor as { name?: string }).name ?? 'class';
      if (!MixinApi.hasMixin(ctor, Mixins.Containable)) {
        throw new Error(
          `${name} composes PlacingMixin but is missing ` +
            `ContainableMixin — a Placing host has to live in an ` +
            `environment for getPlaced() to walk.`,
        );
      }
      if (MixinApi.hasMixin(ctor, Mixins.Exitable)) {
        throw new Error(
          `${name} composes both PlacingMixin and ExitableMixin — a ` +
            `thing you can go inside cannot also be something you put ` +
            `things on, because "what exits does each region afford" ` +
            `is a question this model refuses to answer. Put a Fitting ` +
            `or a Chamber in its contents instead (that is how a boot ` +
            `works), or, if the outside of this vehicle really must ` +
            `carry things, write the class.`,
        );
      }
    }

    protected userFacingDetail: string | undefined = undefined;

    /** `[0, 1]` — how much of a placed thing the air reaches. Default airy. */
    public airExposure = 1;

    /** The offered regions — paths or entries — primary first. A bare host is a surface. */
    public placements: (string | PlacementEntry)[] = [Placements.ON];

    placementFor(word: string | undefined): PlacementChoice {
      return new PlacementOffers(this as unknown as Stuff).choose(word);
    }

    getPlacements(): readonly string[] {
      const v = this.placements;
      if (!Array.isArray(v) || v.length === 0) return [Placements.ON];
      return v.map((e) => (typeof e === 'string' ? e : (e.name ?? e.member)));
    }

    getPlacementEntry(key: string): PlacementEntry | null {
      const v = Array.isArray(this.placements) && this.placements.length > 0
        ? this.placements
        : [Placements.ON];
      for (const e of v) {
        if (typeof e === 'string') {
          if (e === key) return { member: e };
        } else if ((e.name ?? e.member) === key) {
          return { ...e };
        }
      }
      return null;
    }

    placementOf(key: string): Placement {
      // A key this host does not name is read as a member path, so a stale
      // pair still finds its way of sitting (and a missing one throws by path).
      const member = this.getPlacementEntry(key)?.member ?? key;
      return ContainmentApi.placements().need(member);
    }

    /**
     * ⭐ Loads every way of sitting the row names (by path), so a host is
     * live only when its placements are (documents D7) — and a path with no
     * placement document fails here, where it is named. (The kernel's three
     * are resident with every place.)
     */
    setPlacements(paths: readonly (string | PlacementEntry)[]): Promise<void> {
      const entries = paths.map((e) => {
        if (typeof e === 'string') return e;
        if (!e || typeof e.member !== 'string' || e.member === '') {
          throw new TypeError(`placements: an entry names no member (${JSON.stringify(e)})`);
        }
        return { ...e };
      });
      this.placements = entries;
      const members = entries.map((e) => (typeof e === 'string' ? e : e.member));
      // The applier awaits this: the row is live only when its placements are.
      return Promise.all(members.map((p) => ContainmentApi.placements().ensure(p))).then(() => undefined);
    }

    getPlaced(name?: string): readonly (Stuff & Containable)[] {
      // Lazy walk: items in our environment placed on us. For a desk in
      // a room, the environment is the room; apples placed on the desk
      // have container = room, placement host = desk.
      const self = this as unknown as Stuff & Containable;
      const env = self.getContainer();
      if (!env) return [];
      const candidates = env.getContents();
      const selfStuff = this as unknown as Stuff;
      return candidates.filter((c) => {
        if (!MixinApi.isContainable(c)) return false;
        const placement = c.getPlacement();
        if (placement === null) return false;
        if (name !== undefined && placement.name !== name) return false;
        return (placement.host as Stuff).stuffId === selfStuff.stuffId;
      }) as readonly (Stuff & Containable)[];
    }

    resolvePlacement(word?: string): string | null {
      const offered = this.getPlacements();
      if (word === undefined) {
        return offered[0] ?? null;
      }
      const w = word.trim().toLowerCase();
      // Primary word first: a host offering both `on` and `from` takes
      // `put X on host` as `on`, because `on` is `on`'s primary.
      for (const nm of offered) {
        if (this.placementOf(nm).getPrepositions()[0] === w) return nm;
      }
      for (const nm of offered) {
        if (this.placementOf(nm).getPrepositions().includes(w)) return nm;
      }
      return null;
    }

    getUserFacingDetail(): string | undefined {
      return this.userFacingDetail;
    }
    setUserFacingDetail(v: string | undefined): void {
      this.userFacingDetail = v;
    }

    getAirExposure(): number {
      const v = this.airExposure;
      if (!Number.isFinite(v)) return 1;
      return v < 0 ? 0 : v > 1 ? 1 : v;
    }

    setAirExposure(v: number): void {
      if (!Number.isFinite(v)) return;
      this.airExposure = v < 0 ? 0 : v > 1 ? 1 : v;
    }

    public bearingLoadN(_item: Stuff & Containable): number {
      return 0;
    }

    canPlace(item: Stuff & Containable, name: string): VetoResult {
      if (!this.getPlacements().includes(name)) {
        return { ok: false, reason: 'no-such-placement' };
      }
      const member = this.placementOf(name);
      // ⭐ An ENCLOSING member puts the thing inside this host, so a
      // shut host refuses it — and says which, because a refusal a
      // player cannot act on teaches nothing. A non-enclosing member
      // (a hook on the outside of a shut box) is unaffected.
      if (member.getEncloses()) {
        const self = this as unknown as Stuff;
        if (MixinApi.isSealable(self) && !self.isOpen()) {
          return { ok: false, reason: 'shut' };
        }
      }
      // ⭐ The member fit (size and carrying D4) — the container rule's
      // regions: a pocket bounds by its mouth and its volume, a hanging
      // length by its length and what it bears. `on` bounds nothing.
      const fit = this.memberFitRefusal(item, name, member);
      if (fit !== null) return { ok: false, reason: fit };
      // Default: accept any Containable under an offered member.
      // Subclasses / shadows override for shape-specific gates
      // (capacity, weight, temperature).
      return { ok: true };
    }

    /** The member fit's refusal reason, or `null` (see {@link canPlace}). */
    private memberFitRefusal(item: Stuff, name: string, member: Placement): string | null {
      if (member.getHangs()) {
        const w = hangingWidthOf(item);
        if (w !== null) {
          let used = 0;
          for (const c of this.getPlaced(name)) {
            if (c.stuffId !== item.stuffId) used += hangingWidthOf(c) ?? 0;
          }
          // A hook takes ONE thing however wide it is — a point is not a
          // length; a rail takes them until its length is spent.
          if (used > 0 && used + w > this.hangingLengthM() + 1e-9) return 'no-room-along';
        }
        const bears = this.bearsKg();
        if (Number.isFinite(bears)) {
          let kg = MixinApi.isTangible(item) ? item.getMass().rawValue() : 0;
          for (const c of this.getPlaced(name)) {
            if (c.stuffId !== item.stuffId && MixinApi.isTangible(c)) kg += c.getMass().rawValue();
          }
          if (kg > bears + 1e-9) return 'too-heavy-for';
        }
        return null;
      }
      if (member.getEncloses()) {
        const entry = this.getPlacementEntry(name);
        const box = (MixinApi.isTangible(item) ? item.getFitBox() : null);
        if (entry === null || box === null) return null;
        if (entry.mouth && !box.fitsThrough(entry.mouth)) return 'too-big-for-mouth';
        if (typeof entry.volumeM3 === 'number' && entry.volumeM3 > 0) {
          let used = 0;
          for (const c of this.getPlaced(name)) {
            if (c.stuffId !== item.stuffId) used += (MixinApi.isTangible(c) ? c.getFitBox() : null)?.boxVolume() ?? 0;
          }
          if (used + box.boxVolume() > entry.volumeM3 + 1e-9) return 'no-room';
        }
      }
      return null;
    }

    /** See {@link Placing.hangingLengthM}. */
    public hangingLengthM(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isTangible(self)) return Infinity;
      const d = self.getDimensions();
      if (d === null) return Infinity;
      // A ring offers its circumference; anything else its longest side.
      if (self.getShapeName() === 'round') return Math.PI * d.longest();
      return d.longest();
    }

    /** See {@link Placing.bearsKg}. */
    public bearsKg(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isTangible(self)) return Infinity;
      const mat = self.getMaterial();
      const mpa = mat?.getTensileStrengthMPa() ?? 0;
      if (!(mpa > 0)) return Infinity;
      const d = self.getDimensions();
      if (d === null) return Infinity;
      // The cross-section that takes the pull: the two smaller sides.
      const { width, height } = d.crossSection();
      const newtons = mpa * 1e6 * width * height;
      return newtons / SIZE_DEFAULTS.STANDARD_GRAVITY / SIZE_DEFAULTS.HANG_SAFETY;
    }

    /** See {@link Placing.roomFor}. */
    public roomFor(key: string): HangingRoom {
      const length = this.hangingLengthM();
      if (!Number.isFinite(length)) return 'plenty';
      let used = 0;
      for (const c of this.getPlaced(key)) used += hangingWidthOf(c) ?? 0;
      const left = length - used;
      for (const step of SIZE_DEFAULTS.HANG_ROOM_WORDS) {
        if (left >= step.atLeastM) return step.words;
      }
      // An empty hook still takes one thing.
      return used > 0 ? 'none' : 'a small thing';
    }
  };
}

/**
 * The width a thing takes hanging from a length: its middle side (D4); a
 * flexible thing its packed cube root. `null` when its size is unknown.
 */
function hangingWidthOf(item: Stuff): number | null {
  return (MixinApi.isTangible(item) ? item.getFitBox() : null)?.hangingWidthM() ?? null;
}


