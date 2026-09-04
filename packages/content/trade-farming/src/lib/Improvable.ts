/**
 * ImprovableMixin — **land is a maintained state, not a permanent one**
 * (D54, D57, D58).
 *
 * The first draft of this build made `plot` produce ready-to-use ground,
 * which is the Stardew model where the farm is already a farm. Real
 * ground has a lifecycle and the build owes all of it:
 *
 * > **ground → claim → clear → treat → establish → maintain → *revert*.**
 *
 * `plot` is step two. **Reclamation** sits between owning ground and
 * planting on it; **maintenance** sits between being a field and staying
 * one.
 *
 * ## Three axes, and they are genuinely independent (D57)
 *
 * | axis | who decides | where it lives |
 * |---|---|---|
 * | **permission** — may anything be grown here at all? | the polity | `LandUse`, on the parcel |
 * | **capability** — what is this ground made of? | the world | `GroundCharacter`, seeded |
 * | **improvement** — what has been DONE to it? | the holder | **here** |
 *
 * All three must be satisfied, and none substitutes for another. The
 * consequence that matters most: ⭐ **authored content ships land at any
 * point on the improvement axis**, so raw wilderness, a working farm and
 * a derelict one are the same object at three settings rather than three
 * kinds of thing.
 *
 * ## ⭐⭐ Improvement is capital formation, and it reverts
 *
 * Converting labour into a durable asset is the most tangible instance of
 * capital anyone will meet — and D58's decay is what stops it being a
 * one-way ratchet. Stop cutting the drains and the field goes wet; stop
 * grubbing and the scrub comes back. That gives upkeep something to be
 * other than an HP bar, and it puts **abandoned, reverted farms in the
 * world as real places** — cheap because somebody stopped, and worth
 * buying if you will do the work. That is the smallholder's actual path,
 * and it is a better start than a tidy empty plot.
 *
 * ⚠ It is also D45's **slope, not a cliff**: reversion accrues in your
 * absence, so it must never be catastrophic. A neglected field goes back
 * toward rough at a few percent a game-week; it does not vanish, and no
 * amount of absence destroys the title.
 *
 * ## ⭐ And the cost is the GROUND's (D55)
 *
 * Each job's *requirement* comes from
 * `GroundCharacter.improvementCost`, so stony ground costs stone-picking,
 * wet ground costs ditching and sour ground costs lime — and two plots of
 * different character demand measurably different work to reach the same
 * state. The player pays the difference in **labour** rather than reading
 * it off a yield modifier, which is the whole of D55.
 *
 * See [docs/subsystems/soil.md].
 */

