// TraitLogic — the hot-reloadable logic singleton behind TraitApi. (Doc
// comment on the class below so @internal lands on the reflection.)

import { Idea } from "../../lib/stuff/Idea";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import type { Stuff } from "../../lib/stuff/Stuff";
import DispositionEntry from "../../lib/trait/DispositionEntry";
import type { DispositionEntryFields } from "../../lib/trait/DispositionEntry";
import type {
  ActSignature,
  DispositionSubcheck,
} from "../../lib/advancement/ActSignature";
import {
  TraitPosition,
  type AxisEstimate,
  type DispositionEvidence,
  type TraitDials,
  DEFAULT_TRAIT_DIALS,
} from "../../lib/trait/TraitPosition";
import { TraitBand } from "../../lib/trait/TraitBand";
import { WorldClockApi } from "../../api/worldclock";
import { PersistApi } from "../../api/persist";
import { AppApi } from "../../api/app";
import { AppSettingKeys } from "../../lib/config/AppSettings";
import { RegardApi } from "../../api/regard";
import type { RecordOptions, ClaimSeed } from "../../api/trait";

const TraitApiCallers = SecurityPolicies.FromModule("/api/trait#TraitApi");

/** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
function active(): boolean {
  return PersistApi.isConnected();
}

/** The durable owner key, or `null` for a session-ephemeral owner. */
function ownerKey(owner: Stuff): string | null {
  return owner.getTemplatePath();
}

/**
 * Read one numeric dial from AppSettings, falling back when the cache
 * isn't warmed (unit tests, pre-boot) or the value is malformed — so the
 * estimator stays usable without a running config.
 */
function settingNum(key: string, fallback: number): number {
  let raw = "";
  try {
    raw = AppApi.setting(key);
  } catch {
    return fallback;
  }
  const v = raw ? Number(raw) : NaN;
  return Number.isFinite(v) ? v : fallback;
}

/** The current estimator dials — AppSettings-driven, fallback-safe. */
function loadDials(): TraitDials {
  const halfLifeDays = settingNum(
    AppSettingKeys.traitsDecayHalfLifeDays,
    DEFAULT_TRAIT_DIALS.halfLifeSeconds / 86_400
  );
  return {
    halfLifeSeconds: halfLifeDays * 86_400,
    definedThreshold: settingNum(
      AppSettingKeys.traitsDefinedThreshold,
      DEFAULT_TRAIT_DIALS.definedThreshold
    ),
    entrenchedThreshold: settingNum(
      AppSettingKeys.traitsEntrenchedThreshold,
      DEFAULT_TRAIT_DIALS.entrenchedThreshold
    ),
    pronouncedThreshold: settingNum(
      AppSettingKeys.traitsPronouncedThreshold,
      DEFAULT_TRAIT_DIALS.pronouncedThreshold
    ),
  };
}

/**
 * The single build seam: resolve one disposition sub-check + act context
 * into one persisted {@link DispositionEntry}. Stamps the game-time
 * witness when `when` is omitted. A module-private free function (an
 * intra-singleton self-call would trip the gate).
 */
async function buildAndSave(
  ownerId: string,
  fields: DispositionEntryFields
): Promise<void> {
  const entry = new DispositionEntry();
  entry.owner = ownerId;
  entry.kind = fields.kind ?? "deed";
  entry.when = fields.when ?? WorldClockApi.getNow().rawValue();
  entry.disposition = fields.disposition;
  entry.valence = fields.valence;
  entry.tags = fields.tags ?? [];
  await entry.save();
}

/**
 * Explode one authored act's disposition channel into ledger rows: one
 * row per {@link DispositionSubcheck}, sharing the act-level `kind` /
 * `when` / `tags`. The `discipline` channel is advancement's — ignored
 * here. No-ops without a durable owner key or an active connection; an
 * absent/empty `dispositionValence` writes nothing (the neutral majority
 * of acts carry no valence).
 */
async function recordSignatureImpl(
  owner: Stuff,
  signature: ActSignature,
  opts: RecordOptions
): Promise<void> {
  if (!active()) return;
  const ownerId = ownerKey(owner);
  if (!ownerId) return;
  const subs = signature.dispositionValence ?? [];
  if (!subs.length) return;
  // One shared act timestamp so every sub-check folds at the same point.
  const when = opts.when ?? WorldClockApi.getNow().rawValue();
  for (const sub of subs) {
    await buildAndSave(ownerId, {
      kind: opts.kind,
      disposition: sub.disposition,
      valence: sub.valence,
      when,
      tags: opts.tags,
    });
  }
}

/** Map an owner's stored rows to the estimator's evidence shape. */
function toEvidence(rows: readonly DispositionEntry[]): DispositionEvidence[] {
  return rows.map((r) => ({
    disposition: r.disposition,
    valence: r.valence,
    when: r.when,
  }));
}

/** Derive every evidenced axis for an owner (sorted by axis key). */
async function positionsForImpl(owner: Stuff): Promise<AxisEstimate[]> {
  if (!active()) return [];
  const ownerId = ownerKey(owner);
  if (!ownerId) return [];
  const rows = await DispositionEntry.find({ owner: ownerId });
  return TraitPosition.derive(
    toEvidence(rows),
    WorldClockApi.getNow().rawValue(),
    loadDials()
  );
}

/** The neutral floor estimate for an axis with no evidence. */
function floorEstimate(disposition: string): AxisEstimate {
  return { disposition, position: 0, mass: 0, band: TraitBand.FLOOR };
}

