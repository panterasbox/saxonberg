/**
 * ContaminableMixin — ⭐⭐ **the second population, and the one no sense
 * reports.**
 *
 * {@link FreshnessMixin} models the spoilage flora: it grows on its own,
 * it smells, and by the time it can hurt you the food has been telling you
 * so for a while. *Spoilage is a clock.* This is the other thing that
 * lives in food, and it is a different kind of fact:
 *
 * > **Contamination is an EVENT.** Nothing here ever appears on its own.
 * > A load is `{}` until something *put* it there — an animal opened, a
 * > dirty board, a knife that touched a carcass and then a vegetable. That
 * > is what keeps an invisible hazard from being a tax on existing, and it
 * > is asserted as an invariant, not as a policy: the reconcile returns
 * > immediately on an empty map and there is no seeding path anywhere in
 * > this file.
 *
 * **There is no reading, no smell, no taste and no tell.** No augmenter,
 * no band, no phrase — deliberately, and the absence is the feature. What
 * keeps that fair is that the *risk* is legible even though the *hazard*
 * is not: you can see that the meat is raw, that the board was used for
 * gutting, that the stew has been out since morning. *Invisible to the
 * senses, knowable by procedure.*
 *
 * ## Why its own mixin, and not two more fields on `FreshnessMixin`
 *
 * Because the host sets are different and the difference is the point.
 * Spoilage's host is `Provision` — food that rots — and `lint:perishable`
 * exists to keep it there. A pathogen load has to live on **a board, a
 * knife, a vessel and a hand**, none of which are food and none of which
 * rot. Hanging it off the food gauge would have meant either widening
 * `FreshnessMixin` onto every implement in the kitchen or guarding the
 * pathogen half against its own host set — and *a method that guards
 * against part of its own host set is the host set being wrong.*
 *
 * ## The population's own law
 *
 * Same shape as the spoilage law, with every constant coming from the
 * **`Condition` row** rather than a dial, because these organisms differ
 * from each other in exactly the ways that matter:
 *
 *   - a floor and a ceiling on temperature, and its own Arrhenius steepness;
 *   - its own water-activity floor — which is why *Staph aureus* is the
 *     ham organism: it grows where nothing else can, so curing alone is
 *     not an answer to it;
 *   - ⭐ **a kill that is a RATE, not a threshold.** Hot enough is not a
 *     line you cross, it is a rate you hold: a long hold at a lower heat
 *     and a brief moment at a higher one achieve the same kill;
 *   - ⭐ **a survival fraction**, for the spore-formers. Their kill has a
 *     FLOOR: boiling reduces them, it never removes them. As the food
 *     cools back under `germinationK` the survivors' rate turns positive
 *     again and they grow — which is why a properly cooked dish left out
 *     overnight is the most common real food poisoning there is, and the
 *     lesson nobody believes until it happens to them;
 *   - ⭐ **a reach**: it either *infects* you (it grows in the host) or it
 *     *intoxicates* you (it already made a poison, and killing it does
 *     not unmake that). Two of the five ship as the second kind, and one
 *     of those is both.
 *
 * See [docs/subsystems/spoilage.md].
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type Material from './Material';
import type Condition from '../../platform/idea/Condition';
import type { ToxinTag } from '../metabolism/Metabolic';
import type { BulkPayload, BulkSlot } from '../bulk/Bulkable';
import type { CureState } from './Cured';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { TemplatePathPrefixes } from '../paths';
import { Freshness } from './Freshness';

/**
 * How an ingested population reaches the eater.
 *
 * ⚠ **They are not alternatives to spore-forming, and a build that treats
 * them as a two-way choice cannot author the shipped roster.**
 * *C. botulinum* is a spore-former whose survivors germinate as food cools
 * and *then* produce a toxin: both mechanisms, on one row, neither a
 * special case of the other.
 */
export type PathogenReach = 'infect' | 'intoxicate';

/**
 * The per-population constants, authored on a `Condition` row beside
 * `toxinBehavior`. Every number here is a property of the organism, which
 * is why none of them is a dial.
 */
