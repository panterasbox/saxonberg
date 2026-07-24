/**
 * MagicLogic — the hot-reloadable logic singleton behind {@link MagicApi}.
 *
 * Lives at `/obj/api/magic` (a stateless `Stuff` singleton, no backing
 * `Template`); `MagicApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Owns the cast pipeline (gates → spend →
 * effects → provenance → Transcript credit) and the **effect executors**
 * — each a thin wrapper over its backing gated Api, per the governing
 * invariant (magic = a new trigger, never a new mechanism).
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
 * The **resist seam**, N-axis (DIV-1): the `channel` axis delegates
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
import { WorldClockApi } from '../../api/worldclock';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { Quantity } from '../../lib/quantity';
import { TemplatePaths, TemplatePathPrefixes } from '../../lib/paths';
import { Postures } from '../../lib/slot/Postured';
import { HazardActivity } from '../../lib/hazard/HazardActivity';
import { SchedulerApi } from '../../api/scheduler';
import { CompetenceBand } from '../../lib/advancement/CompetenceBand';
import type { Difficulty } from '../../lib/advancement/ActSignature';
import Condition from '../../lib/vitals/Condition';
import type {
  AfflictionRecord,
  SustainedEffect,
} from '../../lib/vitals/Condition';
import type { Vitals } from '../../lib/vitals/Vitals';
import type { Caster } from '../../lib/magic/Caster';
import { Faculty } from '../../lib/magic/Faculty';
import type { Effect, InjectChannelEffect } from '../../lib/magic/Effect';
import { MagicGrid, type MagicProvenance } from '../../lib/magic/Grid';
import { Resists } from '../../lib/magic/Resist';
import { Suppressions, type MagicSuppression } from '../../lib/magic/Suppression';
import type { SpellDescriptor } from '../../lib/magic/Spell';
import type SpellCatalogue from '../SpellCatalogue';
import type Material from '../../lib/material/Material';
import UnboundedReceptacle from '../UnboundedReceptacle';
import SparkSource from '../../lib/magic/SparkSource';
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
const GLOWLIGHT_ORB_PATH = '/lib/magic/GlowlightOrb';

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

  // The band gate on BOTH axes — competence IS access (DIV-11).
  const verbKey = MagicGrid.verbDisciplineKey(spell.verb);
  const nounKey = MagicGrid.nounDisciplineKey(spell.noun);
  const [verbBand, nounBand] = await Promise.all([
    AdvancementApi.bandFor(caster, verbKey),
    AdvancementApi.bandFor(caster, nounKey),
  ]);
  if (!CompetenceBand.atOrAbove(verbBand, spell.requiredBand)) {
    return {
      ok: false,
      refusal: `${spell.name} is beyond your command of ${spell.verb} — practice the operation.`,
    };
  }
  if (!CompetenceBand.atOrAbove(nounBand, spell.requiredBand)) {
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
  const base = spell.castSeconds || dial(AppSettingKeys.magicCastSecondsDefault, 3);
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
  reserved.reconcileFaculty();
  const pool = reserved.getReserve(MANA_RESERVE_KEY);
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

  // The provenance tag — the full grid address + the caster's durable id.
  const tag: MagicProvenance = {
    verb: spell.verb,
    noun: spell.noun,
    spellId: spell.spellId,
    caster: caster.getTemplatePath() ?? `stuff:${caster.stuffId}`,
  };

  // Competence-scaled potency: how far the caster's limiting band sits
  // above the spell's floor.
  const potency = await potencyFactor(caster, spell);

  const reports: string[] = [];
  for (const effect of spell.effects) {
    const report = await executeEffect(caster, target, spell, effect, tag, potency);
    if (report) reports.push(report);
  }
  if (overchanneled) {
    reports.push(
      'The working takes more than you had — the world greys at the edges.',
    );
  }

  // Credit BOTH grid axes on the Transcript (one act, two subchecks).
  const difficulty = difficultyOf(spell.requiredBand);
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
      requiredBand: spell.requiredBand,
      band: limiting,
      castable: CompetenceBand.atOrAbove(limiting, spell.requiredBand),
      description: spell.description,
    });
  }
  rows.sort((a, b) => a.cell.localeCompare(b.cell));
  return { faculty: casterView, spells: rows };
}

// ─────────────────── suppression (P7 wires the field) ───────────────────

/** Sync room-tier walk — filled in by the suppression phase. */
function suppressionAtImpl(_place: Stuff | null): MagicSuppression | null {
  return null;
}

