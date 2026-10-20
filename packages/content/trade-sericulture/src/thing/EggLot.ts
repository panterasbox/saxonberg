/**
 * EggLot — ⭐ a card of silkworm eggs, and everything a grower can know
 * about it: whose race, laid where, and when.
 *
 * ⭐⭐ **And nothing about the disease.** `pebrineLoad` is seeded on the
 * lot at its origin (an authored row, or the mother moths' load carried
 * on at a lay) and is a `spoiler` field: `look`, `handle` and the wiki
 * never say it. A grower of 1855 bought eggs from a name and a valley and
 * found out at the fourth age; so does a player. Telling a clean lot from
 * a sick one before you rear it wants a microscope — the optics slate's.
 *
 * ⭐ **A one-brood race winters.** Eggs of a strain with `broods: 1` will
 * not hatch until they have been cold for a season: the lot tracks its
 * own chill off its temperature trajectory (`chillS`, game-seconds below
 * `chillK`), and a tray refuses it until it has had enough. Bought lots
 * are authored `wintered: true` — the grainer kept them through the cold.
 *
 * Hatching is ADOPTION: `put egg lot in tray` copies these facts onto the
 * tray and consumes the card. Nothing clones a rearing.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { GrammarApi } from '@saxonberg/server/mud/api/grammar';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import type { EggLotLike } from '../lib/Rearing';
import type Strain from '../idea/Strain';

const SECONDS_PER_GAME_DAY = 86_400;
/** Eggs count as chilling below 5 °C. */
const CHILL_K = 278;
/** About two game months of cold is a winter, as far as an egg cares. */
const WINTER_S = 60 * SECONDS_PER_GAME_DAY;

function nowGameSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
  return WorldClockApi.getNow().rawValue();
}

/** `look egg lot` — the strain, where and when; never the load. */
function provenanceAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!(host instanceof EggLot)) return text;
  const line = host.provenanceLine();
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

export default class EggLot extends ThermalMixin(Good) implements EggLotLike {
  static fieldMeta: FieldMeta = {
    _strainPath: { persistent: true, authorable: true, ref: 'identity:constituent' },
    eggCount: { persistent: true, authorable: true },
    meanShellMg: { persistent: true, authorable: true },
    pebrineLoad: { persistent: true, authorable: true, spoiler: 1 },
    laidAt: { persistent: true, authorable: true },
    laidWhere: { persistent: true, authorable: true },
    wintered: { persistent: true, authorable: true },
    chillS: { persistent: true },
    chillStamp: { persistent: true },
  };

  static markupAugmenters: MarkupAugmenter[] = [provenanceAugmenter];

  public _strainPath = '';
  public eggCount = 0;
  /** The lot's GENETIC mean shell weight, mg. */
  public meanShellMg = 0;
  /** ⚠ A spoiler: seeded at origin, read by nothing a player has. */
  public pebrineLoad = 0;
  /** Game-seconds it was laid; `0` = last season (an authored lot). */
  public laidAt = 0;
  /** Where it was laid, in words (*in the silk house at Hearts Delight*). */
  public laidWhere = '';
  public wintered = false;
  /** Game-seconds of cold it has had. */
  public chillS = 0;
  public chillStamp = 0;

  public getStrainPath(): string {
    return this._strainPath;
  }
  public setStrainPath(value: string): void {
    this._strainPath = value ?? '';
  }
  public getEggCount(): number {
    return this.eggCount;
  }
  public setEggCount(value: number): void {
    this.eggCount = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }
  public getMeanShellMg(): number {
    if (this.meanShellMg > 0) return this.meanShellMg;
    return this.strain()?.getMeanShellMg() ?? 380;
  }
  public setMeanShellMg(value: number): void {
    this.meanShellMg = Number.isFinite(value) && value > 0 ? value : 0;
  }
  public getPebrineLoad(): number {
    return this.pebrineLoad;
  }
  public setPebrineLoad(value: number): void {
    this.pebrineLoad = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  }
  public getLaidAt(): number {
    return this.laidAt;
  }
  public setLaidAt(value: number): void {
    this.laidAt = Number.isFinite(value) && value > 0 ? value : 0;
  }
  public getLaidWhere(): string {
    return this.laidWhere;
  }
  public setLaidWhere(value: string): void {
    this.laidWhere = value ?? '';
  }
  public setWintered(value: boolean): void {
    this.wintered = value === true;
  }

  public strain(): Strain | null {
    if (!this._strainPath) return null;
    return StuffApi.findByTemplatePath<Strain>(this._strainPath) ?? null;
  }

  /**
   * ⭐ Will these eggs hatch? A two-brood race always will; a one-brood
   * race only once it has wintered.
   */
  public isReadyToHatch(): boolean {
    if ((this.strain()?.getBroods() ?? 2) !== 1) return true;
    this.reconcileChill();
    return this.wintered;
  }

  /** Bring the winter clock current off the lot's own temperature. */
  public reconcileChill(): void {
    if (this.wintered) return;
    const nowS = nowGameSeconds();
    if (nowS === null) return;
    if (this.chillStamp === 0) {
      this.chillStamp = nowS;
      return;
    }
    if (!(nowS > this.chillStamp)) return;
    const from = this.chillStamp;
    this.chillStamp = nowS;
    for (const s of this.temperatureTrajectory(from, nowS).samples(8)) {
      if (s.value < CHILL_K) this.chillS += s.durationS;
    }
    if (this.chillS >= WINTER_S) this.wintered = true;
  }

  /** Strain, where and when — in words, and nothing about disease. */
  public provenanceLine(): string {
    const strain = this.strain();
    const race = strain
      ? `Eggs of the ${strain.getLabel()}, a ${strain.getColour()} race of ${strain.getBroods() === 1 ? 'one brood' : 'two broods'} a year.`
      : 'Silkworm eggs.';
    const where = this.placeWords();
    const nowS = nowGameSeconds();
    let when = 'Laid last season.';
    if (this.laidAt > 0 && nowS !== null) {
      const days = Math.max(0, Math.floor((nowS - this.laidAt) / SECONDS_PER_GAME_DAY));
      when =
        days === 0
          ? 'Laid today.'
          : days === 1
            ? 'Laid yesterday.'
            : `Laid ${GrammarApi.inWords(days)} days ago.`;
    }
    const cold =
      (strain?.getBroods() ?? 2) === 1 && !this.isReadyToHatch()
        ? ' They have not had a winter yet, and will not hatch until they have.'
        : '';
    return `${race} ${where ? `${when.slice(0, -1)} ${where}.` : when}${cold}`;
  }

  /** Where, in words — a lay writes the room it happened in. */
  private placeWords(): string {
    return this.laidWhere;
  }
}
