/**
 * Engine bootstrap manifest — what the engine clones at server start.
 *
 * Lower-level developers are expected to edit this file regularly as
 * things come and go from service. Adding an entry: append
 * `{ templatePath: '/obj/Whatever' }` and add `dependsOn: [...]`
 * if it requires another entry to exist first. Removing an entry:
 * delete the line.
 *
 * The `BootstrapEntry` shape is owned by `BootstrapManager` (the
 * consumer); we import the type from there so this file stays pure
 * data.
 *
 * Mods append their own entries to this array before
 * `BootstrapManager.run()` fires (when the modding subsystem lands).
 */

import type { BootstrapEntry } from '../backend/BootstrapManager';

export const bootstrapManifest: BootstrapEntry[] = [
  { templatePath: '/obj/EventRegistry' },
  // The void doubles as the bootstrap-starting location AND the
  // last-resort home for HasInteractive bodies whose container
  // destructs without an outer to evacuate to. ContainerMixin's
  // cleanup hook resolves it via sync `findByTemplatePath`, so it
  // must be live before any container can destruct — bootstrap
  // guarantees that.
  { templatePath: '/domain/void' },
  // Topic catalogue singleton. The catalogue lazy-loads descriptors
  // from the `domain` collection on first access — no need to
  // pre-clone the per-topic `Topic` templates at boot. Same pattern
  // as species clades / materials / biomes per the note above.
  { templatePath: '/obj/TopicCatalogue' },
  // Species clades, perception modalities, and augmentation
  // templates are NOT bootstrapped. Same lazy-load pattern as
  // locomotion modes / topic-catalogue leaves:
  //
  //   - **Species / clades** lazy-load via
  //     `SpeciesApi.preloadAnatomy` (called from the
  //     `requiresAnimate` and `requires<Sense>`/`requires<ESP>`
  //     validators' async `preload` hooks).
  //   - **Perception modalities** lazy-load via
  //     `PerceptionApi.modalityByName` — the lookup falls back to
  //     `StuffApi.singleton(path)` on first access. The sense /
  //     ESP validators' `preload` ensures the relevant modality
  //     singletons are warm before the sync validator body runs.
  //     `SensorMixin.filterMessage`'s "modality not loaded → let
  //     the frame through" path is the documented graceful
  //     degradation on cold start.
  //   - **AetherImplant** lazy-loads via
  //     `StuffApi.clone(AetherImplant.TEMPLATE_PATH)` in
  //     `Avatar.enter`'s `bootstrapAetherImplant` (already async).
  //     No bootstrap pre-clone needed.
  //
  // Adding any of these back to the manifest would be a regression
  // in boot-time work for no real benefit — the lazy paths are
  // proven by locomotion / topics / species.
];
