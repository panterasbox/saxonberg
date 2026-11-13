/**
 * PumpMechanismCatalogue — the singleton that serves the `pump-mechanism`
 * documents (how a displacement machine moves its fluid: `suction`,
 * `force`, any pack's `content/pump-mechanisms/`), reached as
 * `BulkableApi.pumpMechanisms()`. What a mechanism IS:
 * `lib/pump/PumpMechanism.ts`.
 *
 * ⭐ Named by path and loaded on reach (documents D7): a pump's
 * `mechanism` setter returns `ensure(path)`; `need(path)` reads it resident.
 */

import { DocumentCatalogue } from '../../lib/document/DocumentCatalogue';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import { PumpMechanism } from '../../lib/pump/PumpMechanism';

export default class PumpMechanismCatalogue extends DocumentCatalogue<PumpMechanism> {
  /** A reference catalogue everyone reads (the commons). */
  static boundaryRole: BoundaryRole = 'commons';

  protected readonly kind = 'pump-mechanism';

  /** Validate a mechanism's data at `path` (the installer's validator too). */
  public parse(data: Record<string, unknown>, path: string): PumpMechanism {
    if (typeof data.pulls !== 'boolean') {
      throw new Error(`pump mechanism '${path}' must say whether it pulls (pulls: true | false)`);
    }
    const word = path.slice(path.lastIndexOf('/') + 1);
    return new PumpMechanism(
      path,
      typeof data.name === 'string' && data.name ? data.name : word,
      data.pulls,
      typeof data.description === 'string' ? data.description : '',
    );
  }
}
