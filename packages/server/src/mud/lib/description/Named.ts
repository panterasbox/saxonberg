/**
 * NamedMixin — **proper-name** identity for things people address
 * by name.
 *
 * Lives in `lib/description/` because a proper name is part of how a
 * thing presents itself, alongside `Visible`, `Perceptible`, and
 * `Detailed`.
 *
 * ## What this mixin IS for
 *
 * Things with a **proper name** a character would use to refer to
 * them:
 *
 *   - People and NPCs ("Alice", "Dr. Smith", "Captain Hook")
 *   - Pets, mounts, familiars ("Rover", "Bucephalus")
 *   - Named artifacts ("Excalibur", "the One Ring")
 *   - **Named** locations ("Duncan Hall" the building; "the
 *     Memorial Bobalu Smallberries Lobby" if dedicated to someone;
 *     "Eternal City")
 *   - Vessels with names ("the SS Saxonberg")
 *
 * If a player would naturally say "go to the [thing] in [Named]" —
 * Named applies.
 *
 * ## What this mixin is NOT for
 *
 * Generic labels or descriptive identifiers that READ like names but
 * are just descriptions:
 *
 *   - **Generic rooms** ("lobby", "the lobby", "Duncan Hall Lobby" —
 *     these go on `Visible.shortDescription`)
 *   - **Generic objects** ("iron sword", "wooden chair", "rusty
 *     hinges" — all `Visible.shortDescription`)
 *   - **Generic NPCs** ("guard", "merchant" — `Visible.shortDescription`)
 *   - **Detail entries** ("the brass handle" — that's `DetailedMixin`)
 *
 * Rule of thumb: if the string starts with an article ("a", "the",
 * "an") or reads like a description ("iron door"), it's a
 * `shortDescription` not a Named name. A proper name stands on its
 * own without an article.
 *
 * **Why the split matters.** `Stuff.getPresentation()` uses the
 * presence of a Named name as the **highest-precedence** display
 * string — proper names render bare ("Alice"), while
 * shortDescriptions render with articles ("a heavy iron door"). The
 * recognition pipeline keys off Named presence too (it composes on top of `getPresentation()`).
 * Smuggling generic labels into Named blurs the rendering contract
 * and breaks recognition.
 *
 * ## Shape
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
 * Most code calls `obj.getName()`. `getFullName()` is the formal /
 * introductory register: synthesized as
 * `[honorific, name, surname, nameSuffix].filter(Boolean).join(' ')`.
 * No "Unnamed" fallback — when nothing is set, `getFullName()`
 * returns `''` and `obj.getPresentation()` falls through
 * to its baked-in `'something'` default.
 *
 * Transient name effects (memory loss, polymorph, hood/disguise)
 * are out of scope for this mixin. If they're added later, they
 * have to attach via `ShadowApi` on a method-shaped surface —
 * `getFullName()` is the right shadow target; the underlying
 * accessor pair is host-internal and doesn't participate in the
 * shadow chain.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { ShadowChangedEvent } from '../events/ShadowChangedEvent';
import {
  MqlSubscriptionApi,
  type SubscribableFieldDescriptor,
} from '../../api/mql-subscription';

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
  getHonorific(): string | undefined;
  setHonorific(value: string | undefined): void;
  getName(): string;
  setName(value: string): void;
  getSurname(): string | undefined;
  setSurname(value: string | undefined): void;
  getNameSuffix(): string | undefined;
  setNameSuffix(value: string | undefined): void;

  getFullName(): string;

  getAlternateNames(kind?: NameKind): AlternateName[];
  setAlternateNames(alts: AlternateName[]): void;
  addAlternateName(alt: AlternateName): void;
  removeAlternateName(value: string): boolean;
  hasAlternateName(value: string): boolean;
}

export function NamedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class NamedMixin extends Base {
    static _mixinName = 'NamedMixin';

    /**
     * Persistent fields. `alternateNames` is an array of plain
     * objects — the generic Hydrator copy works without a custom
     * persistenceHandler.
     */
    static fieldMeta: FieldMeta = {
      honorific: { persistent: true, authorable: true },
      name: { persistent: true, authorable: true },
      surname: { persistent: true, authorable: true },
      nameSuffix: { persistent: true, authorable: true },
      alternateNames: { persistent: true, authorable: true },
    };

    /**
     * Live-query subscribable fields. The descriptor's
     * `dependsOnFields` defaults to `['name']` (descriptor name =
     * source field name), so a `FieldChangedEvent { field: 'name' }`
     * from `setName` triggers re-projection automatically. The
     * `ShadowChangedEvent` entry covers future hood/disguise
     * shadows that change the rendered name without firing a field
     * change.
     */
    static subscribableFields: SubscribableFieldDescriptor[] = [
      {
        name: 'name',
        read: (stuff) =>
          (stuff as unknown as Named).getName(),
        changes: [{ on: ShadowChangedEvent, by: 'target' }],
      },
    ];

    /** Formal address prefix ("Dr.", "Sir", "Captain"). */
    protected honorific?: string;
    /** The casual-register proper name (the field 95% of callers want). */
    protected name: string = '';
    /** Family / second name. */
    protected surname?: string;
    /** Post-nominal suffix ("Jr.", "III", "Esq."). */
    protected nameSuffix?: string;
    /** Typed extra names (nicknames, titles, credentials). */
    protected alternateNames: AlternateName[] = [];

    getHonorific(): string | undefined { return this.honorific; }
    setHonorific(value: string | undefined): void { this.honorific = value; }

    getName(): string { return this.name; }
    setName(value: string): void {
      this.name = MqlSubscriptionApi.fireFieldChange(
        this,
        'name',
        this.name,
        value,
      );
    }

    getSurname(): string | undefined { return this.surname; }
    setSurname(value: string | undefined): void { this.surname = value; }

    getNameSuffix(): string | undefined { return this.nameSuffix; }
    setNameSuffix(value: string | undefined): void { this.nameSuffix = value; }

    /**
     * Host-internal accessor for the formal canonical form. Public
     * surface is `getFullName()`. Used at introductions, character
     * info screens, disambiguation — not the default for everyday
     * prose. Most callers should read `getName()` directly.
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
    protected get fullName(): string {
      const head = [this.honorific, this.name, this.surname]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (!this.nameSuffix) return head;
      if (!head) return this.nameSuffix;
      return `${head}, ${this.nameSuffix}`;
    }

    getFullName(): string { return this.fullName; }

    /**
     * Filtered view of alternate names. Pass a `kind` to narrow.
     * Returns a copy, so callers can iterate without disturbing
     * mutation order.
     */
    getAlternateNames(kind?: NameKind): AlternateName[] {
      if (!kind) return [...this.alternateNames];
      return this.alternateNames.filter((a) => a.kind === kind);
    }

    setAlternateNames(alts: AlternateName[]): void {
      this.alternateNames = alts.map(({ kind, value }) => ({ kind, value }));
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

    hasAlternateName(value: string): boolean {
      return this.alternateNames.some((a) => a.value === value);
    }
  };
}
