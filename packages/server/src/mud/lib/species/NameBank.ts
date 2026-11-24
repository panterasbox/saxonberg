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
 * is read the first time a reference names it and kept by
 * `NameBankCatalogue` (`SpeciesApi.nameBanks()`) until an edit's go-live
 * forgets it.
 */


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

  /** Read a `kind: 'name-bank'` document's data (the catalogue's parse). */
  static fromData(data: Record<string, unknown>, path: string): NameBank {
    const b = new NameBank();
    b.path = path;
    b.given = stringList(data.given);
    b.surname = stringList(data.surname);
    if (typeof data.style === 'string') b.style = data.style;
    return b;
  }
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}
