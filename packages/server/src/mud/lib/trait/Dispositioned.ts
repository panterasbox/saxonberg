/**
 * DispositionedMixin — the personality layer's owner face (the Api OO
 * sweep retired `TraitApi`/`TraitLogic`; this mixin is their one home).
 *
 * **Derive-don't-track** (the competence / renown precedent). The
 * substrate stores raw {@link DispositionEntry} evidence owner-scoped;
 * trait-position is *computed on read* over (axis × ledger) and **never
 * stored** — re-tuning the estimator re-derives character without
 * rewriting a row. The mixin owns no fields: a character's traits are a
 * function of its ledger, exactly as competence is a function of its
 * Transcript.
 *
 * **One signature, two outputs.** A single authored {@link ActSignature}
 * carries both the skill-Discipline sub-checks (advancement's) and the
 * disposition-valence channel (here): "instrument once," two ledgers.
 * This face populates and consumes only `dispositionValence`;
 * advancement gains no dependency on the trait layer, and the regard
 * baseline reads belief one-way (belief gains no trait import).
 *
 * Family names per the sweep's P4 (three ledgers share one host class,
 * so each family is named for its ledger): `imprintSignature` /
 * `imprintDeed` / `dispositionEntries` / `traitPositions` /
 * `traitPosition` / `pronouncedTraits` / `compatibilityWith` /
 * `regardBaselineToward` / `seedTraitClaims`.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import DispositionEntry from './DispositionEntry';
import type { DispositionEntryFields } from './DispositionEntry';
import type {
  ActSignature,
  DispositionSubcheck,
} from '../advancement/ActSignature';
import {
  TraitPosition,
  type AxisEstimate,
  type DispositionEvidence,
  type TraitDials,
  DEFAULT_TRAIT_DIALS,
} from './TraitPosition';
import { TraitBand } from './TraitBand';
import { WorldClockApi } from '../../api/worldclock';
import { PersistApi } from '../../api/persist';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { MixinApi } from '../../api/mixin';
import {
  CallSecurity,
  Final,
  Unshadowable,
} from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';

/** Act-level context shared by every disposition row of one act. */
export interface RecordOptions {
  kind?: 'deed' | 'claim';
  /** Game-time seconds; defaults to the witness clock when omitted. */
  when?: number | null;
  tags?: string[];
}

/** One seeded disposition claim — an authored/established axis position. */
export interface ClaimSeed {
  disposition: string;
  valence: number;
  /** The minting archetype, stamped on the row. */
  archetype?: string;
}

/** Public shape provided by DispositionedMixin. */
export interface Dispositioned {
  imprintSignature(
    signature: ActSignature,
    opts?: RecordOptions,
  ): Promise<void>;
  imprintDeed(
    subcheck: DispositionSubcheck,
    opts?: RecordOptions,
  ): Promise<void>;
  dispositionEntries(disposition?: string): Promise<DispositionEntry[]>;
  traitPositions(): Promise<AxisEstimate[]>;
  traitPosition(disposition: string): Promise<AxisEstimate>;
  pronouncedTraits(): Promise<AxisEstimate[]>;
  compatibilityWith(other: Stuff): Promise<number>;
  regardBaselineToward(subject: Stuff): Promise<number>;
  seedTraitClaims(seeds: ClaimSeed[]): Promise<void>;
}

/* ────────── the estimator + mint path (module-private) ────────── */

/** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
function active(): boolean {
  return PersistApi.isConnected();
}

/** The durable owner key, or `null` for a session-ephemeral owner. */
function ownerKey(owner: Stuff): string | null {
  return owner.getIdentityPath();
}

/**
 * Read one numeric dial from AppSettings, falling back when the cache
 * isn't warmed (unit tests, pre-boot) or the value is malformed — so the
 * estimator stays usable without a running config.
 */
