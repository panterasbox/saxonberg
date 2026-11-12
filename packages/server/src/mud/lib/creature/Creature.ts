/**
 * Creature — the body layer: a living physical thing that can break,
 * with or without agency.
 *
 * Sits between `Agent` (runtime active object) and `Character` (the
 * agent layer). Carries the **body** mixins — identity, species /
 * lifecycle, biological sex, anatomy slots, posture, description,
 * containment — plus (added by the Vitals build) vital signs,
 * reserves, and anatomy. `Character` extends `Creature` and adds the
 * **agency** mixins (command execution, perception, speech, movement,
 * engagement, social identity).
 *
 * The split exists because **vitals are body-state, not agent-state**:
 * a corpse, an anesthetized patient, a simple animal, and a sessile
 * frog are all bodies with full vital/anatomy state and reduced or
 * zero agency. Modelling the body below the agent makes that fall out
 * of the type hierarchy instead of being special-cased.
 *
 * Concrete on purpose — a bare `Creature` is a valid non-agent body
 * (a frog, a corpse, a test fixture). A future named NPC just extends
 * `Creature` (animate) or `Character` (animate + agency).
 *
 * This is NOT the place for agency (commands, perception verbs,
 * speech, locomotion), nor for narrative/social identity (persona,
 * pronouns) — those are `Character`-tier.
 *
 * Composition order (preserved from the original Character stack):
 * - `Organism` sits between `Named` and (the now-Character-tier)
 *   `Gendered` — species/lifecycle alongside basic identity.
 * - `BodyPlanSlots` sits outer of `Slotted` (overrides its defaults
 *   to derive slots from species → bodyPlan) and after `Organism`
 *   (which provides the species reference it reads).
 * - `Containable` is inner of `Mobile` (Character-tier) which uses
 *   its setContainer/getContainer — the one cross-layer dependency,
 *   still inner→outer.
 */

import { Agent } from '../stuff/Agent';
import { PropertiedMixin } from '../stuff/Propertied';
import { OrganismMixin } from '../species/Organism';
import { SlottedMixin } from '../slot/Slotted';
import { BodyPlanSlotsMixin } from '../slot/BodyPlanSlots';
import { PosedMixin } from '../character/Posed';
import { VisibleMixin } from '../description/Visible';
import { PerceptibleMixin } from '../description/Perceptible';
import { OlfactoryMixin } from '../perception/Olfactory';
import { PalateMixin } from '../metabolism/Palate';
import { ContainableMixin } from '../spatial/Containable';
import { ContainerMixin } from '../spatial/Container';
import { VitalsMixin } from '../vitals/Vitals';
import { SoilableMixin, WHOLE_SITE } from '../cleanliness/Soilable';
import { HygieneMixin } from '../cleanliness/Hygiene';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { ReservedMixin, Reserve } from '../reserve/Reserved';
import { LoadBearingMixin } from '../encumbrance/LoadBearing';
import { MetabolicMixin } from '../metabolism/Metabolic';
import { EatingMixin } from '../metabolism/Eating';
import { BuoyantMixin } from '../encumbrance/Buoyant';
import { ThermalMixin } from '../thermal/Thermal';
import { ThermalRegulationMixin } from '../thermal/ThermalRegulation';
import { ExertingMixin } from '../exertion/Exerting';
import { RespirationMixin } from '../respiration/Respiration';
import { DisguisableMixin } from '../disguise/Disguisable';
import { ConcealableMixin } from '../concealment/Concealable';
import { SlottableMixin } from '../slot/Slottable';
import { AttiredMixin } from '../slot/Attired';
import { CarryingMixin } from '../slot/Carrying';
import { PostmortemMixin } from '../mortality/Postmortem';
import { Quantity } from '../quantity';
import { Postures } from '../slot/Postured';
import type { ActRefusal } from '../craft/ActPlan';
import { Dimensions, SIZE_DEFAULTS } from '../spatial/Dimensions';
import type { VetoResult } from '../errors';
import type { Containable } from '../spatial/Containable';
import type { BoundaryOpening } from '../boundary/Conduit';
import { BODY_PROFILE_HEIGHT, type BodyProfile } from '../../platform/idea/LocomotionMode';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import type { SubscribableFieldDescriptor } from '../../api/mql-subscription';

