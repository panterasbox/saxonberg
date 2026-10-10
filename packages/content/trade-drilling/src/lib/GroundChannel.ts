/**
 * GroundChannel — the shared base for the drilling trade's own reading
 * channels (`structure` now, `head` in Stage B).
 *
 * ⭐ **What it actually is: `Reading` plus the ground pack's position
 * trio, and nothing else.** Asking the column about the place an actor
 * is standing in is `GroundQueryMixin`'s job — four steps that had been
 * written three times privately before the ground pack got a home for
 * them — so this file composes it rather than writing them a fourth
 * time, and holds only what is genuinely drilling's: how wide a bracket
 * a band buys on a DEPTH.
 *
 * ⚠⚠ **It does not depend on `trade-mining`.** The geological channels
 * `strike`, `dip` and `ground` are the mine's and their base is the
 * mine's; a trade that asks the rock a question must not have to depend
 * on a mine to ask it. The two trades meet in the GROUND pack and
 * nowhere else, and the only thing crossing between them is a
 * Discipline NAME, which is a row.
 */

import Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import {
  GroundQueryMixin,
  type GroundQuery,
} from '@saxonberg/content-ground/src/lib/GroundQuery';

/** The Discipline a structural read is banded by, and credits. */
export const GEOLOGY = 'geology';

/** The Discipline a pressure read is banded by, and credits. */
export const PHYSICS = 'physics';

/** The topic every reading narrates on — the ladder's own. */
export const READING_TOPIC = 'sense.reading';

/**
 * The tool capability a surveying instrument affords. ⭐ The **same
 * string** mining's channels use, which is the point: the miner's dial
 * and the surveyor's compass already ship, and this trade adds no
 * instrument at all for its structural read. An open vocabulary, like
 * every `ToolCapability` — the kernel keeps no list, and the two packs
 * agree on a word.
 */
export const SURVEYING = 'surveying';

/**
 * ⭐⭐ **The error band IS the competence — and on a depth it is a
 * FRACTION.**
 *
 * This is the one law the design asked this build for. A bearing's error
 * does not scale with the bearing (mining overrides the ratio default
 * with absolute degrees for exactly that reason); a DEPTH's does, and
 * sharply, because what a structural survey measures is a ratio and the
 * error compounds over the distance it is projected through. Structure
 * at a hundred metres is read well; the same instrument on the same day
 * reads structure at three hundred metres three times worse.
 *
 * ⭐ That is what makes a deep bet different in KIND from a shallow one
 * rather than merely more expensive — and it is why an improving
 * prospector's first real gain is being able to chase deep ground at
 * all.
 *
 * ⚠ Never applied to the truth. `Deposit.structureReadingAt` takes the
 * fraction as an INPUT and returns both the truth and the observation,
 * so a test can assert two readers got the identical truth at different
 * resolutions — and it quotes its half-width off the READING, so the
 * bracket a player is told cannot be inverted into the answer.
 */
export const DEPTH_FRACTION: Readonly<Record<CompetenceBandName, number>> = {
  untrained: 0.5,
  novice: 0.3,
  competent: 0.15,
  proficient: 0.08,
  expert: 0.04,
};

/**
 * How many observation points a band can average into a better answer.
 * ⭐ Competence decides whether the inference is available at all: two
 * guesses under an untrained eye are two guesses, and the same two under
 * a practised one are a structure.
 */
export const SOLVE_FROM: Readonly<Record<CompetenceBandName, number>> = {
  untrained: Number.POSITIVE_INFINITY,
  novice: Number.POSITIVE_INFINITY,
  competent: 3,
  proficient: 3,
  expert: 2,
};

export abstract class GroundChannel extends GroundQueryMixin(Reading) {
  /**
   * The inherited {@link GroundQuery} reads, typed.
   *
   * ⚠ Not decoration: TypeScript does not surface a mixin's members on
   * `this` inside a class whose base is built from a type parameter. One
   * accessor rather than a cast at every call site — `WorkingMixin` over
   * `StrataMixin` is the precedent and carries the measurement.
   */
  protected get ground(): GroundQuery {
    return this as unknown as GroundQuery;
  }

  /**
   * The reader's band in this channel's own Discipline, and the depth
   * fraction it buys. ⭐ The band read itself is the LADDER's and the
   * row names the Discipline; what is drilling's is the table above.
   */
  protected async depthBandOf(giver: Stuff): Promise<{
    band: CompetenceBandName;
    fraction: number;
    solveFrom: number;
  }> {
    const band = await this.bandOf(giver);
    return {
      band,
      fraction: DEPTH_FRACTION[band],
      solveFrom: SOLVE_FROM[band],
    };
  }

  /**
   * ⭐ Whether this band can make an inference from observations at all
   * — `SOLVE_FROM` being finite, read as the predicate it already is.
   * Derived rather than re-listed, so the band vocabulary moving cannot
   * leave a second copy of the answer in another file.
   */
  protected solvesStructure(band: CompetenceBandName): boolean {
    return Number.isFinite(SOLVE_FROM[band]);
  }
}
