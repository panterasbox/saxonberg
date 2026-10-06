/**
 * PerceiverMixin — owns the verbs of perception (`look`, `scry`,
 * `locate`).
 *
 * Sister of `Sensor` and `Visible`. The split is by responsibility:
 *
 *   - `Sensor` — receives scene output (`handleMessage`).
 *   - `Visible` — can be perceived (descriptions / keywords others
 *     bind against).
 *   - `Perceiver` — issues perception verbs against the world. The
 *     verbs render descriptions of what the perceiver finds, sending
 *     output back through the perceiver's own Sensor channel.
 *
 * Membership today (Avatar + future NPCs) overlaps Sensor's
 * membership entirely, but the conceptual split is real: a
 * passive recording device could be Sensor without Perceiver, and
 * an instrument-mediated perception surface could exist without
 * scene-receipt. Keep them separate so future divergence costs
 * nothing.
 *
 * Composition: requires `Sensor`. Composed on `Character` (so every
 * Avatar and NPC inherits the perception verbs). Verbs are
 * surfaced on the `self` bucket only — they're actor-side, not
 * target-side. `Visible` contributes no verbs at all; it's pure
 * target shape (description state, keywords). The actor's stack
 * gets `look` from being a Perceiver, then scope resolution picks
 * any reachable Visible as the target at execution time.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { CommandContributions } from '../../api/command';
import type { Sensor } from '../message/Sensor';
import type { Stuff } from '../stuff/Stuff';
import type { PublishedStop } from '../travel/TravelNode';
import type Exit from '../boundary/Exit';
import type { AnyConstructor } from '../../api/mixin';
import { Mixins } from '../mixin';
import { MixinApi } from '../../api/mixin';

/**
 * Canonical physical-sense channel vocabulary. The Perceiver-side
 * declaration of "what channels does an actor perceive on?" — used
 * consistently across every surface that touches sense-channel
 * data:
 *
 *   - `BodyPlan.SensoryPort.modality` (anatomy: which ports a body
 *     plan instantiates).
 *   - `Detail`'s per-sense slot map keys (state authoring).
 *   - `<sense channel="X">…</sense>` MML wrapper attribute
 *     (state-multi-sense MML wrapper).
 *   - `senseStripAugmenter` filter (per-call options).
 *   - The four `requires*` verb-level validators
 *     (`requiresHearing` / `requiresSmell` / `requiresTouch` /
 *     `requiresTaste`).
 *
 * Perceiver is the actor-side surface that perceives across these
 * channels, so the vocabulary's home is here — BodyPlan declares
 * which ports a body has but uses this type to label them; Detail
 * stores the prose per channel but uses this type to key its
 * slots. ESP / alien channels (e.g. `echolocation`,
 * `electroreception`) are explicitly NOT in this v1 union; see the
 * senses subsystem doc for the rationale.
 */
export type SenseChannel =
  | 'vision'
  | 'hearing'
  | 'smell'
  | 'touch'
  | 'taste';

/**
 * Runtime equivalent of the `SenseChannel` union — used by code
 * that needs to walk all channels (`Detailed`'s `hasDetail` slot
 * scan, `applyDetails`' per-channel YAML extraction, the strip
 * augmenter's per-channel filtering). Adding a channel requires
 * touching both this constant AND the `SenseChannel` union above.
 *
 * Order matches the union: vision / hearing / smell / touch / taste.
 * Insertion order matters for `getModalities()` which dedups via
 * Set (preserves first-insertion order).
 */
export const SENSE_CHANNELS: readonly SenseChannel[] = [
  'vision',
  'hearing',
  'smell',
  'touch',
  'taste',
];

/**
 * Public shape provided by `PerceiverMixin`. v1 has no methods —
 * the mixin's value is the verb contributions and the
 * compositional marker. Methods may land later (e.g.,
 * `perceive(target)` for scripted NPCs to invoke programmatically
 * without going through the parser).
 *
 * Extends `Sensor` because Perceiver always co-composes with
 * `SensorMixin` on `Character` — the prereq is documented at the
 * type level so consumers narrowing via `MixinApi.isPerceiver`
 * also reach the Sensor surface.
 */