// Body stack (inner → outer):
//   Container + Containable + Disguisable + Visible + Respiration +
//   Metabolic + Vitals + Reserved + Posed + BodyPlanSlots + Slotted +
//   Sexed + Organism + Named + Propertied + Agent, with LoadBearing
//   outermost.
// PropertiedMixin sits innermost (just outer of Agent) — the general
// dynamic per-instance property store. It carries no composition
// requirements and every body (frog, corpse, Character, Avatar) is a
// legitimate place for other objects to park state, so it belongs on
// the shared Creature base rather than being re-declared per subclass.
// DisguisableMixin sits outer of Visible (it scans worn slots and reads
// shortDescription to resolve the masking presentation); Stuff's
// getPresentation defers to it.
// VitalsMixin sits outer of Organism/BodyPlanSlots (it reads
// getSpecies() for the band profile and anatomy/slots). ReservedMixin
// sits inner of Vitals so the derived band can read the reserve surface.
// MetabolicMixin sits OUTER of Vitals/Reserved/Posed — it drives all
// three (basal drain, coupled recovery, the condition cascade) and
// overrides getReserve/getReserves to reconcile-on-read. It is INNER of
// LoadBearing so the encumbrance gauge keeps reading the reserve
// surface metabolism populates (LoadBearing's endurance read dispatches
// through the proxy to Metabolic's override).
// RespirationMixin sits immediately OUTER of Metabolic — it drives
// Vitals (`spo2`) only, reading the same vital surface. It is the first
// concrete engagement producer: at runtime it narrows the Character-tier
// Engaged/Mobile surfaces (the crisis drain + the move reassess). A bare
// non-Character Creature carries the breathable config + engine but,
// lacking an Engaged slot, holds no scheduled drain (the documented
// degenerate — the proof drownable is a Character).
// ThermalMixin sits OUTER of Respiration/Metabolic (it reads mass/material;
// the Phase-2 ThermalRegulationMixin wraps it to drive coreTemperature)
// and INNER of LoadBearing. A bare Creature is a plain Thermal object — a
// corpse cools toward ambient (algor mortis) as a passive drift; the
// living regulation layer (Phase 2) pins coreTemperature instead.
// (Thermal and Respiration are independent: respiration is schedule-
// driven and drives `spo2`; thermal overrides getVitalSign for
// `coreTemperature` only — neither reads the other's sign.)
// LoadBearingMixin sits outermost — the encumbrance gauge reads
// ⚠⚠ **`ChattelMixin` was here and is not any more** (the base-class
// narrowing build, D15). It arrived with D22/D98 — livestock, pets and
// future aquaculture wanted per-instance ownership with chain of title,
// and one composition line gave it out of shipped code. The argument was
// right and the host was one level too high: `Creature` is the base of
// `Character`, so it also declared that **every player Avatar, every Cast
// member, every Extra, every ShadeAvatar and every Corpse is somebody's
// property**. A person is nobody's chattel, and a corpse is evidence, not
// stock.
//
// It composes where the argument actually pointed: `KeptAnimal` (kernel)
// and ranching's `Livestock`. Both still stamp, both still carry chain of
// title, and D98's answer to rustling is untouched — a stolen animal keeps
// its provenance and cannot be sold cleanly, exactly as in life.
//
// ⭐ Nothing was ever stamped on the person side, so this is byte-identical
// for people: the narrowing removes a CLAIM, not a behaviour. That is the
// point — the claim is the author surface.
//
// ⚠⚠ **`BrandedMixin` was here and is not any more** (the base-class
// narrowing build). It arrived by the same one-line move as Chattel and
// with the same argument — *branding livestock is what marks were
// invented for* — but `Creature` is the base of `Character`, so it also
// put a maker's mark on every player Avatar, every Cast member, every
// Extra, every ShadeAvatar and every Corpse in the game. Nothing on this stack
// ever read it. It now composes where the argument actually pointed:
// `KeptAnimal` (kernel) and ranching's `Livestock`. A person is not
// somebody's product; a corpse is not somebody's stock.
//
// Container + Slotted + Tangible (Agent) + Reserved + Vitals, so it
// must compose outer of all of them (same placement logic as Vitals
// outer of Reserved).
// ConcealableMixin sits outermost (default `obvious`, a plain field
// carrier — placement is immaterial to the ordered body stack below). It
// lets a creature carry a concealment level so a lurking beast can be
// hidden until noticed; inert until authored (see concealment subsystem).
// PostmortemMixin wraps everything: it reads only lifecycle + the world
// clock, so its placement is immaterial to the ordered body stack, and
// being outermost puts its `canEvict` veto ahead of the others — a corpse
// objects to being collected before any inner layer gets a say.
// ⭐ Hygiene OUTERMOST (cleanliness, review): how a body is kept clean reads
// the covering stack (Attired) and writes the body's soil by part
// (Soilable), so it sits outside both — and clothing knows nothing of dirt.
const CreatureBase = PalateMixin(OlfactoryMixin(HygieneMixin(PostmortemMixin(
  ConcealableMixin(
  // ⭐ Buoyancy beside the burden (controllers-are-io D6 co-use split).
  BuoyantMixin(
  LoadBearingMixin(
    ContainerMixin(
    ContainableMixin(
      DisguisableMixin(
        // ⭐⭐ **Perceptible, beside Visible, because every BODY is
        // addressable.** A creature is referred to by keyword — `look
        // wolf`, `pet collie` — and carries the guaranteed-resolvable
        // handle its own field documentation describes.
        //
        // ⚠⚠ It was not composed here until 2026-09-10, and **48 shipped
        // agent rows have been authoring `primaryKeyword:` into a void**
        // the whole time (`clerk`, `wolf`, `sentry`, `collier`, `weaver`,
        // `dave`, `katie`, `pony`, `ox`…), plus 17 authoring `keywords:`.
        // The applier reflects only into fields a composed class
        // declares, so every one was discarded at hydration without a
        // word. Ranching had noticed the symptom and composed it on
        // `Livestock`/`WorkingAnimal` locally; those go, because the
        // answer was never "these two animals" — it was "a body".
        PerceptibleMixin(
        VisibleMixin(
        // ⭐ Every body can work and tires by working. Outer of the
        // thermal pair (it deposits heat on ThermalRegulation) and of
        // Metabolic (its reserve reads go through the reconciling
        // override, so a debit lands on a fresh value); inner of
        // LoadBearing (which reads its lean margin).
        ExertingMixin(
          ThermalRegulationMixin(
            ThermalMixin(
              RespirationMixin(
                // ⭐ The act of eating, carved off digestion (controllers-are-io D6).
                EatingMixin(
                MetabolicMixin(
                  // ⭐ Dirt by kind, per body part (cleanliness D4): every
                  // body that wears things can be dirty where it was
                  // touched. No clock — the retired HygieneMixin decayed
                  // clean hands to dirty by itself; now only an act soils.
                  SoilableMixin(
                  VitalsMixin(
                    ReservedMixin(
                      PosedMixin(
                        // A body OCCUPIES slots as well as offering them:
                        // Slotted (above) is the chair's side, Slottable is
                        // the sitter's. Every posture verb gates on it
                        // (`requiresSlottable`), and until this composed,
                        // `lie`/`sit`/`kneel` rejected every actor in the
                        // game with "you can't fit in a slot" — the
                        // validator's own docstring asserted actors "are
                        // always Slottable via Avatar's composition", which
                        // was never true. Found by driving the world.
                        SlottableMixin(
                        // ⭐ The receiving act (size-and-carrying D11):
                        // outer of Attired (it seats into the slot
                        // substrate), inner of LoadBearing (the burden
                        // reads what it placed). See Carrying.ts.
                        CarryingMixin(
                        // ⭐ The only composer of Attired: a body is the
                        // only thing that wears anything. See Attired.ts.
                        AttiredMixin(
                        BodyPlanSlotsMixin(
                          SlottedMixin(
                              OrganismMixin(
                                PropertiedMixin(Agent)
                              )
                            )
                          )
                        )
                        )
                        )
                        )
                      )
                    )
                  )
                ))
              )
            )
          )
        )
        )
        )
      )
    )
  )
  ))
  )
))));

