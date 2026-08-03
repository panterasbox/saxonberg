/**
 * MagicLogic — the hot-reloadable logic singleton behind {@link MagicApi}.
 *
 * Lives at `/obj/api/magic` (a stateless `Stuff` singleton, no backing
 * `Template`); `MagicApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Owns **two triggers over one executor set**
 * — the cast pipeline (gates → spend → effects → provenance → Transcript
 * credit) and the item discharge (`dischargeImpl`) — plus the **effect
 * executors** themselves, each a thin wrapper over its backing gated
 * Api, per the governing invariant (magic = a new trigger, never a new
 * mechanism).
 *
 * The executors run from an explicit {@link EffectContext} rather than a
 * bare `caster`, which is what lets the two triggers share them: a cast
 * collapses origin/actor/source onto one object, an item pulls them
 * apart. See requirements D1.
 *
 * Two cross-cutting legs on the hostile executors:
 *  - **`deliverAt`** — every hostile channel-delivery routes through this
 *    ONE internal method: the documented **ranged-integration seam** (v1
 *    body = the reachable, in-scene envelope — no projectile / cover /
 *    LoS; when the ranged build lands its delivery model, offensive
 *    spells adopt it by swapping this leg — the `HazardDelivery`
 *    reserved-`range` precedent).
 *  - the **accountability `harm` row** — a damaging effect landed on a
 *    non-consenting sentient outside a shared combat session appends one
 *    (the `HazardMixin.deliverHarm` trap-spring producer precedent).
 *
 * The **resist seam**, N-axis: the `channel` axis delegates
 * whole to `ConditionApi.inflict` (fold + gate + banding already live
 * there); `toxin` is the shipped metabolism banding (recognized, no v1
 * spell); **`mental`** is the one new resolver here — no mitigators in
 * v1 (wards are later content, the fold shape ships in `Resists`), the
 * substrate gate = the target's LIVE Composure factor scaling the
 * condition seed's authored `mentalBands`.
 *
 * Internal sub-logic lives in module-private free functions (the
 * `FireLogic` idiom). `dest /obj/api/magic` reloads it.
 *
 * @internal
 */

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { Mixins } from '../../lib/mixin';
import { ConditionApi } from '../../api/condition';
import { ThermalApi } from '../../api/thermal';
import { FireApi } from '../../api/fire';
import { ElectricityApi } from '../../api/electricity';
import { BulkableApi } from '../../api/bulk';
import { ContainmentApi } from '../../api/containment';
import { AdvancementApi } from '../../api/advancement';
import { AccountabilityApi } from '../../api/accountability';
import { CombatApi } from '../../api/combat';
import { SpeciesApi } from '../../api/species';
import { AccessApi } from '../../api/access';
import { CommandApi } from '../../api/command';
import { ZoneApi } from '../../api/zone';
import { WorldClockApi } from '../../api/worldclock';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { Quantity } from '../../lib/quantity';
import { TemplatePaths } from '../../lib/paths';
import { Postures } from '../../lib/slot/Postured';
import { HazardActivity } from '../../lib/hazard/HazardActivity';
import { SchedulerApi } from '../../api/scheduler';
import { CompetenceBand } from '../../lib/advancement/CompetenceBand';
import type { Difficulty } from '../../lib/advancement/ActSignature';
import Condition from '../Condition';
import type {
  AfflictionRecord,
  SustainedEffect,
} from '../Condition';
import type { Vitals } from '../../lib/vitals/Vitals';
import type { Caster } from '../../lib/magic/Caster';
import { Faculty } from '../../lib/magic/Faculty';
import type { Effect, InjectChannelEffect } from '../../lib/magic/Effect';
import { MagicGrid, type MagicProvenance } from '../../lib/magic/Grid';
import { EffectContexts } from '../../lib/magic/EffectContext';
import type { EffectContext } from '../../lib/magic/EffectContext';
import { ExecutionContextApi } from '../../api/execution-context';
import { Resists } from '../../lib/magic/Resist';
import { RecognitionApi } from '../../api/recognition';
import { IDENTIFICATION } from '../../lib/belief/BeliefStore';
import { Suppressions, type MagicSuppression } from '../../lib/magic/Suppression';
import type { SpellDescriptor } from '../magic/Spell';
import type SpellCatalogue from '../SpellCatalogue';
import type Material from '../../lib/material/Material';
import UnboundedReceptacle from '../UnboundedReceptacle';
import SparkSource from '../magic/SparkSource';
import type { FacultyView } from '../../lib/magic/Caster';
import { MANA_RESERVE_KEY, OVERCHANNEL_STRAIN_PATH } from '../../lib/magic/Caster';
import type { Reserved } from '../../lib/reserve';

const MagicApiCallers = SecurityPolicies.FromModule('/api/magic#MagicApi');

/** The prepare-phase result — gates only, nothing spent. */
export interface PrepareOutcome {
  ok: boolean;
  refusal?: string;
  /** Effective cast time (game-seconds), strain-slowed. */
  castSeconds?: number;
  spellName?: string;
}

/** The resolution result — reports are caster-facing prose lines. */
export interface CastOutcome {
  ok: boolean;
  refusal?: string;
  reports: string[];
  /** Did the cast overchannel (drove the pool past empty)? */
  overchanneled?: boolean;
}

/**
 * What a capability mixin tells the item trigger about *this* firing.
 * Everything here is per-use; the item's own durable facts (its maker,
 * its efficiency, its spell) are read off the item itself.
 */
