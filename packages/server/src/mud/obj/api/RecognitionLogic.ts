// RecognitionLogic — the hot-reloadable logic singleton behind
// RecognitionApi. (Doc comment on the class below so @internal lands on
// the reflection.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Sensor } from '../../lib/message/Sensor';
import type { Perception } from '../../lib/perception/Perception';
import { MixinApi } from '../../api/mixin';
import type { RefKind } from '../../api/recognition';
import { StuffApi } from '../../api/stuff';
import { GrammarApi } from '../../api/grammar';
import { TemplatePathPrefixes } from '../../lib/paths';
// Type-only — the value is resolved lazily at call time via the
// registered singleton (see `canSeeGate`). A *static* import of any
// perception module would drag the `Modality → Idea` subsystem into this
// module's eval and crash boot. So: zero static perception imports here.
import type { VisionModality } from '../modalities/VisionModality';
import { RECOGNITION, IDENTIFICATION } from '../../lib/belief/BeliefStore';
import { Appearance } from '../../lib/identification/Appearance';
import { DescriptorBank } from '../../lib/identification/DescriptorBank';

const RecognitionApiCallers = SecurityPolicies.FromModule('/api/recognition#RecognitionApi'
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
  const record = currentTypeRecord(viewer, target);
  if (!record) return null;
  // ⚠ A **believed** name overrides the true one. This is the belief
  // store doing what it is for: holding something the viewer is
  // confident about and WRONG about. A cursed identify plants one, and
  // the reader has no way to tell from the inside — which is what
  // makes false information strictly worse than none.
  const believed = (record as { believedName?: unknown }).believedName;
  if (typeof believed === 'string' && believed.length > 0) return believed;
  if (!MixinApi.isIdentifiable(target)) return null;
  const known = target.getIdentifiedName();
  return known ? known : null;
}

/**
 * The viewer's **usable, current-generation** type record for `target`,
 * or `null`. The one place the "is this knowledge still good?" test
 * lives, so the name and the prose can never disagree about it.
 *
 * ⚠ A record from a PRIOR generation is deliberately treated as absent
 * (D28). Its descriptor may have been reissued meaning something else,
 * so asserting from it would state something possibly false; the caller
 * falls through to `unidentifiedLook`, which hedges instead.
 */
function currentTypeRecord(
  viewer: Stuff,
  target: Stuff,
): Record<string, unknown> | null {
  if (!MixinApi.isIdentifiable(target)) return null;
  if (!MixinApi.isBeliefStore(viewer)) return null;
  const signature = target.getTemplatePath();
  if (!signature) return null;
  const record = viewer.recall(IDENTIFICATION, signature);
  if (!record?.payload.typeKnown) return null;
  const learned = record.payload.learnedGeneration;
  if (
    typeof learned === 'number' &&
    !Appearance.isRecordCurrent(
      learned,
      Appearance.currentGeneration().generation,
    )
  ) {
    return null;
  }
  return record.payload as unknown as Record<string, unknown>;
}

/**
 * **Does this viewer actually know what this is?** — the gate on
 * revealing an item's authored long description.
 *
 * Strictly narrower than "shows a type name". A **believed** name reads
 * as knowledge from the inside and is not knowledge: a misidentified
 * potion must keep showing its class's generic prose, because the
 * authored paragraph belongs to the thing it really is and would
 * contradict the name the viewer has been given. False information is
 * only worse than none while it stays uncontradicted.
 */
function knowsTrueTypeImpl(viewer: Stuff, target: Stuff): boolean {
  const record = currentTypeRecord(viewer, target);
  if (!record) return false;
  const believed = (record as { believedName?: unknown }).believedName;
  return !(typeof believed === 'string' && believed.length > 0);
}

/**
 * **What an unidentified item looks like, and how a stale record hedges**
 * (magic-items D26/D28).
 *
 * Three cases, and the middle one is the whole reason the generation
 * rides the record:
 *
 * | Record | Shows as |
 * |---|---|
 * | current generation | *a potion of healing* (handled by `identificationName`) |
 * | **prior** generation | *a blue potion — you once knew blue to mean healing* |
 * | none | *a blue potion* |
 *
 * The descriptor pool is finite, so a descriptor is eventually reissued
 * meaning something else. That is the one moment a stale record could
 * assert something false — so the display **hedges rather than lies**.
 * One field, no sweep, and it only does work in the rare case.
 * Knowledge is never invalidated; only its applicability fades.
 *
 * Returns `null` when the item has no derived appearance at all, and the
 * caller falls back to the authored short description.
 */
