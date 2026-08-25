/**
 * NameBank — a per-flavor pool of given names + surnames, used by the
 * char-gen name suggester.
 *
 * Name banks are bulk authored *content*, not code, and they may be
 * shared/blended across species (half-orc = orcish + common, tiefling =
 * infernal + common). So they live as `documents` rows of
 * `kind: 'name-bank'` — NOT inlined on the `Species` template. A
 * `Species` references one or more by `key` (`Species.nameBankKeys`); the
 * suggester resolves the keys and unions the pools.
 *
 * Installed from the `@saxonberg/content-species-and-names` content pack
 * (`content/name-banks/<key>.yaml`, the file name = the bank key) by the
 * `PackApi` reconcile installer — the `name-bank` document kind. Banks
 * are immutable reference data, so resolution caches after first load
 * (one `listOfKind` fills the whole cache — banks are few) — no
 * per-keystroke DB hit, and no dedicated catalogue singleton (a Map
 * cache is enough; not a premature registry).
 */

import { DocumentApi } from '../../api/document';
import type { StoredDocument } from '../document/StoredDocument';

/** Merged pools resolved from one or more name banks. */
export interface NamePools {
  given: string[];
  surname: string[];
  styles: string[];
}

export class NameBank {
  /** The document's path (`/species-and-names/name-banks/common`). */
  public path: string = '';

  /** Unique bank key (`common`, `dwarvish`, `elvish`, …). */
  public key: string = '';

  /** Given-name pool. */
  public given: string[] = [];

  /** Surname pool. */
  public surname: string[] = [];

  /** Optional free-text style hint (descriptive only in v1). */
  public style?: string;

  /**
   * Cache of key → NameBank, filled whole on the first resolve. `null`
   * = not loaded. Cleared by `clearCache` (the installer's go-live after
   * a `name-bank` change, and a test seam).
   */
  static #cache: Map<string, NameBank> | null = null;

  /** Hydrate from a `kind: 'name-bank'` document. */
  static fromDocument(doc: StoredDocument): NameBank {
    const data = doc.getData();
    const b = new NameBank();
    b.path = doc.getPath();
    b.key = typeof data.key === 'string' ? data.key : '';
    b.given = stringList(data.given);
    b.surname = stringList(data.surname);
    if (typeof data.style === 'string') b.style = data.style;
    return b;
  }

  /**
   * Drop the resolution cache. Called by the installer after a content
   * pack writes any name-bank change (so the edit reaches the next
   * char-gen suggest), and a test seam.
   */
  static clearCache(): void {
    NameBank.#cache = null;
  }

  /**
   * Resolve one bank by key (cached). Returns null if the bank is not
   * installed (a content gap; the suggester degrades to other banks).
   */
  static async byKey(key: string): Promise<NameBank | null> {
    if (NameBank.#cache === null) {
      const docs = await DocumentApi.listOfKind('name-bank');
      const map = new Map<string, NameBank>();
      for (const doc of docs) {
        const bank = NameBank.fromDocument(doc);
        if (bank.key) map.set(bank.key, bank);
      }
      NameBank.#cache = map;
    }
    return NameBank.#cache.get(key) ?? null;
  }

  /**
   * Resolve a list of bank keys into merged pools. Order-preserving
   * union; duplicates collapse. Missing banks are skipped silently.
   */
  static async resolve(keys: readonly string[]): Promise<NamePools> {
    const given = new Set<string>();
    const surname = new Set<string>();
    const styles: string[] = [];
    for (const key of keys) {
      const bank = await NameBank.byKey(key);
      if (!bank) continue;
      for (const g of bank.given) given.add(g);
      for (const s of bank.surname) surname.add(s);
      if (bank.style) styles.push(bank.style);
    }
    return { given: [...given], surname: [...surname], styles };
  }
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}