export interface DischargeOptions {
  /**
   * A per-use magnitude multiplier the capability supplies — a dose
   * fraction for a partial swallow, a partial charge for a guttering
   * wand. Multiplies the maker's fixed delivery efficiency.
   */
  readonly potencyScale?: number;
  /**
   * What paid for this firing, when it is not the item: a **focus**
   * spends the *user's* reserve, which is the whole distinction between
   * a focus and a charged shell (D5).
   */
  readonly source?: Stuff;
}

/** One roster row of the `spells` self-view (bands, never numbers). */
export interface SpellCellRow {
  spellId: string;
  name: string;
  cell: string;
  requiredBand: string;
  /** The caster's limiting band across the two axes. */
  band: string;
  castable: boolean;
  description: string;
}

/** The `spells` self-view model. */
export interface SpellsView {
  faculty: FacultyView;
  spells: SpellCellRow[];
}

/** The bound-emitter and spark-locus template paths. */
const GLOWLIGHT_ORB_PATH = '/obj/magic/GlowlightOrb';

/** Magnitudes not yet worth a dial (the HARM_DEFAULTS precedent). */
const MAGIC_DEFAULTS = {
  /** Cast-time slowdown per overchannel-strain stage. */
  STRAIN_SLOWDOWN_PER_STAGE: 0.5,
  /** The magic-pin body hold (ms) — the hazard-pin shape. */
  PIN_DURATION_MS: 4000,
  /** Default inflict site when a spell authors none. */
  DEFAULT_SITE: 'body.torso',
} as const;

/** Numeric AppSetting read, falling back to the seeded literal. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

@Unshadowable
export class MagicLogic extends ApiLogic {
  /** See {@link MagicApi.prepareCast}. */
  @CallSecurity(MagicApiCallers)
  public prepareCast(
    caster: Stuff,
    spellId: string,
    target?: Stuff,
  ): Promise<PrepareOutcome> {
    return prepareCastImpl(caster, spellId, target);
  }

  /** See {@link MagicApi.resolveCast}. */
  @CallSecurity(MagicApiCallers)
  public resolveCast(
    caster: Stuff,
    spellId: string,
    target?: Stuff,
  ): Promise<CastOutcome> {
    return resolveCastImpl(caster, spellId, target);
  }

  /** See {@link MagicApi.discharge}. */
  @CallSecurity(MagicApiCallers)
  public discharge(
    item: Stuff,
    target?: Stuff,
    opts?: DischargeOptions,
  ): Promise<CastOutcome> {
    return dischargeImpl(item, target, opts);
  }

  /** See {@link MagicApi.spellsView}. */
  @CallSecurity(MagicApiCallers)
  public spellsView(caster: Stuff): Promise<SpellsView> {
    return spellsViewImpl(caster);
  }

  /** See {@link MagicApi.suppressionAt}. */
  @CallSecurity(MagicApiCallers)
  public suppressionAt(place: Stuff | null): MagicSuppression | null {
    return suppressionAtImpl(place);
  }

  /** See {@link MagicApi.suppressionAtDeep}. */
  @CallSecurity(MagicApiCallers)
  public suppressionAtDeep(
    place: Stuff | null,
  ): Promise<MagicSuppression | null> {
    return suppressionAtDeepImpl(place);
  }
}

// ─────────────────────────── the pipeline ───────────────────────────

function catalogue(): SpellCatalogue | null {
  return (
    StuffApi.findByTemplatePath<SpellCatalogue>('/obj/SpellCatalogue') ?? null
  );
}

async function prepareCastImpl(
  caster: Stuff,
  spellId: string,
  target?: Stuff,
): Promise<PrepareOutcome> {
  if (!MixinApi.isCaster(caster)) {
    return { ok: false, refusal: 'You have no gift for the arts.' };
  }
  const spell = catalogue()?.getSpell(spellId) ?? null;
  if (!spell) {
    return { ok: false, refusal: `You know no working called '${spellId}'.` };
  }

  // Targeting shape (the command scope resolved reachability; this is
  // the spell's own demand).
  const shapeRefusal = targetingRefusal(spell, caster, target);
  if (shapeRefusal) return { ok: false, refusal: shapeRefusal };

  // The somatic component needs working hands.
  if (
    MixinApi.isVitals(caster) &&
    caster.isSlotImpairedByTrauma('hands')
  ) {
    return {
      ok: false,
      refusal: 'Your hands will not shape the gestures.',
    };
  }

  // The band gate on BOTH axes — competence IS access (never a
  // per-spell conferral; see docs/subsystems/magic.md).
  const verbKey = MagicGrid.verbDisciplineKey(spell.verb);
  const nounKey = MagicGrid.nounDisciplineKey(spell.noun);
  const [verbBand, nounBand] = await Promise.all([
    AdvancementApi.bandFor(caster, verbKey),
    AdvancementApi.bandFor(caster, nounKey),
  ]);
  if (!CompetenceBand.atOrAbove(verbBand, spell.castingProfile.requiredBand)) {
    return {
      ok: false,
      refusal: `${spell.name} is beyond your command of ${spell.verb} — practice the operation.`,
    };
  }
  if (!CompetenceBand.atOrAbove(nounBand, spell.castingProfile.requiredBand)) {
    return {
      ok: false,
      refusal: `${spell.name} is beyond your feel for ${spell.noun} — study the domain.`,
    };
  }

  // The anti-magic field (deep tier: sync walk + zone chain).
  const field = await suppressionAtDeepImpl(sceneOf(caster));
  if (Suppressions.suppresses(field, spell.verb, spell.noun)) {
    return {
      ok: false,
      refusal: 'The working slides apart — something here suppresses it.',
    };
  }

  // Overchannel strain slows the gestures.
  const strainStage = strainStageOf(caster);
  const base =
    spell.castingProfile.castSeconds ||
    dial(AppSettingKeys.magicCastSecondsDefault, 3);
  const castSeconds =
    base * (1 + MAGIC_DEFAULTS.STRAIN_SLOWDOWN_PER_STAGE * strainStage);
  return { ok: true, castSeconds, spellName: spell.name };
}

