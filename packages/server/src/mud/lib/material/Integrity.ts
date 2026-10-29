/**
 * IntegrityMixin — ⭐⭐ how WHOLE an article is: the one damage record
 * (ceramics review R2-D1, homed 2026-10-29).
 *
 * A body's flaws — a crack, a dunt from a shock of heat, the checks of
 * too-fast drying, a casting's misrun or shrinkage — visible or hidden; how
 * whole that leaves it (`getIntegrity`, which a durable good's condition
 * multiplies its wear by); how hard a blow must be to crack or break it
 * (`impactStrengthJ`, `impactVerdict`, `sufferImpact`); how it sounds when
 * tapped (`ringSound`, which hears a hidden crack); and what a fault in the
 * making does to its grade (`gradeAfterFaults`, a ceiling).
 *
 * ## What this mixin IS for
 *
 * The ARTICLES: things you can drop, throw, tap and crack. Composed on
 * `Good` and `Vessel`, beside `ChattelMixin` and `ConcealableMixin` — the
 * shipped pair for "an article". A jug, a brick, a bell, an ingot, a
 * crucible, a mould, a length of timber.
 *
 * ## What this mixin is NOT for
 *
 * - **Every body of matter.** It was on `TangibleMixin` for a while, so
 *   walls, floors, fixtures and every creature claimed flaws and a ring.
 *   A person's damage is harm's wounds (`ConditionApi.inflict`); a wall's
 *   and a floor's is construction's layer wear. Matter in general keeps
 *   what is true of all matter on `Tangible`: its material, its mass, its
 *   ignition point, the shape it leaves pressed into clay, and `throw`.
 * - **Wear by use.** That is `DurableMixin`'s gauge; condition is wear ×
 *   this mixin's integrity.
 * - **A pour's survival.** Whether a receiver melts or burns under a hot
 *   pour is the receiving vessel's (`BulkableMixin.canReceiveAtK`).
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import type { MarkupAugmenter } from '../../api/mml';
import type { AudibleEmitOptions } from '../perception/Audible';
import type { Tangible } from './Tangible';
import type Material from './Material';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { DetachedError } from '../errors';
import { AppApi } from '../../api/app';
import { WorldClockApi } from '../../api/worldclock';
import { AppSettingKeys } from '../config/AppSettings';
import { Grade } from '../craft/Grade';

/**
 * A body's flaw kinds. ⭐ A casting's two faults are kinds of their own
 * (review R2-D7) so the flaw IS the fact and its words derive from it: a
 * `misrun` froze before the cavity filled; `shrinkage` is the porous place
 * that froze last with nothing to feed it.
 */
export type FlawKind = 'dunt' | 'crack' | 'misrun' | 'shrinkage' | 'check';

/** A flaw in a body — a dunt from a heat shock, a crack, a casting fault. */
export interface Flaw {
  kind: FlawKind;
  /** Can an eye find it? A hidden one only `ring` finds. */
  visible: boolean;
  /** Game-second it happened. */
  atS: number;
  /**
   * How it was mended, if it was — a tinker's rivets across a crack.
   * ⭐ DERIVED on read (review R2-D1), never stored: a crack or dunt is
   * riveted when the body's mend record (`Durable.getMends`) holds a
   * `riveted` mend made at or after it. The rivet is recorded once.
   */
  mended?: 'riveted';
}

/** A blow a body takes. */
export interface ImpactSpec {
  /** The energy delivered, J. */
  energyJ: number;
  /** What it struck — a floor's material, a target's; `null` = itself. */
  surface: Material | null;
  /**
   * What dealt it. ⚠ Not frost: a frost bursts GREEN ware, which is still
   * clay, so it is ruined in place by the piece's own record
   * (`GreenwareMixin`) — never broken into sherds (review R2-B5).
   */
  cause: 'drop' | 'throw' | 'blow';
}

/** What a blow did. */
export interface ImpactOutcome {
  broke: boolean;
  flawed: boolean;
  /** What it broke into (sherds, a cullet lump), when it broke. */
  pieces: Stuff | null;
}

/**
 * ⭐⭐ Two kinds of flaw (review R2-D1). DAMAGE — something that happened to
 * the body — costs it integrity: its condition (`Durable.getCondition` =
 * wear × integrity) and its strength under a blow read the one number. A
 * fault in the MAKING is the work's quality: it lowers the grade
 * (`gradeAfterFaults`), and the body is as sound as its making allows.
 */
const DAMAGE_PENALTY: Readonly<Partial<Record<FlawKind, number>>> = {
  dunt: 0.3,
  crack: 0.5,
  check: 0.15,
};

