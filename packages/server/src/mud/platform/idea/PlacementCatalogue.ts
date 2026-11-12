/**
 * PlacementCatalogue — the singleton that serves the `placement` documents
 * (the ways a thing sits in its container: `on`, `in`, `from`, any pack's
 * `content/placements/`), reached as `ContainmentApi.placements()`. What a
 * placement IS: `lib/spatial/Placement.ts`.
 *
 * ⭐ Every place loads the kernel's ways of sitting in `onCreate`
 * ({@link PlacementCatalogue.ensureKernel}); a host's `placements` setter
 * loads its own; `need` reads one resident.
 */

import { DocumentCatalogue } from '../../lib/document/DocumentCatalogue';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import { KERNEL_PLACEMENT_PREFIX, Placement, Placements } from '../../lib/spatial/Placement';

export default class PlacementCatalogue extends DocumentCatalogue<Placement> {
  /** A reference catalogue everyone reads (the commons). */
  static boundaryRole: BoundaryRole = 'commons';

  protected readonly kind = 'placement';

  private kernel: Promise<void> | null = null;

  /** Validate a placement document at `path` (the installer's validator too). */
  public parse(data: Record<string, unknown>, path: string): Placement {
    const words = Array.isArray(data.prepositions)
      ? data.prepositions.filter((w): w is string => typeof w === 'string' && w.length > 0)
      : [];
    if (words.length === 0) {
      throw new Error(`placement '${path}' lists no prepositions — a way of sitting a player cannot name`);
    }
    return new Placement(
      path,
      Object.freeze(words.map((w) => w.toLowerCase())),
      data.encloses === true,
      typeof data.prose === 'string' ? data.prose : '',
      typeof data.heading === 'string' ? data.heading : '',
      data.hangs === true,
      data.fastens === true,
    );
  }

  /**
   * ⭐ The kernel's ways of sitting (`/platform/placements/*`), loaded once
   * for the process — one prefix read, and a no-op when they are resident.
   * Every place awaits it in `onCreate`, so the engine's own
   * `move(item, desk, Placements.ON)` and a container's inside always find
   * theirs.
   */
  public ensureKernel(): Promise<void> {
    if (Object.values(Placements).every((p) => this.has(p))) return Promise.resolve();
    return (this.kernel ??= (async () => {
      for (const doc of await (await import('../../api/document')).DocumentApi.list(KERNEL_PLACEMENT_PREFIX)) {
        if (doc.getKind() === 'placement') await this.ensure(doc.getPath());
      }
    })().catch((err: unknown) => {
      this.kernel = null;
      throw err;
    }));
  }
}