/**
 * The body-condition bands, thin to fat — ⭐ a CLOSED, ordinal
 * vocabulary, and the words a stockman actually uses.
 */
export const BODY_CONDITION_BANDS = [
  'emaciated',
  'thin',
  'good',
  'fleshy',
  'fat',
] as const;

export type BodyConditionBand = (typeof BODY_CONDITION_BANDS)[number];

/**
 * ⭐ Exhaustive by construction: a sixth band cannot be added without
 * writing its sentence, so the coverage half of the band contract is
 * enforced by the compiler rather than by a memo.
 *
 * ⚠ What the compiler cannot check is whether adjacent bands are
 * DISTINGUISHABLE in prose — the half that actually matters, because two
 * bands that read alike collapse the whole opacity ladder silently. The
 * reviewer's test: *can a reader who does not know the number tell this
 * band from the one on either side of it?*
 */
/** A rider sits this share of its stature above its mount's back (D19). */
const SEATED_SHARE = 0.6;

/** The slots whose worn containers make a body deeper (a pack; D19). */
const WORN_BULK_SLOTS: readonly string[] = ['back', 'torso'];

/** Why a body cannot take a posture where it is (size and carrying D21). */
export type PoseRefusal = ActRefusal<'ceiling-too-low', { ceilingM: number; statureM: number }>;

const BODY_CONDITION_PHRASE: Readonly<Record<BodyConditionBand, string>> = {
  emaciated: 'wasted — every rib and the points of the hips standing out, and the coat gone staring',
  thin: 'thin; you can count the ribs at a glance and the backbone is a ridge',
  good: 'in good flesh — the ribs felt rather than seen',
  fleshy: 'well covered, running to fat over the tail head',
  fat: 'fat, and carrying more of it than is good for anything',
};

/**
 * The lean (muscle) bands, slight to powerful — the second axis of the
 * build phrase. ⭐ Fat is what you ate; lean is what you did.
 */
export const LEAN_BANDS = ['slight', 'ordinary', 'hard', 'powerful'] as const;
export type LeanBand = (typeof LEAN_BANDS)[number];

/**
 * ⭐⭐ **The build phrase — the mirror.** Flesh band × lean band, person
 * register, describing a body and naming nobody. This is what `look`
 * prints about a person and what two bodies of one species that spent a
 * season differently read as. The reviewer's test, as for the stockman's
 * table: every adjacent cell must read DIFFERENTLY, and no cell is a
 * number in words.
 *
 * ⚠ This is one culture's vocabulary. The cosmetics slate's *Beauty*
 * section names this table as the attach point a per-culture canon
 * replaces; the shape (facts in, a described line out) does not change.
 */
const BODY_BUILD_PHRASE: Readonly<
  Record<BodyConditionBand, Readonly<Record<LeanBand, string>>>
> = {
  emaciated: {
    slight: 'gaunt — skin over bone',
    ordinary: 'gaunt',
    hard: 'gaunt and stringy',
    powerful: 'gaunt and stringy',
  },
  thin: {
    slight: 'slight, with no flesh to spare',
    ordinary: 'lean',
    hard: 'wiry',
    powerful: 'rangy and hard',
  },
  good: {
    slight: 'soft, in good flesh',
    ordinary: 'in good flesh',
    hard: 'in good flesh, hard',
    powerful: 'broad and hard',
  },
  fleshy: {
    slight: 'heavyset and soft',
    ordinary: 'heavyset',
    hard: 'heavyset, thick through the shoulders',
    powerful: 'burly',
  },
  fat: {
    slight: 'fat, and carrying it badly',
    ordinary: 'running to fat',
    hard: 'running to fat, but strong under it',
    powerful: 'massive',
  },
};

