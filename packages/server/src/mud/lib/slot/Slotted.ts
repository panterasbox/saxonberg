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

import type { MixinConstructor, MixinName, FieldMeta } from '../mixin';
import { Final, Unshadowable } from '../security/decorators';
import { Mixins } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Slottable } from './Slottable';
import type { Wearable } from './Wearable';
import type { Graded } from '../craft/Graded';
import { GRADE_BANDS } from '../craft/Grade';
import type { Durable } from '../material/Durable';
import type { Branded } from '../corpo/Branded';
import { MixinApi } from '../../api/mixin';
import { PerceptionApi } from '../../api/perception';
import type { MarkupAugmenter } from '../../api/mml';
import {
  MqlSubscriptionApi,
  REF_FIELDS,
  type SubscribableFieldDescriptor,
} from '../../api/mql-subscription';
import { Impression, type ImpressionClause } from './Impression';
import { Quantity } from '../quantity';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import type BodyPlan from '../../platform/idea/species/BodyPlan';
import type {
  CaptureContext,
  SlottedSlice,
} from '../persistence/PersistenceSlice';

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
 * - `bodyPart` — the anatomical part (a `body.*` key, Vitals) this slot
 *   *attaches at*. Losing the part disables the slot (coarse, in
 *   `canOccupy`). OPTIONAL: non-anatomical affordances (a cranial
 *   implant bay, a saddle surface, a future magic aura) omit it — the
 *   slot is its own axis that *references* anatomy where it has a home,
 *   not a thing anatomy owns. See docs/subsystems/vitals.md.
 * - `covers` — anatomical parts an occupant of this slot *covers*
 *   (`body.*` keys). The coverage relation — for armor mitigation,
 *   hit-location, "the wound is hidden under the coat". One slot may
 *   cover many parts. Declared seam; no consumer this build.
 */
export interface SlotSpec {
  name: string;
  accepts: string;
  capacity?: number;
  postures?: string[];
  userFacingDetail?: string;
  bodyPart?: string;
  covers?: string[];
}

/**
 * Public shape provided by SlottedMixin.
 */
/**
 * The outcome of {@link Slotted.tryReleaseFromSlots}. `dumpedTau` is set
 * only on a refusal, and is what the refusal cost the holder.
 */
export type SlotReleaseResult =
  | { readonly released: true; readonly vacated: number }
  | { readonly released: false; readonly dumpedTau: number };