export interface PathogenBehavior {
  /** How it reaches you: grows in the host, or poisoned the food already. */
  reach: PathogenReach;
  /** μ_max (per game-hour) at the reference temperature. */
  muMaxPerHour: number;
  /** Arrhenius activation energy (J/mol) — how steeply it answers to warmth. */
  activationEnergy: number;
  /** Reference temperature (K) where `f_T = 1`. */
  referenceK: number;
  /** At/below this (K) it does not grow. */
  minGrowthK: number;
  /** At/above this (K) it dies instead of growing. */
  killK: number;
  /**
   * Between {@link germinationK} and {@link killK} it neither grows nor
   * dies — the lag band a cooling dish passes through. Defaults to
   * `killK` (no lag).
   */
  germinationK?: number;
  /** Death rate (per game-hour) at exactly `killK`. */
  killRatePerHour: number;
  /**
   * Activation energy (J/mol) of the DEATH curve — what makes the kill a
   * rate rather than a threshold. Higher = a steeper reward for more heat.
   */
  killActivationEnergy: number;
  /**
   * ⭐ Spore-former: the fraction of the population a kill can never take
   * below. `0` (the default) = no spores, cooking removes it entirely.
   */
  killSurvivalFraction?: number;
  /** Water activity at/below which it cannot grow. */
  awFloor: number;
  /** The load one contaminating event deposits. */
  inoculum: number;
  /** Load at/above which an ingested serving actually does something. */
  infectiousDose: number;
  /**
   * ⭐⭐ **The senses it answers to — and it ships EMPTY.** The field
   * exists so the absence is a stated fact rather than a missing feature:
   * a population that authored `['smell']` would be renderable, and none
   * of the shipped roster does.
   */
  channels: string[];
  /** The formed toxin an `intoxicate` population deposits in the food. */
  toxin?: {
    /** The `Condition` key of the toxin (its own row, with bands). */
    type: string;
    /** mg deposited per serving at a full load; scaled by the load. */
    scaleMg: number;
    /**
     * Heat-labile above this (K) — the working destroys the dose. Absent
     * ⇒ the poison survives anything a kitchen does to it, which is the
     * whole difference between staph and botulism.
     */
    labileAtK?: number;
  };
  /** In-host growth rate (per game-hour) once it has infected you (W4). */
  inHostPerHour?: number;
  /** Game-seconds between the meal and the first symptom (W4). */
  incubationSec?: number;
}

/** Per-instance state: pathogen key → load `[0, 1]`. Sparse: `{}` is clean. */
export type PathogenLoads = Record<string, number>;

const CONTAMINATION_DEFAULTS = {
  SECONDS_PER_HOUR: 3600,
  GAS_CONSTANT: 8.314,
  AMBIENT_K: 293,
} as const;

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * ⭐ **The contamination half of the blend payload, declared here.** Same
 * move `Freshness` and `Cure` make: the payload has to carry the state,
 * and the payload's own module has no business knowing what a pathogen is.
 */
declare module '../bulk/Bulkable' {
  interface BulkPayload {
    /** Pathogen key → load. Absent ⇒ nothing was ever put there. */
    pathogens?: PathogenLoads;
    /** Game-seconds the `pathogens` map was last reconciled. */
    pathogenStamp?: number;
  }
}

/**
 * The contamination arithmetic, in ONE place — the {@link Freshness}
 * shape, for the same reason: a knife, a carcass and a bowl of stew must
 * not grow the same organism by different rules.
 *
 * ⚠ Pure over its arguments except the two slot methods at the end, which
 * read and write a `BulkSlot`'s payload — the same documented exception,
 * for the same reason.
 */
export class Contamination {
  /** The authored behavior for a pathogen key, or `null` if none is warmed. */
  public static behaviorOf(key: string): PathogenBehavior | null {
    if (!key) return null;
    const row = StuffApi.findByTemplatePath<Condition>(
      TemplatePathPrefixes.pathogenCondition + key,
    );
    return row?.getPathogenBehavior() ?? null;
  }

