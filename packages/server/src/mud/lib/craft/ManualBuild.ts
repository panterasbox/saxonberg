/**
 * ManualBuildMixin — the **vessel-as-buffer** for a step-by-step craft.
 *
 * A build vessel (the cocktail shaker / mixing glass) accumulates graded
 * contributions across the manual-build verbs (`pour`), records
 * how it was worked (`stir`, as the tool names it), and at the
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

import type { CommandContributions } from "../../api/command";
import type { CompositionEntry } from '../material/Material';
import type { PathogenLoads } from '../material/Contaminable';
import type { NestingConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import { MixinApi } from "../../api/mixin";
import { BulkableApi } from "../../api/bulk";
import { MaterialApi } from "../../api/material";
import { StuffApi } from "../../api/stuff";
import { Contamination } from "../material/Contaminable";
import { Freshness } from "../material/Freshness";
import type Material from "../material/Material";
import { PourTargetMixin, type PourAnswer, type PourRequest } from "../bulk/PourTarget";
import { Grade } from "./Grade";
import type { Technique, TechniqueSpec } from "./Technique";
import { HeatedMixin, type HeatTaken } from "../fire/Heated";
import { AgitatedMixin, type AgitatePlan, type AgitateRefusal, type AgitateRequest } from "./Agitated";

/** How the build was worked — recorded by `stir` / `muddle`. */
export type BuildMethod = Technique;

/** One banked ingredient: its recipe category, measure, and input grade. */
export interface BuildContribution {
  /**
   * A Material **tag** naming what was contributed (e.g. `gin`), matched
   * against a recipe slot's `category`.
   *
   * ⚠ Optional, and `tags` is the authority: a slot matches against the
   * source Material's full tag set, so a contribution that carries `tags`
   * need not name one. It was once SYNTHESISED from the material's
   * display name (`getName().toLowerCase()`) or its first keyword, which
   * is the antipattern — a recipe's category vocabulary is authored tags,
   * and words are the command line's. See docs/antipatterns.md
   * § Keywords Where You Mean Identity.
   */
  category?: string;
  /** Volume contributed, in litres (0 for a discrete item contribution). */
  measureL: number;
  /** The source's grade band word, for weakest-link derivation. */
  gradeBand: string;
  /** Contribution kind — absent = `'bulk'` (the bar's, byte-identical);
   * `'item'` = a banked discrete ingredient / workpiece. */
  kind?: 'bulk' | 'item';
  /** Units banked — item contributions only (default 1). */
  count?: number;
  /**
   * ⭐ The kilograms banked — item contributions only: every unit's mass,
   * read when it went in (ceramics re-plan R1-D7). A bulk contribution's
   * mass is derived, `measureL × ρ`, and is never banked.
   */
  massKg?: number;
  /**
   * ⭐ The contribution's **microbial load** at the moment it was banked.
   *
   * A build buffer is a snapshot — the bottle it was poured from may be
   * drained and the ingredient destructed by the time the mint runs — so
   * the spoilage has to be captured with the matter, or the by-hand route
   * would launder it: pour a spoiled stock into a pot, mint, get a clean
   * dish. Absent ⇒ nothing perishable was banked.
   */
  freshnessLoad?: number;
  /**
   * ⚠ **The silent half, banked with the matter for the same reason.** A
   * pour drains its source and the ingredient is destructed by the time
   * the mint runs, so a contaminated stock poured into a pot would come
   * out of the by-hand route clean — a laundering route the one-shot craft
   * does not have. Absent ⇒ nothing contaminated was banked.
   */
  pathogenLoads?: PathogenLoads;
  /** The source Material's full tag set — item contributions only. A
   * recipe's item slot matches when its category appears here (the same
   * by-tag rule `craftImpl`'s gather matching uses), since a discrete
   * ingredient can't know which of its tags a recipe will ask for. */
  tags?: string[];
  /** The source Material's template path — feeds the terminal mint's
   * derived blend payload (macros in = macros out). */
  materialPath?: string;
  /**
   * The source PIECE's kind (its row), for an item — so "one piece that
   * already is the product" can tell a lump of the clay from a jug made of
   * it (the reclaim, B99).
   */
  templatePath?: string;
  /**
   * ⭐ **What the source was itself made of**, by mass fraction, when it
   * was already a blend — banked with the matter for exactly the reason
   * the loads are (above): the bottle it was poured from may be drained
   * and gone by the time the mint runs.
   *
   * Without it the by-hand route launders the composition the way it
   * would otherwise launder spoilage: flour that knows it is 28 % bran
   * arrives at the trough as plain "flour", and the loaf comes out white
   * however dark the flour was. Absent ⇒ the source was not a blend, and
   * the mint reads its material identity exactly as before.
   */
  makeup?: readonly CompositionEntry[];
}