/** The body-mass-index bands — the physician's word for a weight. */
export const BMI_BANDS = ['underweight', 'healthy', 'overweight', 'obese'] as const;
export type BmiBand = (typeof BMI_BANDS)[number];

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

/**
 * Creature concrete class — a living body. `Character` extends this
 * and adds agency. `Agent` already registers the top-level branch;
 * `Creature` does not re-register.
 */
export class Creature extends CreatureBase {
  /**
   * ⭐ The shelf's BODY row — the reserve bands as words, with the build
   * phrase beside them. A live field on the `self` card, re-resolved
   * when `ExertingMixin.noteBodyState` pokes the durable subject on a
   * band crossing (never every slice). Words only: *winded*, *hungry*,
   * *in good flesh, hard* — the mirror, never a gauge.
   */
  static subscribableFields: SubscribableFieldDescriptor[] = [
    {
      name: 'bodyState',
      read: (stuff) => {
        const c = stuff as Creature;
        return { ...c.bodyState(), build: c.bodyBuildPhrase() };
      },
    },
  ];

  constructor() {
    super();
    // Every living body starts with its biological reserves (endurance /
    // satiation / hydration) at full. Idempotent — hydration overwrites
    // from stored values afterward.
    this.installBiologicalReserves();
  }

  // ── dirt on the body (cleanliness D4) ──
  // ⭐ A body's sites are its PART keys. Which LAYER an act reaches —
  // the glove or the bare hand — is the wearer's question and lives on
  // `AttiredMixin` (`soilBodyPart`, `soilHands`, `handCleanliness`);
  // this class only words what is on the bare skin.

  /**
   * Skin holds no set stain: hot water on bloodied hands washes them (a
   * bath from the copper is ~330 K, over blood's 318 K set point — it set
   * the blood on the bather's hands, found by the drive).
   */
  public override holdsSetStains(): boolean {
    return false;
  }

  /**
   * A body wash wets the share of the body washed — a hand is ~3% of
   * the skin, so washing your hands leaves you dry and a bath soaks you
   * (B56). `''` is the whole skin.
   */
  public override washedShare(site: string): number {
    if (site === '') return 1;
    return this.surfaceShareOf((k) => k === site);
  }

  /**
   * ⭐ A soaked body holds a FILM of water on its skin, not its flesh's
   * absorption capacity × 70 kg — the water a towel takes (B56). Skin
   * area by Meeh's law (`0.1 · m^(2/3)` m², ~1.7 m² at 70 kg) × the film
   * per m² (`wetness.skinFilmKgPerM2`, 0.2): about a third of a litre.
   */
  public override waterCapacityKg(): number {
    const massKg = this.getMass().rawValue();
    if (!(massKg > 0)) return 0;
    const areaM2 = 0.1 * Math.pow(massKg, 2 / 3);
    return areaM2 * dial(AppSettingKeys.wetnessSkinFilmKgPerM2, 0.2);
  }

  /**
   * The soil on the BARE skin, by region — *Your hands are bloodied.* What
   * a garment carries is the garment's line (and the dressed impression's
   * upkeep clause), so only parts nothing covers are spoken for here.
   */
  public soilLookLine(viewer: Stuff | null = null): string {
    const regions: Array<[string, string[]]> = [
      ['hands', this.handSites()],
      ['feet', this.footSites()],
    ];
    const claimed = new Set(regions.flatMap(([, keys]) => keys));
    const rest = this.soilSites().filter((s) => s !== WHOLE_SITE && !claimed.has(s));
    const bySite = new Map<string, string[]>();
    for (const site of rest) {
      const region = site.split('.').pop() ?? site;
      bySite.set(region, [...(bySite.get(region) ?? []), site]);
    }
    regions.push(...bySite.entries());
    const possessive = viewer === (this as unknown as Stuff) ? 'Your' : 'Their';
    const lines: string[] = [];
    for (const [region, keys] of regions) {
      const bare = keys.filter((k) => this.outermostAt(k) === null);
      let worst = '';
      let worstLoad = 0;
      for (const k of bare) {
        const load = this.soilAt(k);
        if (load > worstLoad) {
          worstLoad = load;
          worst = k;
        }
      }
      if (!worst) continue;
      const phrase = this.soilPhrase(worst);
      if (!phrase) continue;
      const verb = region.endsWith('s') ? 'are' : 'is';
      lines.push(`${possessive} ${region} ${verb} ${phrase}.`);
    }
    return lines.join(' ');
  }

  // ── biological reserve readers — the contract surface ──
  // The convenience readers that spare consumers the reserve keys (the
  // `Combustible.getFuelRemaining` / `Caster.getMana` pattern): a
  // combat tempo read, an encumbrance margin, an authored brain or
  // script checking "is this body tired/hungry/thirsty" all come here.
  // Metabolic hooks the underlying keyed reads, so each carries the
  // metabolism reconcile — never a stale value. Always present (the
  // constructor installs them), hence non-null. See the reserve
  // landscape table in `lib/reserve.ts`.

  /** The endurance reserve (exertion capacity), reconciled. */
  public getEndurance(): Reserve {
    return this.getReserve('endurance')!;
  }