async function resolveCastImpl(
  caster: Stuff,
  spellId: string,
  target?: Stuff,
): Promise<CastOutcome> {
  // Re-validate — the world may have changed during the cast time (the
  // caster walked into a ward, the wound landed, the band is unchanged).
  const prep = await prepareCastImpl(caster, spellId, target);
  if (!prep.ok) return { ok: false, refusal: prep.refusal, reports: [] };
  const spell = catalogue()!.getSpell(spellId)!;

  // Spend — at completion, in the same beat the effects fire (an abort
  // never reaches here). Overchanneling = completing past empty: the
  // pool floors at 0 and strain lands, staged by the deficit.
  const reserved = caster as unknown as Reserved & Caster & Vitals;
  const pool = reserved.getMana(); // reconciled read (the contract surface)
  const cost = spell.cost || dial(AppSettingKeys.magicCostDefault, 15);
  const current = pool?.current.rawValue() ?? 0;
  let overchanneled = false;
  if (current >= cost) {
    reserved.adjustReserve(MANA_RESERVE_KEY, Quantity.of(-cost, 'pt'));
  } else {
    reserved.adjustReserve(MANA_RESERVE_KEY, Quantity.of(-current, 'pt'));
    const deficit = cost - current;
    const stage = Math.max(
      1,
      Math.round(
        deficit * dial(AppSettingKeys.magicOverchannelSeverityPerDeficit, 0.1),
      ),
    );
    reserved.afflict({
      kind: 'affliction',
      templatePath: OVERCHANNEL_STRAIN_PATH,
      stage,
      elapsed: 0,
    });
    overchanneled = true;
  }

  // The effect context — for a cast, one object plays origin, actor and
  // source, so this collapses to exactly the shipped behaviour. The tag
  // names the caster as BOTH specifier and firer, which is the honest
  // reading: they specified it and they fired it.
  const potency = await potencyFactor(caster, spell);
  const ctx = EffectContexts.forCast(caster, spell, potency);

  const reports: string[] = [];
  for (const effect of spell.effects) {
    const report = await executeEffect(ctx, target, spell, effect);
    if (report) reports.push(report);
  }
  if (overchanneled) {
    reports.push(
      'The working takes more than you had — the world greys at the edges.',
    );
  }

  // Credit BOTH grid axes on the Transcript (one act, two subchecks).
  // A CAST is a deed; an item discharge deliberately is not — see
  // `dischargeImpl`.
  const difficulty = difficultyOf(spell.castingProfile.requiredBand);
  void AdvancementApi.recordSignature(caster, {
    discipline: [
      {
        discipline: MagicGrid.verbDisciplineKey(spell.verb),
        difficulty,
        outcome: 'success',
      },
      {
        discipline: MagicGrid.nounDisciplineKey(spell.noun),
        difficulty,
        outcome: 'success',
      },
    ],
  }).catch(() => {});

  return { ok: true, reports, overchanneled };
}

/**
 * **The item trigger** — the second door onto the same executors.
 *
 * Three things it deliberately does NOT do, each of them a modelled
 * omission rather than an oversight:
 *
 * 1. **No band gate and no cast time.** Those are the
 *    {@link CastingProfile} — the caster-assuming half — and an item
 *    ignores the profile *wholesale* (D3). The maker passed the gate at
 *    manufacture; the user is spending stored labour, not competence.
 *    This is the whole of *"a novice using a master-made wand genuinely
 *    outperforms that novice casting."*
 * 2. **No Transcript credit.** Firing a wand is not practising the art —
 *    the specification is pre-formed, and nothing was learned. Competence
 *    derives from deeds only, so crediting here would write evidence the
 *    character did not earn (the derive-don't-track constraint, and
 *    D13's claim-vs-deed axis).
 * 3. **No spend.** The energy leg belongs to whichever capability mixin
 *    fired this — a charged shell debits its own reserve, a focus debits
 *    the user's, a consumable destroys itself. `discharge` is *fire the
 *    working*; the caller has already paid. Keeping the spend out here
 *    is what stops this from becoming a second cast pipeline.
 *
 * **The actor derives from the execution context, never a parameter** —
 * the `ProvenanceApi.recordAuthoring` precedent. The effect context is
 * internal plumbing beneath the gate, not a way to pass an actor in.
 */
