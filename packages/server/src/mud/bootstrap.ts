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
];