  /** The satiation reserve (food fuel), reconciled. */
  public getSatiation(): Reserve {
    return this.getReserve('satiation')!;
  }

  /** The hydration reserve (the tighter recovery leash), reconciled. */
  public getHydration(): Reserve {
    return this.getReserve('hydration')!;
  }

  /**
   * ⭐⭐ **The flesh reserve — body condition, which is fat cover, which
   * is a STOCK.**
   *
   * > **`satiation` is hours; `flesh` is months.** Satiation is the flow;
   * > this is the stock the flow deposits into.
   *
   * ⚠ It is the raw number, and almost nobody should be reading it. What
   * a person standing in front of an animal gets is
   * {@link Creature.bodyConditionBand} — *by eye* a coarse band, and a
   * precise score only by laying hands on it, because real body condition
   * scoring is palpation of spine and ribs. **Precision costs an act.**
   */
  public getFlesh(): Reserve {
    return this.getReserve('flesh')!;
  }

  /**
   * ⭐⭐ **The lean reserve — muscle, the second stock.** Fat is what you
   * ate; lean is what you did. Moved up by overload (`ExertingMixin`),
   * relaxed back by idleness (`Metabolic.partitionLean`), frozen by
   * absence. Read it as a band inside {@link bodyBuildPhrase}; the raw
   * number is for the body's own economy.
   */
  public getLean(): Reserve {
    return this.getReserve('lean')!;
  }

  /** The amino pool — filled by the `protein` tag, spent by muscle gain. */
  public getProtein(): Reserve {
    return this.getReserve('protein')!;
  }

  /**
   * Conditioning — the stock the `wind` Discipline's band is a threshold
   * over. Seeded empty; earned by duration at a sustainable pace; fades
   * while you play and never while you are away.
   */
  public getWind(): Reserve {
    return this.getReserve('wind')!;
  }

  /** The years clock — full to empty over a dialled month of active play
   * on a diet with no citrus in it; its floor is scurvy. */
  public getVitaminC(): Reserve {
    return this.getReserve('vitamin-c')!;
  }

  /** ⭐ The donation reserve — how much lost blood the body can still make
   * good (D11). Full on a fresh body; `drawBlood` spends it and the
   * metabolism slice regrows it slowly. Read as pallor, never a number. */
  public getMarrow(): Reserve {
    return this.getReserve('marrow')!;
  }

  /**
   * ⭐ **The band, which is what a reader actually gets** (D24).
   *
   * The reserve is stored and the band is derived — the same relationship
   * soil moisture already has, and the honest-opacity model exactly: one
   * real number underneath, three fidelities of reading over it.
   *
   * ⚠ **Not `getConditionBand`, and the collision is why this is named
   * `flesh` at all.** `VitalsMixin.getConditionBand` already means
   * something different and correct — how degraded a body is RIGHT NOW
   * from floored reserves and open wounds. Body condition is weeks of
   * nutrition. Two real concepts, one English word, so the shipped one
   * keeps it. *"In good flesh"* is stockman's language for precisely
   * this and sits beside satiation and hydration without reading like a
   * stat.
   */
  public bodyConditionBand(): BodyConditionBand {
    const flesh = this.getReserve('flesh');
    if (!flesh) return 'good';
    const capacity = flesh.capacity.rawValue();
    const fraction = capacity > 0 ? flesh.current.rawValue() / capacity : 0;
    if (fraction < 0.12) return 'emaciated';
    if (fraction < 0.3) return 'thin';
    if (fraction < 0.72) return 'good';
    if (fraction < 0.9) return 'fleshy';
    return 'fat';
  }

  /**
   * What that band looks like — ⭐ **a percept, never a number in
   * words** (D86). A reader sees the animal and infers the husbandry;
   * they are not handed a gauge with a costume on.
   */
  public bodyConditionPhrase(): string {
    return BODY_CONDITION_PHRASE[this.bodyConditionBand()];
  }

  /** The lean band — the second axis of the build phrase. */
  public leanBand(): LeanBand {
    const lean = this.getReserve('lean');
    if (!lean) return 'ordinary';
    const capacity = lean.capacity.rawValue();
    const fraction = capacity > 0 ? lean.current.rawValue() / capacity : 0;
    if (fraction < 0.25) return 'slight';
    if (fraction < 0.6) return 'ordinary';
    if (fraction < 0.85) return 'hard';
    return 'powerful';
  }

  /**
   * ⭐⭐ **The mirror** — what a body looks like, flesh × lean, in the
   * person register. A percept, never a number in words: *wiry*, *in
   * good flesh*, *running to fat*. What `look <person>` prints, and what
   * two bodies that spent a season differently read as. Names nobody.
   */
  public bodyBuildPhrase(): string {
    return BODY_BUILD_PHRASE[this.bodyConditionBand()][this.leanBand()];
  }

  /**
   * Body mass index — mass over the species' stature squared, or `null`
   * for a body with no stature to read. ⚠ A derived number for the
   * physician's band ({@link bodyMassIndexBand}); nothing renders it.
   */
  public bodyMassIndex(): number | null {
    const stature = this.getSpecies()?.getStature() ?? 0;
    if (stature <= 0) return null;
    const mass = this.getMass().rawValue();
    if (mass <= 0) return null;
    return mass / (stature * stature);
  }

