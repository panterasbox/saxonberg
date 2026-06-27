/**
 * CraftedMixin — the per-instance **maker's mark** stamped at craft-resolve.
 *
 * Because you can't read quality off an object, *who made it* is the signal
 * (crafting spine #4: provenance carries worth). A crafted thing carries an
 * instance-level mark — maker, the quality {@link Grade}, the recipe, and
 * when it was made — distinct from the template-authorship ledger
 * (`ProvenanceApi`, keyed on the shared *output template* path; every martini
 * shares one). This mark is the **per-instance overlay** the authorship
 * ledger can't express, and the layer a future corpos / maker's-mark-at-
 * corporate-scale build extends.
 *
 * Composes {@link GradedMixin} so a crafted output is graded by the same
 * surface as a graded input — `getGrade()` is uniform across the pipeline.
 *
 * **Un-spoofable.** The setters are ordinary (the clone Hydrator must reach
 * them, the verdict renderer reads them), but the *maker value* is never
 * user-supplied: the only caller that stamps it is `CraftingLogic`, which
 * derives the maker from the execution context (the giver) or resolves it
 * from world state (the fulfilling bartender) — never from the wire.
 */

import type { MixinConstructor } from '../mixin';
import { GradedMixin, type Graded } from './Graded';
import { StuffApi } from '../../api/stuff';
import type { Stuff } from '../stuff/Stuff';

/** Grade-keyed verdict prose (v1 uniform — no per-instance scatter yet). */
const VERDICT_PROSE: Record<string, string> = {
  poor: 'cloudy and carelessly put together',
  fair: 'honestly made, if unremarkable',
  fine: 'clean, balanced, and well made',
  exceptional: 'expertly balanced — a pleasure to behold',
  masterful: 'flawless, the work of a true hand',
};

/**
 * Resolve a maker templatePath to a display name, or null if unresolvable.
 * Module-private (not a `#` method): mixin methods dispatch through the
 * call-security proxy, where `this.#x` would throw.
 */
function resolveMakerName(maker: string): string | null {
  if (!maker) return null;
  const stuff = StuffApi.findByTemplatePath<Stuff>(maker);
  if (!stuff) return null;
  const named = stuff as unknown as { getPresentation?: () => string };
  if (typeof named.getPresentation === 'function') {
    const name = named.getPresentation();
    if (name) return name;
  }
  return null;
}

export interface CraftedStamp {
  maker: string;
  grade: import('./Grade').Grade;
  recipe: string;
  craftedAt: number;
}

export interface Crafted extends Graded {
  /** The maker's durable templatePath (Pattern A path-string ref). */
  getMaker(): string;
  setMaker(value: string): void;
  /** The recipe id this was made from. */
  getRecipe(): string;
  setRecipe(value: string): void;
  /** Game-clock seconds at which it was crafted. */
  getCraftedAt(): number;
  setCraftedAt(value: number): void;
  /** Stamp all four marks at once (the one mutator CraftingLogic calls). */
  stamp(spec: CraftedStamp): void;
  /**
   * The DF-style quality verdict: a band-word headline + the descriptive
   * *why* + maker attribution. Plain prose, **never a number**. v1 renders
   * uniform prose at a fixed control level.
   */
  renderVerdict(): string;
}

export function CraftedMixin<TBase extends MixinConstructor>(Base: TBase) {
  // extends GradedMixin(Base): the grade surface (getGrade/setGrade/…) is
  // present at runtime from the inner mixin but TS doesn't surface an
  // anonymous mixin base's members on `this`, so we cast for internal grade
  // calls (the AdornableMixin-extends-SlottedMixin precedent) and don't
  // `implements Crafted` here — the `Crafted` interface is the narrowing
  // contract (MixinApi.isCrafted), satisfied structurally at runtime.
  return class CraftedMixin extends GradedMixin(Base) {
    static _mixinName = 'CraftedMixin';

    static persistentFields = ['maker', 'recipe', 'craftedAt'];

    /** The maker's durable templatePath; empty until stamped. */
    public maker: string = '';
    /** The recipe id; empty until stamped. */
    public recipe: string = '';
    /** Game-clock seconds of the craft; 0 until stamped. */
    public craftedAt: number = 0;

    getMaker(): string {
      return this.maker;
    }
    setMaker(value: string): void {
      this.maker = value;
    }

    getRecipe(): string {
      return this.recipe;
    }
    setRecipe(value: string): void {
      this.recipe = value;
    }

    getCraftedAt(): number {
      return this.craftedAt;
    }
    setCraftedAt(value: number): void {
      this.craftedAt = value;
    }

    stamp(spec: CraftedStamp): void {
      this.maker = spec.maker;
      (this as unknown as Graded).setGrade(spec.grade);
      this.recipe = spec.recipe;
      this.craftedAt = spec.craftedAt;
    }

    renderVerdict(): string {
      const band = (this as unknown as Graded).getGrade().renderBandWord();
      const why = VERDICT_PROSE[band] ?? VERDICT_PROSE.fair!;
      let line = `It looks ${band}: ${why}.`;
      const makerName = resolveMakerName(this.maker);
      if (makerName) line += ` Made by ${makerName}.`;
      return line;
    }
  };
}
