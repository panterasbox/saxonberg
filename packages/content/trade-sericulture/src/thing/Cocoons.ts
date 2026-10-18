/**
 * Cocoons — a stack of silk cocoons, and ⭐⭐ the deadline that decides the
 * whole trade.
 *
 * A rearing ends in three stacks, sorted by heft — heavy, middling and
 * light — because sorting by weight is how a grower has always chosen
 * seed. Each stack remembers the strain, its own mean shell weight, the
 * tray's mean it was sorted from, the lot's genetic mean, and the disease
 * the worms carried. ⚠ Every one of those is stack identity: a split keeps
 * them and two stacks that differ in any of them never merge.
 *
 * The cocoon's clock — stifling by heat, scorching by too much of it, and
 * the moths opening an unstifled stack about ten days after the spin —
 * reconciles on every read.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { StackableMixin } from '@saxonberg/server/mud/lib/stuff/Stackable';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { GrammarApi } from '@saxonberg/server/mud/api/grammar';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import { GRADE_BANDS } from '@saxonberg/server/mud/lib/craft/Grade';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { CocoonSeed, CocoonSeedable, HeftBand } from '../lib/Rearing';
import type Strain from '../idea/Strain';
import type EggLot from './EggLot';

const SECONDS_PER_GAME_DAY = 86_400;
const EGG_LOT_ROW = '/trade/sericulture/thing/egg-lot';

/**
 * ⭐⭐ The four stifling dials. A cocoon is a few grams with almost no
 * thermal mass, so it is at the oven's temperature within a minute — the
 * window between DEAD and BURNT is the difference between the two hold
 * times, not a warm-up. Calibrated in `stifling.test.ts` over a real
 * `ThermalMixin` in a real lit oven: in a 500 K kitchen range a stack is
 * stifled in ten minutes and scorched in thirty; in a 345 K stifling oven
 * it is stifled and never scorches.
 */
const STIFLE_K = 333;
const SCORCH_K = 423;
const STIFLE_HOLD_S = 600;
const SCORCH_HOLD_S = 1800;
/** An unstifled cocoon opens about ten game days after the spin. */
const EMERGE_DAYS = 10;
/** Eggs one kept cocoon is worth (a female lays ~400; half are male). */
const EGGS_PER_COCOON = 200;
/** A lay is one card, however many moths laid on it. */
const MAX_EGGS = 600;
/** What a lay multiplies the mothers' disease by. */
const AMPLIFICATION = 1.6;

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

function nowGameSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
  return WorldClockApi.getNow().rawValue();
}

/** `look cocoons` — the heft, in the hand. */
function heftAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!(host instanceof Cocoons)) return text;
  const line = host.cocoonLine();
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

const CocoonsBase = ThermalMixin(StackableMixin(CraftedMixin(Good)));

export default class Cocoons extends CocoonsBase implements CocoonSeedable {
  // ⚠ TS re-surface of the inner `GradedMixin`'s members (the documented
  // `Crafted.ts` cast quirk — `TextileStock` carries the same block).
  declare getGradeBand: () => string;
  declare setGradeBand: (value: string) => void;
  declare getGrade: () => Grade;
  declare setGrade: (value: Grade) => void;

  /** ⚠ Every field that says what these cocoons ARE is stack identity. */
  static fieldMeta: FieldMeta = {
    _strainPath: { persistent: true, stackIdentity: true, authorable: true, ref: 'identity:constituent' },
    heftBand: { persistent: true, stackIdentity: true, authorable: true },
    meanShellMg: { persistent: true, stackIdentity: true, authorable: true },
    lotMeanMg: { persistent: true, stackIdentity: true, authorable: true },
    lotGeneticMg: { persistent: true, stackIdentity: true, authorable: true },
    pebrineLoad: { persistent: true, stackIdentity: true, authorable: true, spoiler: 1 },
    spunAt: { persistent: true, stackIdentity: true, authorable: true },
    stifleS: { persistent: true },
    scorchS: { persistent: true },
    stifled: { persistent: true, stackIdentity: true, authorable: true },
    scorched: { persistent: true, stackIdentity: true, authorable: true },
    pierced: { persistent: true, stackIdentity: true, authorable: true },
    cocoonStamp: { persistent: true },
  };

  static markupAugmenters: MarkupAugmenter[] = [heftAugmenter];

