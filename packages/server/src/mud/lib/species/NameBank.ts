/**
 * NameBank — a per-flavor pool of given names + surnames, used by the
 * char-gen name suggester.
 *
 * Name banks are bulk authored *content*, not code, and they may be
 * shared/blended across species (half-orc = orcish + common, tiefling =
 * infernal + common). So they live as plain-JSON `Document`s in their
 * own `name_banks` collection — NOT inlined on the `Species` template.
 * A `Species` references one or more by `key` (`Species.nameBankKeys`);
 * the suggester resolves the keys and unions the pools.
 *
 * Seeded from `mud/config/name-banks.yaml` by `NameBankSeeder` at boot
 * (the Emote/`SoulCatalogue` content-Document precedent). Banks are
 * immutable reference data, so resolution caches by key after first
 * load — no per-keystroke DB hit, and no dedicated catalogue singleton
 * (a Map cache is enough; not a premature registry).
 */

import { Document } from '../persistence/Document';

/** Merged pools resolved from one or more name banks. */
export interface NamePools {
  given: string[];
  surname: string[];
  styles: string[];
}

export class NameBank extends Document {
  static collectionName = 'name_banks';
  static persistentFields = ['key', 'given', 'surname', 'style'];

  /** Unique bank key (`common`, `dwarvish`, `elvish`, …). */
  public key: string = '';

  /** Given-name pool. */
  public given: string[] = [];

  /** Surname pool. */
  public surname: string[] = [];

  /** Optional free-text style hint (descriptive only in v1). */
  public style?: string;

  /**
   * Cache of key → NameBank. Banks are immutable reference data; the
   * first `resolve` for a key loads it from the collection, thereafter
   * the cache serves it. Cleared by `clearCache` (tests).
   */
  static #cache: Map<string, NameBank | null> = new Map();

  /** Drop the resolution cache. Test seam. */
  static clearCache(): void {
    NameBank.#cache.clear();
  }

  /**
   * Resolve one bank by key (cached). Returns null if the bank is not
   * seeded (a content gap; the suggester degrades to other banks).
   */
  static async byKey(key: string): Promise<NameBank | null> {
    if (NameBank.#cache.has(key)) return NameBank.#cache.get(key) ?? null;
    const matches = await NameBank.find({ key });
    const bank = matches[0] ?? null;
    NameBank.#cache.set(key, bank);
    return bank;
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
