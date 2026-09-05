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
import type { CompetenceBandName } from '../advancement/CompetenceBand';
import type { Stuff } from '../stuff/Stuff';
import { RenownApi } from '../../api/renown';
import type { BandName } from '../standing/Band';

/** One asserted competence: a Discipline and the band it should read as. */
export interface CompetenceClaim {
  discipline: string;
  asserting: CompetenceBandName;
}

/**
 * One asserted reputation: how well known, and where. `scope` omitted =
 * Compact-wide.
 *
 * ⭐⭐ **This does NOT give an NPC a place in the Compact, and it needs no
 * rule to hold.** Political weight is `max(0, renown) × participation`;
 * participation is the quantity half, earned by turning up, and nobody
 * turns up on an NPC's behalf. So Dave can be famous in the lounge and
 * politically weightless, and the product is exactly zero — no gate to
 * forget, no special case to maintain. **The Compact stays players-only
 * by ARITHMETIC.**
 */
export interface RenownClaim {
  scope?: string;
  asserting: BandName;
}

/** Public method surface. The dossier fields are Hydrator-facing. */
export interface Cast {
  /** The archetype that minted this character's seeded rows, or `''`. */
  getArchetype(): string;
  /** The authored prologue lines, in order. */
  getPrologue(): readonly string[];
  /** The authored competence assertions. */
  getCompetenceClaims(): readonly CompetenceClaim[];
  /** The authored reputation assertions. */
  getRenownClaims(): readonly RenownClaim[];
}

export function CastMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class CastMixin extends SingletonMixin(Base) implements Cast {
    static _mixinName = 'CastMixin';

    static fieldMeta: FieldMeta = {
      archetype: { persistent: true, authorable: true },
      prologue: { persistent: true, authorable: true },
      competence: { persistent: true, authorable: true },
      renown: { persistent: true, authorable: true },
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

    /**
     * Authored reputation assertions — `{scope?, asserting}`. ⚠ There is
     * deliberately no `participation:` here and never will be: that zero
     * is what keeps an authored character out of the Compact, and it
     * wants no rule to hold.
     */
    public renown: RenownClaim[] = [];

    public getArchetype(): string {
      return this.archetype;
    }

    public getPrologue(): readonly string[] {
      return this.prologue;
    }

    public getCompetenceClaims(): readonly CompetenceClaim[] {
      return this.competence;
    }

    public getRenownClaims(): readonly RenownClaim[] {
      return this.renown;
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

      if (this.renown.length) {
        const subject = self.getIdentityPath();
        if (subject) {
          for (const claim of this.renown) {
            // ⭐ Idempotent by CONSTRUCTION rather than by a guard: the
            // seeder counts the evidence already on the log and writes
            // only what the assertion still needs, so a re-clone or a
            // reboot adds nothing. That is a stronger property than the
            // skip-if-any-claim-exists check the other two channels use,
            // and it is available here because renown's evidence is
            // quantitative.
            await RenownApi.seedTo(
              subject,
              claim.scope ?? null,
              claim.asserting,
            );
          }
        }
      }

      if (this.competence.length && MixinApi.isAdvancing(self)) {
        const existing = await self.transcriptEntries();
        if (!existing.some((e) => e.kind === 'claim')) {
          for (const claim of this.competence) {
            const run = Competence.seedRunFor(claim.asserting);
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
