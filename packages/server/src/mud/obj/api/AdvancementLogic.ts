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

/** A Discipline the owner has evidence in, with its current band. */
export interface DisciplineBand {
  discipline: string;
  band: CompetenceBandName;
}

const AdvancementApiCallers = SecurityPolicies.FromModule(
  "mud/api/advancement#AdvancementApi"
);

/** Act-level context shared by every sub-check row of one act. */
export interface RecordOptions {
  kind?: "deed" | "claim";
  /** Game-time seconds; defaults to the witness clock when omitted. */
  when?: number | null;
  tags?: string[];
}

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
}