/** Public method surface contributed by {@link ManualBuildMixin}. */
export interface Builds {
  /** Bank a completed pour/add into the build buffer. */
  addContribution(contribution: BuildContribution): void;
  /**
   * Bank the host's **own matter** as the build's item contribution —
   * the forming work (`hammer`) is what turns the workpiece itself into
   * a build. **Idempotent per build**: the first call banks, later calls
   * no-op until `clearBuild` (hammering more shapes the metal, it
   * doesn't multiply it) — the once-rule lives here, in the substrate,
   * so no verb (core or authored) can double-bank. Returns true when a
   * contribution was banked; false when one was already banked or the
   * host carries no material to bank.
   */
  bankWorkpiece(): boolean;
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
   * Latch the highest heat (K) this build has been worked at — the
   * `heat` step records the reachable heat here; a recipe with
   * `requiresHeatK` above the latch never reverse-matches. Max-latching
   * (a later, cooler heat never lowers it); reset by `clearBuild`.
   */
  noteHeat(kelvin: number): void;
  /** The highest heat (K) this build reached; 0 = never heated. */
  getHeatedToK(): number;
  /** Reset the buffer (the terminal step clears it after minting). */
  clearBuild(): void;
}

/** One pour's base time, ms; a good instrument paces it. */
const POUR_MS = 3000;
/** What pouring a measure or adding an ingredient costs, W. */
const POUR_EFFORT_W = 150;
const POUR_EPS = 1e-9;

/** Working a build by its method (`stir`), ms; a good instrument paces it. */
const STIR_MS = 4000;
/** What working a build costs, W. */
const STIR_EFFORT_W = 150;
/** Working a build in the heat (`heat`), ms; a good pot paces it. */
const HEAT_MS = 4000;
/** What working a build in the heat costs, W. */
const HEAT_EFFORT_W = 200;
/** The capabilities a build vessel is paced by. */
const BUILD_KINDS = ["shaker", "mixing-glass", "pot"];

/** ⭐ The vessel's pace: `baseMs` over its best work-rate at `kinds`. */
function pacedMs(vessel: Stuff, baseMs: number, kinds: readonly string[] = BUILD_KINDS): number {
  if (!MixinApi.isTool(vessel)) return baseMs;
  let best: number | null = null;
  for (const kind of kinds) {
    if (!vessel.hasCapability(kind)) continue;
    const rate = vessel.capabilityRate(kind);
    best = best === null ? rate : Math.max(best, rate);
  }
  return Math.round(baseMs / (best ?? 1));
}

/** ⭐ The working a vessel names — its finishing technique, else stirring (D16). */
function workingOf(vessel: Stuff): BuildMethod {
  if (!MixinApi.isTool(vessel)) return "stirred";
  let best: TechniqueSpec | null = null;
  for (const { technique } of vessel.capabilityTechniques()) {
    if (best === null || (technique.priority ?? 0) > (best.priority ?? 0)) best = technique;
  }
  return best?.name ?? "stirred";
}