/** Slot resolution query — by Detail keyword or by accepted-mixin. */
export type SlotResolutionQuery = { detail: string } | { accepts: string };

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
   * The **worn** stack, outermost-first — every occupant that is
   * `Wearable`, deduplicated across the several slots a garment may
   * claim.
   *
   * ⚠ Worn is a strict subset of slotted: a sheathed sidearm and a
   * cranial implant are *slotted*, not worn, and the wire projection
   * and the impression line both mean the clothes.
   *
   * Ordering today is **later-worn = outer** (slot insertion order,
   * reversed), which the covering-ladder comparator later refines into
   * *form sets the band, wear-order breaks ties inside a band*.
   */
  wornStack(): readonly (Stuff & Slottable & Wearable)[];

  /**
   * The covering over one body part, **outermost-first** — every worn
   * occupant of a slot whose `covers` names `partKey`, ordered by the
   * ladder (form sets the band; wear-order breaks ties inside a band).
   *
   * ⭐⭐ **This is the one outside-in walk.** Three logic singletons
   * each hand-rolled a copy of it — the trauma covering walk, the
   * struck-site armor stack, and the conduction walk — and they now
   * call this. Each of them already holds the host, so the call *drops*
   * a parameter rather than adding an Api hop.
   *
   * ⚠ Deliberately unfiltered by construction: the conduction walk
   * cares about a rubber sole's material and not about whether it
   * declares a form, so the shared method returns the occupants and
   * each caller narrows. An occupant with no covering form sorts
   * innermost.
   *
   * `includeHeld` appends wielded coverings — a raised shield fronts
   * ANY struck part, so it is not tied to a `covers` edge. Off by
   * default; combat and trauma turn it on when the blow is facing.
   */
  coveringAt(
    partKey: string,
    opts?: { includeHeld?: boolean },
  ): readonly (Stuff & Slottable)[];

  /**
   * The outermost thing covering `partKey`, or `null` when the part is
   * bare.
   *
   * ⭐ The soiling seam. When a deposit driver lands, it asks the
   * wearer which layer takes the stain — which is why an apron works
   * the moment room-condition ships, with nothing retrofitted here. It
   * is a METHOD the future build calls, not a signal it listens for.
   */
  outermostAt(partKey: string): (Stuff & Slottable) | null;

  /** The insulation stacked over one body part, in `clo`. */
  insulationAt(partKey: string): Quantity<'clo'>;

  /**
   * Whole-body insulation in `clo`, **surface-weighted per part**.
   *
   * ⭐ This is what makes bare hands cost their surface share and a
   * cloak beat a shirt because it covers more — neither of which a
   * body-wide sum can express, which is the fidelity tier
   * `Wearable.getClo`'s doc used to defer.
   */
  bodyInsulation(): Quantity<'clo'>;

  /**
   * How well the worn stack **breaks a wind**, `0..1` — the
   * surface-weighted average of each part's OUTERMOST layer's weave
   * density, discounted by how wet that layer is.
   *
   * ⭐ There is no `shell` role word and there is not going to be one:
   * *the dense oiled thing simply IS one*. Windproofing is what a close
   * weave does, so it derives from the number the loom already decides
   * — which is also why `weave` is a real decision at the loom rather
   * than a yield knob.
   *
   * ⚠ Only the outermost layer counts. A jumper under an open coat does
   * not break a wind, which is the whole reason you put the coat on.
   * And a soaked shell stops working, because wet cloth wicks the wind
   * straight through.
   */
  windproofing(): number;

  /**
   * How the worn stack shifts this host's own conspicuity, in
   * **concealment-band ranks** — negative hides, positive advertises.
   *
   * ⭐ The sign comes from **content, not a flag**: the outermost
   * layer's hue against a neutral, plus the form's weave density. So a
   * pack authoring a new dye gets concealment behaviour for free, and
   * nobody ever writes `isCamouflage: true`.
   *
   * ⚠ **The offset is ABSOLUTE, not terrain-matched.** Real camouflage
   * is a relationship between a thing and a background, and that
   * belongs to the search slate. A dark close weave is quieter than a
   * bright open one *everywhere*, which is a true and much smaller
   * claim, and the code says so rather than implying the bigger one.
   */
  concealmentOffset(): number;

  /**
   * How much attention this host draws, `[floor, 1]` — 1 is a bare face
   * in plain view, lower is a face somebody has to work to read.
   *
   * ⭐ One derived quantity, two consumers, one object: the same number
   * feeds `hideLevelFor`'s floor and the arcane standing-cost term. A
   * deep hood masking the face reduces the evidence observers
   * accumulate, which is **exactly Voss Decay's stated leak mechanism**
   * — so a MUNDANE hood makes an ARCANE veil cheaper to hold, and the
   * garment does real arcane work carrying no joules.
   *
   * ⚠⚠ **Faculty is capacity, never access.** This makes a binding
   * cheaper to HOLD. It gates no spell, changes no efficiency cap, and
   * confers no capability, and the floor is bounded well above zero so
   * no garment makes a binding free.
   */
  attentionFactor(): number;

  /**
   * Would wearing `candidate` put a low band outside a high one? True
   * iff its band is strictly below something already occupying a slot
   * it claims.
   *
   * ⚠ Shirt-vs-coat is NOT a violation — both are band 0, that is the
   * player's call, and its consequence is being cold rather than being
   * prevented. What this refuses is a shirt over plate.
   */
  wouldLayerViolate(candidate: Stuff & Slottable): boolean;

  /**
   * **Take `item` off this body entirely** — every slot it occupies, as
   * one decision.
   *
   * `{ released: false }` ⇒ the item refuses and NOTHING was vacated;
   * `{ released: true, vacated }` ⇒ it came off, `vacated` counting the
   * slots freed (0 when it was not in any, which is not a failure —
   * the caller decides whether "you aren't wearing that" matters).
   *
   * This exists because *leaving a body* is one event that several
   * verbs perform — `remove`, `unwield`, and every verb that moves an
   * item out of your inventory (`drop`, `give`, `put`). Before it, only
   * the first two vacated slots at all, so **dropping a wielded item
   * left a phantom occupant**: the sword was on the floor and the hand
   * stayed full forever. That was a live bug for all equipment, and it
   * was also the escape hatch that made the cursed-release gate
   * decorative — you could not unwield a cursed wand, but you could
   * drop it.
   *
   * The refusal is the occupant's to make (`Blessable.tryRelease` — the
   * `canEvict` shape: the engine asks, the object answers, default
   * permit), and it is **all-or-nothing** across the item's slots so a
   * two-handed cursed thing can never end up half off.
   */
  tryReleaseFromSlots(item: Stuff & Slottable): SlotReleaseResult;

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
  occupyAll(candidate: Stuff & Slottable, slots: readonly string[]): void;
  findOpenSlotFor(candidate: Stuff & Slottable): string | null;
  resolveSlot(by: SlotResolutionQuery): string | null;
  walkOccupants(
    visit: (
      host: Stuff & Slotted,
      slot: string,
      occupant: Stuff & Slottable,
    ) => void,
  ): void;
  vacateAll(
    candidate: Stuff & Slottable,
    slots: readonly string[]
  ): readonly ((Stuff & Slottable) | null)[];

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

