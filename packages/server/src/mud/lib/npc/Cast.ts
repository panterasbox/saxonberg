/**
 * CastMixin — **the identity rung.**
 *
 * A character is either **somebody** or **a role somebody fills**, and the
 * shipped prose has been saying which all along without being asked to:
 * of 39 written characters, 26 carry a proper name, and the rest split on
 * the article — *a* sentry, *a* sellsword, *a* hewer on tutwork, against
 * *the* collier, *the* smelterman, *the* storekeeper. This mixin is the
 * world agreeing with the prose.
 *
 * ⭐⭐ **It is a mixin because identity and capability are TWO AXES and
 * TypeScript has single inheritance.** Dave must be a `Crafter` *and*
 * cast; `Extra`/`Cast` as base classes cannot express that — it is a
 * diamond. The codebase had already answered this one line away:
 * `Crafter = MakerMixin(NPC)` and `Mercenary = PartyMemberMixin(NPC)`
 * are the capability axis *already* expressed as a mixin over the
 * substrate and given a name. So combinations stay one-liners in the
 * shipped idiom: `Crafter = CastMixin(MakerMixin(NPC))`.
 *
 * ⚠⚠ **A correlation trap to refuse.** All seven `Crafter` rows carry a
 * proper name and the one `Mercenary` does not, so capability and
 * identity look perfectly correlated today. **They are not.** That is a
 * 39-row accident of the same species as *every NPC row is instanced
 * exactly once*, and collapsing the axes on the strength of it would bake
 * the accident into the type system.
 *
 * ## What it carries
 *
 * `SingletonMixin`, and that is the whole enforcement: `StuffApi.clone`
 * refuses a second live instance for a path whose class composes it, so
 * *"there is only one Odile"* is a throw rather than a convention. An
 * `Extra` is deliberately un-singleton — two sentries are the point.
 *
 * ⭐ **Identity resolution is UNCHANGED by this mixin.** Neither rung
 * touches `getIdentityPath()`. An `Extra` keeps its own identity (two
 * dead sentries do not collapse into one corpse); what an Extra lacks is
 * a *person* to attribute to, which is why the institutional attribution
 * (`AffiliatedMixin`) is a **second** attribution rather than a
 * replacement projection.
 *
 * ## Promotion
 *
 * There is no runtime transition to build. Identity is a stamp and
 * `setTemplatePath` re-keys the registry index, so promoting an extra
 * means **authoring a `Cast` row** — an authoring act, not a mechanic.
 */

import type { FieldMeta, MixinConstructor } from '../mixin';
import { SingletonMixin } from '../stuff/Singleton';
import { MixinApi } from '../../api/mixin';
import { Competence } from '../advancement/Competence';
import {
  CompetenceBand,
  type CompetenceBandName,
} from '../advancement/CompetenceBand';
import type { Difficulty } from '../advancement/ActSignature';
import type { Stuff } from '../stuff/Stuff';

/** One asserted competence: a Discipline and the band it should read as. */
export interface CompetenceClaim {
  discipline: string;
  asserting: CompetenceBandName;
}

/** Public method surface. The dossier fields are Hydrator-facing. */
export interface Cast {
  /** The archetype that minted this character's seeded rows, or `''`. */
  getArchetype(): string;
  /** The authored prologue lines, in order. */
  getPrologue(): readonly string[];
  /** The authored competence assertions. */
  getCompetenceClaims(): readonly CompetenceClaim[];
}

/**
 * ⭐⭐ **The ladder that turns an asserted band into evidence** — and the
 * reason it is SEARCHED rather than tabulated.
 *
 * D4: a competence claim is **seeded evidence**, not a declared floor.
 * Advancement named this fork and could not settle it ("which differ on
 * whether `bandOf` stays a pure derivation"); the chronicle/trait
 * precedent had already answered it — seed evidence, mark it `claim`, and
 * the derivation stays pure. A floor felt necessary only because nobody
 * had the claim marker in view.
 *
 * So the seeder appends `claim` rows until `Competence.bandOf` *derives*
 * the asserted band, reading the shipped estimator rather than a table of
 * numbers. Re-legislate the estimator and the seeds follow — the same
 * property that makes the ledger re-scorable.
 *
 * ⚠⚠ **And the search is not decoration: a fixed difficulty CANNOT reach
 * every band.** Measured against the shipped constants, a run of `easy`
 * successes **saturates at θ≈0.612** — it can never reach `proficient`,
 * however many you write — while `hard` reaches `expert` in four. That is
 * the estimator's desirable-difficulty design showing through, and it
 * means something true about the world: ⭐ **you do not become an expert
 * by doing ordinary things very often.** Difficulties are tried in
 * ASCENDING order so a character's seeded history is the gentlest one
 * that honestly warrants the claim — a competent bartender has worked a
 * great many ordinary shifts; an expert one has done hard things.
 */