async function dischargeImpl(
  item: Stuff,
  target?: Stuff,
  opts?: DischargeOptions,
): Promise<CastOutcome> {
  const actor = ExecutionContextApi.getCurrentCommandGiver() as Stuff | null;
  if (!actor) {
    return {
      ok: false,
      refusal: 'Nothing here has hold of it.',
      reports: [],
    };
  }
  if (!MixinApi.isArcane(item)) {
    return { ok: false, refusal: 'There is no working in it.', reports: [] };
  }
  const spellId = item.getCarriedSpellId();
  const spell = spellId ? (catalogue()?.getSpell(spellId) ?? null) : null;
  if (!spell) {
    return {
      ok: false,
      refusal: 'Whatever was bound into it, it is not there now.',
      reports: [],
    };
  }

  // The spell's own targeting demand — shape only, exactly as a cast.
  const shapeRefusal = targetingRefusal(spell, actor, target);
  if (shapeRefusal) return { ok: false, refusal: shapeRefusal, reports: [] };

  // The ward reads the ITEM's footprint at the ITEM's scene: a wand is
  // suppressed where it stands, not where its user stands — which is
  // the same fact that makes it a trap when set down. Any matching cell
  // suppresses (D35).
  const field = await suppressionAtDeepImpl(
    deliveryScene(item) ?? deliveryScene(actor),
  );
  if (Suppressions.suppressesAny(field, item.getArcaneFootprint())) {
    return {
      ok: false,
      refusal: 'It goes inert — something here suppresses what is in it.',
      reports: [],
    };
  }

  // Potency is the MAKER's stored efficiency, fixed at manufacture (D7),
  // where a cast's is competence-scaled. Same parameter, different
  // provenance — which is why the effect layer needed no change at all.
  // The maker's fixed efficiency times whatever the capability supplied
  // — a dose fraction, a partial charge. They MULTIPLY: half a dose of a
  // master's draught is half a master's dose.
  const scale = opts?.potencyScale ?? 1;
  const ctx = EffectContexts.forItem(
    item,
    actor,
    spell,
    item.getDeliveryEfficiency() * (Number.isFinite(scale) ? scale : 1),
    { specifiedBy: item.getMakerId(), source: opts?.source },
  );

  const reports: string[] = [];
  for (const effect of spell.effects) {
    const report = await executeEffect(ctx, target, spell, effect);
    if (report) reports.push(report);
  }
  return { ok: true, reports };
}

async function spellsViewImpl(caster: Stuff): Promise<SpellsView> {
  const casterView = (caster as unknown as Caster).getFacultyView();
  const rows: SpellCellRow[] = [];
  for (const spell of catalogue()?.allSpells() ?? []) {
    const [verbBand, nounBand] = await Promise.all([
      AdvancementApi.bandFor(caster, MagicGrid.verbDisciplineKey(spell.verb)),
      AdvancementApi.bandFor(caster, MagicGrid.nounDisciplineKey(spell.noun)),
    ]);
    const limiting =
      CompetenceBand.rank(verbBand) <= CompetenceBand.rank(nounBand)
        ? verbBand
        : nounBand;
    rows.push({
      spellId: spell.spellId,
      name: spell.name,
      cell: MagicGrid.cellKey(spell.verb, spell.noun),
      requiredBand: spell.castingProfile.requiredBand,
      band: limiting,
      castable: CompetenceBand.atOrAbove(limiting, spell.castingProfile.requiredBand),
      description: spell.description,
    });
  }
  rows.sort((a, b) => a.cell.localeCompare(b.cell));
  return { faculty: casterView, spells: rows };
}

// ─────────────────── suppression (P7 wires the field) ───────────────────

/** Sync room-tier resolve — the outward containment walk. */
function suppressionAtImpl(place: Stuff | null): MagicSuppression | null {
  return Suppressions.fieldAt(place);
}

/**
 * The deep tier: the sync walk, then the ASYNC zone chain
 * (`Zone.lookupField('suppressesMagic')` — region-scale wards). Used at
 * cast time; the sync tier alone is authoritative for the reconcile's
 * dormancy read (the reconcile is sync by construction).
 */
async function suppressionAtDeepImpl(
  place: Stuff | null,
): Promise<MagicSuppression | null> {
  const sync = suppressionAtImpl(place);
  if (sync) return sync;
  try {
    const path = place?.getTemplatePath();
    if (!path) return null;
    const zone = await ZoneApi.resolveZoneForPath(path);
    const field = await zone?.lookupField<unknown>('suppressesMagic');
    return field ? Suppressions.validate(field) : null;
  } catch {
    return null;
  }
}

// ─────────────────────────── the executors ───────────────────────────

/**
 * Run one effect from an explicit {@link EffectContext}.
 *
 * **The self-effect fallback is `ctx.actor`, never `ctx.origin`.** For a
 * cast the two are the same object, so this reads identically to the
 * shipped behaviour; for an item they differ, and getting it wrong
 * silently retargets a spell at the wand. See requirements D1.
 */
async function executeEffect(
  ctx: EffectContext,
  target: Stuff | undefined,
  spell: SpellDescriptor,
  effect: Effect,
): Promise<string | null> {
  switch (effect.kind) {
    case 'inject-channel':
      return execInjectChannel(ctx, target, effect);
    case 'afflict':
      return execAfflict(ctx, target, effect);
    case 'relieve':
      return execRelieve(target ?? ctx.actor, effect);
    case 'adjust-reserve': {
      const t = target ?? ctx.actor;
      if (!MixinApi.isReserved(t) || !t.hasReserve(effect.reserveKey)) {
        return 'Nothing there answers the draw.';
      }
      const unit = t.getReserve(effect.reserveKey)!.current.unit;
      t.adjustReserve(effect.reserveKey, Quantity.of(effect.delta, unit));
      return effect.delta >= 0 ? 'Vigor flows in.' : 'Something is drawn away.';
    }
    case 'move':
      return execMove(ctx, target, effect.move);
    case 'conjure':
      return execConjure(ctx, target, effect);
    case 'sense':
      return effect.sense === 'identify-item'
        ? execIdentify(ctx, target)
        : execSense(ctx, target);
    case 'cloak':
      return execCloak(ctx, spell, effect.disguise);
    case 'emit-field':
      return execEmitField(ctx, spell);
    case 'script':
      return execScript(ctx.actor, effect.source);
  }
}

