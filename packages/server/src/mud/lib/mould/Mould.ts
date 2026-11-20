/**
 * MouldMixin — a vessel that answers one question: **when what is in me
 * sets, what shape comes out?** (the dairy build, D9 — moulds as a kernel
 * system; ceramics W7 — the mould as an ENVELOPE).
 *
 * ⭐⭐ Before this, two things decided the shape of a set solid and neither
 * was the container: the MATERIAL (`castTemplate` at the freeze edge — so
 * water froze to an ice block in a bucket) and the RECIPE
 * (`outputTemplate`). A mould is the claim that the **container** decides,
 * and that the recipe owns no shape. So the set site asks the container
 * first and falls back to the material: a plain vessel keeps today's
 * behaviour exactly (a lump drops beside it), and a mould keeps what set in
 * it, in its shape, until somebody takes it out.
 *
 * ⭐⭐ **The shared thing is the cavity** (ceramics M2). Its shape is an
 * authored `castTemplate` row or an {@link Impression} pressed into a soft
 * medium (`impress sword in flask` — {@link Mould.takeImpression}). How
 * matter gets in (pour, press) and how it sets are the MATTER's:
 *
 *   - **freezing** — `meltingPoint` + latent heat, driven by the thermal
 *     reconcile (`Thermal.reconcileBulkPhase`), which asks
 *     {@link Mould.castInto} when the pool sets;
 *   - **draining** — `Material.drainSetting`: curd gives up its whey over
 *     time and sets, faster and drier under a LOAD ({@link Mould.loadN} —
 *     a weight put ON the mould, or a screw press it stands in). A slip
 *     whose drain is `absorbedByMould` sets only in an ABSORBENT mould,
 *     whose own wetness takes the water and slows the next cast;
 *   - **curing** — the material's own `kinetics:` set (`Kinetics.poolSet`,
 *     a point curve with a ladder): plaster slurry takes up its water and
 *     is hard in a quarter-hour, no act;
 *   - **release at once** — a plastic charge with green strength (tempered
 *     clay) pressed into a `pressKind: press` mould takes its shape and
 *     leaves it ({@link Mould.pressRelease}).
 *
 * ⭐ **The envelope** (S12): the mould's conductivity chills a metal (cast
 * iron sets white in iron, grey in sand — `Material.chillsTo`); its
 * wetness blows a hot pour; its melting or ignition point decides whether
 * it survives the pour at all (`BulkableMixin.canReceiveAtK`, asked by the
 * transfer for every vessel). And a metal pour obeys Chvorinov's rule
 * (S14): a thin shape poured too near its melting point freezes short (a
 * misrun); a closed cavity without a riser goes porous where it froze last.
 *
 * ⛔ **No verb of its own.** The acts are the shipped ones — `pour` into the
 * mould, `put` a weight on it, `impress` a pattern into it, `carve` a riser
 * in it, `turn` the press it stands in, `look` at it, `get` the cast out.
 *
 * What composing it CLAIMS: *a made, wearing vessel that holds what set in
 * it.* Requires `Bulkable` (the pool), `Thermal` (freezing is heat) and
 * `Container` (the cast stays IN it). ⛔ Not every vessel is a mould — a
 * pail, a pot, a crucible are not, and a pool left in one sets as a lump.
 * See `docs/subsystems/mould.md`.
 */
import type { MixinConstructor, FieldMeta } from '../mixin';
import { Mixins } from '../mixin';
import type { AnyConstructor } from '../../api/mixin';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { BulkableApi } from '../../api/bulk';
import { ContainmentApi } from '../../api/containment';
import { WorldClockApi } from '../../api/worldclock';
import type { ClockHandle } from '../../api/worldclock';
import { ExecutionContextApi } from '../../api/execution-context';
import { DiagnosticApi } from '../../api/diagnostics';
import { AppApi } from '../../api/app';
import { MessageApi } from '../../api/message';
import { ConditionApi } from '../../api/condition';
import { Mml } from '../../api/mml';
import type { MarkupAugmenter } from '../../api/mml';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type Material from '../material/Material';
import type { BulkPayload } from '../bulk/Bulkable';
import type { DrainSetting } from '../material/DrainSetting';
import type { ChattelOwner } from '../chattel/ChattelRecord';
// The payload's `contentsOwner` is declared by ContentsTitle's merge.
import { WEAR_PER_USE } from '../material/Durable';
import { Quantity } from '../quantity';
import { DetachedError } from '../errors';
import { TemplatePaths } from '../paths';
import { AppSettingKeys } from '../config/AppSettings';
import { Grade } from '../craft/Grade';
import { SchedulerApi } from '../../api/scheduler';
import type { EngagementStartedNote } from '@saxonberg/types';
import { ManualBuildStep } from '../craft/ManualBuildStep';
import { Impression } from './Impression';
import type { ImpressionData } from './Impression';
import { ImpressibleMixin } from '../craft/Impressible';
import type { Impressible, ImpressOutcome, ImpressRefusal } from '../craft/Impressible';
import { CarvableMixin } from '../craft/Carvable';
import type { Carvable, CarvePlan, CarveRefusal, CarveRequest } from '../craft/Carvable';
import { Placements } from '../spatial/Placement';
import { MaterialApi } from '../../api/material';

/** What a pool hands a mould when it sets. */
export interface SetPool {
  /** The material the set thing IS (`becomes`, or the pool's own). */
  material: Material;
  /** The set thing's mass. */
  massKg: number;
  /** The pool's payload, captured before it was cleared. */
  payload: BulkPayload | null;
  /** The set thing's moisture (a drain set writes it); absent ⇒ untouched. */
  moisture?: number;
  /**
   * ⭐ Stamp `material` even over a shape row that authored its own. A
   * DRAIN set's `becomes` is authoritative (one wheel row, every cheese);
   * a FREEZE keeps the row's material, because the row knows the solid
   * phase (an ice block is ice, never water).
   */
  stampMaterial?: boolean;
  /** The pool's temperature as it set, K — the freeze edge passes it. */
  temperatureK?: number;
  /**
   * ⭐ Whose the cast is, when the caller knows better than the pool (a
   * firing: whose its charge was). Absent ⇒ the pool's own
   * `contentsOwner` — the communal-oven rule — and nobody when the pool
   * was nobody's. A cast is a PROCESS mint: never the onlooker's.
   */
  madeBy?: ChattelOwner | null;
}

/** What the transfer tells a mould it has just been poured into. */
export interface ReceivedPour {
  /** The pour's temperature, K. */
  temperatureK: number;
  /** Litres that went in. */
  litres: number;
  /** What was poured. */
  material: Material;
}

/** Public shape contributed by MouldMixin. */
/** The founder's watch over a slow pour's cooling — sealed down, on the attention. */
const POUR_WATCH_EFFORT_W = 60;

/** The note a watch's engagement files. */
type StartedNote = EngagementStartedNote;

export interface Mould extends Carvable, Impressible {
  /** The template a set pool of `material` becomes in this mould. */
  castTemplateFor(material: Material): string;
  /**
   * Mint the set thing from a pool and keep it — the one cast path every
   * set process shares. Asynchronous (a clone); the pool has already
   * been cleared by the caller.
   */
  castInto(pool: SetPool): Promise<Stuff>;
  /** True while a set thing sits in the mould. */
  holdsCast(): boolean;
  /**
   * ⭐ The load on the mould, N — a weight put ON it (× g) plus the screw
   * press it stands in (ceramics D25). `0` with neither.
   */
  loadN(): number;
  /** Integrate a drain or cure set to now (reconcile-on-read). */
  reconcileSetting(): void;
  /** The Discipline a fill into this mould credits; `''` = none. */
  getMouldDiscipline(): string;
  /** `filled` · `setting` · `set` · `null` (empty) — a state, no digit. */
  setState(): 'filled' | 'setting' | 'set' | null;
  /** Is a riser cut above the cavity (the last metal to freeze is fed)? */
  hasRiser(): boolean;
  /** The impression the cavity holds, or `null` (it casts its own row). */
  getImpression(): Impression | null;
  /** Set (or clear) the impression — a cured case hands its cavity on. */
  setImpression(value: ImpressionData | null): void;
  /**
   * ⭐ The transfer's report of a pour into this (ceramics D22): records
   * the superheat a metal pour brought, lets an absorbent mould drink
   * plain water, and marks a damp mould that a hot pour blew.
   */
  receivedPour(pour: ReceivedPour): void;
  /** K over its melting point the last pour brought; `0` = none recorded. */
  getPourSuperheatK(): number;
  /** Seconds a pour into this takes (`0` = instant; a bell pit, a day). */
  getPourDurationS(): number;
  /**
   * ⭐ (ceramics D26) The founder's watch over a slow pour's cooling: the metal
   * went in at once, the day is the watch, and the credit lands when it is kept.
   * Answers the note its engagement filed, if it took one.
   */
  watchThePour(by: Stuff): StartedNote | null;
  /**
   * ⭐ Shape-and-release (ceramics S16): a plastic charge in a `press`
   * mould whose load beats its stiffness takes the shape and leaves the
   * mould at once. Returns the released piece, or `null`.
   */
  pressRelease(): Promise<Stuff | null>;
}