  public _strainPath = '';
  public heftBand: HeftBand = 'middling';
  /** This stack's mean shell weight, mg — the phenotype that was kept. */
  public meanShellMg = 380;
  /** The tray's mean the stack was sorted from (selection's `S` baseline). */
  public lotMeanMg = 380;
  /** The lot's genetic mean — what a lay moves from. */
  public lotGeneticMg = 380;
  /** ⚠ A spoiler, carried from the tray. */
  public pebrineLoad = 0;
  /** Game-seconds the worms finished spinning. */
  public spunAt = 0;
  /** Game-seconds held at stifling heat. */
  public stifleS = 0;
  /** Game-seconds held at scorching heat. */
  public scorchS = 0;
  public stifled = false;
  public scorched = false;
  /** The moths have broken out; the thread is cut. */
  public pierced = false;
  public cocoonStamp = 0;

  public getStrainPath(): string {
    return this._strainPath;
  }
  public getHeftBand(): HeftBand {
    return this.heftBand;
  }
  public getMeanShellMg(): number {
    return this.meanShellMg;
  }
  public getLotMeanMg(): number {
    return this.lotMeanMg;
  }
  public getLotGeneticMg(): number {
    return this.lotGeneticMg;
  }
  public getPebrineLoad(): number {
    return this.pebrineLoad;
  }
  public getSpunAt(): number {
    return this.spunAt;
  }
  public isStifled(): boolean {
    this.reconcileCocoons();
    return this.stifled;
  }
  public isScorched(): boolean {
    this.reconcileCocoons();
    return this.scorched;
  }
  public isPierced(): boolean {
    this.reconcileCocoons();
    return this.pierced;
  }

  public strain(): Strain | null {
    if (!this._strainPath) return null;
    return StuffApi.findByTemplatePath<Strain>(this._strainPath) ?? null;
  }

  /** ⭐ What the tray tells a stack it has just minted. */
  public seedFromTray(seed: CocoonSeed): void {
    this._strainPath = seed.strainPath;
    this.heftBand = seed.heftBand;
    this.meanShellMg = Math.max(1, seed.meanShellMg);
    this.lotMeanMg = Math.max(1, seed.lotMeanMg);
    this.lotGeneticMg = Math.max(1, seed.lotGeneticMg);
    this.pebrineLoad = Math.max(0, Math.min(1, seed.pebrineLoad));
    this.spunAt = seed.spunAt;
    this.cocoonStamp = seed.spunAt;
    this.stifleS = 0;
    this.scorchS = 0;
    this.stifled = false;
    this.scorched = false;
    this.pierced = false;
    this.setQuantity(Math.max(1, Math.floor(seed.count)));
    if (seed.maker) this.setMaker(seed.maker);
    this.setGradeBand(this.heftGrade());
  }

  /**
   * The grade a stack starts at, off its heft: a heavy cocoon reels a
   * longer, finer filament. Scorching takes two bands off it later.
   */
  private heftGrade(): string {
    return this.heftBand === 'heavy' ? 'fine' : this.heftBand === 'light' ? 'poor' : 'fair';
  }

  // ---------- the clock ----------

  private _reconcilingCocoons = false;
  private _laying = false;

  /**
   * ⭐⭐ Bring the stack current: integrate its own temperature since the
   * last read — time held at stifling heat, time held at scorching heat —
   * and, if it was never stifled, let the moths out on their day.
   * Reconcile-on-read with no far-past guard: a stack left a fortnight
   * opens on the next look, and a lot lies where it stood.
   */
  public reconcileCocoons(): void {
    if (this._reconcilingCocoons || this.pierced) return;
    const nowS = nowGameSeconds();
    if (nowS === null) return;
    if (this.cocoonStamp === 0) {
      this.cocoonStamp = nowS;
      if (this.spunAt === 0) this.spunAt = nowS;
      return;
    }
    if (!(nowS > this.cocoonStamp)) return;
    this._reconcilingCocoons = true;
    try {
      const fromS = this.cocoonStamp;
      this.cocoonStamp = nowS;
      if (!this.scorched) {
        const stifleK = dial('sericulture.stifleK', STIFLE_K);
        const scorchK = dial('sericulture.scorchK', SCORCH_K);
        for (const s of this.temperatureTrajectory(fromS, nowS).samples(8)) {
          if (s.value >= stifleK) this.stifleS += s.durationS;
          if (s.value >= scorchK) this.scorchS += s.durationS;
        }
        if (!this.stifled && this.stifleS >= dial('sericulture.stifleHoldS', STIFLE_HOLD_S)) {
          this.stifled = true;
        }
        if (this.scorchS >= dial('sericulture.scorchHoldS', SCORCH_HOLD_S)) {
          this.scorched = true;
          this.stifled = true;
          this.dropGrade(2);
        }
      }
      if (
        !this.stifled &&
        nowS - this.spunAt >= dial('sericulture.emergeDays', EMERGE_DAYS) * SECONDS_PER_GAME_DAY
      ) {
        this.emerge(nowS);
      }
    } finally {
      this._reconcilingCocoons = false;
    }
  }

