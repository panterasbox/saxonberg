/**
 * NameBankCatalogue — the singleton that serves the `name-bank` documents
 * (any pack's `content/name-banks/`), reached as `SpeciesApi.nameBanks()`.
 * What a bank IS: `lib/species/NameBank.ts`.
 *
 * ⭐ A bank is named by its path and read the first time a reference names
 * it (a species' `nameBanks`), then kept — and forgotten by an edit's
 * go-live, so a CMS change reaches the next char-gen suggest (the traits
 * slate's rule: a reader with a private cache must be the kind's
 * catalogue).
 */

import { DocumentCatalogue } from '../../lib/document/DocumentCatalogue';
import { NameBank, type NamePools } from '../../lib/species/NameBank';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import { DocumentApi } from '../../api/document';

export default class NameBankCatalogue extends DocumentCatalogue<NameBank> {
  /** A reference catalogue everyone reads (the commons). */
  static boundaryRole: BoundaryRole = 'commons';

  protected readonly kind = 'name-bank';

  /** Read one bank's data. */
  public parse(data: Record<string, unknown>, path: string): NameBank {
    return NameBank.fromData(data, path);
  }

  /**
   * Resolve bank paths into merged pools — an order-preserving union,
   * duplicates collapsed. A path with no bank is listed in `missing` (a
   * content gap the caller records).
   */
  public async resolve(paths: readonly string[]): Promise<NamePools> {
    const given = new Set<string>();
    const surname = new Set<string>();
    const styles: string[] = [];
    const missing: string[] = [];
    for (const path of paths) {
      let bank = this.peek(path);
      if (bank === null) {
        const doc = await DocumentApi.read(path);
        bank = doc && doc.getKind() === this.kind ? this.remember(path, this.parse(doc.getData(), path)) : null;
      }
      if (bank === null) {
        missing.push(path);
        continue;
      }
      for (const g of bank.given) given.add(g);
      for (const s of bank.surname) surname.add(s);
      if (bank.style) styles.push(bank.style);
    }
    return { given: [...given], surname: [...surname], styles, missing };
  }
}