function settingNum(key: string, fallback: number): number {
  let raw = '';
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
    DEFAULT_TRAIT_DIALS.halfLifeSeconds / 86_400,
  );
  return {
    halfLifeSeconds: halfLifeDays * 86_400,
    definedThreshold: settingNum(
      AppSettingKeys.traitsDefinedThreshold,
      DEFAULT_TRAIT_DIALS.definedThreshold,
    ),
    entrenchedThreshold: settingNum(
      AppSettingKeys.traitsEntrenchedThreshold,
      DEFAULT_TRAIT_DIALS.entrenchedThreshold,
    ),
    pronouncedThreshold: settingNum(
      AppSettingKeys.traitsPronouncedThreshold,
      DEFAULT_TRAIT_DIALS.pronouncedThreshold,
    ),
  };
}

/**
 * The single build seam: resolve one disposition sub-check + act context
 * into one persisted {@link DispositionEntry}. Stamps the game-time
 * witness when `when` is omitted.
 */
async function buildAndSave(
  ownerId: string,
  fields: DispositionEntryFields,
): Promise<void> {
  const entry = new DispositionEntry();
  entry.owner = ownerId;
  entry.kind = fields.kind ?? 'deed';
  entry.when = fields.when ?? WorldClockApi.getNow().rawValue();
  entry.disposition = fields.disposition;
  entry.valence = fields.valence;
  entry.tags = fields.tags ?? [];
  entry.archetype = fields.archetype ?? '';
  await entry.save();
  // No live consumer to notify: trait position is deliberately absent
  // from the standing dashboard (see Avatar.subscribableFields).
}

/**
 * Explode one authored act's disposition channel into ledger rows: one
 * row per {@link DispositionSubcheck}, sharing the act-level `kind` /
 * `when` / `tags`. The `discipline` channel is advancement's — ignored
 * here. No-ops without a durable owner key or an active connection; an
 * absent/empty `dispositionValence` writes nothing (the neutral majority
 * of acts carry no valence).
 */
async function imprintSignatureImpl(
  owner: Stuff,
  signature: ActSignature,
  opts: RecordOptions,
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
    loadDials(),
  );
}

/** The neutral floor estimate for an axis with no evidence. */
function floorEstimate(disposition: string): AxisEstimate {
  return { disposition, position: 0, mass: 0, band: TraitBand.FLOOR };
}

/**
 * Raw compatibility between two characters: the dot product of their
 * shared-axis positions, scaled into the regard range and clamped. Same
 * pole on an axis (both positive or both negative) contributes
 * positively; opposed poles negatively; a neutral side contributes ~0.
 */
async function compatibilityImpl(a: Stuff, b: Stuff): Promise<number> {
  const scale = settingNum(AppSettingKeys.traitsCompatibilityScale, 100);
  const byAxis = new Map(
    (await positionsForImpl(a)).map((e) => [e.disposition, e.position]),
  );
  let dot = 0;
  for (const e of await positionsForImpl(b)) {
    const av = byAxis.get(e.disposition);
    if (av !== undefined) dot += av * e.position;
  }
  const scaled = scale > 0 ? dot / scale : dot;
  return Math.max(-100, Math.min(100, scaled));
}

