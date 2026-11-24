/**
 * DocumentKindCatalogue — the singleton that serves the `kind` documents:
 * every document kind's declaration, any pack's `content/kinds/` or an
 * author's runtime save at `<root>/kinds/<kind>`. Reached as
 * `DocumentApi.kinds()`. What a kind IS: `lib/document/DocumentKind.ts`.
 *
 * ⭐ Resident by construction: every document write and every paper read
 * asks its kind synchronously, so the whole roster stands as
 * `DocumentApi`'s declared need (one `listOfKind('kind')` at boot) — the
 * kernel's own built-in citation, not a boot-list entry. A declaration
 * saved later enters through the ordinary save and this catalogue's own
 * {@link forget}.
 *
 * A kind's name is its declaration's LEAF, and the namespace is global: two
 * declarations of one leaf are refused (by the installer across packs, by
 * {@link byName}'s caller at a save).
 */

import { DocumentCatalogue } from '../../lib/document/DocumentCatalogue';
import { DocumentKind } from '../../lib/document/DocumentKind';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';

export default class DocumentKindCatalogue extends DocumentCatalogue<DocumentKind> {
  /** A reference catalogue everyone reads (the commons). */
  static boundaryRole: BoundaryRole = 'commons';

  protected readonly kind = DocumentKind.BOOTSTRAP_NAME;

  private everything: Promise<void> | null = null;

  /** Where each resident declaration lives, by kind name. */
  private readonly paths = new Map<string, string>();

  /** Read one declaration; throws naming what is wrong. */
  public parse(data: Record<string, unknown>, path: string): DocumentKind {
    return new DocumentKind(path.slice(path.lastIndexOf('/') + 1), data);
  }

  /** Stand the whole roster (the Api's need) — once; a failure may be retried. */
  public ensureAll(): Promise<void> {
    return (this.everything ??= this.all()
      .then(() => undefined)
      .catch((err: unknown) => {
        this.everything = null;
        throw err;
      }));
  }

  /**
   * The declared kind named `name`, or `null` when nobody declares it.
   * `kind` itself is always declared. Sync: the roster is resident.
   */
  public byName(name: string): DocumentKind | null {
    if (name === DocumentKind.BOOTSTRAP_NAME) return DocumentKind.BOOTSTRAP;
    for (const k of this.resident()) if (k.getName() === name) return k;
    return null;
  }

  /** The path of the declaration naming `name`, or `null`. */
  public pathOf(name: string): string | null {
    return this.paths.get(name) ?? null;
  }

  /** Keep a declaration, remembering where it lives by its name. */
  public override remember(path: string, value: DocumentKind): DocumentKind {
    this.paths.set(value.getName(), path);
    return super.remember(path, value);
  }

  /** Every declared kind (the bootstrap included). */
  public declared(): DocumentKind[] {
    const out = [DocumentKind.BOOTSTRAP];
    for (const k of this.resident()) if (k.getName() !== DocumentKind.BOOTSTRAP_NAME) out.push(k);
    return out;
  }

  /** Forget edited declarations — the next read re-reads them. */
  public override forget(paths?: readonly string[]): void {
    super.forget(paths);
    if (paths === undefined) this.paths.clear();
    else for (const [name, p] of this.paths) if (paths.includes(p)) this.paths.delete(name);
    // A forgotten declaration is re-read on the next `ensureAll`.
    this.everything = null;
  }
}
