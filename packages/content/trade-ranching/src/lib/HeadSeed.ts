import { Seeded } from '@saxonberg/server/mud/lib/Seeded';
import { METABOLIC_DEFAULTS } from '@saxonberg/server/mud/lib/metabolism/Metabolic';

const MINUTES_PER_GAME_DAY = 1440;
/**
 * HeadSeed — ⭐⭐ **head *n* is a deterministic function of the herd's
 * identity and its index** (D21).
 *
 * The field pattern again, and the third time this build has reached for
 * it: `Deposit.sampleAt` for rock, `GroundCharacter.resolve` for dirt
 * (both `/system/ground`'s since the ground build), this for animals. *Seeded, never drawn*, so the answer was true before
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
  *
 * @internal every caller of this class sits in the `trade-ranching` subsystem — it is that subsystem's private collaborator, not author surface.
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
      flesh: round1(35 + Seeded.unit(h, 0x1) * 45),
      // Most farm animals are wary; a few are quiet and a few are not.
      handling: round2(0.2 + Seeded.unit(h, 0x2) * 0.5),
      ageDays: round1(
        Math.max(0, shape.meanAgeDays * (0.55 + Seeded.unit(h, 0x3) * 0.9)),
      ),
      sex: Seeded.unit(h, 0x4) < shape.femaleFraction ? 'female' : 'male',
      frame: round2(Seeded.unit(h, 0x5) * 2 - 1),
    };
    if (!overlay) return seeded;
    return {
      ...seeded,
      flesh: overlay.flesh ?? seeded.flesh,
      handling: overlay.handling ?? seeded.handling,
      ageDays: overlay.ageDays ?? seeded.ageDays,
    };
  }

  /**
   * ⭐ A head's stable size deviation `[-1, 1]` alone — what its share of
   * the feed rides on (cover build D10c). Cheap: one hash, the same one
   * {@link sample} reads.
   */
  public static frameOf(herdId: string, index: number): number {
    const h = hashString(`${herdId}#${index}`);
    return round2(Seeded.unit(h, 0x5) * 2 - 1);
  }

  /**
   * ⭐ **The tail**: a head's own fed fraction is the herd's scaled by
   * its frame — the shy feeders at the low end of the frame get pushed
   * off the trough, and they are the same heads every time (*seeded,
   * never drawn*). `0.8` at the bottom of the frame, `1` at the top.
   */
  public static tailFactor(frame: number): number {
    const f = Math.max(-1, Math.min(1, frame));
    return 0.8 + (0.2 * (1 + f)) / 2;
  }

  /**
   * The satiation a fed fraction is equivalent to (cover build D10) —
   * grain, a mapping a balance pass may move: fully fed reads as a
   * comfortable surplus, half-fed as maintenance, less as a shortfall.
   */
  public static satiationFor(fedFraction: number): number {
    const f = Math.max(0, Math.min(1, fedFraction));
    // ⭐ A head on all it wants puts flesh ON: a summer on good grass is
    // where a winter's loss comes back (drive 5: at a bare surplus a
    // starved autumn took most of a year to recover).
    if (f >= 0.95) return 90;
    if (f >= 0.8) return 75;
    if (f >= 0.5) return 50;
    return (25 * f) / 0.5;
  }

  /**
   * Percentage points of flesh a body gains (positive) or loses a game
   * MINUTE on `fedFraction` of its want — ⭐ the two legs of the
   * metabolism's own `partitionFlesh`, read off the same constants, so
   * the undrafted tally and the drafted body follow ONE rule.
   */
  public static fleshRatePerMin(fedFraction: number): number {
    const D = METABOLIC_DEFAULTS;
    const s = HeadSeed.satiationFor(fedFraction);
    if (s >= D.FLESH_SURPLUS_AT) {
      return (D.FLESH_GAIN_PER_MIN * (s - D.FLESH_SURPLUS_AT)) / (100 - D.FLESH_SURPLUS_AT);
    }
    if (s <= D.FLESH_DEFICIT_AT) {
      const deficit =
        D.FLESH_DEFICIT_AT <= 0 ? 1 : (D.FLESH_DEFICIT_AT - s) / D.FLESH_DEFICIT_AT;
      return -D.FLESH_LOSS_PER_MIN * deficit;
    }
    return 0;
  }

  /**
   * ⭐ A head's condition replayed across the herd's fed windows since
   * `fromS` (cover build D10a): only the part of each window after the
   * head's own last known flesh counts. Windows are oldest first.
   */
  public static replay(
    flesh: number,
    fromS: number,
    windows: readonly { fraction: number; days: number; end: number }[],
    frame: number,
  ): number {
    let out = flesh;
    for (const w of windows) {
      if (w.end <= fromS) continue;
      const after = (w.end - fromS) / 86_400;
      out = HeadSeed.conditionAfter(out, w.fraction, Math.min(w.days, after), frame);
    }
    return out;
  }

  /**
   * ⭐ A head's condition after `days` on `herdFedFraction` of the
   * herd's want (cover build D10a): its own share is the herd's times its
   * tail, and the flesh moves on the metabolism's legs. Clamped
   * `[0, 100]` — ⚠ **never lethal**: a starving head is thin, not dead.
   */
  public static conditionAfter(
    flesh: number,
    herdFedFraction: number,
    days: number,
    frame: number,
  ): number {
    if (!(days > 0)) return flesh;
    const own = herdFedFraction * HeadSeed.tailFactor(frame);
    const next = flesh + HeadSeed.fleshRatePerMin(own) * days * MINUTES_PER_GAME_DAY;
    return round1(Math.max(0, Math.min(100, next)));
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

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