export function DispositionedMixin<TBase extends MixinConstructor>(
  Base: TBase,
) {
  // Declared-then-returned (the Meltable shape) so method decorators
  // are legal — a class EXPRESSION cannot carry them.
  class DispositionedMixin extends Base implements Dispositioned {
    static _mixinName = 'DispositionedMixin';

    /**
     * The append primitive: explode one authored act's disposition
     * channel into ledger rows (one per axis sub-check), sharing the
     * act-level `kind` / `when` / `tags`. Sealed — the ledger is
     * append-only through the single build seam.
     */
    @CallSecurity(SecurityPolicies.SelfOnly)
    @Final
    @Unshadowable
    public async imprintSignature(
      signature: ActSignature,
      opts: RecordOptions = {},
    ): Promise<void> {
      return imprintSignatureImpl(this as unknown as Stuff, signature, opts);
    }

    /**
     * Convenience over {@link imprintSignature} for a single-axis world
     * demonstration: forces `kind: 'deed'`.
     */
    @CallSecurity(SecurityPolicies.SelfOnly)
    @Final
    @Unshadowable
    public async imprintDeed(
      subcheck: DispositionSubcheck,
      opts: RecordOptions = {},
    ): Promise<void> {
      return imprintSignatureImpl(
        this as unknown as Stuff,
        { discipline: [], dispositionValence: [subcheck] },
        { ...opts, kind: 'deed' },
      );
    }

    /**
     * The owner-scoped reader. With `disposition`, returns only that
     * axis's rows. `[]` without a durable owner key / when disconnected.
     */
    public async dispositionEntries(
      disposition?: string,
    ): Promise<DispositionEntry[]> {
      if (!active()) return [];
      const ownerId = ownerKey(this as unknown as Stuff);
      if (!ownerId) return [];
      const query: Record<string, unknown> =
        disposition === undefined
          ? { owner: ownerId }
          : { owner: ownerId, disposition };
      return DispositionEntry.find(query);
    }

    /**
     * Every axis this owner has evidence in, with its derived signed
     * position + band — derived on read, never stored. Axes with no
     * evidence are absent (the neutral floor is implicit).
     */
    public async traitPositions(): Promise<AxisEstimate[]> {
      return positionsForImpl(this as unknown as Stuff);
    }

    /**
     * This owner's current position on one axis — derived on read.
     * Returns the neutral floor estimate without evidence, a durable
     * owner key, or a connection.
     */
    public async traitPosition(disposition: string): Promise<AxisEstimate> {
      if (!active()) return floorEstimate(disposition);
      const ownerId = ownerKey(this as unknown as Stuff);
      if (!ownerId) return floorEstimate(disposition);
      const rows = await DispositionEntry.find({ owner: ownerId, disposition });
      if (!rows.length) return floorEstimate(disposition);
      return TraitPosition.deriveAxis(
        disposition,
        toEvidence(rows),
        WorldClockApi.getNow().rawValue(),
        loadDials(),
      );
    }

    /**
     * This owner's **defining** axes — those pronounced enough to name
     * (the read the self-view and brains consume), most-pronounced first.
     */
    public async pronouncedTraits(): Promise<AxisEstimate[]> {
      return TraitPosition.pronounced(
        await positionsForImpl(this as unknown as Stuff),
        loadDials(),
      );
    }

    /**
     * The trait-compatibility between this character and another — a
     * signed scalar in the regard range (compatible dispositions →
     * positive, opposed → negative). The innate input to regard.
     */
    public async compatibilityWith(other: Stuff): Promise<number> {
      return compatibilityImpl(this as unknown as Stuff, other);
    }

    /**
     * This viewer's **baseline** regard for a subject: a stored
     * interaction-driven regard governs once it exists; absent one, the
     * innate trait-compatibility is the starting value. Derive-on-read —
     * writes nothing to belief.
     */
    public async regardBaselineToward(subject: Stuff): Promise<number> {
      const self = this as unknown as Stuff;
      const subjectKey = subject.getIdentityPath();
      if (
        subjectKey &&
        MixinApi.isBeliefStore(self) &&
        self.regardsHeld().has(subjectKey)
      ) {
        return self.regardFor(subject);
      }
      return compatibilityImpl(self, subject);
    }

    /**
     * Seed this owner's established character as `claim`-kind evidence —
     * an authored NPC's defining dispositions or a char-gen seed. The
     * form-then-entrench model's starting evidence (personality comes
     * from a seeded history, not an assigned stat). SelfOnly — the
     * Behaved host seeds itself at postRegister; char-gen would too.
     */
    @CallSecurity(SecurityPolicies.SelfOnly)
    @Final
    @Unshadowable
    public async seedTraitClaims(seeds: ClaimSeed[]): Promise<void> {
      if (!active()) return;
      const ownerId = ownerKey(this as unknown as Stuff);
      if (!ownerId) return;
      for (const seed of seeds) {
        await buildAndSave(ownerId, {
          kind: 'claim',
          disposition: seed.disposition,
          valence: seed.valence,
          archetype: seed.archetype,
        });
      }
    }
  }
  return DispositionedMixin;
}