/**
 * **The ranged-integration seam.** Every hostile channel-delivery passes
 * through here — v1 body: the reachable, in-scene envelope (same scene
 * as the caster; the command scope already resolved reachability). When
 * the ranged build lands its delivery model (travel / dodge / cover /
 * LoS), offensive spells adopt it by swapping THIS leg. After a landed
 * delivery, appends the accountability `harm` row (trap-spring
 * precedent) for a non-consenting sentient victim outside a shared
 * combat session.
 */
async function deliverAt(
  ctx: EffectContext,
  target: Stuff,
  deliver: () => { report: string; harmed: boolean },
): Promise<string> {
  // Reachability is measured from the ORIGIN, not the actor — that is
  // what makes a wand set down and pointed at a door a trap. For a cast
  // origin === actor, so this is a no-op change (pinned by test). An
  // origin with no place of its own (a swallowed potion's material
  // singleton) issues from wherever the actor is.
  const from = deliveryScene(ctx.origin) ?? deliveryScene(ctx.actor);
  if (deliveryScene(target) !== from && target !== from) {
    return 'Your reach ends at the scene before you.';
  }
  const { report, harmed } = deliver();
  if (harmed && MixinApi.isOrganism(target)) {
    appendHarmRow(ctx.actor, target);
  }
  return report;
}

/**
 * The trap-spring producer, magic's own writer (see accountability.md).
 *
 * **The initiator is the actor, never the origin.** A wand cannot
 * initiate a harm row — the person who pointed it did. This is the one
 * place where confusing the two would launder responsibility through an
 * object, so it takes the principal explicitly.
 */
function appendHarmRow(actor: Stuff, victim: Stuff): void {
  // Inside one shared combat session the combat ledger owns the
  // encounter's rows (opened/violated/death carry the consent verdict) —
  // double-booking a harm row would double-count the same hurt.
  const actorSession = CombatApi.sessionFor(actor);
  if (actorSession && actorSession === CombatApi.sessionFor(victim)) return;
  AccountabilityApi.record({
    kind: 'harm',
    sessionId: `magic:${actor.stuffId}:${Date.now()}`,
    initiator: durableIdOf(actor),
    opponent: durableIdOf(victim),
    victim: durableIdOf(victim),
    killer: durableIdOf(actor),
    consented: false,
    sentient: SpeciesApi.isSentient(victim),
  });
}

function execInjectChannel(
  ctx: EffectContext,
  target: Stuff | undefined,
  e: InjectChannelEffect,
): Promise<string> | string {
  const { tag, potency } = ctx;
  if (!target) return 'The working needs a mark.';
  if (e.channel === 'shock') {
    return deliverAt(ctx, target, () => {
      const locus = StuffApi.createSync(() => new SparkSource());
      const scene = deliveryScene(target) ?? deliveryScene(ctx.origin);
      if (scene && MixinApi.isContainer(scene) && MixinApi.isContainable(locus)) {
        ContainmentApi.move(locus, scene);
      }
      locus.setVoltage(Quantity.of((e.voltage ?? 240) * potency, 'V'));
      const outcomes = ElectricityApi.conduct(locus);
      StuffApi.destruct(locus);
      const shocked = outcomes.length > 0;
      return {
        report: shocked
          ? 'Current snaps across everything the water and metal will carry it to.'
          : 'The charge finds no path and dies in the air.',
        harmed: shocked,
      };
    });
  }
  // Heat (and any future channel) — a body folds it through the covering
  // stack; a plain object takes real joules + the autoignition check.
  if (MixinApi.isOrganism(target)) {
    return deliverAt(ctx, target, () => {
      const outcome = ConditionApi.inflict(target, {
        mechanism: e.channel as Exclude<typeof e.channel, 'shock'>,
        site: e.site ?? MAGIC_DEFAULTS.DEFAULT_SITE,
        energy: (e.energy ?? 1) * potency,
      });
      if (outcome.trauma) outcome.trauma.magicOrigin = tag;
      return {
        report: outcome.afflicted
          ? 'The bolt lands — flesh remembers fire.'
          : 'The bolt splashes off harmlessly.',
        harmed: outcome.afflicted,
      };
    });
  }
  ThermalApi.depositHeat(target, (e.joules ?? 0) * potency);
  const lit = FireApi.tryAutoignite(target);
  ThermalApi.reconcilePhase(target);
  return lit
    ? 'It catches — real flame, and it will spread as real flame does.'
    : 'It heats under the working.';
}

async function execAfflict(
  ctx: EffectContext,
  target: Stuff | undefined,
  e: Extract<Effect, { kind: 'afflict' }>,
): Promise<string> {
  const { tag, potency } = ctx;
  if (!target || !MixinApi.isVitals(target)) {
    return 'The working needs a living mark.';
  }
  const seed = StuffApi.findByTemplatePath<Condition>(e.conditionPath);

  let stage = 1;
  if (e.resist?.axis === 'mental') {
    // The mental resolver: mitigators fold (none in v1 — wards later),
    // the substrate gates — the target's LIVE Composure factor scales
    // the seed's authored ascending bands.
    const residual = Resists.fold(e.resist.intensity * potency, []);
    const bands = seed?.getMentalBands() ?? [{ threshold: 0, stage: 1 }];
    const factor = composureFactorOf(target);
    const staged = Resists.stageFor(residual, bands, factor);
    if (staged === null) {
      return 'The mark sets their jaw and shrugs the working off.';
    }
    stage = staged;
  }

  return deliverAt(ctx, target, () => {
    const record: AfflictionRecord = {
      kind: 'affliction',
      templatePath: e.conditionPath,
      stage,
      elapsed: 0,
      magicOrigin: tag,
    };
    target.afflict(record);
    return { report: 'The working sinks in and takes hold.', harmed: true };
  });
}

