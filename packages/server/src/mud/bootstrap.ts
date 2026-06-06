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
  // Species clades are NOT bootstrapped. `SpeciesApi.isAnimate` /
  // `getKingdom` are sync, and the `requiresAnimate` validator
  // ensures the relevant clade chain via its async `preload` hook
  // (see `lib/command/validators/requiresAnimate.ts`); the
  // dispatcher awaits validator preloads before the sync validator
  // phase runs. Same pattern is available for Materials / Biomes
  // / etc. as they grow validator coverage.
];
