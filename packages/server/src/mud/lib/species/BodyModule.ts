/**
 * BodyModule — one reusable piece of a body (organism-biology D1, S1): a
 * limb, a head, a torso, a wing, a claw. A `body-module` document in a
 * pack's `content/body-modules/`, cited by path from a body plan's
 * `modules:` list and served by `BodyModuleCatalogue`
 * (`SpeciesApi.modules()`).
 *
 * ⭐ A module holds a SUBTREE of parts with RELATIVE keys: `''` is the
 * module's root and takes the instance's absolute key (`as`), and `hand`
 * becomes `<as>.hand`. So a plan composed of modules expands to exactly
 * the keys it always had — which is what keeps every slot's `covers`,
 * every stored wound `site` and every stored part delta valid with no
 * migration.
 *
 * ⭐ Tissues carry **weights**, any positive numbers: a module's tissue
 * shares are its weights normalized, and its share of the body is its
 * `weight` against the other modules'. The sum is 1 by construction, so a
 * module means the same thing on a canary and an ox.
 *
 * Pure: a value read from a document, never a Stuff. Import-pure (types
 * only), so the anatomy lint can parse a module from a YAML file.
 */

import type { BodyFill, ComesOff, Integument, IntegumentLayer } from '../../platform/idea/species/BodyPlan';
import type { TapSpec } from '../../platform/idea/species/Species';

/** One tissue of a module part: a material row and its relative weight. */
export interface ModuleTissue {
  /** A tissue material's template path. */
  tissue: string;
  /** A positive relative weight within the module. */
  weight: number;
}

/** One part of a module, keyed relative to the module's root. */
export interface ModulePart {
  /** `''` for the module's root; otherwise a dotted suffix (`hand`, `spine.upper`). */
  key: string;
  /** The relative key of its parent within the module; absent for the root (and `''` = the root). */
  parent?: string;
  tissues: ModuleTissue[];
  /** As `BodyPart.governs` — what this part RUNS (an organ; makes it interior). */
  governs?: string[];
  /** As `BodyPart.serves` — what this part is FOR (a limb). */
  serves?: string[];
  /** As `BodyPart.severable` — it can come off. */
  severable?: boolean;
  /**
   * As `BodyPart.innervatedBy`, within the module: relative keys, or an
   * absolute `body.*` key for a supply outside it.
   */
  innervatedBy?: string[];
  /** As `BodyPart.suppliedBy`, the same relation for the blood supply. */
  suppliedBy?: string[];
  /** As `BodyPart.sustains` — any surviving one suffices (D6). */
  sustains?: string[];
  /** As `BodyPart.produces` — the taps this part is the gland of (D2). */
  produces?: TapSpec[];
  /** As `BodyPart.gait` — the ways this part moves the body. */
  gait?: string[];
  /** As `BodyPart.fill` — overrides the module's own. */
  fill?: BodyFill;
  /** As `BodyPart.integument` — overrides the module's own for this part. */
  integument?: Integument;
}

export class BodyModule {
  public readonly path: string;
  /** This module's default share of a body, relative to its siblings'. */
  public readonly weight: number;
  public readonly parts: readonly ModulePart[];
  /** What fills this module's parts (D12) unless a part says otherwise; `solid` when unsaid. */
  public readonly fill: BodyFill;
  /** ⭐ The outside of this module's exterior parts (D3), unless a part says otherwise. */
  public readonly integument: Integument | null;
  /**
   * ⭐ What this module's materials leave a carcass as (D5) — the map the
   * butcher reads. On the MODULE, not the material: most materials name
   * nothing (a loaf of bread), and a module is reused by every species
   * built from it, so a new animal still needs no list of its own.
   */
  public readonly comesOffAs: readonly ComesOff[];