/** Seconds per game day — the unit a drain set's `days` is authored in. */
const SECONDS_PER_GAME_DAY = 86_400;
/**
 * ⭐ The longest a setting mould goes between banks (crowded-rooms D8, owner
 * ruling 3): one game hour. It bounds the error from the set's continuous
 * inputs — a mould drying, the cure's temperature — and makes the schedule a
 * function of the mould's own state, never of who looked. A constant, not a
 * dial.
 */
const MOULD_SET_STEP_S = 3_600;
/** Standard gravity — a weight's load, N per kg. */
const G = 9.81;

/** One numeric dial read, falling back to the literal when unseeded. */
function mouldDial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw == null || raw === '') return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * The state line on `look` — words, never a number. ⚠ Filtered to `look`:
 * a mould has nothing to say to a nose that its contents do not.
 */
function mouldAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
  opts?: { filter?: readonly string[] },
): string {
  if (opts?.filter) return text;
  if (!MixinApi.isMould(host)) return text;
  const lines: string[] = [];
  const state = host.setState();
  const stateLine =
    state === 'set'
      ? 'What was poured in has set, and holds the shape of it.'
      : state === 'setting'
        ? 'It has drawn down and firmed, but it is not set through yet.'
        : state === 'filled'
          ? 'It is filled, and has not begun to set.'
          : null;
  if (stateLine) lines.push(stateLine);
  const imp = host.getImpression();
  if (imp !== null && state === null) {
    const riser = host.hasRiser();
    lines.push(
      `It holds the impression of ${imp.getFormDescription()}${riser ? ', with a riser cut above it' : ''}.`,
    );
  }
  if (lines.length === 0) return text;
  const line = lines.join(' ');
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

/** `a` or `an` before a phrase — the cast's prose names its kind. */
function article(phrase: string): string {
  return /^[aeiou]/i.test(phrase.trim()) ? 'an' : 'a';
}

/**
 * A cast's modulus V/A, cm — Chvorinov's measure of how long it stays
 * liquid. A shape that authors its `length` reads as a prism of that
 * length (a blade, a rod); anything else as a cube of its volume.
 */
function modulusCm(volumeM3: number, lengthM: number): number {
  if (!(volumeM3 > 0)) return 0;
  let area: number;
  if (lengthM > 0) {
    const side = Math.sqrt(volumeM3 / lengthM);
    area = 4 * side * lengthM + 2 * side * side;
  } else {
    area = 6 * Math.pow(volumeM3, 2 / 3);
  }
  return area > 0 ? (volumeM3 / area) * 100 : 0;
}

/** The name an identity goes by in the world now, or `null`. */
function nameOf(identity: string): string | null {
  if (!identity) return null;
  const who = StuffApi.findByTemplatePath<Stuff>(identity);
  return who ? who.getPresentation() : null;
}

/** ⭐ The edge a riser is cut with — any cutting tool (`carve`'s word). */
const CUTTING = 'cutting';

export function MouldMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  // ⭐ A soft medium takes an IMPRESSION (`ImpressibleMixin`, ceramics D21) —
  // a sand flask on the floor, a wax block in your hand — and a riser is
  // CARVED in it (`CarvableMixin`); both afford their verbs by what the
  // mould is. A mould cut to its own shape answers with its own refusal.
  return class MouldMixin extends CarvableMixin(ImpressibleMixin(Base)) implements Mould {
    static _mixinName: string = 'MouldMixin';

    static markupAugmenters: MarkupAugmenter[] = [mouldAugmenter];

    static fieldMeta: FieldMeta = {
      castTemplate: { persistent: true, authorable: true, ref: 'identity:kind' },
      reusable: { persistent: true, authorable: true },
      wearPerCast: { persistent: true, authorable: true },
      discipline: { persistent: true, authorable: true },
      // ⭐ (ceramics W7) The envelope's authored facts.
      impressible: { persistent: true, authorable: true },
      absorbent: { persistent: true, authorable: true },
      closedCavity: { persistent: true, authorable: true },
      riser: { persistent: true, authorable: true },
      pressKind: { persistent: true, authorable: true },
      pourDurationS: { persistent: true, authorable: true },
      breaksTo: { persistent: true, authorable: true, ref: 'identity:kind' },
      impression: { persistent: true, authorable: true, runtimeState: true },
      setProgress: { persistent: true, runtimeState: true },
      setStamp: { persistent: true, runtimeState: true },
      setPressed: { persistent: true, runtimeState: true },
      pourSuperheatK: { persistent: true, runtimeState: true },
      blown: { persistent: true, runtimeState: true },
      setDrainedKg: { persistent: true, runtimeState: true },
      setLoadN: { persistent: true, runtimeState: true },
      wakeAtS: { persistent: true, runtimeState: true },
    };

    static __validateComposition__(ctor: AnyConstructor): void {
      const name = (ctor as { name?: string }).name ?? 'class';
      for (const [mixin, why] of [
        [Mixins.Bulkable, 'the pool it sets is bulk'],
        [Mixins.Thermal, 'freezing is heat'],
        [Mixins.Container, 'the set thing stays in it'],
      ] as const) {
        if (!MixinApi.hasMixin(ctor, mixin)) {
          throw new Error(
            `${name} composes MouldMixin without ${mixin}; ${why}.`,
          );
        }
      }
    }

    /** ⭐ The shape — the template a pool set in this mould becomes. */
    public castTemplate = '';
    /** A reusable mould wears per cast; a consumed one breaks to release. */
    public reusable = true;
    /** Condition lost per cast by a reusable mould. */
    public wearPerCast = WEAR_PER_USE;
    /** The Discipline a pour into this mould credits. */
    public discipline = '';
    /** ⭐ A soft medium a pattern can be pressed into (sand, wax, a plaster case). */
    public impressible = false;
    /** ⭐ It drinks water — rammed sand, plaster (ceramics S12). */
    public absorbent = false;
    /** A cavity shut all round, which goes porous where it froze last without a riser. */
    public closedCavity = false;
    /** A riser feeds the last of the metal to freeze (ceramics S14). */
    public riser = false;
    /** `press` — a plastic charge pressed in leaves at once; `''` — none. */
    public pressKind = '';
    /** Seconds a pour into this takes; `0` = instant. */
    public pourDurationS = 0;
    /** What a consumed mould leaves when it is broken to release (its sand, its wax). */
    public breaksTo = '';
    /** The impression the cavity holds, or `null`. */
    public impression: ImpressionData | null = null;
    /** A drain or cure set's progress, `0..1`. */
    public setProgress = 0;
    /** Game-seconds of the last set reconcile; `0` = not started. */
    public setStamp = 0;
    /**
     * ∫ (load ratio) d(progress) — how pressed the set has been, averaged
     * over its progress, so a stone put on halfway presses it halfway.
     */
    public setPressed = 0;
    /** K over its melting point the last metal pour brought. */
    public pourSuperheatK = 0;
    /** A hot pour flashed this damp mould's water to steam. */
    public blown = false;
    /**
     * Kilograms of drainings the set has driven out of the pool so far —
     * into the vessel below, or away (sugar D16; R1-D8).
     */
    public setDrainedKg = 0;
    /**
     * ⭐ The load (N) the stretch since {@link setStamp} has been under
     * (crowded-rooms D8). A bank integrates at THIS load, then stores the
     * load as it is now — so a weight set on the follower counts from the
     * moment it was set, whoever reads and whenever.
     */
    public setLoadN = 0;
    /**
     * ⭐ Game-seconds of the set's next wake, or `0` (crowded-rooms D8).
     * Persisted, and re-armed by {@link setWakeAtS} — so a restart or a
     * reload mid-set still finishes on time; a wake already past fires at
     * once.
     */
    public wakeAtS = 0;
    /** The live wake — transient, re-armed by the setter. */
    private _wake: ClockHandle | null = null;

    /** Reentry guard (TS-private; proxy-safe — never `#`). */
    private _settingGuard = false;
    /** A blow not yet thrown at its pourer (the pour verb reports it). */
    private _blowPending = false;

    getCastTemplate(): string {
      return this.castTemplate;
    }

    /** Set (or clear, `0`) the set's next wake, and arm it on the game clock. */
    public setWakeAtS(value: number): void {
      this._wake?.cancel();
      this._wake = null;
      this.wakeAtS = Number.isFinite(value) && value > 0 ? value : 0;
      if (this.wakeAtS === 0) return;
      this._wake = WorldClockApi.at(
        Quantity.of(this.wakeAtS, 's'),
        () => this.wake(),
        { host: this as unknown as Stuff, tag: 'mould-set' },
      );
    }

    /**
     * ⭐ The wake (crowded-rooms D8): bank to now and, if the set is through,
     * finish it — the one place a set completes. A cast that cannot release
     * (a consumed mould standing nowhere) throws `DetachedError` here,
     * synchronously, to the clock's guarded root, before the pool is touched.
     */
    private wake(): void {
      this._wake = null;
      this.wakeAtS = 0;
      this.reconcileSetting();
      // The bank re-arms a set that is through for NOW; the finish below is
      // that wake. Disarm first: a cast that cannot release (it throws) is
      // retried at the mould's next change — being set down somewhere —
      // never in a loop.
      const self = this as unknown as Stuff;
      const material = MixinApi.isBulkable(self) ? self.getBulkMaterial('interior') : null;
      if (!this.isSetThrough(this.drainSettingOf(material))) return;
      if (this.wakeAtS !== 0) this.setWakeAtS(0);
      const done = this.finishSet();
      if (done === null) return;
      // The clock's callbacks are synchronous; what a cast does after its
      // first await is said by the cast's own failure report.
      void done.catch((err: unknown) => {
        console.error(`Mould: what set in ${self.getPresentation()} could not be cast`, err);
        void DiagnosticApi.record({
          path: self.getTemplatePath() ?? '/platform/lib/mould',
          severity: 'error',
          message: `what set could not be cast: ${err instanceof Error ? err.message : String(err)}`,
        }).catch(() => {
          // the console line above already said it
        });
      });
    }
    setCastTemplate(value: string): void {
      this.castTemplate = typeof value === 'string' ? value : '';
    }
    isReusable(): boolean {
      return this.reusable;
    }
    setReusable(value: boolean): void {
      this.reusable = value !== false;
    }
    getWearPerCast(): number {
      return this.wearPerCast;
    }
    setWearPerCast(value: number): void {
      if (!Number.isFinite(value) || value < 0) {
        throw new RangeError(
          `MouldMixin.setWearPerCast: must be >= 0, got ${value}`,
        );
      }
      this.wearPerCast = value;
    }
    getMouldDiscipline(): string {
      return this.discipline;
    }
    setDiscipline(value: string): void {
      this.discipline = typeof value === 'string' ? value : '';
    }
    isImpressible(): boolean {
      return this.impressible;
    }
    setImpressible(value: boolean): void {
      this.impressible = value === true;
    }
    isAbsorbent(): boolean {
      return this.absorbent;
    }
    setAbsorbent(value: boolean): void {
      this.absorbent = value === true;
    }
    isClosedCavity(): boolean {
      return this.closedCavity || this.impression !== null;
    }
    setClosedCavity(value: boolean): void {
      this.closedCavity = value === true;
    }
    hasRiser(): boolean {
      return this.riser;
    }
    setRiser(value: boolean): void {
      this.riser = value === true;
    }
    getPressKind(): string {
      return this.pressKind;
    }
    setPressKind(value: string): void {
      this.pressKind = value === 'press' ? 'press' : '';
    }
    public getPourDurationS(): number {
      return this.pourDurationS;
    }
    /** See {@link Mould.watchThePour}. */
    public watchThePour(by: Stuff): StartedNote | null {
      const mould = this as unknown as Stuff;
      const credit = (): void => {
        if (by.isDestroyed() || mould.isDestroyed()) return;
        const discipline = this.getMouldDiscipline();
        if (discipline && MixinApi.isAdvancing(by)) {
          void by
            .creditDeed({ discipline, difficulty: 'hard', outcome: 'success' })
            .catch((err: unknown) => console.warn('Mould: recording the deed failed:', err));
        }
        MessageApi.scene(by)
          .topic('act.deed')
          .toSelf(Mml.compose`The day is out. ${Mml.thing(mould)} has gone quiet and cool enough to dig the cast out of.`)
          .send();
      };
      if (!MixinApi.isEngaged(by)) {
        credit();
        return null;
      }
      const started = SchedulerApi.start(
        new ManualBuildStep({
          actor: by,
          slots: ['attention'],
          durationMs: this.pourDurationS * 1000,
          effortW: POUR_WATCH_EFFORT_W,
          onComplete: credit,
        }),
      );
      MessageApi.scene(by)
        .topic('act.deed')
        .toSelf(Mml.compose`The metal goes down into ${Mml.thing(mould)} in a long bright rope. Now it has to cool, and you settle in to watch it the day through.`)
        .toPeers(Mml.compose`${Mml.actor(by)} settles in to watch over ${Mml.thing(mould)}.`)
        .send();
      return started.ok && started.status !== 'completed-sync' ? started.note : null;
    }
    setPourDurationS(value: number): void {
      this.pourDurationS = Number.isFinite(value) && value > 0 ? value : 0;
    }
    getBreaksTo(): string {
      return this.breaksTo;
    }
    setBreaksTo(value: string): void {
      this.breaksTo = typeof value === 'string' ? value.trim() : '';
    }
    public getPourSuperheatK(): number {
      return this.pourSuperheatK;
    }

    public getImpression(): Impression | null {
      // The setter validated it: a stored impression that will not read is
      // a defect, and it throws rather than reading as an empty cavity.
      return this.impression === null ? null : new Impression(this.impression);
    }
    public setImpression(value: ImpressionData | null): void {
      this.impression =
        value && typeof value.kindPath === 'string' ? new Impression(value).toData() : null;
    }

    /** A mould of two halves — an assembly with two parts or more (D23). */
    private isTwoPiece(): boolean {
      const self = this as unknown as Stuff;
      if (!MixinApi.isAssembled(self) || self.isOnePiece()) return false;
      return self.getParts().reduce((n, l) => n + l.count, 0) >= 2;
    }

    /** A material's own cast lump — `''` when it has no fusion to cast from. */
    private castOf(material: Material): string {
      return MixinApi.hasFusion(material) ? material.getCastTemplate() : '';
    }

    /** The drain-set law a material carries, or `null` (no kinetics, no law). */
    private drainSettingOf(material: Material | null | undefined) {
      return material && MixinApi.hasKinetic(material) ? material.getDrainSetting() : null;
    }

    /** The cure a pooled material sets by, or `null`. */
    private poolSetOf(material: Material | null | undefined) {
      return (material && MixinApi.hasKinetic(material) ? material.getKinetics()?.poolSet() : null) ?? null;
    }

    public castTemplateFor(material: Material): string {
      const self = this as unknown as Stuff;
      // ⭐ A cracked mould casts a lump — the shape is the mould's only
      // while the mould is whole: worn out (broken), or an unmended crack
      // through the cavity (the one damage record, review R2-D1).
      const cracked =
        MixinApi.isIntegrity(self) && self.getFlaws().some((f) => f.kind === 'crack' && !f.mended);
      if ((MixinApi.isDurable(self) && self.isBroken()) || cracked) {
        return this.castOf(material);
      }
      return this.castTemplate || this.castOf(material);
    }

    /**
     * ⭐ True while a CAST sits in the mould — a thing of this mould's
     * shape, the impression's kind, or the lump a cracked mould casts (a
     * thing that is its own material's cast). ⚠ Not "anything in it"
     * (rubber build): a mould charged with solids waiting to be fired —
     * raw rubber and sulfur, a lump of tempered clay waiting for the press
     * — holds a charge, not a cast.
     */
    public holdsCast(): boolean {
      const kind = this.impression?.kindPath ?? '';
      const self = this as unknown as Stuff;
      if (!MixinApi.isContainer(self)) return false;
      for (const c of self.getContents()) {
        const path = (c as Stuff).getTemplatePath();
        if (path === null) continue;
        if (this.castTemplate !== '' && path === this.castTemplate) return true;
        if (kind !== '' && path === kind) return true;
        const s = c as Stuff;
        if (MixinApi.isCrafted(s) && s.getCastFrom() !== null) return true;
        const m = MixinApi.isTangible(s) ? (s.getMaterial() ?? null) : null;
        if (m !== null && this.castOf(m) === path) return true;
      }
      return false;
    }

    /**
     * ⭐ A mould's foot is open (matter-model-overlaps D10): what drips off
     * what sets in it — molasses off a clayed loaf in its cone — runs on to
     * what the mould drips to, as its own drainings do, never into it.
     */
    public passesDripsThrough(): boolean {
      return true;
    }

    public loadN(): number {
      const self = this as unknown as Stuff;
      let n = 0;
      if (MixinApi.isPlacing(self)) {
        for (const item of self.getPlaced(Placements.ON)) {
          if (MixinApi.isTangible(item)) n += item.getMass().rawValue() * G;
        }
      }
      // ⭐ What the host it stands in or on bears down on it (ceramics D25;
      // `Placing.bearingLoadN`, B104) — a screw press its platen, a bench
      // nothing, so any press a pack ships loads it the same way.
      if (MixinApi.isContainable(self)) {
        const host = self.getPlacement()?.host ?? null;
        if (host !== null) n += Math.max(0, host.bearingLoadN(self));
      }
      return n;
    }

    /** ⭐ Pure: what the last bank left (crowded-rooms D8). */
    public setState(): 'filled' | 'setting' | 'set' | null {
      const self = this as unknown as Stuff;
      const pooled =
        MixinApi.isBulkable(self) && self.getBulkAmount('interior').rawValue() > 0;
      if (pooled) {
        const mat = self.getBulkMaterial('interior');
        const sets = this.drainSettingOf(mat) !== null || this.poolSetOf(mat) !== null;
        return sets && this.setProgress > 0 ? 'setting' : 'filled';
      }
      return this.holdsCast() ? 'set' : null;
    }

    /**
     * ⭐ The mould banks at its own changes (crowded-rooms D8) — what is set
     * on it or taken off, what it is set on, a move, something in or out —
     * and the integration uses the load stored for the stretch, so banking
     * after the change is exact.
     */
    public placedChanged(item: Stuff & Containable): void {
      this.reconcileSetting();
      const sup = (Base.prototype as { placedChanged?: (i: Stuff & Containable) => void }).placedChanged;
      if (typeof sup === 'function') sup.call(this, item);
    }

    public placementChanged(was: string, now: string): void {
      this.reconcileSetting();
      const sup = (Base.prototype as { placementChanged?: (w: string, n: string) => void }).placementChanged;
      if (typeof sup === 'function') sup.call(this, was, now);
    }

    public onMoved(from: (Stuff & Container) | null, to: (Stuff & Container) | null): void {
      const sup = (Base.prototype as {
        onMoved?: (f: (Stuff & Container) | null, t: (Stuff & Container) | null) => void;
      }).onMoved;
      if (typeof sup === 'function') sup.call(this, from, to);
      this.reconcileSetting();
    }

    public onContainableAdded(thing: Stuff & Containable, from?: Stuff | null): void {
      const sup = (Base.prototype as {
        onContainableAdded?: (t: Stuff & Containable, f?: Stuff | null) => void;
      }).onContainableAdded;
      if (typeof sup === 'function') sup.call(this, thing, from);
      this.reconcileSetting();
    }

    public onContainableRemoved(thing: Stuff & Containable, to?: Stuff | null): void {
      const sup = (Base.prototype as {
        onContainableRemoved?: (t: Stuff & Containable, to?: Stuff | null) => void;
      }).onContainableRemoved;
      if (typeof sup === 'function') sup.call(this, thing, to);
      this.reconcileSetting();
    }

    /**
     * ⭐ **Bank** the set to now (crowded-rooms D8): integrate a drain or a
     * cure from {@link setStamp} at the STORED load ({@link setLoadN}) and
     * the rate's other inputs read now, credit the drainings, then store the
     * load as it is now and re-arm the wake. Called only at moments that do
     * not depend on who is reading — the mould's own changes and its own
     * wake (and a press turned on it). It never completes a set: that is the
     * wake's ({@link finishSet}). Inside the room's reading it stands off.
     *
     * @samples the drain and cure sets read NO temperature — they integrate
     * progress over game-time (a drain by the load on the mould, an
     * absorbed drain by the mould's own dryness); the one temperature read
     * here exists to run the thermal reconcile, which folds its own
     * trajectory and freezes a pool below its melting point.
     */
    public reconcileSetting(): void {
      if (this._settingGuard) return;
      if (ExecutionContextApi.worldHeldStill) return;
      const self = this as unknown as Stuff;
      if (!MixinApi.isBulkable(self)) return;
      this._settingGuard = true;
      try {
        // A temperature read runs the thermal reconcile, which is what
        // freezes a pool below its melting point (and casts INTO this).
        if (MixinApi.isThermal(self)) self.getTemperature();

        const amountL = self.getBulkAmount('interior').rawValue();
        const material = self.getBulkMaterial('interior');
        const drain = this.drainSettingOf(material);
        const cure = this.poolSetOf(material);
        const idle =
          !(amountL > 0) ||
          material === null ||
          (drain === null && cure === null) ||
          // ⭐ An absorbed drain (slip) sets only where something drinks it.
          (drain !== null && drain.isAbsorbedByMould() && !this.absorbent);
        if (idle) {
          this.setProgress = 0;
          this.setStamp = 0;
          this.setPressed = 0;
          this.setDrainedKg = 0;
          this.setLoadN = 0;
          if (this.wakeAtS !== 0) this.setWakeAtS(0);
          return;
        }
        const nowS = mouldNowSeconds();
        if (nowS === null) return;
        if (this.setStamp === 0) {
          this.setStamp = nowS;
          this.setLoadN = this.loadN();
          this.armWake(nowS, drain);
          return;
        }
        const elapsed = nowS - this.setStamp;
        this.setStamp = nowS;
        if (elapsed > 0 && this.setProgress < 1 - 1e-9) {
          // ⭐ The charge the set started from: what is in the mould plus
          // what its drainings have already taken out of it (they leave by
          // transfer, R1-D8, so the pool shrinks as it sets).
          const poolKg =
            ((amountL + this.drainedLitres(drain)) / 1000) * material!.getDensity().rawValue();
          if (drain === null && cure !== null) {
            // ⭐ The cure: a chemical set, no act and no load — the
            // material's own kinetic (review R2-D3), at the mould's
            // temperature.
            const k = MixinApi.isThermal(self) ? self.getTemperature().rawValue() : 293;
            this.setProgress = cure.advance(this.setProgress, (cure.rateAt(k) * elapsed) / 3_600);
          } else if (drain !== null) {
            // ⭐ The drain set's law is the MATTER's (`DrainSetting`, B104):
            // its rate under the load the stretch was under, the moisture a
            // pressing leaves, what drains.
            const wetness = MixinApi.isWet(self) ? self.getWetness() : 0;
            const ratio = drain.loadRatio(this.setLoadN, poolKg);
            const step = Math.min(
              1 - this.setProgress,
              drain.ratePerDay(ratio, wetness) * (elapsed / SECONDS_PER_GAME_DAY),
            );
            this.setPressed += ratio * step;
            this.setProgress += step;
            // ⭐ The drainings leave as the set progresses (sugar D16): what
            // the set will have driven out, at today's press, credited a
            // step at a time to the vessel the mould stands on.
            const pressedSoFar = this.setProgress > 0 ? this.setPressed / this.setProgress : 0;
            const lostAt = this.drainLoss(drain, material!, poolKg);
            this.creditDrainings(drain, lostAt(Math.min(1, pressedSoFar)) * Math.min(1, this.setProgress));
          }
        }
        this.setLoadN = this.loadN();
        this.armWake(nowS, drain);
      } finally {
        this._settingGuard = false;
      }
    }

    /**
     * Arm the next wake: when the set will be through at the current rate,
     * but never more than {@link MOULD_SET_STEP_S} away — and now, if it is
     * through already.
     */
    private armWake(nowS: number, drain: DrainSetting | null): void {
      if (this.isSetThrough(drain)) {
        this.setWakeAtS(nowS);
        return;
      }
      let untilS = MOULD_SET_STEP_S;
      const self0 = this as unknown as Stuff;
      const cure = drain === null && MixinApi.isBulkable(self0)
        ? this.poolSetOf(self0.getBulkMaterial('interior'))
        : null;
      if (cure !== null) {
        // ⭐ A cure's finish, off its own kinetic at the temperature now:
        // the least time within the step whose dose reaches a rung.
        const k = MixinApi.isThermal(self0) ? self0.getTemperature().rawValue() : 293;
        const through = (t: number): boolean =>
          cure.rungIndexFor(cure.advance(this.setProgress, (cure.rateAt(k) * t) / 3_600)) >= 0;
        if (through(untilS)) {
          let lo = 0;
          let hi = untilS;
          for (let i = 0; i < 24; i++) {
            const mid = (lo + hi) / 2;
            if (through(mid)) hi = mid;
            else lo = mid;
          }
          untilS = hi;
        }
      } else if (drain !== null) {
        const self = this as unknown as Stuff;
        const material = MixinApi.isBulkable(self) ? self.getBulkMaterial('interior') : null;
        const amountL = MixinApi.isBulkable(self) ? self.getBulkAmount('interior').rawValue() : 0;
        if (material !== null) {
          const poolKg = ((amountL + this.drainedLitres(drain)) / 1000) * material.getDensity().rawValue();
          const wetness = MixinApi.isWet(self) ? self.getWetness() : 0;
          const perDay = drain.ratePerDay(drain.loadRatio(this.setLoadN, poolKg), wetness);
          if (perDay > 0) {
            untilS = Math.min(untilS, ((1 - this.setProgress) / perDay) * SECONDS_PER_GAME_DAY);
          }
        }
      }
      this.setWakeAtS(nowS + Math.max(1, Math.ceil(untilS)));
    }

    /** Is the banked set through — the drain's progress at 1, or a cure's rung reached? */
    private isSetThrough(drain: DrainSetting | null): boolean {
      if (drain !== null) return this.setProgress >= 1 - 1e-9;
      const self = this as unknown as Stuff;
      const material = MixinApi.isBulkable(self) ? self.getBulkMaterial('interior') : null;
      const cure = this.poolSetOf(material);
      return cure !== null && cure.rungIndexFor(this.setProgress) >= 0;
    }

    /** What a drain set will have driven out of a pool of `poolKg`, at a given pressing. */
    private drainLoss(drain: DrainSetting, material: Material, poolKg: number): (pressed: number) => number {
      const waterFraction =
        ((MixinApi.hasEdibility(material) ? material.getNutrientAmounts()['water'] : 0) ?? 0) / 1e6 ||
        (MixinApi.hasMixture(material)
          ? material.getComposition().find((e) => e.materialPath.endsWith('/water'))?.fraction
          : 0) ||
        0;
      const overpress = mouldDial(AppSettingKeys.mouldOverpressExponent, 0.15);
      return (pressed: number): number =>
        drain.drainedKg(poolKg, waterFraction, pressed, this.poolBandsBelowFine(), overpress);
    }

    /**
     * ⭐ Finish a set that is through (crowded-rooms D8) — called only by the
     * wake, after it banked. Checks {@link assertCanRelease} before the pool
     * is touched, empties it, and returns the cast for the wake to report.
     * `null` when the set is not through.
     */
    private finishSet(): Promise<unknown> | null {
      const self = this as unknown as Stuff;
      if (!MixinApi.isBulkable(self)) return null;
      const amountL = self.getBulkAmount('interior').rawValue();
      const material = self.getBulkMaterial('interior');
      const drain = this.drainSettingOf(material);
      const cure = this.poolSetOf(material);
      if (!(amountL > 0) || material === null || !this.isSetThrough(drain)) return null;
      const poolKg =
        ((amountL + this.drainedLitres(drain)) / 1000) * material.getDensity().rawValue();
      if (drain === null && cure !== null) {
        const rung = cure.rungIndexFor(this.setProgress);
        const to = cure.getLadder()[rung]!.becomes;
        const becomes = to ? MaterialApi.materials().peek(to) ?? material : material;
        this.assertCanRelease();
        const payload = self.getBulkPayload('interior');
        this.clearPool(self);
        return this.castInto({ material: becomes, massKg: poolKg, payload, stampMaterial: true });
      }
      if (drain === null) return null;
      // ⭐ Set. The water the press drove out is gone; what is left is the
      // cheese, at the moisture the load left it.
      const absorbed = drain.isAbsorbedByMould();
      const wetness = MixinApi.isWet(self) ? self.getWetness() : 0;
      const overpress = mouldDial(AppSettingKeys.mouldOverpressExponent, 0.15);
      const pressed = this.setPressed; // average ratio over the set
      const moisture = drain.moistureAt(pressed, overpress);
      const lostKg = this.drainLoss(drain, material, poolKg)(pressed);
      this.creditDrainings(drain, lostKg);
      const massKg = poolKg - lostKg;
      // ⭐ The water an absorbent mould drank is in its OWN wetness now —
      // the next cast in it sets slower until it dries.
      if (absorbed && MixinApi.isWet(self)) {
        const cap = self.waterCapacityKg();
        if (cap > 0) self.wet(Math.min(1 - wetness, (poolKg - massKg) / cap));
      }
      // The shape this mould casts it as may name what it becomes (a
      // hogshead's block is raw sugar, a cone's loaf is loaf sugar).
      const becomesPath = drain.becomesFor(this.castTemplateFor(material));
      const becomes = becomesPath ? MaterialApi.materials().peek(becomesPath) ?? material : material;
      this.assertCanRelease();
      const payload = self.getBulkPayload('interior');
      this.clearPool(self);
      return this.castInto({ material: becomes, massKg, payload, moisture, stampMaterial: true });
    }

    /**
     * ⭐ A consumed mould breaks to release what set in it, into the place
     * it stands. Standing nowhere it has nowhere to put it: a `DetachedError`,
     * checked before the pool is touched (B104 — it destroyed itself and
     * left the cast in no place at all).
     */
    private assertCanRelease(): void {
      if (this.reusable) return;
      const self = this as unknown as Stuff;
      const scope = MixinApi.isContainable(self) ? self.getContainer() : null;
      if (scope === null || !MixinApi.isContainer(scope)) {
        throw new DetachedError(
          `${self.getPresentation()} would break to release its cast while standing nowhere`,
        );
      }
    }

    /** Empty the pool and the set's progress (the set has taken it). */
    private clearPool(self: Stuff): void {
      if (!MixinApi.isBulkable(self)) return;
      self.setBulkAmount('interior', Quantity.of(0, 'L'));
      self.setBulkMaterial('interior', null);
      self.setBulkPayload('interior', null);
      this.setProgress = 0;
      this.setStamp = 0;
      this.setPressed = 0;
      this.setDrainedKg = 0;
      this.setLoadN = 0;
      if (this.wakeAtS !== 0) this.setWakeAtS(0);
    }

    public receivedPour(pour: ReceivedPour): void {
      const self = this as unknown as Stuff;
      const mp = MixinApi.hasFusion(pour.material) ? pour.material.getMeltingPoint().rawValue() : 0;
      // ⭐ A drain or a cure starts its clock at the POUR — not at whoever
      // happens to look first (a slip poured and left for three hours has
      // been setting for three hours).
      if (
        this.setStamp === 0 &&
        (this.drainSettingOf(pour.material) !== null || this.poolSetOf(pour.material) !== null)
      ) {
        const nowS = mouldNowSeconds() ?? 0;
        this.setStamp = nowS;
        // ⭐ …under the load on it now, and with its wake armed (D8).
        this.setLoadN = this.loadN();
        if (nowS > 0) this.armWake(nowS, this.drainSettingOf(pour.material));
      }
      // ⭐ An absorbent mould DRINKS plain water (a sand flask watered, a
      // dry plaster mould): it goes into the mould's own wetness, and a
      // mould wetter than the dial blows under the next hot pour.
      if (
        this.absorbent &&
        pour.material.hasTag('liquid') &&
        this.drainSettingOf(pour.material) === null &&
        this.poolSetOf(pour.material) === null &&
        MixinApi.isBulkable(self) &&
        MixinApi.isWet(self)
      ) {
        const cap = self.waterCapacityKg();
        const kg = (pour.litres / 1000) * pour.material.getDensity().rawValue();
        if (cap > 0) self.wet(Math.min(1, kg / cap));
        const left = self.getBulkAmount('interior').rawValue() - pour.litres;
        if (left <= 1e-9) this.clearPool(self);
        else self.setBulkAmount('interior', Quantity.of(left, 'L'));
        return;
      }
      if (!pour.material.hasTag('metal')) return;
      this.pourSuperheatK = Math.max(0, pour.temperatureK - mp);
      // ⭐ The damp blow (S12): water in the mould flashes to steam under
      // metal. The cast is ruined at the set; the pourer is burned now.
      const wet = MixinApi.isWet(self) ? self.getWetness() : 0;
      if (pour.temperatureK > 373 && wet > mouldDial(AppSettingKeys.mouldBlowWetness, 0.3)) {
        this.blown = true;
        this._blowPending = true;
      }
    }

    /**
     * @hook The pourer hears the blow and takes the spatter on the hands
     * (the shipped touch-burn route, through the `heat` channel, so a
     * glove insulates).
     */
    public afterPouredInBy(by: Stuff, litres: number): void {
      const sup = (Base.prototype as { afterPouredInBy?: (b: Stuff, l: number) => void }).afterPouredInBy;
      if (typeof sup === 'function') sup.call(this, by, litres);
      if (!this._blowPending) return;
      this._blowPending = false;
      const self = this as unknown as Stuff;
      if (MixinApi.isSensor(by)) MessageApi.scene(by)
        .topic('act.deed')
        .toSelf(
          Mml.compose`${Mml.thing(self)} was damp. The water in it flashes to steam with a crack, and molten metal spits back out of it over your hands!`,
        )
        .toPeers(Mml.compose`${Mml.thing(self)} blows with a crack, and metal spits out over ${Mml.actor(by)}.`)
        .send();
      if (MixinApi.isVitals(by)) {
        ConditionApi.inflict(by, {
          mechanism: 'heat',
          site: 'body.hand',
          energy: mouldDial(AppSettingKeys.mouldBlowBurnJ, 2),
        });
      }
    }

    /**
     * ⭐ Press a pattern into the cavity (ceramics D21): a soft medium takes
     * an {@link Impression} of the whole shape — a sand flask rammed round
     * it, a wax block, a plaster case whose slurry has not yet cured. The
     * medium answers; the verb is dumb.
     */
    public async takeImpression(pattern: Stuff, _actor: Stuff): Promise<ImpressOutcome | ImpressRefusal> {
      const self = this as unknown as Stuff;
      if (!this.impressible) return { ok: false, reason: 'not-impressible', facts: { why: 'cut-to-shape' } };
      if (this.impression !== null) {
        const held = this.getImpression();
        return { ok: false, reason: 'already-impressed', facts: { held: held?.getFormDescription() ?? 'something' } };
      }
      const pooled = MixinApi.isBulkable(self) && self.getBulkAmount('interior').rawValue() > 0;
      const curing = pooled && MixinApi.isBulkable(self) && this.poolSetOf(self.getBulkMaterial('interior')) !== null;
      if ((pooled && !curing) || this.holdsCast()) return { ok: false, reason: 'occupied' };
      const shape = MixinApi.isTangible(pattern) ? pattern.leaveImpression(mouldNowSeconds() ?? 0) : null;
      const imp = shape !== null ? new Impression(shape) : null;
      if (imp === null) return { ok: false, reason: 'no-shape' };
      const cap = MixinApi.isBulkable(self) ? (self.getBulkCapacity('interior')?.rawValue() ?? 0) : 0;
      if (cap > 0 && imp.getVolumeL() > cap) return { ok: false, reason: 'too-big' };
      // ⭐ Draft (S15): a shape with something standing out of it will not
      // draw out of a one-piece rigid mould — only one broken to release it,
      // or one of two halves.
      if (imp.hasUndercut() && this.reusable && !this.isTwoPiece()) return { ok: false, reason: 'undercut' };
      this.impression = imp.toData();
      this.riser = false;
      // Rammed green sand is damp — damp enough to hold the shape.
      if (this.absorbent && MixinApi.isWet(self)) {
        const want = mouldDial(AppSettingKeys.mouldRammedWetness, 0.15);
        const now = self.getWetness();
        if (want > now) self.wet(want - now);
      }
      return { ok: true, facts: { kind: 'impressed', form: imp.getFormDescription() } };
    }

    /**
     * ⭐ `carve riser on <flask>` (ceramics S14): cut a riser and a runner
     * into a rammed mould, so the last metal to freeze is fed and the cast
     * comes out sound. Any edge does it.
     */
    public async carvePlanFor(req: CarveRequest): Promise<CarvePlan | CarveRefusal | null> {
      const self = this as unknown as Stuff;
      const word = req.word.trim().toLowerCase();
      if (word !== 'riser' && word !== 'runner' && word !== 'gate') {
        return { ok: false, reason: 'not-carvable', facts: { carves: 'riser' } };
      }
      if (!this.impressible || this.impression === null) return { ok: false, reason: 'no-cavity' };
      if (this.riser) return { ok: false, reason: 'has-riser' };
      const knife = req.knife;
      if (knife === null || !MixinApi.isTool(knife) || !knife.hasCapability(CUTTING)) {
        return { ok: false, reason: 'no-edge', facts: { carves: 'riser' } };
      }
      const actor = req.actor;
      return {
        ok: true,
        durationMs: 2 * 60 * 1000,
        effortW: 80,
        facts: { kind: 'riser' },
        onComplete: () => {
          if (self.isDestroyed() || actor.isDestroyed()) {
            if (!self.isDestroyed()) this.riser = true;
            return { ok: true, facts: { kind: 'gone' } };
          }
          this.riser = true;
          return { ok: true, facts: { kind: 'riser' } };
        },
      };
    }

    public async pressRelease(): Promise<Stuff | null> {
      if (this.pressKind !== 'press') return null;
      const self = this as unknown as Stuff;
      const load = this.loadN();
      for (const c of super.getContents()) {
        const charge = c as Stuff;
        if (charge.isDestroyed() || !MixinApi.isTangible(charge)) continue;
        if (!MixinApi.isMoist(charge)) continue;
        if (charge.getTemplatePath() === this.castTemplate) continue;
        const material = charge.getMaterial();
        if (material === null) continue;
        const moisture = charge.getWaterState()?.moisture ?? 0;
        if (moisture < 0.05) continue; // dry and hard — it will not press
        const units = MixinApi.isStackable(charge) ? Math.max(1, charge.getQuantity()) : 1;
        const totalKg = charge.getMass().rawValue() * units;
        // The cavity holds what it holds; the rest of the lump stays a lump.
        const cavityL = MixinApi.isBulkable(self) ? (self.getBulkCapacity('interior')?.rawValue() ?? 0) : 0;
        const cavityKg = cavityL > 0 ? (cavityL / 1000) * material.getDensity().rawValue() : totalKg;
        const massKg = Math.min(totalKg, cavityKg > 0 ? cavityKg : totalKg);
        const stiffN =
          massKg * mouldDial(AppSettingKeys.mouldPressNPerKg, 2000) * Math.pow(1 - Math.min(1, moisture), 2);
        if (load < stiffN) continue;
        const payload: BulkPayload | null = MixinApi.isComposition(charge)
          ? { makeup: charge.effectiveMakeup().map((e) => ({ ...e })) }
          : null;
        const maker = MixinApi.isCrafted(charge) ? charge.getMaker() : '';
        if (payload && maker) payload.maker = maker;
        // The cast first, then the charge is spent (B104): a cast that cannot
        // be made throws with the clay still a lump. ⭐ The charge stands
        // aside while the cast is made (W10j): the cast is minted INTO the
        // cavity the charge fills, and with every size known the tape
        // measure refuses a second cavity-full — so the lump steps out to
        // the press's own place, and goes back if the cast fails or some
        // of it is left over.
        const scope = MixinApi.isContainable(self) ? self.getContainer() : null;
        const lump = MixinApi.isContainable(c as Stuff) ? (c as Stuff & Containable) : null;
        const aside =
          lump !== null && scope !== null && MixinApi.isContainer(scope) ? (scope as Stuff & Container) : null;
        if (lump !== null && aside !== null) ContainmentApi.move(lump, aside);
        let cast: Stuff;
        try {
          cast = await this.castInto({ material, massKg, payload, moisture, stampMaterial: true });
        } catch (err) {
          if (lump !== null && aside !== null && !lump.isDestroyed()) {
            ContainmentApi.move(lump, self as Stuff & Container);
          }
          throw err;
        }
        const leftKg = totalKg - massKg;
        if (leftKg > 1e-6) {
          charge.setMass(Quantity.of(leftKg / units, 'kg'));
        } else {
          await StuffApi.destruct(charge);
        }
        // ⭐ Shape-and-release: green strength holds the shape, so it leaves
        // the mould at once and sets outside it.
        if (scope !== null && MixinApi.isContainer(scope) && MixinApi.isContainable(cast)) {
          ContainmentApi.move(cast as Stuff & Containable, scope as Stuff & Container);
        }
        // What the cavity could not take stays in the mould, a lump.
        if (lump !== null && aside !== null && !lump.isDestroyed()) {
          ContainmentApi.move(lump, self as Stuff & Container);
        }
        return cast;
      }
      return null;
    }

    /**
     * ⭐ The grade what sets here will have (D3): the lower of the batch's
     * (its payload) and this mould's own — a shaping vessel is the one
     * vessel that passes its own grade on. Either side ungraded, the
     * other's; `null` when neither is.
     */
    private castGrade(): Grade | null {
      const self = this as unknown as Stuff;
      const own = MixinApi.isGraded(self) ? self.getGrade() : null;
      const band = MixinApi.isBulkable(self) ? self.getBulkPayload('interior')?.grade : undefined;
      const batch = band !== undefined && Grade.isBand(band) ? Grade.of(band) : null;
      if (own === null) return batch;
      return batch === null ? own : own.min(batch);
    }

    /** Grade bands the pool sets below `fine` (0 when ungraded). */
    private poolBandsBelowFine(): number {
      const grade = this.castGrade();
      if (grade === null) return 0;
      return Math.max(0, Grade.of('fine').getOrdinal() - grade.getOrdinal());
    }

    /**
     * ⭐ Drain the pool down to `totalKg` of drainings given up — the one
     * drip (matter-model-overlaps D10) through the set (R1-D8): the
     * population and the dissolved go with the liquid, the solid's identity
     * does not, the maker does. They run to what is under the mould
     * (`dripSlots` — the vessel it stands in or on, else the floor: whey
     * pools under a hoop on a bare board), a grade one band below the
     * pool's on their payload — never above what that vessel already held.
     */
    private creditDrainings(drain: DrainSetting, totalKg: number): void {
      const deltaKg = totalKg - this.setDrainedKg;
      if (!drain.getDrains() || !(deltaKg > 0)) return;
      const what = MaterialApi.materials().peek(drain.getDrains());
      if (!what) return;
      const density = what.getDensity().rawValue();
      if (!(density > 0)) return;
      const self = this as unknown as Stuff;
      if (!MixinApi.isBulkable(self)) return;
      // Read before the drainings leave: the pool's grade is what sets.
      const poolGrade = this.castGrade();
      const litres = (deltaKg / density) * 1000;
      const out = BulkableApi.drip({
        from: self.getBulk('interior'),
        litres,
        via: {
          through: 'set',
          arrivesAs: what,
          ...(poolGrade !== null ? { grade: Grade.fromOrdinal(poolGrade.getOrdinal() - 1).getBand() } : {}),
        },
      });
      this.setDrainedKg += (out.drained / 1000) * density;
    }

    /** Litres the drainings have taken out of the pool so far (R1-D8). */
    private drainedLitres(drain: DrainSetting | null): number {
      if (!drain?.getDrains() || !(this.setDrainedKg > 0)) return 0;
      const what = MaterialApi.materials().peek(drain.getDrains());
      const density = what?.getDensity().rawValue() ?? 0;
      return density > 0 ? (this.setDrainedKg / density) * 1000 : 0;
    }

    public async castInto(pool: SetPool): Promise<Stuff> {
      const self = this as unknown as Stuff & Container;
      // ⭐ Where it goes, checked before anything is minted (B104).
      this.assertCanRelease();
      const scopeOf = MixinApi.isContainable(self as Stuff)
        ? (self as unknown as Containable).getContainer()
        : null;
      const scope =
        scopeOf !== null && MixinApi.isContainer(scopeOf as Stuff)
          ? (scopeOf as unknown as Stuff & Container)
          : null;
      const metal = pool.material.hasTag('metal');
      const imp = this.getImpression();
      const blown = this.blown;
      const superheat = this.pourSuperheatK;
      // ⭐ The chill (S12): a conducting mould sets a chilling metal hard.
      let material = pool.material;
      if (metal && !blown) {
        const ownMaterial = MixinApi.isTangible(self) ? self.getMaterial() : null;
        const k = ownMaterial?.getThermalConductivity().rawValue() ?? 0;
        const chilled = MixinApi.hasFusion(material) ? material.chilledIn(k) : '';
        if (chilled) material = MaterialApi.materials().peek(chilled) ?? material;
      }
      const fromImpression = !blown && imp !== null && this.castTemplate === '';
      const template = blown
        ? this.castOf(material)
        : fromImpression
          ? imp!.getKindPath()
          : this.castTemplateFor(material);

      // The cast's mass, and the overfill that sets in the runner.
      let massKg = pool.massKg;
      let runnerKg = 0;
      let shortPour = false;
      const shrink = MixinApi.hasFusion(material) ? material.castShrinkage() : 0;
      if (fromImpression && imp !== null) {
        // ⭐ The cast shrinks as it cools by its metal's own shrink; a
        // pattern carved oversize for that metal casts true (D23).
        const cavityKg = (imp.getVolumeL() / 1000) * material.getDensity().rawValue();
        const castKg = cavityKg / Math.pow(1 + shrink, 3);
        if (pool.massKg < cavityKg * 0.98) {
          shortPour = true;
          massKg = Math.min(pool.massKg, castKg);
        } else {
          massKg = castKg;
          // A metal's overfill sets in the runner and riser; a slip's is
          // simply poured back off.
          runnerKg = metal ? Math.max(0, pool.massKg - castKg) : 0;
        }
      }
      const runner = runnerKg > massKg * 0.02;
      if (runner && scope === null) {
        throw new DetachedError(
          `${(self as Stuff).getPresentation()} cast with metal to spare while standing nowhere: its runner has no place`,
        );
      }
      this.blown = false;
      this.pourSuperheatK = 0;

      // ⚠ A cast row that will not mint, or is not a thing a pool can set
      // as, is an authoring error: it throws (B104 — it was a warning, and
      // what set was lost silently).
      const cast = await StuffApi.clone<Stuff>(template);
      if (!(MixinApi.isTangible(cast) && MixinApi.isVisible(cast) && MixinApi.isPerceptible(cast))) {
        await StuffApi.destruct(cast);
        throw new TypeError(`Mould: '${template}' is not a thing a pool could set as`);
      }
      const authored = cast.getMaterial();
      if (pool.stampMaterial === true || fromImpression || blown || material !== pool.material) {
        cast.setMaterial(material);
        if (blown) {
          // The holes are the flaw's to say (below); the lump is named.
          cast.setShortDescription(`blown lump of ${material.getName()}`);
          cast.setKeywords(['lump', 'blown', ...material.getName().split(/\s+/)]);
        }
      } else if (!authored) {
        cast.setMaterial(material);
        // The material's own fallback shape is a generic lump with no prose
        // of its own; a mould's shape is a row that authored its prose.
        if (template === this.castOf(material)) {
          cast.setShortDescription(`cast lump of ${material.getName()}`);
          cast.setKeywords(['lump', 'cast', ...material.getName().split(/\s+/)]);
        }
      }

      if (fromImpression && imp !== null) {
        if (MixinApi.isAssembled(cast)) void cast.setBill(null); // one piece (nothing to load)
        if (MixinApi.isCrafted(cast)) {
          cast.setCastFrom({
            kindPath: imp.getKindPath(),
            takenFromIdentity: imp.getTakenFromIdentity(),
            takenAtS: imp.getTakenAtS(),
          });
        }
        const kind = cast.getShortDescription().trim() || 'thing';
        cast.setShortDescription(`${material.getName()} cast of ${article(kind)} ${kind}`);
        const kw = new Set(cast.getKeywords());
        kw.add('cast');
        for (const w of material.getName().split(/\s+/)) kw.add(w);
        cast.setKeywords([...kw]);
        const whose = nameOf(imp.getTakenFromIdentity()) ?? (imp.getTakenFromName() || null);
        const truth = Math.abs(shrink - imp.getAllowance());
        const sizeLine =
          truth <= 0.003
            ? ''
            : imp.getAllowance() > shrink
              ? ' It came out a shade larger than the thing itself.'
              : ' It came out a shade smaller than what it was taken from: the metal shrank as it cooled.';
        cast.setLongDescription(
          `${material.getName().replace(/^./, (x) => x.toUpperCase())}, cast in one piece. Fine seams run along it where the mould met, and it carries no maker's mark. ` +
            `It was cast from an impression of ${whose ? `${whose}'s` : article(kind)} ${kind}.${sizeLine}`,
        );
        // ⭐⭐ Where a thing's function IS its shape, the cast performs it:
        // a key's wards turn the same lock.
        const keys = imp.getCarried().keys ?? [];
        if (keys.length > 0 && MixinApi.isCredentialWallet(cast)) {
          const cred = cast.ensureCredential('key');
          for (const k of keys) cred.addKey(k.keyway, k.technology);
        }
      }
      cast.setMass(Quantity.of(massKg, 'kg'));
      carryPayload(cast, pool, self);
      // A mould that casts a mould (a plaster case → the plaster mould)
      // hands it the cavity.
      if (!fromImpression && imp !== null && MixinApi.isMould(cast)) {
        cast.setImpression(imp.toData());
        this.impression = null;
      }

      const nowS = mouldNowSeconds() ?? 0;
      // ⭐ A blow is a flaw like a misrun (B104): the flaw is the fact, `look`
      // words it, and the grade's ceiling is its.
      if (blown && MixinApi.isIntegrity(cast)) cast.addFlaw('blowhole', true, nowS);
      // ⭐⭐ Chvorinov (S14) — a metal pour, judged by the physics of it.
      if (metal && !blown && MixinApi.isIntegrity(cast)) {
        const density = material.getDensity().rawValue();
        const volumeM3 = density > 0 ? massKg / density : 0;
        // ⭐ Its length is its shape's (a blade's impression carries it).
        const lengthM = cast.leaveImpression(nowS)?.lengthM ?? 0;
        const modulus = modulusCm(volumeM3, lengthM);
        const mouldMat = MixinApi.isTangible(self) ? self.getMaterial() : null;
        const chill = Math.max(0.2, (mouldMat?.getEffusivity() ?? 0) / mouldDial(AppSettingKeys.mouldSandEffusivity, 850));
        const need = modulus > 0 ? (mouldDial(AppSettingKeys.mouldMisrunKcm, 15) * chill) / modulus : 0;
        const closed = this.isClosedCavity();
        if (closed && (shortPour || superheat < need)) {
          // A misrun: it froze before the cavity filled. The flaw is the
          // fact; `look` words it (review R2-D7), nothing is baked.
          // Its grade falls to poor by the flaw (`gradeAfterFaults`).
          cast.addFlaw('misrun', true, nowS);
        } else if (closed && !this.riser) {
          // Shrinkage: the last part to freeze had nothing to feed it.
          // A grade down, by the flaw (`gradeAfterFaults`).
          cast.addFlaw('shrinkage', true, nowS);
        }
      }
      if (MixinApi.isMadeFrom(cast)) {
        cast.recordMadeBy(pool.madeBy !== undefined ? pool.madeBy : (pool.payload?.contentsOwner ?? null));
      }

      if (!MixinApi.isContainable(cast)) return cast;
      const item = cast as Stuff & Containable;
      // ⭐ The runner and riser are cut off and go back in the pot — what
      // overfilled the cavity is never lost. Cut off AFTER the cast is
      // out: the cast is what the pour made, and it lands first (B104 made
      // the runner awaited, and it began to land ahead of the cast — `fit
      // pewter to sword` bound the runner, the finalize drive's run 3).
      if (this.reusable) {
        ContainmentApi.move(item, self);
        const worn = self as Stuff;
        if (MixinApi.isDurable(worn)) worn.wear(this.wearPerCast);
        if (runner && scope !== null) await this.mintRunner(material, runnerKg, scope);
        return cast;
      }
      // ⭐ A consumed mould is broken to release what set in it, and leaves
      // what it was made of (its sand to re-temper, its wax). Its place was
      // checked before the mint (`assertCanRelease`).
      const at = scope!;
      ContainmentApi.move(item, at);
      if (runner && scope !== null) await this.mintRunner(material, runnerKg, scope);
      if (this.breaksTo !== '') {
        const left = await StuffApi.clone<Stuff>(this.breaksTo);
        if (!MixinApi.isContainable(left)) {
          throw new TypeError(`Mould: '${this.breaksTo}' is not a thing that can be left behind`);
        }
        ContainmentApi.move(left as Stuff & Containable, at);
      }
      await StuffApi.destruct(self as Stuff);
      return cast;
    }

    /** The metal that overfilled a cavity, broken off as a lump beside it. */
    private async mintRunner(material: Material, kg: number, scope: Stuff & Container): Promise<void> {
      const lump = await StuffApi.clone<Stuff>(this.castOf(material));
      if (!(MixinApi.isTangible(lump) && MixinApi.isVisible(lump) && MixinApi.isPerceptible(lump) && MixinApi.isContainable(lump))) {
        throw new TypeError(`Mould: '${this.castOf(material)}' cannot hold a runner`);
      }
      lump.setMaterial(material);
      lump.setMass(Quantity.of(kg, 'kg'));
      lump.setShortDescription(`runner and riser of ${material.getName()}`);
      lump.setKeywords(['runner', 'riser', 'sprue', ...material.getName().split(/\s+/)]);
      ContainmentApi.move(lump as Stuff & Containable, scope);
    }
  };
}

