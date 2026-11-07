/**
 * OlfactoryMixin — the nose of a body: the one read of every smell.
 *
 * Anything that wants to know what a body smells goes through {@link
 * Olfactory.nose}, so there is one place to be wrong. It applies, in order:
 * the species' acuity, the body's own born sensitivity per word, adaptation,
 * the floor (nobody reads a note under 1 OU), and then competence, which never
 * changes whether or how strongly you smell something, only how far down the
 * aroma tree you can name it and how many smells you can pull apart.
 *
 * ## Adaptation
 *
 * Staying counts whether or not anyone types `smell`, so exposure is read off
 * where the body has been: `onMoved` stamps the arrival, and a read reconciles.
 * Nothing ticks and nothing walks the air on arrival. A word's level rises
 * while you stay and falls while you are away, one band per `ADAPT_STEP_S`
 * game-seconds. ⚠ The one approximation: the nose tracks stays, not every
 * room's air, so a stay in which a word was never read counts as time away.
 *
 * All of it is runtime state: a restart or a sign-out brings a fresh nose, and
 * a linkdead body freezes because nobody is in it.
 */

import { COMPETENCE_BANDS, type CompetenceBandName } from '../advancement/CompetenceBand';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { PerceptionApi } from '../../api/perception';
import { Seeded } from '../Seeded';
import { TemplatePaths } from '../paths';
import { Scent, type ScentNote, type Smell } from './Smell';
import Aroma from '../../platform/idea/Aroma';
import type { VisionModality } from '../../platform/idea/modalities/VisionModality';
import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Sensor } from '../message/Sensor';
import type { Perception } from './Perception';

/** One band on the intensity ladder, as a multiple. */
const BAND = 30;
/** How far a steady smell falls: two bands, a few steps. */
const ADAPT_MAX = 2;
/** Game-seconds per band of adaptation, up or down. */
const ADAPT_STEP_S = 600;
/** The widest a body's born sensitivity moves a word, in bands. */
const BORN_SPREAD = 0.5;
/** How many smells each band can pull apart. */
const SEPARATION: Record<CompetenceBandName, number> = {
  untrained: 1,
  novice: 2,
  competent: 3,
  proficient: 4,
  expert: Infinity,
};
const ACUITY: Record<string, number> = { keen: 10, normal: 1, dull: 0.1, none: 0 };

export interface NoseOptions {
  /** `analyze`: keep everything the reader can name, not just what leads. */
  deliberate?: boolean;
  /** Your nose is to the thing, so the sentence names it; no source is told. */
  close?: boolean;
}

export interface Olfactory {
  /** What this nose makes of a signal. */
  nose(signal: Smell, opts?: NoseOptions): Scent;
  /** This body's own shift for a word, in bands, drawn from who it is. */
  bornSensitivity(word: string): number;
  /** Nobody is in the body: its nose holds still until someone returns. */
  freezeNose(): void;
}

/** The game clock, or `0` where none is loaded (a unit fixture). */
function nowS(): number {
  return StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)
    ? WorldClockApi.getNow().rawValue()
    : 0;
}