  /**
   * Read one module document's data. Throws on a malformed module (P3):
   * no root, a duplicate key, a parent nobody declares, a non-positive
   * weight. The installer validates every shipped module through this.
   */
  constructor(path: string, data: Record<string, unknown>) {
    this.path = path;
    const rawParts = data.parts;
    if (!Array.isArray(rawParts) || rawParts.length === 0) {
      throw new Error(`body-module '${path}' has no parts`);
    }
    const keys = new Set<string>();
    const parts: ModulePart[] = [];
    for (const raw of rawParts as Record<string, unknown>[]) {
      const key = typeof raw.key === 'string' ? raw.key : '';
      if (keys.has(key)) throw new Error(`body-module '${path}': duplicate part key '${key}'`);
      keys.add(key);
      const tissues = (Array.isArray(raw.tissues) ? raw.tissues : []) as Record<string, unknown>[];
      const part: ModulePart = {
        key,
        tissues: tissues.map((t) => {
          const weight = Number(t.weight);
          if (typeof t.tissue !== 'string' || t.tissue === '') {
            throw new Error(`body-module '${path}' part '${key}': a tissue names its material`);
          }
          if (!Number.isFinite(weight) || weight <= 0) {
            throw new Error(`body-module '${path}' part '${key}' tissue '${t.tissue}': weight must be > 0`);
          }
          return { tissue: t.tissue, weight };
        }),
      };
      if (key !== '') part.parent = typeof raw.parent === 'string' ? raw.parent : '';
      for (const f of ['governs', 'serves', 'innervatedBy', 'suppliedBy', 'sustains', 'gait'] as const) {
        const v = raw[f];
        if (Array.isArray(v) && v.length > 0) part[f] = v.map(String);
      }
      if (raw.severable === true) part.severable = true;
      if (raw.fill !== undefined) part.fill = BodyModule.fillOf(raw.fill, path, key);
      if (raw.integument !== undefined) part.integument = BodyModule.integumentOf(raw.integument, path, key);
      if (Array.isArray(raw.produces) && raw.produces.length > 0) {
        part.produces = (raw.produces as Record<string, unknown>[]).map((t) => {
          if (typeof t.key !== 'string' || typeof t.yieldRow !== 'string') {
            throw new Error(`body-module '${path}' part '${key}': a gland's tap names a key and a yieldRow`);
          }
          return t as unknown as TapSpec;
        });
      }
      parts.push(part);
    }
    if (!keys.has('')) throw new Error(`body-module '${path}' has no root part (key '')`);
    for (const p of parts) {
      if (p.parent !== undefined && !keys.has(p.parent)) {
        throw new Error(`body-module '${path}' part '${p.key}': parent '${p.parent}' is not a part of the module`);
      }
    }
    this.parts = parts;
    this.fill = data.fill === undefined ? 'solid' : BodyModule.fillOf(data.fill, path, '');
    this.integument = data.integument === undefined ? null : BodyModule.integumentOf(data.integument, path, '');
    this.comesOffAs = (Array.isArray(data.comesOffAs) ? data.comesOffAs : []).map((e) => {
      const entry = (e ?? {}) as Record<string, unknown>;
      if (typeof entry.tissue !== 'string' || typeof entry.cut !== 'string') {
        throw new Error(`body-module '${path}': each comesOffAs entry names a tissue and a cut`);
      }
      return { tissue: entry.tissue, cut: entry.cut };
    });
    const own = this.tissueWeight();
    const authored = data.weight === undefined ? own : Number(data.weight);
    if (!Number.isFinite(authored) || authored < 0) {
      throw new Error(`body-module '${path}': weight must be a number ≥ 0`);
    }
    this.weight = authored;
  }

  private static fillOf(v: unknown, path: string, key: string): BodyFill {
    if (v === 'solid' || v === 'sparse' || v === 'hollow') return v;
    throw new Error(`body-module '${path}' part '${key}': fill must be solid, sparse or hollow (got ${String(v)})`);
  }

  /** Read an integument block; throws on a layer naming no material or a bad number (P3). */
  private static integumentOf(v: unknown, path: string, key: string): Integument {
    if (v === null || typeof v !== 'object') throw new Error(`body-module '${path}' part '${key}': integument must be a block`);
    const out: Integument = {};
    for (const layer of ['skin', 'under', 'coat'] as const) {
      const raw = (v as Record<string, unknown>)[layer] as Record<string, unknown> | undefined;
      if (raw === undefined) continue;
      if (typeof raw.material !== 'string' || raw.material === '') {
        throw new Error(`body-module '${path}' part '${key}': integument ${layer} names no material`);
      }
      const l: IntegumentLayer = { material: raw.material };
      for (const n of ['weight', 'depthM', 'loft'] as const) {
        if (raw[n] === undefined) continue;
        const x = Number(raw[n]);
        if (!Number.isFinite(x) || x < 0) throw new Error(`body-module '${path}' part '${key}': integument ${layer}.${n} must be ≥ 0`);
        l[n] = x;
      }
      if (typeof raw.form === 'string') l.form = raw.form;
      if (typeof raw.tap === 'string') l.tap = raw.tap;
      out[layer] = l;
    }
    return out;
  }

  /** The sum of this module's tissue weights (its parts' own scale). */
  public tissueWeight(): number {
    return this.parts.reduce((a, p) => a + p.tissues.reduce((b, t) => b + t.weight, 0), 0) + this.skinWeight();
  }

  /** ⭐ The root's skin weight (D3): skin is a tissue, so it is in the module's sum. */
  public skinWeight(): number {
    const root = this.parts.find((p) => p.key === '');
    return (root?.integument ?? this.integument)?.skin?.weight ?? 0;
  }
}
