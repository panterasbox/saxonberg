/**
 * HeadSeed — ⭐⭐ **head *n* is a deterministic function of the herd's
 * identity and its index** (D21).
 *
 * The field pattern again, and the third time this build has reached for
 * it: `Deposit.sampleAt` for rock, `GroundCharacter.resolve` for dirt,
 * this for animals. *Seeded, never drawn*, so the answer was true before
 * anyone asked and **head 17 drafted twice is the same animal**.
 *
 * > **Identity is earned by being measured.** That stops being a
 * > metaphor here and becomes the implementation: an unindividuated head
 * > is a number and a seed; drafting it is what makes it an object; and
 * > what it *was* did not change in the act.
 *
 * ⚠ **Not a distribution.** Nothing rolls. `uncertainty.md`'s
 * resolutional ban is not *prefer determinism* — it is *never roll to
 * decide what your action DID*, and the herd was always there. Two boots
 * and two processes give one answer, because the hash is FNV-1a over a
 * string.
 *
 * ⚠ **And a sparse overlay wins over the seed**, always. The seed says
 * what head 17 IS; the register's overlay says what has since become of
 * it, and the fold order is the same spine invariant the other two
 * fields keep: authored/recorded over computed, never instead of it.
 *
 * ⚠ **The thirty lines of hash-and-mix are re-implemented, not
 * imported** (D6). Fourth instance, same ruling: shared shape, not
 * shared code. What these four do not share is everything that matters.
 */

/** Everything true of one unindividuated head, before anybody looked. */
export interface HeadSample {
  /** Body condition `[0, 100]` — the `flesh` reserve's starting value. */
  flesh: number;
  /** Tractability `[0, 1]` — how this one takes to being worked. */
  handling: number;
  /** Age in game days. */
  ageDays: number;
  /** `'male'` or `'female'`. */
  sex: 'male' | 'female';
  /**
   * A stable size deviation `[-1, 1]` around the species mean. ⭐ This is
   * what the tail is made of: the three thin ones, the big one, the
   * runt. A herd whose members were identical would be a glob.
   */
  frame: number;
}

/** How the herd was founded — the parameters every head is drawn against. */
export interface HerdShape {
  /** The herd's stable id. Renaming a herd would re-roll it; ids do not. */
  herdId: string;
  /** Mean age in game days at the moment of reading. */
  meanAgeDays: number;
  /** Fraction female, `[0, 1]`. A dairy herd is nearly all; a flock less. */
  femaleFraction: number;
}

/**
 * The module's one concept, as a holder class rather than loose
 * functions — the `LandUses` / `Grade` shape, which is the sanctioned
 * form for a substrate primitive that is not an instanceable Stuff.
 */
export class HeadSeed {
  /**
   * The one resolved read. `overlay` is the register's sparse memory and
   * **wins over the seed** for every field it names.
   */
  public static sample(
    shape: HerdShape,
    index: number,
    overlay?: {
      flesh?: number;
      handling?: number;
      ageDays?: number;
    },
  ): HeadSample {
    const key = `${shape.herdId}#${index}`;
    const h = hashString(key);
    const seeded: HeadSample = {
      // Around "in good flesh", with real spread: some of them are
      // always doing better than others, which is the whole management
      // game.
      flesh: round1(35 + roll01(h, 0x1) * 45),
      // Most farm animals are wary; a few are quiet and a few are not.
      handling: round2(0.2 + roll01(h, 0x2) * 0.5),
      ageDays: round1(
        Math.max(0, shape.meanAgeDays * (0.55 + roll01(h, 0x3) * 0.9)),
      ),
      sex: roll01(h, 0x4) < shape.femaleFraction ? 'female' : 'male',
      frame: round2(roll01(h, 0x5) * 2 - 1),
    };
    if (!overlay) return seeded;
    return {
      ...seeded,
      flesh: overlay.flesh ?? seeded.flesh,
      handling: overlay.handling ?? seeded.handling,
      ageDays: overlay.ageDays ?? seeded.ageDays,
    };
  }
}

/** FNV-1a 32-bit string hash — deterministic and process-independent. */
function hashString(s: string): number {
  let v = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    v ^= s.charCodeAt(i);
    v = Math.imul(v, 0x01000193);
  }
  return v >>> 0;
}

/** Integer avalanche mix of two 32-bit words → a 32-bit hash. */
function mix2(a: number, b: number): number {
  let h = (a ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (b >>> 0), 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** Deterministic value in `[0, 1)` from two seed words. */
function roll01(a: number, b: number): number {
  return mix2(a >>> 0, b >>> 0) / 0x1_0000_0000;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
