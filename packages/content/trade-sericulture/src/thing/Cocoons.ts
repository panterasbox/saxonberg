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
import type RawSilk from './RawSilk';
import type { Reelable } from '@saxonberg/content-trade-fishing/src/lib/Reelable';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { WorkPrognosis, WorkResult } from '@saxonberg/server/mud/lib/ground/Workable';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';

const SECONDS_PER_GAME_DAY = 86_400;
const EGG_LOT_ROW = '/trade/sericulture/thing/egg-lot';
const RAW_SILK_ROW = '/trade/sericulture/thing/raw-silk';
const PUPAE_ROW = '/trade/sericulture/thing/pupae';

/** Cocoons one reeling uses up. */
const REEL_CHARGE = 40;
/** Game-ms one reeling takes at eight to the thread with a rate-1 reel. */
const REEL_BASE_MS = 30 * 60 * 1000;
/** The water has to be near simmering to loosen the gum. */
const REEL_WATER_K = 330;
/** The count a reeler uses when they do not say. */
const DEFAULT_COUNT = 8;

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

export default class Cocoons extends CocoonsBase implements CocoonSeedable, Reelable {
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

  // ---------- the reel ----------

  /** ⭐ The shape fishing's `reel` narrows on (D6). */
  public readonly reelable = true as const;

  /**
   * What one reeling would be, or why not — in the cocoons' own words. No
   * side effects.
   */
  public async planReel(
    by: Stuff,
    tool: (Stuff & Tooled) | null,
    count: number | null,
  ): Promise<WorkPrognosis> {
    this.reconcileCocoons();
    if (this.pierced) {
      return refusal('pierced', 'There is nothing to reel off a pierced cocoon — the thread is cut. It will spin.');
    }
    if (!this.stifled) {
      return refusal('not-stifled', 'The moths are still alive in them. Stifle them first, or they will break the thread as you reel.');
    }
    const charge = dial('sericulture.reel.charge', REEL_CHARGE);
    if (this.reelPool().reduce((n, c) => n + c.getQuantity(), 0) < charge) {
      return refusal('too-few', 'There are not enough cocoons there to keep a thread going.');
    }
    if (!tool || !tool.hasCapability('reeling')) {
      return refusal('no-reel', 'You want a reel to wind the thread onto.');
    }
    const heat = Math.max(
      this.reachableHeatK(),
      MixinApi.isThermal(by) ? by.reachableHeatK() : 0,
    );
    if (heat < dial('sericulture.reel.waterK', REEL_WATER_K)) {
      return refusal('no-heat', 'They want hot water to loosen the gum, and there is no fire here.');
    }
    const n = Math.max(3, Math.min(20, Math.round(count ?? DEFAULT_COUNT)));
    const base = dial('sericulture.reel.baseMs', REEL_BASE_MS);
    const durationMs = Math.round((base / Math.max(0.1, tool.capabilityRate('reeling'))) * (DEFAULT_COUNT / n));
    return {
      kind: 'plan',
      durationMs,
      cost: 0,
      beginSelf: `You drop a handful of cocoons into the hot water, find the ends with a twig, and gather ${n} of them into one thread.`,
      beginPeers: 'Somebody bends over a basin, reeling silk off cocoons.',
      token: { count: n, charge, control: tool.capabilityControl('reeling') },
    };
  }

  /**
   * ⭐ The cocoons a reeling may draw on: this stack and every stack beside
   * it in the same hands that would reel the same — stifled, whole, the
   * same strain. ⚠ Bought cocoons arrive one titled unit at a time and a
   * titled stack never merges (the chattel rule), so forty bought cocoons
   * are forty stacks; a reel that counted only the stack named would
   * refuse every one of them (found by the drive).
   */
  private reelPool(): Cocoons[] {
    const holder = MixinApi.isContainable(this) ? this.getContainer() : null;
    const pool: Cocoons[] = [this];
    if (!holder || !MixinApi.isContainer(holder)) return pool;
    for (const s of holder.getContents() as Stuff[]) {
      if (!(s instanceof Cocoons) || (s as unknown) === (this as unknown)) continue;
      if (s.isStifled() && !s.isPierced() && s.getStrainPath() === this._strainPath) pool.push(s);
    }
    return pool;
  }

