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
 * TypeScript has single inheritance.** A named NPC may also carry a
 * capability; `Extra`/`Cast` as base classes cannot express that — it is
 * a diamond. The codebase had already answered this one line away:
 * `Mercenary = PartyMemberMixin(NPC)` is the capability axis *already*
 * expressed as a mixin over the substrate and given a name. So
 * combinations stay one-liners in the shipped idiom.
 *
 * ⚠ **What a job lets you do is NOT one of those axes.** The seven
 * `Crafter` rows — `CastMixin(MakerMixin(NPC))` — were the standing
 * counter-example until the trades-and-labor build retired the marker:
 * *who serves an `order` here* is the SEAT's (`Position.fulfills`, read
 * off the shift), so the bar staff, the smith and the cook are plain
 * `Cast` and a PLAYER who takes the same seat is served from exactly the
 * same read. A capability nobody can compose is a capability no player
 * can ever hold.
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
 * (`EmployedMixin.institutionPath`) is a **second** attribution rather
 * than a replacement projection.
 *
 * ## Promotion
 *
 * There is no runtime transition to build. Identity is a stamp and
 * `setTemplatePath` re-keys the registry index, so promoting an extra
 * means **authoring a `Cast` row** — an authoring act, not a mechanic.
 */

import type { FieldMeta, MixinConstructor } from '../mixin';
import { SingletonMixin } from '../stuff/Singleton';
import { NamedMixin, type Named } from '../description/Named';
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

/** Public method surface. The dossier fields are applier-facing. */
export interface Cast extends Named {
  /** The archetype that minted this character's seeded rows, or `''`. */
  getArchetype(): string;
  /** The authored prologue lines, in order. */
  getPrologue(): readonly string[];
  /** The authored competence assertions. */
  getCompetenceClaims(): readonly CompetenceClaim[];
  /** The authored reputation assertions. */
  getRenownClaims(): readonly RenownClaim[];
  /**
   * @hook The template applier's phase-3 call for `prologue:` — the
   *   founding history into the chronicle, once. The ledger's own
   *   skip-if-a-claim-exists read is what makes a re-clone safe.
   */
  seedPrologue(lines: readonly string[]): Promise<void>;
  /**
   * @hook The template applier's phase-3 call for `renown:`. Idempotent
   *   by construction — it writes only the evidence the assertion still
   *   needs.
   */
  seedRenown(claims: readonly RenownClaim[]): Promise<void>;
  /**
   * @hook The template applier's phase-3 call for `competence:` — a
   *   seeded run of signature work credited to the transcript, once.
   */
  seedCompetence(claims: readonly CompetenceClaim[]): Promise<void>;
}

