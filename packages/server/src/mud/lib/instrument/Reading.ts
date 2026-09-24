/**
 * Reading — ⭐⭐⭐ **a channel of the world you can find something out
 * about**, and the ladder of ways to find it out.
 *
 * ## What a reading is
 *
 * One `Reading` is one FACT the world computes and does not state:
 * the light here, the pressure here, the strike of the ore under your
 * feet, what this lump is made of, how hurt this person is. The verb
 * `measure` asks for it with an instrument; `analyze` asks for it with
 * your eyes and your training. **Both are the same channel**, which is
 * why a channel is one object and not two controllers.
 *
 * A channel is a **row**:
 *
 * ```yaml
 * class: /platform/idea/reading/LightReading
 * hydratorClass: /platform/idea/persistence/PersistentHydrator
 * data:
 *   channel: light
 *   kind: fact
 *   scope: [here, subject]
 *   discipline: awareness
 *   instrument: photometry
 *   eyeCeiling: expert
 *   improves: "whether there is light enough to work, read or sight by"
 *   stakes: "an hour lost, a shot you cannot reshoot"
 * ```
 *
 * ⭐ **Installing a pack installs its channels, and nothing else
 * registers them.** A trade ships `content/<root>/idea/reading/<x>.yaml`
 * and `src/idea/reading/<X>Reading.ts` and is done: no platform file
 * changes, no list to edit, no stanza in a kernel view. That is the
 * requirements doc's load-bearing test, and the reason this is a row
 * rather than a `subcommands:` key — a stanza in the platform's view is
 * advertised in every install and dies on dispatch wherever the pack is
 * absent.
 *
 * ## ⭐⭐ The rule the whole thing exists to state
 *
 * > **Competence resolves detail. It never resolves access.**
 *
 * Every rung of every channel is open to everybody. An untrained reader
 * gets a true answer, coarsely; a practised one gets the same answer
 * narrowly; an instrument raises the CEILING of what practice can
 * realize, and never substitutes for it. So:
 *
 *   - {@link bandOf} reads the actor's band in the channel's Discipline;
 *   - {@link ceilingOf} reads what the instrument in hand can realize;
 *   - the effective band is the **minimum** of the two — never a sum.
 *     A novice with a masterful dial reads novice-wide; an expert with a
 *     poor dial is capped by the dial.
 *   - {@link observe} widens the bracket by band, always **containing
 *     the truth** — a coarse reading is vague, never wrong.
 *
 * ⚠ Nothing on this class gates on a band. A refusal here always names
 * a missing ROUTE — *"you have no way to tell that by eye; a photometer
 * would"* — never a missing rank. That is the retired-conferral doctrine
 * in the instrument register: *the verb is global and the outcome is
 * graduated; absence cannot carry a reason.*
 *
 * ## The rungs
 *
 * Three `@hook`s, each with a base implementation that **refuses by
 * naming what would work**, so a channel that has no eye rung is honest
 * for free and a channel that has no bench rung says so:
 *
 * | hook | the act | what it needs |
 * |---|---|---|
 * | {@link analyze} | the trained eye | nothing, or a `handTool` that lifts its ceiling |
 * | {@link measure} | the carried instrument | a tool declaring `instrument:` |
 * | {@link benchRead} | the fixed bench | a sample, and a bench declaring `bench:` |
 *
 * And {@link truth} is the fourth thing, which is not a rung at all:
 * **the engine's own read**, unbanded and unbracketed. Tests assert
 * against `truth()`; a player never sees it.
 */

import { Idea } from '../stuff/Idea';
import { SingletonMixin } from '../stuff/Singleton';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { MaterialApi } from '../../api/material';
import { Mml } from '../../api/mml';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { WorldClockApi } from '../../api/worldclock';
import { SecurityPolicies } from '../security/SecurityPolicies';
import { CallSecurity } from '../security/decorators';
import { CompetenceBand } from '../advancement/CompetenceBand';
import type { CompetenceBandName } from '../advancement/CompetenceBand';
import { DISCOVERY } from '../belief/BeliefStore';
import type { CommandContext } from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Tooled } from '../craft/Tooled';
import type { Durable } from '../material/Durable';
import { Quantity } from '../quantity';
import type { Unit } from '../quantity';
import type { MeasureChannel } from '../perception/MeasureChannel';
import type { FieldMeta } from '../mixin';
import type { VetoResult } from '../errors';
import type { EvictionContext } from '../stuff/Stuff';

/** The topic every reading narrates on. */
export const READING_TOPIC = 'sense.reading';

