/**
 * WikiNamespaceZone — the access anchor for one wiki namespace.
 *
 * `AccessApi.can` is **zone-anchored**, and page data is deliberately
 * not a `Stuff`, so there is nothing on a page to walk from. The
 * namespace tree supplies the anchor: a `FolderZone` at
 * `/wiki/<namespace>` under a `/wiki` root, resolved the way
 * `AccessRegistry.resolveSourceFolderZone` already resolves a source
 * path. Only the namespace is anchored, and only for access.
 *
 * ⭐ **It lives in `obj/` because it is instanceable.** A template's
 * `class:` names it (`seeds/wiki/*.yaml`), and after
 * `refactor/lib-obj-taxonomy` nothing instances `lib/` — enforced by
 * `pnpm lint:instanceable`, on both axes: the `.ts` file and the
 * template path. It extends `obj/FolderZone`, which moved for the same
 * reason while the abstract `Zone`/`SpatialZone` stayed behind.
 *
 * ## What it adds to a FolderZone: `protection`
 *
 * One field, and it exists because the machinery the requirements
 * described was **removed**: `ownerGroup` / `accessGroups` came off
 * `Zone` in property phase 0a, and title now lives in the gated
 * `parcels` collection. There is also no "all signed-in players"
 * group, and a parcel has exactly one owner — so the open edit floor
 * cannot be expressed as a group at all.
 *
 * `protection` replaces it, resolved by the shipped `Zone.lookupField`
 * inheritance walk. Declare it at `/wiki` and every namespace inherits;
 * declare it on one namespace and that namespace alone tightens. A
 * curated namespace is a seed field, not code.
 *
 * ⚠ It is a **floor, not a title.** Who owns the namespace is still a
 * `parcels` row (the platform pack's `/wiki` claim), and the `editors` /
 * `moderators` rungs resolve through `AccessApi` against that row. This
 * field only says *which rung applies here* — which is a policy choice
 * about a body of content, not an ownership claim, so it is safe on an
 * editable zone template in a way that `accessGroups` never was.
 */

import FolderZone from './FolderZone';
import type { FieldMeta } from '../lib/mixin';
import { WikiPage, type Protection } from '../lib/wiki/WikiPage';

export default class WikiNamespaceZone extends FolderZone {
  static fieldMeta: FieldMeta = {
    protection: { persistent: true, authorable: true },
  };

  /**
   * Who may edit within this namespace. `null` = not declared here, so
   * `lookupField` walks to the enclosing zone — which is what makes
   * `/wiki`'s `anyone` the default for every namespace that does not
   * say otherwise.
   */
  protected protection: Protection | null = null;

  public getProtection(): Protection | null {
    return this.protection;
  }

  /**
   * Per-field invariant on the setter, not in a post-hydrate hook: an
   * unknown value is refused naming the vocabulary, rather than being
   * silently coerced. A typo'd protection that quietly became `anyone`
   * would open a namespace its author believed they had closed.
   */
  public setProtection(value: Protection | string | null): void {
    if (value === null) {
      this.protection = null;
      return;
    }
    const s = String(value).trim().toLowerCase();
    if (!WikiPage.isProtection(s)) {
      throw new RangeError(
        `WikiNamespaceZone.setProtection: unknown protection '${value}' ` +
          `(expected anyone, editors, or moderators)`,
      );
    }
    this.protection = s;
  }

  /**
   * The effective protection for this namespace — its own, else the
   * nearest ancestor's, else the `anyone` floor.
   *
   * The final fallback matters: a namespace zone that failed to
   * resolve should not silently become unwritable (which would read as
   * a bug nobody can fix from content) nor should the code assume the
   * `/wiki` root seed is present. `anyone` is the designed floor, and
   * `AccessApi` still gates every rung above it.
   */
  public async effectiveProtection(): Promise<Protection> {
    const own = await this.lookupField<Protection>('protection');
    return own ?? 'anyone';
  }
}
