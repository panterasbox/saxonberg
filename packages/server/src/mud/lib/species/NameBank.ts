/**
 * NameBank — a per-flavor pool of given names + surnames, used by the
 * char-gen name suggester.
 *
 * Name banks are bulk authored *content*, not code, and they may be
 * shared/blended across species (half-orc = orcish + common, tiefling =
 * infernal + common). So they live as `documents` rows of
 * `kind: 'name-bank'` — NOT inlined on the `Species` template. A
 * `Species` references one or more by PATH (`Species.nameBanks`:
 * `/species-and-names/name-banks/common`); the suggester reads each and
 * unions the pools.
 *
 * ⭐ A document's identity is its path: a pack ships
 * `content/name-banks/<name>.yaml`, the installer stores it under the pack's
 * root, and a reference names that path. Nothing scans the kind; each bank
 * is read the first time a reference names it and kept (banks are immutable
 * reference data) until the installer's go-live drops the cache.
 */

import { DocumentApi } from '../../api/document';
import type { StoredDocument } from '../document/StoredDocument';

/** Merged pools resolved from one or more name banks. */
export interface NamePools {
  given: string[];
  surname: string[];
  styles: string[];
  /** The paths named that had no bank — a content gap the caller records. */
  missing: string[];
}

export class NameBank {
  /** The document's path (`/species-and-names/name-banks/common`). */
  public path: string = '';

  /** Given-name pool. */
  public given: string[] = [];

  /** Surname pool. */
  public surname: string[] = [];

  /** Optional free-text style hint (descriptive only in v1). */
  public style?: string;

  /**
   * Every bank read so far, by path (`null` when a path has no document, so
   * a gap is reported once). Cleared by `clearCache` (the installer's
   * go-live after a `name-bank` change, and a test seam).
   */
  static #cache = new Map<string, NameBank | null>();

  /** Hydrate from a `kind: 'name-bank'` document. */
  static fromDocument(doc: StoredDocument): NameBank {
    const data = doc.getData();
    const b = new NameBank();
    b.path = doc.getPath();
    b.given = stringList(data.given);
    b.surname = stringList(data.surname);
    if (typeof data.style === 'string') b.style = data.style;
    return b;
  }

  /**
   * Drop the resolution cache. Called by the installer after a content
   * pack writes any name-bank change (so the edit reaches the next
   * char-gen suggest), and a test seam.
   * @internal one production caller plus the tests that white-box it — not author surface.
   *
   */
  static clearCache(): void {
    NameBank.#cache.clear();
  }

  /**
   * Read one bank by its path (cached). A path with no document answers
   * null; `resolve` reports it in `missing` so the caller can record it.
   */
  private static async byPath(path: string): Promise<NameBank | null> {
    if (NameBank.#cache.has(path)) return NameBank.#cache.get(path) ?? null;
    const doc = await DocumentApi.read(path);
    const bank = doc && doc.getKind() === 'name-bank' ? NameBank.fromDocument(doc) : null;
    NameBank.#cache.set(path, bank);
    return bank;
  }

  /**
   * Resolve a list of bank paths into merged pools. Order-preserving
   * union; duplicates collapse. A missing bank is skipped and listed in
   * `missing`.
   *
   * @internal the callable door is `SpeciesApi.resolveNamePools` — the
   * body stays here beside the hard-private `#cache` it fills.
   */
  static async resolve(paths: readonly string[]): Promise<NamePools> {
    const given = new Set<string>();
    const surname = new Set<string>();
    const styles: string[] = [];
    const missing: string[] = [];
    for (const path of paths) {
      const bank = await NameBank.byPath(path);
      if (!bank) {
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

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}