/**
 * What kind of answer a channel gives.
 *
 * - `fact` — a quantity the world holds. Banded, bracketed, honest.
 * - `preview` — what the engine is ABOUT to do (a weapon's delivery, a
 *   material's response). ⚠ Never bracketed: a preview that lied would
 *   be a rule stated wrongly, not a reading taken badly.
 * - `record` — a synthesis over several readings you already took
 *   (`analyze ground`). Competence decides whether the inference is
 *   available at all, which is the one place it does more than resolve.
 */
export type ReadingKind = 'fact' | 'preview' | 'record';

/**
 * What the optional `subject` argument means for this channel.
 *
 * - `self` — the actor's own body, whatever they typed.
 * - `here` — the place they are standing in.
 * - `subject` — the thing they named.
 *
 * A row may declare several; they are tried in order, so
 * `[here, subject]` means *the thing you named, else where you stand*.
 */
export type ReadingScope = 'self' | 'here' | 'subject';

/**
 * What a bench rung hands back. ⭐ Data, not prose-on-a-scene: nobody
 * may be standing there when it finishes, and what it produces is a
 * paper somebody picks up later.
 */
export interface BenchResult {
  /** The reading as the assayer would write it. */
  prose: string;
  /** The figure, when the channel has one. */
  value: number | null;
  /** The figure's unit. */
  unit: string;
  /** ⭐ A remark about the SAMPLE rather than the reading. */
  tell?: string | null;
}

/** One rung of the ladder, as `readings` renders it. */
export interface ReadingRoute {
  /** Which rung. */
  rung: 'eye' | 'instrument' | 'bench';
  /** Whether the actor can take this rung right now. */
  open: boolean;
  /** The words — *by eye: within you (competent)* / *no bench in reach*. */
  line: string;
}

/**
 * ⭐ Half-width of the honest bracket, as a fraction of the magnitude
 * read, by band. An untrained reader is not WRONG — they are vague, and
 * the truth is always inside what they say.
 *
 * ⚠⚠ **These are the INSTRUMENTED rung's, and the first cut of them was
 * half an order of magnitude too wide.** The drive printed
 *
 *     Temperature: 153.01 K ± 147.5 K (warm)
 *
 * for a room at 295 K. Every word of that is defensible on its own —
 * the truth IS inside the bracket, the band IS untrained — and the
 * sentence is still nonsense: nobody misreads a thermometer by fifty
 * per cent. What a dial buys is PRECISION; what the band decides is how
 * well the reader takes it off the dial, which is a small correction,
 * not a wild one. ⭐ The eye rung is unaffected, because an eye rung
 * answers in WORDS and has no bracket to be wrong about.
 *
 * ⚠ A channel whose quantity is not on a RATIO scale overrides
 * {@link halfWidthOf} with its own absolute error — Kelvin is the
 * example (295 K and 5 K are not "the same reading at different
 * magnitudes"), and mining's bearings are another (`ERROR_DEG`, because
 * a bearing's error does not scale with the bearing).
 */
const HALF_WIDTH: Readonly<Record<CompetenceBandName, number>> = {
  untrained: 0.08,
  novice: 0.05,
  competent: 0.025,
  proficient: 0.012,
  expert: 0.005,
};

/** Fallback wear-per-reading when the AppSettings dial is not seeded. */
const WEAR_PER_READING_FALLBACK = 0.002;

/**
 * The `gradeConditionScale` cutoffs that turn an instrument into a
 * ceiling.
 *
 * ⭐ **The intent: a shop-bought instrument caps a PROFICIENT reader.**
 * That is the tool trade's whole story — the dial you can buy is good
 * enough for nearly anybody, and the last band has to be commissioned.
 *
 * ⚠⚠ The plan asserted `fair` at full condition scales to exactly 1.0.
 * It does not: `gradeConditionScale` lerps `[0.85, 1.15]` across FIVE
 * bands by ordinal, and `fair` is ordinal 1 of 4, so it scales 0.925 —
 * `fine` is the one that lands on 1.0. The cutoffs below are set from
 * the real arithmetic to the intended outcome, rather than the intended
 * outcome being quietly lost to an off-by-one in a doc. Worked:
 *
 *   | grade | ordinal | scale @ full | ceiling |
 *   |---|---|---|---|
 *   | poor        | 0 | 0.850 | competent |
 *   | fair        | 1 | 0.925 | proficient |
 *   | fine        | 2 | 1.000 | proficient |
 *   | exceptional | 3 | 1.075 | expert |
 *   | masterful   | 4 | 1.150 | expert |
 *
 * Condition multiplies by `lerp(0.5, 1, condition)`, so a fair dial worn
 * to a third falls to 0.60 and reads untrained — which is the running
 * cost of an instrument, and why `wear` is on use.
 */