/**
 * Fold the worn stack into the facet readings the impression line
 * renders. **Total over absent facts**: a garment that composes no
 * `Graded` contributes nothing to quality, and a stack with nothing
 * notable about its upkeep contributes no upkeep clause at all — which
 * is what keeps the line one sentence rather than a checklist.
 *
 * ⚠ Nothing here reads an occupant's presentation. The line must name
 * no individual garment, and the cheapest guarantee of that is never
 * having the words.
 */
function impressionClauses(
  stack: readonly (Stuff & Slottable & Wearable)[],
): ImpressionClause[] {
  const clauses: ImpressionClause[] = [];

  // ── quality: the mean grade across whatever is graded ──
  let gradeSum = 0;
  let gradeCount = 0;
  for (const item of stack) {
    const asStuff = item as unknown as Stuff;
    if (!MixinApi.isGraded(asStuff)) continue;
    gradeSum += (asStuff as Stuff & Graded).getGrade().getOrdinal();
    gradeCount++;
  }
  if (gradeCount > 0) {
    const bands = GRADE_BANDS;
    const mean = Math.round(gradeSum / gradeCount);
    const band = bands[Math.max(0, Math.min(bands.length - 1, mean))];
    if (band) clauses.push({ facet: 'quality', band });
  }

  // ── upkeep: wetness first (it is the loudest), then condition ──
  let wettest = 0;
  let worstCondition = 1;
  let anyDurable = false;
  for (const item of stack) {
    const asStuff = item as unknown as Stuff;
    if (MixinApi.isWet(asStuff)) {
      wettest = Math.max(wettest, asStuff.getWetness());
    }
    if (MixinApi.isDurable(asStuff)) {
      anyDurable = true;
      worstCondition = Math.min(
        worstCondition,
        (asStuff as Stuff & Durable).getCondition(),
      );
    }
  }
  if (wettest >= SOAKED_AT) {
    clauses.push({ facet: 'upkeep', band: 'soaked' });
  } else if (wettest >= DAMP_AT) {
    clauses.push({ facet: 'upkeep', band: 'damp' });
  } else if (anyDurable && worstCondition < RAGGED_BELOW) {
    clauses.push({ facet: 'upkeep', band: 'ragged' });
  } else if (anyDurable && worstCondition < WORN_BELOW) {
    clauses.push({ facet: 'upkeep', band: 'worn' });
  }

  // ── the mark, when ONE dominates the stack ──
  const marks = new Map<string, { count: number; label: string }>();
  for (const item of stack) {
    const asStuff = item as unknown as Stuff;
    if (!MixinApi.hasMixin(asStuff, Mixins.Branded)) continue;
    const brand = (asStuff as unknown as Branded).getBrand();
    if (!brand) continue;
    const seen = marks.get(brand.key) ?? { count: 0, label: brand.name };
    seen.count++;
    marks.set(brand.key, seen);
  }
  if (marks.size === 1 && stack.length > 1) {
    const only = [...marks.values()][0];
    if (only && only.count >= stack.length) {
      clauses.push({ facet: 'brand', band: 'dominant', token: only.label });
    }
  }

  return clauses;
}

/**
 * Append the dressed-impression line to a wearer's long description.
 *
 * Guarded to hosts that resolve a **body plan** — a weapon rack is
 * `Slotted` too, and a rack has no impression. Silent when nothing is
 * worn, and silent when no facet resolves.
 */