/**
 * Raw compatibility between two characters: the dot product of their
 * shared-axis positions, scaled into the regard range and clamped. Same
 * pole on an axis (both positive or both negative) contributes positively;
 * opposed poles negatively; a neutral side contributes ~0.
 */
async function compatibilityImpl(a: Stuff, b: Stuff): Promise<number> {
  const scale = settingNum(AppSettingKeys.traitsCompatibilityScale, 100);
  const byAxis = new Map(
    (await positionsForImpl(a)).map((e) => [e.disposition, e.position])
  );
  let dot = 0;
  for (const e of await positionsForImpl(b)) {
    const av = byAxis.get(e.disposition);
    if (av !== undefined) dot += av * e.position;
  }
  const scaled = scale > 0 ? dot / scale : dot;
  return Math.max(-100, Math.min(100, scaled));
}

/**
 * The trait-layer regard baseline: a stored interaction-driven regard row
 * governs once it exists (even at value 0); absent one, the innate
 * trait-compatibility is the starting regard. Derive-on-read — nothing is
 * written to belief, and belief gains no dependency on the trait layer.
 */
async function regardBaselineImpl(
  viewer: Stuff,
  subject: Stuff
): Promise<number> {
  const subjectKey = subject.getTemplatePath();
  if (subjectKey && RegardApi.regardsHeldBy(viewer).has(subjectKey)) {
    return RegardApi.getRegard(viewer, subject);
  }
  return compatibilityImpl(viewer, subject);
}

/**
 * TraitLogic — the hot-reloadable logic singleton behind {@link TraitApi}.
 *
 * Lives at `/obj/api/trait` (a stateless `Stuff` singleton, no backing
 * `Template`); `TraitApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Internal sub-logic lives in module-private
 * free functions so there are no intra-singleton `this.x()` calls to trip
 * the gate; each public method carries the `FromModule` gate.
 *
 * The disposition ledger is the sibling of advancement's Transcript: this
 * logic populates and consumes only the `dispositionValence` channel of a
 * shared {@link ActSignature} (no advancement dependency), and derives a
 * trait-position on read (never stored). The regard baseline reads belief
 * one-way; belief gains no trait import.
 *
 * @internal
 */
@Unshadowable
export class TraitLogic extends Idea {
  /** See {@link TraitApi.recordSignature}. */
  @CallSecurity(TraitApiCallers)
  public async recordSignature(
    owner: Stuff,
    signature: ActSignature,
    opts: RecordOptions = {}
  ): Promise<void> {
    return recordSignatureImpl(owner, signature, opts);
  }

  /** See {@link TraitApi.recordDeed}. */
  @CallSecurity(TraitApiCallers)
  public async recordDeed(
    owner: Stuff,
    subcheck: DispositionSubcheck,
    opts: RecordOptions = {}
  ): Promise<void> {
    return recordSignatureImpl(
      owner,
      { discipline: [], dispositionValence: [subcheck] },
      { ...opts, kind: "deed" }
    );
  }

  /** See {@link TraitApi.entriesFor}. */
  @CallSecurity(TraitApiCallers)
  public async entriesFor(
    owner: Stuff,
    disposition?: string
  ): Promise<DispositionEntry[]> {
    if (!active()) return [];
    const ownerId = ownerKey(owner);
    if (!ownerId) return [];
    const query: Record<string, unknown> =
      disposition === undefined
        ? { owner: ownerId }
        : { owner: ownerId, disposition };
    return DispositionEntry.find(query);
  }

  /** See {@link TraitApi.positionsFor}. */
  @CallSecurity(TraitApiCallers)
  public async positionsFor(owner: Stuff): Promise<AxisEstimate[]> {
    return positionsForImpl(owner);
  }

  /** See {@link TraitApi.positionFor}. */
  @CallSecurity(TraitApiCallers)
  public async positionFor(
    owner: Stuff,
    disposition: string
  ): Promise<AxisEstimate> {
    if (!active()) return floorEstimate(disposition);
    const ownerId = ownerKey(owner);
    if (!ownerId) return floorEstimate(disposition);
    const rows = await DispositionEntry.find({ owner: ownerId, disposition });
    if (!rows.length) return floorEstimate(disposition);
    return TraitPosition.deriveAxis(
      disposition,
      toEvidence(rows),
      WorldClockApi.getNow().rawValue(),
      loadDials()
    );
  }

  /** See {@link TraitApi.pronouncedFor}. */
  @CallSecurity(TraitApiCallers)
  public async pronouncedFor(owner: Stuff): Promise<AxisEstimate[]> {
    return TraitPosition.pronounced(await positionsForImpl(owner), loadDials());
  }

  /** See {@link TraitApi.compatibility}. */
  @CallSecurity(TraitApiCallers)
  public async compatibility(a: Stuff, b: Stuff): Promise<number> {
    return compatibilityImpl(a, b);
  }

  /** See {@link TraitApi.regardBaseline}. */
  @CallSecurity(TraitApiCallers)
  public async regardBaseline(viewer: Stuff, subject: Stuff): Promise<number> {
    return regardBaselineImpl(viewer, subject);
  }

  /** See {@link TraitApi.seedClaims}. */
  @CallSecurity(TraitApiCallers)
  public async seedClaims(owner: Stuff, seeds: ClaimSeed[]): Promise<void> {
    if (!active()) return;
    const ownerId = ownerKey(owner);
    if (!ownerId) return;
    for (const seed of seeds) {
      await buildAndSave(ownerId, {
        kind: "claim",
        disposition: seed.disposition,
        valence: seed.valence,
      });
    }
  }
}