/**
 * Carry what the pool KNEW onto the set thing, when the set thing can hold
 * it: who made it, what it was made from, how far it had spoiled, what it
 * was carrying, how wet it is now. ⚠ Food only by construction — an ingot
 * composes none of these and is told nothing.
 */
function carryPayload(cast: Stuff, pool: SetPool, mould: Stuff): void {
  const p = pool.payload;
  // ⭐⭐ The cast is the BATCH set solid (D3): its maker is the batch's (a
  // mould's own maker made the mould, not what set in it), and its grade
  // the lower of the batch's and the mould's — a fine pour into a poor
  // mould casts poor; being a Mould is the claim that passes it.
  if (MixinApi.isCrafted(cast)) {
    if (p?.maker) cast.setMaker(p.maker);
    if (p?.craftedAt !== undefined) cast.setCraftedAt(p.craftedAt);
  }
  if (MixinApi.isGraded(cast)) {
    const own = MixinApi.isGraded(mould) ? mould.getGrade() : null;
    const batch = p?.grade !== undefined && Grade.isBand(p.grade) ? Grade.of(p.grade) : null;
    const grade = own === null ? batch : batch === null ? own : own.min(batch);
    if (grade !== null) cast.setGrade(grade);
  }
  // ⭐ …and WHICH TRADE (repair D1): the mould row's fact, not the pourer's
  // — so a cast part is mended under the trade that cast it. On the one
  // cast record, beside the impression it was taken from (review R2-D6).
  const castBy = MixinApi.isMould(mould) ? mould.getMouldDiscipline() : '';
  if (castBy !== '' && MixinApi.isCrafted(cast)) {
    const from = cast.getCastFrom();
    cast.setCastFrom({
      kindPath: from?.kindPath ?? '',
      takenFromIdentity: from?.takenFromIdentity ?? '',
      takenAtS: from?.takenAtS ?? 0,
      discipline: castBy,
    });
  }
  if (p?.freshness && MixinApi.isFresh(cast)) {
    cast.setMicrobialLoad(p.freshness.load);
  }
  if (p?.pathogens && MixinApi.isContaminable(cast)) {
    cast.setPathogenLoads({ ...p.pathogens });
  }
  if (pool.moisture !== undefined && MixinApi.isMoist(cast)) {
    const solute = p?.water?.solute ?? 0;
    cast.setWaterState({ moisture: pool.moisture, solute });
  }
  // ⭐ What was dissolved in the pool sets into the cast (ceramics ruling
  // C): a green bottle remelted comes back green; a pig's carbon rides.
  if (p?.makeup && p.makeup.length > 0 && MixinApi.isComposition(cast)) {
    cast.setMakeup(p.makeup);
  }
  if (p?.madeFrom && MixinApi.isCrafted(cast)) cast.setMadeFrom(p.madeFrom);
}

/** Game-seconds now, or `null` when no world clock is running. */
function mouldNowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    return null;
  }
  return WorldClockApi.getNow().rawValue();
}