function impressionAugmenter(text: string, host: Stuff, viewer: Stuff): string {
  if (!MixinApi.isSlotted(host)) return text;
  if (!bodyPlanOf(host)) return text;
  const stack = host.wornStack();
  if (stack.length === 0) return text;
  const clauses = impressionClauses(stack);
  if (clauses.length === 0) return text;
  // The digest is what makes the read STABLE until the outfit changes
  // and honest when it does — the facets, not the garments.
  const digest = clauses.map((c) => `${c.facet}:${c.band}`).join('|');
  const seed = Impression.seedOf([host.stuffId, digest, viewer.stuffId]);
  const line = Impression.render(clauses, seed);
  if (!line) return text;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

/**
 * The body plan a host resolves, or `null` — the guard every
 * body-shaped method on this mixin shares. A weapon rack is `Slotted`
 * too, and it has no anatomy, no impression and no covering stack.
 */
function bodyPlanOf(host: Stuff): BodyPlan | null {
  // ⚠ Resolved the way the three walks this replaced resolved it —
  // `Organism.getSpecies()?.getBodyPlan()` — rather than through a
  // second mechanism. Two resolution paths for one fact is how the
  // refactor would have silently changed behaviour at the edges.
  if (!MixinApi.isOrganism(host)) return null;
  return host.getSpecies()?.getBodyPlan() ?? null;
}

/**
 * One occupant's band on the covering ladder — the construction's layer
 * depth, or **0 (innermost) for anything carrying no covering form**.
 *
 * ⚠ Total by construction. `getLayerDepth()` throws on a
 * weapon-delivery form, and a sheathed dagger is a legitimate slot
 * occupant, so the guard is not defensive padding: it is what lets one
 * comparator sort a mixed slot map.
 */
function depthOf(occupant: Stuff): number {
  if (!MixinApi.isConstructed(occupant)) return 0;
  const construction = occupant.getConstruction();
  if (!construction || !construction.isCovering()) return 0;
  return construction.getLayerDepth();
}

/** How much insulation a fully loose garment loses to its air gaps. */
const LOOSENESS_CLO_PENALTY = 0.35;

/** Band-ranks a fully conspicuous (or fully quiet) covering is worth. */
const COVERING_CONCEALMENT_WEIGHT = 1.5;

/** The lowest `attentionFactor` any garment can produce. */
const ATTENTION_FLOOR = 0.4;

/**
 * How much one garment advertises (`+`) or quiets (`−`) its wearer, in
 * `[-1, 1]`.
 *
 * ⭐ Derived from **content, not a flag**: a close weave in a colour
 * near the undyed neutral is quiet; a bright saturated one is loud. A
 * pack authoring a new dye therefore gets concealment behaviour for
 * free, and nobody ever writes `isCamouflage: true`.
 *
 * ⚠ An undyed garment is mildly quiet, not neutral — undyed linen is
 * the colour of everything else, which is the whole reason it was worn
 * by people who did not want to be looked at.
 */
function conspicuityOf(garment: Stuff): number {
  const density = MixinApi.isConstructed(garment)
    ? (garment.getConstruction()?.getFabric()?.weaveDensity ?? 0.5)
    : 0.5;
  // A close weave is a quieter silhouette: no light through it, no
  // fluttering edge.
  const weave = -0.4 * density;
  if (!MixinApi.isDyed(garment)) return weave;
  /*
   * ⭐ SATURATION, not strength — the difference the colour model buys.
   * The comment above always claimed "a bright saturated one is loud",
   * and reading strength could not tell a pale blue from a deep red at
   * the same dip. The folded mix knows, so a shallow vat is quiet and a
   * madder red is not, and a washed-out garment goes quiet on its own
   * because fading IS desaturation.
   */
  return clampSigned(weave + (garment.getColorMix()?.saturation() ?? 0));
}

function clampSigned(x: number): number {
  return x < -1 ? -1 : x > 1 ? 1 : x;
}

/** Numeric AppSetting read, falling back to the seeded literal. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/** Wetness at or above which the stack reads as soaked. */
const SOAKED_AT = 0.7;
/** Wetness at or above which the stack reads as damp. */
const DAMP_AT = 0.3;
/** Condition below which the stack reads as ragged. */
const RAGGED_BELOW = 0.25;
/** Condition below which the stack reads as merely worn. */
const WORN_BELOW = 0.6;

export function SlottedMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase
) {
  // Declared-then-returned (the Meltable shape) so method decorators
  // are legal — a class EXPRESSION cannot carry them.
  class SlottedMixin extends Base {
    static _mixinName = 'SlottedMixin';
    static fieldMeta: FieldMeta = {
      staticSlots: { persistent: true, authorable: true },
    };

    /**
     * Live-query subscribable field: `worn` — the **body** half against
     * `Container.contents`' **pack** half.
     *
     * ⭐ The two are a **partition of one set**, not two sets. A worn
     * garment never left its wearer's contents (`EquipController` only
     * claims slots), so `contents` skips anything currently occupying a
     * slot on the host and `worn` picks exactly those up. Worn is
     * public — it is what you can see on somebody — which is why the
     * card renders it for an `agent` where `contents` is deliberately
     * suppressed as reading their pockets.
     *
     * Same per-viewer filters as `contents`: never the viewer itself,
     * `Visible` only, and `PerceptionApi.perceives` so a concealed
     * garment never enters the projection.
     *
     * `dependsOnFields` keys the dependency index to the `'worn'` fires
     * installed on `occupy` / `vacate` / `vacateSole` — occupancy is not
     * a persistent field, so the events come from the primitives, the
     * way `contents` does.
     */
    static subscribableFields: SubscribableFieldDescriptor[] = [
      {
        name: 'worn',
        read: (stuff, viewer) => {
          const host = stuff as Stuff & Slotted;
          return host
            .wornStack()
            .filter(
              (item) =>
                item.stuffId !== viewer.stuffId &&
                MixinApi.isVisible(item as unknown as Stuff) &&
                PerceptionApi.perceives(viewer, item as unknown as Stuff),
            )
            .map((item) =>
              MqlSubscriptionApi.projectFields(
                item as unknown as Stuff,
                REF_FIELDS,
                viewer,
              ),
            );
        },
        dependsOnFields: ['worn'],
      },
    ];

    /** The dressed-impression line (see {@link Impression}). */
    static markupAugmenters: MarkupAugmenter[] = [impressionAugmenter];

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

    /**
     * Worn occupants, outermost-first. Walks the live slot map (whose
     * insertion order IS wear order — a `Map` and a `Set` both preserve
     * it, and the persistence spine re-wears through `occupyAll` in the
     * captured order, so it survives a round trip with no new field),
     * keeps only `Wearable` occupants, dedupes a multi-slot claim to
     * its first appearance, and reverses so later-worn reads outer.
     */
    public wornStack(): readonly (Stuff & Slottable & Wearable)[] {
      const seen = new Set<Stuff & Slottable>();
      const inWearOrder: (Stuff & Slottable & Wearable)[] = [];
      for (const occupants of this.slots.values()) {
        for (const occupant of occupants) {
          if (seen.has(occupant)) continue;
          seen.add(occupant);
          if (!MixinApi.isWearable(occupant as unknown as Stuff)) continue;
          inWearOrder.push(occupant as Stuff & Slottable & Wearable);
        }
      }
      // ⭐ Outermost-first BY THE LADDER, not merely by wear order —
      // the same comparator the covering stack uses, in one place.
      return this.sortOutermostFirst(inWearOrder);
    }

    /**
     * The ladder comparator, in ONE place: **form sets the band;
     * wear-order breaks ties inside a band.**
     *
     * `depthOf` reads the construction's layer band (fabrics and kernel
     * covering forms share one 0..4 ladder), and anything with no
     * covering form sorts innermost at 0.
     *
     * ⚠ The input is in **wear order** (a `Set` preserves insertion, and
     * the persistence spine re-wears through `occupyAll` in the captured
     * order, so the order is durable with no new field). It is
     * **reversed first**, then stably sorted — which is what makes
     * *later-worn = outer* inside a band. Reversing after the sort, or
     * not at all, silently gives you first-worn outer, and the two are
     * indistinguishable until a body can actually hold two layers.
     */
    private sortOutermostFirst<T extends Stuff & Slottable>(
      inWearOrder: readonly T[],
    ): T[] {
      return [...inWearOrder]
        .reverse()
        .sort(
          (a, b) =>
            depthOf(b as unknown as Stuff) - depthOf(a as unknown as Stuff),
        );
    }

    public coveringAt(
      partKey: string,
      opts: { includeHeld?: boolean } = {},
    ): readonly (Stuff & Slottable)[] {
      const self = this as unknown as Stuff & Slotted;
      const plan = bodyPlanOf(self);
      if (!plan) return [];
      const inWearOrder: (Stuff & Slottable)[] = [];
      const seen = new Set<Stuff & Slottable>();
      for (const spec of plan.getSlotsCovering(partKey)) {
        for (const occ of this.getOccupants(spec.name)) {
          if (seen.has(occ)) continue;
          if (!MixinApi.isWearable(occ as unknown as Stuff)) continue;
          seen.add(occ);
          inWearOrder.push(occ);
        }
      }
      if (opts.includeHeld) {
        // A wielded covering — armor you HOLD. Unlike worn armor it is
        // not tied to a `covers` edge: a raised shield fronts any part.
        for (const occupants of this.getAllOccupants().values()) {
          for (const occ of occupants) {
            if (seen.has(occ)) continue;
            const asStuff = occ as unknown as Stuff;
            if (!MixinApi.isWieldable(asStuff)) continue;
            if (!MixinApi.isConstructed(asStuff)) continue;
            if (!asStuff.getConstruction()?.isCovering()) continue;
            seen.add(occ);
            inWearOrder.push(occ);
          }
        }
      }
      return this.sortOutermostFirst(inWearOrder);
    }

    public outermostAt(partKey: string): (Stuff & Slottable) | null {
      return this.coveringAt(partKey)[0] ?? null;
    }

    public insulationAt(partKey: string): Quantity<'clo'> {
      const self = this as unknown as Stuff;
      const penalty = dial(
        AppSettingKeys.textilesFitLoosenessCloPenalty,
        LOOSENESS_CLO_PENALTY,
      );
      let clo = 0;
      for (const layer of this.coveringAt(partKey)) {
        const asStuff = layer as unknown as Stuff;
        if (!MixinApi.isWearable(asStuff)) continue;
        // ⭐ A loose garment leaves air GAPS, and a gap convects the
        // warmth away instead of trapping it. That is the fit
        // consequence, and it needs the wearer — which is why the
        // penalty lands here rather than inside `getClo()`, whose whole
        // point is being wearer-free.
        const fit = asStuff.fitOn(self);
        const factor = Math.max(0, 1 - fit.looseness * penalty);
        clo += asStuff.getClo().rawValue() * factor;
      }
      return Quantity.of(clo, 'clo');
    }

    public bodyInsulation(): Quantity<'clo'> {
      const self = this as unknown as Stuff & Slotted;
      const plan = bodyPlanOf(self);
      if (!plan) return Quantity.of(0, 'clo');
      let total = 0;
      for (const part of plan.getBodyParts()) {
        if (part.governsVital) continue;
        const share = plan.getPartSurfaceFraction(part.key);
        if (!(share > 0)) continue;
        total += share * this.insulationAt(part.key).rawValue();
      }
      return Quantity.of(total, 'clo');
    }

    public windproofing(): number {
      const self = this as unknown as Stuff & Slotted;
      const plan = bodyPlanOf(self);
      if (!plan) return 0;
      let weighted = 0;
      for (const part of plan.getBodyParts()) {
        if (part.governsVital) continue;
        const share = plan.getPartSurfaceFraction(part.key);
        if (!(share > 0)) continue;
        const outer = this.outermostAt(part.key);
        if (!outer) continue;
        const asStuff = outer as unknown as Stuff;
        const density = MixinApi.isConstructed(asStuff)
          ? (asStuff.getConstruction()?.getFabric()?.weaveDensity ?? 1)
          : 0;
        const wetness = MixinApi.isWet(asStuff) ? asStuff.getWetness() : 0;
        weighted += share * density * (1 - wetness);
      }
      return weighted < 0 ? 0 : weighted > 1 ? 1 : weighted;
    }

    public concealmentOffset(): number {
      const self = this as unknown as Stuff & Slotted;
      const plan = bodyPlanOf(self);
      if (!plan) return 0;
      const weight = dial(
        AppSettingKeys.stealthHideCoveringWeight,
        COVERING_CONCEALMENT_WEIGHT,
      );
      let weighted = 0;
      for (const part of plan.getBodyParts()) {
        if (part.governsVital) continue;
        const share = plan.getPartSurfaceFraction(part.key);
        if (!(share > 0)) continue;
        const outer = this.outermostAt(part.key);
        if (!outer) continue;
        weighted += share * conspicuityOf(outer as unknown as Stuff);
      }
      return weighted * weight;
    }

    public attentionFactor(): number {
      const self = this as unknown as Stuff & Slotted;
      const plan = bodyPlanOf(self);
      const floor = dial(
        AppSettingKeys.magicAttentionFloor,
        ATTENTION_FLOOR,
      );
      if (!plan) return 1;
      let masked = 0;
      for (const part of plan.getBodyParts()) {
        if (part.governsVital) continue;
        // ⚠ Only the HEAD masks a face. A cloak over the torso hides
        // nothing anybody was reading you by.
        if (!part.key.startsWith('body.head')) continue;
        const share = plan.getPartSurfaceFraction(part.key);
        if (!(share > 0)) continue;
        for (const layer of this.coveringAt(part.key)) {
          const asStuff = layer as unknown as Stuff;
          // The shipped hood needs NO new field: a garment that already
          // declares it masks identity is the thing that masks a face.
          const masksIdentity =
            MixinApi.isDisguiseBearing(asStuff) &&
            (asStuff.getDisguise()?.masksIdentity ?? false);
          const density = MixinApi.isConstructed(asStuff)
            ? (asStuff.getConstruction()?.getFabric()?.weaveDensity ?? 1)
            : 0;
          masked = Math.max(masked, masksIdentity ? 1 : density * 0.5);
        }
      }
      const factor = 1 - masked * (1 - floor);
      return factor < floor ? floor : factor > 1 ? 1 : factor;
    }

    public wouldLayerViolate(candidate: Stuff & Slottable): boolean {
      const self = this as unknown as Stuff & Slotted;
      const plan = bodyPlanOf(self);
      if (!plan) return false;
      const asStuff = candidate as unknown as Stuff;
      if (!MixinApi.isWearable(asStuff)) return false;
      const planPath = plan.getTemplatePath();
      if (!planPath) return false;
      const claims = asStuff.getSlotClaim(planPath);
      if (claims.length === 0) return false;
      const band = depthOf(asStuff);
      for (const slot of claims) {
        for (const occ of this.getOccupants(slot)) {
          if (occ === candidate) continue;
          if (depthOf(occ as unknown as Stuff) > band) return true;
        }
      }
      return false;
    }

    public canOccupy(candidate: Stuff & Slottable, slot: string): boolean {
      const spec = this.getSlotSpec(slot);
      if (!spec) return false;
      // Part 0 — anatomy + trauma gate (coarse, Vitals substrate). A slot
      // whose `bodyPart` is gone (missing) or fractured above the impair
      // threshold is disabled. No-op unless the host composes VitalsMixin
      // AND the gating part is actually missing / fractured, so intact
      // bodies behave exactly as before. `isVitals` narrows the host so
      // the calls are type-checked (no duck-typing cast).
      const host = this as unknown as Stuff;
      if (
        MixinApi.isVitals(host) &&
        (host.isSlotDisabledByAnatomy(slot) ||
          host.isSlotImpairedByTrauma(slot))
      ) {
        return false;
      }
      // Part 0.5 — folded gate. A folded Foldable host refuses its
      // posture-bearing slots: you can't sit on a folded chair. No-op
      // unless the host composes FoldableMixin AND is currently folded
      // AND the slot is posture-bearing, so ordinary slots and unfolded
      // hosts behave exactly as before.
      if (
        MixinApi.isFoldable(host) &&
        host.isFolded() &&
        (spec.postures?.length ?? 0) > 0
      ) {
        return false;
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
      // Synchronous slot-claim witness — the symmetric twin of
      // `onSlotReleased`, declared as an optional method on Slottable.
      // v1 consumer: PosedMixin records WHICH host's posture slot a body
      // is in, so "you wake where you slept" survives a logout (D10).
      if (candidate.onSlotOccupied) {
        candidate.onSlotOccupied(this as unknown as Stuff & Slotted, slot);
      }
      // Arming witness (combat's instrument seam): a CombatReactive
      // occupant hears its slot claim land, once per slot — through ALL
      // three arming paths (SlotApi.occupyAll, combat's grip swap,
      // persistence restore). Canonical @hook contract lives on
      // CombatReactiveMixin.onWielded. The typeof guard: the marker
      // narrowing walks attached shadows, but only a host-defined
      // method is dispatchable (a shadow reshapes hooks, never adds).
      if (
        MixinApi.isCombatReactive(candidate) &&
        typeof candidate.onWielded === 'function'
      ) {
        // Guarded (the combat engine's guardedHook posture, kept local —
        // Slotted stays free of combat imports): a throwing witness body
        // warns and is skipped, never aborts the slot claim.
        try {
          candidate.onWielded(this as unknown as Stuff & Slotted, slot);
        } catch (err) {
          console.warn('Slotted: onWielded threw — skipped', err);
        }
      }
      this.fireWornChange();
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
      // Combat witness second (generic witness first — the documented
      // order). Canonical @hook contract on CombatReactiveMixin.onUnwielded.
      if (
        MixinApi.isCombatReactive(candidate) &&
        typeof candidate.onUnwielded === 'function'
      ) {
        // Guarded — a throwing witness never aborts the slot release.
        try {
          candidate.onUnwielded(this as unknown as Stuff & Slotted, slot);
        } catch (err) {
          console.warn('Slotted: onUnwielded threw — skipped', err);
        }
      }
      this.fireWornChange();
      return candidate;
    }

    /**
     * Vacate `candidate` from each of `slots`, returning the per-slot
     * results in order (the D5 vanguard of the Slot OO sweep — was
     * `SlotApi.vacateAll`; the host owns its slots).
     */
    public vacateAll(
      candidate: Stuff & Slottable,
      slots: readonly string[]
    ): readonly ((Stuff & Slottable) | null)[] {
      return slots.map((slot) => this.vacate(slot, candidate));
    }

    /**
     * Multi-slot claim (transactional; was `SlotApi.occupyAll` — the
     * OO sweep). Either every slot is claimed or none — no partial
     * occupancy. Throws on validation failure identifying which slot
     * blocked it, rolling back partial occupancies first. Sealed —
     * the method owns the atomicity invariant. Ungated: the callers
     * are the embodiment/conveyance verbs and mixin cleanup paths —
     * a trusted relationship.
     */
    @Final
    @Unshadowable
    public occupyAll(
      candidate: Stuff & Slottable,
      slots: readonly string[],
    ): void {
      const claimed: string[] = [];
      try {
        for (const slot of slots) {
          this.occupy(candidate, slot);
          claimed.push(slot);
        }
      } catch (err) {
        // Rollback in reverse order.
        for (let i = claimed.length - 1; i >= 0; i--) {
          try {
            const sl = claimed[i];
            if (sl) this.vacate(sl, candidate);
          } catch {
            // Swallow rollback failures — the original error is the
            // one the caller cares about.
          }
        }
        throw err;
      }
    }

    /**
     * Find an empty slot on this host that the candidate fits, or
     * null. Single-slot only — multi-slot Wearable/Wieldable claims
     * consult `getSlotClaim()` and call `occupyAll`.
     */
    public findOpenSlotFor(candidate: Stuff & Slottable): string | null {
      for (const name of this.getSlotNames()) {
        if (this.isSlotFull(name)) continue;
        if (this.canOccupy(candidate, name)) return name;
      }
      return null;
    }

    /**
     * Slot resolution by Detail keyword OR by accepted-mixin. Used by
     * every slot-bearing verb (mount, sit X, wield X, …) to map an MQL
     * resolution to a slot.
     */
    public resolveSlot(by: SlotResolutionQuery): string | null {
      if ('detail' in by) {
        const detail = by.detail;
        for (const name of this.getSlotNames()) {
          const spec = this.getSlotSpec(name);
          if (spec?.userFacingDetail === detail) return name;
        }
        return null;
      }
      const accepts = by.accepts;
      for (const name of this.getSlotNames()) {
        const spec = this.getSlotSpec(name);
        if (spec?.accepts === accepts) return name;
      }
      return null;
    }

    /**
     * Walk this host's slot map and recurse into any Slotted occupant.
     * Visitor fires **once per unique occupant**. Depth-first; a cycle
     * guard skips re-walked hosts. Used by Mobile.traverse for the
     * conveyance ripple.
     */
    public walkOccupants(
      visit: (
        host: Stuff & Slotted,
        slot: string,
        occupant: Stuff & Slottable,
      ) => void,
    ): void {
      const visitedHosts = new Set<Stuff & Slotted>();
      const visitedOccupants = new Set<Stuff & Slottable>();
      const walk = (host: Stuff & Slotted): void => {
        if (visitedHosts.has(host)) return;
        visitedHosts.add(host);
        for (const [slotName, occupants] of host
          .getAllOccupants()
          .entries()) {
          for (const occupant of occupants) {
            if (visitedOccupants.has(occupant)) continue;
            visitedOccupants.add(occupant);
            visit(host, slotName, occupant);
            if (MixinApi.isSlotted(occupant)) {
              walk(occupant);
            }
          }
        }
      };
      walk(this as unknown as Stuff & Slotted);
    }

    public tryReleaseFromSlots(
      item: Stuff & Slottable,
    ): SlotReleaseResult {
      const self = this as unknown as Stuff & Slotted;
      const occupied = this.getSlotNames().filter((slot) =>
        this.getOccupants(slot).has(item),
      );
      // Not on the body at all — nothing to refuse and nothing to free.
      if (occupied.length === 0) return { released: true, vacated: 0 };

      // Ask the occupant. `MixinApi` rather than an import: the slot
      // substrate must not depend on the magic tree, and asking through
      // the narrowing predicate keeps the direction right — a slot knows
      // that occupants may refuse, not what a curse is.
      if (MixinApi.isBlessable(item)) {
        const refusal = item.tryRelease(self);
        if (refusal) {
          // All-or-nothing: nothing has been vacated yet, so a
          // two-handed cursed thing cannot end up half off.
          return { released: false, dumpedTau: refusal.dumpedTau };
        }
      }

      let vacated = 0;
      for (const slot of occupied) {
        if (this.vacate(slot, item)) vacated++;
      }
      return { released: true, vacated };
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
      // Combat witness second (generic witness first — the documented
      // order). Canonical @hook contract on CombatReactiveMixin.onUnwielded.
      if (
        MixinApi.isCombatReactive(sole) &&
        typeof sole.onUnwielded === 'function'
      ) {
        // Guarded — a throwing witness never aborts the slot release.
        try {
          sole.onUnwielded(this as unknown as Stuff & Slotted, slot);
        } catch (err) {
          console.warn('Slotted: onUnwielded threw — skipped', err);
        }
      }
      this.fireWornChange();
      return sole;
    }

    /**
     * Poke the subscription substrate after an occupancy change. The
     * substrate matches on `(KIND, 'field', 'worn')` and re-projects the
     * host, so the values carried are documentation-only — which is why
     * they are deliberately unequal rather than a real before/after
     * count (`fireFieldChange` suppresses an `Object.is` no-op).
     */
    private fireWornChange(): void {
      MqlSubscriptionApi.fireFieldChange(
        this as unknown as Stuff,
        'worn',
        null,
        this.slots.size,
      );
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
    /**
     * Persistence-spine capture hook (see
     * [docs/subsystems/persistence.md]). Serializes the worn/equipped
     * occupancy by **position**: each occupant that is also one of the
     * host's captured contents (a worn Wearable in the avatar's inventory)
     * is recorded as its container-slice index plus the slot names it
     * claims (a Wearable may claim several). Non-content occupants (a rider
     * on a mount, a sitter on a chair — not in the host's contents) resolve
     * to index -1 and are skipped: they are separate entities, not this
     * host's persistent gear. Restore re-wears via `SlotApi.occupyAll`,
     * centralized in `PersistableLogic` (it needs the restored-contents
     * array), so there is no paired `restoreSlice` here.
     */
    static captureSlice(
      host: Stuff,
      ctx: CaptureContext,
    ): SlottedSlice {
      const slotted = host as Stuff & Slotted;
      const byItem = new Map<Stuff & Slottable, string[]>();
      for (const [slotName, occupants] of slotted.getAllOccupants()) {
        for (const occupant of occupants) {
          const list = byItem.get(occupant) ?? [];
          list.push(slotName);
          byItem.set(occupant, list);
        }
      }
      const worn: Array<{ index: number; slots: string[] }> = [];
      for (const [item, slots] of byItem) {
        const index = ctx.indexOf(item);
        if (index >= 0) worn.push({ index, slots });
      }
      return { worn };
    }

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
  }
  return SlottedMixin;
}

const EMPTY_SET: ReadonlySet<Stuff & Slottable> = new Set();