  /**
   * The specific growth rate (per game-hour). Negative above the kill
   * temperature (the population is dying); zero in the lag band, below the
   * growth floor, and under the organism's own water-activity floor.
   */
  public static growthRate(
    behavior: PathogenBehavior,
    tempK: number,
    aw: number,
  ): number {
    const R = CONTAMINATION_DEFAULTS.GAS_CONSTANT;
    if (tempK >= behavior.killK) {
      // ⭐ The kill is a RATE and it answers to temperature. That is the
      // whole of requirement D5: a long hold at a lower heat and a brief
      // moment at a higher one achieve the same kill, and a lazy
      // warm-through achieves neither.
      const steepness =
        (behavior.killActivationEnergy / R) * (1 / behavior.killK - 1 / tempK);
      return -behavior.killRatePerHour * Math.exp(steepness);
    }
    const ceiling = behavior.germinationK ?? behavior.killK;
    if (tempK >= ceiling) return 0; // the lag band: neither growing nor dying
    if (tempK <= behavior.minGrowthK) return 0;
    if (aw <= behavior.awFloor) return 0;
    const fT = Math.exp(
      (-behavior.activationEnergy / R) * (1 / tempK - 1 / behavior.referenceK),
    );
    return behavior.muMaxPerHour * fT;
  }

  /**
   * Integrate one population forward over `elapsedS` game-seconds.
   * Closed-form: logistic while the rate is positive, exponential death
   * while it is negative — **floored at the spore survival fraction**, so
   * a spore-former can be reduced by cooking and never removed by it.
   *
   * ⚠ Unlike the spoilage flora this NEVER seeds from an inoculum. A load
   * of zero integrates to zero for ever, at any temperature, over any
   * span. That is criterion 9, and it is arithmetic rather than a guard.
   */
  public static advance(
    load: number,
    elapsedS: number,
    behavior: PathogenBehavior,
    tempK: number,
    aw: number,
  ): number {
    const l0 = clamp01(load);
    if (l0 <= 0) return 0; // nothing to grow: contamination is an event
    if (!(elapsedS > 0)) return l0;
    const mu = Contamination.growthRate(behavior, tempK, aw);
    if (mu === 0) return l0;
    const hours = elapsedS / CONTAMINATION_DEFAULTS.SECONDS_PER_HOUR;

    if (mu < 0) {
      const floor = clamp01(behavior.killSurvivalFraction ?? 0) * l0;
      const killed = l0 * Math.exp(mu * hours);
      const survived = Math.max(killed, floor);
      return survived < 1e-9 ? 0 : survived;
    }
    if (l0 >= 1) return 1;
    const g = Math.exp(mu * hours);
    if (!Number.isFinite(g)) return 1;
    return clamp01((l0 * g) / (1 - l0 + l0 * g));
  }

  /** Integrate every population in a map over one span. */
  public static advanceAll(
    loads: PathogenLoads,
    elapsedS: number,
    tempK: number,
    aw: number,
  ): PathogenLoads {
    const out: PathogenLoads = {};
    for (const [key, load] of Object.entries(loads)) {
      const behavior = Contamination.behaviorOf(key);
      // ⚠ An unwarmed row leaves the load ALONE rather than dropping it.
      // A catalogue that has not warmed yet must never silently clean a
      // contaminated carcass — the failure mode would be invisible and
      // would read as generosity.
      const next = behavior
        ? Contamination.advance(load, elapsedS, behavior, tempK, aw)
        : clamp01(load);
      if (next > 0) out[key] = next;
    }
    return out;
  }

  /**
   * Deposit a contaminating event's inoculum, scaled by how badly it went
   * (`severity` in `[0, 1]` — an unskilled butcher's gut spillage is the
   * canonical 1). Adds to whatever was already there; never seeds a key
   * whose behavior is unauthored.
   */
  public static contaminate(
    loads: PathogenLoads,
    key: string,
    severity = 1,
  ): PathogenLoads {
    const behavior = Contamination.behaviorOf(key);
    if (!behavior) return loads;
    const added = clamp01(behavior.inoculum * clamp01(severity));
    if (added <= 0) return loads;
    return { ...loads, [key]: clamp01((loads[key] ?? 0) + added) };
  }

