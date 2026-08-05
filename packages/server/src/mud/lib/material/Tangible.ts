/**
 * TangibleMixin — material reference(s) for physical Stuff.
 *
 * Composing this mixin says: "this Stuff is made of materials." A
 * Thing/Location/Vessel/Agent that composes Tangible reaches its
 * Material singleton(s) via `getMaterial()`; un-composed Stuff (Ideas,
 * command-staging entities) carry no Material concept at all.
 *
 * **Bulk + per-Detail with prefix inheritance.** The Stuff carries a
 * *bulk default* Material (the substance of the bulk of the object)
 * plus optional per-Detail overrides keyed by the same dotted detail
 * paths that `DetailedMixin` uses (`'blade.edge'` is the edge of the
 * blade). `getMaterial()` with no argument returns the bulk default;
 * `getMaterial(detailKey)` walks **longest dotted prefix first** down
 * to the bulk default — so a sub-detail without its own override
 * inherits whichever ancestor path most recently set one.
 *
 * ```typescript
 * axe.setMaterial(oak);              // bulk = oak (the haft)
 * axe.setMaterial(iron, 'head');     // override for the 'head' Detail
 * axe.setMaterial(steel, 'head.edge'); // sub-override on the edge
 *
 * axe.getMaterial();                 // → oak  (bulk)
 * axe.getMaterial('haft');           // → oak  (no override → bulk)
 * axe.getMaterial('head');           // → iron (exact override)
 * axe.getMaterial('head.spine');     // → iron (no exact, inherits 'head')
 * axe.getMaterial('head.edge');      // → steel (exact override)
 * axe.getMaterial('head.edge.tip');  // → steel (no exact, inherits 'head.edge')
 * ```
 *
 * `detailKey` is whatever string a `DetailedMixin` host uses to
 * identify a Detail — `getMaterial` doesn't enforce that the key
 * actually maps to a registered Detail. That coupling lives in
 * `MaterialApi` / consumer call sites.
 *
 * **Cross-reference shape (LOCKED).** Persistent fields are path
 * strings, NOT serialized Material instances. The getter resolves on
 * each call via `StuffApi.findByTemplatePath`, which is sync and
 * HMR-safe — replacing the Material singleton at boot or via
 * hot-reload is observed immediately by every reader. No marshaller
 * required.
 */

import type { CommandContributions } from '../../api/command';
import type { MixinConstructor, FieldMeta } from '../mixin';
import { StuffApi } from '../../api/stuff';
import type Material from './Material';
import { Quantity } from '../quantity';
import { QuantityMarshaller } from '../../obj/persistence/QuantityMarshaller';
import { EventApi } from '../../api/event';
import { FieldChangedEvent } from '../events/FieldChangedEvent';
import { ShadowChangedEvent } from '../events/ShadowChangedEvent';
import type { SubscribableFieldDescriptor } from '../../api/mql-subscription';
import type { MaterialSummary } from '@saxonberg/types';

/**
 * Build the minimal Material wire summary — identity + display
 * name only. Properties (density, hardness, etc.) ship when a
 * consumer demands them.
 */
function summarizeMaterial(mat: Material): MaterialSummary {
  return {
    materialId: mat.stuffId,
    templatePath: mat.getTemplatePath() ?? '',
    name: mat.getName(),
  };
}

export interface Tangible {
  /**
   * Resolve the Material at `detailKey`, falling through to the bulk
   * default when no per-Detail override is set. Omit `detailKey` to
   * read the bulk default directly.
   */
  getMaterial(detailKey?: string): Material | null;

  /**
   * Set the Material at `detailKey`, or the bulk default when
   * `detailKey` is omitted. `setMaterial(null, detailKey)` removes the
   * per-Detail override (later reads at that key fall through to the
   * bulk default again). `setMaterial(null)` clears the bulk default
   * AND every per-Detail override.
   */
  setMaterial(value: Material | null, detailKey?: string): void;

  /**
   * Read the Stuff's mass as a `Quantity<'kg'>`. Strict on the
   * runtime type — the marshaller absorbs persistence-shape
   * coercion at the hydration boundary.
   */
  getMass(): Quantity<'kg'>;

