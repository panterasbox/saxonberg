/**
 * Body — the body of one individual (organism-biology D1, S2): every part
 * it has, what each is made of and for, and the questions every anatomy
 * reader asks of them.
 *
 * ⭐⭐ **Its constructor IS the expansion.** A body plan is a list of
 * module instances (`modules:` on a `BodyPlan` row); a species and its
 * variants add, scale and swap modules on top. `new Body(spec, modules,
 * deltas)` turns that into the flat part list the engine reads — keys
 * absolute, tissue shares summing to 1 — and is the ONLY place parts are
 * computed. `BodyPlan` and `Species` hold `Body` values, never part lists.
 *
 * ⭐ The keys a module expands to are the keys the hand-authored plans
 * always had (`body.torso`, `body.leg.frontLeft`, `body.head.brain`), so
 * slots, stored wound sites, stored part deltas and tests keep working
 * with no migration.
 *
 * ⚠ Import-pure: types only. The anatomy lint constructs bodies from YAML
 * with no world, and a value import here would drag the engine in.
 * Vocabulary validation (`governs` against the vital signs) stays with
 * `BodyPlan`, which already holds the vocabulary.
 */

import type { BodyModule, ModulePart } from './BodyModule';
import { DaylengthBand } from '../time/DaylengthBand';
import type {
  BodyFill,
  IntegumentLayer,
  Integument,
  BodyPart,
  BreathingSpec,
  SensoryPort,
} from '../../platform/idea/species/BodyPlan';
import type { TapSpec } from '../../platform/idea/species/Species';
import type { SlotSpec } from '../slot/Slotted';
import type { SenseChannel } from '../description/Perceiver';

/** One instance list in a plan: which module, where, and how big. */
export interface ModuleRef {
  /** The module document's path (`/stuff/body-modules/limb-fore`). */
  module: string;
  /** The absolute key of each instance's root; its length is the count. */
  as: string[];
  /** The part each instance hangs from; absent for the body's root. */
  at?: string;
  /** Each instance's weight against its siblings'; default the module's own. */
  weight?: number;
  /** The nerve supply of each instance's ROOT (absolute keys). */
  innervatedBy?: string[];
  /** The blood supply of each instance's ROOT (absolute keys). */
  suppliedBy?: string[];
  /** More gaits on each instance's ROOT (this plan's legs also crawl). */
  gait?: string[];
}

/**
 * A change to a body on top of its plan — a species' own `body:` block,
 * or a variant's (sex, stage, neutered). Applied in order.
 */
export interface BodyDelta {
  /** More module instances (an udder on a female, the vell on a calf). */
  add?: ModuleRef[];
  /** Scale instances by their `as` key: `{ 'body.head': 1.4 }` (renormalized). */
  scale?: Record<string, number>;
  /** ⭐ Override an instance's outside by its `as` key, layer by layer (D3): a sheep's fleece coat, a calf's thin one. */
  integument?: Record<string, Integument>;
}

/** The plan-side inputs: the module list and the plan facts still authored on the plan. */
export interface BodySpec {
  modules: readonly ModuleRef[];
  slots?: readonly SlotSpec[];
  /** Still authored on the plan until W9 derives senses from organs (D1's proxy). */
  sensoryPorts?: readonly SensoryPort[];
  /** Still authored on the plan until W8 derives breathing from organs. */
  breathing?: readonly BreathingSpec[];
}

/** ⭐ One line of a carcass (D5): a row, the materials that named it, the parts that carry them. */
export interface YieldLine {
  row: string;
  tissues: string[];
  parts: string[];
  /** It comes off the OUTSIDE (a hide, feathers): first, and not scaled by condition. */
  integument: boolean;
}

/** One resolved tissue: which part carries it, and its share of the whole body. */
export interface ResolvedTissue {
  partKey: string;
  tissuePath: string;
  share: number;
}

/** What an organ works in when its row does not say. */
const PORT_MEDIA_DEFAULT: Readonly<Record<string, readonly string[]>> = {
  smell: ['air'],
  taste: ['air'],
};

const DEFAULT_BREATHING: readonly BreathingSpec[] = [{ medium: 'air', apparatus: 'lungs', intake: 1 }];