function execRelieve(
  target: Stuff,
  e: Extract<Effect, { kind: 'relieve' }>,
): string {
  if (!MixinApi.isVitals(target)) return 'Nothing there holds a working.';
  // Tag-keyed ONLY: structurally unable to touch a mundane condition —
  // dispel scans for magicOrigin and refuses everything else.
  const matches = target.getConditions().filter((c) => {
    const origin =
      c.kind === 'sustained'
        ? c.magicOrigin
        : c.kind === 'affliction' || c.kind === 'trauma'
          ? c.magicOrigin
          : undefined;
    if (!origin) return false;
    if (e.verb && origin.verb !== e.verb) return false;
    if (e.noun && origin.noun !== e.noun) return false;
    // A trauma is an impulse consequence — real now, not dispellable.
    return c.kind !== 'trauma';
  });
  if (matches.length === 0) {
    return 'There is nothing magical there to unmake.';
  }
  for (const c of matches) {
    if (c.kind === 'sustained') target.releaseSustained(c);
    else target.relieve(c);
  }
  return matches.length === 1
    ? 'The working unravels.'
    : `${matches.length} workings unravel.`;
}

async function execMove(
  ctx: EffectContext,
  target: Stuff | undefined,
  move: 'shove' | 'pin',
): Promise<string> {
  if (!target) return 'The working needs a mark.';
  if (move === 'shove') {
    if (!MixinApi.isPosed(target)) return 'It does not so much as rock.';
    return deliverAt(ctx, target, () => {
      target.setPosture(Postures.Lie);
      recoilOnto(ctx);
      return { report: 'The unseen blow takes them off their feet.', harmed: false };
    });
  }
  // pin — a timed body-slot hold (the hazard-pin engagement shape).
  if (!MixinApi.isEngaged(target)) return 'It cannot be held.';
  return deliverAt(ctx, target, () => {
    const pin = new HazardActivity({
      actor: target,
      type: `magic-pin:${ctx.tag.spellId}`,
      durationMs: MAGIC_DEFAULTS.PIN_DURATION_MS,
      slots: ['body'],
      onComplete: () => {},
    });
    const started = SchedulerApi.start(pin);
    return {
      report: started.ok
        ? 'Force clamps around them, holding fast.'
        : 'They wrench free of the closing grip.',
      harmed: false,
    };
  });
}

/**
 * **Momentum is conserved** (arcane-science content rule 7): a directed
 * impulse pushes back on whatever launched it, and *whatever launched
 * it* is the **endpoint** — `ctx.origin`.
 *
 * That single line gives the three item classes their opposite
 * ergonomics for free (requirements D6):
 *
 * - A **cast**: origin is the caster, so the caster takes the reaction.
 *   This is a deliberate behaviour change to the shipped `shove` — it
 *   previously pushed off nothing at all.
 * - A **focus**: origin is still the caster (a focus supplies the
 *   specification, not the endpoint), so the caster is displaced.
 * - A **charged item**: origin is the item, so the *item* takes it and
 *   the user is not displaced. A wand is small, which is exactly why
 *   kinetic charged items must be braced (D6) rather than handheld.
 *
 * The displacement is graded rather than a knockdown: standing →
 * staggered to a knee, already low → off your feet. Soft, recoverable,
 * legible — never a cliff.
 */
function recoilOnto(ctx: EffectContext): void {
  const endpoint = ctx.origin;
  if (!MixinApi.isPosed(endpoint)) return; // an item absorbs it silently
  const posture = MixinApi.isPostured(endpoint)
    ? (endpoint as unknown as { getPosture(): string }).getPosture()
    : Postures.Stand;
  endpoint.setPosture(posture === Postures.Stand ? Postures.Kneel : Postures.Lie);
}

async function execConjure(
  ctx: EffectContext,
  target: Stuff | undefined,
  e: Extract<Effect, { kind: 'conjure' }>,
): Promise<string> {
  if (e.templatePath) {
    const conjured = await StuffApi.clone(e.templatePath);
    const scene = deliveryScene(ctx.origin) ?? deliveryScene(ctx.actor);
    if (scene && MixinApi.isContainer(scene) && MixinApi.isContainable(conjured)) {
      ContainmentApi.move(conjured, scene);
    }
    return `${conjured.getPresentation()} takes shape out of nothing.`;
  }
  // Bulk conjuration — real litres from a transient unbounded source.
  const materialPath = e.bulkMaterial!.startsWith('/')
    ? e.bulkMaterial!
    : `/obj/material/bulk/${e.bulkMaterial}`;
  const material = StuffApi.findByTemplatePath<Material>(materialPath);
  if (!material) return 'The stuff of it will not come.';
  const source = StuffApi.createSync(() => new UnboundedReceptacle());
  try {
    source.interiorBulk = true;
    source.setBulkMaterial('interior', material);
    const from = BulkableApi.slotFor(source, undefined);
    if (!from) return 'The stuff of it will not come.';
    const to =
      target && MixinApi.isBulkable(target)
        ? BulkableApi.slotFor(target, undefined)
        : BulkableApi.floorSurfaceNear(ctx.origin);
    if (!to) return 'There is nothing here to hold it.';
    const litres =
      e.litres ?? dial(AppSettingKeys.magicConjureWaterLitres, 1);
    const result = BulkableApi.transfer(from, to, {
      kind: 'measure',
      litres,
      mode: 'lenient',
    });
    return result.status === 'declined'
      ? 'It will not pour there.'
      : target && MixinApi.isBulkable(target)
        ? `Clear ${material.getName()} wells up inside.`
        : `Clear ${material.getName()} spatters onto the ground.`;
  } finally {
    StuffApi.destruct(source);
  }
}

