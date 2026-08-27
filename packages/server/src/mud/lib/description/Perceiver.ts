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
export interface Perceiver extends Sensor {}

export function PerceiverMixin<TBase extends MixinConstructor>(Base: TBase) {
  class PerceiverMixin extends Base {
    static _mixinName = 'PerceiverMixin';

    /**
     * No persistent fields. Perception is verb-shape only v1.
     */
    static fieldMeta: FieldMeta = {};

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