export function ManualBuildMixin<TBase extends NestingConstructor>(Base: TBase) {
  // ⭐ A build is taken to the fire (`heat` — `HeatedMixin`) and worked by
  // its method (`stir` — `AgitatedMixin`): both protocols, answered here
  // (controller-liquidity W7c).
  return class ManualBuildMixin extends AgitatedMixin(HeatedMixin(PourTargetMixin(Base))) implements Builds {
    static _mixinName = "ManualBuildMixin";

    /** @hook `heat`: a build is worked in the heat, paced by the pot. */
    public override heatManner(): "work" | "hold" {
      return "work";
    }

    /** @hook `heat`: the step's time and effort. */
    public override heatEffort(): { durationMs: number; effortW: number } {
      return { durationMs: pacedMs(this as unknown as Stuff, HEAT_MS, ["pot"]), effortW: HEAT_EFFORT_W };
    }

    /**
     * @hook ⭐ `heat`: the build LATCHES the hottest heat it took (a recipe's
     * `requiresHeatK` reads it at the finish) — and heat ANNEALS: a hardened
     * piece taken back above the critical temperature loses its temper. That
     * is not a penalty the engine chose; it is why a smith quenches LAST.
     */
    public override takeHeat(heatK: number): HeatTaken {
      const self = this as unknown as Stuff;
      this.noteHeat(heatK);
      const annealed = MixinApi.isTempered(self) && self.getTemper() !== "none";
      if (annealed && MixinApi.isTempered(self)) self.setTemper("none");
      return { heatK, latched: true, annealed };
    }

    /**
     * @hook ⭐ `stir`: the build is worked by the method the VESSEL names
     * (a shaker shakes, a mixing glass stirs), at the vessel's pace, and the
     * method is recorded on it.
     */
    public override async agitatePlanFor(_req: AgitateRequest): Promise<AgitatePlan | AgitateRefusal | null> {
      const self = this as unknown as Stuff;
      if (this.isBuildEmpty()) return { ok: false, reason: "empty-build" };
      const method = workingOf(self);
      return {
        ok: true,
        durationMs: pacedMs(self, STIR_MS),
        effortW: STIR_EFFORT_W,
        facts: { kind: "build", method },
        onComplete: () => {
          this.setBuildMethod(method);
          return { ok: true, facts: { kind: "built", method } };
        },
      };
    }

    /**
     * ⭐ `pour` into a build: one serving of what is poured (ceramics re-plan
     * R1-D4) — the material's own `servingKg` at its density, gin 60 ml, dry
     * vermouth 10 ml, bitters 2 ml — so the jigger is the row's and a new spirit
     * needs no code. `--amount` measures instead. A discrete ingredient goes in
     * whole (the cooking `add`). On a build vessel that is also a holder (a cook
     * pot, a trough), a plain jug of something ungraded is an ordinary pour.
     */
    public async receivePour(req: PourRequest): Promise<PourAnswer> {
      const target = this as unknown as Stuff & Builds;
      const { source } = req;
      if (MixinApi.isBulkable(source) && MixinApi.isGraded(source)) {
        return this.servingPlan(req);
      }
      if (MixinApi.isBulkable(source) && MixinApi.isBulkable(target) && BulkableApi.slotFor(source, req.sourceVia)) {
        return super.receivePour(req);
      }
      if (
        MixinApi.isTangible(source) &&
        source.getMaterial() !== null &&
        !MixinApi.isTool(source) &&
        // ⭐ Matter, not mark (farming A4's rule, found again by the dairy
        // drive): a `Provision` is Crafted — it carries a maker. A crafted
        // thing is an ingredient when it is FOOD; a finished tool or good is
        // not.
        (!MixinApi.isCrafted(source) || source.getMaterial()!.getEdibility())
      ) {
        return this.ingredientPlan(source);
      }
      return { ok: false, reason: "not-a-holder", facts: { source, target } };
    }

    /** Debit one measure off the bottle at completion, and bank it. */
    private async servingPlan(req: PourRequest): Promise<PourAnswer> {
      const target = this as unknown as Stuff & Builds;
      const { source } = req;
      const slot = BulkableApi.slotFor(source, req.sourceVia);
      if (!slot) return { ok: false, reason: "nothing-in-source", facts: { source, target } };
      const gradeBand = MixinApi.isGraded(source) ? source.getGradeBand() : "fair";
      // The onComplete is sync, but a Material singleton may need a load first.
      const mpath = slot.getMaterialPath();
      const material = mpath ? await StuffApi.singleton<Material>(mpath) : null;
      // One serving of what is in the bottle, unless the hand measures (a row
      // with no density measures as water). An empty bottle pours nothing.
      const density = material?.getDensity().rawValue() ?? 0;
      const servingL = material
        ? (MaterialApi.servingKgOf(material) / (density > 0 ? density : 1000)) * 1000
        : 0;
      const measure = BulkableApi.amountFromOption(req.amount, {
        kind: "measure",
        litres: servingL,
        mode: "lenient",
      });
      return {
        ok: true,
        durationMs: pacedMs(target, POUR_MS),
        effortW: POUR_EFFORT_W,
        facts: { kind: "serving", source, target },
        onComplete: () => {
          // ⚠ Read the spoilage BEFORE the draw — a full drain clears the
          // source's payload, and the gauge rides the payload.
          const freshnessLoad = new Freshness(slot).load();
          const pathogenLoads = new Contamination(slot).loads();
          // ⭐ …and what the source was MADE OF, for the same reason: a blend
          // poured from a blend must arrive at the mint knowing its ingredients.
          const sourceMakeup = slot.getPayload()?.makeup;
          const result = BulkableApi.transfer(slot, null, measure);
          if (result.applied <= POUR_EPS) {
            return { ok: false, reason: "source-empty", facts: { source, target } };
          }
          this.addContribution({
            // The material's authored tags are the vocabulary a recipe slot
            // matches on — never a keyword or the display name.
            tags: material ? [...material.getTags()] : [],
            measureL: result.applied,
            gradeBand,
            materialPath: material?.getTemplatePath() ?? undefined,
            freshnessLoad,
            pathogenLoads,
            makeup: sourceMakeup,
          });
          return { ok: true, facts: { kind: "banked", source, target, notes: [] } };
        },
      };
    }

    /**
     * The discrete ingredient, at completion: consumed whole (chattel released
     * by the shipped path) and banked as an item-contribution (category by
     * tags, grade or `fair`, a stack's stack as its count).
     */
    private ingredientPlan(ingredient: Stuff): PourAnswer {
      const target = this as unknown as Stuff & Builds;
      const material = MixinApi.isTangible(ingredient) ? ingredient.getMaterial() : null;
      return {
        ok: true,
        durationMs: pacedMs(target, POUR_MS),
        effortW: POUR_EFFORT_W,
        facts: { kind: "ingredient", source: ingredient, target },
        onComplete: () => {
          if (ingredient.isDestroyed() || !MixinApi.isTangible(ingredient) || !material) {
            return { ok: false, reason: "ingredient-gone", facts: { source: ingredient, target } };
          }
          const count = MixinApi.isStackable(ingredient) ? ingredient.getQuantity() : 1;
          this.addContribution({
            measureL: 0,
            gradeBand: MixinApi.isGraded(ingredient) ? ingredient.getGradeBand() : "fair",
            kind: "item",
            count,
            // Every unit's mass — `getMass()` is one unit's.
            massKg: ingredient.getMass().rawValue() * count,
            tags: [...material.getTags()],
            materialPath: material.getTemplatePath() ?? undefined,
            pathogenLoads: MixinApi.isContaminable(ingredient) ? ingredient.getPathogenLoads() : {},
            freshnessLoad: MixinApi.isFresh(ingredient) ? ingredient.getMicrobialLoad() : 0,
          });
          // The words name it, and go first: the destruct is the last thing.
          const out = { ok: true as const, facts: { kind: "added" as const, source: ingredient, target, notes: [] } };
          void StuffApi.destruct(ingredient);
          return out;
        },
      };
    }

    /**
     * ⭐ The build buffer is what `pour` banks into and `stir` works on,
     * so the build vessel is what affords them — the shaker, the mixing
     * glass, the cook pot, and anything else that buffers a
     * step-by-step build. Named once, here, instead of copied onto every
     * instrument row (where the shaker and the mixing glass carried the
     * identical six-verb list and the bar's own stations carried none).
     */
    static commandContributions: CommandContributions = {
      environment: [
        "platform/cmd/bulk/pour.yaml",
        "platform/cmd/crafting/stir.yaml",
      ],
      peers: [
        "platform/cmd/bulk/pour.yaml",
        "platform/cmd/crafting/stir.yaml",
      ],
    };

    /**
     * Runtime-only build buffer. Deliberately absent from
     * `persistentFields` — a build-in-progress doesn't survive a reload,
     * mirroring `EngagedMixin`'s transient slot map.
     */
    private _contributions: BuildContribution[] = [];
    private _method: BuildMethod | null = null;
    private _heatedToK: number = 0;

    addContribution(contribution: BuildContribution): void {
      this._contributions.push({ ...contribution });
    }

    bankWorkpiece(): boolean {
      if (this._contributions.some((c) => c.kind === "item")) return false;
      const host = this as unknown as Stuff;
      if (!MixinApi.isTangible(host)) return false;
      const material = host.getMaterial();
      if (!material) return false;
      this.addContribution({
        // No `category`: `tags` below is the material's authored
        // vocabulary and is what a slot matches on.
        measureL: 0,
        gradeBand: MixinApi.isGraded(host) ? host.getGradeBand() : "fair",
        kind: "item",
        count: 1,
        massKg: host.getMass().rawValue(),
        tags: [...material.getTags()],
        materialPath: material.getTemplatePath() ?? undefined,
        freshnessLoad: MixinApi.isFresh(host) ? host.getMicrobialLoad() : 0,
        pathogenLoads: MixinApi.isContaminable(host)
          ? host.getPathogenLoads()
          : {},
      });
      return true;
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

    noteHeat(kelvin: number): void {
      if (Number.isFinite(kelvin) && kelvin > this._heatedToK) {
        this._heatedToK = kelvin;
      }
    }

    getHeatedToK(): number {
      return this._heatedToK;
    }

    clearBuild(): void {
      this._contributions = [];
      this._method = null;
      this._heatedToK = 0;
    }
  };
}
