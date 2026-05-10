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

import type { MixinConstructor } from '../mixin';
import type { CommandContributions } from '../../api/command';
import type { Sensor } from '../message/Sensor';

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
    static persistentFields: string[] = [];

    /**
     * Verbs of perception. `self` only — the perceiver issues these.
     * No target-side contributions: `Visible` is pure target shape,
     * not a verb source. The looker has the verbs because they're
     * a Perceiver; the lookable thing supplies a description and
     * keywords.
     */
    static commandContributions: CommandContributions = {
      self: ['look.yaml', 'scry.yaml', 'locate.yaml'],
      environment: [],
      inventory: [],
      peers: [],
    };
  }
  return PerceiverMixin;
}