  /**
   * ⭐ Do it: the cocoons are used, ONE skein of raw silk and a handful of
   * pupae are made, and the skein carries the reeler's mark and how even
   * their hands kept it.
   */
  public async completeReel(
    by: Stuff,
    _tool: (Stuff & Tooled) | null,
    token: unknown,
  ): Promise<WorkResult> {
    const t = token as { count: number; charge: number; control: string | null };
    const band = await competenceOf(by);
    const evenness = Math.max(
      0,
      Math.min(
        1,
        0.45 +
          0.12 * CompetenceBand.rank(band) +
          (t.control === 'fine' ? 0.2 : 0) -
          0.04 * Math.max(0, 8 - t.count),
      ),
    );
    const pool = this.reelPool();
    const cocoonBand = pool.reduce((b, c) => lowerBand(b, c.getGradeBand()), this.getGradeBand());
    const skein = await mint<RawSilk>(RAW_SILK_ROW, by);
    if (skein) {
      skein.setFilamentCount(t.count);
      skein.setEvenness(evenness);
      skein.setMaker(by.getIdentityPath() ?? '');
      skein.setGradeBand(lowerBand(cocoonBand, evennessBand(evenness)));
    }
    await mint<Stuff>(PUPAE_ROW, by);
    // ⭐ Only now are the cocoons used — AFTER the mints, because the stack
    // this method runs on may be one the debit destroys (found by the
    // drive: the pupae never arrived). The skein's grade was read above,
    // weakest cocoon first: it is no better than the worst that went in.
    let need = t.charge;
    for (const c of pool) {
      if (need <= 0) break;
      const take = Math.min(need, c.getQuantity());
      need -= take;
      if (take >= c.getQuantity()) StuffApi.destruct(c as unknown as Stuff);
      else c.setQuantity(c.getQuantity() - take);
    }

    const line = skein ? skein.threadLine() : '';
    return {
      self: `You wind off a skein of raw silk. ${line} You fish the pupae out of the water.`,
      peers: 'Somebody lifts a skein of raw silk off the reel.',
      credit: { discipline: 'textiles', difficulty: t.count < 6 ? 'hard' : 'standard' },
    };
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

function refusal(reason: string, prose: string): WorkPrognosis {
  return { kind: 'refusal', reason, prose };
}

/** Clone a row into `by`'s hands — the one clone path. */
async function mint<T>(row: string, by: Stuff): Promise<T | null> {
  let made: Stuff | null = null;
  try {
    made = await StuffApi.clone<Stuff>(row);
  } catch (err) {
    console.warn(`Cocoons: could not mint ${row}: ${String(err)}`);
    return null;
  }
  if (!made) return null;
  if (MixinApi.isContainable(made) && MixinApi.isContainer(by)) {
    ContainmentApi.move(made as Stuff & Containable, by as Stuff & Container);
  }
  return made as unknown as T;
}

async function competenceOf(by: Stuff): Promise<CompetenceBandName> {
  const actor = by as unknown as { competenceBandFor?(key: string): Promise<CompetenceBandName> };
  if (typeof actor.competenceBandFor !== 'function') return 'untrained';
  try {
    return await actor.competenceBandFor('textiles');
  } catch {
    return 'untrained';
  }
}

/** The grade an evenness earns on its own. */
function evennessBand(e: number): string {
  return e < 0.4 ? 'poor' : e < 0.6 ? 'fair' : e < 0.8 ? 'fine' : e < 0.95 ? 'exceptional' : 'masterful';
}

/** The weaker of two bands — weakest link. */
function lowerBand(a: string, b: string): string {
  const bands = GRADE_BANDS as readonly string[];
  const i = bands.indexOf(a);
  const j = bands.indexOf(b);
  if (i < 0) return j < 0 ? 'fair' : b;
  if (j < 0) return a;
  return bands[Math.min(i, j)]!;
}

/** Where a stack stands, in words — the room the lot will say it was laid in. */
function placeWords(holder: Stuff): string {
  let at: Stuff | null = holder;
  for (let i = 0; i < 8 && at; i++) {
    if (at.isPlace()) {
      return MixinApi.isVisible(at) ? `in ${at.getShortDescription()}` : '';
    }
    at = MixinApi.isContainable(at) ? (at.getContainer() as Stuff | null) : null;
  }
  return MixinApi.isVisible(holder) ? `in ${holder.getShortDescription()}` : '';
}

function capitalise(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}