function unidentifiedLook(viewer: Stuff, target: Stuff): string | null {
  if (!MixinApi.isIdentifiable(target)) return null;
  const { generation, progress } = Appearance.currentGeneration();
  const descriptor = target.renderAppearance(generation, progress);
  if (descriptor.length === 0) return null;

  const noun = target.getDescriptorClass();
  // `GrammarApi.articleFor` rather than a hardcoded "a": the descriptor
  // is drawn from a bank and half of them start with a vowel, so
  // "a iridescent crimson potion" is one draw away at all times.
  const phrase = `${descriptor} ${noun}`.trim();
  const look = `${GrammarApi.articleFor(phrase)} ${phrase}`;

  // A record from a PRIOR generation: hedge, never assert.
  if (!MixinApi.isBeliefStore(viewer)) return look;
  const signature = target.getTemplatePath();
  if (!signature) return look;
  const record = viewer.recall(IDENTIFICATION, signature)?.payload as
    | { typeKnown?: boolean; learnedGeneration?: number }
    | undefined;
  if (!record?.typeKnown) return look;
  const learned = record.learnedGeneration;
  if (
    typeof learned === 'number' &&
    !Appearance.isRecordCurrent(learned, generation)
  ) {
    const thenDescriptor = Appearance.descriptorFor(
      noun,
      learned,
      DescriptorBank.cached(noun),
    );
    const known = target.getIdentifiedName();
    if (thenDescriptor.length > 0 && known) {
      return `${look} — you once knew ${thenDescriptor} to mean ${known}`;
    }
  }
  return look;
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

/**
 * The bare "what a stranger sees" stem — authored `shortDescription`
 * ("a crossing guard"), else a species-generated fallback ("a dwarf"),
 * else "someone". Never leaks a proper name, carries NO worn-feature or
 * status affix. This is the concise identity a stranger reads in ambient
 * act lines; `salientFeaturesImpl` layers the distinguishing worn item on
 * top of it for the fuller presence / targeting surfaces.
 */
function strangerStem(target: Stuff): string {
  // Authored generic appearance wins — it's the content author's "what a
  // stranger sees" and never leaks a proper name.
  if (MixinApi.isVisible(target)) {
    const short = target.getShortDescription();
    if (short) return short;
  }
  // Generated fallback from species.
  const species = MixinApi.isOrganism(target)
    ? target.getSpecies()?.getCommonNames()[0]
    : undefined;
  return species ? `${GrammarApi.articleFor(species)} ${species}` : 'someone';
}

/** See {@link RecognitionApi.salientFeatures}. */
function salientFeaturesImpl(
  target: Stuff,
  covered: ReadonlySet<string> = EMPTY_COVERAGE
): string {
  let stem = strangerStem(target);

  // Most-notable worn item, unless the disguise covers the body region.
  if (covered.size === 0) {
    const worn = mostNotableWorn(target);
    if (worn) stem = `${stem} wearing ${worn}`;
  }

  return stem;
}

/**
 * The viewer-aware identity core, tiered by two independent affixes:
 *
 *   - `withFeatures` — for an unrecognized being, layer the distinguishing
 *     worn item onto the bare stem ("a crossing guard" →
 *     "a crossing guard wearing a faded hi-vis vest"). Reserved for
 *     *targeting* (`perceivedKeywords`), so `look vest` still resolves a
 *     stranger even though the prose stays concise.
 *   - `withStatus` — weave the activity-status affix ("…, watching the
 *     empty road"). Reserved for the **presence-scan** prose (the room
 *     occupant roll-call).
 *
 * The default (`describe`, both false) is the concise identity — a
 * recognized name or the bare stem — with NO worn feature and NO status,
 * so ambient act lines read "a crossing guard says …", not the whole life
 * story. The escalation is deliberate: acts → `describe`, the `look here`
 * roll-call → `describeWithStatus`, `look <him>` → the long description.
 * The fallback branches (no-sensor / obscured / masked) never decorate.
 */
function describeCore(
  viewer: Stuff,
  target: Stuff,
  withFeatures: boolean,
  withStatus: boolean
): string {
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
    // A true stranger: the bare stem, or the worn-augmented salient form
    // when the caller wants distinguishing features (targeting).
    else core = withFeatures ? salientFeaturesImpl(target) : strangerStem(target);
    return withStatus ? decorate(core, target) : core;
  }

  // Items / inert things: the identified type; else the DERIVED
  // unidentified look (which hedges a stale record rather than lying);
  // else the authored baseline.
  //
  // A player's own LABEL wins over both (D28) — it is the fix for the
  // one incongruity derived appearance creates, so it has to be visible
  // even once you know what the thing is.
  const label = MixinApi.isLabelled(target) ? target.getLabel() : '';
  if (label.length > 0) {
    const core = typeName ? `${label} (${typeName})` : label;
    return withStatus ? decorate(core, target) : core;
  }
  const core = typeName ?? unidentifiedLook(viewer, target) ?? baseline;
  return withStatus ? decorate(core, target) : core;
}

