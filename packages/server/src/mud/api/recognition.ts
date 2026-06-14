/**
 * RecognitionApi — the **viewer-aware naming step**: turn a `(viewer,
 * target)` pair into the name-string that viewer would render for that
 * target, composing the per-viewer identity memory held in the belief
 * store (`lib/belief/BeliefStore.ts`) over the viewer-blind baseline
 * (`Stuff.getPresentation()`).
 *
 * This is the "(B) routine" of the recognition / identification
 * substrate (`docs/subsystems/belief.md`). It is the
 * consumer-intelligence layer over the dumb belief-store spine: the
 * spine holds records, this Api decides how a name bends around them.
 *
 * ## Why here, not on `PerceptionApi`
 *
 * The naming step *consults* perception for its visibility gate ("can V
 * see T?") but is its own concern — instance/type identity memory, not
 * sensory channels. The requirements fix that it is **not** homed on
 * `PerceptionApi`; this Api is the natural home, and it also hosts the
 * `learnIdentity` write-sink that the `introduce` verb and
 * future ambient triggers share.
 *
 * ## The algorithm (per target)
 *
 *   1. Baseline = `target.getPresentation()` (viewer-blind).
 *   2. If the viewer can't perceive-query (not a `Sensor & Perception`)
 *      or can't *see* the target → baseline (a backstop; real
 *      visibility filtering happens upstream in `look`/scope-walk).
 *   3. **Recognition** (instance axis) applies to living beings
 *      (`OrganismMixin`) — the things you *meet* and learn names for.
 *      A masked target (disguise) withholds any known name. A
 *      record with a non-null `knownAs` renders that name; an unknown
 *      being renders a generated {@link salientFeatures} string ("a tall
 *      stranger"), never its true name.
 *   4. **Identification** (type axis) applies to everything else
 *      (items, substances) — {@link identificationName} renders a known
 *      type over the unidentified baseline.
 *   5. Status decoration weaves in last.
 *
 * **Pure — no record mutation.** `describe` runs for every perceived
 * target × viewer on every look / listing / MQL projection; a write here
 * would corrupt memory on every read. The repeat-perception write fires
 * on the perceive *controller* path, never in `describe`.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Sensor } from '../lib/message/Sensor';
import type { Perception } from '../lib/perception/Perception';
import { MixinApi } from './mixin';
import { StuffApi } from './stuff';
import { GrammarApi } from './grammar';
import { TemplatePathPrefixes } from '../lib/paths';
// Type-only — the value is resolved lazily at call time via the
// registered singleton (see `canSeeGate`). A *static* import of any
// perception module would drag the `Modality → Idea` subsystem into
// this Api's module-eval; since `RecognitionApi` is reachable from the
// root `Stuff`/`Idea` eval graph (via `Mml` / the MQL projection), that
// forces `Modality` to evaluate before `Idea` is ready and crashes
// boot. So: zero static perception imports here.
import type { VisionModality } from '../lib/perception/modalities/VisionModality';
import { RECOGNITION, IDENTIFICATION } from '../lib/belief/BeliefStore';
import { SecurityApi } from './security';

/** Template path of the vision modality singleton. */
const VISION_PATH = `${TemplatePathPrefixes.perceptionModalities}vision`;

/**
 * Visibility backstop — `false` only when the vision substrate is
 * loaded AND reports the viewer can't see the target. When the vision
 * singleton isn't registered yet (pre-boot, unit fixtures with no
 * modalities), the gate permits: upstream callers (look, scope-walk)
 * already decide *whether* to surface a target, so this is a backstop,
 * not the primary filter. Resolves `VisionModality.canSee` off the
 * singleton's constructor so no static perception import is needed.
 */
function canSeeGate(
  viewer: Stuff & Sensor & Perception,
  target: Stuff,
): boolean {
  const vision = StuffApi.findByTemplatePath(VISION_PATH);
  if (!vision) return true;
  const VisionCtor = vision.constructor as typeof VisionModality;
  return VisionCtor.canSee(viewer, target);
}