const SEED_DIFFICULTIES: readonly Difficulty[] = [
  'easy',
  'standard',
  'hard',
  'formidable',
];

/** How many rows the search will append before giving up on a band. */
const SEED_CAP = 40;

/**
 * The shortest run of `(difficulty, success)` rows whose fold lands
 * exactly on `band`, or `null` when no run reaches it.
 */
export function seedRunFor(
  band: CompetenceBandName,
): { difficulty: Difficulty; count: number } | null {
  if (band === CompetenceBand.FLOOR) return { difficulty: 'easy', count: 0 };
  for (const difficulty of SEED_DIFFICULTIES) {
    const evidence: { difficulty: Difficulty; outcome: 'success'; when: null }[] =
      [];
    for (let n = 1; n <= SEED_CAP; n++) {
      evidence.push({ difficulty, outcome: 'success', when: null });
      if (Competence.bandOf(evidence) === band) {
        return { difficulty, count: n };
      }
    }
  }
  return null;
}

export function CastMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class CastMixin extends SingletonMixin(Base) implements Cast {
    static _mixinName = 'CastMixin';

    static fieldMeta: FieldMeta = {
      archetype: { persistent: true, authorable: true },
      prologue: { persistent: true, authorable: true },
      competence: { persistent: true, authorable: true },
    };

    /**
     * ⭐ The archetype that minted this dossier. Stamped onto every row
     * the seeder writes, because `deviation = current derived −
     * archetype baseline` is uncomputable without it and provenance
     * separability cannot be retrofitted.
     */
    public archetype = '';

    /** Authored prologue lines — the founding history, in order. */
    public prologue: string[] = [];

    /** Authored competence assertions — `{discipline, asserting}`. */
    public competence: CompetenceClaim[] = [];

    public getArchetype(): string {
      return this.archetype;
    }

    public getPrologue(): readonly string[] {
      return this.prologue;
    }

    public getCompetenceClaims(): readonly CompetenceClaim[] {
      return this.competence;
    }

    public async postRegister(context?: unknown): Promise<void> {
      const sup = (
        Base.prototype as {
          postRegister?: (c?: unknown) => unknown | Promise<unknown>;
        }
      ).postRegister;
      if (typeof sup === 'function') await sup.call(this, context);
      await this._seedDossier();
    }

    /**
     * ⚠ **Idempotent, once** — the `dispositions:` precedent exactly.
     * Applied at `postRegister` and skipped when any `claim` row already
     * exists, so a re-clone, a reboot or a CMS go-live cannot mint a
     * second history. A written history applied twice must not count
     * twice; that is an acceptance criterion, not a nicety.
     */
    private async _seedDossier(): Promise<void> {
      const self = this as unknown as Stuff;
      const stamp = this.archetype || '';

      if (this.prologue.length && MixinApi.isPersona(self)) {
        const existing = await self.chronicleEntries();
        if (!existing.some((e) => e.kind === 'claim')) {
          await self.seedChronicleClaims(
            this.prologue.map((text, i) => ({
              text,
              order: i,
              archetype: stamp,
            })),
          );
        }
      }

      if (this.competence.length && MixinApi.isAdvancing(self)) {
        const existing = await self.transcriptEntries();
        if (!existing.some((e) => e.kind === 'claim')) {
          for (const claim of this.competence) {
            const run = seedRunFor(claim.asserting);
            if (!run) continue;
            for (let i = 0; i < run.count; i++) {
              await self.creditSignature(
                {
                  discipline: [
                    {
                      discipline: claim.discipline,
                      difficulty: run.difficulty,
                      outcome: 'success',
                    },
                  ],
                },
                { kind: 'claim', when: null, archetype: stamp },
              );
            }
          }
        }
      }
    }
  };
}
