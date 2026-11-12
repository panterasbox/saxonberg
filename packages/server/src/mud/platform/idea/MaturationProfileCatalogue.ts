/**
 * MaturationProfileCatalogue — the singleton that serves the
 * `maturation-profile` documents (how a must ripens into wine, a wheel
 * into cheese, a malting bed into malt; any pack's
 * `content/maturation-profiles/`), reached as
 * `BulkableApi.maturationProfiles()`. What a profile IS:
 * `lib/maturation/MaturationProfile.ts`.
 *
 * ⭐ A vessel matches a profile by its charge's TAG (`inputCategory`, the
 * recipe-slot `category` convention, load-on-use D3) inside a SYNC
 * reconcile, so a `MaturingMixin` host loads the whole kind once per
 * process in `onCreate` ({@link ensureAll}) and the match runs over what is
 * resident. A profile's product materials load with it ({@link afterRead}).
 * Nothing boots it.
 */

import { DocumentCatalogue } from '../../lib/document/DocumentCatalogue';
import MaturationProfile from '../../lib/maturation/MaturationProfile';
import type Material from '../../lib/material/Material';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';

export default class MaturationProfileCatalogue extends DocumentCatalogue<MaturationProfile> {
  /** A reference catalogue everyone reads — the vat's `taste`/`analyze` inside a circle (the commons). */
  static boundaryRole: BoundaryRole = 'commons';

  protected readonly kind = 'maturation-profile';

  private everything: Promise<void> | null = null;

  /** Validate a profile document at `path` (the installer's validator too); throws naming what is wrong. */
  public parse(data: Record<string, unknown>, path: string): MaturationProfile {
    const profile = new MaturationProfile(path);
    try {
      profile.applyData(data);
    } catch (err) {
      throw new Error(`maturation profile '${path}': ${(err as Error).message}`);
    }
    return profile;
  }

  /** What a ripening becomes — its product, its turned and lees materials, a transform's outcome, its gas — loads with it. */
  protected override async afterRead(p: MaturationProfile): Promise<void> {
    const { MaterialApi } = await import('../../api/material');
    const paths = [
      p.getProductMaterial(),
      p.getTurnedMaterial() ?? '',
      p.getLeesMaterial(),
      ...p.getTransforms().map((t) => t.becomes),
      p.getOffGas()?.material ?? '',
    ];
    for (const path of paths) if (path) await MaterialApi.materials().ensure(path);
  }

  /**
   * ⭐ Every profile, read once for the process — what a `MaturingMixin`
   * host awaits in `onCreate` so its sync tag match finds the profile.
   */
  public ensureAll(): Promise<void> {
    return (this.everything ??= (async () => {
      await this.all();
      for (const p of this.resident()) await this.afterRead(p);
    })().catch((err: unknown) => {
      this.everything = null;
      throw err;
    }));
  }

  /**
   * The profile matching `material` — by the must's TAGS against each
   * resident profile's `inputCategory`. Two matching profiles is an
   * AUTHORING error, surfaced as a warning and resolved deterministically
   * (lowest key wins) — never a roll. `null` when nothing matches.
   */
  public forMaterial(material: Material): MaturationProfile | null {
    const matches = this.sorted().filter((p) => {
      const category = p.getInputCategory();
      return category.length > 0 && material.hasTag(category);
    });
    if (matches.length > 1) {
      console.warn(
        `MaturationProfileCatalogue.forMaterial: material '${material.getTemplatePath()}' matches ` +
          `${matches.length} profiles (${matches.map((p) => p.getKey()).join(', ')}) — ` +
          `authoring error; using '${matches[0]!.getKey()}'`,
      );
    }
    return matches[0] ?? null;
  }

  /** The **culture** profile pitching `strain`, or `null` — the keyed read behind a pitch check. */
  public cultureForStrain(strain: string): MaturationProfile | null {
    if (!strain) return null;
    return this.sorted().find((p) => p.getKind() === 'culture' && p.getStrain() === strain) ?? null;
  }

  private sorted(): MaturationProfile[] {
    return this.resident().sort((a, b) => a.getKey().localeCompare(b.getKey()));
  }
}
