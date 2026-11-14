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
 * ⭐⭐ **An enclosing relation is containment; a supporting or hanging
 * relation is a pair** (size and carrying W9, owner 2026-11-13). A region
 * whose member encloses (a coat's `left pocket`, member `in`) is a region
 * OF the host, which is a `Container`: the key put there has `container =
 * the coat` and `placement = { host: the coat, name: 'left pocket' }`. For
 * `on` and `from` the host is a SIBLING in the same container; for an
 * enclosing member the host is the container itself.
 *
 * No storage on the mixin itself for the placed items. `getPlaced()`
 * lazily walks the host's environment and filters by
 * `Containable.getPlacement()` resolving to this host. The Placing host
 * carries only the per-host MQL-keyword bridge field
 * (`userFacingDetail`), the offered names, and the per-host `canPlace`
 * veto.
 *
 * **Three composition refusals**, all enforced at runtime by the
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
 *3. A Placing host whose class default offers an ENCLOSING member must
 *    compose `ContainerMixin` — what is in a region of a host is its
 *    contents (W9, D-W9-2). A row that names one on a non-Container host
 *    is refused by `setPlacements` once its member documents load.
 *
 * PlacingMixin does NOT otherwise require `Container` on the host. A simple
 * table has no interior — just a top. A desk with a drawer composes both,
 * and each works independently.
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
   * ⭐ The regions this host names for itself (`left pocket`, `back plate`)
   * — the entries that carry a `name` — in offer order. A host offering only
   * bare members names none. Each is a word the host answers to, so `put
   * cup in inner pocket` binds the coat with `via.region` (D26).
   */
  namedRegions(): readonly string[];

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
   * host's environment — and, for a host that is a Container, its own
   * contents (a region that encloses: a coat's pocket, W9) — and filtering
   * by `Containable.getPlacement()?.host === this`. With `name`, only the
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
  let inheritsKeywords: boolean | undefined;
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
            // ⭐ A named region is its own group (a coat's `left pocket`,
            // `inner pocket` — D26), headed by its name.
            const named = host.namedRegions().includes(member);
            groups.push({
              name: named ? member : row.getName(),
              heading: named ? member.charAt(0).toUpperCase() + member.slice(1) : row.getHeading() || 'With it',
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
     * Composition-time check — the three refusals in the module
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
      // ⭐ Refusal 3 (W9, D-W9-2): what is IN a region of a host is its
      // contents, so a host offering an enclosing member is a Container.
      // A class default names kernel paths, and `in` is the kernel's one
      // enclosing member (the documents are not read at composition).
      const defaults = (ctor as { defaultPlacements?: readonly string[] }).defaultPlacements ?? [];
      if (defaults.includes(Placements.IN) && !MixinApi.hasMixin(ctor, Mixins.Container)) {
        throw new Error(
          `${name} composes PlacingMixin offering '${Placements.IN}' by default ` +
            `but is not a ContainerMixin — a thing IN a host is its contents, ` +
            `so a host with an enclosing region must hold things (size and carrying W9).`,
        );
      }
    }

    protected userFacingDetail: string | undefined = undefined;

    /** `[0, 1]` — how much of a placed thing the air reaches. Default airy. */
    public airExposure = 1;

    /**
     * ⭐ What a host whose row names no placements offers — a surface, which
     * is what every shipped host was before the relation had a name. A class
     * whose honest count is zero says so (`Garment`: `[]` — a shirt with no
     * pockets offers no region, size and carrying D26).
     */
    static defaultPlacements: readonly string[] = [Placements.ON];

    /** The offered regions — paths or entries — primary first; the class default until a row says. */
    public placements: (string | PlacementEntry)[] = [
      ...((this.constructor as { defaultPlacements?: readonly string[] }).defaultPlacements ?? [Placements.ON]),
    ];

    placementFor(word: string | undefined): PlacementChoice {
      return new PlacementOffers(this as unknown as Stuff).choose(word);
    }

    getPlacements(): readonly string[] {
      return this.offeredEntries().map((e) => (typeof e === 'string' ? e : (e.name ?? e.member)));
    }

    /**
     * The row's entries, else the class default ({@link defaultPlacements}):
     * a host whose row says nothing is a surface, and a garment whose row
     * says nothing offers nothing.
     */
    private offeredEntries(): readonly (string | PlacementEntry)[] {
      const v = this.placements;
      if (Array.isArray(v) && v.length > 0) return v;
      return (this.constructor as { defaultPlacements?: readonly string[] }).defaultPlacements ?? [Placements.ON];
    }

    getPlacementEntry(key: string): PlacementEntry | null {
      for (const e of this.offeredEntries()) {
        if (typeof e === 'string') {
          if (e === key) return { member: e };
        } else if ((e.name ?? e.member) === key) {
          return { ...e };
        }
      }
      return null;
    }

    namedRegions(): readonly string[] {
      const out: string[] = [];
      for (const e of this.offeredEntries()) {
        if (typeof e !== 'string' && typeof e.name === 'string' && e.name !== '') out.push(e.name);
      }
      return out;
    }

    /**
     * ⭐ A host answers to the names of its regions (D26) — the
     * `DetailedMixin.getKeywords` pattern: the inherited face, then the
     * region names, lowercased and deduped.
     */
    getKeywords(viewer?: Stuff): string[] {
      inheritsKeywords ??=
        MixinApi.hasMixin(Base, Mixins.Perceptible) || MixinApi.hasMixin(Base, Mixins.Named);
      const out: string[] = inheritsKeywords
        ? (Base.prototype as unknown as { getKeywords(v?: Stuff): string[] }).getKeywords.call(this, viewer)
        : [];
      const seen = new Set(out);
      for (const name of this.namedRegions()) {
        const word = name.toLowerCase();
        if (!seen.has(word)) {
          seen.add(word);
          out.push(word);
        }
      }
      return out;
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
      // ⭐ An enclosing member on a host that holds nothing is refused once
      // its document says it encloses (W9, refusal 3's row half).
      const self = this as unknown as Stuff;
      return Promise.all(members.map((p) => ContainmentApi.placements().ensure(p))).then((loaded) => {
        const enclosing = loaded.find((m) => m.getEncloses());
        if (enclosing !== undefined && !MixinApi.isContainer(self)) {
          throw new TypeError(
            `placements: '${enclosing.getPath()}' encloses, and ${self.getTemplatePath() ?? self.stuffId} ` +
              `is not a Container — a thing in a region of a host is its contents (size and carrying W9)`,
          );
        }
      });
    }

    getPlaced(name?: string): readonly (Stuff & Containable)[] {
      // Lazy walk: items in our environment placed on us. For a desk in
      // a room, the environment is the room; apples placed on the desk
      // have container = room, placement host = desk. ⭐ And, for a host
      // that holds things, its own contents in a region of it (a coat's
      // pocketed key — W9, D-W9-6: an enclosing region is containment).
      const self = this as unknown as Stuff & Containable;
      const env = self.getContainer();
      const selfStuff = this as unknown as Stuff;
      const own = MixinApi.isContainer(selfStuff) ? selfStuff.getContents() : [];
      const candidates = env ? [...env.getContents(), ...own] : own;
      if (candidates.length === 0) return [];
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
        // ⭐ …and no longer than the pocket is deep, give or take what stands
        // out of its mouth (a sword would pass a trouser pocket's mouth
        // end-on and its volume, and was put away there — the drive).
        if (entry.mouth && typeof entry.volumeM3 === 'number' && entry.volumeM3 > 0) {
          const depth = entry.volumeM3 / (entry.mouth.width * entry.mouth.height);
          if (box.longest() > depth * SIZE_DEFAULTS.POCKET_STICK_OUT + 1e-9) return 'too-big-inside';
        }
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

// `via.region` facet — declaration-merged onto MqlMatchVia beside its owner
// (the `via.bulk` / `via.detailPath` pattern): set when a placing host bound
// through the name of one of its regions (`inner pocket`), so the verb puts
// into THAT region and never asks which.
declare module '../../api/mql/types' {
  interface MqlMatchVia {
    /** The named region of the matched placing host the words named. */
    region?: string;
  }
}
