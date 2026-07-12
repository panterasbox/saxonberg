/**
 * Blueprint — a catalogued **structural composition**: a backing class's
 * base + effective mixin set, named and (optionally) blessed for the CMS
 * Studio composer's class picker.
 *
 * NOT a Stuff and NOT a template. A blueprint is **authored reference data**
 * (the `Recipe` precedent): a {@link Document} in the `blueprints` collection,
 * loaded by the {@link BlueprintCatalogue} singleton, seeded at boot by
 * `BlueprintSeeder` (a derived skeleton from every backing class + a curated
 * overlay of named/blessed compositions). It carries no lifecycle or behavior
 * beyond answering questions about its own fields.
 *
 * Two kinds:
 *   - `composition` — a pure mixin-over-base composition (no custom
 *     methods/own fields). Recomposable: a named blueprint and a hand-composed
 *     equivalent render identically because the composer reads the effective
 *     mixin set. These are the palette's building blocks.
 *   - `concrete` — a logic-bearing class (owns methods/state, e.g.
 *     `Campfire`). Catalogued as a whole `kind` pointing at its `classPath`,
 *     NOT a recomposable particle set (behavior lives in the class).
 *
 * Storage shape:
 *   - `blueprintId` — durable id, stable across rename. Unique-indexed. The
 *     catalogue's primary key.
 *   - `signature` — the structural signature `<baseClass>|<sorted-mixins>`.
 *     Unique-indexed. The **dedup key**: two authors composing the same
 *     particles collide to one blueprint. See {@link Blueprint.signatureOf}.
 *   - `name` — a mutable display label. NEVER a key.
 *   - `baseClass` / `mixinNames` — the structural composition.
 *   - `kind` / `classPath` — the composition-vs-concrete split.
 *   - `parent` — hierarchy grouping (a parent blueprintId / category key).
 *   - `blessed` — curated + endorsed (surfaced first in the picker).
 *   - `description` — optional author-facing note.
 */

import { Document } from '../persistence/Document';
import { MixinApi, type AnyConstructor } from '../../api/mixin';
import type { BlueprintKind } from '@saxonberg/types';

export class Blueprint extends Document {
  static collectionName = 'blueprints';
  static persistentFields = [
    'blueprintId',
    'signature',
    'name',
    'baseClass',
    'mixinNames',
    'kind',
    'classPath',
    'parent',
    'blessed',
    'description',
  ];

  /** Durable id; unique-indexed. Stable across rename. */
  blueprintId: string = '';

  /** Structural signature `<baseClass>|<sorted-mixins>`; unique-indexed. */
  signature: string = '';

  /** Mutable display label (never a key). */
  name: string = '';

  /** The composition base class name (`Idea`, `Thing`, `Character`, …). */
  baseClass: string = '';

  /** The effective mixin set's `_mixinName`s (deduped + sorted). */
  mixinNames: string[] = [];

  /** `composition` (recomposable) | `concrete` (logic-bearing kind). */
  kind: BlueprintKind = 'composition';

  /** Concrete kinds only: the backing class path (`/obj/Campfire`). */
  classPath: string = '';

  /** Hierarchy grouping — a parent blueprintId or category key. */
  parent: string = '';

  /** Curated + endorsed; surfaces first in the picker. */
  blessed: boolean = false;

  /** Optional author-facing description. */
  description: string = '';

  getBlueprintId(): string {
    return this.blueprintId;
  }
  getSignature(): string {
    return this.signature;
  }
  getName(): string {
    return this.name;
  }
  getBaseClass(): string {
    return this.baseClass;
  }
  getMixinNames(): readonly string[] {
    return this.mixinNames;
  }
  getKind(): BlueprintKind {
    return this.kind;
  }
  getClassPath(): string {
    return this.classPath;
  }
  getParent(): string {
    return this.parent;
  }
  isBlessed(): boolean {
    return this.blessed;
  }
  getDescription(): string {
    return this.description;
  }

  /**
   * The structural signature for a base + mixin set: `<baseClass>|<sorted,
   * deduped mixin names>`. The dedup key both the seeder's derive step and
   * `publishBlueprint` compute — a curated entry's parts and a derived
   * class's introspected parts collide here when structurally identical.
   */
  static signatureFromParts(
    baseClass: string,
    mixinNames: readonly string[]
  ): string {
    const mixins = [...new Set(mixinNames)].sort().join(',');
    return `${baseClass}|${mixins}`;
  }

  /**
   * The structural signature of a live backing-class constructor:
   * `<baseClassName>|<queryMixins(ctor).map(_mixinName).sort()>`. The base is
   * the nearest non-mixin prototype-chain ancestor (the class the mixins were
   * applied over — `Idea` for `class Coin extends GlobbableMixin(Idea)`).
   */
  static signatureOf(ctor: AnyConstructor): string {
    return Blueprint.signatureFromParts(
      Blueprint.baseClassOf(ctor),
      Blueprint.mixinNamesOf(ctor)
    );
  }

  /** The effective mixin set's `_mixinName`s (deduped + sorted). */
  static mixinNamesOf(ctor: AnyConstructor): string[] {
    const names = MixinApi.queryMixins(ctor)
      .map((m) => m._mixinName)
      .filter((n): n is string => typeof n === 'string');
    return [...new Set(names)].sort();
  }

  /**
   * The composition base: the nearest prototype-chain ancestor of `ctor`
   * that is NOT itself a mixin layer (no own `_mixinName`). Walks past the
   * mixin stack to the class the mixins were applied over. `'Object'` for a
   * class with no reachable non-mixin ancestor (defensive).
   */
  static baseClassOf(ctor: AnyConstructor): string {
    let cur: unknown = Object.getPrototypeOf(ctor);
    while (
      typeof cur === 'function' &&
      cur !== Function.prototype &&
      (cur as { prototype?: unknown }).prototype
    ) {
      const isMixin = Object.prototype.hasOwnProperty.call(cur, '_mixinName');
      if (!isMixin) {
        const name = (cur as { name?: string }).name;
        if (name) return name;
      }
      cur = Object.getPrototypeOf(cur);
    }
    return 'Object';
  }
}
