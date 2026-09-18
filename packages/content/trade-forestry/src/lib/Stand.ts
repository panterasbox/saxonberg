/**
 * StandMixin — **the standing timber as a cover over a place.**
 *
 * ⭐ Roots go INTO the ground; a stand is a sward of trees. A herd is a
 * record filed elsewhere because a herd *moves* — its position and its
 * composition are two sources on purpose. A stand does not move, so the
 * PLACE carries it, exactly as a `Field` carries its sward: a stamp,
 * reconcile-on-read, host hooks the ground answers, a percept phrase.
 * This is the second instance of that shape (`trade-farming`'s
 * `SwardMixin` is the first); a kernel `lib/husbandry/Cover` is the seam
 * when a third appears, and two instances is where a pattern is NAMED,
 * not factored.
 *
 * ## What it is, in numbers
 *
 * Per species: `standing` whole standards true at `standStamp`, a
 * `capacity` this ground carries, and an `incrementPerYear`. On read:
 *
 *     standingNow = min(capacity, standing + increment × growthFactor × years since the stamp)
 *
 * with `growthFactor = clampUnit(soilMoistureFraction() / 0.35)` when
 * the host models soil — the Field's own drought curve for a sward —
 * and 1 when it does not (`null` = unmodelled, NOT zero; the tri-state
 * rule). ⚠ The factor is read at derive time rather than integrated: a
 * month of drought followed by a wet day derives the month at the wet
 * day's factor. The honest cheap form, stated in `forestry.md`; the
 * Sward's stepped integral is the upgrade and the Cover seam is where it
 * would be shared. **Reads stamp nothing.** A cut settles every species
 * to its derived figure, takes one off the chosen one, and stamps —
 * so the increment continues from what is left, and a felled-out
 * clearing is empty for `capacity / increment` game years at full
 * moisture, longer in drought. Nothing but the increment and planting
 * puts a tree back.
 *
 * ## Unit: whole standards
 *
 * "Trees' worth", never cubic metres. The drive reads *smaller by one
 * tree's worth*; a volume would be a second number nothing reads.
 *
 * ## What it affords, and to whom
 *
 * `static commandContributions = { self, inventory }` — on a LOCATION
 * host, *the people standing in it are its inventory*
 * (`api/command.ts`), so `inventory` is what puts `fell` in a player's
 * commands while they stand on the ride. ⚠ NOT `environment`/`peers`:
 * for a room those reach the zone and the neighbouring rooms. A row's
 * `commandContributions:` is dead silently; the affordance is a static
 * on a class, and `bucketFilenames` unions the chain, so the host class
 * declares none of its own.
 *
 * ## What it says
 *
 * `markupAugmenters` renders the stand into the host's `look`: per
 * species a line in WORDS — *"Oak stands here — about twenty-four
 * trees' worth, old, planted by nobody alive."* — then the plantings,
 * then, when every species derives below one, *"Nothing stands here
 * that is worth the axe — stumps, brash, and the saplings somebody
 * planted."* A stand is a ledger a player reads, not a gauge.
 *
 * ⚠ An authored `mix:` on a live world is inert after the first
 * capture: the persistence record wins (the row is what the stand
 * STARTED as; the record is what it has become). Same class as *a
 * `props:` edit never reaches a booted world*.
 *
 * See [docs/subsystems/forestry.md].
 */

import type { MixinConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Reserved } from '@saxonberg/server/mud/lib/reserve';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { GrammarApi } from '@saxonberg/server/mud/api/grammar';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import { Final, Unshadowable } from '@saxonberg/server/mud/lib/security/decorators';
import { DefaultCalendar } from '@saxonberg/server/mud/lib/time/DefaultCalendar';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';

export const STAND_MIXIN = 'StandMixin';

const SECONDS_PER_GAME_DAY = 86_400;
const DAYS_PER_GAME_YEAR = 360;
const SECONDS_PER_GAME_YEAR = SECONDS_PER_GAME_DAY * DAYS_PER_GAME_YEAR;

/**
 * The moisture fraction at and above which the increment runs at full
 * rate — the Field's drought curve for a sward, reused unchanged.
 */
const MOISTURE_HAPPY_AT = 0.35;

/**
 * Litres a standing broadleaf transpires in a game day. A mature oak
 * moves 100–150 L on a summer day; this is the term the soil hook
 * drinks by, and it is what makes a full stand on a small cell run its
 * ground dry in a dry month — the coupling the Wood exists for.
 */
const TRANSPIRATION_L_PER_STANDARD_DAY = 120;

/** One species standing in a place: what it is, and how much. */
export interface StandSpecies {
  /** The Species row. */
  speciesPath: string;
  /** The word a player uses: `oak`. */
  name: string;
  /** What a felled one is made of. */
  woodMaterialPath: string;
  /** What a felled one drops, or null. */
  seedPath: string | null;
  /** Whole standards, true at `standStamp`. */
  standing: number;
  /** What this ground carries. */
  capacity: number;
  /** Standards per game year, at full satisfaction. */
  incrementPerYear: number;
}

