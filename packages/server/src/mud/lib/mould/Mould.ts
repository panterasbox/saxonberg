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
 *   - **curing** — `Material.cureSetting`: plaster slurry takes up its
 *     water and is hard in a quarter-hour, no act;
 *   - **release at once** — a plastic charge with green strength (tempered
 *     clay) pressed into a `pressKind: press` mould takes its shape and
 *     leaves it ({@link Mould.pressRelease}).
 *
 * ⭐ **The envelope** (S12): the mould's conductivity chills a metal (cast
 * iron sets white in iron, grey in sand — `Material.chillsTo`); its
 * wetness blows a hot pour; its melting or ignition point decides whether
 * it survives the pour at all (`TangibleMixin.canReceiveAtK`, asked by the
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
import { ContainmentApi } from '../../api/containment';
import { WorldClockApi } from '../../api/worldclock';
import { AppApi } from '../../api/app';
import { MessageApi } from '../../api/message';
import { ConditionApi } from '../../api/condition';
import type { CommandContributions } from '../../api/command';
import { Mml } from '../../api/mml';
import type { MarkupAugmenter } from '../../api/mml';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type Material from '../material/Material';
import type { BulkPayload } from '../bulk/Bulkable';
import { WEAR_PER_USE } from '../material/Durable';
import { Quantity } from '../quantity';
import { TemplatePaths } from '../paths';
import { AppSettingKeys } from '../config/AppSettings';
import { Grade } from '../craft/Grade';
import { Impression } from './Impression';
import type { ImpressionData } from './Impression';
import type { ImpressOutcome } from '../craft/Impressible';
import type { CarvePlan, CarveRefusal, CarveRequest } from '../craft/Carvable';

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

/**
 * ⭐ A cast that can remember what it was made from (a wheel says *a ewe's
 * milk cheese*). Duck-probed on the clone, so nothing composes a marker
 * and a lump of copper simply does not answer.
 */
export interface MadeFromHolding {
  getMadeFrom(): string;
  setMadeFrom(materialPath: string): void;
}

/** Public shape contributed by MouldMixin. */
export interface Mould {
  /** The template a set pool of `material` becomes in this mould. */
  castTemplateFor(material: Material): string;
  /**
   * Mint the set thing from a pool and keep it — the one cast path every
   * set process shares. Asynchronous (a clone); the pool has already
   * been cleared by the caller.
   */
  castInto(pool: SetPool): Promise<Stuff | null>;
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
   * ⭐ Shape-and-release (ceramics S16): a plastic charge in a `press`
   * mould whose load beats its stiffness takes the shape and leaves the
   * mould at once. Returns the released piece, or `null`.
   */
  pressRelease(): Promise<Stuff | null>;
}

/** Seconds per game day — the unit a drain set's `days` is authored in. */
const SECONDS_PER_GAME_DAY = 86_400;
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
    const riser = (host as unknown as { hasRiser(): boolean }).hasRiser();
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

/** √(kρc) of a material, J/(m²·K·s^½) — how fast a mould draws heat. */
function effusivityOf(m: Material | null): number {
  if (m === null) return 0;
  const k = m.getThermalConductivity().rawValue();
  const rho = m.getDensity().rawValue();
  const c = m.getSpecificHeat().rawValue();
  return k > 0 && rho > 0 && c > 0 ? Math.sqrt(k * rho * c) : 0;
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

/**
 * What a mould affords: a pattern can be pressed into it, and a riser cut
 * in it.
 */
const IMPRESSING = ['platform/cmd/crafting/impress.yaml', 'platform/cmd/crafting/carve.yaml'];

export function MouldMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class MouldMixin extends Base implements Mould {
    static _mixinName: string = 'MouldMixin';

    static markupAugmenters: MarkupAugmenter[] = [mouldAugmenter];

    /**
     * ⭐ A soft medium affords `impress` (ceramics D21): a sand flask on the
     * floor, a wax block in your hand. A mould cut to its own shape answers
     * the verb with its own refusal.
     */
    static commandContributions: CommandContributions = {
      self: [],
      environment: IMPRESSING,
      peers: IMPRESSING,
    };

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

    /** Reentry guard (TS-private; proxy-safe — never `#`). */
    private _settingGuard = false;
    /** A blow not yet thrown at its pourer (the pour verb reports it). */
    private _blowPending = false;

    getCastTemplate(): string {
      return this.castTemplate;
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
      if (this.impression === null) return null;
      try {
        return new Impression(this.impression);
      } catch {
        return null;
      }
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

    public castTemplateFor(material: Material): string {
      const self = this as unknown as Stuff;
      // ⭐ A cracked mould casts a lump — the shape is the mould's only
      // while the mould is whole.
      if (MixinApi.isDurable(self) && self.isBroken()) {
        return material.getCastTemplate();
      }
      return this.castTemplate || material.getCastTemplate();
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
      for (const c of this.getContents()) {
        const path = (c as Stuff).getTemplatePath();
        if (path === null) continue;
        if (this.castTemplate !== '' && path === this.castTemplate) return true;
        if (kind !== '' && path === kind) return true;
        const s = c as Stuff;
        if (MixinApi.isTangible(s) && s.getCastFrom() !== null) return true;
        const m = MixinApi.isTangible(s) ? (s.getMaterial() ?? null) : null;
        if (m !== null && m.getCastTemplate() === path) return true;
      }
      return false;
    }

    public loadN(): number {
      const self = this as unknown as Stuff;
      let n = 0;
      if (MixinApi.isPlacing(self)) {
        for (const item of self.getPlaced('on')) {
          if (MixinApi.isTangible(item)) n += item.getMass().rawValue() * G;
        }
      }
      // ⭐ The screw press it stands in (ceramics D25) — a duck on the host
      // of its placement, so any press a pack ships loads it the same way.
      if (MixinApi.isContainable(self)) {
        const host = self.getPlacement()?.host as unknown as { pressForceN?(): number } | undefined;
        if (host && typeof host.pressForceN === 'function') n += Math.max(0, host.pressForceN());
      }
      return n;
    }

    public setState(): 'filled' | 'setting' | 'set' | null {
      this.reconcileSetting();
      const self = this as unknown as Stuff;
      const pooled =
        MixinApi.isBulkable(self) && self.getBulkAmount('interior').rawValue() > 0;
      if (pooled) {
        const mat = self.getBulkMaterial('interior');
        const sets = (mat?.getDrainSetting() ?? null) !== null || (mat?.getCureSetting() ?? null) !== null;
        return sets && this.setProgress > 0 ? 'setting' : 'filled';
      }
      return this.holdsCast() ? 'set' : null;
    }

    /**
     * ⭐ The set site's reads drive the set: `look`, `get … from`, every
     * walk over the contents. A drain or cure set is integrated here; a
     * freeze is the thermal reconcile's, which a temperature read drives.
     */
    public getContents(): readonly (Stuff & Containable)[] {
      this.reconcileSetting();
      return super.getContents();
    }

    /**
     * Integrate a drain or cure set to now, and let a temperature read
     * drive the freeze.
     *
     * @samples the drain and cure sets read NO temperature — they integrate
     * progress over game-time (a drain by the load on the mould, an
     * absorbed drain by the mould's own dryness); the one temperature read
     * here exists to run the thermal reconcile, which folds its own
     * trajectory and freezes a pool below its melting point.
     */
    public reconcileSetting(): void {
      if (this._settingGuard) return;
      const self = this as unknown as Stuff;
      if (!MixinApi.isBulkable(self)) return;
      this._settingGuard = true;
      try {
        // A temperature read runs the thermal reconcile, which is what
        // freezes a pool below its melting point (and casts INTO this).
        if (MixinApi.isThermal(self)) self.getTemperature();

        const amountL = self.getBulkAmount('interior').rawValue();
        const material = self.getBulkMaterial('interior');
        const drain = material?.getDrainSetting() ?? null;
        const cure = material?.getCureSetting() ?? null;
        if (!(amountL > 0) || material === null || (drain === null && cure === null)) {
          this.setProgress = 0;
          this.setStamp = 0;
          this.setPressed = 0;
          return;
        }
        // ⭐ An absorbed drain (slip) sets only where something drinks it.
        if (drain !== null && drain.absorbedByMould === true && !this.absorbent) {
          this.setProgress = 0;
          this.setStamp = 0;
          return;
        }
        const nowS = mouldNowSeconds();
        if (nowS === null) return;
        if (this.setStamp === 0) {
          this.setStamp = nowS;
          return;
        }
        const elapsed = nowS - this.setStamp;
        this.setStamp = nowS;
        if (!(elapsed > 0)) return;
        const poolKg = (amountL / 1000) * material.getDensity().rawValue();

        if (drain === null && cure !== null) {
          // ⭐ The cure: a chemical set, no act and no load.
          this.setProgress = Math.min(1, this.setProgress + elapsed / (cure.minutes * 60));
          if (this.setProgress < 1 - 1e-9) return;
          const becomes = cure.becomes
            ? StuffApi.findByTemplatePath<Material>(cure.becomes) ?? material
            : material;
          const payload = self.getBulkPayload('interior');
          this.clearPool(self);
          void this.castInto({ material: becomes, massKg: poolKg, payload, stampMaterial: true });
          return;
        }
        if (drain === null) return;

        const absorbed = drain.absorbedByMould === true;
        const wetness = MixinApi.isWet(self) ? self.getWetness() : 0;
        // ⭐ The load ratio, uncapped: a screw press can drive it far past
        // the reference load a stone reaches.
        const ratio = absorbed
          ? 0
          : poolKg > 0
            ? this.loadN() / (poolKg * G * drain.loadRef)
            : 0;
        // A wet plaster mould drinks slower; the load can at most double the
        // pace (a stone's reach), whatever presses it.
        const rate = absorbed
          ? Math.max(0, 1 - wetness) / drain.days
          : (1 + Math.min(1, ratio)) / drain.days; // progress per game-day
        const step = Math.min(
          1 - this.setProgress,
          rate * (elapsed / SECONDS_PER_GAME_DAY),
        );
        this.setPressed += ratio * step;
        this.setProgress += step;
        if (this.setProgress < 1 - 1e-9) return;

        // ⭐ Set. The water the press drove out is gone; what is left is
        // the cheese, at the moisture the load left it.
        const pressed = this.setPressed; // average ratio over the set
        const moisture =
          pressed <= 1
            ? drain.moisture.unloaded +
              (drain.moisture.loaded - drain.moisture.unloaded) * pressed
            : // ⭐ Past the reference load the cheese keeps firming, by a
              // power law: a screw press makes it firmer than a stone.
              drain.moisture.loaded *
              Math.pow(pressed, -mouldDial(AppSettingKeys.mouldOverpressExponent, 0.15));
        const waterFraction =
          (material.getNutrientAmounts()['water'] ?? 0) / 1e6 ||
          material.getComposition().find((e) => e.materialPath.endsWith('/water'))?.fraction ||
          0;
        const massKg = poolKg * (1 - (1 - moisture) * waterFraction);
        // ⭐ The water an absorbent mould drank is in its OWN wetness now —
        // the next cast in it sets slower until it dries.
        if (absorbed && MixinApi.isWet(self)) {
          const cap = self.waterCapacityKg();
          if (cap > 0) self.wet(Math.min(1 - wetness, (poolKg - massKg) / cap));
        }
        const becomes = drain.becomes
          ? StuffApi.findByTemplatePath<Material>(drain.becomes) ?? material
          : material;
        const payload = self.getBulkPayload('interior');
        this.clearPool(self);
        void this.castInto({
          material: becomes,
          massKg,
          payload,
          moisture,
          stampMaterial: true,
        });
      } finally {
        this._settingGuard = false;
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
    }

    public receivedPour(pour: ReceivedPour): void {
      const self = this as unknown as Stuff;
      const mp = pour.material.getMeltingPoint().rawValue();
      // ⭐ A drain or a cure starts its clock at the POUR — not at whoever
      // happens to look first (a slip poured and left for three hours has
      // been setting for three hours).
      if (
        this.setStamp === 0 &&
        (pour.material.getDrainSetting() !== null || pour.material.getCureSetting() !== null)
      ) {
        this.setStamp = mouldNowSeconds() ?? 0;
      }
      // ⭐ An absorbent mould DRINKS plain water (a sand flask watered, a
      // dry plaster mould): it goes into the mould's own wetness, and a
      // mould wetter than the dial blows under the next hot pour.
      if (
        this.absorbent &&
        pour.material.hasTag('liquid') &&
        pour.material.getDrainSetting() === null &&
        pour.material.getCureSetting() === null &&
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
          energy: mouldDial(AppSettingKeys.mouldBlowBurnJ, 40),
        });
      }
    }

    /**
     * ⭐ Press a pattern into the cavity (ceramics D21): a soft medium takes
     * an {@link Impression} of the whole shape — a sand flask rammed round
     * it, a wax block, a plaster case whose slurry has not yet cured. The
     * medium answers; the verb is dumb.
     */
    public async takeImpression(pattern: Stuff, _actor: Stuff): Promise<ImpressOutcome> {
      const self = this as unknown as Stuff;
      if (!this.impressible) {
        return {
          ok: false,
          reason: 'not-impressible',
          line: Mml.compose`${Mml.thing(self)} is cut to its own shape. Nothing presses into it.`,
        };
      }
      if (this.impression !== null) {
        const held = this.getImpression();
        return {
          ok: false,
          reason: 'already-impressed',
          line: Mml.compose`${Mml.thing(self)} already holds the impression of ${held?.getFormDescription() ?? 'something'}.`,
        };
      }
      const pooled = MixinApi.isBulkable(self) && self.getBulkAmount('interior').rawValue() > 0;
      const curing = pooled && MixinApi.isBulkable(self) && (self.getBulkMaterial('interior')?.getCureSetting() ?? null) !== null;
      if ((pooled && !curing) || this.holdsCast()) {
        return {
          ok: false,
          reason: 'occupied',
          line: Mml.compose`${Mml.thing(self)} is full. Empty it first.`,
        };
      }
      const shape = MixinApi.isTangible(pattern) ? pattern.leaveImpression(mouldNowSeconds() ?? 0) : null;
      const imp = shape !== null ? new Impression(shape) : null;
      if (imp === null) {
        return {
          ok: false,
          reason: 'no-shape',
          line: Mml.compose`${Mml.thing(pattern)} leaves no shape a mould could hold.`,
        };
      }
      const cap = MixinApi.isBulkable(self) ? (self.getBulkCapacity('interior')?.rawValue() ?? 0) : 0;
      if (cap > 0 && imp.getVolumeL() > cap) {
        return {
          ok: false,
          reason: 'too-big',
          line: Mml.compose`${Mml.thing(pattern)} is too big for ${Mml.thing(self)}.`,
        };
      }
      // ⭐ Draft (S15): a shape with something standing out of it will not
      // draw out of a one-piece rigid mould — only one broken to release it,
      // or one of two halves.
      if (imp.hasUndercut() && this.reusable && !this.isTwoPiece()) {
        return {
          ok: false,
          reason: 'undercut',
          line: Mml.compose`${Mml.thing(pattern)} would not draw out of ${Mml.thing(self)} — something stands out of it. A mould of two halves would take it, or a sand mould you break.`,
        };
      }
      this.impression = imp.toData();
      this.riser = false;
      // Rammed green sand is damp — damp enough to hold the shape.
      if (this.absorbent && MixinApi.isWet(self)) {
        const want = mouldDial(AppSettingKeys.mouldRammedWetness, 0.15);
        const now = self.getWetness();
        if (want > now) self.wet(want - now);
      }
      return {
        ok: true,
        line: Mml.compose`You press ${Mml.thing(pattern)} into ${Mml.thing(self)} and draw it out clean. It holds the shape of ${imp.getFormDescription()} now.`,
      };
    }

    /**
     * ⭐ `carve riser on <flask>` (ceramics S14): cut a riser and a runner
     * into a rammed mould, so the last metal to freeze is fed and the cast
     * comes out sound. Any edge does it.
     */
    public async carvePlan(req: CarveRequest): Promise<CarvePlan | CarveRefusal> {
      const self = this as unknown as Stuff;
      const word = req.word.trim().toLowerCase();
      if (word !== 'riser' && word !== 'runner' && word !== 'gate') {
        return {
          ok: false,
          reason: 'not-carvable',
          line: Mml.compose`The only thing to cut in ${Mml.thing(self)} is a riser.`,
        };
      }
      if (!this.impressible || this.impression === null) {
        return {
          ok: false,
          reason: 'no-cavity',
          line: Mml.compose`There is no cavity in ${Mml.thing(self)} to feed — press a pattern into it first.`,
        };
      }
      if (this.riser) {
        return { ok: false, reason: 'has-riser', line: Mml.compose`${Mml.thing(self)} has a riser already.` };
      }
      const knife = req.knife;
      if (knife === null || !MixinApi.isTool(knife) || !knife.hasCapability(CUTTING)) {
        return {
          ok: false,
          reason: 'no-edge',
          line: Mml.compose`You need an edge to cut a riser — any knife will do.`,
        };
      }
      const actor = req.actor;
      return {
        ok: true,
        durationMs: 2 * 60 * 1000,
        effortW: 80,
        beginSelf: Mml.compose`You cut a channel down into ${Mml.thing(self)} and hollow a riser above the cavity.`,
        beginPeers: Mml.compose`${Mml.actor(actor)} cuts into ${Mml.thing(self)}.`,
        onComplete: () => {
          if (self.isDestroyed()) return;
          this.riser = true;
          if (!actor.isDestroyed()) {
            MessageApi.scene(actor)
              .topic('act.deed')
              .toSelf(Mml.compose`${Mml.thing(self)} has a riser now: the last of the metal will have somewhere to feed from.`)
              .send();
          }
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
        if (!MixinApi.isWaterActive(charge)) continue;
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
          ? { alloying: charge.getEffectiveComposition().map((e) => ({ ...e })) }
          : null;
        const maker = MixinApi.isCrafted(charge) ? charge.getMaker() : '';
        if (payload && maker) payload.maker = maker;
        const leftKg = totalKg - massKg;
        if (leftKg > 1e-6) {
          charge.setMass(Quantity.of(leftKg / units, 'kg'));
        } else {
          await StuffApi.destruct(charge);
        }
        const cast = await this.castInto({ material, massKg, payload, moisture, stampMaterial: true });
        if (cast === null) return null;
        // ⭐ Shape-and-release: green strength holds the shape, so it leaves
        // the mould at once and sets outside it.
        const scope = MixinApi.isContainable(self) ? self.getContainer() : null;
        if (scope !== null && MixinApi.isContainer(scope) && MixinApi.isContainable(cast)) {
          ContainmentApi.move(cast as Stuff & Containable, scope as Stuff & Container);
        }
        return cast;
      }
      return null;
    }

    public async castInto(pool: SetPool): Promise<Stuff | null> {
      const self = this as unknown as Stuff & Container;
      const metal = pool.material.hasTag('metal');
      const imp = this.getImpression();
      const blown = this.blown;
      const superheat = this.pourSuperheatK;
      this.blown = false;
      this.pourSuperheatK = 0;
      // ⭐ The chill (S12): a conducting mould sets a chilling metal hard.
      let material = pool.material;
      if (metal && !blown) {
        const ownMaterial = MixinApi.isTangible(self) ? self.getMaterial() : null;
        const k = ownMaterial?.getThermalConductivity().rawValue() ?? 0;
        const chilled = material.chilledIn(k);
        if (chilled) material = StuffApi.findByTemplatePath<Material>(chilled) ?? material;
      }
      const fromImpression = !blown && imp !== null && this.castTemplate === '';
      const template = blown
        ? material.getCastTemplate()
        : fromImpression
          ? imp!.getKindPath()
          : this.castTemplateFor(material);
      let cast: Stuff;
      try {
        cast = await StuffApi.clone(template);
      } catch {
        return null; // an unresolvable shape must not crash a reconcile
      }
      const c = cast as Stuff & {
        getMaterial?(): Material | null;
        setMaterial?(m: Material): void;
        setMass?(q: Quantity<'kg'>): void;
        getShortDescription?(): string;
        setShortDescription?(s: string): void;
        getLongDescription?(): string;
        setLongDescription?(s: string): void;
        getKeywords?(): readonly string[];
        setKeywords?(k: string[]): void;
        getLength?(): number;
      };
      const authored = typeof c.getMaterial === 'function' ? c.getMaterial() : null;
      if ((pool.stampMaterial === true || fromImpression || blown || material !== pool.material) && typeof c.setMaterial === 'function') {
        c.setMaterial(material);
        if (blown) {
          c.setShortDescription?.(`blown lump of ${material.getName()}`);
          c.setKeywords?.(['lump', 'blown', ...material.getName().split(/\s+/)]);
          c.setLongDescription?.(
            `A ragged lump of ${material.getName()}, honeycombed with steam holes where a damp mould blew under it.`,
          );
        }
      } else if (!authored && typeof c.setMaterial === 'function') {
        c.setMaterial(material);
        // The material's own fallback shape is a generic lump with no prose
        // of its own; a mould's shape is a row that authored its prose.
        if (template === material.getCastTemplate()) {
          c.setShortDescription?.(`cast lump of ${material.getName()}`);
          c.setKeywords?.(['lump', 'cast', ...material.getName().split(/\s+/)]);
        }
      }

      let massKg = pool.massKg;
      let runnerKg = 0;
      let shortPour = false;
      if (fromImpression && imp !== null) {
        // ⭐ The cast shrinks as it cools by its metal's own shrink; a
        // pattern carved oversize for that metal casts true (D23).
        const s = material.castShrinkage();
        const density = material.getDensity().rawValue();
        const cavityKg = (imp.getVolumeL() / 1000) * density;
        const castKg = cavityKg / Math.pow(1 + s, 3);
        if (pool.massKg < cavityKg * 0.98) {
          shortPour = true;
          massKg = Math.min(pool.massKg, castKg);
        } else {
          massKg = castKg;
          // A metal's overfill sets in the runner and riser; a slip's is
          // simply poured back off.
          runnerKg = metal ? Math.max(0, pool.massKg - castKg) : 0;
        }
        if (MixinApi.isAssembled(cast)) cast.setBill(null); // one piece
        if (MixinApi.isTangible(cast)) {
          cast.setCastFrom({
            kindPath: imp.getKindPath(),
            takenFromIdentity: imp.getTakenFromIdentity(),
            takenAtS: imp.getTakenAtS(),
          });
        }
        const kind = (c.getShortDescription?.() ?? '').trim() || 'thing';
        c.setShortDescription?.(`${material.getName()} cast of ${article(kind)} ${kind}`);
        const kw = new Set(c.getKeywords?.() ?? []);
        kw.add('cast');
        for (const w of material.getName().split(/\s+/)) kw.add(w);
        c.setKeywords?.([...kw]);
        const whose = nameOf(imp.getTakenFromIdentity()) ?? (imp.getTakenFromName() || null);
        const truth = Math.abs(s - imp.getAllowance());
        const sizeLine =
          truth <= 0.003
            ? ''
            : imp.getAllowance() > s
              ? ' It came out a shade larger than the thing itself.'
              : ' It came out a shade smaller than what it was taken from: the metal shrank as it cooled.';
        c.setLongDescription?.(
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
      c.setMass?.(Quantity.of(massKg, 'kg'));
      carryPayload(cast, pool, self);
      // A mould that casts a mould (a plaster case → the plaster mould)
      // hands it the cavity.
      if (!fromImpression && imp !== null && MixinApi.isMould(cast)) {
        cast.setImpression(imp.toData());
        this.impression = null;
      }

      // ⭐⭐ Chvorinov (S14) — a metal pour, judged by the physics of it.
      if (metal && !blown && MixinApi.isTangible(cast)) {
        const density = material.getDensity().rawValue();
        const volumeM3 = density > 0 ? massKg / density : 0;
        const lengthM = typeof c.getLength === 'function' ? Number(c.getLength()) || 0 : 0;
        const modulus = modulusCm(volumeM3, lengthM);
        const mouldMat = MixinApi.isTangible(self) ? self.getMaterial() : null;
        const chill = Math.max(0.2, effusivityOf(mouldMat) / mouldDial(AppSettingKeys.mouldSandEffusivity, 850));
        const need = modulus > 0 ? (mouldDial(AppSettingKeys.mouldMisrunKcm, 15) * chill) / modulus : 0;
        const nowS = mouldNowSeconds() ?? 0;
        const closed = this.isClosedCavity();
        if (closed && (shortPour || superheat < need)) {
          // A misrun: it froze before the cavity filled.
          cast.addFlaw('casting', true, nowS);
          if (MixinApi.isGraded(cast)) cast.setGrade(Grade.of('poor'));
          c.setShortDescription?.(`misrun ${c.getShortDescription?.() ?? ''}`.trim());
          c.setLongDescription?.(
            `${c.getLongDescription?.() ?? ''} It froze before the mould was full: the thin parts are ragged and short, and an edge runs out into nothing.`.trim(),
          );
        } else if (closed && !this.riser) {
          // Shrinkage: the last part to freeze had nothing to feed it.
          cast.addFlaw('casting', true, nowS);
          if (MixinApi.isGraded(cast)) {
            cast.setGrade(Grade.fromOrdinal(cast.getGrade().getOrdinal() - 1));
          }
          c.setLongDescription?.(
            `${c.getLongDescription?.() ?? ''} Where it froze last it is porous, pitted with little shrinkage holes — the metal drew in and nothing fed it.`.trim(),
          );
        }
      }
      if (blown && MixinApi.isGraded(cast)) cast.setGrade(Grade.of('poor'));

      if (!MixinApi.isContainable(cast)) return cast;
      const item = cast as Stuff & Containable;
      const scope = MixinApi.isContainable(self as Stuff)
        ? (self as unknown as Containable).getContainer()
        : null;
      // ⭐ The runner and riser are cut off and go back in the pot — what
      // overfilled the cavity is never lost.
      if (runnerKg > massKg * 0.02 && scope !== null && MixinApi.isContainer(scope as Stuff)) {
        void this.mintRunner(material, runnerKg, scope as unknown as Stuff & Container);
      }
      if (this.reusable) {
        ContainmentApi.move(item, self);
        if (MixinApi.isDurable(self as Stuff)) {
          (self as unknown as { wear(n: number): void }).wear(this.wearPerCast);
        }
        return cast;
      }
      // ⭐ A consumed mould is broken to release what set in it, and leaves
      // what it was made of (its sand to re-temper, its wax).
      if (scope !== null && MixinApi.isContainer(scope as Stuff)) {
        ContainmentApi.move(item, scope as unknown as Stuff & Container);
        if (this.breaksTo !== '') {
          try {
            const left = await StuffApi.clone<Stuff>(this.breaksTo);
            if (MixinApi.isContainable(left)) {
              ContainmentApi.move(left as Stuff & Containable, scope as unknown as Stuff & Container);
            }
          } catch (err) {
            console.warn(`Mould: cannot leave '${this.breaksTo}' behind:`, err);
          }
        }
      }
      StuffApi.destruct(self as Stuff);
      return cast;
    }

    /** The metal that overfilled a cavity, broken off as a lump beside it. */
    private async mintRunner(material: Material, kg: number, scope: Stuff & Container): Promise<void> {
      try {
        const lump = await StuffApi.clone<Stuff>(material.getCastTemplate());
        const l = lump as Stuff & {
          setMaterial?(m: Material): void;
          setMass?(q: Quantity<'kg'>): void;
          setShortDescription?(s: string): void;
          setKeywords?(k: string[]): void;
        };
        l.setMaterial?.(material);
        l.setMass?.(Quantity.of(kg, 'kg'));
        l.setShortDescription?.(`runner and riser of ${material.getName()}`);
        l.setKeywords?.(['runner', 'riser', 'sprue', ...material.getName().split(/\s+/)]);
        if (MixinApi.isContainable(lump)) ContainmentApi.move(lump as Stuff & Containable, scope);
      } catch (err) {
        console.warn('Mould: the runner could not be broken off:', err);
      }
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
  if (MixinApi.isCrafted(cast)) {
    const mouldMaker = MixinApi.isCrafted(mould) ? mould.getMaker() : '';
    const maker = p?.maker || mouldMaker;
    if (maker) cast.setMaker(maker);
    if (MixinApi.isGraded(mould)) cast.setGrade(mould.getGrade());
    // ⭐ …and WHICH TRADE (repair D1): the mould row's fact, not the
    // pourer's — so a cast part is mended under the trade that cast it.
    cast.setCastDiscipline(MixinApi.isMould(mould) ? mould.getMouldDiscipline() : '');
  }
  if (p?.freshness && MixinApi.isFresh(cast)) {
    cast.setMicrobialLoad(p.freshness.load);
  }
  if (p?.pathogens && MixinApi.isContaminable(cast)) {
    cast.setPathogenLoads({ ...p.pathogens });
  }
  if (pool.moisture !== undefined && MixinApi.isWaterActive(cast)) {
    const solute = p?.water?.solute ?? 0;
    cast.setWaterState({ moisture: pool.moisture, solute });
  }
  // ⭐ What was dissolved in the pool sets into the cast (ceramics ruling
  // C): a green bottle remelted comes back green; a pig's carbon rides.
  if (p?.alloying && p.alloying.length > 0 && MixinApi.isComposition(cast)) {
    cast.setAlloying(p.alloying);
  }
  if (p?.madeFrom) {
    const probe = cast as unknown as Partial<MadeFromHolding>;
    if (typeof probe.setMadeFrom === 'function') probe.setMadeFrom(p.madeFrom);
  }
}

/** Game-seconds now, or `null` when no world clock is running. */
function mouldNowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    return null;
  }
  return WorldClockApi.getNow().rawValue();
}