  /** Blend two load maps by mass — the pour rule, twin of the spoilage one. */
  public static blend(
    a: PathogenLoads,
    amountA: number,
    b: PathogenLoads,
    amountB: number,
  ): PathogenLoads {
    // ⚠ Tolerate a missing map. A DESTROYED host is an inert proxy whose
    // every call no-ops to `undefined`, so a caller reading a load off an
    // object that has just been consumed hands us nothing — and throwing
    // `Cannot convert undefined or null to object` from deep inside a
    // blend is a poor way to learn that. The caller's ordering is still
    // the real fix; this is the seatbelt.
    a = a ?? {};
    b = b ?? {};
    const total = amountA + amountB;
    if (!(total > 0)) return { ...a };
    const out: PathogenLoads = {};
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const blended =
        (clamp01(a[key] ?? 0) * amountA + clamp01(b[key] ?? 0) * amountB) / total;
      if (blended > 0) out[key] = clamp01(blended);
    }
    return out;
  }

  /**
   * ⭐⭐ **What a working's heat left alive** — the craft's half of the
   * kill, and the twin of {@link Freshness.killOver}.
   *
   * Per population, because they differ in exactly the ways that matter:
   * a working under an organism's own `killK` does nothing to it at all,
   * and a spore-former's survivors are floored by `killSurvivalFraction`
   * however hard you boil.
   *
   * ⭐ `holdS === 0` means the recipe authors no hold, so the working is
   * taken as sufficient: everything dies except the spores. That is the
   * shape requirement D11 needs — *a properly cooked dish left out
   * overnight can make you ill* — and it falls out rather than being a
   * special case.
   */
  public static killOver(
    loads: PathogenLoads,
    tempK: number,
    holdS: number,
    aw: number,
  ): PathogenLoads {
    if (Contamination.isClean(loads) || !(tempK > 0)) return { ...loads };
    const out: PathogenLoads = {};
    for (const [key, load] of Object.entries(loads)) {
      const behavior = Contamination.behaviorOf(key);
      if (!behavior || tempK < behavior.killK) {
        // Not hot enough for THIS organism (or nothing warmed to say):
        // the load rides straight through. A working that kills one
        // population and not another is the honest answer.
        if (load > 0) out[key] = clamp01(load);
        continue;
      }
      const next =
        holdS > 0
          ? Contamination.advance(load, holdS, behavior, tempK, aw)
          : clamp01(load) * clamp01(behavior.killSurvivalFraction ?? 0);
      if (next > 1e-9) out[key] = next;
    }
    return out;
  }

  /** Blend a whole list of contributions by weight (the craft's inputs). */
  public static blendAll(
    parts: readonly { loads: PathogenLoads; weight: number }[],
  ): PathogenLoads {
    let acc: PathogenLoads = {};
    let accWeight = 0;
    for (const part of parts) {
      if (part.weight <= 0 || !part.loads) continue;
      acc = Contamination.blend(acc, accWeight, part.loads, part.weight);
      accWeight += part.weight;
    }
    return acc;
  }

  /** Whether any population is present at all. */
  public static isClean(loads: PathogenLoads | null | undefined): boolean {
    if (!loads) return true;
    for (const v of Object.values(loads)) if (v > 0) return false;
    return true;
  }

  /**
   * ⭐⭐ **The toxins an `intoxicate` population has already made** — folded
   * at the READ, exactly as the spoilage dose is, and never stored.
   *
   * `cookedAtK` is what separates the two poisons the roster ships: staph's
   * toxin authors no `labileAtK` and survives the pot, botulinum's does and
   * is destroyed by it. *Boiling fixes botulism and not staph* is the whole
   * distinction, and it is two authored numbers.
   */
  public static formedToxins(
    loads: PathogenLoads,
    cookedAtK = 0,
  ): ToxinTag[] {
    const out: ToxinTag[] = [];
    for (const [key, load] of Object.entries(loads)) {
      const behavior = Contamination.behaviorOf(key);
      if (!behavior || behavior.reach !== 'intoxicate' || !behavior.toxin) {
        continue;
      }
      const toxin = behavior.toxin;
      if (clamp01(load) < behavior.infectiousDose) continue;
      const amount = toxin.scaleMg * clamp01(load);
      if (amount <= 0) continue;
      const tag: ToxinTag = { type: toxin.type, amount };
      if (toxin.labileAtK !== undefined) tag.labileAtK = toxin.labileAtK;
      out.push(tag);
    }
    return out;
  }

  /**
   * The payload an ingest should carry, with the pathogen loads on it and
   * any formed toxin folded in. The one place the contamination half
   * crosses into a mouth.
   */
  public static withLoads(
    payload: BulkPayload | null,
    loads: PathogenLoads,
  ): BulkPayload | null {
    if (Contamination.isClean(loads)) return payload;
    const base: BulkPayload = payload ?? {};
    const formed = Contamination.formedToxins(loads, base.cookedAtK ?? 0);
    const next: BulkPayload = { ...base, pathogens: { ...loads } };
    if (formed.length > 0) {
      const carried = (base.formedToxins ?? []).map((t) => ({ ...t }));
      for (const tox of formed) {
        const existing = carried.find((t) => t.type === tox.type);
        if (existing) existing.amount += tox.amount;
        else carried.push({ ...tox });
      }
      next.formedToxins = carried;
    }
    return next;
  }

  /** The temperature a gauge on this host reads (the spoilage rule). */
  public static hostTemperatureK(host: Stuff): number {
    if (MixinApi.isThermal(host)) {
      try {
        return host.getTemperature().rawValue();
      } catch {
        /* fall through */
      }
    }
    return CONTAMINATION_DEFAULTS.AMBIENT_K;
  }

  /** The effective water activity of a host's matter (material × cure). */
  public static hostWaterActivity(host: Stuff): number {
    const material: Material | null = MixinApi.isTangible(host)
      ? host.getMaterial()
      : null;
    if (!material) return 1;
    const cure: CureState | null = MixinApi.isCured(host)
      ? host.getCureState()
      : null;
    return Freshness.waterActivityOf(material, cure);
  }

  // ───────────────────── the slot seam (impure) ─────────────────────

  /**
   * A blend's pathogen loads, **reconciled on read**.
   *
   * ⭐ **Sparse by construction and it never seeds.** A slot whose matter
   * nobody contaminated has no `pathogens` record and never gets one here.
   * `Freshness.loadOf` lazily seeds a gauge because spoilage IS a clock;
   * this one must not, because contamination is an event.
   */
  public static loadsFor(slot: BulkSlot): PathogenLoads {
    const payload = slot.getPayload();
    const loads = payload?.pathogens;
    if (!loads || !payload || Contamination.isClean(loads)) return {};
    const nowS = Freshness.nowSeconds();
    if (nowS === null) return { ...loads };
    const stamp = payload.pathogenStamp ?? 0;
    if (stamp === 0 || nowS <= stamp) {
      slot.setPayload({ ...payload, pathogenStamp: nowS });
      return { ...loads };
    }
    const holder = slot.getHolder();
    const next = Contamination.advanceAll(
      loads,
      nowS - stamp,
      Contamination.hostTemperatureK(holder),
      Contamination.slotWaterActivity(slot),
    );
    slot.setPayload({ ...payload, pathogens: next, pathogenStamp: nowS });
    return next;
  }

  /** Stamp a blend's loads outright — the craft's kill, the pour's blend. */
  public static stampLoads(slot: BulkSlot, loads: PathogenLoads): void {
    if (slot.getMaterial() === null) return;
    const payload = slot.getPayload() ?? {};
    if (Contamination.isClean(loads)) {
      if (payload.pathogens === undefined) return;
      const { pathogens: _p, pathogenStamp: _s, ...rest } = payload;
      slot.setPayload(rest);
      return;
    }
    slot.setPayload({
      ...payload,
      pathogens: { ...loads },
      pathogenStamp: Freshness.nowSeconds() ?? 0,
    });
  }

  /** The effective water activity of what a slot holds. */
  public static slotWaterActivity(slot: BulkSlot): number {
    const material = slot.getMaterial();
    if (!material) return 1;
    const payload = slot.getPayload();
    const cure = payload?.cure ?? null;
    return Freshness.waterActivityOf(material, cure);
  }
}

