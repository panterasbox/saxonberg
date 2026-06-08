/**
 * Shared preload hook for verb-level validators that need the
 * giver's species + bodyplan loaded into the live registry before
 * the sync validator body runs.
 *
 * Species and BodyPlan templates are NOT bootstrapped; they
 * lazy-load via `findByTemplatePath`. The `requires<Sense>` family
 * (and similar sensorium-walking validators) need the species'
 * BodyPlan in memory so `PerceptionApi.sensorium` can walk it —
 * without this preload, the sensorium walk surfaces `[]` and the
 * validator emits a false-positive "you have no sense of …"
 * refusal on a species that genuinely has the organ.
 *
 * Mirrors the preload pattern on `requiresAnimate` (the older sibling)
 * and matches `LocomotionApi.preloadActorAnatomy` (which serves the
 * same purpose for movement verbs).
 */

import type { CommandContext } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { Template } from '../../stuff/Template';
import type { Species } from '../../species/Species';

export async function preloadActorAnatomy(
  context: CommandContext,
): Promise<void> {
  const giver = context.commandGiver;
  if (!MixinApi.isOrganism(giver)) return;
  const speciesPath = (giver as unknown as { _speciesPath: string | null })
    ._speciesPath;
  if (!speciesPath) return;

  // Ensure the species and every clade ancestor are live singletons.
  const ensure = async (path: string): Promise<void> => {
    try {
      await StuffApi.singleton(path);
    } catch {
      // Skip missing ancestors — same tolerance as requiresAnimate.
    }
  };
  await ensure(speciesPath);
  await Promise.all(Template.ancestorPaths(speciesPath).map(ensure));

  // Now the species is live; ensure its BodyPlan too. The sensorium
  // walk reads BodyPlan.sensoryPorts; without the BodyPlan loaded
  // `species.getBodyPlan()` returns null and sensorium is empty.
  const species = StuffApi.findByTemplatePath<Species>(speciesPath);
  if (!species) return;
  const bodyPlanPath = species.getBodyPlanPath();
  if (!bodyPlanPath) return;
  try {
    await StuffApi.singleton(bodyPlanPath);
  } catch {
    // BodyPlan template missing — leave it; sensorium-empty error
    // surfaces downstream.
  }
}