const CEILING_STEPS: ReadonlyArray<{ at: number; band: CompetenceBandName }> = [
  { at: 1.07, band: 'expert' },
  { at: 0.92, band: 'proficient' },
  { at: 0.8, band: 'competent' },
  { at: 0.65, band: 'novice' },
];

/** The band an ungraded instrument realizes — a plain honest dial. */
const UNGRADED_CEILING: CompetenceBandName = 'proficient';

/**
 * ⭐ The two verbs, and only the two verbs, drive a rung. Anything else
 * that wants a figure calls {@link Reading.truth}, which is ungated and
 * says so — the engine's own read is not a permission to sneak past.
 */
const ReadingVerbCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/platform/idea/cmd/perception/MeasureController'),
  SecurityPolicies.FromModule('/platform/idea/cmd/perception/AnalyzeController'),
  SecurityPolicies.SelfOnly,
);

const ReadingBase = SingletonMixin(Idea);

export default abstract class Reading extends ReadingBase {
  /** The class every platform Reading row names a subclass of. */
  static readonly PATH_INFIX = '/idea/reading/';

  // ───────────────────────────── the row ─────────────────────────────

  /** The token a player types: `light`, `strike`, `grade`. Non-empty. */
  public channel: string = '';

  /** `fact` | `preview` | `record`. */
  public kind: ReadingKind = 'fact';

  /** What `subject` means here, in order of preference. */
  public scope: ReadingScope[] = ['here'];

  /**
   * Mixin names the subject must compose. Checked by the Reading, so the
   * refusal can be in the channel's own words rather than the binder's —
   * *"a pressure is a fact about a place, and that is a person."*
   */
  public subjectRequires: string[] = [];

  /**
   * The Discipline this channel bands by, or `''` for a channel that is
   * deliberately unbanded (a `preview`, which is exact for everybody).
   */
  public discipline: string = '';

  /** Tool capability the `measure` rung needs; `''` = there is no such rung. */
  public instrument: string = '';

  /**
   * ⭐⭐ **What to CALL the thing that would work** — *"a sextant"*, *"a
   * soil kit"*, *"a surveyor's compass or a miner's dial"*.
   *
   * Every refusal on this ladder has to name a ROUTE, and a capability
   * token is not a route: *"it wants something that can sighting"* is
   * not English and teaches nobody what to go and buy. The capability is
   * what the engine matches on and this is what the player is told, and
   * they are different jobs.
   *
   * ⚠ It names a KIND of instrument, never a shop or a place. A kernel
   * refusal that named a locality's content would be wrong the moment a
   * second world installed the pack.
   */
  public instrumentNoun: string = '';

  /**
   * ⭐ A capability that lifts the EYE's ceiling — a hand lens, a streak
   * plate. Not a third rung: the words stay words, and what changes is
   * how fine they may get. `''` = none.
   */
  public handTool: string = '';

  /** The best band the naked eye can realize on this channel. */
  public eyeCeiling: CompetenceBandName = 'expert';

  /** Capability of a bench that reads a SAMPLE of this; `''` = place-bound. */
  public bench: string = '';

  /** What knowing this lets you decide. Authored, one clause. */
  public improves: string = '';

  /** What it costs you not to know it. Authored, one clause. */
  public stakes: string = '';

  static fieldMeta: FieldMeta = {
    channel: { persistent: true, authorable: true },
    kind: { persistent: true, authorable: true },
    scope: { persistent: true, authorable: true },
    subjectRequires: { persistent: true, authorable: true },
    discipline: { persistent: true, authorable: true },
    instrument: { persistent: true, authorable: true },
    instrumentNoun: { persistent: true, authorable: true },
    handTool: { persistent: true, authorable: true },
    eyeCeiling: { persistent: true, authorable: true },
    bench: { persistent: true, authorable: true },
    improves: { persistent: true, authorable: true },
    stakes: { persistent: true, authorable: true },
  };

  // ───────────────────────── row getters ─────────────────────────
  // Methods are the contract between Stuff; nothing outside this class
  // body reads a field.

  public getChannel(): string {
    return this.channel;
  }

  public getKind(): ReadingKind {
    return this.kind;
  }

  public getScope(): readonly ReadingScope[] {
    return [...this.scope];
  }

  public getSubjectRequires(): readonly string[] {
    return [...this.subjectRequires];
  }