export class RecognitionApi {
  /**
   * The viewer-aware name for `target` as `viewer` would render it. See
   * the class docstring for the algorithm. Always returns a string —
   * the viewer-blind baseline is the universal fallback.
   *
   * `viewer` is typed `Stuff` (not the narrower `Sensor & Perception`)
   * so every call site — including the no-narrowing `Mml` render path —
   * can pass whatever it has; the perceiver-ness is checked internally.
   */
  public static describe(viewer: Stuff, target: Stuff): string {
    const baseline = target.getPresentation();

    // The viewer must be able to run perception queries. Inert viewers
    // (a logging sink, a non-perceiver fixture) get the baseline.
    if (!MixinApi.isSensor(viewer) || !MixinApi.isPerception(viewer)) {
      return baseline;
    }
    // Backstop visibility gate — upstream callers (look, scope-walk)
    // already decide *whether* to surface the target; this only stops a
    // name leaking through a stray render of something unseen. A
    // perceiver who genuinely can't see the target gets the maximally
    // obscured form, never the true-name baseline.
    if (!canSeeGate(viewer, target)) {
      return this.obscured(target);
    }

    // A masked being: the baseline already reflects the disguise's
    // `appearsAs` (`getPresentation`'s disguise deferral); the known name
    // is withheld by *not* consulting recognition.
    if (this.isMasked(target)) return baseline;

    // The type-axis name, if the viewer has identified this type.
    const typeName = this.identificationName(viewer, target);

    // Recognition (instance axis) — living beings only. The two axes
    // COMPOSE here: a recognized instance + an identified type weave
    // ("Bob, a city guard"); each can apply alone.
    if (MixinApi.isOrganism(target)) {
      const referent = target.getTemplatePath();
      const instanceName =
        referent && MixinApi.isBeliefStore(viewer)
          ? (viewer.recall(RECOGNITION, referent)?.knownAs ?? null)
          : null;
      let core: string;
      if (instanceName && typeName) core = `${instanceName}, ${typeName}`;
      else if (instanceName) core = instanceName;
      else if (typeName) core = typeName; // identified, not yet recognized
      else core = this.salientFeatures(target); // a true stranger
      return this.decorate(core, target, viewer);
    }

    // Items / inert things: the identified type, else the unidentified
    // baseline ("a potion of healing" vs "a blue potion").
    return this.decorate(typeName ?? baseline, target, viewer);
  }

  /**
   * The single identity-learning write-sink. Records that `viewer` now
   * knows `subject` as `name` (a non-null name from an introduction; a
   * `null` name from a bare repeat-perception, which only tracks the
   * sighting). Every recognition trigger — the `introduce` verb, the
   * repeat-perception look path, future ambient triggers (fame, aether
   * id-aug) — funnels through here so they share one coalescing write.
   *
   * No-ops when `viewer` can't hold beliefs or `subject` has no durable
   * `templatePath` to key on (a freshly-constructed, never-cloned Stuff
   * — e.g. a generic NPC by construction has no stable identity to
   * recognize, which is exactly right).
   */
  public static learnIdentity(
    viewer: Stuff,
    subject: Stuff,
    name: string | null,
  ): void {
    if (!MixinApi.isBeliefStore(viewer)) return;
    const referent = subject.getTemplatePath();
    if (!referent) return;
    viewer.know(RECOGNITION, referent, { knownAs: name });
  }

  /**
   * Generate a salient-feature description for a being the viewer
   * doesn't recognize — "a tall human in a lab hoodie", "a hooded
   * figure". Viewer-independent (features are objective; only the *name*
   * is unknown). Reused by the viewer-relative targeting layer to derive its
   * keywords for unknowns, so naming and targeting can't diverge.
   *
   * v1 sources, in order: the authored generic appearance
   * (`Visible.shortDescription`), else a species-derived stem
   * ("a human"), else "someone"; then the most-notable worn garment is
   * appended ("… wearing a lab hoodie") unless that body region is
   * `covered` by a disguise.
   */
  public static salientFeatures(
    target: Stuff,
    covered: ReadonlySet<string> = EMPTY_COVERAGE,
  ): string {
    let stem = '';

    // Authored generic appearance wins — it's the content author's
    // "what a stranger sees" and never leaks a proper name.
    if (MixinApi.isVisible(target)) {
      const short = target.getShortDescription();
      if (short) stem = short;
    }

    // Generated fallback from species.
    if (!stem) {
      const species =
        MixinApi.isOrganism(target)
          ? target.getSpecies()?.getCommonNames()[0]
          : undefined;
      stem = species ? `${GrammarApi.articleFor(species)} ${species}` : 'someone';
    }

    // Most-notable worn item (v1: the first worn Wearable), unless the
    // disguise covers the body region it would reveal. `covered` is a
    // forward seam — v1 disguise covers `face`, which doesn't gate the
    // worn-garment line, so this is inert until per-region coverage
    // lands.
    if (covered.size === 0) {
      const worn = mostNotableWorn(target);
      if (worn) stem = `${stem} wearing ${worn}`;
    }

    return stem;
  }