function execSense(ctx: EffectContext, target: Stuff | undefined): string {
  const marks: string[] = [];
  const scan = (thing: Stuff): void => {
    if (!MixinApi.isVitals(thing)) return;
    for (const c of thing.getConditions()) {
      const origin =
        c.kind === 'sustained' || c.kind === 'affliction' || c.kind === 'trauma'
          ? c.magicOrigin
          : undefined;
      if (origin) {
        marks.push(
          `${thing.getPresentation()} — ${MagicGrid.cellKey(origin.verb, origin.noun)}`,
        );
      }
    }
  };
  if (target) scan(target);
  else {
    // The untargeted sweep reads the scene the working ISSUES from —
    // a wand pushed through a gap scans the far side, not your room.
    const scene = deliveryScene(ctx.origin) ?? deliveryScene(ctx.actor);
    if (scene && MixinApi.isContainer(scene)) {
      for (const thing of scene.getContents()) scan(thing);
    }
    scan(ctx.actor);
  }
  return marks.length === 0
    ? 'No workings answer the second look.'
    : `Workings reveal themselves: ${marks.join('; ')}.`;
}

/**
 * **The identify working** (requirements D24) — a `sense` effect whose
 * result is a **write to the actor's belief store**, not a message.
 *
 * That distinction is the whole decision. A message would tell you what
 * a thing is *right now*; a belief write teaches you the **class**, so
 * every flask that looks like that one reads as known from here on. It
 * is the paid shortcut past experiment — what you buy instead of
 * drinking the unknown flask and finding out.
 *
 * This is also where D34 lands: there is deliberately **no `identify`
 * verb**. A scroll affords `read` like every written thing, and this
 * fires from having read it. An `identify` affordance appearing in your
 * list would identify the scroll for free, and the whole
 * unidentified-consumable mechanic would collapse.
 */
function execIdentify(ctx: EffectContext, target: Stuff | undefined): string {
  if (!target) return 'The working needs something to look at.';
  if (!MixinApi.isIdentifiable(target)) {
    return `There is nothing hidden to learn about ${target.getPresentation()}.`;
  }
  const learner = ctx.actor;
  const signature = target.getTemplatePath();
  if (!MixinApi.isBeliefStore(learner) || !signature) {
    return 'The knowing finds nowhere to settle.';
  }
  // Keyed on templatePath — the CLASS, never the instance. Two flasks
  // of the same draught are one fact.
  learner.know(IDENTIFICATION, signature, { typeKnown: true });
  return `The letters crawl, and you know it: ${RecognitionApi.describe(learner, target)}.`;
}

/**
 * A veil settles on **the actor** — the person, never the wand. This is
 * one of the four self-effect fallbacks D1 warns about: reading
 * `ctx.origin` here would cloak the item that fired the spell.
 */
function execCloak(
  ctx: EffectContext,
  spell: SpellDescriptor,
  disguise: string,
): string {
  const subject = ctx.actor;
  if (!MixinApi.isVitals(subject)) return 'The veil finds nothing to settle on.';
  subject.afflict(
    sustainedRecord(spell, ctx.tag, { realizes: 'cloak', disguise }),
  );
  pokeReconcile(subject);
  return 'The veil settles — watchers will see someone, never quite you.';
}

/**
 * The orb kindles at the **origin's** scene (a wand can light a room you
 * are not in) but the sustained hold that keeps it up rides **the
 * actor** — you are the one maintaining it, and dispelling you drops it.
 */
async function execEmitField(
  ctx: EffectContext,
  spell: SpellDescriptor,
): Promise<string> {
  const orb = await StuffApi.clone(GLOWLIGHT_ORB_PATH);
  const scene = deliveryScene(ctx.origin) ?? deliveryScene(ctx.actor);
  if (scene && MixinApi.isContainer(scene) && MixinApi.isContainable(orb)) {
    ContainmentApi.move(orb, scene);
  }
  const holder = ctx.actor;
  if (MixinApi.isVitals(holder)) {
    holder.afflict(
      sustainedRecord(spell, ctx.tag, {
        realizes: 'emit-light',
        boundStuffId: orb.stuffId,
      }),
    );
    pokeReconcile(holder);
  }
  return 'A mote of cold light kindles and holds.';
}

async function execScript(caster: Stuff, source: string): Promise<string> {
  // The exotic 5% — code-trust gated (the one non-diegetic gate).
  if (!(await AccessApi.isWizard(caster))) {
    return 'That working answers only to those who shape the world itself.';
  }
  if (!MixinApi.isCommandGiver(caster)) return 'No voice to speak it with.';
  for (const line of source.split(/[;\n]/)) {
    const text = line.trim();
    if (text.length > 0) await CommandApi.forceCommand(caster, text);
  }
  return 'The scripted working runs.';
}