export interface Perceiver extends Sensor {
  /**
   * ⭐⭐ **THE PERCEPTION MOMENT** — *a place is being described to me.*
   * Tell me, and I will decide what that means for me.
   *
   * This is the CALL surface; `onPerceivedPlace` below is the
   * EXTENSION surface. Conflating the two is what put mixin
   * orchestration in three command controllers: an `@hook` is by
   * definition something the framework invokes, and "the framework"
   * had become `look`, `look`-in-the-dark and `sense`, each with its
   * own structural cast and its own copy of the same ten-line comment.
   *
   * A describing verb calls this once, with the place, and renders
   * what comes back. Everything else — the perception gate, the
   * `Exitable` narrowing, whether anybody is listening — is the
   * body's own business. The verb decides WHEN a place is perceived,
   * because that genuinely is the verb's question; it does not get to
   * decide what perceiving one entails.
   *
   * ⚠ Returns the exits the viewer may know about, because the
   * gate-filtered list is the same list the verb must render — and
   * computing it twice is how the two could ever disagree. A place
   * with no exits (or one that is not `Exitable` at all) returns `[]`
   * and still counts as perceived: a room with no way out is still
   * somewhere you have been.
   *
   * ⭐⭐ `occupants` is what the verb has already resolved as visible
   * in the place — gate-filtered, same list it will render. Seeing a
   * being tracks it, and **that half used to live in `look` alone**:
   * `sense` recorded the place and never the people, so the one verb
   * an arriving body is forced into noticed the room and nobody in
   * it. A divergence between two verbs doing the same thing is the
   * symptom this whole method exists to cure; omit the argument and
   * only the place is perceived.
   */
  perceivePlace(
    location: Stuff,
    occupants?: readonly Stuff[],
  ): readonly Exit[];

  /**
   * ⭐ **A published timetable is being read to me.** The call surface
   * for the second reveal channel, paired with `onReadTimetable`
   * exactly as `perceivePlace` is paired with `onPerceivedPlace`.
   * An empty list is a no-op, so the caller never checks.
   */
  perceiveTimetable(stops: readonly PublishedStop[]): void;

  /**
   * ⭐⭐ **A place was perceived, and here is what was perceived of it.**
   * Optional: declaring it claims nothing of a composer that does not
   * implement it, so an NPC perceiver stays a no-op.
   *
   * Called by `look` and `sense` right after `obviousExitsFor(viewer)`
   * — *the perception moment*, and the list handed over has already
   * been filtered through the perception gate, so a hidden exit is
   * absent rather than present-and-filtered-later. That ordering is
   * what makes the map's evidence firewall structural: the hook cannot
   * learn about an exit the viewer could not see.
   *
   * The only implementer is `Avatar`, which converts the live room and
   * its exits into plain handles and hands them to
   * `NavigationApi.recordPlace`. An NPC that ever wants to keep a map
   * implements this and nothing else changes.
   *
   * @hook Override to learn what this perceiver just saw of a place.
   */
  onPerceivedPlace?(
    location: Stuff,
    perceived: readonly Stuff[],
  ): void;

  /**
   * ⭐ **A published timetable was read.** The second reveal channel:
   * a travel network's board is public, so reading it is knowledge of
   * places you have not been — marked `publication`, and
   * distinguishable on the map from somewhere you walked.
   *
   * Called by `teleport` right after `renderDepartures`, which is
   * deliberately before any clearance read: reading the board is
   * reading a public notice.
   *
   * @hook Override to learn what this perceiver just read off a board.
   */
  onReadTimetable?(stops: readonly PublishedStop[]): void;
}

