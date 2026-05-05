/**
 * Engine bootstrap manifest. Each entry names a template the engine
 * must clone at server start. Topologically sorted at run time via
 * `dependsOn`; cycles and missing deps throw and prevent boot.
 *
 * Mods append their own entries to this array before
 * `BootstrapManager.run()` fires, when the modding subsystem lands.
 */

import type { BootstrapEntry } from './types';

export const bootstrapManifest: BootstrapEntry[] = [
  { templatePath: '/obj/EventRegistry' },
];