/** A tree somebody planted here — the ledger's line, by the tree's key. */
export interface StandPlanting {
  plantKey: string;
  /** What the tree is called, as it presents at planting: `an oak sapling`. */
  name: string;
  /** The planter's identity path (never a template path — a PERSON key). */
  planter: string;
  planterName: string;
  speciesPath: string;
  /** The game day it went in — a whole number of days since the epoch. */
  gameDay: number;
}

/** One felling. */
export interface StandCut {
  speciesPath: string;
  at: number;
  by: string;
}

export interface Stand {
  getMix(): readonly StandSpecies[];
  setMix(value: StandSpecies[]): void;
  getStandStamp(): number;
  getPlantings(): readonly StandPlanting[];
  getCutLog(): readonly StandCut[];
  /** The species entry for a player's word, or null. */
  speciesNamed(word: string): StandSpecies | null;
  /** The species with the most standing right now, or null. */
  thickestSpecies(): StandSpecies | null;
  /** Whole standards of `sp` standing now — derived, stamping nothing. */
  standingNow(sp: StandSpecies): number;
  /** The drought factor the increment runs at right now, `[0, 1]`. */
  standGrowthFactor(): number;
  /** Whether anything at all stands here worth the axe. */
  hasStanding(): boolean;
  /** Take one standard of `speciesPath`; `false` when none stands. */
  cut(speciesPath: string, nowS: number, by: string): boolean;
  recordPlanting(p: StandPlanting): void;
  removePlanting(plantKey: string): void;
  /** What the stand drinks, in litres a game day — the soil hook's term. */
  standTranspirationPerGameDay(): number;
  /** The derived reading, in words. */
  standPhrase(): string;
}

/** Whole standards → "about twenty-four trees' worth". */
function treesWorth(n: number): string {
  const whole = Math.floor(n);
  if (whole <= 0) return 'nothing worth the axe';
  if (whole === 1) return "one tree's worth";
  return `about ${GrammarApi.inWords(whole)} trees' worth`;
}

function ordinalDay(day: number): string {
  const d = Math.max(1, Math.floor(day));
  const mod100 = d % 100;
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? 'th'
      : d % 10 === 1
        ? 'st'
        : d % 10 === 2
          ? 'nd'
          : d % 10 === 3
            ? 'rd'
            : 'th';
  return `${d}${suffix}`;
}

/** Game seconds now, or `null` when no world clock stands. */
function nowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
  return WorldClockApi.getNow().rawValue();
}

function clampUnit(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Append the stand's reading to the host's long description on `look`.
 * Synchronous, reads the host's own fields and the world clock; no
 * memo, no registry.
 */
function standAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!MixinApi.isActive(host, STAND_MIXIN)) return text;
  const line = (host as unknown as Stand).standPhrase();
  if (!line) return text;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