export function OlfactoryMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class OlfactoryMixin extends Base implements Olfactory {
    static _mixinName = 'OlfactoryMixin';

    /** When this body arrived where it stands. */
    private placeStamp: { placeId: string; sinceS: number } | null = null;
    /** Per word: how adapted, in bands, as of the last read that found it. */
    private adaptation: Record<string, { level: number; lastAt: number }> = {};
    /** When nobody was left in the body, or `null`. */
    private frozenAtS: number | null = null;

    public onMoved(
      from: (Stuff & Container) | null,
      to: (Stuff & Container) | null,
    ): void {
      const sup = (Base.prototype as {
        onMoved?: (
          f: (Stuff & Container) | null,
          t: (Stuff & Container) | null,
        ) => void;
      }).onMoved;
      if (typeof sup === 'function') sup.call(this, from, to);
      if (to && to !== from) {
        this.placeStamp = { placeId: to.stuffId, sinceS: nowS() };
      }
    }

    public freezeNose(): void {
      this.frozenAtS ??= nowS();
    }

    public bornSensitivity(word: string): number {
      const self = this as unknown as Stuff;
      const seed = Seeded.ofString(self.getIdentityPath() ?? '');
      const draw = Seeded.unit(seed, Seeded.ofString(`nose:${word}`));
      // Parents and a species' spread are the palate's to know.
      const center = MixinApi.isPalate(self) ? (self.heritage()?.offsets[`nose:${word}`] ?? 0) : 0;
      const spread = MixinApi.isPalate(self) ? self.palateSpread() : 1;
      return center + (draw * 2 - 1) * BORN_SPREAD * spread;
    }

    public nose(signal: Smell, opts: NoseOptions = {}): Scent {
      const self = this as unknown as Stuff;
      const acuity = this.acuity();
      if (acuity === 0 || signal.isEmpty()) return Scent.EMPTY;
      this.thaw();

      type Named = { name: string; ou: number; hops: number; leaf: string; rank: number };
      const named = new Map<string, Named>();
      let best = 0;
      for (const note of signal.notes) {
        const from = signal.sources.filter((s) => s.word === note.word);
        const ownOnly = from.every(
          (s) => s.stuffId === self.stuffId && s.hops === 0 && s.carried !== true,
        );
        const level = ownOnly ? ADAPT_MAX : this.adapt(note.word);
        const ou =
          (note.ou * acuity * BAND ** this.bornSensitivity(note.word)) / BAND ** level;
        if (ou < 1) continue;
        const row = Aroma.resolve(note.word);
        if (!row) continue;
        const maker = from.find((s) => s.maker)?.maker ?? '';
        const rank = Math.max(this.rankIn(maker), this.rankIn(row.disciplineOf()));
        // ⭐ With no discipline behind it at all there is nothing to train: the
        // word is common knowledge, and everyone names it.
        const depth = !maker && !row.disciplineOf() ? Infinity : rank;
        const word = row.wordAt(depth === Infinity ? 1e9 : depth);
        const hops = Math.min(...from.map((s) => s.hops));
        const had = named.get(word);
        named.set(word, {
          name: Aroma.phraseOf(word),
          ou: (had?.ou ?? 0) + ou,
          hops: Math.min(had?.hops ?? hops, hops),
          leaf: had?.leaf ?? note.word,
          rank,
        });
        best = Math.max(best, rank);
      }
      const notes: ScentNote[] = [...named.entries()]
        .sort((a, b) => b[1].ou - a[1].ou)
        .map(([word, n]) => ({
          word,
          name: n.name,
          ou: n.ou,
          hops: n.hops,
          leaf: n.leaf,
          sourceName: opts.close ? null : this.sourceOf(signal, word),
        }));
      if (notes.length === 0) return Scent.EMPTY;
      const keep = opts.deliberate
        ? notes
        : notes.slice(0, SEPARATION[COMPETENCE_BANDS[best] ?? 'untrained']);
      return new Scent(keep);
    }

    /** Your species' nose, as a multiple of an ordinary one. */
    private acuity(): number {
      const self = this as unknown as Stuff;
      const profile = MixinApi.isOrganism(self)
        ? self.getSpecies()?.getOlfactoryProfile()
        : null;
      return ACUITY[profile?.acuity ?? 'normal'] ?? 1;
    }

    /** A freeze ends at the next read: neither rising nor falling happened. */
    private thaw(): void {
      if (this.frozenAtS === null) return;
      const gap = nowS() - this.frozenAtS;
      this.frozenAtS = null;
      if (this.placeStamp) this.placeStamp.sinceS += gap;
      for (const rec of Object.values(this.adaptation)) rec.lastAt += gap;
    }

    /** Reconcile one word's adaptation to now, and answer it. */
    private adapt(word: string): number {
      const now = nowS();
      const sinceS = this.placeStamp?.sinceS ?? now;
      const stay = (now - sinceS) / ADAPT_STEP_S;
      const rec = this.adaptation[word];
      let level: number;
      if (!rec) {
        level = stay;
      } else if (rec.lastAt >= sinceS) {
        level = rec.level + (now - rec.lastAt) / ADAPT_STEP_S;
      } else {
        const away = (sinceS - rec.lastAt) / ADAPT_STEP_S;
        level = Math.max(0, rec.level - away) + stay;
      }
      level = Math.min(ADAPT_MAX, level);
      this.adaptation[word] = { level, lastAt: now };
      return level;
    }

    /** This reader's rank in a discipline; `0` with none, or no record. */
    private rankIn(discipline: string): number {
      const self = this as unknown as Stuff;
      if (!discipline || !MixinApi.isAdvancing(self)) return 0;
      const band = self
        .competenceDigestCached()
        ?.find((d) => d.discipline === discipline)?.band;
      return band ? COMPETENCE_BANDS.indexOf(band) : 0;
    }

    /**
     * ⭐ The nose tells you what, not where: a smell is pinned on a thing only
     * when every source of it is in this room, there is exactly one, and you
     * can see it.
     */
    private sourceOf(signal: Smell, word: string): string | null {
      const self = this as unknown as Stuff;
      const from = signal.sources.filter((s) => {
        const row = Aroma.resolve(s.word);
        return row ? row.ancestry().includes(word) || s.word === word : s.word === word;
      });
      const only = from[0];
      if (!only || from.some((s) => s.hops > 0 || s.stuffId !== only.stuffId)) return null;
      if (only.stuffId === self.stuffId) return null;
      const thing = StuffApi.findById(only.stuffId);
      if (!thing) return null;
      if (!MixinApi.isSensor(self) || !MixinApi.isPerception(self)) return null;
      const vision = PerceptionApi.modalityByName('vision') as VisionModality | null;
      if (!vision?.canSee(self as Stuff & Sensor & Perception, thing)) return null;
      return thing.getPresentation();
    }
  };
}
