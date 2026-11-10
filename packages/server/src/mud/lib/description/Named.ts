/**
 * NamedMixin — **proper-name** identity for things people address
 * by name.
 *
 * Lives in `lib/description/` because a proper name is part of how a
 * thing presents itself, alongside `Visible`, `Perceptible`, and
 * `Detailed`.
 *
 * ## ⭐⭐ Who composes it — and it is never a base class
 *
 * `CastMixin` (the *somebody* identity rung), `Avatar` (a player body,
 * whose name embody writes), and **any class that mints a proper name of
 * its own** — a pet, a named artefact, a named vessel. That is the whole
 * list, and adding to it is a deliberate act on one class. ⭐ The named
 * artefacts are `Tool` and `Weapon` (repair D18): composed BENEATH
 * `AssembledMixin`, whose `getName`/`setName` read and write the part
 * that bears the name (a sword's is its blade's) before this field.
 *
 * ⚠ It sat on the **creature base** until 2026-09-10, which made it the
 * one composition in the tree that contradicted this file's own rule: a
 * wolf, a corpse, a mercenary and a head of stock all carried
 * `setSurname` and an author could fill it in by accident and have it
 * stick. `Thing.ts`'s header already stated the rule — *"names are for
 * proper names, not generic descriptions"* — for the object branch, and
 * the agent branch simply did not follow it.
 *
 * ⭐ The question was never *does this have a name*; it was **what
 * article does it take** — and that is `register` on `VisibleMixin`
 * now (`proper` · `definite` · `indefinite`). A nameless `Cast` is
 * *"the collier"*; an `Extra` is *"a sentry"*. Both compose exactly the
 * surface their rung claims.
 *
 * ⚠ `lint:identity` rule 6 makes a name-shaped key on a class that
 * cannot hold one a **build error** rather than a silent discard, which
 * is what it would otherwise be: the applier reflects only into fields
 * a composed class declares.
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

import type { Stuff } from '../stuff/Stuff';
import type { MixinConstructor, FieldMeta } from '../mixin';
import { NameTakingMixin } from './NameTaking';
import { Mixins } from '../mixin';
import { MixinApi } from '../../api/mixin';
import { GrammarApi } from '../../api/grammar';
import type { Perceptible } from './Perceptible';
import { ShadowChangedEvent } from '../events/ShadowChangedEvent';
import {
  MqlSubscriptionApi,
  type SubscribableFieldDescriptor,
} from '../../api/mql-subscription';
import type { ActOutcome, ActRefusal } from '../craft/ActPlan';

/**
 * Why a name was not taken — the CLOSED union `name` words (controller-
 * liquidity W8). `not-nameable`: nobody may name this, or not you;
 * `no-name-given`; and the animal's three (`Bonded.takeName`):
 * `already-named`, `not-chosen` (the bond, the following, the earned home —
 * one answer, one remedy), `name-taken` (a connected player goes by it).
 */
export type NameRefusalReason =
  | 'not-nameable'
  | 'no-name-given'
  | 'already-named'
  | 'not-chosen'
  | 'name-taken';
export type NameRefusal = ActRefusal<NameRefusalReason>;
/**
 * A name taken. `promoted`: the naming was also the thing's PROMOTION — it
 * is titled, keyed and captured now (an animal: identity and durability
 * together).
 */
