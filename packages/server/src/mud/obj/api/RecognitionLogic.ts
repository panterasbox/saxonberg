// RecognitionLogic — the hot-reloadable logic singleton behind
// RecognitionApi. (Doc comment on the class below so @internal lands on
// the reflection.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Sensor } from '../../lib/message/Sensor';
import type { Perception } from '../../lib/perception/Perception';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { GrammarApi } from '../../api/grammar';
import { TemplatePathPrefixes } from '../../lib/paths';
// Type-only — the value is resolved lazily at call time via the
// registered singleton (see `canSeeGate`). A *static* import of any
// perception module would drag the `Modality → Idea` subsystem into this
// module's eval and crash boot. So: zero static perception imports here.
import type { VisionModality } from '../../lib/perception/modalities/VisionModality';
import { RECOGNITION, IDENTIFICATION } from '../../lib/belief/BeliefStore';

const RecognitionApiCallers = SecurityPolicies.FromModule(
  'mud/api/recognition#RecognitionApi'
);

/** Template path of the vision modality singleton. */
const VISION_PATH = `${TemplatePathPrefixes.perceptionModalities}vision`;

/** Shared empty coverage set — avoids per-call allocation. */
const EMPTY_COVERAGE: ReadonlySet<string> = new Set<string>();

/**
 * Visibility backstop — `false` only when the vision substrate is loaded
 * AND reports the viewer can't see the target. When the vision singleton
 * isn't registered yet (pre-boot, unit fixtures with no modalities), the
 * gate permits: upstream callers (look, scope-walk) already decide
 * *whether* to surface a target, so this is a backstop, not the primary
 * filter.
 */
function canSeeGate(
  viewer: Stuff & Sensor & Perception,
  target: Stuff
): boolean {
  const vision = StuffApi.findByTemplatePath(VISION_PATH);
  if (!vision) return true;
  const VisionCtor = vision.constructor as typeof VisionModality;
  return VisionCtor.canSee(viewer, target);
}

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

/**
 * The maximally-obscured form for a target the viewer can't perceive —
 * "someone" for a living being, "something" otherwise. Never a name.
 */
function obscured(target: Stuff): string {
  return MixinApi.isOrganism(target) ? 'someone' : 'something';
}

/**
 * Whether a disguise masks `target`'s identity. A masked target's
 * baseline already reads as the covering's `appearsAs` (via
 * `getPresentation`'s disguise deferral); this gate makes `describe`
 * *withhold a known name*.
 */
function isMasked(target: Stuff): boolean {
  if (!MixinApi.isDisguisable(target)) return false;
  return target.getDisguise()?.masksIdentity ?? false;
}

/**
 * The type-axis (identification) name, or `null` when the item isn't
 * identifiable or the viewer hasn't identified it (so the unidentified
 * baseline shows).
 */
function identificationName(viewer: Stuff, target: Stuff): string | null {
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
 * Weave the activity-status decoration onto a resolved identity core.
 * Applied only to the organism-identity branches; the non-organism/
 * masked branches return `getPresentation()`, which already carries the
 * status affix, so this never double-decorates.
 */
function decorate(core: string, target: Stuff): string {
  if (MixinApi.isStatus(target)) {
    const status = target.getStatus();
    if (status) return `${core}, ${status}`;
  }
  return core;
}

/** See {@link RecognitionApi.salientFeatures}. */
function salientFeaturesImpl(
  target: Stuff,
  covered: ReadonlySet<string> = EMPTY_COVERAGE
): string {
  let stem = '';

  // Authored generic appearance wins — it's the content author's "what a
  // stranger sees" and never leaks a proper name.
  if (MixinApi.isVisible(target)) {
    const short = target.getShortDescription();
    if (short) stem = short;
  }

  // Generated fallback from species.
  if (!stem) {
    const species = MixinApi.isOrganism(target)
      ? target.getSpecies()?.getCommonNames()[0]
      : undefined;
    stem = species
      ? `${GrammarApi.articleFor(species)} ${species}`
      : 'someone';
  }

  // Most-notable worn item, unless the disguise covers the body region.
  if (covered.size === 0) {
    const worn = mostNotableWorn(target);
    if (worn) stem = `${stem} wearing ${worn}`;
  }

  return stem;
}

/** See {@link RecognitionApi.describe}. */
function describeImpl(viewer: Stuff, target: Stuff): string {
  const baseline = target.getPresentation();

  // The viewer must be able to run perception queries.
  if (!MixinApi.isSensor(viewer) || !MixinApi.isPerception(viewer)) {
    return baseline;
  }
  // Backstop visibility gate.
  if (!canSeeGate(viewer, target)) {
    return obscured(target);
  }

  // A masked being: the known name is withheld by *not* consulting
  // recognition.
  if (isMasked(target)) return baseline;

  // The type-axis name, if the viewer has identified this type.
  const typeName = identificationName(viewer, target);

  // Recognition (instance axis) — living beings only.
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
    else core = salientFeaturesImpl(target); // a true stranger
    return decorate(core, target);
  }

  // Items / inert things: the identified type, else the unidentified
  // baseline.
  return decorate(typeName ?? baseline, target);
}