  public getDiscipline(): string {
    return this.discipline;
  }

  public getInstrument(): string {
    return this.instrument;
  }

  /** What to call the instrument in a refusal; falls back to the token. */
  public getInstrumentNoun(): string {
    return this.instrumentNoun || this.instrument;
  }

  public getHandTool(): string {
    return this.handTool;
  }

  public getEyeCeiling(): CompetenceBandName {
    return this.eyeCeiling;
  }

  public getBench(): string {
    return this.bench;
  }

  public getImproves(): string {
    return this.improves;
  }

  public getStakes(): string {
    return this.stakes;
  }

  /**
   * Residency veto — a Reading is reference data the two verbs resolve
   * synchronously on every dispatch. A culled one is a channel that
   * stops existing mid-session.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'reading reference singleton; never culled' };
  }

  // ─────────────────────── the two entry points ───────────────────────

  /**
   * `analyze <channel> [subject]` — the trained eye.
   *
   * Resolves the subject by {@link scope}, checks {@link subjectRequires}
   * in the channel's own words, computes the effective band (the reader's
   * competence, capped by the eye's ceiling, which a bound `handTool`
   * lifts), and runs {@link analyze}.
   */
  @CallSecurity(ReadingVerbCallers)
  public async runAnalyze(
    context: CommandContext,
    subject: MqlOneResult | undefined,
    tools: readonly Stuff[],
  ): Promise<void> {
    const actor = context.commandGiver as unknown as Stuff;
    const resolved = this.resolveSubject(actor, subject);
    if (!resolved.ok) {
      this.decline(context, resolved.line, resolved.reason);
      return;
    }
    const held = this.narrow(tools, this.handTool);
    const ceiling = held ? this.ceilingOf(held) : this.eyeCeiling;
    const band = this.lower(await this.bandOf(actor), ceiling);
    await this.analyze(context, resolved.target, band, held, resolved.param);
  }

  /**
   * `measure <channel> [subject] [with <tool>]` — the carried instrument.
   *
   * Refuses when the channel has no instrumented rung, when nothing in
   * reach declares its capability, and when the one thing that does is
   * past reading with. Wears the instrument after a reading is taken —
   * on USE, never on the clock.
   */
  @CallSecurity(ReadingVerbCallers)
  public async runMeasure(
    context: CommandContext,
    subject: MqlOneResult | undefined,
    tools: readonly Stuff[],
  ): Promise<void> {
    const actor = context.commandGiver as unknown as Stuff;
    if (this.instrument === '') {
      this.decline(
        context,
        this.noInstrumentedRungLine(),
        'no-instrumented-rung',
      );
      return;
    }
    const resolved = this.resolveSubject(actor, subject);
    if (!resolved.ok) {
      this.decline(context, resolved.line, resolved.reason);
      return;
    }
    const tool = this.narrow(tools, this.instrument);
    if (!tool) {
      const broken = this.narrowBroken(tools, this.instrument);
      if (broken) {
        this.decline(
          context,
          Mml.compose`Your ${Mml.thing(broken)} is past reading with.`,
          'broken-instrument',
        );
        return;
      }
      this.decline(context, this.noInstrumentLine(), 'no-instrument');
      return;
    }
    const band = this.lower(await this.bandOf(actor), this.ceilingOf(tool));
    await this.measure(context, resolved.target, tool, band, resolved.param);
    this.wearOnce(tool);
  }

  // ───────────────────────────── the rungs ─────────────────────────────

  /**
   * @hook The trained-eye rung. Override to say what a person can tell
   * by looking, in words, at the resolution `band` buys.
   *
   * The base refuses **naming the route that would work**, so a channel
   * with no eye rung — a pressure, a specific gravity — is honest with
   * no code at all.
   */
  protected async analyze(
    context: CommandContext,
    _target: Stuff | null,
    _band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    _param: string,
  ): Promise<void> {
    this.decline(context, this.noEyeRungLine(), 'no-eye-rung');
  }

  /**
   * @hook The carried-instrument rung. Override to read the figure and
   * render it bracketed to `band`.
   *
   * The base refuses; a row declaring an `instrument:` and not
   * implementing this is an authoring error the refusal makes visible
   * rather than a silent no-op.
   */
  protected async measure(
    context: CommandContext,
    _target: Stuff | null,
    _instrument: Stuff & Tooled,
    _band: CompetenceBandName,
    _param: string,
  ): Promise<void> {
    this.decline(context, this.noInstrumentedRungLine(), 'no-instrumented-rung');
  }