  /**
   * Set the Stuff's mass. Strict on `Quantity<'kg'>`; callers
   * holding a raw number wrap via `Quantity.of(n, 'kg')`. YAML
   * authoring shapes (tag string, alt-unit literal, bare number)
   * are absorbed by the QuantityMarshaller for kg, not by this
   * runtime API.
   */
  setMass(value: Quantity<'kg'>): void;
}

export function TangibleMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class TangibleMixin extends Base {
    static _mixinName = 'TangibleMixin';

    /**
     * **The thing with mass confers the verb.** Anything Tangible is
     * throwable, so holding one grants `throw` — the tools-confer
     * pattern (a wand grants `zap`), not a property of the thrower.
     *
     * It deliberately does NOT ride `ContainerMixin.self`. Container is
     * "I can hold things", which is the right home for `drop`/`give`
     * but says nothing about whether what you are holding can be
     * thrown — and a room is a Container.
     */
    static commandContributions: CommandContributions = {
      self: [],
      inventory: ['inventory/throw.yaml'],
      environment: [],
      peers: [],
    };
    /**
     * Field-marshaller binding. `mass` round-trips via the kg-bound
     * QuantityMarshaller; the runtime accessor pair stays strict on
     * `Quantity<'kg'>`. Authoring-shape coercion (`mass: heavy`,
     * `mass: "12000 g"`, bare numeric) lives in the marshaller's
     * `fromStored` and only runs on the persistence path.
     */
    static fieldMeta: FieldMeta = {
      _materialPath: { persistent: true, authorable: true, authorPicker: 'Material' },
      _detailMaterialPaths: { persistent: true, authorable: true, authorPicker: 'Material' },
      mass: { persistent: true, marshaller: QuantityMarshaller.pathFor('kg'), authorable: true },
    };

    /**
     * Live-query subscribable fields.
     *
     *   - `bulkMaterial` — flat. The bulk default Material as a
     *     `MaterialSummary` wire shape, or `null` when no bulk
     *     material is set. `dependsOnFields` defaults to
     *     `['bulkMaterial']` (descriptor name = source field name).
     *   - `mass` — flat. Quantity in kg as `{ value, unit: 'kg' }`.
     *     `dependsOnFields` defaults to `['mass']`.
     *   - `detailMaterial` — focused-detail only (no flat read).
     *     Descriptor name (`detailMaterial`) does NOT match the
     *     setter's discriminator (`detailMaterials`, plural), so we
     *     declare `dependsOnFields` explicitly.
     *
     * Shadow lifecycle entries cover future material shadows that
     * change the rendered value without firing a field change.
     */
    static subscribableFields: SubscribableFieldDescriptor[] = [
      {
        name: 'bulkMaterial',
        read: (stuff) => {
          const mat = (stuff as unknown as Tangible).getMaterial();
          return mat ? summarizeMaterial(mat) : null;
        },
        changes: [{ on: ShadowChangedEvent, by: 'target' }],
      },
      {
        name: 'mass',
        read: (stuff) => {
          const q = (stuff as unknown as Tangible).getMass();
          return { value: q.rawValue(), unit: 'kg' as const };
        },
      },
      {
        name: 'detailMaterial',
        // Focus-only contribution — no flat read. The substrate
        // calls `perDetailRead` only in focus mode; flat
        // projections skip descriptors without `read`.
        //
        // Explicit dependsOnFields because the descriptor name
        // (`detailMaterial`) doesn't match the setter's field
        // discriminator (`detailMaterials`).
        perDetailRead: (stuff, detailKey) => {
          const mat = (stuff as unknown as Tangible).getMaterial(detailKey);
          return mat ? { material: summarizeMaterial(mat) } : null;
        },
        dependsOnFields: ['detailMaterials'],
        changes: [{ on: ShadowChangedEvent, by: 'target' }],
      },
    ];

    /**
     * Runtime mass storage as a `Quantity<'kg'>`. The marshaller
     * delivers a Quantity instance on hydrate; in-process callers
     * use `getMass` / `setMass`.
     */
    private _mass: Quantity<'kg'> = Quantity.of(0, 'kg');

    protected get mass(): Quantity<'kg'> {
      return this._mass;
    }
    protected set mass(value: Quantity<'kg'>) {
      if (!(value instanceof Quantity) || value.unit !== 'kg') {
        throw new TypeError(
          `TangibleMixin.mass must be a Quantity<'kg'>; got ${value instanceof Quantity ? `Quantity<'${(value as Quantity<import('../quantity').Unit>).unit}'>` : typeof value}`
        );
      }
      if (value.rawValue() < 0) {
        throw new RangeError(
          `TangibleMixin.mass must be non-negative, got ${value.rawValue()}`
        );
      }
      this._mass = value;
    }

    /**
     * Path to the bulk default Material singleton. Resolved lazily on
     * each `getMaterial()` call so HMR replacement is observed
     * immediately.
     *
     * Pattern-A path-string reference to the
     *   default Material singleton (resolve-on-read).
     */
    public _materialPath: string | null = null;

    /**
     * Per-Detail Material overrides — flat map from detailKey to the
     * Material's templatePath. Stored as a plain `Record` (not a
     * `Map`) so default JSON serialization handles it without a
     * marshaller.
     */
    public _detailMaterialPaths: Record<string, string> = {};

    public getMaterial(detailKey?: string): Material | null {
      if (detailKey !== undefined) {
        // Walk dotted prefixes from longest to shortest; first match
        // wins. Mirrors `DetailedMixin`'s parent-then-child path
        // convention so a sub-detail inherits its ancestor's
        // material when it has no override of its own.
        let key: string | undefined = detailKey;
        while (key !== undefined) {
          const override = this._detailMaterialPaths[key];
          if (override) {
            return StuffApi.findByTemplatePath<Material>(override) ?? null;
          }
          const dot = key.lastIndexOf('.');
          key = dot < 0 ? undefined : key.substring(0, dot);
        }
        // No override at any prefix — fall through to bulk default.
      }
      if (!this._materialPath) return null;
      return StuffApi.findByTemplatePath<Material>(this._materialPath) ?? null;
    }

    public setMaterial(value: Material | null, detailKey?: string): void {
      const stuffId = (this as unknown as { stuffId: string }).stuffId;
      if (detailKey !== undefined) {
        const oldPath = this._detailMaterialPaths[detailKey];
        const newPath = value ? (value.getTemplatePath() ?? undefined) : undefined;
        if (value === null) {
          delete this._detailMaterialPaths[detailKey];
        } else if (newPath) {
          this._detailMaterialPaths[detailKey] = newPath;
        }
        if (oldPath !== newPath) {
          EventApi.fire(
            new FieldChangedEvent({
              target: stuffId,
              field: 'detailMaterials',
              oldValue: oldPath ?? null,
              newValue: newPath ?? null,
            }),
          );
        }
        return;
      }
      if (value === null) {
        const hadBulk = this._materialPath !== null;
        const hadOverrides = Object.keys(this._detailMaterialPaths).length > 0;
        this._materialPath = null;
        this._detailMaterialPaths = {};
        if (hadBulk) {
          EventApi.fire(
            new FieldChangedEvent({
              target: stuffId,
              field: 'bulkMaterial',
              oldValue: undefined,
              newValue: null,
            }),
          );
        }
        if (hadOverrides) {
          EventApi.fire(
            new FieldChangedEvent({
              target: stuffId,
              field: 'detailMaterials',
              oldValue: undefined,
              newValue: undefined,
            }),
          );
        }
        return;
      }
      const newPath = value.getTemplatePath() ?? null;
      const oldPath = this._materialPath;
      this._materialPath = newPath;
      if (oldPath !== newPath) {
        EventApi.fire(
          new FieldChangedEvent({
            target: stuffId,
            field: 'bulkMaterial',
            oldValue: oldPath,
            newValue: newPath,
          }),
        );
      }
    }

    public getMass(): Quantity<'kg'> {
      return this._mass;
    }

    /**
     * Strict on `Quantity<'kg'>`. Callers holding a raw number wrap
     * via `Quantity.of(n, 'kg')` at the call site; tag / alt-unit
     * authoring is the marshaller's job, not a runtime API concern.
     */
    public setMass(value: Quantity<'kg'>): void {
      const old = this._mass;
      this.mass = value;
      // The setter above validates type/range. Compare via Quantity
      // equality (same raw value AND same unit) so a redundant write
      // of the same mass doesn't fire.
      if (!(old instanceof Quantity) || !old.equals(value)) {
        EventApi.fire(
          new FieldChangedEvent({
            target: (this as unknown as { stuffId: string }).stuffId,
            field: 'mass',
            oldValue: old,
            newValue: value,
          }),
        );
      }
    }
  };
}
