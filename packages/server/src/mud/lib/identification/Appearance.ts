/**
 * Appearance — what an unidentified item *looks like*, derived.
 *
 * ## Derived, never stored (requirements D26)
 *
 * An item's appearance resolves on read from **(class, generation)**.
 * Nothing stores an appearance on the instance, and that single decision
 * removes an entire subsystem: no withdrawal sweep, no generation on the
 * signature, no two-live-generations transition, no ownership veto, no
 * secondhand-market heirloom hazard. A stashed potion simply re-renders
 * on retrieval.
 *
 * The accepted cost is an incongruity — a player's out-of-character
 * memory outruns their character's, so a flask they *know* is healing
 * comes back unlabelled after a rotation. That is a normal roguelike
 * situation, and D28's labels give the player a fix.
 *
 * A consequence worth stating: **all current-generation items of a class
 * look identical.** Per-instance visual variation is closed off
 * deliberately — it would be a second axis of hidden state with no
 * mechanic behind it.
 *
 * ## Turnover is a window, not a switch (D27)
 *
 * A hard changeover is visible and reads as a glitch. So an item's
 * appearance derives from its **stable position within a transition
 * window**: before that point the old descriptor, after it the new one.
 * Nothing flips at once — each item changes at *its* moment across
 * weeks, and classes are staggered against each other, so there is never
 * a day the world visibly turns over.
 *
 * The shape it produces is one everyone recognizes — **old and new stock
 * coexisting on the shelf during a changeover** — which makes it both
 * gradual and explicable.
 *
 * ## ⚠ The window position comes from a PERSISTED seed, not `stuffId`
 *
 * D27 said "hashed from its instance id", but **`stuffId` is a fresh
 * UUID per construction** — not durable across reload or re-clone.
 * Hashing it would make every item's flip moment jitter on every reboot,
 * and items would visibly flip *back*. So the seed is minted at clone
 * time and persisted.
 *
 * That stores a **position**, not an appearance, so D26 still holds: all
 * current-generation items of a class still look identical, and the seed
 * only decides *when* an item crosses. It is excluded from
 * `globIdentityFields` — otherwise stacks would stop merging entirely,
 * since every item would have a different seed.
 *
 * **A stack is a batch, and batches turn over as batches**: one Stuff,
 * one seed, one window position, so a merged stack flips as a unit
 * rather than flask by flask. Staggering happens *across* stacks, and
 * since most items in the world live in stacks that is ample.
 *
 * Pure and clock-free — the generation and the seed come in as
 * parameters. That is what makes AC 17's two-items-at-different-window-
 * positions test exact.
 */

import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { TemplatePaths } from '../paths';
import { DescriptorBank } from './DescriptorBank';

/** A rendered appearance plus the generation it was rendered in. */
export interface RenderedAppearance {
  /** The descriptor text (`'a cloudy blue potion'` minus the noun). */
  readonly descriptor: string;
  /** Which generation this rendering belongs to. */
  readonly generation: number;
}

/** Where the world is in the descriptor rotation. */
export interface GenerationNow {
  /** Which rotation. */
  readonly generation: number;
  /** How far through this rotation's transition window, in `[0,1]`. */
  readonly progress: number;
}

/**
 * How long one generation lasts (GAME seconds) and how much of its tail
 * is the changeover window. Both **derived, never stored** — the
 * generation is a function of the world clock, so there is no rotation
 * record, no sweep, and no migration when the dial changes; the world
 * simply reads differently from that moment on. *Calibrate at launch.*
 */
export const GENERATION_DEFAULTS = {
  /** ~90 game-days. Long enough that a regular player learns a pool. */
  LENGTH_GAME_SEC: 90 * 24 * 3600,
  /** The last 20% of a generation is the changeover window. */
  WINDOW_FRACTION: 0.2,
} as const;

export class Appearance {
  /**
   * **The current generation, derived on read.**
   *
   * Outside the transition window `progress` is 0 — nothing is mid-flip
   * and every item of a class reads identically. Inside it, `progress`
   * climbs to 1 and each item crosses at its own persisted window
   * position, so **nothing flips at once**: each changes at *its*
   * moment across weeks. Classes stagger against each other because each
   * hashes its own key into the draw, so there is never a day the world
   * visibly turns over.
   *
   * Degrades to generation 0 / progress 0 with no world clock (unit
   * fixtures), keeping appearance deterministic and testable.
   */
  public static currentGeneration(): GenerationNow {
    let nowS = 0;
    try {
      if (StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        nowS = WorldClockApi.getNow().rawValue();
      }
    } catch {
      nowS = 0;
    }
    const length = GENERATION_DEFAULTS.LENGTH_GAME_SEC;
    const generation = Math.floor(nowS / length);
    const within = (nowS % length) / length;
    const windowStart = 1 - GENERATION_DEFAULTS.WINDOW_FRACTION;
    const progress =
      within <= windowStart
        ? 0
        : (within - windowStart) / GENERATION_DEFAULTS.WINDOW_FRACTION;
    return { generation, progress };
  }