  /**
   * ⭐ The moths break out. The stack is pierced — the thread is cut, so it
   * will never reel, though it still spins — and the moths lay ONE card of
   * eggs where the stack stands: the strain, the mothers' disease made
   * worse, and a genetic mean moved by the breeder's equation from what
   * was kept, `R = h² × S`.
   */
  private emerge(nowS: number): void {
    this.pierced = true;
    this.dropGrade(1);
    const holder = MixinApi.isContainable(this) ? this.getContainer() : null;
    // A stack in limbo has nowhere to lay; it is simply pierced.
    if (!holder || this._laying) return;
    this._laying = true;
    const h2 = this.strain()?.getHeritability() ?? 0.4;
    const selection = this.meanShellMg - this.lotMeanMg;
    const facts = {
      strainPath: this._strainPath,
      eggs: Math.min(
        dial('sericulture.maxEggs', MAX_EGGS),
        this.getQuantity() * dial('sericulture.eggsPerCocoon', EGGS_PER_COCOON),
      ),
      load: Math.min(1, this.pebrineLoad * dial('sericulture.pebrine.amplification', AMPLIFICATION)),
      mean: Math.max(1, this.lotGeneticMg + h2 * selection),
      where: placeWords(holder as unknown as Stuff),
      laidAt: nowS,
    };
    void this.lay(holder as unknown as Stuff & Container, facts).finally(() => {
      this._laying = false;
    });
  }

  private async lay(
    holder: Stuff & Container,
    facts: { strainPath: string; eggs: number; load: number; mean: number; where: string; laidAt: number },
  ): Promise<void> {
    let lot: EggLot | null = null;
    try {
      lot = await StuffApi.clone<EggLot>(EGG_LOT_ROW, undefined, {
        madeFrom: this as unknown as Stuff,
      });
    } catch {
      return;
    }
    if (!lot) return;
    lot.setStrainPath(facts.strainPath);
    lot.setEggCount(facts.eggs);
    lot.setPebrineLoad(facts.load);
    lot.setMeanShellMg(facts.mean);
    lot.setLaidAt(facts.laidAt);
    lot.setLaidWhere(facts.where);
    lot.setWintered(false);
    if (MixinApi.isContainable(lot as unknown as Stuff) && !holder.isDestroyed()) {
      ContainmentApi.move(lot as unknown as Stuff & Containable, holder);
    }
  }

  private dropGrade(bands: number): void {
    const i = (GRADE_BANDS as readonly string[]).indexOf(this.getGradeBand());
    this.setGradeBand(GRADE_BANDS[Math.max(0, (i < 0 ? 1 : i) - bands)]!);
  }

  /** The stack in words — heft, colour, and where it stands on its clock. */
  public cocoonLine(): string {
    this.reconcileCocoons();
    const colour = this.strain()?.getColour() ?? 'pale';
    const heft =
      this.heftBand === 'heavy'
        ? 'heavy in the hand, the pick of the crop'
        : this.heftBand === 'light'
          ? 'light in the hand, the thinnest of the crop'
          : 'of a middling heft';
    return `${capitalise(colour)} cocoons, ${heft}. ${this.clockLine()}`;
  }

  private clockLine(): string {
    if (this.pierced) return 'Each has a ragged hole in one end where the moth came out; the thread is cut.';
    if (this.scorched) return 'They are scorched brown at the ends and smell of burnt hair.';
    if (this.stifled) return 'They are quiet and dry; whatever was inside is dead.';
    const nowS = nowGameSeconds();
    if (nowS === null || this.spunAt === 0) return 'Something stirs inside if you hold one to your ear.';
    const left = Math.ceil(
      (dial('sericulture.emergeDays', EMERGE_DAYS) * SECONDS_PER_GAME_DAY - (nowS - this.spunAt)) /
        SECONDS_PER_GAME_DAY,
    );
    return left <= 1
      ? 'Something stirs inside; the moths will be out within the day.'
      : `Something stirs inside; the moths will come in about ${GrammarApi.inWords(left)} days.`;
  }
}

/** Where a stack stands, in words — the room the lot will say it was laid in. */
function placeWords(holder: Stuff): string {
  let at: Stuff | null = holder;
  for (let i = 0; i < 8 && at; i++) {
    if (at.isLocation()) {
      return MixinApi.isVisible(at) ? `in ${at.getShortDescription()}` : '';
    }
    at = MixinApi.isContainable(at) ? (at.getContainer() as Stuff | null) : null;
  }
  return MixinApi.isVisible(holder) ? `in ${holder.getShortDescription()}` : '';
}

function capitalise(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}
