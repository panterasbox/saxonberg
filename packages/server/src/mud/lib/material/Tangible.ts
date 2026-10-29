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
import type { AudibleEmitOptions } from '../perception/Audible';

/** The kinds of flaw a piece of matter can carry (ceramics M5). */
/**
 * A body's flaw kinds. ⭐ A casting's two faults are kinds of their own
 * (review R2-D7) so the flaw IS the fact and its words derive from it: a
 * `misrun` froze before the cavity filled; `shrinkage` is the porous place
 * that froze last with nothing to feed it.
 */
export type FlawKind = 'dunt' | 'crack' | 'misrun' | 'shrinkage' | 'check';

/** A flaw in a body — a dunt from a heat shock, a crack, a casting fault. */
export interface Flaw {
  kind: FlawKind;
  /** Can an eye find it? A hidden one only `ring` finds. */
  visible: boolean;
  /** Game-second it happened. */
  atS: number;
  /** How it was mended, if it was — a tinker's rivets across a crack. */
  mended?: 'riveted';
}

/** A blow a body takes. */
export interface ImpactSpec {
  /** The energy delivered, J. */
  energyJ: number;
  /** What it struck — a floor's material, a target's; `null` = itself. */
  surface: Material | null;
  /**
   * What dealt it. ⚠ Not frost: a frost bursts GREEN ware, which is still
   * clay, so it is ruined in place by the piece's own record
   * (`GreenwareMixin`) — never broken into sherds (review R2-B5).
   */
  cause: 'drop' | 'throw' | 'blow';
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

/**
 * ⭐ Where a CAST's shape came from (ceramics M9): the kind of thing an
 * impression was taken of, whose it was, and when — provenance, recorded
 * and never judged. A cast is a fresh thing of that kind; this is all it
 * keeps of the original. `null` on anything not cast from an impression.
 */
export interface CastProvenance {
  /**
   * The template path of the kind the impression was taken from — `''`
   * when it set in the mould's OWN shape (an ingot, a bell from its pit).
   */
  kindPath: string;
  /** Whose thing it was — an identity path, or `''`. */
  takenFromIdentity: string;
  /** Game-second the impression was taken. */
  takenAtS: number;
  /**
   * ⭐ The trade of the MOULD it set in (repair D1's third read) — who
   * mends it. A value, not a ref: a consumed mould is gone after the cast.
   * The ONE cast record (review R2-D6; `Crafted.castDiscipline` retired).
   */
  discipline?: string;
}

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

/** How much a flaw costs a body's strength. */
const FLAW_PENALTY: Readonly<Record<FlawKind, number>> = {
  dunt: 0.3,
  crack: 0.5,
  misrun: 0.3,
  shrinkage: 0.3,
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
   * ⭐ A pile's flaws when it splits or merges (R2-B6): `visible` copies
   * the flaws an eye can find (a split-off of a cracked pile is cracked —
   * they are why it is its own pile), `!visible` the hidden ones (a merge
   * carries them, so stacking never launders a crack). Hidden flaws never
   * split a stack: a pile refusing to merge would tell what only `ring`
   * may (Blessable's rule).
   */
  takeFlawsFrom(other: Stuff, visible: boolean): void;
  /**
   * Rivet every unmended crack and dunt (a tinker's mend, ceramics): the
   * staples show, so a riveted flaw is visible. Returns how many.
   */
  rivetFlaws(): number;
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
   * flawed one buzzes — and how loud, by its mass. `ring` tells it. A
   * Ringable signal's sound is emitted from itself through the audible
   * system — a signal bell under the water, heard by every diver in the
   * column and placed by none (underwater C5).
   */
  ringSound(): RingSound;
  /** Can this receive a pour at `k` K? (ceramics S13 — W7 reads it.) */
  canReceiveAtK(k: number): PourReception;
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
   * ⭐ What this was cast from — the impression's kind and whose thing it
   * was (ceramics M9) — or `null` when it was not cast from one. A cast
   * part whose kind is a line's part kind fits without a new joint (D27).
   */
  getCastFrom(): CastProvenance | null;
  /** Record a cast's provenance (the mould's cast path writes it). */
  setCastFrom(value: CastProvenance | null): void;
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

/** How a thing sounds when it is rung (`TangibleMixin.ringSound`). */
/**
 * ⭐ How a struck thing sounds — the audible system's own vocabulary
 * (`AudibleEmitOptions`, review R2-D4): `description` is what is heard (the
 * note, the buzz of a crack), `character` the word for it heard faintly,
 * `db` how loud a metre off. A Ringable signal sounds it through
 * `AudibleMixin.emit`; an ordinary tapped thing is heard as the act.
 */
export interface RingSound extends AudibleEmitOptions {
  description: string;
  /** Does it ring clear (sound, hard, unflawed)? */
  rings: boolean;
}

/** What a look says of a flaw an eye can find — and of a mend. */
const FLAW_WORDS: Readonly<Record<FlawKind, string>> = {
  crack: 'It is cracked.',
  dunt: 'A fine crack runs through it where a shock of heat caught it.',
  misrun: 'It froze before the mould was full: the thin parts are ragged and short, and an edge runs out into nothing.',
  shrinkage:
    'Where it froze last it is porous, pitted with little shrinkage holes — the metal drew in and nothing fed it.',
  check: 'Fine checks run across its surface where it dried too fast.',
};

/**
 * ⭐ The flaws a look can see, and the mends. Before this a `visible` flaw
 * was seen by nothing: a cracked bowl read as a sound one (the ceramics
 * drive C, run 37). A hidden one stays hidden — only `ring` finds it.
 */
const flawAugmenter: MarkupAugmenter = (text, host, _viewer, opts) => {
  if (opts?.filter) return text;
  if (!MixinApi.isTangible(host)) return text;
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const f of host.getFlaws()) {
    const line = f.mended === 'riveted'
      ? 'It has been riveted across a crack: a row of iron staples holds it together.'
      : f.visible ? FLAW_WORDS[f.kind] : '';
    if (line && !seen.has(line)) {
      seen.add(line);
      lines.push(line);
    }
  }
  if (lines.length === 0) return text;
  const all = lines.join(' ');
  return text && text.length > 0 ? `${text}\n\n${all}` : all;
};

export function TangibleMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class TangibleMixin extends Base {
    static _mixinName = 'TangibleMixin';

    static markupAugmenters: MarkupAugmenter[] = [flawAugmenter];

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
      // ⭐ What a cast was cast FROM (ceramics M9) — the impression's kind
      // and provenance. Runtime state: only a pour writes it.
      castFrom: { persistent: true, runtimeState: true },
    };

    /** See {@link Tangible.getFlaws}. */
    public flaws: Flaw[] = [];

    /** See {@link Tangible.getCastFrom}. */
    public castFrom: CastProvenance | null = null;

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

    public takeFlawsFrom(other: Stuff, visible: boolean): void {
      if (!MixinApi.isTangible(other)) return;
      const taken = other.getFlaws().filter((f) => f.visible === visible);
      if (taken.length > 0) this.flaws = [...this.flaws, ...taken.map((f) => ({ ...f }))];
    }

    public rivetFlaws(): number {
      let n = 0;
      this.flaws = this.flaws.map((f) => {
        if ((f.kind !== 'crack' && f.kind !== 'dunt') || f.mended) return f;
        n++;
        return { ...f, visible: true, mended: 'riveted' as const };
      });
      return n;
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

    public getCastFrom(): CastProvenance | null {
      return this.castFrom;
    }

    public setCastFrom(value: CastProvenance | null): void {
      const kindPath = typeof value?.kindPath === 'string' ? value.kindPath : '';
      const discipline = typeof value?.discipline === 'string' ? value.discipline : '';
      this.castFrom =
        value && (kindPath !== '' || discipline !== '')
          ? {
              kindPath,
              takenFromIdentity: value.takenFromIdentity ?? '',
              takenAtS: Number.isFinite(value.takenAtS) ? value.takenAtS : 0,
              ...(discipline !== '' ? { discipline } : {}),
            }
          : null;
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
      // A riveted crack still weakens the body, by half: the staples hold it.
      for (const f of this.flaws) penalty += (FLAW_PENALTY[f.kind] ?? 0.2) * (f.mended ? 0.5 : 1);
      return toughness * 1e6 * v * (v / vRef) * share * Math.max(0.1, 1 - penalty);
    }

    public impactVerdict(spec: ImpactSpec): 'none' | 'crack' | 'break' {
      const mat = this.getMaterial();
      if (mat === null || !mat.hasTag('brittle') || !(spec.energyJ > 0)) return 'none';
      const delivered = this.deliveredJ(spec);
      const strength = this.impactStrengthJ();
      if (delivered < strength * 0.5) return 'none';
      return delivered < strength ? 'crack' : 'break';
    }

    /**
     * ⭐ The joules a blow delivers into this body — the floor's say, the ONE
     * copy (review R2-D2): a soft surface (earth, boards) takes the blow by
     * its own hardness; one as hard as the body (flagstone) gives it all
     * back; `null` is the body itself.
     */
    private deliveredJ(spec: ImpactSpec): number {
      const own = Math.max(1, this.getMaterial()?.getHardness().rawValue() ?? 1);
      const floor = spec.surface !== null ? spec.surface.getHardness().rawValue() : own;
      return spec.energyJ * Math.min(1, Math.max(0, floor) / own);
    }

    public async sufferImpact(spec: ImpactSpec): Promise<ImpactOutcome> {
      const self = this as unknown as Stuff;
      const verdict = this.impactVerdict(spec);
      if (verdict === 'none') return { broke: false, flawed: false, pieces: null };
      if (verdict === 'crack') {
        // A crack — on the rim it shows; deep in the wall only `ring` finds it.
        this.addFlaw('crack', this.deliveredJ(spec) >= this.impactStrengthJ() * 0.8);
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

    public ringSound(): RingSound {
      const mat = this.getMaterial();
      const sounding = mat !== null && (mat.hasTag('brittle') || mat.hasTag('metal'));
      const rings =
        sounding &&
        this.flaws.length === 0 &&
        (mat!.hasTag('metal') ||
          mat!.getHardness().rawValue() >= tangibleDial(AppSettingKeys.impactRingsAboveHardness, 55));
      const description = !sounding
        ? 'a dull knock, and nothing after it'
        : this.flaws.length > 0
          ? 'a flat, buzzing clack — there is a crack in it somewhere'
          : rings
            ? 'a clear ring that hangs in the air'
            : 'a dead, soft note';
      // ⭐ How far it carries: a sounding body's note by its mass (a bell's
      // over the square, a mug's across a table); a dull knock barely at all.
      const kg = Math.max(0.01, this._mass.rawValue());
      return {
        description,
        character: rings ? 'ring' : 'knock',
        db: rings ? 50 + 10 * Math.log10(kg) : 35,
        rings,
      };
    }

    public canReceiveAtK(k: number): PourReception {
      const mat = this.getMaterial();
      if (mat === null || !(k > 0)) return 'holds';
      const melts = mat.getMeltingPoint().rawValue();
      if (melts > 0 && k >= melts) return 'melts';
      const burns = this.getIgnitionPointK();
      if (burns > 0 && k >= burns) return 'burns';
      return 'holds';
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
      if (MixinApi.isWaterActive(self)) {
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