  /** The BMI band in the physician's words; `healthy` when unreadable. */
  public bodyMassIndexBand(): BmiBand {
    const bmi = this.bodyMassIndex();
    if (bmi === null) return 'healthy';
    if (bmi < 18.5) return 'underweight';
    if (bmi < 25) return 'healthy';
    if (bmi < 30) return 'overweight';
    return 'obese';
  }

  /**
   * Whole-body density from the fat fraction — fat at 900 kg/m³, lean
   * tissue at 1100. `F = 0.08 + 0.32 × flesh/100`: an emaciated body is
   * 8 % fat, an obese one 40 %. ⭐ Fat floats: the consumer is the water.
   */
  public getBodyDensity(): Quantity<'kg/m³'> {
    const flesh = this.getReserve('flesh');
    const fraction = flesh
      ? flesh.current.rawValue() / Math.max(1, flesh.capacity.rawValue())
      : 0.55;
    const fat = 0.08 + 0.32 * fraction;
    return Quantity.of(1 / (fat / 900 + (1 - fat) / 1100), 'kg/m³');
  }

  /**
   * ⭐ A body's room is its mass over its own density (size and carrying
   * D2) — fat floats and takes more room for its weight. Never its
   * material's: flesh is not what a body is made of, it is what it is.
   */
  public override getVolumeM3(): number | null {
    const kg = this.getMass().rawValue();
    const rho = this.getBodyDensity().rawValue();
    return kg > 0 && rho > 0 ? kg / rho : null;
  }

  /**
   * The body's height standing, m — the species' stature (own, else its
   * plan's); `null` for a body with none to read. Overrides `Posed`'s hook:
   * the ceiling `stand` is asked against.
   */
  public override getStature(): number | null {
    const stature = this.getSpecies()?.getStature() ?? 0;
    return stature > 0 ? stature : null;
  }

  /**
   * ⭐ May this body take `posture` where it is? (size and carrying D21)
   * `stand` is refused `ceiling-too-low` under a ceiling lower than its
   * stature; open sky has no ceiling, so never there. Asks, never changes
   * the posture. On the body, not on `Posed`: posture-as-held and
   * posture-as-allowed-here are two ideas (`lint:mixin-clusters`).
   */
  public acceptPosture(posture: string): PoseRefusal | null {
    if (posture !== Postures.Stand) return null;
    const statureM = this.getStature();
    if (statureM === null) return null;
    const room = this.getContainer();
    if (room === null || !MixinApi.isAtmospheric(room)) return null;
    const ceilingM = room.getCeilingHeight()?.rawValue() ?? null;
    if (ceilingM === null || ceilingM + 1e-9 >= statureM) return null;
    return { ok: false, reason: 'ceiling-too-low', facts: { ceilingM, statureM } };
  }

  /**
   * ⭐⭐ **Nothing sits loose on a body** (size and carrying D11 — the
   * flip, W7). A thing may enter a body's contents only as something the
   * body holds, wears or has placed on a worn host:
   *
   * - `how.placed` — it arrives with a placement pair on a host here (a key
   *   into a coat's pocket, a pouch hung from the belt, a coat's pocketed
   *   things following the coat, D33);
   * - or the body is admitting it (`Carrying.admitWhile`): its own
   *   `receive` and `seatInSlot`, readying, and the restore replaying what
   *   it carried.
   *
   * Anything else — a direct `ContainmentApi.move(thing, body)` — is
   * refused `loose-on-body`: the caller wanted `receive`. The tape measure
   * runs first, as for any container.
   */
  public override canAddContainable(thing: Stuff & Containable, how?: { placed?: boolean }): VetoResult {
    const fit = super.canAddContainable(thing);
    if (!fit.ok) return fit;
    if (how?.placed === true || thing.isAgent() || this.isAdmitting(thing)) return { ok: true };
    return { ok: false, reason: 'loose-on-body' };
  }

  /**
   * ⭐ D32: a restored body puts anything it finds loose where a carried
   * thing goes — the first load after the flip places a pre-flip
   * inventory (hands, pockets, packs, the overflow at home with a line).
   * Chained from `Persistable.onRestored`.
   */
  public async onRestored(): Promise<void> {
    await this.placeLoose();
  }

  /**
   * ⭐ **The body's envelope** (size and carrying D19) — the gap it needs
   * to pass, `{ width, height }` m, moving with `profile`:
   *
   * - height = stature × `BODY_PROFILE_HEIGHT[profile]` (upright 1.0,
   *   crouched 0.6, prone and horizontal 0.4);
   * - width = girth = `2·√(mass / (π · stature · density))`, a cylinder of
   *   the body's own density;
   * - what it wears on its back or torso (a pack — {@link wornBulk}) rides
   *   on top when it goes low (prone, horizontal), and trails behind it
   *   upright, where a way's face does not see it;
   * - mounted, the pair: the mount's height plus the rider's seated share
   *   (`stature × 0.6`), as wide as the wider of them.
   *
   * With no gravity — or through a way UP or DOWN (`lengthwise`), where the
   * body's length runs along the way — it fits by its narrowest way round.
   * What the hands hold is NOT here: each held thing is measured on its own
   * (`Exit.clearanceRefusal`). `bare` leaves the worn bulk out (would it
   * pass without the pack?). `null` when the body has no size to read.
   */
  public envelope(
    profile: BodyProfile,
    opts: { lengthwise?: boolean; bare?: boolean } = {},
  ): BoundaryOpening | null {
    const pair = this.mountedPair();
    if (pair !== null) {
      const mount = pair.mount.ownEnvelope('upright', { lengthwise: opts.lengthwise === true });
      const rider = pair.rider.ownEnvelope('upright', opts);
      const riderStature = pair.rider.getStature();
      if (mount === null || rider === null || riderStature === null) return null;
      return {
        width: Math.max(mount.width, rider.width),
        height: mount.height + riderStature * SEATED_SHARE,
      };
    }
    return this.ownEnvelope(profile, opts);
  }