export interface Contaminable {
  /** The current pathogen loads (reconciles on read). `{}` when clean. */
  getPathogenLoads(): PathogenLoads;
  /** The load of one population, `0` when absent. */
  getPathogenLoad(key: string): number;
  /** Set the whole map outright — the kill step and the test seam. */
  setPathogenLoads(loads: PathogenLoads): void;
  /** Deposit a contaminating event's inoculum. THE only way a load starts. */
  contaminate(key: string, severity?: number): void;
  /** Move whatever this carries onto another surface (contact transfer). */
  transferContaminationTo(other: Stuff, fraction?: number): void;
  /** Clear every population — what `wash` does to an implement. */
  clearContamination(): void;
  /** Reconcile the elapsed growth / die-off (sync). */
  reconcileContamination(): void;

  // Public so the Hydrator can reflect into them.
  _pathogenLoads: PathogenLoads;
  pathogenClockStamp: number;
}

export function ContaminableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class ContaminableMixin extends Base implements Contaminable {
    static _mixinName = 'ContaminableMixin';

    static fieldMeta: FieldMeta = {
      _pathogenLoads: { persistent: true },
      pathogenClockStamp: { persistent: true },
    };

    /**
     * ⚠⚠ **NO `markupAugmenters`, and the absence is the design.** A
     * contaminated thing is indistinguishable from a clean one by `look`,
     * `smell` and `taste` — requirement D4. Anything appended here would
     * turn the build's whole point into a gauge.
     */

    /** Pathogen key → load. `{}` = clean, and clean is the only default. */
    public _pathogenLoads: PathogenLoads = {};
    /** Game-seconds of the last reconcile; `0` = never contaminated. */
    public pathogenClockStamp = 0;

    private _reconcilingContamination = false;

    // ---------- reads ----------

    public getPathogenLoads(): PathogenLoads {
      if (!this._reconcilingContamination) this.reconcileContamination();
      return { ...this._pathogenLoads };
    }

    public getPathogenLoad(key: string): number {
      return this.getPathogenLoads()[key] ?? 0;
    }

    // ---------- writes ----------

    public setPathogenLoads(loads: PathogenLoads): void {
      const next: PathogenLoads = {};
      for (const [key, load] of Object.entries(loads)) {
        const v = clamp01(load);
        if (v > 0) next[key] = v;
      }
      this._pathogenLoads = next;
      if (Object.keys(next).length === 0) {
        // Back to clean: drop the stamp too, so a washed knife is
        // byte-identical to one that was never used.
        this.pathogenClockStamp = 0;
        return;
      }
      const nowS = Freshness.nowSeconds();
      if (nowS !== null) this.pathogenClockStamp = nowS;
    }

    public contaminate(key: string, severity = 1): void {
      this.setPathogenLoads(
        Contamination.contaminate(this.getPathogenLoads(), key, severity),
      );
    }

    /**
     * ⭐ **The route.** A surface that touched something contaminated
     * carries it to whatever it touches next, and `fraction` is how much
     * of it makes the trip. This is the mechanism behind *butcher with a
     * dirty knife, then chop vegetables with it* — and behind `wash`
     * mattering at all.
     *
     * The source keeps what it had: wiping a knife on a carrot does not
     * clean the knife.
     */
    public transferContaminationTo(other: Stuff, fraction = 1): void {
      const mine = this.getPathogenLoads();
      if (Contamination.isClean(mine)) return;
      if (!MixinApi.isContaminable(other)) return;
      const theirs = other.getPathogenLoads();
      const moved: PathogenLoads = { ...theirs };
      for (const [key, load] of Object.entries(mine)) {
        const share = clamp01(load * clamp01(fraction));
        if (share <= 0) continue;
        moved[key] = clamp01((moved[key] ?? 0) + share);
      }
      other.setPathogenLoads(moved);
    }

    public clearContamination(): void {
      this.setPathogenLoads({});
    }

    // ---------- reconcile-on-read ----------

    /**
     * ⭐⭐ **The empty-map check comes FIRST, and it is both guarantees at
     * once.** A clean thing writes nothing (the sparse-storage rule that
     * `FreshnessMixin` learned by stamping a clock onto every anvil
     * anybody looked at) — and, more importantly, a clean thing can never
     * become dirty by the passage of time. There is no seeding path in
     * this method, and there is not meant to be one.
     */
    public reconcileContamination(): void {
      if (this._reconcilingContamination) return;
      if (Object.keys(this._pathogenLoads).length === 0) return;

      const nowS = Freshness.nowSeconds();
      if (nowS === null) return;
      if (this.pathogenClockStamp === 0) {
        this.pathogenClockStamp = nowS;
        return;
      }
      const elapsed = nowS - this.pathogenClockStamp;
      if (elapsed <= 0) {
        this.pathogenClockStamp = nowS;
        return;
      }

      this._reconcilingContamination = true;
      try {
        const self = this as unknown as Stuff;
        this._pathogenLoads = Contamination.advanceAll(
          this._pathogenLoads,
          elapsed,
          Contamination.hostTemperatureK(self),
          Contamination.hostWaterActivity(self),
        );
        this.pathogenClockStamp = nowS;
      } finally {
        this._reconcilingContamination = false;
      }
    }
  };
}