  /**
   * @hook The bench rung — what a fixed instrument makes of a SAMPLE
   * somebody carried in.
   *
   * ⭐ It returns DATA rather than narrating, because nobody may be
   * standing there: an assay finishes on the world clock, the customer
   * may have walked out, and what the rung produces is a PAPER. The
   * base says nothing, so a channel with no bench rung is honest for
   * free.
   */
  protected async benchRead(
    _sample: Stuff,
    _bench: Stuff & Tooled,
    _band: CompetenceBandName,
  ): Promise<BenchResult | null> {
    return null;
  }

  /**
   * The bench rung, driven. Gated to the `assay` verb's controller —
   * the same narrow-entry rule the two read verbs get, for the same
   * reason: a rung is an ACT, and an act has one caller.
   */
  @CallSecurity(
    SecurityPolicies.AnyOf(
      SecurityPolicies.FromModule('/trade/mining/idea/cmd/mining/AssayController'),
      SecurityPolicies.SelfOnly,
    ),
  )
  public async benchReadFor(
    sample: Stuff,
    bench: Stuff & Tooled,
    band: CompetenceBandName,
  ): Promise<BenchResult | null> {
    if (this.bench === '') return null;
    if (!bench.getCapabilities().includes(this.bench)) return null;
    return this.benchRead(sample, bench, band);
  }

  /**
   * ⭐ **The engine's own read** — the underlying figure, with no band,
   * no bracket and no prose. Tests assert values through this; a player
   * never sees it, and nothing in the dispatch path calls it except a
   * rung that wants the truth to bracket.
   *
   * `null` where the channel has no scalar (a medium's name, a weather
   * form) — those channels answer in words and their tests assert the
   * words.
   */
  public async truth(_target: Stuff | null): Promise<number | null> {
    return null;
  }

  /**
   * The ladder as data, for `readings`. Every rung the channel declares,
   * whether it is open to this actor right now, and the words.
   */
  public async routesFor(
    actor: Stuff,
    tools: readonly Stuff[],
  ): Promise<ReadingRoute[]> {
    const out: ReadingRoute[] = [];
    const band = await this.bandOf(actor);
    const lens = this.narrow(tools, this.handTool);
    const eyeBand = this.lower(band, lens ? this.ceilingOf(lens) : this.eyeCeiling);
    out.push({
      rung: 'eye',
      open: true,
      line:
        this.discipline === ''
          ? 'by eye: anybody, and the same for everybody'
          : `by eye: ${eyeBand}${lens ? ` (with ${lens.getPresentation()})` : ''}`,
    });
    if (this.instrument !== '') {
      const tool = this.narrow(tools, this.instrument);
      out.push({
        rung: 'instrument',
        open: tool !== null,
        line: tool
          ? `with your ${tool.getPresentation()}: ${this.lower(band, this.ceilingOf(tool))}`
          : `with ${this.instrument}: nothing in reach can`,
      });
    }
    if (this.bench !== '') {
      const b = this.narrow(tools, this.bench);
      out.push({
        rung: 'bench',
        open: b !== null,
        line: b
          ? `at the ${b.getPresentation()}: a sample can be read here`
          : `at a bench: none in reach — a sample has to be carried to one`,
      });
    }
    return out;
  }

  // ──────────────────────────── the helpers ────────────────────────────

  /**
   * ⭐ The reader's band in this channel's Discipline — **the one copy**.
   *
   * Three controllers held byte-identical versions of this before the
   * ladder existed (mining's, farming's, haulage's); all three are
   * Readings now and all three call here. An unbanded channel reads at
   * full resolution: a preview is exact for everybody, which is the Tier
   * A invariant satisfied by exactness rather than by a bracket.
   */
  protected async bandOf(actor: Stuff): Promise<CompetenceBandName> {
    if (this.discipline === '') return 'expert';
    return MixinApi.isAdvancing(actor)
      ? await actor.competenceBandFor(this.discipline)
      : CompetenceBand.FLOOR;
  }

  /**
   * ⭐ **Grade raises the ceiling; competence realizes it.** What band an
   * instrument can support, from the shipped `grade × condition` scalar
   * every other quality consumer already uses — so a better instrument is
   * better in exactly the way a better sword is.
   */
  protected ceilingOf(tool: Stuff): CompetenceBandName {
    if (!MixinApi.isGraded(tool) || !MixinApi.isDurable(tool)) {
      return UNGRADED_CEILING;
    }
    const scale = MaterialApi.gradeConditionScale(
      tool.getGrade(),
      (tool as unknown as Durable).getCondition(),
    );
    for (const step of CEILING_STEPS) {
      if (scale >= step.at) return step.band;
    }
    return 'untrained';
  }