  /**
   * The mount and its rider when this body is either (the rider in a
   * mount's slot); `null` on foot.
   */
  public mountedPair(): { mount: Creature; rider: Creature } | null {
    const self = this as unknown as Stuff;
    if (MixinApi.isMountable(self)) {
      const rider = self.getMountOccupant();
      return rider instanceof Creature ? { mount: this, rider } : null;
    }
    if (MixinApi.isSlottable(self)) {
      const host = self.getOccupiedHost();
      if (host instanceof Creature && MixinApi.isMountable(host) && host.getMountOccupant() === self) {
        return { mount: host, rider: this };
      }
    }
    return null;
  }

  /**
   * ⭐ What the body wears that makes it bigger (D19, size-and-carrying W7):
   *
   * - **deeper** — the containers occupying its back or torso (a pack), and
   *   the depth they add: the cube root of their bulk, each the most of its
   *   packed self, its authored box, or its walls and what is in it (a
   *   hollow thing's derived size measures only its walls, D4-b);
   * - **wider** — what HANGS from a worn host (a pannier from the pack
   *   saddle, a pouch from the belt: a placement whose member `hangs`).
   *   ⭐ The rule: a hung thing rides flat against the flank, so it stands
   *   out by its **thinnest side**; hung things go either side, so their
   *   thicknesses add — a pannier pair, one each side, widens a 0.58 m
   *   mule by 0.6 m, and the steading's 0.8 m paddock gate refuses it
   *   laden (drive 18). A pocket's things do not widen (they are in the
   *   garment); what the hands hold is measured on its own.
   */
  public wornBulk(): { things: Stuff[]; depthM: number; hung: Stuff[]; sideM: number } {
    const things: Stuff[] = [];
    let volume = 0;
    for (const slot of WORN_BULK_SLOTS) {
      if (!this.getSlotSpec(slot)) continue;
      for (const worn of this.getOccupants(slot)) {
        if (things.includes(worn) || !MixinApi.isContainer(worn) || !MixinApi.isTangible(worn)) continue;
        let inside = worn.getMatterVolumeM3() ?? 0;
        for (const c of worn.getContents()) {
          if (MixinApi.isTangible(c)) inside += c.getFitBox()?.boxVolume() ?? 0;
        }
        const authored = worn.hasAuthoredSize() ? (worn.getDimensions()?.boxVolume() ?? 0) : 0;
        const bulk = Math.max(worn.getPackedVolumeM3() ?? 0, authored, inside);
        if (bulk > 0) {
          things.push(worn);
          volume += bulk;
        }
      }
    }
    // What hangs from a worn host stands out from the flank by its thinnest side.
    const wornIds = new Set<string>();
    for (const occ of this.getAllOccupants().values()) for (const o of occ) wornIds.add(o.stuffId);
    const hung: Stuff[] = [];
    let sideM = 0;
    for (const item of this.getContents()) {
      const pair = MixinApi.isContainable(item) ? item.getPlacement() : null;
      if (pair === null || !wornIds.has(pair.host.stuffId) || !MixinApi.isPlacing(pair.host)) continue;
      if (!pair.host.placementOf(pair.name).getHangs() || !MixinApi.isTangible(item)) continue;
      // Its authored box when it has one (a pannier keeps its frame's
      // shape); else what it packs to.
      const box = item.hasAuthoredSize() ? item.getDimensions() : item.getFitBox();
      const thin = box !== null ? Math.min(box.width, box.depth, box.height) : 0;
      if (thin > 0) {
        hung.push(item);
        sideM += thin;
      }
    }
    return { things, depthM: volume > 0 ? Math.cbrt(volume) : 0, hung, sideM };
  }

  /** This body's own envelope — on foot, no mount. */
  private ownEnvelope(
    profile: BodyProfile,
    opts: { lengthwise?: boolean; bare?: boolean },
  ): BoundaryOpening | null {
    const stature = this.getStature();
    const mass = this.getMass().rawValue();
    const rho = this.getBodyDensity().rawValue();
    if (stature === null || !(mass > 0) || !(rho > 0)) return null;
    const girth = 2 * Math.sqrt(mass / (Math.PI * stature * rho));
    const bulk = opts.bare === true ? null : this.wornBulk();
    const pack = bulk?.depthM ?? 0;
    const wide = girth + (bulk?.sideM ?? 0);
    const place = this.getEnclosingPlace();
    const g = place !== null && MixinApi.isAtmospheric(place)
      ? place.gravityNow().rawValue()
      : SIZE_DEFAULTS.STANDARD_GRAVITY;
    if (opts.lengthwise === true || !(g > 0)) {
      return new Dimensions(wide, girth + pack, stature).crossSection();
    }
    const height = stature * BODY_PROFILE_HEIGHT[profile];
    const low = profile === 'prone' || profile === 'horizontal';
    return { width: wide, height: low ? height + pack : height };
  }