export class Body {
  private readonly parts: readonly BodyPart[];
  private readonly byKey: ReadonlyMap<string, BodyPart>;
  private readonly conduitKeys: ReadonlySet<string>;
  private readonly slots: readonly SlotSpec[];
  private readonly sensoryPorts: readonly SensoryPort[];
  private readonly breathingSpecs: readonly BreathingSpec[];
  private surfaceFractions: Map<string, number> | null = null;
  private tissues: ResolvedTissue[] | null = null;

  /**
   * Expand `spec`'s modules (plus `deltas`) into parts. `modules` resolves
   * a module path to its parsed document — a resident catalogue read in
   * the engine, a parsed YAML file in the lint. Throws on an unknown
   * module, a duplicate key, or an instance hung from a part nobody has.
   */
  constructor(
    spec: BodySpec,
    modules: (path: string) => BodyModule,
    deltas: readonly BodyDelta[] = [],
  ) {
    this.slots = spec.slots ?? [];
    this.sensoryPorts = spec.sensoryPorts ?? [];
    this.breathingSpecs = spec.breathing ?? DEFAULT_BREATHING;

    const refs: ModuleRef[] = [...spec.modules];
    const scale = new Map<string, number>();
    for (const d of deltas) {
      for (const r of d.add ?? []) refs.push(r);
      for (const [k, f] of Object.entries(d.scale ?? {})) {
        if (!Number.isFinite(f) || f < 0) throw new Error(`Body: scale for '${k}' must be a number ≥ 0`);
        scale.set(k, (scale.get(k) ?? 1) * f);
      }
    }

    // ⭐ Each instance's share of the whole body: its weight (scaled)
    // against every instance's — so the sum is 1 by construction.
    interface Instance { ref: ModuleRef; mod: BodyModule; as: string; weight: number }
    const instances: Instance[] = [];
    for (const ref of refs) {
      const mod = modules(ref.module);
      for (const as of ref.as) {
        const w = (ref.weight ?? mod.weight) * (scale.get(as) ?? 1);
        instances.push({ ref, mod, as, weight: w });
      }
    }
    const totalWeight = instances.reduce((a, i) => a + i.weight, 0);

    const out: BodyPart[] = [];
    const seen = new Set<string>();
    const outsideOf = new Map<string, Integument | null>();
    const overrides = new Map<string, Integument>();
    for (const d of deltas) {
      for (const [k, v] of Object.entries(d.integument ?? {})) {
        overrides.set(k, Body.mergeIntegument(overrides.get(k) ?? null, v));
      }
    }
    for (const inst of instances) {
      const tw = inst.mod.tissueWeight();
      const factor = totalWeight > 0 && tw > 0 ? inst.weight / totalWeight / tw : 0;
      for (const mp of inst.mod.parts) {
        const key = Body.absolute(inst.as, mp.key);
        if (seen.has(key)) throw new Error(`Body: two parts expand to the key '${key}' (module '${inst.mod.path}')`);
        seen.add(key);
        const part = Body.expandPart(mp, inst.mod, inst.as, inst.ref, key, factor);
        const own = mp.integument ?? inst.mod.integument;
        const over = overrides.get(inst.as) ?? null;
        outsideOf.set(key, own || over ? Body.mergeIntegument(own, over ?? {}) : null);
        // ⭐ Skin is a tissue (D3): the root carries it, in the module's sum.
        const skinW = mp.key === '' ? inst.mod.skinWeight() : 0;
        const skin = outsideOf.get(key)?.skin;
        if (skinW > 0 && skin) part.tissues.push({ tissuePath: skin.material, share: skinW * factor, integument: true });
        out.push(part);
      }
    }
    for (const p of out) {
      if (p.parent !== null && !seen.has(p.parent)) {
        throw new Error(`Body: part '${p.key}' hangs from '${p.parent}', which this body does not have`);
      }
    }
    this.parts = out;
    this.byKey = new Map(out.map((p) => [p.key, p]));
    const conduits = new Set<string>();
    for (const p of out) {
      for (const k of p.innervatedBy ?? []) conduits.add(k);
      for (const k of p.suppliedBy ?? []) conduits.add(k);
    }
    this.conduitKeys = conduits;
    // ⭐ An outside belongs to an EXTERIOR part (D3): you cannot skin a liver.
    for (const p of out) {
      const outside = outsideOf.get(p.key);
      if (outside && !this.isInterior(p.key)) p.integument = outside;
    }
  }

