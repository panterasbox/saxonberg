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
import { MixinApi } from '../../api/mixin';
import type Material from './Material';
import type { Stuff } from '../stuff/Stuff';
import { Quantity } from '../quantity';
import { QuantityMarshaller } from '../../platform/idea/persistence/QuantityMarshaller';
import { EventApi } from '../../api/event';
import { FieldChangedEvent } from '../events/FieldChangedEvent';
import { ShadowChangedEvent } from '../events/ShadowChangedEvent';
import type { SubscribableFieldDescriptor } from '../../api/mql-subscription';
import type { MaterialSummary } from '@saxonberg/types';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { TemplatePaths } from '../paths';
import type { ImpressionData } from '../mould/Impression';
import type { MarkupAugmenter } from '../../api/mml';

/** One numeric dial read, falling back to the literal when unseeded. */
function tangibleDial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw == null || raw === '') return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}



/**
 * ⭐ Whose a thing is, for an impression's provenance: whose name is on it
 * (the chattel stamp), else who made it, else — a living body — itself.
 */
function provenanceOf(pattern: Stuff): string {
  if (pattern.isAgent()) return pattern.getIdentityPath() ?? '';
  if (MixinApi.isChattel(pattern)) {
    const owner = pattern.stampedOwner();
    if (owner && owner.kind !== 'group') return owner.templatePath;
  }
  if (MixinApi.isCrafted(pattern)) return pattern.getMaker();
  return '';
}