export function PerceiverMixin<TBase extends MixinConstructor>(Base: TBase) {
  class PerceiverMixin extends Base {
    static _mixinName = 'PerceiverMixin';

    /**
     * No persistent fields. Perception is verb-shape only v1.
     */
    static fieldMeta: FieldMeta = {};

    /**
     * ⭐⭐ THE PERCEPTION MOMENT. See {@link Perceiver.perceivePlace}.
     *
     * The ordering here is the whole evidence firewall:
     * `obviousExitsFor(viewer)` runs the perception gate FIRST, so a
     * hidden exit is **absent** from what the hook is handed rather
     * than present-and-filtered-later. The hook cannot learn about an
     * exit the viewer could not see — structural, not policed — and
     * that property is now guaranteed by this method rather than by
     * three controllers each remembering to do it in the right order.
     */
    perceivePlace(
      location: Stuff,
      occupants: readonly Stuff[] = [],
    ): readonly Exit[] {
      const viewer = this as unknown as Stuff;
      const perceived = MixinApi.isExitable(location)
        ? location.obviousExitsFor(viewer)
        : [];
      // Repeat-perception: first sight of an unknown opens a
      // null-`knownAs` stranger record; later sightings coalesce and
      // advance `lastSeen` rather than writing a row per sighting, and
      // the null-name write never overwrites a learned name. It belongs
      // HERE and not in the naming step, which runs on every projection.
      if (MixinApi.isBeliefStore(viewer)) {
        for (const occupant of occupants) {
          if (MixinApi.isOrganism(occupant)) {
            viewer.learnIdentityOf(occupant, null);
          }
        }
      }
      callPerceptionHook(this, 'onPerceivedPlace', [location, perceived]);
      return perceived;
    }

    /** See {@link Perceiver.perceiveTimetable}. */
    perceiveTimetable(stops: readonly PublishedStop[]): void {
      if (stops.length === 0) return;
      callPerceptionHook(this, 'onReadTimetable', [stops]);
    }

    /**
     * Verbs of perception. `self` only — the perceiver issues these.
     * No target-side contributions: `Visible` is pure target shape,
     * not a verb source. The looker has the verbs because they're
     * a Perceiver; the lookable thing supplies a description and
     * keywords.
     *
     * `find` rides here too: it's a snapshot-shaped sibling of
     * `look` (enumerate without binding focus). Discovery wiring
     * is `look`'s — perception, not focus management.
     *
     * `survey` rides here too and belongs here: it is the same actor-side
     * question as `look`, asked of the PLACE rather than of the things
     * in it. It has to be an actor-side affordance because a verb is
     * afforded by a CLASS and no class is common to every residential
     * room — and it is a platform verb rather than the residence pack's
     * because the archetype substrate it reads is venue-generic (a bar
     * surveys as readily as a bedsit) and the kernel may not import a
     * pack. The holding half is read through the WarrenMember back-ref
     * by shape.
     *
     * The four single-sense verbs (`smell` / `listen` / `feel` /
     * `taste`) and the gestalt `sense` ride the same actor-side
     * bucket — they're perception verbs in the contact family,
     * gated per-verb by `requires*` sensorium validators (see
     * `lib/command/validators/`).
     */
    static commandContributions: CommandContributions = {
      self: [
        'platform/cmd/perception/look.yaml',
        'platform/cmd/perception/scry.yaml',
        'platform/cmd/perception/locate.yaml',
        'platform/cmd/shell/find.yaml',
        'platform/cmd/perception/smell.yaml',
        'platform/cmd/perception/listen.yaml',
        'platform/cmd/perception/feel.yaml',
        'platform/cmd/perception/taste.yaml',
        'platform/cmd/perception/sense.yaml',
        'platform/cmd/perception/assess.yaml',
        'platform/cmd/perception/survey.yaml',
        'platform/cmd/perception/search.yaml',
        'platform/cmd/perception/hide.yaml',
        'platform/cmd/perception/unhide.yaml',
        'platform/cmd/device/disarm.yaml',
        'platform/cmd/device/arm.yaml',
      ],
      peers: [],
      environment: [],
    };

    /**
     * Composition constraint: `Perceiver` requires `Sensor` to be
     * present on the same host. The perception verbs (`look` /
     * `scry` / `locate`) render scenes to the perceiver's own
     * channel via `handleMessage`, which lives on `Sensor`. The
     * public-shape interface declares `Perceiver extends Sensor`
     * so the type narrowing in `MixinApi.isPerceiver` exposes the
     * Sensor surface; without runtime co-composition the narrowing
     * would lie. `MixinConstructor` doesn't carry an enforceable
     * bound here (loose by design — see `lib/mixin.ts`), so the
     * check rides on `__validateComposition__` and fires at first
     * registration.
     */
    static __validateComposition__(ctor: AnyConstructor): void {
      if (!MixinApi.hasMixin(ctor, Mixins.Sensor)) {
        throw new Error(
          `${(ctor as { name?: string }).name ?? 'class'} composes ` +
            `PerceiverMixin without SensorMixin; the perception verbs ` +
            `render scenes through the host's own Sensor channel, and ` +
            `MixinApi.isPerceiver narrows to Stuff & Perceiver (which ` +
            `extends Sensor) — runtime co-composition is required.`
        );
      }
    }
  }
  return PerceiverMixin;
}

/**
 * Optional-hook dispatcher — `typeof === 'function'`, so a SHADOW
 * defining the hook participates without a `MixinApi.hasMixin`
 * pre-check on the host. The `callTraverseHook` idiom from
 * `lib/spatial/Mobile.ts`, which is the precedent this whole seam is
 * modelled on: `Mobile.traverse` fires `onTraversed` on the mover
 * from inside the move, and no command controller has ever had to
 * know that `CartographerMixin` exists.
 *
 * ⚠ Swallows nothing and vetoes nothing — a perception hook is a
 * witness, not a gate. Hosts that write documents from one are
 * expected to be fire-and-forget themselves (see
 * `lib/location/Cartographer.ts`).
 */
function callPerceptionHook(
  obj: object,
  name: string,
  args: unknown[]
): void {
  const fn = (obj as Record<string, unknown>)[name];
  if (typeof fn !== 'function') return;
  (fn as (...a: unknown[]) => void).apply(obj, args);
}
