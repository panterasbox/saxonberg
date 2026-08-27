/**
 * AdvancementMixin — the per-character surface of the advancement
 * subsystem: the conferral affordance source and the bands-only self-view
 * verb.
 *
 * Advancement holds no per-character runtime state (Competence is
 * derive-on-read, the Transcript lives as Documents), so this mixin owns
 * no fields. It does two things:
 *
 *   1. **Affords the self-view** (`competence`) via a static
 *      `commandContributions.self`, collected by the affordance walk
 *      exactly like `PersonaMixin`'s `chronicle` verb.
 *   2. **Hosts the conferral source.** Crossing a competence band confers
 *      the Discipline's band-gated verbs (the knowing→doing seam). Because
 *      Competence is derive-on-read, a band crossing has no event — the
 *      only band-mover is a Transcript append, so `AdvancementApi`
 *      re-invokes {@link refreshConferrals} after every append. The verbs
 *      ride the push-based affordance stack (the hosted-update pattern),
 *      sourced from the `DisciplineCatalogue` so `getAffordances` resolves
 *      their `commandSource` to "the catalog / your competence."
 */

import type { Stuff } from "../stuff/Stuff";
import type { MixinConstructor } from "../mixin";
import type { CommandGiver } from "../command/CommandGiver";
import type { CommandDefinition } from "../command/CommandDefinition";
import type { CommandContributions } from "../../api/command";
import type { SubscribableFieldDescriptor } from "../../api/mql-subscription";
import { CommandApi } from "../../api/command";
import { AdvancementApi } from "../../api/advancement";
import { StuffApi } from "../../api/stuff";
import { TemplatePaths } from "../paths";

/** Public shape provided by AdvancementMixin. */
export interface Advancing {
  refreshConferrals(): Promise<void>;
}

/**
 * Who may read a host's competence, and the subject key to read it
 * under. Returns `undefined` to withhold the field entirely.
 *
 * ⭐ **The player/NPC asymmetry is the whole point of this function.**
 *
 * A **player's** competence is theirs: self-only, exactly as it was when
 * these descriptors lived on `Avatar`. Widening that would be a privacy
 * change, and this refactor is not the place to make one.
 *
 * An **NPC's** competence is a fact about the world — Dave being good
 * behind a bar is a thing you can learn about Dave — so any viewer may
 * read it. Without this arm the descriptors would be *defined* on every
 * `AdvancementMixin` host and *answerable* on none of them, because an
 * NPC never subscribes on its own behalf. That would make the move to
 * the mixin cosmetic.
 *
 * ⚠ `getPlayerId()` is the existing, documented player-vs-NPC
 * distinction (`null` for any body no account controls). It is not a
 * new axis invented here.
 */
function competenceSubject(stuff: Stuff, viewer: Stuff): string | undefined {
  const subject = stuff.getIdentityPath() ?? undefined;
  if (!subject) return undefined;
  if (stuff.getPlayerId() !== null) {
    // Player-controlled: self-only.
    return viewer?.stuffId === stuff.stuffId ? subject : undefined;
  }
  return subject;
}

export function AdvancementMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase
) {
  return class AdvancementMixin extends Base {
    static _mixinName = "AdvancementMixin";

    /**
     * The bands-only self-view. Zero-arg, read-only, self-only — the
     * `chronicle`-verb shape. Afforded statically; the conferred verbs
     * (below) are pushed dynamically.
     */
    static commandContributions: CommandContributions = {
      self: ["platform/cmd/charactergen/competence.yaml"],
      peers: [],
      environment: [],
    };

    /**
     * The competence read surfaces — **on the mixin that owns the
     * subsystem, not on `Avatar`.**
     *
     * They lived on `Avatar` and were moved here: a descriptor gated on
     * a mixin belongs to that mixin (the same rule that relocated
     * `primaryKeyword` onto `PerceptibleMixin`). Keeping them on
     * `Avatar` quietly encoded *competence is a player dashboard
     * figure*, which is exactly the assumption the advancement
     * substrate does not make — `ownerKey` is `getIdentityPath()`, so
     * an NPC has always been able to own a Transcript.
     *
     * `Character` composes this mixin, so every NPC gets these for free
     * and player and NPC competence are expressed the same way.
     *
     * ⚠ Uniform **expression**, not uniform authoring. Nothing writes an
     * NPC's Transcript except combat, so most NPCs still read as the
     * floor. Making Dave good at bartending needs an authoring path that
     * does not exist yet; this only ensures that when it lands, the read
     * side already works.
     */
    static subscribableFields: SubscribableFieldDescriptor[] = [
      {
        name: "practisingCompetence",
        read: (stuff, viewer) => {
          if (!competenceSubject(stuff, viewer)) return undefined;
          const c = AdvancementApi.practisingCompetenceCached(stuff);
          if (c === undefined) return undefined;
          return c === null ? null : { discipline: c.discipline, band: c.band };
        },
        durableKey: (stuff) => stuff.getIdentityPath() ?? undefined,
      },
      {
        /**
         * The whole projection — every Discipline with evidence and its
         * band. `practisingCompetence` answers *what am I working on*;
         * this answers *what do I know*.
         *
         * ⚠ Derive-on-read; no stored total. The band is already a
         * derivation over an append-only ledger, so caching a total
         * would be a second source of truth for a number the ledger
         * owns.
         */
        name: "competenceDigest",
        read: (stuff, viewer) => {
          if (!competenceSubject(stuff, viewer)) return undefined;
          const bands = AdvancementApi.competenceDigestCached(stuff);
          if (bands === undefined) return undefined;
          return {
            disciplines: bands.map((b) => ({
              discipline: b.discipline,
              band: b.band,
            })),
          };
        },
        durableKey: (stuff) => stuff.getIdentityPath() ?? undefined,
      },
    ];

    /**
     * Re-evaluate this character's competence-conferred verbs and reconcile
     * the affordance stack: drop the prior conferral entry, then re-push
     * the current set (idempotent pop + conditional push, mirroring the
     * hosted-update delta). Called by `AdvancementApi` after each Transcript
     * append. No-op before the Catalog warms.
     */
    async refreshConferrals(): Promise<void> {
      const catalogue = StuffApi.findByTemplatePath(
        TemplatePaths.disciplineCatalogue
      );
      if (!catalogue) return;
      // The host is always a CommandGiver in practice (AdvancementMixin is
      // composed above CommandGiverMixin on Character), but the base isn't
      // type-constrained to it — narrow like Mobile does for its
      // CommandGiver calls.
      const giver = this as unknown as Stuff & CommandGiver;
      const verbs = await AdvancementApi.conferredVerbs(giver);
      const defs: CommandDefinition[] = [];
      for (const verb of verbs) {
        const def = CommandApi.getCommand(verb);
        if (def) defs.push(def);
      }
      // The catalogue is the affording source — attribution resolves to
      // "your competence in the catalog." Pop the old entry unconditionally
      // (a band may have dropped), re-push only if anything is conferred.
      giver.popCommandSource(catalogue);
      if (defs.length > 0) {
        giver.pushCommandSource(catalogue, "self", defs);
      }
    }
  };
}