  /**
   * The viewer-relative keyword set for targeting `target` — the tokens
   * `look <word>` may resolve it by. Derived from the SAME perceived
   * string `describe` renders, so naming and targeting can't diverge and
   * the true name never leaks as a keyword:
   *
   *   - a recognized being → its `knownAs` tokens ("bob"),
   *   - an unknown being → its salient-feature tokens ("tall", "stranger"),
   *   - a masked being → the disguise's tokens ("hooded", "figure"),
   *   - an item / inert thing → its ordinary `getKeywords()` (no identity
   *     gating — a rock is addressable by what it is).
   *
   * This is the Wave-5 name-leak gate: the engine closes the *direct*
   * keyword leak. Inferential leaks (elimination, watching someone don a
   * hood) stay legitimate player reasoning.
   */
  public static perceivedKeywords(viewer: Stuff, target: Stuff): string[] {
    if (MixinApi.isOrganism(target)) {
      return GrammarApi.tokenize(this.describe(viewer, target));
    }
    return MixinApi.isPerceptible(target) ? target.getKeywords() : [];
  }

  /**
   * The maximally-obscured form for a target the viewer can't perceive —
   * "someone" for a living being, "something" otherwise. Never a name.
   */
  private static obscured(target: Stuff): string {
    return MixinApi.isOrganism(target) ? 'someone' : 'something';
  }

  /**
   * Whether a disguise masks `target`'s identity. A masked target's
   * baseline already reads as the covering's `appearsAs` (via
   * `getPresentation`'s disguise deferral); this gate makes `describe`
   * *withhold a known name* so a viewer who'd otherwise recognize the
   * wearer sees the disguise instead. v1 reveal gate is dumb
   * (`masksIdentity` ⇒ withhold); per-channel partial recognition is v2.
   */
  private static isMasked(target: Stuff): boolean {
    if (!MixinApi.isDisguisable(target)) return false;
    return target.getDisguise()?.masksIdentity ?? false;
  }

  /**
   * The type-axis (identification) name, or `null` when the item isn't
   * identifiable or the viewer hasn't identified it (so the unidentified
   * baseline shows). Keyed on the item's `templatePath` (the type's
   * durable id) — v1 keys on templatePath only; appearance-keying (one
   * template, many appearances) defers. Renders the known type ("a
   * potion of healing") over the baseline ("a blue potion").
   */
  private static identificationName(viewer: Stuff, target: Stuff): string | null {
    if (!MixinApi.isIdentifiable(target)) return null;
    if (!MixinApi.isBeliefStore(viewer)) return null;
    const signature = target.getTemplatePath();
    if (!signature) return null;
    const record = viewer.recall(IDENTIFICATION, signature);
    if (record?.payload.typeKnown) {
      const known = target.getIdentifiedName();
      if (known) return known;
    }
    return null;
  }

  /**
   * Weave the activity-status decoration onto a resolved identity core
   * (a recognized `knownAs` or a salient-feature string — both
   * status-free): "Bob" → "Bob, watching the road". Applied only to the
   * organism-identity branches; the non-organism/masked branches return
   * `getPresentation()`, which already carries the status affix, so this
   * never double-decorates.
   */
  private static decorate(core: string, target: Stuff, _viewer: Stuff): string {
    if (MixinApi.isStatus(target)) {
      const status = target.getStatus();
      if (status) return `${core}, ${status}`;
    }
    return core;
  }
}

/** Shared empty coverage set — avoids per-call allocation. */
const EMPTY_COVERAGE: ReadonlySet<string> = new Set<string>();

/**
 * The most-notable worn item on `target`, rendered by its viewer-blind
 * presentation, or `null` when nothing wearable is worn. v1 "most
 * notable" = the first worn `Wearable` encountered in slot order.
 */
function mostNotableWorn(target: Stuff): string | null {
  if (!MixinApi.isSlotted(target)) return null;
  for (const occupants of target.getAllOccupants().values()) {
    for (const occupant of occupants) {
      if (MixinApi.isWearable(occupant)) {
        return occupant.getPresentation();
      }
    }
  }
  return null;
}

SecurityApi.decorateApiClass(RecognitionApi);