export type NameTaken = ActOutcome<{ promoted: boolean }>;

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
  setAlternateNames(alts: ReadonlyArray<AlternateName | string>): void;
  addAlternateName(alt: AlternateName): void;
  removeAlternateName(value: string): boolean;
  hasAlternateName(value: string): boolean;

  /**
   * ⭐ May the hand at `handPath` (the person `by`, when known) give this
   * its name? The thing that holds a name decides who may write it
   * (ceramics W2): a maker its made thing once, the reforger the blade it
   * re-made, the person an animal has chosen. Default: nobody.
   */
  canBeNamedBy(handPath: string, by?: Stuff | null): boolean;

  /**
   * ⭐ Take the name `name` from `by` (controller-liquidity W8 — `name`
   * used to run the act): who may name it is {@link canBeNamedBy}, the name
   * is written, and the host that keeps it is captured. `Bonded` overrides
   * it with the promotion.
   */
  takeName(name: string, by: Stuff): Promise<NameRefusal | NameTaken>;

  /**
   * ⭐ **A name is a keyword** (one-resolution slate § 4 — *the name is not
   * special*): what this answers to is whatever the composition beneath
   * says (`Perceptible`'s authored keywords, a detail id…), then the name
   * and its bare form without a leading article (`the One Ring` answers
   * to `one ring`). Derived, never stored — rename it and it answers to
   * the new name at once. MQL scores this list and nothing else.
   */
  getKeywords(viewer?: Stuff): string[];
}

export function NamedMixin<TBase extends MixinConstructor>(Base: TBase) {
  // Whether the composition beneath already answers to words — decided once
  // per class, from the class, never by probing an instance (lazily: the
  // factory runs at import, before the mixin registry is guaranteed warm).
  let inherits: boolean | undefined;
  return class NamedMixin extends NameTakingMixin(Base) {
    static _mixinName = 'NamedMixin';

    /** See {@link Named.getKeywords}. */
    getKeywords(viewer?: Stuff): string[] {
      inherits ??= MixinApi.hasMixin(Base, Mixins.Perceptible) || MixinApi.hasMixin(Base, Mixins.Detailed) || MixinApi.hasMixin(Base, Mixins.Bulkable);
      const out = inherits
        ? (Base.prototype as unknown as Perceptible).getKeywords.call(this, viewer)
        : [];
      const name = this.getName().toLowerCase().trim();
      if (!name) return out;
      const space = name.indexOf(' ');
      const bare = space > 0 && GrammarApi.ARTICLES.has(name.slice(0, space)) ? name.slice(space + 1) : name;
      for (const word of [name, bare]) if (!out.includes(word)) out.push(word);
      return out;
    }

    /**
     * Persistent fields. `alternateNames` is an array of plain
     * objects — the generic applier copy works without a custom
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

    /**
     * @hook See {@link Named.takeName}. A made thing takes its name; the host
     * that keeps it is captured.
     */
    async takeName(name: string, by: Stuff): Promise<NameRefusal | NameTaken> {
      const wanted = name.trim();
      if (!(this as unknown as Named).canBeNamedBy(by.getIdentityPath() ?? '', by)) {
        return { ok: false, reason: 'not-nameable' };
      }
      if (!wanted) return { ok: false, reason: 'no-name-given' };
      this.setName(wanted);
      try {
        // ⚠ Loaded at use: `Named` sits beneath `Thing`, and the persistence
        // facade's import graph reaches `Thing` — a static import is a cycle
        // that calls `VisibleMixin` before its module has run.
        const { PersistableApi } = await import('../../api/persistable');
        await PersistableApi.captureHostOf(this as unknown as Stuff);
      } catch (err) {
        console.warn('Named.takeName: capture after naming failed:', err);
      }
      return { ok: true, facts: { promoted: false } };
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

    /**
     * ⭐ A row may author a bare word (`alternateNames: [road, reach]`) — it
     * is an `alias`. Destructured as a record, a string came out as
     * `{ kind: undefined, value: undefined }`, so all 79 rows written that
     * way answered to none of their names (found by the river's browser
     * walk: `course kestrel` at the bar).
     */
    setAlternateNames(alts: ReadonlyArray<AlternateName | string>): void {
      this.alternateNames = alts
        .map((a): AlternateName => (typeof a === 'string' ? { kind: 'alias', value: a } : { kind: a.kind, value: a.value }))
        .filter((a) => typeof a.value === 'string' && a.value !== '');
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
