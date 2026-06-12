/**
 * SlottedMixin — host capability: "I expose slots that things can occupy."
 *
 * The substrate underneath embodiment, posture, conveyance, and (post-
 * retrofit) Adornable. A Slotted host exposes a *slot universe* — a set
 * of named occupancy positions, each with a `SlotSpec` describing what
 * an occupant must compose, capacity, posture decoration, and an
 * optional user-facing detail keyword.
 *
 * Composition constraint: composes on `Stuff`. (No `Container` prereq —
 * a chair is `Slotted` without holding contents; a body is `Slotted`
 * without holding contents in the chair sense.)
 *
 * The slot universe surface (`getSlotNames`, `getSlotSpec`) is
 * **overridable**. Default impl reads `staticSlots` (Pattern A);
 * `BodyPlanSlotsMixin` overrides to derive from species → bodyPlan
 * (Pattern B); `AdornableMixin` overrides to derive from live fixture
 * keying (Pattern C). Consumers only ever call the methods.
 *
 * Runtime occupancy (`slots: Map<string, Set<…>>`) is **not persisted**.
 * The world re-inits on hydrate; slot maps come up empty. Players
 * re-wear / re-wield / re-mount each session.
 */

import type { MixinConstructor, MixinName } from '../mixin';
import { Mixins } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Slottable } from './Slottable';
import { MixinApi } from '../../api/mixin';

/**
 * Sentinel for unbounded-capacity slots. JSON/BSON-safe substitute for
 * `Infinity` (which doesn't round-trip through persistence). The floor's
 * `ground:1` slot uses this so multiple actors can share it.
 */
export const UNBOUNDED_CAPACITY: number = Number.MAX_SAFE_INTEGER;

/**
 * Per-slot declaration. Flat record — round-trips through the default
 * Hydrator with no custom marshaller.
 *
 * - `name` — canonical internal slot name (e.g., `'hand:left'`,
 *   `'sit:1'`). Colon-positional per decision #5.
 * - `accepts` — a `Mixins` registry constant naming the mixin an
 *   occupant must compose. Validated at `setStaticSlots` time.
 * - `capacity` — max simultaneous occupants. Default 1. Use
 *   `UNBOUNDED_CAPACITY` for unbounded.
 * - `postures` — slot-side decoration; consumed by Postured / verbs.
 *   Plain strings; no substrate-level validation (typo'd values
 *   surface at use time).
 * - `userFacingDetail` — keyword on the host's DetailedMixin map that
 *   targets this slot via MQL (`mount back`, `sit seat`).
 */
export interface SlotSpec {
  name: string;
  accepts: string;
  capacity?: number;
  postures?: string[];
  userFacingDetail?: string;
}

/**
 * Public shape provided by SlottedMixin.
 */
export interface Slotted {
  // Slot universe — overridable. Default reads `staticSlots`.
  getSlotNames(): readonly string[];
  getSlotSpec(name: string): SlotSpec | null;

  // Static-slots authoring surface (default-impl backing).
  getStaticSlots(): readonly SlotSpec[];
  setStaticSlots(value: SlotSpec[]): void;

  // Runtime occupancy.
  /**
   * Convenience for the common single-capacity case: returns the sole
   * occupant or null. Throws if the slot has multiple occupants.
   */
  getOccupant(slot: string): (Stuff & Slottable) | null;
  getOccupants(slot: string): ReadonlySet<Stuff & Slottable>;
  getAllOccupants(): ReadonlyMap<string, ReadonlySet<Stuff & Slottable>>;
  getOccupantCount(slot: string): number;
  isSlotOccupied(slot: string): boolean;
  isSlotFull(slot: string): boolean;

  canOccupy(candidate: Stuff & Slottable, slot: string): boolean;

  /**
   * Place `candidate` in `slot`. Throws on programmatic violation
   * (unknown slot, full, double-occupy, type mismatch).
   */
  occupy(candidate: Stuff & Slottable, slot: string): void;

  /**
   * Remove a SPECIFIC candidate from the slot's occupant set; returns
   * the candidate or null if it wasn't present. Throws on unknown slot.
   */
  vacate(slot: string, candidate: Stuff & Slottable): (Stuff & Slottable) | null;

  /**
   * Convenience for single-capacity slots — vacates the sole occupant.
   * Throws if the slot is unknown OR has multiple occupants.
   */
  vacateSole(slot: string): (Stuff & Slottable) | null;
}

/**
 * Validate a `SlotSpec[]` against the Mixins registry and uniqueness
 * constraints. Throws on first violation, naming the offending spec.
 */