/** See {@link RecognitionApi.describe}. */
function describeImpl(viewer: Stuff, target: Stuff): string {
  return describeCore(viewer, target, false, false);
}

/**
 * See {@link RecognitionApi.kindOf}. Deliberately built from the same
 * three gates `describeCore` opens with, in the same order — a viewer
 * who cannot see, or who is looking at a mask, must not be handed the
 * one fact the mask exists to hide.
 *
 * ⚠ The `npc` answers below are **false statements told to a fooled
 * viewer**, which is exactly what `getPresentation()` already does for
 * a disguised being. The alternative — a third "unknown" wire tag —
 * would announce *that* something is being withheld, which is the
 * honest-fog failure this build is trying not to commit.
 */
function kindOfImpl(viewer: Stuff | undefined, target: Stuff): RefKind {
  // Not a living thing at all — say so, rather than calling a chair an
  // NPC. ⚠ A corpse still composes `Organism` and so lands on `npc`;
  // an emitter naming a corpse (or the puppeteer wearing one) says
  // `Mml.thing` / `Mml.npc` outright. That is the case this whole face
  // is built to leave explicit.
  if (!MixinApi.isOrganism(target)) return 'thing';
  if (!MixinApi.isHasInteractive(target)) return 'npc';
  // No viewer: logs, snapshots, `refOf`. Nobody is being fooled, so
  // report the object's own truth.
  if (!viewer) return 'player';
  if (!MixinApi.isSensor(viewer) || !MixinApi.isPerception(viewer)) {
    return 'player';
  }
  if (!canSeeGate(viewer, target)) return 'npc';
  if (isMasked(target)) return 'npc';
  return 'player';
}

/** See {@link RecognitionApi.describeWithStatus}. */
function describeWithStatusImpl(viewer: Stuff, target: Stuff): string {
  return describeCore(viewer, target, false, true);
}

/** See {@link RecognitionApi.perceivedKeywords}. */
function perceivedKeywordsImpl(viewer: Stuff, target: Stuff): string[] {
  if (MixinApi.isOrganism(target)) {
    // Targeting keeps the distinguishing worn features (the `withFeatures`
    // form) even though the prose (`describe`) drops them, so `look vest`
    // resolves a stranger the roll-call prose names only "a crossing
    // guard". Status is not a targeting handle, so `withStatus` stays off.
    return GrammarApi.tokenize(describeCore(viewer, target, true, false));
  }
  return MixinApi.isPerceptible(target) ? target.getKeywords() : [];
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

/** See {@link RecognitionApi.recognizes}. */
function recognizesImpl(viewer: Stuff, subject: Stuff): boolean {
  if (!MixinApi.isBeliefStore(viewer)) return false;
  const referent = subject.getTemplatePath();
  if (!referent) return false;
  const record = viewer.recall(RECOGNITION, referent) as
    | { knownAs?: string | null }
    | undefined;
  return !!record?.knownAs;
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
export class RecognitionLogic extends ApiLogic {
  /** See {@link RecognitionApi.describe}. */
  @CallSecurity(RecognitionApiCallers)
  public describe(viewer: Stuff, target: Stuff): string {
    return describeImpl(viewer, target);
  }

  /** See {@link RecognitionApi.describeWithStatus}. */
  @CallSecurity(RecognitionApiCallers)
  public describeWithStatus(viewer: Stuff, target: Stuff): string {
    return describeWithStatusImpl(viewer, target);
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

  /** See {@link RecognitionApi.recognizes}. */
  @CallSecurity(RecognitionApiCallers)
  public recognizes(viewer: Stuff, subject: Stuff): boolean {
    return recognizesImpl(viewer, subject);
  }

  /** See {@link RecognitionApi.salientFeatures}. */
  @CallSecurity(RecognitionApiCallers)
  public salientFeatures(
    target: Stuff,
    covered: ReadonlySet<string> = EMPTY_COVERAGE
  ): string {
    return salientFeaturesImpl(target, covered);
  }

  /** See {@link RecognitionApi.knowsTrueType}. */
  @CallSecurity(RecognitionApiCallers)
  public knowsTrueType(viewer: Stuff, target: Stuff): boolean {
    return knowsTrueTypeImpl(viewer, target);
  }

  /** See {@link RecognitionApi.perceivedKeywords}. */
  @CallSecurity(RecognitionApiCallers)
  public perceivedKeywords(viewer: Stuff, target: Stuff): string[] {
    return perceivedKeywordsImpl(viewer, target);
  }

  /** See {@link RecognitionApi.kindOf}. */
  @CallSecurity(RecognitionApiCallers)
  public kindOf(viewer: Stuff | undefined, target: Stuff): RefKind {
    return kindOfImpl(viewer, target);
  }
}
