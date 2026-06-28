/**
 * ManualBuildMixin — the **vessel-as-buffer** for a step-by-step craft.
 *
 * A build vessel (the cocktail shaker / mixing glass) accumulates graded
 * contributions across the manual-build verbs (`pour` / `add`), records
 * how it was worked (`stir` → stirred, `shake` → shaken), and at the
 * terminal step (`strain`) hands the accumulated buffer to
 * `CraftingApi.mintFromBuild`, which reverse-matches it to a recipe and
 * mints the graded, maker's-marked drink — reusing the **one** quality
 * model (`Grade` + `CraftedMixin.stamp`), never a second.
 *
 * The buffer is the *logical* record of the build. Each contribution is
 * banked here when its pour **completes**; the physical matter is debited
 * straight off the source bottle (to the discard sink, exactly as
 * `CraftingLogic.consumeBulkInputs` does) — so the substrate never has to
 * blend incompatible materials in one bulk slot. Conservation holds at
 * the bookkeeping level: Σ contribution measures = the minted drink's
 * volume; the drained bottles stand whether or not the build is finished.
 *
 * Runtime-only (NOT persisted): a build-in-progress is as ephemeral as
 * an engagement — a reload wakes the shaker empty, mirroring
 * `EngagedMixin`'s transient map. The slot a build-step engagement holds
 * keeps two actors from building in one shaker concurrently.
 *
 * Domain-layer privacy: TypeScript modifiers (the proxy-receiver rule);
 * the inter-Stuff contract is the method surface, never the fields.
 */

import type { MixinConstructor } from "../mixin";
import { Grade } from "./Grade";

/** How the build was worked — recorded by `stir` / `shake`. */
export type BuildMethod = "stirred" | "shaken";

/** One banked ingredient: its recipe category, measure, and input grade. */
export interface BuildContribution {
  /** The Material category tag (e.g. `gin`) — matched against recipe slots. */
  category: string;
  /** Volume contributed, in litres. */
  measureL: number;
  /** The source bottle's grade band word, for weakest-link derivation. */
  gradeBand: string;
}

/** Public method surface contributed by {@link ManualBuildMixin}. */
export interface Builds {
  /** Bank a completed pour/add into the build buffer. */
  addContribution(contribution: BuildContribution): void;
  /** The contributions banked so far (snapshot-safe). */
  getContributions(): readonly BuildContribution[];
  /** Record how the build was worked. */
  setBuildMethod(method: BuildMethod): void;
  /** How the build was worked, or null if not yet stirred/shaken. */
  getBuildMethod(): BuildMethod | null;
  /** Summed measure of every contribution, in litres. */
  getBuildVolumeL(): number;
  /** Weakest-link grade across the banked contributions. */
  getBuildGrade(): Grade;
  /** True iff nothing has been banked yet. */
  isBuildEmpty(): boolean;
  /**
   * Record the verbatim command source of a completed manual step (the
   * demonstration-capture trail). A *scripted* build records nothing (its
   * dispatched commands carry no typed source), so only a hand-typed
   * build accumulates a transcript — the natural manual-vs-scripted
   * discriminator. Empty/blank sources are ignored.
   */
  recordCommand(source: string): void;
  /** The recorded manual-step command sources, in order (snapshot-safe). */
  getCommandSources(): readonly string[];
  /** Reset the buffer (the terminal step clears it after minting). */
  clearBuild(): void;
}

export function ManualBuildMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class ManualBuildMixin extends Base implements Builds {
    static _mixinName = "ManualBuildMixin";

    /**
     * Runtime-only build buffer. Deliberately absent from
     * `persistentFields` — a build-in-progress doesn't survive a reload,
     * mirroring `EngagedMixin`'s transient slot map.
     */
    private _contributions: BuildContribution[] = [];
    private _method: BuildMethod | null = null;
    private _commandSources: string[] = [];

    addContribution(contribution: BuildContribution): void {
      this._contributions.push({ ...contribution });
    }

    getContributions(): readonly BuildContribution[] {
      return [...this._contributions];
    }

    setBuildMethod(method: BuildMethod): void {
      this._method = method;
    }

    getBuildMethod(): BuildMethod | null {
      return this._method;
    }

    getBuildVolumeL(): number {
      return this._contributions.reduce((sum, c) => sum + c.measureL, 0);
    }

    getBuildGrade(): Grade {
      return Grade.deriveAtFixedControl(
        this._contributions.map((c) => Grade.of(c.gradeBand)),
      );
    }

    isBuildEmpty(): boolean {
      return this._contributions.length === 0;
    }

    recordCommand(source: string): void {
      const trimmed = source.trim();
      if (trimmed.length > 0) this._commandSources.push(trimmed);
    }

    getCommandSources(): readonly string[] {
      return [...this._commandSources];
    }

    clearBuild(): void {
      this._contributions = [];
      this._method = null;
      this._commandSources = [];
    }
  };
}