// ─────────────────────────── helpers ───────────────────────────

/** The scene (container) a Stuff stands in, or null. */
function sceneOf(s: Stuff | undefined): Stuff | null {
  if (!s) return null;
  if (MixinApi.isContainable(s)) return s.getContainer() ?? null;
  return null;
}

/** Carried-through-a-body walk cap (the `Suppressions.fieldAt` guard). */
const CARRIER_WALK_CAP = 8;

/**
 * **The scene a working issues INTO**, walking out through any body
 * carrying the origin.
 *
 * A caster's container is the room, so for a cast this is `sceneOf`
 * exactly. But an item's container is usually *the person holding it* —
 * and a wand in your hand fires into the room you are standing in, not
 * into you. Without this walk, drawing a wand would make it unable to
 * reach anything.
 *
 * The walk steps out through **Organisms only**. That is what keeps the
 * two shipped behaviours intact: a caster inside a vessel (an entered
 * wardrobe) still delivers *into the vessel*, because a vessel is not a
 * body; and a wand set down on the floor still delivers into the room,
 * because its container already is one. A wand at the bottom of a
 * closed pack fires into the pack — which is the honest answer.
 */
function deliveryScene(s: Stuff | undefined): Stuff | null {
  let cursor: Stuff | null = s ?? null;
  let depth = CARRIER_WALK_CAP;
  while (cursor !== null && depth-- > 0) {
    const container = sceneOf(cursor);
    if (container === null) return null;
    if (!MixinApi.isOrganism(container)) return container;
    cursor = container; // carried by a body — issue from where THEY are
  }
  return null;
}

/** The durable id the accountability/renown ledgers key on. */
function durableIdOf(s: Stuff): string {
  return s.getTemplatePath() ?? `stuff:${s.stuffId}`;
}

/** The spell's own targeting demand — the command scope resolved
 * reachability; this is shape only. */
function targetingRefusal(
  spell: SpellDescriptor,
  caster: Stuff,
  target: Stuff | undefined,
): string | null {
  switch (spell.targeting) {
    case 'none':
    case 'self':
      return null;
    case 'creature':
      if (!target) return `${spell.name} needs a living mark.`;
      if (!MixinApi.isOrganism(target)) {
        return `${spell.name} answers only against the living.`;
      }
      return null;
    case 'object':
      return target ? null : `${spell.name} needs a mark.`;
    case 'any':
      return null;
  }
}

/** The target's live Composure factor — every Character carries the
 * faculty mixin; anything else reads the authored neutral default. */
function composureFactorOf(target: Stuff): number {
  if (MixinApi.hasMixin(target, Mixins.Caster)) {
    return (target as unknown as Caster).getComposureFactor();
  }
  return Faculty.composureFactor(Faculty.defaultComposureBand(), 1);
}

/** Current overchannel-strain stage (0 = none). */
function strainStageOf(caster: Stuff): number {
  if (!MixinApi.isVitals(caster)) return 0;
  let stage = 0;
  for (const c of caster.getConditions()) {
    if (c.kind === 'affliction' && c.templatePath === OVERCHANNEL_STRAIN_PATH) {
      stage = Math.max(stage, c.stage);
    }
  }
  return stage;
}

/** Competence-scaled potency: 1 at the spell's floor band, rising by the
 * dial per band the caster's LIMITING axis sits above it. */
async function potencyFactor(
  caster: Stuff,
  spell: SpellDescriptor,
): Promise<number> {
  const [verbBand, nounBand] = await Promise.all([
    AdvancementApi.bandFor(caster, MagicGrid.verbDisciplineKey(spell.verb)),
    AdvancementApi.bandFor(caster, MagicGrid.nounDisciplineKey(spell.noun)),
  ]);
  const minRank = Math.min(
    CompetenceBand.rank(verbBand),
    CompetenceBand.rank(nounBand),
  );
  const above = Math.max(0, minRank - CompetenceBand.rank(spell.castingProfile.requiredBand));
  return 1 + dial(AppSettingKeys.magicPotencyCompetenceFactor, 0.25) * above;
}

/** The Transcript difficulty a spell's floor band implies. */
function difficultyOf(requiredBand: string): Difficulty {
  const map: Record<number, Difficulty> = {
    0: 'trivial',
    1: 'easy',
    2: 'standard',
    3: 'hard',
    4: 'formidable',
  };
  return map[CompetenceBand.rank(requiredBand as never)] ?? 'standard';
}

/** Build a SustainedEffect record with the spell's authored lifetime. */
function sustainedRecord(
  spell: SpellDescriptor,
  tag: MagicProvenance,
  fields: Partial<SustainedEffect> & { realizes: string },
): SustainedEffect {
  let expiresAt: number | undefined;
  if (spell.durationSeconds > 0) {
    try {
      if (StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        expiresAt = WorldClockApi.getNow().rawValue() + spell.durationSeconds;
      }
    } catch {
      expiresAt = undefined;
    }
  }
  return {
    kind: 'sustained',
    spellId: spell.spellId,
    magicOrigin: tag,
    expiresAt,
    ...fields,
  } as SustainedEffect;
}

/** Nudge the lazy conditions reconcile so a fresh modifier realizes now. */
function pokeReconcile(host: Stuff): void {
  if (MixinApi.isVitals(host)) {
    try {
      host.getVitalSign('heartRate');
    } catch {
      /* no vitals to read — the next natural read realizes it */
    }
  }
}