  /** The lower of two bands — {@link ceilingOf} meeting {@link bandOf}. */
  protected lower(
    a: CompetenceBandName,
    b: CompetenceBandName,
  ): CompetenceBandName {
    return CompetenceBand.rank(a) <= CompetenceBand.rank(b) ? a : b;
  }

  /**
   * ⭐⭐ **The honest bracket.** A centre offset drawn from `seed` inside
   * the band's half-width, and the invariant that `truth` is always
   * inside `[centre − hw, centre + hw]`.
   *
   * ⚠ This is **epistemic** uncertainty, not resolutional: the roll
   * decides what you can TELL about the world, never what the world IS.
   * The world already decided; a seeded offset means a re-read the same
   * day agrees with itself and tomorrow's may not, which is what a
   * measurement actually does.
   */
  protected observe(
    truth: number,
    band: CompetenceBandName,
    seed: number,
  ): { centre: number; halfWidth: number } {
    const halfWidth = this.halfWidthOf(truth, band);
    if (halfWidth === 0) return { centre: truth, halfWidth: 0 };
    // A centre anywhere in [truth − hw, truth + hw] keeps truth inside
    // [centre − hw, centre + hw]; the seed picks where.
    const unit = ((Math.sin(seed) + 1) / 2) * 2 - 1; // [-1, 1)
    return { centre: truth + unit * halfWidth, halfWidth };
  }

  /**
   * ⭐⭐ **The bracket, rendered.** A figure read at a band, as the
   * player sees it: `310 K ± 9 K`.
   *
   * The centre is the observation and the half-width is what the reader
   * can honestly claim — and `truth` is always inside it, which is the
   * whole of *a coarse reading is vague, never wrong*. At `expert` the
   * bracket is narrow and still present: nobody reads a dial exactly,
   * and pretending otherwise is the gauge this game does not have.
   *
   * ⚠ A band whose half-width rounds to nothing at the figure's scale
   * prints bare rather than `± 0` — a zero bracket claims a precision
   * the model is not making.
   */
  protected bracketed(
    value: Quantity<Unit>,
    band: CompetenceBandName,
    seed: number,
    channel?: MeasureChannel,
  ): Mml {
    return this.bracketFor(this.observed(value, band, seed), value, channel);
  }

  /**
   * ⭐⭐ The value as this reader SAW it — what everything downstream of
   * a measure rung must speak from.
   *
   * ⚠ The tag has to come from here and not from the truth, or one
   * sentence contradicts itself: the drive printed a figure of 153 K
   * beside the word *(warm)*, because the number was the observation and
   * the word was the fact. A reading is what the reader got; a reader
   * who misread the dial calls the room what the dial said.
   */
  protected observed(
    value: Quantity<Unit>,
    band: CompetenceBandName,
    seed: number,
  ): Quantity<Unit> {
    const { centre } = this.observe(value.rawValue(), band, seed);
    return Quantity.of(centre, value.unit);
  }

  /** `X ± Y`, from an already-observed centre. */
  protected bracketFor(
    shownValue: Quantity<Unit>,
    trueValue: Quantity<Unit>,
    channel?: MeasureChannel,
  ): Mml {
    const rawHalf = Math.abs(shownValue.rawValue() - trueValue.rawValue());
    // ⭐⭐ **A reading has significant figures, and they come from the
    // BRACKET.** The drive printed `53.33333333333333 lux` and
    // `153.01158701579095 K` — the engine's float wearing an
    // observation's clothes. Nobody reads a dial to fourteen places, and
    // a figure printed past its own error bar is claiming a precision
    // the model is not making. So both numbers are rounded to the
    // decade the half-width justifies.
    const places = decimalsFor(rawHalf);
    const centre = round(shownValue.rawValue(), places);
    const halfWidth = round(rawHalf, places);
    const shown = Quantity.of(centre, shownValue.unit);
    const spread = Quantity.of(halfWidth, shownValue.unit);
    const opts = channel ? { channel } : undefined;
    if (spread.format() === Quantity.of(0, shownValue.unit).format()) {
      return Mml.compose`${shown.formatMml(undefined, undefined, opts)}`;
    }
    return Mml.compose`${shown.formatMml(undefined, undefined, opts)} ± ${spread.formatMml(undefined, undefined, opts)}`;
  }

