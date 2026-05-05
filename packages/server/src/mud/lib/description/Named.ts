/**
 * NamedMixin — name fields for any Stuff that should be addressable.
 *
 * Lives in `lib/description/` because a name is part of how a thing
 * presents itself, alongside `Visible`, `Perceptible`, and `Detailed`.
 * Applies to people, NPCs, pets, artifacts, locations, buildings —
 * anything with a name.
 *
 * Shape:
 *
 *   honorific?      // "Dr.", "Sir", "Captain" — formal address prefix
 *   name            // casual register; the field 95% of callers want
 *   surname?        // family / second name
 *   nameSuffix?     // "Jr.", "III", "Esq." — post-nominal
 *   alternateNames  // typed extras (nicknames, titles, credentials, …)
 *
 *   fullName        // synthetic — the formal canonical form
 *
 * `nameSuffix` is named with the `name` prefix because plain `suffix`
 * is too generic — many other things (URLs, paths, file types) use
 * "suffix" with different semantics, so we want this collision-free.
 *
 * Most code reads `obj.name` directly. `fullName` is the formal /
 * introductory register: synthesized as
 * `[honorific, name, surname, nameSuffix].filter(Boolean).join(' ')`.
 * No "Unnamed" fallback — when nothing is set, `fullName` returns
 * `''` and `DescribeApi.getDisplayName(obj, fallback)` provides the
 * caller's fallback string.
 *
 * Transient name effects (memory loss, polymorph, hood/disguise)
 * attach via `ShadowApi` on the `name` getter or `fullName` —
 * persistent state stays untouched.
 */

import type { MixinConstructor } from '../mixin';

/**
 * Categories of alternate names. Open-ish — extend the union when a
 * concrete use case lands. The starting set covers the common
 * cases.
 */
export type NameKind =
  | 'nickname'
  | 'title'
  | 'credential'
  | 'middle'
  | 'maiden'
  | 'alias';

export interface AlternateName {
  kind: NameKind;
  value: string;
}

/**
 * Public shape provided by NamedMixin.
 */
export interface Named {
  honorific?: string;
  name: string;
  surname?: string;
  nameSuffix?: string;
  alternateNames: AlternateName[];

  readonly fullName: string;

  getAlternateNames(kind?: NameKind): AlternateName[];
  addAlternateName(alt: AlternateName): void;
  removeAlternateName(value: string): boolean;
}

export function NamedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class NamedMixin extends Base {
    static _mixinName = 'NamedMixin';

    /**
     * Persistent fields. `alternateNames` is an array of plain
     * objects — the generic Hydrator copy works without a custom
     * persistenceHandler.
     */
    static persistentFields = [
      'honorific',
      'name',
      'surname',
      'nameSuffix',
      'alternateNames',
    ];

    honorific?: string;
    name: string = '';
    surname?: string;
    nameSuffix?: string;
    alternateNames: AlternateName[] = [];

    /**
     * Formal canonical form. Used at introductions, character info
     * screens, disambiguation — not the default for everyday prose.
     * Most callers should read `obj.name` directly.
     *
     * Layout:
     *
     *   `[honorific] [name] [surname][, nameSuffix]`
     *
     * The comma before `nameSuffix` is universal for credentials
     * ("John Smith, MD", "John Smith, PhD", "John Smith, Esq.") and
     * a defensible older-style for generational suffixes ("John
     * Smith, Jr.") — common in legal documents and personal
     * signatures even where AP/Chicago have dropped it. Regnal
     * numerals ("Henry VIII") would render incorrectly here, but
     * those aren't a v1 use case; if they become one, model them
     * via `alternateNames` rather than `nameSuffix`.
     */
    get fullName(): string {
      const head = [this.honorific, this.name, this.surname]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (!this.nameSuffix) return head;
      if (!head) return this.nameSuffix;
      return `${head}, ${this.nameSuffix}`;
    }

    /**
     * Filtered view of alternate names. Pass a `kind` to narrow.
     * Returns a copy, so callers can iterate without disturbing
     * mutation order.
     */
    getAlternateNames(kind?: NameKind): AlternateName[] {
      if (!kind) return [...this.alternateNames];
      return this.alternateNames.filter((a) => a.kind === kind);
    }

    addAlternateName(alt: AlternateName): void {
      this.alternateNames.push({ kind: alt.kind, value: alt.value });
    }

    /**
     * Remove the first alternate matching `value`. Returns true if
     * something was removed.
     */
    removeAlternateName(value: string): boolean {
      const idx = this.alternateNames.findIndex((a) => a.value === value);
      if (idx === -1) return false;
      this.alternateNames.splice(idx, 1);
      return true;
    }
  };
}