/** See {@link RecognitionApi.perceivedKeywords}. */
function perceivedKeywordsImpl(viewer: Stuff, target: Stuff): string[] {
  if (MixinApi.isOrganism(target)) {
    return GrammarApi.tokenize(describeImpl(viewer, target));
  }
  return MixinApi.isPerceptible(target) ? target.getKeywords() : [];
}

/**
 * See {@link RecognitionApi.recognizes}. A boolean read over the recognition
 * realm: does `viewer` hold a recognition belief about `target`? Not
 * organism-gated — `learnIdentity` records for any templatePath'd subject;
 * only `describe`'s *consumption* is living-being-specific.
 */
function recognizesImpl(viewer: Stuff, target: Stuff): boolean {
  if (!MixinApi.isBeliefStore(viewer)) return false;
  const referent = target.getTemplatePath();
  if (!referent) return false;
  return viewer.recall(RECOGNITION, referent) != null;
}

/** See {@link RecognitionApi.learnIdentity}. */
function learnIdentityImpl(
  viewer: Stuff,
  subject: Stuff,
  name: string | null
): void {
  if (!MixinApi.isBeliefStore(viewer)) return;
  const referent = subject.getTemplatePath();
  if (!referent) return;
  viewer.know(RECOGNITION, referent, { knownAs: name });
}

/**
 * RecognitionLogic — the hot-reloadable logic singleton behind
 * {@link RecognitionApi}.
 *
 * Lives at `/obj/api/recognition` (a stateless `Stuff` singleton, no
 * backing `Template`); `RecognitionApi`'s public statics forward here
 * via `StuffApi.singletonSync`. The naming algorithm and its helpers
 * live in module-private free functions (the former private statics plus
 * `describeImpl`/`salientFeaturesImpl`, so the public-to-public
 * `describe`/`salientFeatures`/`perceivedKeywords` self-calls don't trip
 * the gate). Each public method carries the `FromModule` gate per method.
 *
 * Like the Api face, this file makes **zero static perception imports** —
 * the vision modality is resolved lazily off its registered singleton.
 *
 * @internal
 */
@Unshadowable
export class RecognitionLogic extends Idea {
  /** See {@link RecognitionApi.describe}. */
  @CallSecurity(RecognitionApiCallers)
  public describe(viewer: Stuff, target: Stuff): string {
    return describeImpl(viewer, target);
  }

  /** See {@link RecognitionApi.recognizes}. */
  @CallSecurity(RecognitionApiCallers)
  public recognizes(viewer: Stuff, target: Stuff): boolean {
    return recognizesImpl(viewer, target);
  }

  /** See {@link RecognitionApi.learnIdentity}. */
  @CallSecurity(RecognitionApiCallers)
  public learnIdentity(
    viewer: Stuff,
    subject: Stuff,
    name: string | null
  ): void {
    learnIdentityImpl(viewer, subject, name);
  }

  /** See {@link RecognitionApi.salientFeatures}. */
  @CallSecurity(RecognitionApiCallers)
  public salientFeatures(
    target: Stuff,
    covered: ReadonlySet<string> = EMPTY_COVERAGE
  ): string {
    return salientFeaturesImpl(target, covered);
  }

  /** See {@link RecognitionApi.perceivedKeywords}. */
  @CallSecurity(RecognitionApiCallers)
  public perceivedKeywords(viewer: Stuff, target: Stuff): string[] {
    return perceivedKeywordsImpl(viewer, target);
  }
}