function validateSlotSpecs(specs: SlotSpec[]): void {
  const validMixinNames = new Set<string>(Object.values(Mixins));
  const seenNames = new Set<string>();
  const seenDetails = new Set<string>();
  for (const spec of specs) {
    if (!spec.name || typeof spec.name !== 'string') {
      throw new Error(
        `SlotSpec missing 'name' (got ${JSON.stringify(spec)})`
      );
    }
    if (seenNames.has(spec.name)) {
      throw new Error(
        `SlotSpec duplicate slot name '${spec.name}'`
      );
    }
    seenNames.add(spec.name);
    if (!spec.accepts || typeof spec.accepts !== 'string') {
      throw new Error(
        `SlotSpec '${spec.name}' missing 'accepts'`
      );
    }
    if (!validMixinNames.has(spec.accepts)) {
      throw new Error(
        `SlotSpec '${spec.name}' has unknown 'accepts' mixin name: ` +
        `'${spec.accepts}' (not in Mixins registry)`
      );
    }
    if (spec.userFacingDetail) {
      if (seenDetails.has(spec.userFacingDetail)) {
        throw new Error(
          `SlotSpec '${spec.name}' duplicates userFacingDetail ` +
          `'${spec.userFacingDetail}' (must be unique per host)`
        );
      }
      seenDetails.add(spec.userFacingDetail);
    }
  }
}

