/**
 * BodyModuleCatalogue — the singleton that serves the `body-module`
 * documents (organism-biology D1, S1): the reusable pieces a body plan is
 * composed of — a limb, a head, a torso, a wing, a claw — any pack's
 * `content/body-modules/`, reached as `SpeciesApi.modules()`. What a
 * module IS: `lib/species/BodyModule.ts`.
 *
 * ⭐ Loaded on use, by path (documents D7): a plan's `modules` setter
 * ensures the modules it cites, and a species' setters the modules its
 * variants add. Nothing boots it.
 */

import { DocumentCatalogue } from '../../lib/document/DocumentCatalogue';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import { BodyModule } from '../../lib/species/BodyModule';

export default class BodyModuleCatalogue extends DocumentCatalogue<BodyModule> {
  /** A reference catalogue everyone reads (the commons): every body's anatomy reads it. */
  static boundaryRole: BoundaryRole = 'commons';

  protected readonly kind = 'body-module';

  /** Validate a module document at `path` (the installer's validator too). */
  public parse(data: Record<string, unknown>, path: string): BodyModule {
    return new BodyModule(path, data);
  }
}