/**
 * What a fault in the making does to the grade: a CEILING — it is at most
 * this good. ⚠ A ceiling, never a drop: a grade read and written back
 * (`setGrade(x.getGrade().min(…))`, a repair, a split) must not fall again
 * on every round trip, and a ceiling applied twice is the same ceiling.
 */
const MAKING_FAULT: Readonly<Partial<Record<FlawKind, string>>> = {
  misrun: 'poor',
  shrinkage: 'fair',
  // ⭐ Dried too fast, it checked: a board, a pot — no better than fair. It
  // is also damage (integrity, above); it was Seasoning's own `getGrade`
  // override until B98.
  check: 'fair',
};

/** Game-seconds now, or 0 with no clock (a unit world). */
function integrityNowS(): number {
  try {
    return WorldClockApi.getNow().rawValue();
  } catch {
    return 0;
  }
}

/** One numeric dial read, falling back to the literal when unseeded. */
function integrityDial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw == null || raw === '') return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

export interface Integrity {
  /** The flaws in this body, visible and hidden (ceramics M5). */
  getFlaws(): readonly Flaw[];
  /** Record a flaw (`atS`: when, if the caller knows — the clock is the caller's). */
  addFlaw(kind: FlawKind, visible: boolean, atS?: number): void;
  /**
   * ⭐ A pile's flaws when it splits or merges (R2-B6): `visible` copies
   * the flaws an eye can find (a split-off of a cracked pile is cracked —
   * they are why it is its own pile), `!visible` the hidden ones (a merge
   * carries them, so stacking never launders a crack). Hidden flaws never
   * split a stack: a pile refusing to merge would tell what only `ring`
   * may (Blessable's rule).
   */
  takeFlawsFrom(other: Stuff, visible: boolean): void;
  /**
   * ⭐ How whole this body is, `0.1..1`, by its DAMAGE (cracks, dunts,
   * checks; a riveted one costs half — the staples hold it). The one
   * number its condition and its strength under a blow read (review
   * R2-D1). Faults in the making are not damage: see `gradeAfterFaults`.
   */
  getIntegrity(): number;
  /** The grade `made` after this body's faults in the making (a misrun, shrinkage). */
  gradeAfterFaults(made: Grade): Grade;
  /**
   * ⭐ The energy a blow must deliver to break this body, J — its
   * material's toughness × its volume, a thicker wall disproportionately
   * stronger, less what its flaws cost. `Infinity` for a body that is not
   * brittle (it dents, it does not shatter).
   */
  impactStrengthJ(): number;
  /**
   * ⭐⭐ The ONE breakage act: a blow of `energyJ` against `surface`. A soft
   * floor absorbs by its own hardness; a flagstone does not. Below half its
   * strength nothing; below its strength a crack; past it the body breaks
   * into its material's `brokenTemplate` and what it held spills.
   */
  sufferImpact(spec: ImpactSpec): Promise<ImpactOutcome>;
  /** What a blow would do, without doing it: `none`, a `crack`, or `break`. */
  impactVerdict(spec: ImpactSpec): 'none' | 'crack' | 'break';
  /**
   * ⭐ Tap it and listen: a sound hard body rings, a soft one is dead, a
   * flawed one buzzes — and how loud, by its mass. `ring` tells it. A
   * Ringable signal's sound is emitted from itself through the audible
   * system — a signal bell under the water, heard by every diver in the
   * column and placed by none (underwater C5).
   */
  ringSound(): RingSound;
}

/**
 * ⭐ How a struck thing sounds — the audible system's own vocabulary
 * (`AudibleEmitOptions`, review R2-D4): `description` is what is heard (the
 * note, the buzz of a crack), `character` the word for it heard faintly,
 * `db` how loud a metre off. A Ringable signal sounds it through
 * `AudibleMixin.emit`; an ordinary tapped thing is heard as the act.
 */
export interface RingSound extends AudibleEmitOptions {
  description: string;
  /** Does it ring clear (sound, hard, unflawed)? */
  rings: boolean;
}

/** What a look says of a flaw an eye can find — and of a mend. */
const FLAW_WORDS: Readonly<Record<FlawKind, string>> = {
  crack: 'It is cracked.',
  dunt: 'A fine crack runs through it where a shock of heat caught it.',
  misrun: 'It froze before the mould was full: the thin parts are ragged and short, and an edge runs out into nothing.',
  shrinkage:
    'Where it froze last it is porous, pitted with little shrinkage holes — the metal drew in and nothing fed it.',
  check: 'Fine checks run across its surface where it dried too fast.',
};

