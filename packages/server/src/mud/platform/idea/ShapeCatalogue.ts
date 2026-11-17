/**
 * ShapeCatalogue — the singleton that serves the `shape` documents (the
 * shapes a thing can have: `rod`, `sheet`, `block`, `round`, `flexible`,
 * any pack's `content/shapes/`), reached as `ContainmentApi.shapes()`.
 * What a shape IS: `lib/spatial/Shape.ts`.
 *
 * ⭐ The kernel's shapes are resident with the containment Api's needs
 * ({@link ShapeCatalogue.ensureKernel}); a row's `shape` setter loads its
 * own; `need` reads one resident.
 */

import { DocumentCatalogue } from '../../lib/document/DocumentCatalogue';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import { KERNEL_SHAPE_PREFIX, Shape, Shapes } from '../../lib/spatial/Shape';
import type { DimensionsSpec } from '../../lib/spatial/Dimensions';

export default class ShapeCatalogue extends DocumentCatalogue<Shape> {
  /** A reference catalogue everyone reads (the commons). */
  static boundaryRole: BoundaryRole = 'commons';

  protected readonly kind = 'shape';

  private kernel: Promise<void> | null = null;

  /** Validate a shape document at `path` (the installer's validator too). */
  public parse(data: Record<string, unknown>, path: string): Shape {
    const aspect = data.aspect as DimensionsSpec | undefined;
    if (aspect === null || typeof aspect !== 'object') {
      throw new Error(`shape '${path}' has no aspect — a shape with no proportion is not one`);
    }
    const rigid = data.rigid ?? true;
    if (typeof rigid !== 'boolean') {
      throw new TypeError(`shape '${path}': rigid must be a boolean (got ${String(rigid)})`);
    }
    try {
      return new Shape(path, aspect, rigid);
    } catch (err) {
      throw new RangeError(`shape '${path}': ${(err as Error).message}`);
    }
  }

  /**
   * ⭐ The kernel's shapes (`/platform/shapes/*`), loaded once for the
   * process — one prefix read, and a no-op when they are resident. The
   * containment Api's needs await it, so a thing's class default (`block`,
   * `flexible`, `sheet`) and every bare `shape:` word are always resident.
   */
  public ensureKernel(): Promise<void> {
    if (Object.values(Shapes).every((p) => this.has(p))) return Promise.resolve();
    return (this.kernel ??= (async () => {
      for (const doc of await (await import('../../api/document')).DocumentApi.list(KERNEL_SHAPE_PREFIX)) {
        if (doc.getKind() === 'shape') await this.ensure(doc.getPath());
      }
    })().catch((err: unknown) => {
      this.kernel = null;
      throw err;
    }));
  }
}