export function StandMixin<TBase extends MixinConstructor<Stuff & Reserved>>(
  Base: TBase,
) {
  // Declared-then-returned (the Slotted/Meltable shape) so method
  // decorators are legal — a class EXPRESSION cannot carry them.
  class StandMixin extends Base implements Stand {
    static _mixinName = STAND_MIXIN;

    /**
     * ⭐ The stand affords the felling of it, to whoever is standing in
     * the place (`inventory` — a location's occupants). See the header.
     */
    static commandContributions = {
      self: ['trade/forestry/cmd/forestry/fell.yaml'],
      inventory: ['trade/forestry/cmd/forestry/fell.yaml'],
    };

    /** The derived reading, rendered into the host's `look`. */
    static markupAugmenters: MarkupAugmenter[] = [standAugmenter];

    static fieldMeta: FieldMeta = {
      mix: { persistent: true, authorable: true },
      standStamp: { persistent: true },
      plantings: { persistent: true },
      cutLog: { persistent: true },
    };

    /** What stands here, by species. Authored as `mix:` on the row. */
    public mix: StandSpecies[] = [];

    /** Game-seconds the `standing` figures are true at; `0` = never. */
    public standStamp = 0;

    /** Who planted what here, by the tree's key. */
    public plantings: StandPlanting[] = [];

    /** Every felling. */
    public cutLog: StandCut[] = [];

    // ---------- reads ----------

    public getMix(): readonly StandSpecies[] {
      return this.mix;
    }

    public setMix(value: StandSpecies[]): void {
      this.mix = Array.isArray(value)
        ? value.map((sp) => ({
            speciesPath: String(sp.speciesPath ?? ''),
            name: String(sp.name ?? ''),
            woodMaterialPath: String(sp.woodMaterialPath ?? ''),
            seedPath: sp.seedPath ? String(sp.seedPath) : null,
            standing: Math.max(0, Number(sp.standing) || 0),
            capacity: Math.max(0, Number(sp.capacity) || 0),
            incrementPerYear: Math.max(0, Number(sp.incrementPerYear) || 0),
          }))
        : [];
    }

    public getStandStamp(): number {
      return this.standStamp;
    }

    public getPlantings(): readonly StandPlanting[] {
      return this.plantings;
    }

    public getCutLog(): readonly StandCut[] {
      return this.cutLog;
    }

    public speciesNamed(word: string): StandSpecies | null {
      const w = word.trim().toLowerCase();
      if (!w) return null;
      return (
        this.mix.find((sp) => sp.name.toLowerCase() === w) ??
        this.mix.find((sp) => `${sp.name.toLowerCase()}s` === w) ??
        this.mix.find((sp) => sp.speciesPath.toLowerCase().endsWith(`/${w}`)) ??
        null
      );
    }

    public thickestSpecies(): StandSpecies | null {
      let best: StandSpecies | null = null;
      let most = 0;
      for (const sp of this.mix) {
        const n = this.standingNow(sp);
        if (n > most) {
          most = n;
          best = sp;
        }
      }
      return best;
    }

    /**
     * The moisture factor the increment runs at — the Field's drought
     * curve for a sward. `null` moisture (no soil composed, or a reserve
     * the row did not author) means UNMODELLED, which is 1, never 0.
     */
    public standGrowthFactor(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isSoil(self)) return 1;
      const m = self.soilMoistureFraction();
      if (m === null) return 1;
      return clampUnit(m / MOISTURE_HAPPY_AT);
    }

    public standingNow(sp: StandSpecies): number {
      const nowS = nowSeconds();
      if (nowS === null || this.standStamp === 0) {
        return Math.min(sp.capacity, sp.standing);
      }
      const elapsed = Math.max(0, nowS - this.standStamp);
      const years = elapsed / SECONDS_PER_GAME_YEAR;
      const grown = sp.incrementPerYear * this.standGrowthFactor() * years;
      return Math.min(sp.capacity, sp.standing + grown);
    }

    public hasStanding(): boolean {
      return this.mix.some((sp) => this.standingNow(sp) >= 1);
    }

    // ---------- mutators ----------

    /**
     * Settle EVERY species to its derived figure, refuse if the chosen
     * one derives below one whole tree, take one, stamp, log. The caller
     * captures the host afterwards. Sealed — this method owns the
     * ledger's invariant (a cut is the only thing that stamps).
     */
    @Final
    @Unshadowable
    public cut(speciesPath: string, nowS: number, by: string): boolean {
      const chosen = this.mix.find((sp) => sp.speciesPath === speciesPath);
      if (!chosen) return false;
      const settled = this.mix.map((sp) => this.standingNow(sp));
      const idx = this.mix.indexOf(chosen);
      if ((settled[idx] ?? 0) < 1) return false;
      this.mix.forEach((sp, i) => {
        sp.standing = settled[i] ?? sp.standing;
      });
      chosen.standing = Math.max(0, chosen.standing - 1);
      this.standStamp = nowS;
      this.cutLog.push({ speciesPath, at: nowS, by });
      return true;
    }

    public recordPlanting(p: StandPlanting): void {
      // Idempotent on the tree: a restore that re-seats a planted
      // standard inside somebody's command frame must not plant it twice.
      if (this.plantings.some((q) => q.plantKey === p.plantKey)) return;
      this.plantings.push({ ...p });
    }

    public removePlanting(plantKey: string): void {
      this.plantings = this.plantings.filter((q) => q.plantKey !== plantKey);
    }

    // ---------- the soil hook's term ----------

    public standTranspirationPerGameDay(): number {
      let standing = 0;
      for (const sp of this.mix) standing += this.standingNow(sp);
      return standing * TRANSPIRATION_L_PER_STANDARD_DAY;
    }

    // ---------- the reading ----------

    public standPhrase(): string {
      if (this.mix.length === 0 && this.plantings.length === 0) return '';
      const lines: string[] = [];
      let anything = false;
      for (const sp of this.mix) {
        const n = this.standingNow(sp);
        if (n < 1) continue;
        anything = true;
        const name = GrammarApi.cap(sp.name);
        lines.push(
          lines.length === 0
            ? `${name} stands here — ${treesWorth(n)}, old, planted by nobody alive.`
            : `${name} — ${treesWorth(n)}.`,
        );
      }
      if (!anything) {
        lines.push(
          this.plantings.length > 0
            ? 'Nothing stands here that is worth the axe — stumps, brash, and the saplings somebody planted.'
            : 'Nothing stands here that is worth the axe — stumps and brash.',
        );
      }
      for (const p of this.plantings) {
        lines.push(plantingLine(p));
      }
      return lines.join(' ');
    }
  }
  return StandMixin;
}

/** *"An oak sapling, planted by Tam Ferrier on the 4th day of the 2nd year."* */
function plantingLine(p: StandPlanting): string {
  const t = Quantity.of(p.gameDay * SECONDS_PER_GAME_DAY, 's');
  const d = new DefaultCalendar().decompose(t);
  const dayOfYear = (p.gameDay % DAYS_PER_GAME_YEAR) + 1;
  return `${GrammarApi.cap(p.name)}, planted by ${p.planterName} on the ${ordinalDay(dayOfYear)} day of the ${ordinalDay(d.year)} year.`;
}