/**
 * ⭐ The flaws a look can see, and the mends. Before this a `visible` flaw
 * was seen by nothing: a cracked bowl read as a sound one (the ceramics
 * drive C, run 37). A hidden one stays hidden — only `ring` finds it.
 */
const flawAugmenter: MarkupAugmenter = (text, host, _viewer, opts) => {
  if (opts?.filter) return text;
  if (!MixinApi.isIntegrity(host)) return text;
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const f of host.getFlaws()) {
    const line = f.mended === 'riveted'
      ? 'It has been riveted across a crack: a row of iron staples holds it together.'
      : f.visible ? FLAW_WORDS[f.kind] : '';
    if (line && !seen.has(line)) {
      seen.add(line);
      lines.push(line);
    }
  }
  if (lines.length === 0) return text;
  const all = lines.join(' ');
  return text && text.length > 0 ? `${text}\n\n${all}` : all;
};

export function IntegrityMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class IntegrityMixin extends Base implements Integrity {
    static _mixinName = 'IntegrityMixin';

    static markupAugmenters: MarkupAugmenter[] = [flawAugmenter];

    /**
     * ⭐ An article can be tapped and listened to (ceramics M5): a held
     * mug, a bell on the square, a brick on a stall — outward to whoever
     * holds it, and sideways to anyone sharing the room with it.
     */
    static commandContributions: CommandContributions = {
      environment: ['platform/cmd/perception/ring.yaml'],
      peers: ['platform/cmd/perception/ring.yaml'],
    };

    static fieldMeta: FieldMeta = {
      // ⭐ The flaws a body carries — a dunt, a crack, a casting fault
      // (ceramics M5). Authorable so a row can ship a cracked bell.
      flaws: { persistent: true, authorable: true, runtimeState: true },
    };

    /** See {@link Integrity.getFlaws}. */
    public flaws: Flaw[] = [];

    /** This body's matter — an article is Tangible (`Thing`'s chain). */
    private body(): Stuff & Tangible {
      return this as unknown as Stuff & Tangible;
    }

    /** This body's mass, kg. */
    private massKg(): number {
      return this.body().getMass().rawValue();
    }

    public getFlaws(): readonly Flaw[] {
      // ⭐ Whether a crack is riveted is read off the ONE mend record
      // (review R2-D1): a `riveted` mend made at or after it. The staples
      // show, so a riveted flaw is visible.
      const self = this as unknown as Stuff;
      const rivets = MixinApi.isDurable(self)
        ? self.getMends().filter((m) => m.kind === 'riveted').map((m) => m.at)
        : [];
      if (rivets.length === 0) return this.flaws;
      return this.flaws.map((f) =>
        (f.kind === 'crack' || f.kind === 'dunt') && rivets.some((at) => at >= f.atS)
          ? { ...f, visible: true, mended: 'riveted' as const }
          : f,
      );
    }

    public addFlaw(kind: FlawKind, visible: boolean, atS?: number): void {
      // ⭐ A flaw is stamped with when it happened (the clock, when the
      // caller has no better time): a rivet mends what came BEFORE it.
      const when = atS ?? integrityNowS();
      this.flaws = [...this.flaws, { kind, visible, atS: when }];
    }

    public takeFlawsFrom(other: Stuff, visible: boolean): void {
      if (!MixinApi.isIntegrity(other)) return;
      const taken = other.getFlaws().filter((f) => f.visible === visible);
      if (taken.length > 0) {
        this.flaws = [...this.flaws, ...taken.map((f) => ({ kind: f.kind, visible: f.visible, atS: f.atS }))];
      }
    }

    public getIntegrity(): number {
      let penalty = 0;
      for (const f of this.getFlaws()) {
        penalty += (DAMAGE_PENALTY[f.kind] ?? 0) * (f.mended ? 0.5 : 1);
      }
      return Math.max(0.1, 1 - penalty);
    }

    public gradeAfterFaults(made: Grade): Grade {
      let grade = made;
      for (const f of this.flaws) {
        const ceiling = MAKING_FAULT[f.kind];
        if (ceiling) grade = grade.min(Grade.of(ceiling));
      }
      return grade;
    }

    public impactStrengthJ(): number {
      const mat = this.body().getMaterial();
      if (mat === null || !mat.hasTag('brittle')) return Number.POSITIVE_INFINITY;
      const density = mat.getDensity().rawValue();
      const toughness = mat.getToughness().rawValue();
      if (!(density > 0) || !(toughness > 0)) return 0;
      const v = this.massKg() / density;
      const vRef = integrityDial(AppSettingKeys.impactReferenceVolumeM3, 0.0001);
      const share = integrityDial(AppSettingKeys.impactFractureShare, 0.0018);
      // ⭐ How sound it is — the ONE number (review R2-D1): a worn tool's
      // condition (wear × integrity), else the body's integrity alone.
      const self = this as unknown as Stuff;
      const sound = MixinApi.isDurable(self) ? self.getCondition() : this.getIntegrity();
      return toughness * 1e6 * v * (v / vRef) * share * Math.max(0.1, sound);
    }

    public impactVerdict(spec: ImpactSpec): 'none' | 'crack' | 'break' {
      const mat = this.body().getMaterial();
      if (mat === null || !mat.hasTag('brittle') || !(spec.energyJ > 0)) return 'none';
      const delivered = this.deliveredJ(spec);
      const strength = this.impactStrengthJ();
      if (delivered < strength * 0.5) return 'none';
      return delivered < strength ? 'crack' : 'break';
    }

    /**
     * ⭐ The joules a blow delivers into this body — the floor's say, the ONE
     * copy (review R2-D2): a soft surface (earth, boards) takes the blow by
     * its own hardness; one as hard as the body (flagstone) gives it all
     * back; `null` is the body itself.
     */
    private deliveredJ(spec: ImpactSpec): number {
      const own = Math.max(1, this.body().getMaterial()?.getHardness().rawValue() ?? 1);
      const floor = spec.surface !== null ? spec.surface.getHardness().rawValue() : own;
      return spec.energyJ * Math.min(1, Math.max(0, floor) / own);
    }

    public async sufferImpact(spec: ImpactSpec): Promise<ImpactOutcome> {
      const self = this as unknown as Stuff;
      const verdict = this.impactVerdict(spec);
      if (verdict === 'none') return { broke: false, flawed: false, pieces: null };
      if (verdict === 'crack') {
        // A crack — on the rim it shows; deep in the wall only `ring` finds it.
        this.addFlaw('crack', this.deliveredJ(spec) >= this.impactStrengthJ() * 0.8);
        return { broke: false, flawed: true, pieces: null };
      }
      // It breaks: into its material's broken form, where it was. (What a
      // vessel held is spilled by `BulkableMixin.sufferImpact` first.)
      // ⭐ A write never skips (spatial.md § Detached Stuff): the sherds need
      // the place the pot stood, so a pot standing nowhere is a defect in
      // whoever broke it — checked BEFORE anything changes.
      const where = MixinApi.isContainable(self) ? self.getContainer() : null;
      if (where === null) {
        throw new DetachedError(`${self.getPresentation()} broke while standing nowhere: its pieces have no place`);
      }
      const mat = this.body().getMaterial()!;
      let pieces: Stuff | null = null;
      const row = mat.getBrokenTemplate();
      if (row) {
        // ⚠ Not swallowed: a broken form that cannot be minted is a defect
        // in the row, and the pot is not destroyed into nothing.
        pieces = await StuffApi.clone<Stuff>(row, undefined, { madeFrom: [self] });
        if (MixinApi.isTangible(pieces)) {
          pieces.setMaterial(mat);
          pieces.setMass((this as unknown as Tangible).getMass());
        }
        if (MixinApi.isContainable(pieces)) ContainmentApi.move(pieces, where);
      }
      await StuffApi.destruct(self);
      return { broke: true, flawed: false, pieces };
    }

    public ringSound(): RingSound {
      const mat = this.body().getMaterial();
      const sounding = mat !== null && (mat.hasTag('brittle') || mat.hasTag('metal'));
      const rings =
        sounding &&
        this.flaws.length === 0 &&
        (mat!.hasTag('metal') ||
          mat!.getHardness().rawValue() >= integrityDial(AppSettingKeys.impactRingsAboveHardness, 55));
      const description = !sounding
        ? 'a dull knock, and nothing after it'
        : this.flaws.length > 0
          ? 'a flat, buzzing clack — there is a crack in it somewhere'
          : rings
            ? 'a clear ring that hangs in the air'
            : 'a dead, soft note';
      // ⭐ How far it carries: a sounding body's note by its mass (a bell's
      // over the square, a mug's across a table); a dull knock barely at all.
      const kg = Math.max(0.01, this.massKg());
      return {
        description,
        character: rings ? 'ring' : 'knock',
        db: rings ? 50 + 10 * Math.log10(kg) : 35,
        rings,
      };
    }
  };
}