/** The name an identity goes by in the world now, or `''`. */
function presentNameOf(identity: string): string {
  if (!identity) return '';
  const who = StuffApi.findByTemplatePath<Stuff>(identity);
  return who ? who.getPresentation() : '';
}

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
  /** Is this made of something anything would eat? */
  isEdible(): boolean;

  /**
   * Set the Material at `detailKey`, or the bulk default when
   * `detailKey` is omitted. `setMaterial(null, detailKey)` removes the
   * per-Detail override (later reads at that key fall through to the
   * bulk default again). `setMaterial(null)` clears the bulk default
   * AND every per-Detail override.
   */
  setMaterial(value: Material | null, detailKey?: string): void;

  /**
   * ⭐ Whether anything this thing is MADE OF carries `tag` — the bulk
   * default and every per-Detail override, so an axe answers `true` to
   * both `wood` and `metal`.
   *
   * ⚠ Made of, never CONTAINS: a waterskin is leather. The backing read
   * for MQL's `[material.X]` filter.
   */
  hasMaterialTag(tag: string): boolean;

  /**
   * Read the Stuff's mass as a `Quantity<'kg'>`. Strict on the
   * runtime type — the marshaller absorbs persistence-shape
   * coercion at the hydration boundary.
   */
  getMass(): Quantity<'kg'>;
  /** Mass in kg without the water it has soaked up (the store's ledger reads it). */
  getDryMass(): Quantity<'kg'>;

  /**
   * Set the Stuff's mass. Strict on `Quantity<'kg'>`; callers
   * holding a raw number wrap via `Quantity.of(n, 'kg')`. YAML
   * authoring shapes (tag string, alt-unit literal, bare number)
   * are absorbed by the QuantityMarshaller for kg, not by this
   * runtime API.
   */
  setMass(value: Quantity<'kg'>): void;

  /**
   * ⭐ The temperature (K) at which THIS piece catches, or 0 when its
   * material never burns: the material's autoignition point raised by
   * {@link getWetIgnitionPenaltyK}. A soaked board survives a pour that
   * would ignite a dry one.
   */
  getIgnitionPointK(): number;
  /**
   * ⭐ The ONE held-water ignition formula: the extra temperature (K) the
   * water this piece holds raises its ignition threshold by. Surface
   * wetness (a log left in the rain) and the matter's own water (a turf
   * cut from a bog) add. Mass-independent: the fuel mass cancels between
   * the water-boil energy and the thermal capacity. `stoke`, `ignite`, a
   * pour and a firing chamber all read this.
   */
  getWetIgnitionPenaltyK(): number;
  /**
   * @hook ⭐ The shape this leaves pressed into something soft (ceramics
   * M9, D21): its kind, its volume, how it reads, whose it is — and what
   * the shape carries because the shape IS the function (a key's wards).
   * Never its identity. A living body leaves a LIKENESS. `null` when there
   * is no shape a mould could hold. A carved pattern overrides it with the
   * impression it was cut to.
   */
  leaveImpression(nowS: number): ImpressionData | null;
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
      // OUTWARD to whoever holds it…
      environment: ['platform/cmd/inventory/throw.yaml'],
      // …and SIDEWAYS to anyone sharing the room with it, because you
      // do not have to be holding a rock for throwing it to be on the
      // table. Whether the throw picks it up first, refuses, or costs a
      // beat is the CONTROLLER's call — availability and permission are
      // different questions, and only the first lives here.
      peers: ['platform/cmd/inventory/throw.yaml'],
    };
    /**
     * Field-marshaller binding. `mass` round-trips via the kg-bound
     * QuantityMarshaller; the runtime accessor pair stays strict on
     * `Quantity<'kg'>`. Authoring-shape coercion (`mass: heavy`,
     * `mass: "12000 g"`, bare numeric) lives in the marshaller's
     * `fromStored` and only runs on the persistence path.
     */
    static fieldMeta: FieldMeta = {
      _materialPath: { persistent: true, authorable: true, authorPicker: 'Material', ref: 'identity:constituent' },
      _detailMaterialPaths: { persistent: true, authorable: true, authorPicker: 'Material', ref: 'identity:constituent' },
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

    /**
     * ⭐ **Is this made of something anything would eat?**
     *
     * ⚠ Edibility is a fact about the MATERIAL, not the class — the same
     * class is an anvil or a cut of stew meat depending on its
     * `_materialPath`. So every caller was writing
     * `MixinApi.isTangible(s) ? s.getMaterial()?.getEdibility() === true
     * : false` by hand: the `eat` validator, the feeding brain, the
     * feeding vessel. Three spellings of one question. The thing knows
     * what it is made of; it can answer.
     */
    public isEdible(): boolean {
      return this.getMaterial()?.getEdibility() === true;
    }

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

    /**
     * ⭐ Whether **anything this thing is made of** carries `tag` — the
     * bulk default and every per-Detail override.
     *
     * An axe is oak at the haft, iron at the head and steel at the
     * edge, and *"is there anything metal in reach"* should find it. So
     * this asks across all of them rather than the bulk default alone,
     * which would answer "wood" for an axe and be useless to every
     * caller that has ever wanted this.
     *
     * ⚠ **What a thing is made OF, never what it CONTAINS.** A waterskin
     * is leather; the water is in a bulk slot and is a different
     * question with a different owner (`BulkableApi.slotFor`). Folding
     * the two together here would make `hasMaterialTag('water')` true of
     * the skin, which is a lie that reads like a convenience.
     *
     * The backing read for MQL's `[material.X]` filter.
     */
    public hasMaterialTag(tag: string): boolean {
      const wanted = tag.toLowerCase();
      if (this._materialPath) {
        const bulk = StuffApi.findByTemplatePath<Material>(this._materialPath);
        if (bulk?.hasTag(wanted)) return true;
      }
      for (const path of Object.values(this._detailMaterialPaths)) {
        const part = StuffApi.findByTemplatePath<Material>(path);
        if (part?.hasTag(wanted)) return true;
      }
      return false;
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

    /**
     * Mass in kg — **wet mass** for a wetted object.
     *
     * ⭐ A soaked cloak really is heavier, and this is the one place
     * that can be true for every reader at once: encumbrance sums
     * `getMass()`, thermal capacity multiplies by it, and the clo
     * derivation divides by area with it. Mass belongs to `Tangible`,
     * and *"wet matter weighs more"* is a fact about matter, so it
     * lives here rather than being re-applied at each consumer.
     *
     * ```
     * wet = dry × (1 + wetness × waterAbsorptionCapacity / 100)
     * ```
     *
     * ⚠⚠ **Organisms are excluded, deliberately.** A body's water is
     * metabolism's business — it is already modelled as hydration — and
     * flesh authors a 25% absorption capacity, so without this carve-out
     * a rained-on character would gain a quarter of their body mass and
     * move carry capacity, thermal mass, basal drain and the mass-scaled
     * fist all at once. `WetMixin` models the *surface wetting of an
     * object*; a creature's mass is its composition's.
     */
    public getMass(): Quantity<'kg'> {
      const self = this as unknown as Stuff;
      if (!MixinApi.isWet(self) || MixinApi.isOrganism(self)) {
        return this._mass;
      }
      const wetness = self.getWetness();
      if (!(wetness > 0)) return this._mass;
      const capacity =
        this.getMaterial()?.getWaterAbsorptionCapacity().rawValue() ?? 0;
      if (!(capacity > 0)) return this._mass;
      return Quantity.of(
        this._mass.rawValue() * (1 + (wetness * capacity) / 100),
        'kg',
      );
    }

    /**
     * Mass in kg **dry** — what the object weighs without the water it has
     * soaked up. The ledger a store keeps counts matter, not the water it
     * took on (storage-and-ice D2: wet sawdust is the same sawdust, its
     * wetness is the line's state).
     */
    public getDryMass(): Quantity<'kg'> {
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

    public leaveImpression(nowS: number): ImpressionData | null {
      const self = this as unknown as Stuff;
      const takenFromIdentity = provenanceOf(self);
      const name = self.getPresentation();
      if (self.isAgent()) {
        // ⚠⚠ A face is a LIKENESS (ceramics M9): a mask of how it looked,
        // and nothing in the world will take it for the person. No belief
        // is written here or anywhere a cast of it goes.
        return {
          kindPath: TemplatePaths.likeness,
          volumeL: 0.4,
          formDescription: `the face of ${name}`,
          partsDescription: 'a brow, the set of the mouth, the shut eyes',
          takenFromIdentity,
          takenFromName: name,
          takenAtS: nowS,
          carried: {},
        };
      }
      const density = this.getMaterial()?.getDensity().rawValue() ?? 0;
      const massKg = this._mass.rawValue();
      const kindPath = self.getTemplatePath();
      if (!kindPath || !(density > 0) || !(massKg > 0)) return null;
      const carried: ImpressionData['carried'] = {};
      // ⭐ A key's wards ARE its shape: a cast of it turns the same lock. A
      // keycard's function is a chip, not a shape, so it carries nothing.
      if (MixinApi.isCredentialWallet(self)) {
        const keys = self
          .getCredential('key')
          ?.getKeys()
          .filter((k) => k.technology !== 'keycard');
        if (keys && keys.length > 0) carried.keys = keys.map((k) => ({ ...k }));
      }
      // Something standing out of the body — a guard, a handle — will not
      // draw out of a one-piece rigid mould.
      const parts =
        MixinApi.isAssembled(self) ? (self.getBill()?.parts ?? []).map((l) => l.part) : [];
      return {
        kindPath,
        volumeL: (massKg / density) * 1000,
        // `getPresentation` already carries its article (`an arming sword`).
        formDescription: name,
        partsDescription: parts.join(', '),
        takenFromIdentity,
        takenFromName: presentNameOf(takenFromIdentity),
        takenAtS: nowS,
        carried,
        undercut: parts.length > 1,
      };
    }

    public getIgnitionPointK(): number {
      const mat = this.getMaterial();
      const base = mat === null ? 0 : mat.getAutoignitionTemperature().rawValue();
      if (!(base > 0)) return 0;
      return base + this.getWetIgnitionPenaltyK();
    }

    public getWetIgnitionPenaltyK(): number {
      const mat = this.getMaterial();
      if (mat === null) return 0;
      const capacityFraction = mat.getWaterAbsorptionCapacity().rawValue() / 100;
      if (capacityFraction <= 0) return 0;
      const c = mat.getSpecificHeat().rawValue();
      if (c <= 0) return 0;
      const self = this as unknown as Stuff;
      let held = 0;
      if (MixinApi.isWet(self)) {
        const saturation = self.getWetness();
        if (saturation > 0) held += saturation;
      }
      if (MixinApi.isMoist(self)) {
        // Above the `dried` band the fuel still carries its own water; at or
        // below it, it is dry fuel and contributes nothing.
        const driedAt = tangibleDial(AppSettingKeys.cureBandDriedAt, 0.5);
        const span = 1 - driedAt;
        if (span > 0) {
          const own = (self.getMoisture() - driedAt) / span;
          if (own > 0) held += own > 1 ? 1 : own;
        }
      }
      if (held <= 0) return 0;
      const lVap = tangibleDial(AppSettingKeys.fireIgnitionWaterLatentHeatJPerKg, 2260000);
      return (held * capacityFraction * lVap) / c;
    }
  };
}
