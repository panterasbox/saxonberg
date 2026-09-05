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
import { StuffApi } from "../../api/stuff";
import { TemplatePaths } from "../paths";
import TranscriptEntry from "./TranscriptEntry";
import type { TranscriptEntryFields } from "./TranscriptEntry";
import type { ActSignature, Subcheck } from "./ActSignature";
import { Competence } from "./Competence";
import {
  CompetenceBand,
  type CompetenceBandName,
} from "./CompetenceBand";
import { WorldClockApi } from "../../api/worldclock";
import { PersistApi } from "../../api/persist";
import { MixinApi } from "../../api/mixin";
import { DerivedStandingCache } from "../standing/DerivedStandingCache";
import { MqlSubscriptionApi } from "../../api/mql-subscription";
import { Final, Unshadowable } from "../security/decorators";

/** Act-level context shared by every sub-check row of one act. */
export interface RecordOptions {
  kind?: "deed" | "claim";
  /** Game-time seconds; defaults to the witness clock when omitted. */
  when?: number | null;
  tags?: string[];
  /** The minting archetype (claims only) — see `TranscriptEntry.archetype`. */
  archetype?: string;
}

/** A Discipline the owner has evidence in, with its current band. */
export interface DisciplineBand {
  discipline: string;
  band: CompetenceBandName;
}

/* ────────── the transcript mint + estimator (module-private) ──────────
 * Moved in whole from the retired AdvancementLogic (the ledger owner
 * face of the Api OO sweep).
 */

/** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
function transcriptActive(): boolean {
  return PersistApi.isConnected();
}

/** The durable owner key, or `null` for a session-ephemeral owner. */
function ownerKeyOf(owner: Stuff): string | null {
  return owner.getIdentityPath();
}

/**
 * The single build seam: resolve one sub-check + act context into one
 * persisted {@link TranscriptEntry}. Stamps the game-time witness when
 * `when` is omitted so callers never re-derive game-time.
 */
async function buildAndSave(
  ownerId: string,
  fields: TranscriptEntryFields
): Promise<void> {
  const entry = new TranscriptEntry();
  entry.owner = ownerId;
  entry.kind = fields.kind ?? "deed";
  entry.when = fields.when ?? WorldClockApi.getNow().rawValue();
  entry.discipline = fields.discipline;
  entry.difficulty = fields.difficulty;
  entry.outcome = fields.outcome;
  entry.tags = fields.tags ?? [];
  entry.archetype = fields.archetype ?? "";
  await entry.save();
  // AFTER the write, never before. One call site covers creditSignature
  // AND creditDeed (creditDeed routes through creditSignatureImpl into
  // here). The cache refresh notifies once it has folded, so the poke
  // here is for the sync figures only.
  void practisingCache.refresh(entry.owner);
}

/**
 * Explode one authored act into its Transcript rows: one row per
 * Discipline sub-check, sharing the act-level `kind` / `when` / `tags`.
 * The `dispositionValence` channel is read-but-ignored — the
 * defined-but-empty lane-1 trait seam. No-ops without a durable owner
 * key or an active connection.
 */
async function creditSignatureImpl(
  owner: Stuff,
  signature: ActSignature,
  opts: RecordOptions
): Promise<void> {
  if (!transcriptActive()) return;
  const ownerId = ownerKeyOf(owner);
  if (!ownerId) return;
  // One shared act timestamp so every sub-check folds at the same point.
  const when = opts.when ?? WorldClockApi.getNow().rawValue();
  for (const sub of signature.discipline) {
    await buildAndSave(ownerId, {
      kind: opts.kind,
      discipline: sub.discipline,
      difficulty: sub.difficulty,
      outcome: sub.outcome,
      when,
      tags: opts.tags,
      archetype: opts.archetype,
    });
  }
}

/** The live DisciplineCatalogue singleton's conferral face (duck-typed —
 * lib does not import the platform class), or `null` before it warms. */
function catalogue(): {
  getConferrals(discipline: string): { band: CompetenceBandName; verbs: string[] }[];
} | null {
  return (
    (StuffApi.findByTemplatePath(
      TemplatePaths.disciplineCatalogue
    ) as unknown as {
      getConferrals(
        discipline: string
      ): { band: CompetenceBandName; verbs: string[] }[];
    } | null) ?? null
  );
}

