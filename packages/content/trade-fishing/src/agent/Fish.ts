/**
 * Fish — **the individual, drawn out of the record and alive until it is
 * not** (fishing D6).
 *
 * A fish is a `KeptAnimal`: the bond, a name, a home, belief, the
 * residency pin — everything *a kept fish is a kept animal in a bowl*
 * needs, and nothing re-derived. It is also **`Contaminable`**, which
 * nothing else kept is: a fish landed below the outfall carries the
 * city's water in its flesh, and the butcher hands that load onto every
 * cut. The cat, the collie and the canary stay clean — the mixin is
 * here and not on `KeptAnimal` for the spoilage doc's `Weapon` lesson.
 *
 * ## Alive until it is not
 *
 * The landed fish is alive. Moving it into a hand re-checks its medium
 * (the respiration move hook), the crisis drain runs, and it dies in the
 * shipped dying window — `lifecycleState: dead`, the Postmortem clock
 * started — after which `butcher` works on it. Killing is not a fishing
 * verb; a bowl of water is the only thing that stops it.
 *
 * ## What `look` says
 *
 * Its size in words, never a number (`sizeWords`), and — for a dead
 * fish — the freshness band its flesh has reached, in the shipped band
 * words. Nothing says what it carries.
 *
 * ## Under `/trade/fishing/agent/`, not `/stuff/agent/`
 *
 * The SPECIES are commons rows; the individual a trade materializes is
 * the trade's (the plan's D6, Risks 19).
 */

import { KeptAnimal } from '@saxonberg/server/mud/lib/creature/KeptAnimal';
import { ContaminableMixin } from '@saxonberg/server/mud/lib/material/Contaminable';
import { Freshness } from '@saxonberg/server/mud/lib/material/Freshness';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';

const FishBase = ContaminableMixin(KeptAnimal);

export default class Fish extends FishBase {
  /**
   * ⭐ The fish affords `release` to whoever holds it — a static on the
   * class, never a row key.
   */
  static commandContributions: CommandContributions = {
    self: [],
    peers: ['trade/fishing/cmd/fishing/release.yaml'],
    environment: [],
  };

  static markupAugmenters: MarkupAugmenter[] = [sizeLine, turnedLine];

  static fieldMeta: FieldMeta = {
    lengthM: { persistent: true },
  };

  /** Its length in metres — seeded at landing; `0` = unstated (the species' stature). */
  public lengthM = 0;

  public getLengthM(): number {
    return this.lengthM;
  }
  public setLengthM(value: number): void {
    this.lengthM = Number.isFinite(value) && value > 0 ? value : 0;
  }

  /** The length that `sizeWords` and the contest read: its own, else the species' stature. */
  public effectiveLengthM(): number {
    if (this.lengthM > 0) return this.lengthM;
    return this.getSpecies()?.getStature() ?? 0;
  }

  /**
   * ⭐ Its size in words, never a number. The bands are a hand's worth
   * of anglers' phrases; the game never shows the figure.
   */
  public sizeWords(): string {
    const m = this.effectiveLengthM();
    if (m <= 0) return 'of no size worth mentioning';
    if (m < 0.1) return 'a finger long';
    if (m < 0.2) return 'a hand long';
    if (m < 0.3) return 'a hand and a half long';
    if (m < 0.45) return 'a foot long';
    if (m < 0.65) return 'as long as your forearm';
    if (m < 1.0) return 'as long as your arm';
    if (m < 1.6) return 'longer than your arm';
    return 'longer than you are tall';
  }
}

/* ───────────────────────── the augmenters ───────────────────────── */

function sizeLine(text: string, host: Stuff): string {
  if (!(host instanceof Fish) || host.isDestroyed()) return text;
  const line = `It is ${host.sizeWords()}.`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

/** A dead fish reads the freshness band its flesh has reached — a band word, never a number. */
function turnedLine(text: string, host: Stuff): string {
  if (!(host instanceof Fish) || host.isDestroyed()) return text;
  if (!MixinApi.isPostmortem(host) || host.sinceDeath() === null) return text;
  const band = Freshness.bandFor(host.freshnessLoad());
  const line =
    band === 'fresh'
      ? 'It is dead, and fresh.'
      : band === 'tainted'
        ? 'It is dead, and beginning to turn.'
        : band === 'spoiled'
          ? 'It has turned.'
          : 'It is rotten.';
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}