/** Async deep tier (sync walk + zone chain) — filled in by the suppression phase. */
async function suppressionAtDeepImpl(
  place: Stuff | null,
): Promise<MagicSuppression | null> {
  return suppressionAtImpl(place);
}

// ─────────────────────────── the executors ───────────────────────────

async function executeEffect(
  caster: Stuff,
  target: Stuff | undefined,
  spell: SpellDescriptor,
  effect: Effect,
  tag: MagicProvenance,
  potency: number,
): Promise<string | null> {
  switch (effect.kind) {
    case 'inject-channel':
      return execInjectChannel(caster, target, effect, tag, potency);
    case 'afflict':
      return execAfflict(caster, target, effect, tag, potency);
    case 'relieve':
      return execRelieve(caster, target ?? caster, effect);
    case 'adjust-reserve': {
      const t = target ?? caster;
      if (!MixinApi.isReserved(t) || !t.hasReserve(effect.reserveKey)) {
        return 'Nothing there answers the draw.';
      }
      const unit = t.getReserve(effect.reserveKey)!.current.unit;
      t.adjustReserve(effect.reserveKey, Quantity.of(effect.delta, unit));
      return effect.delta >= 0 ? 'Vigor flows in.' : 'Something is drawn away.';
    }
    case 'move':
      return execMove(caster, target, effect.move, tag);
    case 'conjure':
      return execConjure(caster, target, effect);
    case 'sense':
      return execSense(caster, target);
    case 'cloak':
      return execCloak(caster, spell, effect.disguise, tag);
    case 'emit-field':
      return execEmitField(caster, spell, tag);
    case 'script':
      return execScript(caster, effect.source);
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
  caster: Stuff,
  target: Stuff,
  deliver: () => { report: string; harmed: boolean },
): Promise<string> {
  if (sceneOf(target) !== sceneOf(caster) && target !== sceneOf(caster)) {
    return 'Your reach ends at the scene before you.';
  }
  const { report, harmed } = deliver();
  if (harmed && MixinApi.isOrganism(target)) {
    appendHarmRow(caster, target);
  }
  return report;
}

/** The trap-spring producer, magic's own writer (see accountability.md). */
function appendHarmRow(caster: Stuff, victim: Stuff): void {
  // Inside one shared combat session the combat ledger owns the
  // encounter's rows (opened/violated/death carry the consent verdict) —
  // double-booking a harm row would double-count the same hurt.
  const casterSession = CombatApi.sessionFor(caster);
  if (casterSession && casterSession === CombatApi.sessionFor(victim)) return;
  AccountabilityApi.record({
    kind: 'harm',
    sessionId: `magic:${caster.stuffId}:${Date.now()}`,
    initiator: durableIdOf(caster),
    opponent: durableIdOf(victim),
    victim: durableIdOf(victim),
    killer: durableIdOf(caster),
    consented: false,
    sentient: SpeciesApi.isSentient(victim),
  });
}

function execInjectChannel(
  caster: Stuff,
  target: Stuff | undefined,
  e: InjectChannelEffect,
  tag: MagicProvenance,
  potency: number,
): Promise<string> | string {
  if (!target) return 'The working needs a mark.';
  if (e.channel === 'shock') {
    return deliverAt(caster, target, () => {
      const locus = StuffApi.createSync(() => new SparkSource());
      const scene = sceneOf(target) ?? sceneOf(caster);
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
    return deliverAt(caster, target, () => {
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
  caster: Stuff,
  target: Stuff | undefined,
  e: Extract<Effect, { kind: 'afflict' }>,
  tag: MagicProvenance,
  potency: number,
): Promise<string> {
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

  return deliverAt(caster, target, () => {
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
  _caster: Stuff,
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
  caster: Stuff,
  target: Stuff | undefined,
  move: 'shove' | 'pin',
  tag: MagicProvenance,
): Promise<string> {
  if (!target) return 'The working needs a mark.';
  if (move === 'shove') {
    if (!MixinApi.isPosed(target)) return 'It does not so much as rock.';
    return deliverAt(caster, target, () => {
      target.setPosture(Postures.Lie);
      return { report: 'The unseen blow takes them off their feet.', harmed: false };
    });
  }
  // pin — a timed body-slot hold (the hazard-pin engagement shape).
  if (!MixinApi.isEngaged(target)) return 'It cannot be held.';
  return deliverAt(caster, target, () => {
    const pin = new HazardActivity({
      actor: target,
      type: `magic-pin:${tag.spellId}`,
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

async function execConjure(
  caster: Stuff,
  target: Stuff | undefined,
  e: Extract<Effect, { kind: 'conjure' }>,
): Promise<string> {
  if (e.templatePath) {
    const conjured = await StuffApi.clone(e.templatePath);
    const scene = sceneOf(caster);
    if (scene && MixinApi.isContainer(scene) && MixinApi.isContainable(conjured)) {
      ContainmentApi.move(conjured, scene);
    }
    return `${conjured.getPresentation()} takes shape out of nothing.`;
  }
  // Bulk conjuration — real litres from a transient unbounded source.
  const materialPath = e.bulkMaterial!.startsWith('/')
    ? e.bulkMaterial!
    : `/lib/material/bulk/${e.bulkMaterial}`;
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
        : BulkableApi.floorSurfaceNear(caster);
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
        ? `Clear ${material.getPresentation()} wells up inside.`
        : `Clear ${material.getPresentation()} spatters onto the ground.`;
  } finally {
    StuffApi.destruct(source);
  }
}

function execSense(caster: Stuff, target: Stuff | undefined): string {
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
    const scene = sceneOf(caster);
    if (scene && MixinApi.isContainer(scene)) {
      for (const thing of scene.getContents()) scan(thing);
    }
    scan(caster);
  }
  return marks.length === 0
    ? 'No workings answer the second look.'
    : `Workings reveal themselves: ${marks.join('; ')}.`;
}

function execCloak(
  caster: Stuff,
  spell: SpellDescriptor,
  disguise: string,
  tag: MagicProvenance,
): string {
  if (!MixinApi.isVitals(caster)) return 'The veil finds nothing to settle on.';
  caster.afflict(sustainedRecord(spell, tag, { realizes: 'cloak', disguise }));
  pokeReconcile(caster);
  return 'The veil settles — watchers will see someone, never quite you.';
}

async function execEmitField(
  caster: Stuff,
  spell: SpellDescriptor,
  tag: MagicProvenance,
): Promise<string> {
  const orb = await StuffApi.clone(GLOWLIGHT_ORB_PATH);
  const scene = sceneOf(caster);
  if (scene && MixinApi.isContainer(scene) && MixinApi.isContainable(orb)) {
    ContainmentApi.move(orb, scene);
  }
  if (MixinApi.isVitals(caster)) {
    caster.afflict(
      sustainedRecord(spell, tag, {
        realizes: 'emit-light',
        boundStuffId: orb.stuffId,
      }),
    );
    pokeReconcile(caster);
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
  const above = Math.max(0, minRank - CompetenceBand.rank(spell.requiredBand));
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

