/**
 * AttiredMixin — **a body with clothes on it**, and the reads that fall
 * out of what it is wearing.
 *
 * ⭐⭐ **Split out of `SlottedMixin`, which was doing three jobs.** That
 * file was 1330 lines: the slot substrate (a named occupancy universe
 * anything can expose), the covering stack, and the body physics
 * derived from the covering stack. Only the first is general.
 *
 * ⚠⚠ **Nine of `Slotted`'s ten composers are not bodies** — Chair,
 * Floor, PlantPot, GardenBed, Campfire, ManaLamp, TpaTerminal, Bed and
 * Adornable — and every one of them used to carry `bodyInsulation()`,
 * `wornStack()` and `windproofing()`. A garden bed had a whole-body
 * insulation read; a door, through `Adornable`, could be asked its
 * windproofing. The `Bulkable` split states the test this fails:
 * `UnboundedSourceMixin` is *"a narrow capability composed only on
 * source fixtures; the base substrate knows nothing about it."*
 *
 * ⭐ The seam is real rather than a line-count cut: **eight of eleven of
 * `Slotted`'s imports came here** — `PerceptionApi`, `Quantity`,
 * `AppApi`, `Impression`, `GRADE_BANDS`, `Durable`, `Branded`,
 * `BodyPlan`. A split where the extracted piece takes two-thirds of the
 * dependencies with it is a seam; a long file is not.
 *
 * ## ⚠ Why `Attired` and not `Covering`
 *
 * Every read here routes through the host's `BodyPlan` and answers
 * **empty without one** — `coveringAt` asks `plan.getSlotsCovering()`.
 * So this is not "things laid over other things": a tablecloth or a
 * tarpaulin has no body parts and the machinery cannot serve it.
 * `Covering` would promise a generality the code refuses.
 *
 * It would also collide: `Construction.isCoveringForm()` already means
 * something else and narrower — *is this construction FORM covering-
 * shaped (kernel resist-bearing or a registered fabric)* — a property
 * of an item's material, not of a host wearing things.
 *
 * ⚠ `Worn` was unavailable for a second reason: **`worn` already means
 * DEGRADED** in this same code (`WORN_BELOW`, `RAGGED_BELOW`, and the
 * impression's `band: 'worn'` for a shabby garment).
 *
 * `Attired` covers clothes *and* armour — "battle attire" — which
 * `Clothed` strains at for a hauberk, and unlike `Dressed` it does not
 * collide with medical's shipped `dress` (treat / bind / dress a
 * wound).
 *
 * ## Composition
 *
 * Composes **on `Slotted`**, which it reads and does not replace: the
 * worn stack is a filtered view of the occupancy map. A body is both.
 * `Creature` is the only composer.
 *
 * ⚠ Occupancy is not persisted (the world re-inits on hydrate and
 * players re-dress each session), so nothing here is either. If that
 * ever changes it changes HERE, not in the slot substrate.
 *
 * Operational reference: `docs/subsystems/slot.md` (the substrate),
 * `docs/subsystems/embodiment.md` (the verbs),
 * `docs/subsystems/textiles.md` (the covering ladder and `clo`).
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { Mixins } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Slottable } from './Slottable';
import type { Slotted } from './Slotted';
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

/** What a body wearing things can be asked. */
export interface Attired {
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
  // ⚠ `isAttired`, not `isSlotted` — the whole point of the split is
  // that a chair is slotted and wears nothing.
  if (!MixinApi.isAttired(host)) return text;
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
  return clampSigned(weave + (garment.getColorMix()?.depth() ?? 0));
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

/*
 * ⚠⚠ **Bare `MixinConstructor`, and the dependency declared PER METHOD
 * via `this:` — the `BodyPlanSlotsMixin` idiom, and it is not cosmetic.**
 *
 * The first cut constrained this to `MixinConstructor<Stuff & Slotted>`,
 * which reads better and forces TypeScript to resolve the whole base
 * instance type at composition time. On `Creature`'s chain — already ten
 * mixins deep — the checker gives up and the inferred type degrades:
 * `Avatar` stopped structurally matching `Stuff` and the build produced
 * **1172 errors**, 309 of them the same "Avatar is missing ... from type
 * Stuff". `BodyPlanSlotsMixin` needs `Slotted` too and does it this way
 * for the same reason.
 */
/**
 * The ladder comparator: **form sets the band; wear-order breaks ties
 * inside a band.**
 *
 * ⚠ Module scope, not a private method, and that is load-bearing: the
 * methods here annotate `this:` to declare their `Slotted` dependency
 * (the `BodyPlanSlotsMixin` idiom), and **a `this:` annotation REPLACES
 * the class type** — so `this.sortOutermostFirst` stops resolving. It
 * takes no `this` anyway, which is the tell that it never wanted to be
 * a method.
 */
function sortOutermostFirst<T extends Stuff & Slottable>(
  inWearOrder: readonly T[],
): T[] {
  return [...inWearOrder]
    .reverse()
    .sort(
      (a, b) => depthOf(b as unknown as Stuff) - depthOf(a as unknown as Stuff),
    );
}

export function AttiredMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class AttiredMixin extends Base {
    /*
     * ⚠⚠ The initializer MUST widen to `string`. Writing
     * `static _mixinName: 'AttiredMixin' = …` — or `= Mixins.Attired`,
     * which is the same thing because `Mixins` is `as const` — pins the
     * static to a LITERAL type. Every other composed class in the chain
     * carries `_mixinName: string`, so a pinned literal makes the class
     * STATIC SIDE incompatible (TS2417) for every fixture and outer
     * mixin that declares its own name. `Base` is a type parameter, so
     * TypeScript defers the check to instantiation — the error surfaces
     * as `AvatarBase` collapsing to `never` and ~440 bogus
     * "Avatar is missing the following properties from Stuff", none of
     * them anywhere near this line.
     */
    static _mixinName = 'AttiredMixin';
    static fieldMeta: FieldMeta = {};

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
     *
     * ⚠⚠ `dependsOnFields` was `['worn']` and is now `['occupants']`:
     * the SLOT substrate fires that, and it used to fire a body concept
     * from primitives every chair uses. The projected field is still
     * called `worn`, so nothing client-side moved.
     *
     * ⚠ `dependsOnFields: ['occupants']` — the SLOT substrate fires
     * that on `occupy`/`vacate`/`vacateSole`, and it is deliberately
     * neutral now: it used to be named `'worn'`, which meant every
     * chair's occupancy primitives fired a body concept. The projected
     * field is still called `worn`, so nothing client-side moved.
     */
    static subscribableFields: SubscribableFieldDescriptor[] = [
      {
        name: 'worn',
        read: (stuff, viewer) => {
          const host = stuff as Stuff & Slotted & Attired;
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
        dependsOnFields: ['occupants'],
      },
    ];

    /** The dressed-impression line (see {@link Impression}). */
    static markupAugmenters: MarkupAugmenter[] = [impressionAugmenter];

    /**
     * Worn occupants, outermost-first. Walks the live slot map (whose
     * insertion order IS wear order — a `Map` and a `Set` both preserve
     * it, and the persistence spine re-wears through `occupyAll` in the
     * captured order, so it survives a round trip with no new field),
     * keeps only `Wearable` occupants, dedupes a multi-slot claim to
     * its first appearance, and reverses so later-worn reads outer.
     */
    public wornStack(this: Stuff & Slotted & Attired): readonly (Stuff & Slottable & Wearable)[] {
      const seen = new Set<Stuff & Slottable>();
      const inWearOrder: (Stuff & Slottable & Wearable)[] = [];
      /*
       * ⚠ `getAllOccupants()`, not `this.slots` — the raw Map is
       * SlottedMixin's private state, and the covering half reaching
       * into it was the coupling the split existed to remove. The
       * public read preserves insertion order, which IS wear order.
       */
      for (const occupants of this.getAllOccupants().values()) {
        for (const occupant of occupants) {
          if (seen.has(occupant)) continue;
          seen.add(occupant);
          if (!MixinApi.isWearable(occupant as unknown as Stuff)) continue;
          inWearOrder.push(occupant as Stuff & Slottable & Wearable);
        }
      }
      // ⭐ Outermost-first BY THE LADDER, not merely by wear order —
      // the same comparator the covering stack uses, in one place.
      return sortOutermostFirst(inWearOrder);
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

    public coveringAt(
      this: Stuff & Slotted & Attired,
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
      return sortOutermostFirst(inWearOrder);
    }

    public outermostAt(this: Stuff & Slotted & Attired, partKey: string): (Stuff & Slottable) | null {
      return this.coveringAt(partKey)[0] ?? null;
    }

    public insulationAt(this: Stuff & Slotted & Attired, partKey: string): Quantity<'clo'> {
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

    public bodyInsulation(this: Stuff & Slotted & Attired): Quantity<'clo'> {
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

    public windproofing(this: Stuff & Slotted & Attired): number {
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

    public concealmentOffset(this: Stuff & Slotted & Attired): number {
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

    public attentionFactor(this: Stuff & Slotted & Attired): number {
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

    public wouldLayerViolate(this: Stuff & Slotted & Attired, candidate: Stuff & Slottable): boolean {
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
  };
}