import type { MixinConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { ImprovementCost } from '../idea/GroundCharacter';

const SECONDS_PER_GAME_DAY = 86_400;

/**
 * The mixin's name.
 *
 * ⚠ A pack may not add to the kernel's `Mixins` registry, so a pack
 * mixin owns its own constant and consumers narrow with
 * `MixinApi.hasMixin(cls, IMPROVABLE_MIXIN)` — the `WorkingMixin` /
 * `ManaPoweredMixin` shape.
 */
export const IMPROVABLE_MIXIN = 'ImprovableMixin';

/**
 * The jobs reclamation is made of — a CLOSED, ordinal vocabulary.
 *
 * ⚠ `terracing` is deliberately absent as a job even though
 * `improvementCost` prices it. Steep ground is not terraced in this
 * build; it simply costs more to grub and never comes fully into heart,
 * which is honest (most steep ground never was terraced either) and
 * costs no verb.
 */
export const IMPROVEMENT_JOBS = ['clearing', 'draining', 'liming'] as const;

export type ImprovementJob = (typeof IMPROVEMENT_JOBS)[number];

/**
 * ⭐⭐ **The bands, and they are PERCEPTS** (D86). A band says what the
 * ground looks like; it never says a number in words. A reader who does
 * not know the figure can still tell these four apart, which is the half
 * of the contract a compiler cannot check.
 */
export const IMPROVEMENT_BANDS = ['rough', 'broken', 'worked', 'in-heart'] as const;

export type ImprovementBand = (typeof IMPROVEMENT_BANDS)[number];

/**
 * Exhaustive by construction: a fifth band cannot be added without
 * writing its sentence.
 */
const BAND_PHRASE: Readonly<Record<ImprovementBand, string>> = {
  rough: 'rough ground — thorn, bramble and whatever else got here first',
  broken: 'broken ground, turned once and still full of root and stone',
  worked: 'worked ground, in decent tilth and clean enough to sow',
  'in-heart': 'ground in good heart — deep, clean and level, and it took somebody years',
};

/**
 * ⭐ The cause line, read SEPARATELY from the band (D86, and the shape
 * `Growing.CAUSE_PHRASE` already ships): the band says what it looks
 * like, this says what is still owed on it. Two clauses, and the player
 * does the diagnosis.
 */
const OWING_PHRASE: Readonly<Record<ImprovementJob, string>> = {
  clearing: 'there is scrub on it yet',
  draining: 'the water has nowhere to go',
  liming: 'it is sour',
};

/**
 * How fast each job reverts when nobody maintains it, as a fraction of
 * the requirement per **game day**.
 *
 * ⭐ The ordering is the lesson and it is real: **scrub comes back
 * fastest**, drains silt up over years, and lime leaches slowest of all.
 * So a field left alone reads as *wild again* long before it reads as
 * *sour again*, which is exactly what walking onto an abandoned farm
 * looks like.
 *
 * ⚠ Stated per GAME day (D89). At the shipped scale a game day is two
 * real hours, so clearing at 0.004/game-day is a full reversion in about
 * 250 game days — a bit under nine real days of total neglect. Slow
 * enough to be a slope; fast enough that a derelict farm exists.
 */
const REVERT_PER_GAME_DAY: Readonly<Record<ImprovementJob, number>> = {
  clearing: 0.004,
  draining: 0.0012,
  liming: 0.0006,
};

/** The method surface reclamation speaks. */
export interface Improvable {
  /** Labour banked against one job, in the same units its cost is in. */
  workDoneOn(job: ImprovementJob): number;
  /** Bank labour against a job. Returns the progress fraction after. */
  bankWork(job: ImprovementJob, amount: number, cost: ImprovementCost): number;
  /** Progress on one job, `[0, 1]`, reconciled. */
  progressOn(job: ImprovementJob, cost: ImprovementCost): number;
  /** Which jobs this ground still owes work on, worst first. */
  owing(cost: ImprovementCost): ImprovementJob[];
  /** The overall band — the coarse read (D86). */
  improvementBand(cost: ImprovementCost): ImprovementBand;
  /** What the band looks like, in words. */
  improvementPhrase(cost: ImprovementCost): string;
  /** Why it is not better than it is, or `null` when nothing is owed. */
  improvementCause(cost: ImprovementCost): string | null;
  /**
   * ⭐ **D54 — newly plotted ground is NOT plantable.** Clearing is the
   * gate, and it is the ONLY one: you can sow sour, wet ground and get a
   * bad crop, which is a lesson. You cannot sow a thicket.
   */
  isPlantable(cost: ImprovementCost): boolean;
  /**
   * ⭐ **D61 — wilderness is forageable, and clearing spends it.** `1`
   * on untouched ground, falling to `0` as it is grubbed out. *The
   * neolithic transition, expressed as a cashflow decision.*
   */
  wildness(cost: ImprovementCost): number;
  /** Reconcile reversion over elapsed game-time. Sync, read-triggered. */
  reconcileImprovement(): void;
}

export function ImprovableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class ImprovableMixin extends Base implements Improvable {
    static _mixinName = IMPROVABLE_MIXIN;

    /**
     * ⭐⭐ **The reclamation acts are afforded by the GROUND, and this is
     * the only thing that makes them exist.**
     *
     * ⚠ A row's `commandContributions:` is dead silently — the affordance
     * is a STATIC ON A CLASS. Without this block `grub`, `ditch`, `lime`
     * and `forage` parse as nothing at all: *"I don't understand
     * 'grub'."* Two builds in this repo shipped exactly that failure and
     * only found it by driving the world.
     *
     * `self` and `inventory` rather than `peers`: these acts belong to
     * the ground you are STANDING IN. Walking into a field lights them
     * up and walking out puts them away — which is also the honest
     * answer to *"why can't I grub in the street"*.
     *
     * ⭐ `plot` is deliberately NOT here. You plot ground that is not yet
     * a field, so a field cannot be what affords it; a spade is (see
     * `Spade`). The two halves of the ladder are afforded by the two
     * things that are actually present at each end of it.
     */
    static commandContributions = {
      self: [
        'trade/farming/cmd/farming/grub.yaml',
        'trade/farming/cmd/farming/ditch.yaml',
        'trade/farming/cmd/farming/lime.yaml',
        'trade/farming/cmd/farming/forage.yaml',
      ],
      inventory: [
        'trade/farming/cmd/farming/grub.yaml',
        'trade/farming/cmd/farming/ditch.yaml',
        'trade/farming/cmd/farming/lime.yaml',
        'trade/farming/cmd/farming/forage.yaml',
      ],
    };

    static fieldMeta: FieldMeta = {
      // ⭐ Authorable, which is D57's consequence: wilderness, a working
      // farm and a derelict one are the same object at three settings.
      improvementWork: { persistent: true, authorable: true },
      improvementStamp: { persistent: true },
    };

    /** Labour banked per job. Absent = nothing done. */
    public improvementWork: Record<string, number> = {};

    /** Game-seconds stamp of the last reversion reconcile; `0` = never. */
    public improvementStamp = 0;

    /**
     * Reentry guard — reversion must never recurse.
     *
     * ⚠ `protected`, not `private`, and that is load-bearing. A mixin
     * returns `{ … } & TBase`, so a stack several factories deep
     * intersects the same class type with itself; TypeScript reduces an
     * intersection to **`never`** when a PRIVATE member appears in more
     * than one constituent. The failure lands in the composing file as
     * *"Base constructor return type 'never'"* with nothing pointing
     * back here — the second time this build has been bitten by a
     * `never` in a mixin stack, and the first was `_mixinName`.
     */
    protected _reverting = false;

    public workDoneOn(job: ImprovementJob): number {
      this.reconcileImprovement();
      return this.improvementWork[job] ?? 0;
    }

    public bankWork(job: ImprovementJob, amount: number, cost: ImprovementCost): number {
      if (!Number.isFinite(amount) || amount <= 0) return this.progressOn(job, cost);
      this.reconcileImprovement();
      const required = requiredFor(job, cost);
      const done = Math.min(required, (this.improvementWork[job] ?? 0) + amount);
      this.improvementWork = { ...this.improvementWork, [job]: done };
      return required <= 0 ? 1 : done / required;
    }

    public progressOn(job: ImprovementJob, cost: ImprovementCost): number {
      this.reconcileImprovement();
      const required = requiredFor(job, cost);
      // ⭐ Ground that owes nothing is finished by definition. Sweet
      // ground needs no lime, and reporting it as 0% limed would be a
      // gauge telling the truth about a number and lying about the world.
      if (required <= 0) return 1;
      return clamp01((this.improvementWork[job] ?? 0) / required);
    }

    public owing(cost: ImprovementCost): ImprovementJob[] {
      return IMPROVEMENT_JOBS.filter((j) => this.progressOn(j, cost) < 1).sort(
        (a, b) => this.progressOn(a, cost) - this.progressOn(b, cost),
      );
    }

    public improvementBand(cost: ImprovementCost): ImprovementBand {
      const mean =
        IMPROVEMENT_JOBS.reduce((n, j) => n + this.progressOn(j, cost), 0) /
        IMPROVEMENT_JOBS.length;
      // ⚠ The weakest link, not the mean, decides the bottom two bands:
      // ground with beautiful drains and a thicket on it is rough.
      const worst = Math.min(...IMPROVEMENT_JOBS.map((j) => this.progressOn(j, cost)));
      if (worst < 0.35) return 'rough';
      if (worst < 0.8) return 'broken';
      return mean >= 0.995 ? 'in-heart' : 'worked';
    }

    public improvementPhrase(cost: ImprovementCost): string {
      return BAND_PHRASE[this.improvementBand(cost)];
    }

    public improvementCause(cost: ImprovementCost): string | null {
      const worst = this.owing(cost)[0];
      return worst ? OWING_PHRASE[worst] : null;
    }

    public isPlantable(cost: ImprovementCost): boolean {
      return this.progressOn('clearing', cost) >= 1;
    }

    public wildness(cost: ImprovementCost): number {
      return 1 - this.progressOn('clearing', cost);
    }

    /**
     * Integrate reversion over elapsed game-time (D58).
     *
     * ⚠ **No far-past guard**, deliberately. The family clock's guard is
     * for the INHABITED BODY alone; land reverts over the whole absence,
     * which is the entire point — a farm you left for a real month has
     * gone back, and that is how a derelict holding gets into the world.
     */
    public reconcileImprovement(): void {
      if (this._reverting) return;
      const nowS = nowSeconds();
      if (nowS === null) return;
      if (this.improvementStamp === 0) {
        this.improvementStamp = nowS;
        return;
      }
      const elapsed = nowS - this.improvementStamp;
      if (elapsed <= 0) {
        this.improvementStamp = nowS;
        return;
      }
      this._reverting = true;
      try {
        const days = elapsed / SECONDS_PER_GAME_DAY;
        const next: Record<string, number> = { ...this.improvementWork };
        for (const job of IMPROVEMENT_JOBS) {
          const done = next[job] ?? 0;
          if (done <= 0) continue;
          // Reversion is a fraction of the REQUIREMENT per day, and the
          // requirement is the ground's — so hard ground reverts in the
          // same *proportion* as easy ground, which is what makes the
          // band comparable across two different fields.
          next[job] = Math.max(0, done * (1 - REVERT_PER_GAME_DAY[job] * days));
        }
        this.improvementWork = next;
        this.improvementStamp = nowS;
      } finally {
        this._reverting = false;
      }
    }
  };
}

/** The labour one job requires on this ground — the character's price. */
function requiredFor(job: ImprovementJob, cost: ImprovementCost): number {
  switch (job) {
    case 'clearing':
      return cost.clearing + cost.stonePicking;
    case 'draining':
      return cost.draining;
    case 'liming':
      return cost.liming;
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Game-seconds now, or null when no world clock (pre-boot / tests). */
function nowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
  return WorldClockApi.getNow().rawValue();
}