  /** `over` layered on `base`, layer by layer (a layer's own fields merged). */
  private static mergeIntegument(base: Integument | null, over: Integument): Integument {
    const out: Integument = { ...(base ?? {}) };
    for (const layer of ['skin', 'under', 'coat'] as const) {
      const o = over[layer];
      if (o) out[layer] = { ...(out[layer] ?? {}), ...o };
    }
    return out;
  }

  private static absolute(as: string, rel: string): string {
    if (rel === '') return as;
    if (rel.startsWith('body.')) return rel;
    return `${as}.${rel}`;
  }

  private static expandPart(
    mp: ModulePart,
    mod: BodyModule,
    as: string,
    ref: ModuleRef,
    key: string,
    factor: number,
  ): BodyPart {
    const isRoot = mp.key === '';
    const part: BodyPart = {
      key,
      parent: isRoot ? (ref.at ?? null) : Body.absolute(as, mp.parent ?? ''),
      tissues: mp.tissues.map((t) => ({ tissuePath: t.tissue, share: t.weight * factor })),
    };
    if (mp.governs) part.governs = [...mp.governs];
    if (mp.serves) part.serves = [...mp.serves];
    if (mp.severable) part.severable = true;
    if (mp.regrows) part.regrows = mp.regrows;
    const inner = (mp.innervatedBy ?? []).map((k) => Body.absolute(as, k));
    const supply = (mp.suppliedBy ?? []).map((k) => Body.absolute(as, k));
    if (isRoot) {
      inner.push(...(ref.innervatedBy ?? []));
      supply.push(...(ref.suppliedBy ?? []));
    }
    if (inner.length) part.innervatedBy = inner;
    if (supply.length) part.suppliedBy = supply;
    if (mp.sustains) part.sustains = [...mp.sustains];
    if (mp.produces) part.produces = mp.produces.map((t) => ({ ...t }));
    const gait = [...(mp.gait ?? []), ...(isRoot ? (ref.gait ?? []) : [])];
    if (gait.length) part.gait = [...new Set(gait)];
    const fill = mp.fill ?? mod.fill;
    if (fill !== 'solid') part.fill = fill;
    if (mod.comesOffAs.length) part.comesOffAs = mod.comesOffAs;
    return part;
  }

  // ---- parts ----

  /** Every part, in expansion order (plan order, then deltas). */
  public getParts(): readonly BodyPart[] {
    return this.parts;
  }

  /** One part by key, or null. */
  public getPart(key: string): BodyPart | null {
    return this.byKey.get(key) ?? null;
  }

  /**
   * ⭐⭐ Is this part INSIDE the body? It governs something (an organ), or
   * something's control or supply runs through it (the spine). Interior
   * parts are excluded from every covering, insulation and concealment
   * walk: you cannot put a coat on a liver.
   */
  public isInterior(partKey: string): boolean {
    if (this.conduitKeys.has(partKey)) return true;
    return (this.byKey.get(partKey)?.governs?.length ?? 0) > 0;
  }

  /**
   * ⭐ A part's cross-sectional area by Meeh's law — `(Σ share)^(2/3)`.
   * Ratio-only readers: the surface fraction divides by the exterior
   * total, the depth ladder only orders by it. `0` for an unknown part.
   */
  public partArea(partKey: string): number {
    const part = this.byKey.get(partKey);
    if (!part) return 0;
    const share = part.tissues.reduce((a, t) => a + t.share, 0);
    return share > 0 ? Math.pow(share, 2 / 3) : 0;
  }

  /**
   * The share of the body's EXTERNAL surface `partKey` carries, summing
   * to 1 across the exterior parts (Meeh's law over the shares). An
   * interior part answers 0 — call {@link partArea} for an organ.
   */
  public getPartSurfaceFraction(partKey: string): number {
    if (this.surfaceFractions === null) {
      const areas = new Map<string, number>();
      let total = 0;
      for (const part of this.parts) {
        if (this.isInterior(part.key)) continue;
        const area = this.partArea(part.key);
        if (!(area > 0)) continue;
        total += area;
        areas.set(part.key, area);
      }
      const out = new Map<string, number>();
      if (total > 0) for (const [k, a] of areas) out.set(k, a / total);
      this.surfaceFractions = out;
    }
    return this.surfaceFractions.get(partKey) ?? 0;
  }

