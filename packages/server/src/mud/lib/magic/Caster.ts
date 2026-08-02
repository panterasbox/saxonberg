/**
 * Caster — the anatomical casting faculty carrier.
 *
 * Composed on `Character` (every PC and NPC), **gated**: the faculty is
 * active only when the actor's `Species` intrinsically confers it
 * (`innateMixins: ['CasterMixin']` — the `MakerMixin` augment-gating
 * precedent, innate leg). A species without the faculty carries the
 * methods inert — no reserve installs, no verbs afford, `cast` refuses.
 *
 * The faculty is bodily, not a flat stat:
 * - **mana** is a `Reserve` instance (`pt`, theme `'arcane'`) whose
 *   capacity derives from the species profile's **depth** band — never
 *   a forked mechanism, never a stored CON-style scalar.
 * - **recovery** is reconcile-on-read at the **serenity**-banded rate,
 *   scaled by the same rest inputs metabolism uses (posture base ×
 *   host `restQuality`), with the metabolism stamp guards (first-touch
 *   / linkdead freeze / far-past absence). No tick.
 * - **overchannel strain** (completing a cast past empty) is an
 *   authored Kind-A condition; recovery past the clear-threshold
 *   relieves it (the metabolism cascade's hysteresis-clear precedent).
 * - **composure** is read live — `f(band, manaFraction)` — so a
 *   drained mage resists the mental axis worse (see `Faculty`).
 *
 * Player surfaces speak **bands, never numbers** (`getFacultyView`).
 * The cast pipeline itself lives on `MagicLogic`; this mixin is the
 * body-side state + reads. See docs/subsystems/magic.md.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { Mixins } from '../mixin';
import { CommandApi } from '../../api/command';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { Quantity } from '../quantity';
import { Reserve, type Reserved } from '../reserve';
import { TemplatePaths, TemplatePathPrefixes } from '../paths';
import { METABOLIC_DEFAULTS } from '../metabolism/Metabolic';
import type { Stuff } from '../stuff/Stuff';
import type Species from '../species/Species';
import type { ActiveCondition } from '../vitals/Condition';
import { Faculty, type FacultyBand, type FacultyProfile } from './Faculty';

/**
 * The arcane pool's reserve key — **magic-internal plumbing** (this
 * mixin + `MagicLogic`'s spend leg + white-box tests). Everyone else
 * reads the pool via {@link Caster.getMana} / `getManaFraction()`,
 * which bundle the recovery reconcile a raw keyed read skips. See the
 * reserve landscape table in `lib/reserve.ts`.
 */
export const MANA_RESERVE_KEY = 'mana';

/** The overchannel-strain condition seed's templatePath. */
export const OVERCHANNEL_STRAIN_PATH =
  TemplatePathPrefixes.magicCondition + 'overchannel-strain';

/** The affording source for the dynamic `cast`/`spells` self-push. */
const SPELL_CATALOGUE_PATH = '/obj/SpellCatalogue';

/** The casting verb views the affordance push resolves. */
const CASTING_VERB_YAMLS = ['magic/cast.yaml', 'magic/spells.yaml'] as const;

/** The banded, numbers-free self-view (`spells` speaks this). */
export interface FacultyView {
  /** Species confers the faculty at all. */
  readonly capable: boolean;
  readonly depth: FacultyBand | null;
  readonly serenity: FacultyBand | null;
  readonly composure: FacultyBand;
  /** The pool, as prose-band only. */
  readonly mana: 'brimming' | 'steady' | 'ebbing' | 'spent' | null;
  readonly strained: boolean;
}