  /**
   * **The reuse delay** — how many rotations a descriptor waits in the
   * pool before it may mean something else; how long before *blue* is
   * allowed to come back as the poison (D32, resolved as Q6).
   *
   * **Set to 3.** Low values make the *"you once knew blue to mean
   * healing"* hedge (D28) a common sight; high values make it rare and
   * cost vocabulary. Named for what it is rather than `K`, because it is
   * something an author has to reason about.
   *
   * Worth noting the authoring cost is the *same* at 3 or 4 — two lists
   * of ten words, whose product is a hundred descriptors, covers
   * `N × (delay + 1)` at either value. It only starts costing vocabulary
   * at 5+, or if a class grows past ~20 item types.
   */
  public static readonly REUSE_DELAY = 3;

  /**
   * A stable 32-bit hash. FNV-1a — small, fast, well-distributed enough
   * for a window position, and above all **deterministic across
   * processes**, which a JS `Map` iteration order or an object hash
   * would not be.
   */
  public static hash(input: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  /**
   * **An item's position within its transition window**, in `[0,1)`.
   * Stable for the life of the item, because the seed is persisted.
   *
   * Two items of the same class with different seeds sit at different
   * points, so they cross at different moments — which is the whole of
   * "nothing flips at once".
   */
  public static windowPositionOf(seed: string): number {
    return Appearance.hash(seed) / 0x100000000;
  }

  /**
   * **Which generation an item currently renders in.**
   *
   * `generation` is the world's current rotation; `progress` is how far
   * through the changeover window the world is, in `[0,1]`. An item
   * whose window position the world has passed has already crossed to
   * the new descriptor; one it has not still shows the old.
   *
   * During the window a viewer may therefore hold **two valid records
   * for one class** — blue *and* green are healing. That is honest, and
   * it is a gentle onramp: you learn the new descriptor while the old is
   * still around.
   */
  public static effectiveGeneration(
    generation: number,
    progress: number,
    seed: string,
  ): number {
    const p = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
    return p > Appearance.windowPositionOf(seed) ? generation : generation - 1;
  }

  /**
   * **The descriptor for a class in a generation.** Deterministic in
   * both arguments and nothing else — which is exactly why every
   * current-generation item of a class looks identical, and why a
   * stashed one re-renders correctly on retrieval.
   *
   * Both axes are indexed independently off the same hash so the pairing
   * moves as a unit between generations rather than one axis sliding
   * against the other.
   *
   * Returns `''` when the bank is unseeded — a content gap, and the
   * caller falls back to the item's authored short description rather
   * than rendering a blank.
   */
  public static descriptorFor(
    classKey: string,
    generation: number,
    bank: DescriptorBank | null,
  ): string {
    if (!bank) return '';
    // Memoized per (class, generation). `canMergeWith` sits on the
    // merge-on-arrival ripple, which fires on every move into a
    // container holding globbables — a derived read there is a hot-path
    // read. The answer is IDENTICAL for every instance in a generation,
    // so the cache is tiny (one entry per class per rotation) and the
    // window comparison downstream is a cheap string compare.
    const memoKey = `${classKey}#${generation}`;
    const memo = Appearance.#descriptorMemo.get(memoKey);
    if (memo !== undefined) return memo;

    const axes = bank.getAxes();
    if (axes.primary.length === 0) return '';
    const h = Appearance.hash(memoKey);
    const primary = axes.primary[h % axes.primary.length]!;
    let rendered: string;
    if (axes.secondary.length === 0) {
      rendered = primary;
    } else {
      // A second, decorrelated draw off the same hash — dividing by the
      // first axis length before the modulo, so the two axes advance
      // independently instead of moving in lockstep.
      const secondary =
        axes.secondary[
          Math.floor(h / axes.primary.length) % axes.secondary.length
        ]!;
      rendered = `${secondary} ${primary}`;
    }
    Appearance.#descriptorMemo.set(memoKey, rendered);
    return rendered;
  }

  /** `(class, generation)` → rendered descriptor. See {@link descriptorFor}. */
  static #descriptorMemo = new Map<string, string>();

  /** Drop the memo — `PackApi.sync` after a bank write, and a test seam. */
  public static clearMemo(): void {
    Appearance.#descriptorMemo.clear();
  }

  /**
   * The full render for one item: which generation it is showing, and
   * what that looks like.
   */
  public static renderFor(
    classKey: string,
    generation: number,
    progress: number,
    seed: string,
    bank: DescriptorBank | null,
  ): RenderedAppearance {
    const effective = Appearance.effectiveGeneration(
      generation,
      progress,
      seed,
    );
    return {
      descriptor: Appearance.descriptorFor(classKey, effective, bank),
      generation: effective,
    };
  }

  /**
   * **Is a record from `learnedGeneration` still current?** (D28)
   *
   * The descriptor pool is finite, so a descriptor is eventually
   * reissued meaning something else. That is the one moment a stale
   * record could assert something false — so the display hedges instead
   * of lying:
   *
   * | Record | Shows as |
   * |---|---|
   * | current generation | *a potion of healing* |
   * | **prior** generation | *a blue potion — you once knew blue to mean healing* |
   * | none | *a blue potion* |
   *
   * One field, no sweep, and it only does work in the rare case.
   * Knowledge is never invalidated — only its applicability fades.
   */
  public static isRecordCurrent(
    learnedGeneration: number,
    currentGeneration: number,
  ): boolean {
    return learnedGeneration >= currentGeneration;
  }
}