  /** The interior parts directly under `partKey`, largest cross-section first (the depth ladder). */
  public interiorChildrenOf(partKey: string): readonly BodyPart[] {
    return this.parts
      .filter((p) => p.parent === partKey && this.isInterior(p.key))
      .slice()
      .sort((a, b) => this.partArea(b.key) - this.partArea(a.key));
  }

  // ---- tissues ----

  /** Every (part, tissue) as a share of the whole body; sums to 1 (empty for a weightless body). */
  public resolvedTissues(): readonly ResolvedTissue[] {
    if (this.tissues === null) {
      const raw: ResolvedTissue[] = [];
      let total = 0;
      for (const part of this.parts) {
        for (const t of part.tissues) {
          raw.push({ partKey: part.key, tissuePath: t.tissuePath, share: t.share });
          total += t.share;
        }
      }
      this.tissues = total > 0 ? raw.map((t) => ({ ...t, share: t.share / total })) : [];
    }
    return this.tissues;
  }

  /** This body's share of mass made up of `tissuePath`, over all parts. */
  public tissueShareOf(tissuePath: string): number {
    let sum = 0;
    for (const t of this.resolvedTissues()) if (t.tissuePath === tissuePath) sum += t.share;
    return sum;
  }

  /** The part keys carrying `tissuePath`. */
  public partsCarrying(tissuePath: string): string[] {
    const out: string[] = [];
    for (const t of this.resolvedTissues()) {
      if (t.tissuePath === tissuePath && !out.includes(t.partKey)) out.push(t.partKey);
    }
    return out;
  }

  /** Every material path this body cites — tissues and every integument layer — once each. */
  public tissuePaths(): string[] {
    const out = new Set<string>();
    for (const p of this.parts) {
      for (const t of p.tissues) out.add(t.tissuePath);
      for (const layer of [p.integument?.skin, p.integument?.under, p.integument?.coat]) if (layer) out.add(layer.material);
    }
    return [...out];
  }

  /**
   * ⭐⭐ **What this body leaves as a carcass** (organism-biology D5): every
   * row its present parts' materials come off as, in body order and each
   * once, the OUTSIDE first (a hide, feathers, down — the first lines of
   * every carcass), then the tissues. Each line carries the materials that
   * named it and the present parts that carry them.
   *
   * `present` filters the parts (a corpse's missing ones, a severed
   * subtree's complement); absent = every part.
   */
  public yieldLines(present?: (partKey: string) => boolean): YieldLine[] {
    const outside = new Map<string, YieldLine>();
    const inside = new Map<string, YieldLine>();
    const add = (into: Map<string, YieldLine>, row: string, tissue: string, partKey: string, integument: boolean): void => {
      const line = into.get(row) ?? { row, tissues: [], parts: [], integument };
      if (!line.tissues.includes(tissue)) line.tissues.push(tissue);
      if (!line.parts.includes(partKey)) line.parts.push(partKey);
      into.set(row, line);
    };
    for (const part of this.parts) {
      if (present && !present(part.key)) continue;
      const map = part.comesOffAs ?? [];
      if (!map.length) continue;
      for (const layer of [part.integument?.skin, part.integument?.under, part.integument?.coat]) {
        if (!layer) continue;
        for (const e of map) if (e.tissue === layer.material) add(outside, e.cut, layer.material, part.key, true);
      }
      for (const t of part.tissues) {
        if (t.integument) continue;
        for (const e of map) if (e.tissue === t.tissuePath) add(inside, e.cut, t.tissuePath, part.key, false);
      }
    }
    // A row named from both sides is the outside's (it comes off first).
    for (const row of outside.keys()) inside.delete(row);
    return [...outside.values(), ...inside.values()];
  }