/** Group an owner's evidence by Discipline and derive each band. */
async function bandsForImpl(owner: Stuff): Promise<DisciplineBand[]> {
  if (!transcriptActive()) return [];
  const ownerId = ownerKeyOf(owner);
  if (!ownerId) return [];
  const entries = await TranscriptEntry.find({ owner: ownerId });
  const byDiscipline = new Map<string, TranscriptEntry[]>();
  for (const e of entries) {
    const bucket = byDiscipline.get(e.discipline) ?? [];
    bucket.push(e);
    byDiscipline.set(e.discipline, bucket);
  }
  return [...byDiscipline.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([discipline, rows]) => ({
      discipline,
      band: Competence.bandOf(rows),
    }));
}

/**
 * The verb yaml-paths the owner's current bands confer: for each
 * evidenced Discipline, every conferral rule the band meets contributes
 * its verbs. Deduped + sorted. The command-layer resolution + push lives
 * in {@link AdvancementMixin.refreshConferrals}; this is the pure
 * band×catalogue decision.
 */
async function conferredVerbsImpl(owner: Stuff): Promise<string[]> {
  const cat = catalogue();
  if (!cat) return [];
  const verbs = new Set<string>();
  for (const { discipline, band } of await bandsForImpl(owner)) {
    for (const rule of cat.getConferrals(discipline)) {
      if (CompetenceBand.atOrAbove(band, rule.band)) {
        for (const verb of rule.verbs) verbs.add(verb);
      }
    }
  }
  return [...verbs].sort();
}

/**
 * ⭐ The sync face of the async transcript ledger — see
 * {@link DerivedStandingCache}.
 */
const practisingCache = new DerivedStandingCache<DisciplineBand | null>(
  async (subject) => {
    const owner = StuffApi.findByTemplatePath(subject);
    if (!owner) return null;
    const bands = await bandsForImpl(owner);
    return bands[0] ?? null;
  },
  (subject) => MqlSubscriptionApi.notifyDurableSubject(subject)
);

/**
 * ⭐ The whole transcript projection, as a sync read — the **competence
 * digest**. `practisingCache` folds to the single discipline being
 * practised; this folds to every discipline with evidence.
 *
 * ⚠ **Derive-on-read, no stored total.** The band is already a
 * derivation over `transcripts`, so caching a total here would be a
 * second source of truth for a number the ledger owns. This is a *fold
 * cache*, invalidated by the ledger's own notify, not a stored figure.
 */
const digestCache = new DerivedStandingCache<DisciplineBand[]>(
  async (subject) => {
    const owner = StuffApi.findByTemplatePath(subject);
    if (!owner) return [];
    return bandsForImpl(owner);
  },
  (subject) => MqlSubscriptionApi.notifyDurableSubject(subject)
);

/** Public shape provided by AdvancementMixin. */
export interface Advancing {
  refreshConferrals(): Promise<void>;
  creditSignature(
    signature: ActSignature,
    opts?: RecordOptions
  ): Promise<void>;
  creditDeed(subcheck: Subcheck, opts?: RecordOptions): Promise<void>;
  transcriptEntries(discipline?: string): Promise<TranscriptEntry[]>;
  competenceBandFor(discipline: string): Promise<CompetenceBandName>;
  competenceBands(): Promise<DisciplineBand[]>;
  conferredVerbs(): Promise<string[]>;
  practisingCompetenceCached(): DisciplineBand | null | undefined;
  competenceDigestCached(): DisciplineBand[] | undefined;
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
  // Declared-then-returned (the Meltable shape) so method decorators
  // are legal — a class EXPRESSION cannot carry them.
  class AdvancementMixin extends Base {
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
          const c = MixinApi.isAdvancing(stuff)
            ? stuff.practisingCompetenceCached()
            : undefined;
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
          const bands = MixinApi.isAdvancing(stuff)
            ? stuff.competenceDigestCached()
            : undefined;
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
      const verbs = await conferredVerbsImpl(giver);
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

