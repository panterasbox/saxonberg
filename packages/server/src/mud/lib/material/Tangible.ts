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

/** The kinds of flaw a piece of matter can carry (ceramics M5). */
export type FlawKind = 'dunt' | 'crack' | 'casting' | 'check';

/** A flaw in a body — a dunt from a heat shock, a crack, a casting fault. */
export interface Flaw {
  kind: FlawKind;
  /** Can an eye find it? A hidden one only `ring` finds. */
  visible: boolean;
  /** Game-second it happened. */
  atS: number;
}

/** A blow a body takes. */
export interface ImpactSpec {
  /** The energy delivered, J. */
  energyJ: number;
  /** What it struck — a floor's material, a target's; `null` = itself. */
  surface: Material | null;
  /** What dealt it. */
  cause: 'drop' | 'throw' | 'frost' | 'blow';
}

/** What a blow did. */
export interface ImpactOutcome {
  broke: boolean;
  flawed: boolean;
  /** What it broke into (sherds, a cullet lump), when it broke. */
  pieces: Stuff | null;
}

/** What a receiver does with a pour at a temperature (ceramics S13). */
export type PourReception = 'holds' | 'melts' | 'burns';

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


/** How much a flaw costs a body's strength. */
const FLAW_PENALTY: Readonly<Record<FlawKind, number>> = {
  dunt: 0.3,
  crack: 0.5,
  casting: 0.3,
  check: 0.15,
};

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

  /** The flaws in this body, visible and hidden (ceramics M5). */
  getFlaws(): readonly Flaw[];
  /** Record a flaw (`atS`: when, if the caller knows — the clock is the caller's). */
  addFlaw(kind: FlawKind, visible: boolean, atS?: number): void;
  /**
   * ⭐ The energy a blow must deliver to break this body, J — its
   * material's toughness × its volume, a thicker wall disproportionately
   * stronger, less what its flaws cost. `Infinity` for a body that is not
   * brittle (it dents, it does not shatter).
   */
  impactStrengthJ(): number;
  /**
   * ⭐⭐ The ONE breakage act: a blow of `energyJ` against `surface`. A soft
   * floor absorbs by its own hardness; a flagstone does not. Below half its
   * strength nothing; below its strength a crack; past it the body breaks
   * into its material's `brokenTemplate` and what it held spills.
   */
  sufferImpact(spec: ImpactSpec): Promise<ImpactOutcome>;
  /** What a blow would do, without doing it: `none`, a `crack`, or `break`. */
  impactVerdict(spec: ImpactSpec): 'none' | 'crack' | 'break';
  /**
   * ⭐ Tap it and listen: a sound hard body rings, a soft one is dead, a
   * flawed one buzzes — and how loud, by its mass. `ring` tells it.
   */
  ringSound(): { sound: string; db: number; rings: boolean };
  /** Can this receive a pour at `k` K? (ceramics S13 — W7 reads it.) */
  canReceiveAtK(k: number): PourReception;
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
      environment: [
        'platform/cmd/inventory/throw.yaml',
        // ⭐ Anything with mass can be tapped and listened to (ceramics M5):
        // a held mug, a bell on the square, a brick on a stall.
        'platform/cmd/perception/ring.yaml',
      ],
      // …and SIDEWAYS to anyone sharing the room with it, because you
      // do not have to be holding a rock for throwing it to be on the
      // table. Whether the throw picks it up first, refuses, or costs a
      // beat is the CONTROLLER's call — availability and permission are
      // different questions, and only the first lives here.
      peers: ['platform/cmd/inventory/throw.yaml', 'platform/cmd/perception/ring.yaml'],
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
      // ⭐ The flaws a body carries — a dunt, a crack, a casting fault
      // (ceramics M5). Authorable so a row can ship a cracked bell.
      flaws: { persistent: true, authorable: true, runtimeState: true },
    };

    /** See {@link Tangible.getFlaws}. */
    public flaws: Flaw[] = [];

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

    // ---------- brittleness, flaws and the ring (ceramics M5) ----------

    public getFlaws(): readonly Flaw[] {
      return this.flaws;
    }

    public addFlaw(kind: FlawKind, visible: boolean, atS = 0): void {
      this.flaws = [...this.flaws, { kind, visible, atS }];
    }

    public impactStrengthJ(): number {
      const mat = this.getMaterial();
      if (mat === null || !mat.hasTag('brittle')) return Number.POSITIVE_INFINITY;
      const density = mat.getDensity().rawValue();
      const toughness = mat.getToughness().rawValue();
      if (!(density > 0) || !(toughness > 0)) return 0;
      const v = this._mass.rawValue() / density;
      const vRef = tangibleDial(AppSettingKeys.impactReferenceVolumeM3, 0.0001);
      const share = tangibleDial(AppSettingKeys.impactFractureShare, 0.0018);
      let penalty = 0;
      for (const f of this.flaws) penalty += FLAW_PENALTY[f.kind] ?? 0.2;
      return toughness * 1e6 * v * (v / vRef) * share * Math.max(0.1, 1 - penalty);
    }

    public impactVerdict(spec: ImpactSpec): 'none' | 'crack' | 'break' {
      const mat = this.getMaterial();
      if (mat === null || !mat.hasTag('brittle') || !(spec.energyJ > 0)) return 'none';
      // ⭐ The floor's say: a soft one (earth, boards) takes the blow by its
      // own hardness; one as hard as the body (flagstone) gives it all back.
      const own = Math.max(1, mat.getHardness().rawValue());
      const floor = spec.surface !== null ? spec.surface.getHardness().rawValue() : own;
      const delivered = spec.energyJ * Math.min(1, Math.max(0, floor) / own);
      const strength = this.impactStrengthJ();
      if (delivered < strength * 0.5) return 'none';
      return delivered < strength ? 'crack' : 'break';
    }

    public async sufferImpact(spec: ImpactSpec): Promise<ImpactOutcome> {
      const self = this as unknown as Stuff;
      const verdict = this.impactVerdict(spec);
      if (verdict === 'none') return { broke: false, flawed: false, pieces: null };
      if (verdict === 'crack') {
        // A crack — on the rim it shows; deep in the wall only `ring` finds it.
        const mat = this.getMaterial()!;
        const own = Math.max(1, mat.getHardness().rawValue());
        const floor = spec.surface !== null ? spec.surface.getHardness().rawValue() : own;
        const delivered = spec.energyJ * Math.min(1, Math.max(0, floor) / own);
        this.addFlaw('crack', delivered >= this.impactStrengthJ() * 0.8);
        return { broke: false, flawed: true, pieces: null };
      }
      // It breaks: into its material's broken form, where it was. (What a
      // vessel held is spilled by `BulkableMixin.sufferImpact` first.)
      const mat = this.getMaterial()!;
      let pieces: Stuff | null = null;
      const row = mat.getBrokenTemplate();
      if (row) {
        try {
          pieces = await StuffApi.clone<Stuff>(row, undefined, { madeFrom: [self] });
          if (MixinApi.isTangible(pieces)) {
            pieces.setMaterial(mat);
            pieces.setMass(this._mass);
          }
          // ⚠ Placed through `Containable.leaveBeside`, never `ContainmentApi`
          // here: this file is in every Thing's base chain, and the Api's
          // import graph reaches back into it.
          if (MixinApi.isContainable(self)) self.leaveBeside(pieces);
        } catch {
          pieces = null;
        }
      }
      await StuffApi.destruct(self);
      return { broke: true, flawed: false, pieces };
    }

    public ringSound(): { sound: string; db: number; rings: boolean } {
      const mat = this.getMaterial();
      const sounding = mat !== null && (mat.hasTag('brittle') || mat.hasTag('metal'));
      const rings =
        sounding &&
        this.flaws.length === 0 &&
        (mat!.hasTag('metal') ||
          mat!.getHardness().rawValue() >= tangibleDial(AppSettingKeys.impactRingsAboveHardness, 55));
      const sound = !sounding
        ? 'a dull knock, and nothing after it'
        : this.flaws.length > 0
          ? 'a flat, buzzing clack — there is a crack in it somewhere'
          : rings
            ? 'a clear ring that hangs in the air'
            : 'a dead, soft note';
      // ⭐ How far it carries: a sounding body's note by its mass (a bell's
      // over the square, a mug's across a table); a dull knock barely at all.
      const kg = Math.max(0.01, this._mass.rawValue());
      return { sound, db: rings ? 50 + 10 * Math.log10(kg) : 35, rings };
    }

    public canReceiveAtK(k: number): PourReception {
      const mat = this.getMaterial();
      if (mat === null || !(k > 0)) return 'holds';
      const melts = mat.getMeltingPoint().rawValue();
      if (melts > 0 && k >= melts) return 'melts';
      const burns = mat.getAutoignitionTemperature().rawValue();
      if (burns > 0 && k >= burns) return 'burns';
      return 'holds';
    }
  };
}