export function CastMixin<TBase extends MixinConstructor>(Base: TBase) {
  // ⭐⭐ **NamedMixin is composed HERE, on the rung that means somebody.**
  // A proper name belongs to a person, not to every body: it was on the
  // creature base, so a wolf, a corpse and a head of stock all carried
  // name-shaped surface an author could fill in by accident — and the
  // object branch's own header already stated the rule it broke
  // ("names are for proper names, not generic descriptions").
  //
  // ⚠ A `Cast` may still have NO name — the collier, the smelterman —
  // and that is what `register: definite` says. Carrying the FIELD is
  // the rung's claim; filling it in is the author's choice.
  // ⚠ No `implements Cast`: the interface extends `Named`, whose members
  // arrive from the base chain, and a class-factory mixin's `implements`
  // clause cannot see through a generic `Base`. `MixinApi.isCast` is
  // what threads the contract (`obj is Stuff & Cast`), and it is the
  // surface every caller actually narrows through.
  return class CastMixin extends SingletonMixin(NamedMixin(Base)) {
    static _mixinName = 'CastMixin';

    static fieldMeta: FieldMeta = {
      archetype: { persistent: true, authorable: true },
      // ⭐ The three dossier channels are `seed: true` — the template
      // applier's phase 3 hands each to the ledger that owns the truth,
      // at mint only. They stay `persistent` as well, because the
      // authored value is what the row round-trips and what
      // `getRenownClaims()` / `getCompetenceClaims()` read back.
      prologue: { persistent: true, authorable: true, seed: true },
      competence: { persistent: true, authorable: true, seed: true },
      renown: { persistent: true, authorable: true, seed: true },
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

    // ⭐⭐ **There is no `onCreate` override on this rung any more**, and
    // its absence is the point of the hydration build.
    //
    // It used to do two jobs, and neither belonged at birth in a hook:
    //
    //   - **read this rung's memory back.** A `Cast` is a singleton, so
    //     its template path IS a durable key (`viewerKey`, row 3) and
    //     its regard had been written through on every change since the
    //     belief store shipped — but nothing ever read it, so an NPC's
    //     opinion of you reset on every restart while the records piled
    //     up unread in Mongo. That is `BeliefStoreMixin.hydrationSource`
    //     now, driven by the clone pipeline whether or not the host has
    //     a record — which is what makes it reach a singleton at all.
    //   - **seed the authored dossier.** That is the template applier's
    //     phase 3: `prologue`/`renown`/`competence` are `seed: true`
    //     fields with the three appliers below.
    //
    // ⭐ And the ORDER the old hook needed is an invariant of the
    // pipeline now rather than two lines in one method: every eager
    // source completes before `onCreate` begins, so a hydrated history
    // is visible to anything that runs at birth.

    /**
     * Phase-3 applier for the authored `prologue:` — the founding history,
     * written into the chronicle as `claim` entries, in order.
     *
     * ⚠ **Idempotent, once, and the guard is the LEDGER's.** The applier
     * decides *when* (mint only — never go-live, never restore); only the
     * chronicle knows whether this history is already written, because a
     * re-clone after a destruct is a genuinely new mint. A written history
     * applied twice must not count twice; that is an acceptance criterion,
     * not a nicety.
     */
    public async seedPrologue(lines: readonly string[]): Promise<void> {
      if (!lines.length) return;
      const self = this as unknown as Stuff;
      if (!MixinApi.isPersona(self)) return;
      const stamp = this.archetype || '';
      const existing = await self.chronicleEntries();
      if (existing.some((e) => e.kind === 'claim')) return;
      await self.seedChronicleClaims(
        lines.map((text, i) => ({ text, order: i, archetype: stamp })),
      );
    }

    /**
     * Phase-3 applier for the authored `renown:` claims.
     *
     * ⭐ Idempotent by CONSTRUCTION rather than by a guard: the seeder
     * counts the evidence already on the log and writes only what the
     * assertion still needs, so a re-clone or a reboot adds nothing. That
     * is a stronger property than the skip-if-any-claim-exists check the
     * other two channels use, and it is available here because renown's
     * evidence is quantitative.
     */
    public async seedRenown(claims: readonly RenownClaim[]): Promise<void> {
      if (!claims.length) return;
      const self = this as unknown as Stuff;
      const subject = self.getIdentityPath();
      if (!subject) return;
      for (const claim of claims) {
        await RenownApi.seedTo(subject, claim.scope ?? null, claim.asserting);
      }
    }

    /**
     * Phase-3 applier for the authored `competence:` claims — a seeded
     * run of signature work at the difficulty the asserted band licenses,
     * credited to the transcript as `claim` evidence.
     *
     * ⚠ Same ledger-owned idempotence as {@link seedPrologue}.
     */
    public async seedCompetence(
      claims: readonly CompetenceClaim[],
    ): Promise<void> {
      if (!claims.length) return;
      const self = this as unknown as Stuff;
      if (!MixinApi.isAdvancing(self)) return;
      const stamp = this.archetype || '';
      const existing = await self.transcriptEntries();
      if (existing.some((e) => e.kind === 'claim')) return;
      for (const claim of claims) {
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
  };
}
