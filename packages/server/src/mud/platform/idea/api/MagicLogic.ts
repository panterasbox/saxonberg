/**
 * MagicLogic — the hot-reloadable logic singleton behind {@link MagicApi}.
 *
 * Lives at `/platform/idea/api/magic` (a stateless `Stuff` singleton, no backing
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
 * `FireLogic` idiom). `dest /platform/idea/api/magic` reloads it.
 *
 * @internal
 */

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { MqlApi } from '../../../api/mql';
import { Mixins } from '../../../lib/mixin';
import { ConditionApi } from '../../../api/condition';
import { ThermalApi } from '../../../api/thermal';
import { FireApi } from '../../../api/fire';
import { ElectricityApi } from '../../../api/electricity';
import { BulkableApi } from '../../../api/bulk';
import { ContainmentApi } from '../../../api/containment';
import { AdvancementApi } from '../../../api/advancement';
import { AccountabilityApi } from '../../../api/accountability';
import { CombatApi } from '../../../api/combat';
import {
  RangeBand,
  RANGE_BANDS,
  type RangeState,
} from '../../../lib/combat/RangeBand';
import { SpeciesApi } from '../../../api/species';
import { AccessApi } from '../../../api/access';
import { CommandApi } from '../../../api/command';
import { ZoneApi } from '../../../api/zone';
import { WorldClockApi } from '../../../api/worldclock';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import { Quantity } from '../../../lib/quantity';
import { TemplatePaths } from '../../../lib/paths';
import { Postures } from '../../../lib/slot/Postured';
import { HazardActivity } from '../../../lib/hazard/HazardActivity';
import { SchedulerApi } from '../../../api/scheduler';
import { CompetenceBand } from '../../../lib/advancement/CompetenceBand';
import type { Difficulty } from '../../../lib/advancement/ActSignature';
import Condition from '../Condition';
import type {
  AfflictionRecord,
  SustainedEffect,
} from '../Condition';
import type { Vitals } from '../../../lib/vitals/Vitals';
import type { Caster } from '../../../lib/magic/Caster';
import { Faculty } from '../../../lib/magic/Faculty';
import { MagicEffects } from '../../../lib/magic/Effect';
import type { Effect, EmitFieldEffect, InjectChannelEffect } from '../../../lib/magic/Effect';
import { Charge } from '../../../lib/magic/Charge';
import { MagicGrid } from '../../../lib/magic/Grid';
import { Blessing } from '../../../lib/magic/Blessing';
import type { BlessingBand } from '../../../lib/magic/Blessing';
import { EffectContexts } from '../../../lib/magic/EffectContext';
import type { EffectContext } from '../../../lib/magic/EffectContext';
import { ExecutionContextApi } from '../../../api/execution-context';
import { Resists } from '../../../lib/magic/Resist';
import { RecognitionApi } from '../../../api/recognition';
import { IDENTIFICATION } from '../../../lib/belief/BeliefStore';
import { Appearance } from '../../../lib/identification/Appearance';
import { Suppressions, type MagicSuppression } from '../../../lib/magic/Suppression';
import type { SpellDescriptor } from '../magic/Spell';
import type SpellCatalogue from '../SpellCatalogue';
import type Material from '../../../lib/material/Material';
import UnboundedReceptacle from '../../thing/UnboundedReceptacle';
import type { FacultyView } from '../../../lib/magic/Caster';
import { MANA_RESERVE_KEY, OVERCHANNEL_STRAIN_PATH } from '../../../lib/magic/Caster';
import type { Reserved } from '../../../lib/reserve';

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
   * What paid for this firing, when it is not the item — a scroll names
   * its reader.
   */
  readonly source?: Stuff;
  /**
   * **Where the working issues from, when it is not the item.**
   *
   * The sibling of `source`, and separate for the same reason
   * `EffectContext` keeps origin and actor apart: a thrown flask's
   * contact payload acts at the point of impact. Since reachability is
   * measured from the origin and a `Material` singleton has no place of
   * its own, leaving this unset would make a thrown payload issue from
   * the THROWER — and a `close`-envelope effect would then refuse itself
   * across the gap it just crossed.
   */
  readonly origin?: Stuff;
  /**
   * **Fire as if this band, whatever the item actually is.**
   *
   * Defaults to the item's own band, so every shipped verb behaves
   * exactly as it reads. The override exists because the band is a
   * *parameter of the firing*, not a property the executor should be
   * digging out of the item: an author wants to preview a working at
   * each band, a trap wants to fire cursed from an uncursed housing, and
   * a test wants to assert all three without minting three items.
   *
   * Hard-wiring the read would have made every one of those need a
   * separate mechanism. Potency is already open this way
   * ({@link potencyScale}); this is the same principle one axis over.
   */
  readonly band?: BlessingBand;
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

/**
 * **What potency means, once, for every effect kind.**
 *
 * Potency is the fraction of the working that landed — `deliveryEfficiency
 * × dose × competence`, all multiplying. Every effect then falls into one
 * of two shapes, and there are no other cases:
 *
 * | shape | kinds | what potency does |
 * |---|---|---|
 * | **magnitude** — has one delivered quantity | inject-channel · adjust-reserve · conjure · cloak · emit-field · afflict *(banded)* | scales it, continuously |
 * | **outcome** — no quantity, it happens or it does not | move · sense · afflict *(flat)* | must clear {@link OUTCOME_FLOOR}; below it, nothing |
 *
 * > **Scale it if it has a size; gate it if it does not.**
 *
 * The point is that an author never writes anything for this. They
 * author the full-strength value and the engine knows what "less of this
 * kind" means — so dose, competence and a maker's efficiency all work on
 * every working ever authored, for free.
 *
 * Before this, potency reached `inject-channel` and nothing else. A
 * half-flask of a healing draught healed fully; half a veiling draught
 * veiled for the full term. `dose:` was authored on potions where it
 * could not possibly do anything, which is the worst kind of gap —
 * silent, and it looks configured.
 */