  /**
   * Mass override that lazy-seeds the body-grounded default. When the
   * instance authored no mass of its own (still `0`), resolve
   * `species → baseMass` (own, else the plan's) and adopt it; an explicitly-authored
   * mass is the deviation that wins (the guard short-circuits and this is
   * a plain `super.getMass()`).
   *
   * Runs lazily here rather than from a post-hydrate hook: the
   * `onCreate` chain is not uniformly threaded below `CommandGiver`
   * (e.g. `Avatar.onCreate` does not `super`-call), so a read-time
   * seed is the one seam that makes mass honest for *every* reader of
   * *every* Creature subclass, the moment a body plan is resolvable. The
   * "is mass still 0?" check is the idempotency guard — no persistent
   * "seeded" flag (the project rule); a genuinely 0-mass sessile body
   * simply re-checks cheaply.
   */
  override getMass(): Quantity<'kg'> {
    const current = super.getMass();
    const frame =
      current.rawValue() !== 0
        ? current
        : (this.seedMassFromBodyPlan() ?? current);
    return this.withBodyComposition(frame);
  }

  /**
   * ⭐ **The stocks reach mass, so the tape notices.** The frame (the
   * species figure, or an authored mass) plus what the body has put on
   * or taken off: `massPerFleshPct × (flesh − seed) + massPerLeanPct ×
   * (lean − seed)`. One read, and every mass consumer — carry capacity,
   * the basal drain, thermal mass, the fist, the tailor's girth —
   * inherits it. A fresh body masses exactly its frame; a body lacking
   * the reserves (anything that is not a living body) adds nothing.
   *
   * ⚠ Reads the stored reserve values RAW (no reconcile): mass is read
   * on hot paths (`wouldExceedCeiling`), and the reconcile itself reads
   * mass for the basal drain. The stocks move on the metabolism clock,
   * which every other read already turns.
   */
  protected withBodyComposition(frame: Quantity<'kg'>): Quantity<'kg'> {
    if (frame.rawValue() <= 0) return frame;
    const seeds = Reserve.defaultBiological();
    const flesh = this.reserves['flesh'];
    const lean = this.reserves['lean'];
    let delta = 0;
    if (flesh && seeds.flesh) {
      delta +=
        dial(AppSettingKeys.bodyMassPerFleshPct, 0.3) *
        (flesh.currentValue - seeds.flesh.currentValue);
    }
    if (lean && seeds.lean) {
      delta +=
        dial(AppSettingKeys.bodyMassPerLeanPct, 0.25) *
        (lean.currentValue - seeds.lean.currentValue);
    }
    if (delta === 0) return frame;
    return Quantity.of(Math.max(0, frame.rawValue() + delta), 'kg');
  }

  /**
   * Resolve the species' `baseMass` and adopt it as this body's mass,
   * returning the seeded quantity (or `null` when there is no plan /
   * `baseMass` is absent or `0`). Does **not** read `getMass()` — the
   * zero-guard lives in {@link getMass}, so this stays recursion-free and
   * is the single place the body-grounded default is applied.
   */
  protected seedMassFromBodyPlan(): Quantity<'kg'> | null {
    const species = this.getSpecies();
    /*
     * ⭐ The SPECIES answers first, and the body plan is the fallback.
     *
     * `baseMass` is a body-SHAPE default — every quadruped shares one
     * number, so it cannot tell a cow from a collie — and a plan that
     * authors none leaves the body at zero. `quadruped` and `avian` both
     * did, so every four-legged and every winged animal massed nothing
     * until 2026-09-06. The species' own `adultMass`, walked down its
     * maturation curve, is the honest number; the plan's default stands
     * for a species that does not state one.
     */
    const speciesMass = species?.massAt(this.getAgeDays());
    if (speciesMass !== undefined && speciesMass > 0) {
      const seeded = Quantity.of(speciesMass, 'kg');
      this.setMass(seeded);
      return seeded;
    }
    // ⚠⚠ `Species.getBaseMass()`, NOT the body plan's. The species
    // accessor is *own, else the plan's* — it is documented as "the one
    // accessor every reader goes through" and names this function as one
    // of exactly three. Reaching past it to the PLAN skipped the species
    // layer, so every playable species fell back to `biped`'s 70 kg:
    // a halfling and a dragonborn massed the same, carried the same,
    // cooled at the same rate and punched with the same energy.
    //
    // It went unseen because `massAt` (the husbandry build's maturation
    // curve) answers first and is right for ANIMALS — every ranched
    // species authors `adultMass` — while no playable hominid does, so
    // `massAt` returns 0 for exactly the rows whose `baseMass` this then
    // failed to read. The bench that catches it lives in `test:gym`,
    // outside `pnpm test`, which is how it stayed red.
    const baseMass = species?.getBaseMass();
    if (baseMass !== undefined && baseMass > 0) {
      const seeded = Quantity.of(baseMass, 'kg');
      this.setMass(seeded);
      return seeded;
    }
    return null;
  }

  // The `ingest` seam now lives on `MetabolicMixin` (composed into the
  // body stack above): a living body routes consumed `{ material,
  // amount, phase }` into its digestion buffer. `drink`/`sip` fill the
  // liquid sub-volume, `eat` the solid one. See `lib/metabolism/`.
}
