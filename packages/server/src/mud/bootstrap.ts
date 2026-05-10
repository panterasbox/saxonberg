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

  // Persistence marshallers. Must be cloned before any host that
  // binds them is hydrated (Material, Tangible) — the hydrator
  // throws when a declared marshaller is unregistered.
  { templatePath: '/lib/persistence/QuantityMarshaller/kg' },
  { templatePath: '/lib/persistence/QuantityMarshaller/g-per-mol' },
  { templatePath: '/lib/persistence/QuantityMarshaller/kg-per-m3' },
  { templatePath: '/lib/persistence/QuantityMarshaller/lumen' },
  { templatePath: '/lib/persistence/QuantityMarshaller/lux' },
  { templatePath: '/lib/persistence/QuantityMarshaller/K' },
  { templatePath: '/lib/persistence/ChemistryMarshaller' },
];