const OUTCOME_FLOOR = 0.5;

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
  /** See {@link MagicApi.requiresMark}. */
  @CallSecurity(MagicApiCallers)
  public requiresMark(item: Stuff): boolean {
    if (!MixinApi.isArcane(item)) return false;
    const path = item.getCarriedSpellPath();
    if (path.length === 0) return false;
    const spell = catalogue()?.getSpellAt(path) ?? null;
    if (!spell) return false;
    const band = MixinApi.isBlessable(item)
      ? item.getBlessing().getBand()
      : 'uncursed';
    return MagicEffects.everyEffectNeedsTarget(effectsAtBand(spell, band));
  }

  /** See {@link MagicApi.transferCharge}. */
  @CallSecurity(MagicApiCallers)
  public transferCharge(
    actor: Stuff,
    shell: Stuff,
    committedPt: number,
  ): Promise<ChargeTransfer> {
    return transferChargeImpl(actor, shell, committedPt);
  }

  public discharge(
    item: Stuff,
    target?: Stuff,
    opts?: DischargeOptions,
  ): Promise<CastOutcome> {
    return dischargeImpl(item, target, opts);
  }

  /** See {@link MagicApi.spellAt}. */
  @CallSecurity(MagicApiCallers)
  public spellAt(path: string): SpellDescriptor | null {
    return catalogue()?.getSpellAt(path) ?? null;
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
    StuffApi.findByTemplatePath<SpellCatalogue>('/platform/idea/SpellCatalogue') ?? null
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
  // A player TYPED this, so it is a name, not a reference — ambiguity
  // here is a disambiguation problem, never a corrupted pointer.
  const spell = catalogue()?.getSpellNamed(spellId) ?? null;
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
  const spell = catalogue()!.getSpellNamed(spellId)!;

  // Spend — at completion, in the same beat the effects fire (an abort
  // never reaches here). Overchanneling = completing past empty: the
  // pool floors at 0 and strain lands, staged by the deficit.
  const reserved = caster as unknown as Reserved & Caster & Vitals;
  const pool = reserved.getMana(); // reconciled read (the contract surface)
  // **Fade is felt as COST, never as failure** (requirements D15). A
  // hazy specification takes more out of you for the same effect, and a
  // DEFECTIVE copy (read above your comprehension floor, D14) costs more
  // again — on every cast, until you go back and study it properly.
  //
  // Nothing here can refuse. There is no sharpness at which the spell
  // stops working, only one at which it stops being worth casting, and
  // that call is the player's. A caster holding no copy at all pays the
  // ordinary price, exactly as before spellbooks existed.
  const fadeMultiplier = MixinApi.isMemorized(caster)
    ? caster.costMultiplierFor(spell.spellId)
    : 1;
  const cost =
    (spell.cost || dial(AppSettingKeys.magicCostDefault, 15)) * fadeMultiplier;
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

  // A CAST always fires the ordinary branch: a caster has no BUC, so
  // there is no band to read. Potency is an INSTRUMENT fact, which is
  // why the low/high branches are reachable only through the item door.
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

  // Casting RENEWS the pattern (D15), so an actively used spell never
  // fades — you lose only what you do not use. This is also what makes
  // fade felt rather than punitive: the fix is to keep casting.
  if (MixinApi.isMemorized(caster) && caster.holdsSpell(spell.path)) {
    const held = caster.getMemorizedSpell(spell.path)!;
    caster.memorize({
      spellPath: spell.path,
      defective: held.defective,
      verb: spell.verb,
      noun: spell.noun,
      complexity: held.complexity,
    });
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
  const spellPath = item.getCarriedSpellPath();
  const spell = spellPath
    ? (catalogue()?.getSpellAt(spellPath) ?? null)
    : null;
  if (!spell) {
    return {
      ok: false,
      refusal: 'Whatever was bound into it, it is not there now.',
      reports: [],
    };
  }

  // **The band picks the working's own low/high branch** — not a global
  // multiplier. Resolved HERE, ahead of the shape gate, because the gate
  // must judge the list that will actually fire.
  // The caller may name the band; absent that, the item's own.
  const band =
    opts?.band ??
    (MixinApi.isBlessable(item) ? item.getBlessing().getBand() : 'uncursed');
  const effects = effectsAtBand(spell, band);

  // The spell's own targeting demand — shape only, exactly as a cast.
  const shapeRefusal = targetingRefusal(spell, actor, target, effects);
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
  // ── The energy leg, per class (D5) ──
  //
  // A CHARGED item is a battery: it pays from its own reserve, and a
  // depleted one fails AUDIBLY rather than ceasing to afford its verb
  // (D34 — a silent verb would be a free charge meter).
  //
  // A FOCUS supplies specification only: the user pays, and a faded
  // pattern delivers LESS rather than failing (D9/D15 — soft
  // recoverable entropy, never a cliff).
  //
  // `source` is WHO PAYS, and therefore also who takes the reaction
  // (see `recoilOnto`). A charged shell pays for itself; a consumable's
  // payer is its user. An explicit option wins — a scroll names its
  // reader.
  const classScale = 1;
  const payer: Stuff = opts?.source ?? item;
  if (MixinApi.isCharged(item)) {
    const costKJ = spell.cost * dial(AppSettingKeys.magicChargeKJPerCostPt, 1);
    if (!item.spendCharge(costKJ)) {
      return {
        ok: false,
        refusal: 'It is spent — nothing answers but a dry click.',
        reports: [],
      };
    }
  }

  // The maker's fixed efficiency times whatever the capability supplied
  // — a dose fraction, a faded pattern, a blessing. They MULTIPLY: half
  // a dose of a master's draught is half a master's dose.
  const scale = opts?.potencyScale ?? 1;
  const ctx = EffectContexts.forItem(
    item,
    actor,
    spell,
    item.getDeliveryEfficiency() *
      (Number.isFinite(scale) ? scale : 1) *
      classScale,
    {
      specifiedBy: item.getMakerId(),
      source: payer,
      origin: opts?.origin,
    },
  );

  const reports: string[] = [];
  for (const effect of effects) {
    const report = await executeEffect(ctx, target, spell, effect);
    if (report) reports.push(report);
  }
  absorbWasteHeat(ctx, spell);
  // The working fired, so anything self-evident about it is now known.
  noteUseIdentification(ctx, item);
  return { ok: true, reports };
}

/**
 * **Waste heat lands on the endpoint** (D6), which for a charged item is
 * the item itself.
 *
 * No process is perfectly efficient, so the fraction of the committed
 * energy that did not become effect became heat, and it has to go
 * somewhere. On a cast that somewhere is the caster (who is a body with
 * a thermal budget and sheds it); on a charged item it is the shell.
 * That is what makes a charged cooling item able to crack, and a spark
 * wand *safer* than the equivalent cast — the wand is in the circuit and
 * the user is not.
 *
 * Routed through the shipped `ThermalApi` + `FireApi.tryAutoignite`
 * path, so whether it cracks or catches is a **materials-response read**
 * rather than a rule magic invented. That is the governing invariant
 * doing its job: magic is a new trigger, never a new mechanism.
 */
function absorbWasteHeat(ctx: EffectContext, spell: SpellDescriptor): void {
  const endpoint = ctx.origin;
  if (!MixinApi.isCharged(endpoint)) return;
  const committedJ =
    spell.cost * dial(AppSettingKeys.magicChargeKJPerCostPt, 1) * 1000;
  const wasteJ =
    committedJ * dial(AppSettingKeys.magicWasteHeatFraction, 0.1);
  if (wasteJ <= 0) return;
  try {
    if (MixinApi.isThermal(endpoint)) endpoint.depositHeat(wasteJ);
    FireApi.tryAutoignite(endpoint);
    ThermalApi.reconcilePhase(endpoint);
  } catch {
    // A shell with no thermal surface simply has nowhere to put it.
    // Not an error — an item that cannot be heated cannot crack.
  }
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
  // **Backfire.** An effect may name the ACTOR as its endpoint even when
  // something was aimed at — the deliberate redirect a cursed wand needs,
  // as opposed to the `target ?? ctx.actor` fallback for an unaimed cast.
  const landsOn =
    (effect as { self?: boolean }).self === true ? ctx.actor : target;

  // **A scoped effect acts on a SET, not the aimed thing.** The MQL
  // query resolves against the ACTOR, so `inventory` means the reader's
  // own pack. This is how a working expresses "more of the same act" at
  // its high end — a blessed remove curse sweeps everything you carry,
  // which is unmistakably more curse-removing and cannot drift into
  // being a different working.
  const scope = (effect as { scope?: string }).scope;
  if (typeof scope === 'string' && scope.length > 0) {
    const many = { stuff: resolveScope(ctx.actor, scope) };
    // ⚠ MQL names the SET; the EFFECT decides what it can act on.
    //
    // The filter deliberately does not live in the query: `mixin.` and
    // `class.` filters are AUTHOR-GATED in MQL, and a content-authored
    // scope must not need author powers to resolve. So the scope stays a
    // plain seed a player could have typed, and applicability is asked
    // of the effect — which is where the knowledge belongs anyway.
    const reports: string[] = [];
    for (const subject of many.stuff) {
      if (!appliesTo(effect, subject)) continue;
      const r = await executeOne(ctx, subject, spell, effect);
      if (r) reports.push(r);
    }
    return reports.length > 0
      ? reports.join(' ')
      : 'Nothing here answers the working.';
  }
  return executeOne(ctx, landsOn, spell, effect);
}

/**
 * **The subject set a scoped effect acts on.**
 *
 * A closed vocabulary resolved in code rather than through MQL. Two
 * reasons, both learned the hard way:
 *
 * - MQL's `mixin.` / `class.` filters are **author-gated**, and a
 *   content-authored scope must never need author powers to resolve;
 * - MQL's giver-anchored seeds want a dispatch frame's permission
 *   snapshot, which an effect executor does not have.
 *
 * So the engine knows a handful of scopes by name and content picks one.
 * Growing the list is a deliberate edit, which is the right shape for
 * something that decides how far a working reaches.
 */
function resolveScope(actor: Stuff, scope: string): Stuff[] {
  switch (scope) {
    case 'inventory':
      return MixinApi.isContainer(actor) ? [...actor.getContents()] : [];
    case 'here': {
      const room = MixinApi.isContainable(actor) ? actor.getContainer() : null;
      return room && MixinApi.isContainer(room) ? [...room.getContents()] : [];
    }
    default:
      return [];
  }
}

/**
 * **Can this effect do anything to this subject?** The applicability
 * test a scoped sweep filters on, so a blessed remove curse reports on
 * the cursed ring in your pack and stays silent about your lunch.
 *
 * Only asked on the scoped path — an aimed effect still refuses out
 * loud, because there the player named a specific thing and deserves to
 * be told why nothing happened.
 */
function appliesTo(effect: Effect, subject: Stuff): boolean {
  switch (effect.kind) {
    case 'adjust-blessing':
      return MixinApi.isBlessable(subject);
    case 'sense':
      return MixinApi.isIdentifiable(subject) || MixinApi.isBulkable(subject);
    default:
      return true;
  }
}

/**
 * The effect list a working fires **at a given band** — the one place
 * that selection happens, so nothing else has to know the shape.
 */
function effectsAtBand(
  spell: SpellDescriptor,
  band: BlessingBand,
): readonly Effect[] {
  return band === 'cursed'
    ? spell.cursedEffects
    : band === 'blessed'
      ? spell.blessedEffects
      : spell.effects;
}

/** One effect against ONE subject — the un-scoped core. */
async function executeOne(
  ctx: EffectContext,
  landsOn: Stuff | undefined,
  spell: SpellDescriptor,
  effect: Effect,
): Promise<string | null> {
  switch (effect.kind) {
    case 'inject-channel':
      return execInjectChannel(ctx, landsOn, effect);
    case 'afflict':
      return execAfflict(ctx, landsOn, effect);
    case 'relieve':
      return execRelieve(landsOn ?? ctx.actor, effect);
    case 'adjust-reserve': {
      const t = landsOn ?? ctx.actor;
      if (!MixinApi.isReserved(t) || !t.hasReserve(effect.reserveKey)) {
        return 'Nothing there answers the draw.';
      }
      // ⚠ **Charge is not fillable by fiat.** Every other reserve is a
      // property of the thing that has it; a shell's charge is energy
      // that had to come from somewhere and cross something. An effect
      // that simply added it would mint joules — `transfer` authored
      // `delta: 20` against a `cost: 4` and was generating 16 kJ a cast,
      // a lossless back door around the entire coupling model.
      //
      // So the charge case routes through the ONE implementation, which
      // debits the actor and charges them the coupling loss. This gates
      // ANY effect that reaches for charge, not just the one that did.
      if (effect.delta > 0 && effect.reserveKey === Charge.RESERVE_KEY) {
        const moved = await transferChargeImpl(
          ctx.actor,
          t as unknown as Stuff,
          effect.delta * ctx.potency,
        );
        return moved.report;
      }
      // Mana is the other coupled reserve, and it has NO transfer leg at
      // all: it is recovered through metabolism (body before gift),
      // never given. `MagicEffects.validate` refuses the authoring; this
      // is the belt to that brace, for an effect that reaches execution
      // any other way (a script, a band branch built at runtime).
      if (effect.delta > 0 && effect.reserveKey === MANA_RESERVE_KEY) {
        return 'Nothing can pour mana in — it is recovered, never given.';
      }
      const unit = t.getReserve(effect.reserveKey)!.current.unit;
      t.adjustReserve(
        effect.reserveKey,
        Quantity.of(effect.delta * ctx.potency, unit),
      );
      return effect.delta >= 0 ? 'Vigor flows in.' : 'Something is drawn away.';
    }
    case 'adjust-blessing':
      return execAdjustBlessing(landsOn, effect.steps, effect.limit);
    case 'move':
      // Outcome, not magnitude: a shove puts you down or it does not.
      if (ctx.potency < OUTCOME_FLOOR) {
        return 'The push comes, and it is not enough to move anything.';
      }
      return execMove(ctx, landsOn, effect.move);
    case 'conjure':
      return execConjure(ctx, landsOn, effect);
    case 'sense':
      // Outcome, not magnitude: you learn it or you do not.
      if (ctx.potency < OUTCOME_FLOOR) {
        return 'The impression will not resolve — too little of it got through.';
      }
      if (effect.sense === 'misidentify') return execMisidentify(ctx, landsOn);
      return effect.sense === 'identify-item'
        ? execIdentify(ctx, landsOn)
        : execSense(ctx, landsOn);
    case 'cloak':
      return execCloak(ctx, spell, effect.disguise);
    case 'emit-field':
      return execEmitField(ctx, spell, effect);
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
  deliver: () => { report: string; harmed: boolean } | Promise<{ report: string; harmed: boolean }>,
  envelope?: RangeState,
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
  // The BAND gate. Same-scene is kept above (cross-room fire is out of
  // scope, D26 — which is what makes an exit genuinely an escape); this
  // asks the second question the ranged build added: is the target
  // further out than this working can reach?
  //
  // `envelope` defaults to the `magic.spellEnvelope` dial, seeded `far`,
  // so every shipped spell behaves EXACTLY as it did before. A thrown
  // contact payload passes `close`; a future bow passes `far`; a sidearm
  // passes `near`.
  const reach = envelope ?? spellEnvelope();
  if (target !== ctx.origin) {
    const band = CombatApi.bandBetween(ctx.origin, target);
    if (band !== null && RangeBand.beyond(band, reach)) {
      return 'They are too far off for that.';
    }
  }
  const { report, harmed } = await deliver();
  if (harmed && MixinApi.isOrganism(target)) {
    appendHarmRow(ctx.actor, target);
  }
  return report;
}

/**
 * The band a working reaches by default. Seeded `far` — i.e. anywhere in
 * the scene — so the band gate is inert for every shipped spell and only
 * bites for a carrier that declares a tighter envelope.
 */
function spellEnvelope(): RangeState {
  // Seeded literal fallback, the `dial()` precedent: a settings read
  // throws outright when the cache is not warmed, and this path runs in
  // unit tests that never boot AppBootstrap. Falling back to `far` also
  // means a settings failure cannot silently SHRINK what a spell can
  // reach — the safe direction for a gate.
  try {
    const raw = AppApi.setting(AppSettingKeys.magicSpellEnvelope);
    return (RANGE_BANDS as readonly string[]).includes(raw ?? '')
      ? (raw as RangeState)
      : 'far';
  } catch {
    return 'far';
  }
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
    return deliverAt(ctx, target, async () => {
      // The row names the transient locus (D3): the executor clones what
      // it is told and imposes the potential on it. A locus that is not
      // energized is an authoring error, reported as a refusal.
      const locus = await StuffApi.clone(e.locus!);
      if (!MixinApi.isEnergized(locus)) {
        StuffApi.destruct(locus);
        return {
          report: `The working's locus '${e.locus}' carries no charge — nothing to impose it on.`,
          harmed: false,
        };
      }
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
      // A backfire has to READ like one. The mechanism was landing the
      // second effect correctly and narrating it identically, so a
      // cursed firing looked like the same line printed twice — the
      // player learned nothing, which is the whole failure a hidden
      // axis cannot afford.
      const backfired = (e as { self?: boolean }).self === true;
      return {
        report: backfired
          ? outcome.afflicted
            ? 'It comes out the wrong end — the heat goes into your hand.'
            : 'Something gutters back down the shaft and dies.'
          : outcome.afflicted
            ? 'The bolt lands — flesh remembers fire.'
            : 'The bolt splashes off harmlessly.',
        harmed: outcome.afflicted,
      };
    });
  }
  if (MixinApi.isThermal(target)) target.depositHeat((e.joules ?? 0) * potency);
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

  // **Afflict is magnitude where it HAS one, outcome where it does not.**
  // A seed with `mentalBands` scales its stage below (the resist fold
  // already threads potency). A flat stage-1 condition has no size to
  // scale down to except zero, so it gates instead — which is the same
  // rule, honestly applied, rather than fake precision on an integer.
  if (e.resist?.axis !== 'mental' && ctx.potency < OUTCOME_FLOOR) {
    return 'The working thins out before it can take hold.';
  }

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
 * impulse pushes back on whatever launched it.
 *
 * *Whatever launched it* is **whatever supplied the energy** — which is
 * `ctx.source`, not `ctx.origin`. Those differ exactly where D5's
 * classes differ, and that is not a coincidence: the classes ARE
 * distinguished by who pays, and the reaction follows the payment
 * because that is where the momentum came from.
 *
 * So the three classes get their opposite ergonomics from one line
 * (requirements D6):
 *
 * - A **cast** — source is the caster, so the caster takes it. This is a
 *   deliberate behaviour change to the shipped `shove`, which previously
 *   pushed off nothing at all and conserved no momentum.
 * - A **focus** — supplies specification only, so the *user* pays and
 *   the user is displaced. A focus that shoves recoils onto you.
 * - A **charged item** — pays from its own tank, so the *item* takes it
 *   and the user is not displaced. A wand is small, which is exactly why
 *   kinetic charged items must be **braced** (gun-shaped, recoil through
 *   a stock into the ground) rather than handheld: a 100 g wand
 *   delivering 200 J recoils at ~1.7 km/s and destroys itself.
 *
 * The displacement is graded rather than a knockdown: standing →
 * staggered to a knee, already low → off your feet. Soft, recoverable,
 * legible — never a cliff.
 */
function recoilOnto(ctx: EffectContext): void {
  const endpoint = ctx.source;
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
    : `/stuff/idea/material/bulk/${e.bulkMaterial}`;
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
      (e.litres ?? dial(AppSettingKeys.magicConjureWaterLitres, 1)) *
      ctx.potency;
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
  // **Follow a vessel to what is in it.** A flask is just a flask — the
  // identity of a potion lives on its MATERIAL, which is what makes one
  // identification cover every flask of that draught. Without this
  // redirect, `identify` on a flask answers "there is nothing hidden to
  // learn about a stoppered glass flask", which is true of the glass
  // and useless to the player holding it.
  const subject = identifiableSubject(target);
  if (!subject) {
    return `There is nothing hidden to learn about ${target.getPresentation()}.`;
  }
  const learner = ctx.actor;
  const signature = subject.getIdentityPath();
  if (!MixinApi.isBeliefStore(learner) || !signature) {
    return 'The knowing finds nowhere to settle.';
  }
  learnClassOf(learner, subject, signature);
  return `The letters crawl, and you know it: ${RecognitionApi.describe(learner, subject)}.`;
}

/**
 * **Shift an item along its own BUC axis** — the executor behind
 * remove-curse, and the first working that writes an *item's* durable
 * state rather than a body's or the world's.
 *
 * Three things it deliberately does:
 *
 * **It clamps rather than refuses.** `steps: +1` on an already-blessed
 * item is not an error; the working reached, found nothing below it, and
 * says so. Refusing would make the outcome depend on hidden state before
 * the caster paid, which is the leak {@link BlessableMixin} exists to
 * avoid.
 *
 * **It reveals, always.** A `control · arcana` working has the caster's
 * hands on the item's own pattern, so they learn where it sat whether or
 * not it moved — this is the first caller of the long-unwired
 * `revealBlessing()` seam. Yes, that makes remove-curse a BUC detector.
 * It is a **paid** one, at `control` prices (3× on the price list, the
 * dearest verb but transform), which is the same shape D24 gives
 * identify: the shortcut you buy instead of finding out the hard way.
 *
 * **It reports the band it landed on, not the delta.** "The curse lifts"
 * and "nothing was holding it" are different sentences because they are
 * different facts, and a working that narrated its own arithmetic would
 * read like a patch note.
 */
function execAdjustBlessing(
  target: Stuff | undefined,
  steps: number,
  limit?: BlessingBand,
): string {
  if (!target) return 'The working needs something to take hold of.';
  if (!MixinApi.isBlessable(target)) {
    // A mundane rock has no effect axis to displace. Honest, and it
    // leaks nothing — being un-blessable is a fact about the CLASS,
    // which anybody can see.
    return `${target.getPresentation()} has no working in it to shift.`;
  }
  const before = target.getBlessing();
  const top = Blessing.BANDS.length - 1;
  const from = before.getOrdinal();
  let ordinal = Math.max(0, Math.min(top, from + steps));
  if (limit !== undefined) {
    // The working's own ceiling, in the direction it travels — a cure
    // restores and stops rather than carrying on into a blessing.
    //
    // ⚠ Then re-clamp against where it STARTED, because a ceiling must
    // never drag something backwards: remove-curse read over an already
    // *blessed* wand has to leave it blessed, not demote it to ordinary.
    // A working that could undo a blessing is a different working.
    const bound = Blessing.of(limit).getOrdinal();
    ordinal =
      steps > 0
        ? Math.max(from, Math.min(ordinal, bound))
        : Math.min(from, Math.max(ordinal, bound));
  }
  const after = Blessing.of(Blessing.BANDS[ordinal]!);
  target.setBlessing(after);
  target.revealBlessing();

  if (after.getBand() === before.getBand()) {
    return before.isCursed()
      ? `The curse in ${target.getPresentation()} does not give.`
      : `Nothing was holding ${target.getPresentation()} back.`;
  }
  return steps > 0
    ? `The weight goes out of ${target.getPresentation()} — it rests ${after.getBand()}.`
    : `Something settles wrongly into ${target.getPresentation()} — it rests ${after.getBand()}.`;
}

/**
 * **Plant a confident falsehood** — the cursed identify (the slate's
 * best example of the axis, and the only thing that exercises the
 * belief store's capacity to hold something untrue).
 *
 * It does not misfire or refuse. It writes a record that reads exactly
 * like a real identification, naming a DIFFERENT catalogued class. The
 * reader has no way to tell from the inside; they find out by acting on
 * it. That is strictly worse than no information, which is what makes
 * it the low end of identify's own axis rather than merely a weaker
 * version of it.
 */
function execMisidentify(ctx: EffectContext, target: Stuff | undefined): string {
  if (!target) return 'The working needs something to look at.';
  const subject = identifiableSubject(target);
  if (!subject) {
    return `There is nothing hidden to learn about ${target.getPresentation()}.`;
  }
  const learner = ctx.actor;
  const signature = subject.getIdentityPath();
  if (!MixinApi.isBeliefStore(learner) || !signature) {
    return 'The knowing finds nowhere to settle.';
  }
  // Borrow another identifiable class's true name. Drawn from the world
  // rather than invented, so the lie is plausible — it names a thing
  // that really exists, which is exactly why it is believable.
  //
  // ⚠ A **system-mode MQL query**, not a `getAllObjects()` filter-loop.
  // The raw enumeration is allowlisted to three engine homes and this is
  // not one of them (`lint:world-scan`, CI-gating); the declarative form
  // is the sanctioned way to ask the world a question. `commandGiver:
  // null` is what makes the `mixin.` filter legal here — those are
  // author-gated for a real caller, and system mode has no principal to
  // gate. Same shape as `Census.takeCensus`.
  const others = MqlApi.resolveMany('world:[mixin.IdentifiableMixin]', {
    commandGiver: null,
    scope: 'world',
  }).stuff.filter(
    (o) =>
      MixinApi.isIdentifiable(o) &&
      o.getIdentityPath() !== signature &&
      o.getIdentifiedName().length > 0,
  );
  const decoy = others[0];
  const believedName = decoy
    ? (decoy as unknown as { getIdentifiedName(): string }).getIdentifiedName()
    : 'something entirely harmless';
  learner.know(IDENTIFICATION, signature, {
    typeKnown: true,
    knownAttributes: ['type'],
    learnedGeneration: Appearance.currentGeneration().generation,
    believedName,
  });
  return `The letters crawl, and you know it: ${believedName}.`;
}

/**
 * What an identification act actually addresses: the thing itself, or —
 * for a vessel — the substance inside it.
 *
 * The same redirect `Bulkable.getContentsDescriptionFor` makes when
 * rendering, for the same reason: a potion's class is its material, so
 * both *looking at* and *identifying* a flask have to reach past the
 * glass. `null` when there is nothing identifiable either way.
 */
function identifiableSubject(target: Stuff): Stuff | null {
  if (MixinApi.isIdentifiable(target)) return target;
  if (!MixinApi.isBulkable(target)) return null;
  try {
    const material = target.getBulk().getMaterial();
    return material && MixinApi.isIdentifiable(material)
      ? (material as unknown as Stuff)
      : null;
  } catch {
    return null;
  }
}

/**
 * Write what `learner` now knows about `target`'s CLASS.
 *
 * Keyed on templatePath — the class, never the instance. Two flasks of
 * the same draught are one fact.
 *
 * `knownAttributes` is the STATE (D25): you know facts, and how
 * identified something is falls out of which facts you hold. There is
 * deliberately no `identificationLevel` scalar — a stored percentage of
 * knowing is exactly the shape this codebase avoids.
 *
 * `learnedGeneration` is what lets a stale record HEDGE rather than lie
 * once its descriptor is reissued (D28) — *"you once knew blue to mean
 * healing"*. One field, no sweep, and it only does work in the rare
 * case.
 *
 * Shared by the identify working and by use-identification, because
 * they teach the same thing by different routes.
 */
function learnClassOf(learner: Stuff, target: Stuff, signature: string): void {
  if (!MixinApi.isBeliefStore(learner)) return;
  const prior = learner.recall(IDENTIFICATION, signature)?.payload as
    | { knownAttributes?: string[] }
    | undefined;
  const known = new Set(prior?.knownAttributes ?? []);
  known.add('type');
  if (MixinApi.isBlessable(target)) {
    // Identifying the CLASS reveals what kind of thing it is; the
    // per-instance BUC is a separate question and stays hidden.
    known.add('kind');
  }
  learner.know(IDENTIFICATION, signature, {
    typeKnown: true,
    knownAttributes: [...known],
    learnedGeneration: Appearance.currentGeneration().generation,
  });
}

/**
 * **Use-identification** (the experiment D24's scroll is a shortcut
 * past): a thing whose author declared it self-evident teaches its
 * class to whoever just used it.
 *
 * ⚠ Called ONLY on a working that actually fired. A refused discharge —
 * no mark, no charge, suppressed by a ward — teaches nothing, because
 * otherwise the *failure* becomes an identification channel and you
 * could identify a wand for free by zapping it at nothing. That is the
 * D34 leak shape one layer down, and it is why this sits after the
 * effect loop rather than beside the gates.
 */
function noteUseIdentification(ctx: EffectContext, item: Stuff): void {
  if (!MixinApi.isIdentifiable(item)) return;
  if (!item.identifiesOnUse()) return;
  const signature = item.getTemplatePath();
  if (!signature) return;
  learnClassOf(ctx.actor, item, signature);
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
    sustainedRecord(ctx, spell, { realizes: 'cloak', disguise }),
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
  effect: EmitFieldEffect,
): Promise<string> {
  // The row names the emitter it conjures (D3) — the executor clones
  // what it is told, and a pack ships a new emitter kind with no kernel
  // edit. Not a light source = an authoring error, reported as a refusal.
  const orb = await StuffApi.clone(effect.locus);
  if (!MixinApi.isLightSource(orb)) {
    StuffApi.destruct(orb);
    return `The working's locus '${effect.locus}' gives no light — nothing kindles.`;
  }
  const scene = deliveryScene(ctx.origin) ?? deliveryScene(ctx.actor);
  if (scene && MixinApi.isContainer(scene) && MixinApi.isContainable(orb)) {
    ContainmentApi.move(orb, scene);
  }
  const holder = ctx.actor;
  if (MixinApi.isVitals(holder)) {
    holder.afflict(
      sustainedRecord(ctx, spell, {
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
    if (text.length > 0) await caster.forceCommand(text);
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
  /**
   * The list actually about to fire — the BAND's list for an item, the
   * ordinary one for a cast. The gate must judge what will run, not the
   * uncursed default: a blessed remove curse whose branch is SCOPED
   * needs no mark, and reading `spell.effects` refused it for want of
   * one it never wanted.
   */
  effects: readonly Effect[] = spell.effects,
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
      // Same rule as `any`: a spell every one of whose effects finds its
      // own subjects (a scope) has nothing to aim.
      if (!target && MagicEffects.everyEffectNeedsTarget(effects)) {
        return `${spell.name} needs a mark.`;
      }
      return null;
    case 'any':
      // `any` means "object or creature, target optional" — and that
      // optionality is right for a working that still does something
      // untargeted (conjured water pools on the floor; a sense sweeps
      // the scene). It is WRONG for one whose every effect acts on a
      // mark: firebolt with nothing to burn is a no-op, and letting it
      // through means the executor refuses AFTER the spend leg has
      // already taken the caster's mana or the wand's charge.
      //
      // Found by live-driving: 45 targetless zaps flattened a 900 kJ
      // wand exactly as 45 real ones did. The gate belongs here, ahead
      // of the spend, and it governs BOTH triggers because both consult
      // this one function.
      if (!target && MagicEffects.everyEffectNeedsTarget(effects)) {
        return `${spell.name} needs a mark.`;
      }
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

/**
 * **The one implementation of moving a caster's reserve into a shell**,
 * and the only way charge enters the world outside manufacture.
 *
 * Both doors call it: `recharge <item> [amount]` (the amount-controlled
 * one) and any effect that reaches for a `charge` reserve. That is the
 * magic-items rule applied to itself — *an item is a new trigger, never
 * a new mechanism* — and it is what makes "you cannot fill a shell
 * without a coupling" true rather than merely intended.
 *
 * `committedPt` is what the caster puts in. What the shell gets is
 * `committed × coupling × competence`, **both factors below 1**; the
 * difference is heat in the coupling. The caster is debited for the
 * loss too — that energy left them whether or not it arrived.
 */
export interface ChargeTransfer {
  /** kJ that actually reached the shell. */
  delivered: number;
  /** Reserve points actually taken from the caster. */
  spent: number;
  /** kJ lost to the coupling. */
  lost: number;
  /** Player-facing line. */
  report: string;
  /** Why nothing moved, when nothing did. */
  refusal: string | null;
}

/** The skill half — Tarn's Rule over control·arcana, as a LOSS < 1. */
const COMPETENCE_EFFICIENCY = [0.4, 0.55, 0.78, 0.86, 0.92] as const;

async function transferChargeImpl(
  actor: Stuff,
  shell: Stuff,
  committedPt: number,
): Promise<ChargeTransfer> {
  const nil = (refusal: string): ChargeTransfer => ({
    delivered: 0,
    spent: 0,
    lost: 0,
    report: refusal,
    refusal,
  });
  if (!MixinApi.isCharged(shell)) {
    return nil('There is nothing in it that would hold a charge.');
  }
  if (!MixinApi.isCaster(actor) || !MixinApi.isReserved(actor)) {
    return nil('You have no gift to pour into it.');
  }
  const conduit = bestConduitFor(actor);
  if (!conduit) {
    return nil(
      'You hold the shape of it, and it goes nowhere — bare hands are a ' +
        'poor road for that much energy.',
    );
  }
  const available = actor.getMana()?.current.rawValue() ?? 0;
  const committed = Math.max(0, Math.min(committedPt, available));
  if (committed <= 0) return nil('You have nothing left to give it.');

  const efficiency =
    conduit.getCouplingEfficiency() * (await competenceEfficiency(actor));
  const offered = committed * efficiency;
  const delivered = shell.receiveCharge(offered);
  // Bill in proportion to what the shell accepted — a full tank
  // refusing the back half must not charge for it.
  const spent = offered > 0 ? committed * (delivered / offered) : 0;
  if (spent > 0) {
    actor.adjustReserve(MANA_RESERVE_KEY, Quantity.of(-spent, 'pt'));
  }
  const lost = Math.max(0, spent - delivered);
  return {
    delivered,
    spent,
    lost,
    refusal: null,
    report:
      delivered > 0
        ? `The shell drinks it down and warms in your hand. ` +
          `${delivered.toFixed(0)} kJ in, ${lost.toFixed(0)} kJ gone to the coupling.`
        : 'It is already as full as it will get.',
  };
}

/** The best coupling in reach: carried, or present where the actor is. */
function bestConduitFor(
  actor: Stuff,
): (Stuff & { getCouplingEfficiency(): number }) | null {
  const candidates: Stuff[] = [];
  if (MixinApi.isContainer(actor)) candidates.push(...actor.getContents());
  if (MixinApi.isContainable(actor)) {
    const env = actor.getContainer();
    if (env && MixinApi.isContainer(env)) candidates.push(...env.getContents());
  }
  let best: (Stuff & { getCouplingEfficiency(): number }) | null = null;
  for (const c of candidates) {
    if (!MixinApi.isConduit(c)) continue;
    if (!best || c.getCouplingEfficiency() > best.getCouplingEfficiency()) {
      best = c as Stuff & { getCouplingEfficiency(): number };
    }
  }
  return best;
}

/**
 * ⚠ Deliberately NOT `potencyFactor`, whose competence term is a bonus
 * `>= 1` above the required band. Multiplying delivered energy by that
 * would let a good caster deliver more than they spent.
 */
async function competenceEfficiency(actor: Stuff): Promise<number> {
  const [verbBand, nounBand] = await Promise.all([
    AdvancementApi.bandFor(actor, MagicGrid.verbDisciplineKey('control')),
    AdvancementApi.bandFor(actor, MagicGrid.nounDisciplineKey('arcana')),
  ]);
  const rank = Math.min(
    CompetenceBand.rank(verbBand),
    CompetenceBand.rank(nounBand),
  );
  const i = Math.max(0, Math.min(COMPETENCE_EFFICIENCY.length - 1, rank));
  return COMPETENCE_EFFICIENCY[i]!;
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
  ctx: EffectContext,
  spell: SpellDescriptor,
  fields: Partial<SustainedEffect> & { realizes: string },
): SustainedEffect {
  // **Duration IS the sustained family's delivered quantity.** A cloak
  // and a field have no magnitude field to scale, so a half dose buys
  // half the term — which is what the veiling draught's own seed claimed
  // all along while nothing implemented it.
  const seconds = spell.durationSeconds * ctx.potency;
  let expiresAt: number | undefined;
  if (seconds > 0) {
    try {
      if (StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        expiresAt = WorldClockApi.getNow().rawValue() + seconds;
      }
    } catch {
      expiresAt = undefined;
    }
  }
  // **Host-held or term-bought** (D12). A binding must be paid for
  // continuously; a CHARGED source can keep paying (standby draw meters
  // it against the shell's own reserve), so it is named as the renewer.
  // A cast or a consumable paid once — the term runs out and nothing
  // can re-buy it. That is a derivation, not a rule: it is exactly why
  // long-lived sustained effects are forged as rings and not bottled.
  const sustainedBy = MixinApi.isCharged(ctx.source)
    ? durableIdOf(ctx.source)
    : undefined;
  return {
    kind: 'sustained',
    spellId: spell.spellId,
    magicOrigin: ctx.tag,
    expiresAt,
    sustainedBy,
    sustainedFor: seconds > 0 ? seconds : undefined,
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

