/**
 * SmellController — `smell` verb.
 *
 * Bare form reads true field physics via
 * `SmellModality.smellAt(loc)` and renders the perceived odor with
 * source attribution, gated by the viewer's
 * `Species.olfactoryProfile.acuity` threshold. Targeted form
 * (`smell <target>`) keeps the per-Detail `smell` slot read inherited
 * from `SingleSenseControllerBase`.
 */

import { SingleSenseControllerBase } from './SingleSenseControllerBase';
import type { SenseChannel } from '../../../lib/description/Perceiver';
import type { CommandContext } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { DescribeApi } from '../../../api/describe';
import { Mml } from '../../../api/mml';
import { SmellModality } from '../../../lib/perception/modalities/SmellModality';
import type { Smell } from '../../../lib/perception/Smell';
import type { OlfactoryProfile } from '../../../lib/species/Species';
import type { Organism } from '../../../lib/species/Organism';
import { StuffApi } from '../../../api/stuff';

/**
 * Acuity → ppm threshold mapping. A viewer perceives a signal whose
 * concentration is at or above this value. `'none'` is effectively
 * `Infinity` — the viewer perceives nothing.
 */
const ACUITY_THRESHOLDS: Record<OlfactoryProfile['acuity'], number> = {
  keen: 1,
  normal: 10,
  dull: 100,
  none: Infinity,
};

const DEFAULT_ACUITY: OlfactoryProfile['acuity'] = 'normal';

export default class SmellController extends SingleSenseControllerBase {
  protected readonly senseChannel: SenseChannel = 'smell';
  protected readonly sceneTopic = 'world.perception.sense.smell';

  /**
   * Override the bare-form branch — read the field signal and render
   * with attribution. Falls back to the inherited augmenter-driven
   * prose when the actor is null-acuity or no signal surfaces.
   */
  protected override senseLocation(context: CommandContext): void {
    const actor = context.commandGiver;
    const location = context.location;
    if (!location) return; // defensive: placeless avatars are blocked at inbound and Login carries no sense verbs, so location is present in practice; degrade to a quiet no-op otherwise
    const signal = SmellModality.smellAt(location);
    const threshold = actorAcuityThreshold(actor);

    if (
      signal &&
      Number.isFinite(threshold) &&
      signal.concentration.rawValue() >= threshold
    ) {
      const body = renderSmellProse(signal);
      MessageApi.scene(actor)
        .topic(this.sceneTopic)
        .toSelf(body)
        .send();
      return;
    }

    // No field signal (or below threshold) — fall back to the inherited
    // augmenter-based <sense channel="smell"> prose if the room
    // authored any; otherwise the inherited indistinct refusal fires.
    super.senseLocation(context);
  }
}

/**
 * Resolve the actor's `OlfactoryProfile.acuity` via viewer →
 * Organism → Species → olfactoryProfile. Defaults to `'normal'` when
 * any step is null.
 */
function actorAcuityThreshold(actor: Stuff): number {
  if (!MixinApi.isOrganism(actor)) {
    return ACUITY_THRESHOLDS[DEFAULT_ACUITY];
  }
  const species = (actor as Stuff & Organism).getSpecies();
  if (!species) return ACUITY_THRESHOLDS[DEFAULT_ACUITY];
  const profile = species.getOlfactoryProfile();
  if (!profile) return ACUITY_THRESHOLDS[DEFAULT_ACUITY];
  return ACUITY_THRESHOLDS[profile.acuity];
}

function renderSmellProse(signal: Smell): Mml {
  if (signal.sources.length === 0) {
    return Mml.compose`You smell ${signal.identity || 'something'}.`;
  }
  const names = signal.sources
    .map((s) => {
      const stuff = StuffApi.findById(s.stuffId);
      return stuff
        ? DescribeApi.getDisplayName(stuff)
        : s.identity || 'something';
    })
    .slice(0, 3);
  const list = names.join(', ');
  if (signal.identity) {
    return Mml.compose`You smell ${signal.identity} — from ${list}.`;
  }
  return Mml.compose`You smell ${list}.`;
}
