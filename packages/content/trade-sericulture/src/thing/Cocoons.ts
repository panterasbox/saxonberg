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
import type { CocoonSeed, CocoonSeedable, HeftBand } from '../lib/Rearing';
import type Strain from '../idea/Strain';

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
    return this.stifled;
  }
  public isScorched(): boolean {
    return this.scorched;
  }
  public isPierced(): boolean {
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

  /** The stack in words — heft and colour, never a weight. */
  public cocoonLine(): string {
    const colour = this.strain()?.getColour() ?? 'pale';
    const heft =
      this.heftBand === 'heavy'
        ? 'heavy in the hand, the pick of the crop'
        : this.heftBand === 'light'
          ? 'light in the hand, the thinnest of the crop'
          : 'of a middling heft';
    return `${capitalise(colour)} cocoons, ${heft}.`;
  }
}

function capitalise(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}