export function SlottedMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase
) {
  return class SlottedMixin extends Base {
    static _mixinName = 'SlottedMixin';
    static persistentFields = ['staticSlots'];

    /**
     * Authoring data — only used by the default `getSlotNames` /
     * `getSlotSpec` implementation. Hosts that override the universe
     * surface (BodyPlanSlots, Adornable) leave this empty.
     */
    public staticSlots: SlotSpec[] = [];

    /**
     * Live runtime occupancy. Direct refs (proxy framework intercepts
     * on use). Each slot's value is the set of current occupants;
     * empty set when unoccupied. Not in `persistentFields` — starts
     * empty on clone / hydrate.
     */
    protected slots: Map<string, Set<Stuff & Slottable>> = new Map();

    public getStaticSlots(): readonly SlotSpec[] {
      return this.staticSlots;
    }

    public setStaticSlots(value: SlotSpec[]): void {
      validateSlotSpecs(value);
      this.staticSlots = value;
    }

    public getSlotNames(): readonly string[] {
      return this.staticSlots.map(s => s.name);
    }

    public getSlotSpec(name: string): SlotSpec | null {
      return this.staticSlots.find(s => s.name === name) ?? null;
    }

    public getOccupants(slot: string): ReadonlySet<Stuff & Slottable> {
      const set = this.slots.get(slot);
      if (set) return set;
      return EMPTY_SET;
    }

    public getAllOccupants(): ReadonlyMap<string, ReadonlySet<Stuff & Slottable>> {
      // Build a map keyed by every known slot name (including empty
      // ones, so callers can iterate a stable universe).
      const out = new Map<string, ReadonlySet<Stuff & Slottable>>();
      for (const name of this.getSlotNames()) {
        out.set(name, this.slots.get(name) ?? EMPTY_SET);
      }
      return out;
    }

    public getOccupantCount(slot: string): number {
      return this.slots.get(slot)?.size ?? 0;
    }

    public isSlotOccupied(slot: string): boolean {
      return this.getOccupantCount(slot) > 0;
    }

    public isSlotFull(slot: string): boolean {
      const spec = this.getSlotSpec(slot);
      if (!spec) return false;
      const cap = spec.capacity ?? 1;
      return this.getOccupantCount(slot) >= cap;
    }

    public getOccupant(slot: string): (Stuff & Slottable) | null {
      const set = this.slots.get(slot);
      if (!set || set.size === 0) return null;
      if (set.size > 1) {
        throw new Error(
          `Slotted.getOccupant('${slot}'): slot has ${set.size} occupants ` +
          `— use getOccupants() for multi-capacity slots`
        );
      }
      return set.values().next().value as Stuff & Slottable;
    }

    public canOccupy(candidate: Stuff & Slottable, slot: string): boolean {
      const spec = this.getSlotSpec(slot);
      if (!spec) return false;
      // Part 0 — anatomy gate (coarse, Vitals substrate). A missing body
      // part disables the slots it enables. No-op unless the host
      // composes VitalsMixin AND the gating part is actually gone, so
      // intact bodies behave exactly as before. Structural cast avoids a
      // lib/slot → lib/vitals import.
      const host = this as unknown as Stuff;
      if (MixinApi.hasMixin(host, Mixins.Vitals)) {
        const anatomical = host as unknown as {
          isSlotDisabledByAnatomy(slot: string): boolean;
        };
        if (anatomical.isSlotDisabledByAnatomy(slot)) return false;
      }
      // Part 1 — slot-side mixin check. `accepts` is validated to be
      // a Mixins-registry value at setStaticSlots() time; safe cast.
      if (!MixinApi.hasMixin(candidate, spec.accepts as MixinName)) {
        return false;
      }
      // Part 2 — candidate's per-slot test. SlottableMixin provides
      // a default `() => true`; Wearable / Wieldable override.
      return candidate.fitsSlot(this as unknown as Stuff & Slotted, slot);
    }

    public occupy(candidate: Stuff & Slottable, slot: string): void {
      if (!this.getSlotNames().includes(slot)) {
        throw new Error(
          `Slotted.occupy: unknown slot '${slot}' on host`
        );
      }
      const set = this.slots.get(slot) ?? new Set<Stuff & Slottable>();
      if (set.has(candidate)) {
        throw new Error(
          `Slotted.occupy: candidate already in slot '${slot}'`
        );
      }
      const spec = this.getSlotSpec(slot);
      const cap = spec?.capacity ?? 1;
      if (set.size >= cap) {
        throw new Error(
          `Slotted.occupy: slot '${slot}' is full (capacity ${cap})`
        );
      }
      if (!this.canOccupy(candidate, slot)) {
        throw new Error(
          `Slotted.occupy: candidate does not fit slot '${slot}' ` +
          `(accepts '${spec?.accepts ?? '?'}')`
        );
      }
      set.add(candidate);
      this.slots.set(slot, set);
    }

    public vacate(
      slot: string,
      candidate: Stuff & Slottable
    ): (Stuff & Slottable) | null {
      if (!this.getSlotNames().includes(slot)) {
        throw new Error(
          `Slotted.vacate: unknown slot '${slot}' on host`
        );
      }
      const set = this.slots.get(slot);
      if (!set || !set.has(candidate)) return null;
      set.delete(candidate);
      if (set.size === 0) this.slots.delete(slot);
      // Synchronous slot-release witness — declared as an optional
      // method on the Slottable interface. v1 consumer: Mobile clears
      // engagedMode for passthrough modes when the vacated host is
      // its conveyance (rider dismounting, driver leaving a cart).
      if (candidate.onSlotReleased) {
        candidate.onSlotReleased(this as unknown as Stuff & Slotted, slot);
      }
      return candidate;
    }

    public vacateSole(slot: string): (Stuff & Slottable) | null {
      if (!this.getSlotNames().includes(slot)) {
        throw new Error(
          `Slotted.vacateSole: unknown slot '${slot}' on host`
        );
      }
      const set = this.slots.get(slot);
      if (!set || set.size === 0) return null;
      if (set.size > 1) {
        throw new Error(
          `Slotted.vacateSole('${slot}'): slot has ${set.size} occupants ` +
          `— use vacate(slot, candidate) for multi-capacity slots`
        );
      }
      const sole = set.values().next().value as Stuff & Slottable;
      set.delete(sole);
      this.slots.delete(slot);
      // Same witness fires from the single-occupant convenience path.
      if (sole.onSlotReleased) {
        sole.onSlotReleased(this as unknown as Stuff & Slotted, slot);
      }
      return sole;
    }

    /**
     * R2.4 framework cleanup on the holder side. When a Slotted
     * host destructs, actively vacate every occupied slot via the
     * canonical `Slotted.vacate(slot, candidate)` chokepoint so
     * the held side's witness chain (`onSlotReleased`, posture
     * transitions, `onUnwielded`, …) fires. A naked
     * `slots.clear()` would leave occupants with a stale
     * `getOccupiedHost()` until lazy self-heal and would skip the
     * witness traffic.
     *
     * Walk order: for a Container+Slotted+Containable host
     * (avatar with a Wieldable in hand), the Container cleanup
     * (most-derived) evacuates contents first, then THIS step
     * vacates slots. A wielded sword that's also in the avatar's
     * contents ends up in the outer container (via Container
     * cleanup) AND cleanly unwielded (via this step).
     *
     * Iteration safety: snapshot the (host, slot, candidate)
     * tuples first because `host.vacate` mutates the live map.
     */
    static cleanupOnDestruct(stuff: Stuff): void {
      const host = stuff as Stuff & Slotted;
      const snapshot: Array<[string, Stuff & Slottable]> = [];
      for (const [slotName, occupants] of host.getAllOccupants().entries()) {
        for (const occupant of occupants) {
          snapshot.push([slotName, occupant]);
        }
      }
      for (const [slotName, occupant] of snapshot) {
        try {
          host.vacate(slotName, occupant);
        } catch (err) {
          console.error(
            `SlottedMixin.cleanupOnDestruct: failed to vacate ` +
              `${occupant.stuffId} from ${host.stuffId}.${slotName}`,
            err
          );
        }
      }
    }
  };
}

const EMPTY_SET: ReadonlySet<Stuff & Slottable> = new Set();