    /* ────────── the transcript owner face (the OO sweep) ──────────
     * P4 family names: `credit*` — this ledger credits evidence of
     * practice; `recordDeed` unqualified is the chronicle's.
     *
     * The mutators are UNGATED with the seal (the plan's C3 decision,
     * P5): the writer set is every acting controller and engagement in
     * the tree — kernel and packs alike — and a FromModule glob over
     * all controller trees is a worse contract than an honest ungated
     * seal. Recorded in Risks: sandbox/wizard code could grind a
     * transcript, exactly as it could through the retired Public
     * statics.
     */

    /**
     * The append primitive: explode one authored act into its
     * Transcript rows (one per Discipline sub-check), sharing the
     * act-level `kind` / `when` / `tags`. The disposition channel is
     * ignored (the lane-1 trait seam). Ends by re-evaluating the
     * conferred affordances — a Transcript append is the only
     * band-mover.
     */
    @Final
    @Unshadowable
    public async creditSignature(
      signature: ActSignature,
      opts: RecordOptions = {}
    ): Promise<void> {
      await creditSignatureImpl(this as unknown as Stuff, signature, opts);
      await this.refreshConferrals();
    }

    /**
     * Convenience over {@link creditSignature} for a single-Discipline
     * world demonstration: forces `kind: 'deed'`.
     */
    @Final
    @Unshadowable
    public async creditDeed(
      subcheck: Subcheck,
      opts: RecordOptions = {}
    ): Promise<void> {
      await creditSignatureImpl(
        this as unknown as Stuff,
        { discipline: [subcheck] },
        { ...opts, kind: "deed" }
      );
      await this.refreshConferrals();
    }

    /**
     * The owner-scoped reader. With `discipline`, returns only that
     * Discipline's rows (the slice the estimator folds). `[]` without a
     * durable owner key or when disconnected.
     */
    public async transcriptEntries(
      discipline?: string
    ): Promise<TranscriptEntry[]> {
      if (!transcriptActive()) return [];
      const ownerId = ownerKeyOf(this as unknown as Stuff);
      if (!ownerId) return [];
      const query: Record<string, unknown> =
        discipline === undefined
          ? { owner: ownerId }
          : { owner: ownerId, discipline };
      return TranscriptEntry.find(query);
    }

    /**
     * This owner's current competence **band** in one Discipline —
     * derived on read over (Discipline × Transcript), never stored.
     * **Bands only**: the internal scalar never crosses this surface
     * (the honesty firewall). The floor band without a durable owner
     * key or when disconnected.
     */
    public async competenceBandFor(
      discipline: string
    ): Promise<CompetenceBandName> {
      if (!transcriptActive()) return CompetenceBand.FLOOR;
      const ownerId = ownerKeyOf(this as unknown as Stuff);
      if (!ownerId) return CompetenceBand.FLOOR;
      const entries = await TranscriptEntry.find({
        owner: ownerId,
        discipline,
      });
      return Competence.bandOf(entries);
    }

    /**
     * Every Discipline this owner has evidence in, with its current
     * band — the read the self-view renders. Disciplines with no
     * evidence are absent (the floor is implicit).
     */
    public async competenceBands(): Promise<DisciplineBand[]> {
      return bandsForImpl(this as unknown as Stuff);
    }

    /**
     * The verb yaml-paths this owner's current competence confers
     * (band × Catalog conferral rules) — the decision behind the
     * knowing→doing seam.
     */
    public async conferredVerbs(): Promise<string[]> {
      return conferredVerbsImpl(this as unknown as Stuff);
    }

    /**
     * ⭐ The competence currently being practised, as a **sync** read —
     * the live standing field's surface. `undefined` means the fold has
     * not landed yet; `null` means folded with nothing to show.
     */
    public practisingCompetenceCached(): DisciplineBand | null | undefined {
      const key = ownerKeyOf(this as unknown as Stuff);
      return key === null ? undefined : practisingCache.get(key);
    }

    /**
     * ⭐ **The competence digest** — every Discipline with evidence and
     * its band, as a **sync** read. `undefined` means the fold has not
     * landed yet; an empty array means folded with no evidence.
     */
    public competenceDigestCached(): DisciplineBand[] | undefined {
      const key = ownerKeyOf(this as unknown as Stuff);
      return key === null ? undefined : digestCache.get(key);
    }
  }
  return AdvancementMixin;
}