  /**
   * ⭐ What a coat or underlayer of `material` weighs on a body of
   * `liveKg` (D5): it has depth, not a tissue share. The body's surface by
   * Meeh's law (`0.1 · M^(2/3)` m²), times each present exterior part's
   * share of it, times the layer's depth and its FIBRE density (the loft
   * is air). `densityOf` reads the material (this class imports nothing).
   */
  public coatMassKg(
    material: string,
    liveKg: number,
    densityOf: (path: string) => number,
    present?: (partKey: string) => boolean,
  ): number {
    const area = 0.1 * Math.pow(Math.max(0, liveKg), 2 / 3);
    const density = densityOf(material);
    let kg = 0;
    for (const part of this.parts) {
      if (present && !present(part.key)) continue;
      for (const layer of [part.integument?.under, part.integument?.coat]) {
        if (!layer || layer.material !== material || !layer.depthM) continue;
        kg += this.getPartSurfaceFraction(part.key) * area * layer.depthM * density * (1 - (layer.loft ?? 0));
      }
    }
    return kg;
  }

  /** This body's share of `tissuePath` over the parts `present` admits (all, absent a filter). */
  public tissueShareAmong(tissuePath: string, present?: (partKey: string) => boolean): number {
    let sum = 0;
    for (const t of this.resolvedTissues()) {
      if (t.tissuePath === tissuePath && (!present || present(t.partKey))) sum += t.share;
    }
    return sum;
  }

  /**
   * ⭐ How deep a coat layer stands at this daylength (D7): `cycle.thick`
   * inside its band (a winter coat), 1 outside it or with no cycle. Pure.
   */
  public coatFactor(layer: IntegumentLayer, dayFraction: number | null): number {
    if (!layer.cycle || dayFraction === null) return 1;
    return new DaylengthBand(layer.cycle).contains(dayFraction) ? layer.cycle.thick : 1;
  }

  /** ⭐ A part's outside (D3), or null for an interior or bare part. */
  public integumentAt(partKey: string): Integument | null {
    return this.byKey.get(partKey)?.integument ?? null;
  }

  // ---- slots ----

  /** Slots located at (attached to / enabled by) the part. */
  public getSlotsAt(partKey: string): readonly SlotSpec[] {
    return this.slots.filter((s) => s.bodyPart === partKey);
  }

  /** Slots whose occupant covers the part. */
  public getSlotsCovering(partKey: string): readonly SlotSpec[] {
    return this.slots.filter((s) => (s.covers ?? []).includes(partKey));
  }

  // ---- senses, gaits, breathing (proxied from the plan until derived) ----

  /** The sense organs this body declares (the plan's ports until W9 derives them). */
  public getSensoryPorts(): readonly SensoryPort[] {
    return this.sensoryPorts;
  }

  /** The media one sense organ works in — its own, or its kind's default. */
  public portMedia(port: SensoryPort): readonly string[] {
    return port.media ?? PORT_MEDIA_DEFAULT[port.modality] ?? ['air', 'water'];
  }

  /** ⭐ The senses this body has that work in `medium`. */
  public modalitiesIn(medium: string): SenseChannel[] {
    return Array.from(new Set(
      this.sensoryPorts.filter((p) => this.portMedia(p).includes(medium)).map((p) => p.modality),
    ));
  }

  /** The deduped sense channels this body has, in declaration order. */
  public modalities(): SenseChannel[] {
    return Array.from(new Set(this.sensoryPorts.map((p) => p.modality)));
  }

  /**
   * ⭐ The ways this body can move (W3): every gait its parts provide, in
   * part order — a wing gives `fly`, a tail `swim`, legs `walk`. A body
   * with no limbs has none (a plant).
   */
  public gaits(): readonly string[] {
    return [...new Set(this.parts.flatMap((p) => p.gait ?? []))];
  }

  // ---- what a part is for ----

  /** ⭐ Every gland on this body and the tap it makes (D2), in part order. */
  public producers(): readonly { partKey: string; spec: TapSpec }[] {
    return this.parts.flatMap((p) => (p.produces ?? []).map((spec) => ({ partKey: p.key, spec })));
  }

  /** What fills a part (D12): `solid` unless its module says otherwise. */
  public fillAt(partKey: string): BodyFill {
    return this.byKey.get(partKey)?.fill ?? 'solid';
  }

  /** The ways this body breathes (the plan's until W8 derives them from organs). */
  public breathing(): readonly BreathingSpec[] {
    return this.breathingSpecs;
  }

  /** The media this body breathes freely — the intake-1 specs. */
  public breathableMedia(): readonly string[] {
    return this.breathingSpecs.filter((b) => b.intake >= 1).map((b) => b.medium);
  }
}