/** Faculty dials with seeded-literal fallbacks (pre-warm / test safe). */
const FACULTY_GUARDS = {
  /** Far-past absence guard (game-seconds) — the metabolism/thermal guard. */
  MAX_REASONABLE_GAP_SEC: 4 * 3600,
  OVERCHANNEL_CLEAR_THRESHOLD: 0.5,
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

/** The sibling surfaces the faculty reads (all composed under Character). */
interface CasterHost {
  getSpecies(): Species | null;
  getPosture(): string;
  getConditions(): readonly ActiveCondition[];
  relieve(condition: ActiveCondition): boolean;
}

export interface Caster {
  /** Does this actor's species confer the casting faculty? */
  isCastingCapable(): boolean;
  /** The species faculty profile (null = non-caster). */
  getCasterProfile(): FacultyProfile | null;
  /** Install the mana pool from the depth band (idempotent, capable-only). */
  installArcaneReserve(): void;
  /** Reconcile the `cast`/`spells` affordance push (pop + re-push iff
   * the faculty is active — the `refreshConferrals` mirror). */
  refreshCastingAffordance(): void;
  /** Reconcile-on-read: serenity-rate recovery + strain hysteresis-clear. */
  reconcileFaculty(): void;
  /**
   * The mana pool, freshly reconciled — the convenience reader that
   * spares callers the reserve key (the `Combustible.getFuelRemaining`
   * pattern: each substrate fronts its own reserve behind a domain
   * method; the raw keyed surface is this mixin's internal plumbing).
   * `null` for a non-caster (no pool ever installs).
   */
  getMana(): Reserve | null;
  /** current/capacity in [0,1]; 1 when no pool (non-caster neutral). */
  getManaFraction(): number;
  /** The live mental-resist substrate factor (works for non-casters). */
  getComposureFactor(): number;
  /** Is overchannel strain currently afflicting this body? */
  isOverchannelStrained(): boolean;
  /** The banded, numbers-free self-view. */
  getFacultyView(): FacultyView;
  /** Storage — public for the Hydrator. */
  facultyClockStamp: number;
}

export function CasterMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class CasterMixin extends Base implements Caster {
    static _mixinName = 'CasterMixin';
    /** Active only when conferred (Species.innateMixins / an augment). */
    static _augmentGated = true;

    static fieldMeta: FieldMeta = {
      facultyClockStamp: { persistent: true },
    };

    /** @runtimeState Last faculty reconcile, in-session game-seconds. */
    public facultyClockStamp = 0;

    private _reconcilingFaculty = false;

    public isCastingCapable(): boolean {
      return (
        this.getCasterProfile() !== null &&
        MixinApi.isActive(this as unknown as Stuff, Mixins.Caster)
      );
    }

    /**
     * Reconcile the casting affordance onto the giver's stack (the
     * `AdvancementMixin.refreshConferrals` mirror — the shipped
     * mechanism for per-instance SELF verbs; the `self` bucket's
     * static collection walks classes only, so a gated mixin cannot
     * afford selectively through `commandContributions`): pop the
     * prior entry unconditionally, re-push `cast`/`spells` iff the
     * faculty is active. The SpellCatalogue is the affording source
     * (attribution: "your gift"). Called from `Avatar.enter` — the
     * faculty is species-fixed in-session, so once per session
     * suffices; an augment-conferred faculty re-runs it via the same
     * call the next session.
     */
    public refreshCastingAffordance(): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isCommandGiver(self)) return;
      const catalogue = StuffApi.findByTemplatePath(SPELL_CATALOGUE_PATH);
      if (!catalogue) return;
      self.popCommandSource(catalogue);
      if (!this.isCastingCapable()) return;
      const defs = CASTING_VERB_YAMLS.map((f) => CommandApi.getCommand(f)).filter(
        (d): d is NonNullable<typeof d> => d != null,
      );
      if (defs.length > 0) {
        self.pushCommandSource(catalogue, 'self', defs);
      }
    }

    public getCasterProfile(): FacultyProfile | null {
      const host = this as unknown as CasterHost;
      return host.getSpecies()?.getFacultyProfile() ?? null;
    }

    public installArcaneReserve(): void {
      if (!this.isCastingCapable()) return;
      const reserved = this as unknown as Reserved;
      if (reserved.hasReserve(MANA_RESERVE_KEY)) return;
      const profile = this.getCasterProfile()!;
      const capacity = Faculty.capacityFor(profile.depth);
      reserved.setReserve(
        new Reserve(
          MANA_RESERVE_KEY,
          Quantity.of(capacity, 'pt'),
          Quantity.of(capacity, 'pt'),
          'arcane',
          'overchannel-strain',
        ),
      );
    }

    public reconcileFaculty(): void {
      if (this._reconcilingFaculty) return;
      if (!this.isCastingCapable()) return;
      this.installArcaneReserve();

      // In-session game-time; idle when no world clock runs (the
      // metabolism idiom — pre-boot / unit tests without a clock).
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return;
      }
      const nowS = WorldClockApi.getNow().rawValue();

      // First touch: seed the stamp, integrate nothing.
      if (this.facultyClockStamp === 0) {
        this.facultyClockStamp = nowS;
        return;
      }
      // Linkdead freeze: paused clock, re-stamp so the gap never lands.
      const self = this as unknown as Stuff;
      if (MixinApi.isHasInteractive(self) && self.isLinkdead()) {
        this.facultyClockStamp = nowS;
        return;
      }
      const elapsed = nowS - this.facultyClockStamp;
      if (elapsed <= 0) {
        this.facultyClockStamp = nowS;
        return;
      }
      // Far-past guard: absence, drop the gap.
      if (elapsed > FACULTY_GUARDS.MAX_REASONABLE_GAP_SEC) {
        this.facultyClockStamp = nowS;
        return;
      }

      this._reconcilingFaculty = true;
      try {
        this.recoverMana(elapsed);
        this.clearStrainOnRecovery();
        this.facultyClockStamp = nowS;
      } finally {
        this._reconcilingFaculty = false;
      }
    }

    /** Serenity-rate refill, scaled by the same rest inputs metabolism uses. */
    protected recoverMana(elapsedSec: number): void {
      const reserved = this as unknown as Reserved;
      const pool = reserved.getReserve(MANA_RESERVE_KEY);
      if (!pool) return;
      const room = pool.capacity.rawValue() - pool.current.rawValue();
      if (room <= 0) return;

      const host = this as unknown as CasterHost;
      const profile = this.getCasterProfile()!;
      const postureBase =
        METABOLIC_DEFAULTS.POSTURE_BASE[host.getPosture()] ??
        METABOLIC_DEFAULTS.POSTURE_BASE.stand!;
      if (postureBase <= 0) return;
      const restQuality = (
        this as unknown as { currentRestQuality(): number }
      ).currentRestQuality();

      const gain = Math.min(
        room,
        Faculty.recoveryPerMinFor(profile.serenity) *
          (elapsedSec / 60) *
          postureBase *
          restQuality,
      );
      if (gain <= 0) return;
      reserved.adjustReserve(MANA_RESERVE_KEY, Quantity.of(gain, 'pt'));
    }

    /** Hysteresis-clear: recovery past the threshold relieves the strain. */
    protected clearStrainOnRecovery(): void {
      const threshold = dial(
        AppSettingKeys.magicOverchannelClearThreshold,
        FACULTY_GUARDS.OVERCHANNEL_CLEAR_THRESHOLD,
      );
      if (this.rawManaFraction() < threshold) return;
      const host = this as unknown as CasterHost;
      for (const c of [...host.getConditions()]) {
        if (
          c.kind === 'affliction' &&
          c.templatePath === OVERCHANNEL_STRAIN_PATH
        ) {
          host.relieve(c);
        }
      }
    }

    /** The fraction without triggering a reconcile (internal reads). */
    protected rawManaFraction(): number {
      const pool = (this as unknown as Reserved).getReserve(MANA_RESERVE_KEY);
      if (!pool) return 1;
      const cap = pool.capacity.rawValue();
      return cap > 0 ? pool.current.rawValue() / cap : 1;
    }

    public getMana(): Reserve | null {
      this.reconcileFaculty();
      return (
        (this as unknown as Reserved).getReserve(MANA_RESERVE_KEY) ?? null
      );
    }

    public getManaFraction(): number {
      this.reconcileFaculty();
      return this.rawManaFraction();
    }

    public getComposureFactor(): number {
      const profile = this.getCasterProfile();
      const band = profile?.composure ?? Faculty.defaultComposureBand();
      return Faculty.composureFactor(band, this.getManaFraction());
    }

    public isOverchannelStrained(): boolean {
      const host = this as unknown as CasterHost;
      return host
        .getConditions()
        .some(
          (c) =>
            c.kind === 'affliction' &&
            c.templatePath === OVERCHANNEL_STRAIN_PATH,
        );
    }

    public getFacultyView(): FacultyView {
      const profile = this.getCasterProfile();
      const capable = this.isCastingCapable();
      let mana: FacultyView['mana'] = null;
      if (capable) {
        const f = this.getManaFraction();
        mana =
          f >= 0.85 ? 'brimming' : f >= 0.4 ? 'steady' : f > 0.05 ? 'ebbing' : 'spent';
      }
      return {
        capable,
        depth: profile?.depth ?? null,
        serenity: profile?.serenity ?? null,
        composure: profile?.composure ?? Faculty.defaultComposureBand(),
        mana,
        strained: this.isOverchannelStrained(),
      };
    }
  };
}
