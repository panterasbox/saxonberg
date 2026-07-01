// AdvancementLogic — the hot-reloadable logic singleton behind
// AdvancementApi. (Doc comment on the class below so @internal lands on
// the reflection.)

import { Idea } from "../../lib/stuff/Idea";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import type { Stuff } from "../../lib/stuff/Stuff";
import TranscriptEntry from "../../lib/advancement/TranscriptEntry";
import type { TranscriptEntryFields } from "../../lib/advancement/TranscriptEntry";
import type {
  ActSignature,
  Subcheck,
} from "../../lib/advancement/ActSignature";
import { Competence } from "../../lib/advancement/Competence";
import {
  CompetenceBand,
  type CompetenceBandName,
} from "../../lib/advancement/CompetenceBand";
import { WorldClockApi } from "../../api/worldclock";
import { PersistApi } from "../../api/persist";
import { StuffApi } from "../../api/stuff";
import { MixinApi } from "../../api/mixin";
import { Mixins } from "../../lib/mixin";
import { TemplatePaths } from "../../lib/paths";
import type DisciplineCatalogue from "../DisciplineCatalogue";
import type { RecordOptions, DisciplineBand } from "../../api/advancement";

/**
 * A host whose conferred affordances can be refreshed. Narrowed
 * structurally (via `Mixins.Competence`) rather than importing the mixin —
 * keeps the logic free of a command-layer back-import.
 */
interface ConferralRefreshable {
  refreshConferrals(): Promise<void>;
}

const AdvancementApiCallers = SecurityPolicies.FromModule("/api/advancement#AdvancementApi"
);

/** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
function active(): boolean {
  return PersistApi.isConnected();
}

/** The durable owner key, or `null` for a session-ephemeral owner. */
function ownerKey(owner: Stuff): string | null {
  return owner.getTemplatePath();
}

/**
 * The single build seam: resolve one sub-check + act context into one
 * persisted {@link TranscriptEntry}. Stamps the game-time witness when
 * `when` is omitted so callers never re-derive game-time. A module-private
 * free function (an intra-singleton self-call would trip the gate).
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
  await entry.save();
}

/**
 * Explode one authored act into its Transcript rows: one row per
 * Discipline sub-check, sharing the act-level `kind` / `when` / `tags`.
 * The `dispositionValence` channel is read-but-ignored — the
 * defined-but-empty lane-1 trait seam. No-ops without a durable owner key
 * or an active connection.
 */
async function recordSignatureImpl(
  owner: Stuff,
  signature: ActSignature,
  opts: RecordOptions
): Promise<void> {
  if (!active()) return;
  const ownerId = ownerKey(owner);
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
    });
  }
  // A Transcript append is the only band-mover; since Competence is
  // derive-on-read, a band crossing has no event of its own. Re-evaluate
  // the owner's conferred affordances now (the knowing→doing seam).
  if (MixinApi.hasMixin(owner, Mixins.Advancement)) {
    await (owner as unknown as ConferralRefreshable).refreshConferrals();
  }
}

/** The live DisciplineCatalogue singleton, or `null` before it warms. */
function catalogue(): DisciplineCatalogue | null {
  return (
    (StuffApi.findByTemplatePath(
      TemplatePaths.disciplineCatalogue
    ) as DisciplineCatalogue | null) ?? null
  );
}

/** Group an owner's evidence by Discipline and derive each band. */
async function bandsForImpl(owner: Stuff): Promise<DisciplineBand[]> {
  if (!active()) return [];
  const ownerId = ownerKey(owner);
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
 * The verb yaml-paths the owner's current bands confer: for each evidenced
 * Discipline, every conferral rule the band meets contributes its verbs.
 * Deduped + sorted. The command-layer resolution + push lives in
 * `CompetenceMixin`; this is the pure band×catalogue decision.
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
 * AdvancementLogic — the hot-reloadable logic singleton behind
 * {@link AdvancementApi}.
 *
 * Lives at `/obj/api/advancement` (a stateless `Stuff` singleton, no
 * backing `Template`); `AdvancementApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Internal sub-logic lives in module-private
 * free functions so there are no intra-singleton `this.x()` calls to trip
 * the gate; each public method carries the `FromModule` gate.
 *
 * @internal
 */
@Unshadowable
export class AdvancementLogic extends Idea {
  /** See {@link AdvancementApi.recordSignature}. */
  @CallSecurity(AdvancementApiCallers)
  public async recordSignature(
    owner: Stuff,
    signature: ActSignature,
    opts: RecordOptions = {}
  ): Promise<void> {
    return recordSignatureImpl(owner, signature, opts);
  }

  /** See {@link AdvancementApi.recordDeed}. */
  @CallSecurity(AdvancementApiCallers)
  public async recordDeed(
    owner: Stuff,
    subcheck: Subcheck,
    opts: RecordOptions = {}
  ): Promise<void> {
    return recordSignatureImpl(
      owner,
      { discipline: [subcheck] },
      { ...opts, kind: "deed" }
    );
  }

  /** See {@link AdvancementApi.entriesFor}. */
  @CallSecurity(AdvancementApiCallers)
  public async entriesFor(
    owner: Stuff,
    discipline?: string
  ): Promise<TranscriptEntry[]> {
    if (!active()) return [];
    const ownerId = ownerKey(owner);
    if (!ownerId) return [];
    const query: Record<string, unknown> =
      discipline === undefined
        ? { owner: ownerId }
        : { owner: ownerId, discipline };
    return TranscriptEntry.find(query);
  }

  /** See {@link AdvancementApi.bandFor}. */
  @CallSecurity(AdvancementApiCallers)
  public async bandFor(
    owner: Stuff,
    discipline: string
  ): Promise<CompetenceBandName> {
    if (!active()) return CompetenceBand.FLOOR;
    const ownerId = ownerKey(owner);
    if (!ownerId) return CompetenceBand.FLOOR;
    const entries = await TranscriptEntry.find({ owner: ownerId, discipline });
    return Competence.bandOf(entries);
  }

  /** See {@link AdvancementApi.bandsFor}. */
  @CallSecurity(AdvancementApiCallers)
  public async bandsFor(owner: Stuff): Promise<DisciplineBand[]> {
    return bandsForImpl(owner);
  }

  /** See {@link AdvancementApi.conferredVerbs}. */
  @CallSecurity(AdvancementApiCallers)
  public async conferredVerbs(owner: Stuff): Promise<string[]> {
    return conferredVerbsImpl(owner);
  }
}