  /**
   * ⭐ How wide the bracket is, by band. The default is a fraction of
   * the magnitude — right for anything on a ratio scale.
   *
   * ⚠ Override where the quantity is not: an absolute temperature, a
   * bearing, a pH. `295 K ± 8 %` is not what reading a thermometer
   * badly looks like.
   */
  protected halfWidthOf(truth: number, band: CompetenceBandName): number {
    return Math.abs(truth) * HALF_WIDTH[band];
  }

  /**
   * The seed for one reading: who, of what, on what channel, on what
   * day. Same reader, same rock, same day → same answer.
   */
  protected seedFor(actor: Stuff, target: Stuff | null, param: string): number {
    const day = Math.floor(WorldClockApi.getNow().value / 86400);
    return hash(
      `${identityOf(actor)}|${target ? identityOf(target) : param}|${this.channel}|${day}`,
    );
  }

  /**
   * ⭐⭐ **A reading you took is a per-viewer BELIEF, not a UI cache** —
   * the survey field-book idiom, generalized.
   *
   * ⚠ The reading is stored and the BAND is not: the band is a fact
   * about the reader at the moment they read their notes back, so a
   * prospector who improves re-reads their old field book at their new
   * resolution. That is what actually happens to a field book, and it is
   * why the record is not stamped.
   */
  protected remember(
    actor: Stuff,
    where: string,
    reading: string,
    prefix = this.channel,
  ): void {
    const store = actor as unknown as {
      know?(realm: string, referent: string, u: Record<string, unknown>): void;
    };
    if (typeof store.know !== 'function') return;
    store.know(DISCOVERY, `${prefix}:${where}#${this.channel}`, {
      knownAs: reading,
      found: true,
    });
  }

  /** Every reading this character holds on this channel. */
  protected recallAll(
    actor: Stuff,
    prefix = this.channel,
  ): Array<{ where: string; reading: string }> {
    const store = actor as unknown as {
      recallRealm?(r: string): ReadonlyMap<string, { knownAs: string | null }>;
    };
    if (typeof store.recallRealm !== 'function') return [];
    const head = `${prefix}:`;
    const tail = `#${this.channel}`;
    const out: Array<{ where: string; reading: string }> = [];
    for (const [referent, record] of store.recallRealm(DISCOVERY)) {
      if (!referent.startsWith(head) || !referent.endsWith(tail)) continue;
      if (record.knownAs === null) continue;
      out.push({
        where: referent.slice(head.length, referent.length - tail.length),
        reading: record.knownAs,
      });
    }
    return out.sort((a, b) => a.where.localeCompare(b.where));
  }

