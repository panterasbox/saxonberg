/**
 * Strain — ⭐ what a race of silkworm IS, as reference data.
 *
 * A strain is the facts a breeder would quote: the colour of the cocoon
 * it spins, how many broods it makes a year (a one-brood race will not
 * hatch until its eggs have wintered), how heavy a shell it spins on
 * average and how much that varies, and how much of a difference from
 * the mean its offspring inherit — the heritability, `h²`, of the
 * breeder's equation.
 *
 * ⭐⭐ **The strain is not the lot.** A lot carries its own GENETIC mean
 * shell weight, which starts at the strain's and moves by `h² × S` each
 * time somebody keeps a heavier (or lighter) share of cocoons for seed.
 * The strain row is where that walk started and the spread it walks in;
 * it never changes.
 *
 * Reached through the `_strainPath` constituent ref on every egg lot,
 * tray and cocoon stack — nothing warms a roster of strains and nothing
 * needs to: a strain loads with the body that cites it.
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';

export default class Strain extends SingletonMixin(Idea) {
  /** Reference data read synchronously by every rearing; never culled. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'strain singleton; never culled' };
  }

  static fieldMeta: FieldMeta = {
    key: { persistent: true, authorable: true },
    label: { persistent: true, authorable: true },
    colour: { persistent: true, authorable: true },
    broods: { persistent: true, authorable: true },
    heritability: { persistent: true, authorable: true },
    meanShellMg: { persistent: true, authorable: true },
    sdShellMg: { persistent: true, authorable: true },
  };

  /** The stable key (`valley-gold`). */
  public key = '';
  /** What a keeper calls it (*the valley gold*). */
  public label = '';
  /** The cocoon's colour, as a word: gold, white, green. */
  public colour = 'white';
  /** Broods a year: `1` must winter its eggs before they will hatch. */
  public broods = 2;
  /** `h²` — the share of a selection differential the next lot inherits. */
  public heritability = 0.4;
  /** The race's mean shell weight, milligrams — where selection starts. */
  public meanShellMg = 380;
  /** The spread about that mean, one standard deviation, milligrams. */
  public sdShellMg = 40;

  getKey(): string {
    return this.key;
  }
  setKey(value: string): void {
    if (!value) throw new RangeError('Strain.setKey: key must be non-empty');
    this.key = value;
  }

  getLabel(): string {
    return this.label || this.key;
  }
  setLabel(value: string): void {
    this.label = value ?? '';
  }

  getColour(): string {
    return this.colour;
  }
  setColour(value: string): void {
    this.colour = value || 'white';
  }

  getBroods(): number {
    return this.broods;
  }
  setBroods(value: number): void {
    if (value !== 1 && value !== 2) {
      throw new RangeError(`Strain.setBroods: expected 1 or 2, got ${value}`);
    }
    this.broods = value;
  }

  getHeritability(): number {
    return this.heritability;
  }
  setHeritability(value: number): void {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new RangeError(`Strain.setHeritability: must be 0..1, got ${value}`);
    }
    this.heritability = value;
  }

  getMeanShellMg(): number {
    return this.meanShellMg;
  }
  setMeanShellMg(value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`Strain.setMeanShellMg: must be positive, got ${value}`);
    }
    this.meanShellMg = value;
  }

  getSdShellMg(): number {
    return this.sdShellMg;
  }
  setSdShellMg(value: number): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`Strain.setSdShellMg: must be non-negative, got ${value}`);
    }
    this.sdShellMg = value;
  }
}
