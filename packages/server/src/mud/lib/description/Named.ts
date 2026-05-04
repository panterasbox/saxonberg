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
 *   suffix?         // "Jr.", "III", "Esq." — post-nominal
 *   alternateNames  // typed extras (nicknames, titles, credentials, …)
 *
 *   fullName        // synthetic — the formal canonical form
 *
 * Most code reads `obj.name` directly. `fullName` is the formal /
 * introductory register: synthesized as
 * `[honorific, name, surname, suffix].filter(Boolean).join(' ')`. No
 * "Unnamed" fallback — when nothing is set, `fullName` returns `''`
 * and `DescribeApi.getDisplayName(obj, fallback)` provides the
 * caller's fallback string.
 *
 * Transient name effects (memory loss, polymorph, hood/disguise)
 * attach via `ShadowApi` on the `name` getter or `fullName` —
 * persistent state stays untouched.
 */

import type { MixinConstructor } from '../mixin-types';

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
  suffix?: string;
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
      'suffix',
      'alternateNames',
    ];

    honorific?: string;
    name: string = '';
    surname?: string;
    suffix?: string;
    alternateNames: AlternateName[] = [];

    /**
     * Formal canonical form: honorific + name + surname + suffix.
     * Used at introductions, character info screens, disambiguation
     * — not the default for everyday prose. Most callers should
     * read `obj.name` directly.
     */
    get fullName(): string {
      return [this.honorific, this.name, this.surname, this.suffix]
        .filter(Boolean)
        .join(' ')
        .trim();
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