  /** Say no diegetically and file the structured reason. */
  protected decline(context: CommandContext, line: Mml, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(READING_TOPIC)
      .toSelf(line)
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: this.channel });
  }

  /** Narrate a reading to the actor. */
  protected report(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic(READING_TOPIC)
      .toSelf(body)
      .send();
  }

  /** The place the actor is standing in, or `null`. */
  protected placeOf(actor: Stuff): (Stuff & Container) | null {
    const room = (
      actor as unknown as { getContainer?(): Stuff | null }
    ).getContainer?.();
    return room && MixinApi.isContainer(room) ? (room as Stuff & Container) : null;
  }

  // ─────────────────────────── the internals ───────────────────────────

  /**
   * Resolve what the channel is being asked ABOUT, by its declared
   * scope, and refuse in the channel's own words when the answer does
   * not fit.
   *
   * ⭐ Unresolved text is a PARAMETER, not a failure: `measure elevation
   * moon` binds `stuff === null, raw: 'moon'`, and a channel whose scope
   * is `here` reads the raw word as which thing in the sky to sight. It
   * is how the sextant's body and the mining face's direction travel
   * without a second argument.
   */
  private resolveSubject(
    actor: Stuff,
    subject: MqlOneResult | undefined,
  ):
    | { ok: true; target: Stuff | null; param: string }
    | { ok: false; line: Mml; reason: string } {
    const named = subject?.stuff ?? null;
    const raw = subject?.raw ?? '';
    for (const scope of this.scope) {
      if (scope === 'subject' && named) {
        const missing = this.missingRequirement(named);
        if (missing) {
          return {
            ok: false,
            line: this.wrongSubjectLine(named, missing),
            reason: 'wrong-subject',
          };
        }
        return { ok: true, target: named, param: raw };
      }
      if (scope === 'here' && !named) {
        return { ok: true, target: this.placeOf(actor), param: raw };
      }
      if (scope === 'self' && !named) {
        return { ok: true, target: actor, param: raw };
      }
    }
    // A named thing on a channel that reads only the place, or a bare
    // verb on a channel that must be given something.
    if (named) return { ok: true, target: this.placeOf(actor), param: raw };
    return { ok: true, target: null, param: raw };
  }

  /** The first declared mixin the subject does not compose, or `null`. */
  private missingRequirement(subject: Stuff): string | null {
    for (const name of this.subjectRequires) {
      if (!MixinApi.isActive(subject, name)) return name;
    }
    return null;
  }

  /** The one reachable tool declaring `capability`, unbroken. */
  protected narrow(
    tools: readonly Stuff[],
    capability: string,
  ): (Stuff & Tooled) | null {
    if (capability === '') return null;
    for (const tool of tools) {
      if (!MixinApi.isTool(tool)) continue;
      if (!tool.getCapabilities().includes(capability)) continue;
      if (MixinApi.isDurable(tool) && (tool as unknown as Durable).isBroken()) {
        continue;
      }
      return tool as Stuff & Tooled;
    }
    return null;
  }

  /** A reachable tool that WOULD serve but is past reading with. */
  private narrowBroken(
    tools: readonly Stuff[],
    capability: string,
  ): Stuff | null {
    for (const tool of tools) {
      if (!MixinApi.isTool(tool)) continue;
      if (!tool.getCapabilities().includes(capability)) continue;
      if (MixinApi.isDurable(tool) && (tool as unknown as Durable).isBroken()) {
        return tool;
      }
    }
    return null;
  }

  /** Wear on USE — one reading's worth, off the dial. */
  private wearOnce(tool: Stuff): void {
    if (!MixinApi.isDurable(tool)) return;
    let amount = WEAR_PER_READING_FALLBACK;
    try {
      const raw = AppApi.setting(AppSettingKeys.instrumentWearPerReading);
      const n = Number.parseFloat(String(raw ?? ''));
      if (Number.isFinite(n)) amount = n;
    } catch {
      /* unseeded in a bare test world — the literal stands */
    }
    (tool as unknown as Durable).wear(amount);
  }

  // ───────────────────────── the refusal words ─────────────────────────
  // ⭐ Every one names a ROUTE. Not one of them names a rank, and not one
  // of them is a permission.

  /** Overridable — *"You have no way to tell that by eye; an X would."* */
  protected noEyeRungLine(): Mml {
    return this.instrument === ''
      ? Mml.compose`There is no telling that by looking.`
      : Mml.compose`You cannot tell that by eye. ${this.getInstrumentNoun()} would read it.`;
  }

  /** Overridable — *"nothing measures that; you work it out."* */
  protected noInstrumentedRungLine(): Mml {
    return Mml.compose`Nothing reads that off a dial — you work it out. Try \`analyze ${Mml.fromMarkup(this.channel)}\`.`;
  }

  /**
   * Overridable — *"you have nothing in reach that could read that; it
   * wants a sextant."*
   *
   * ⚠⚠ It names the INSTRUMENT, not the capability. The first cut said
   * *"something that can sighting"*, which is not English and is not a
   * route — and the tests that had asserted the old controllers named
   * *"a sextant"* and *"a sundial"* caught it immediately. Two shipped
   * assertions doing exactly the job an acceptance criterion asks of
   * them.
   */
  protected noInstrumentLine(): Mml {
    return Mml.compose`You have nothing in reach that could read that. It wants ${this.getInstrumentNoun()}.`;
  }

  /** Overridable — the subject is the wrong kind of thing, in words. */
  protected wrongSubjectLine(subject: Stuff, _missing: string): Mml {
    return Mml.compose`${Mml.thing(subject)} is not something you can read ${Mml.fromMarkup(this.channel)} off.`;
  }
}

/**
 * How many decimals a bracket of this width justifies. A ± of 4 says
 * nothing past the units column; a ± of 0.05 says two places.
 */
function decimalsFor(halfWidth: number): number {
  if (!Number.isFinite(halfWidth) || halfWidth <= 0) return 2;
  if (halfWidth >= 10) return 0;
  if (halfWidth >= 1) return 0;
  if (halfWidth >= 0.1) return 1;
  if (halfWidth >= 0.01) return 2;
  return 3;
}

function round(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

/** A stable non-cryptographic hash — the seed's only job is repeatability. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The durable key for a person or a place — never the lineage stamp. */
function identityOf(stuff: Stuff): string {
  const s = stuff as unknown as {
    getIdentityPath?(): string | null;
    getTemplatePath?(): string | null;
  };
  return s.getIdentityPath?.() ?? s.getTemplatePath?.() ?? '';
}
