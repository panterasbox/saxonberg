/**
 * SwardMixin — **the standing grass**, and the reason *pasture is a
 * field* stops being a claim that needs defending.
 *
 * ## ⭐⭐ There is no `use` field, and that is D7
 *
 * Both source slates carried a table committing a field each season to
 * crop / hay / graze / orchard. The table is right about consequences and
 * wrong about mechanism: **land use in reality is a description of what
 * you did, not a declaration.** An enum there would be the engine holding
 * an opinion about something it should be reading.
 *
 * So there is no enum, and the four uses fall out of **two facts** — what
 * is standing on the field, and whether the mouth eating it is standing
 * there too:
 *
 * | | Standing on it | Mouth | Nutrients |
 * |---|---|---|---|
 * | **Crop** | a sown crop | elsewhere | **exported** |
 * | **Hay** | sward | elsewhere | **exported** |
 * | **Graze** | sward | **on the field** | **cycled in place** |
 * | **Orchard** | trees | elsewhere | mixed, multi-year |
 *
 * ⭐ **Fertility follows the mouths** — a sentence a player derives rather
 * than a rule they are told. `mow` and grazing are the same draw on the
 * same reserve; what differs is only whether the animal is standing here,
 * and that difference is where the nitrogen goes.
 *
 * ## ⚠⚠ The key is `sward`, and NOT `forage`
 *
 * Two different things share the English word. What a *person* gathers
 * off rough ground is **forage**; the standing grass a *cow* eats is the
 * **sward**, which is the word the design uses throughout — *sward
 * height*, *the residual*, *the sward*. Different stock, different
 * mechanism, different consumer.
 *
 * ⚠ Forage is **not in this build** — D61 shipped half a system and was
 * cut. The distinction is recorded here anyway, because the follow-on
 * that builds foraging will land beside this key and the first question
 * it has to answer is *why is this not the sward*.
 *
 * ## ⭐ Residual and recovery — the one genuinely new mechanic (D9)
 *
 * Grazed below its residual, a sward has spent its root reserves and
 * regrows slowly. That is what makes moving stock a **read** (move at
 * residual, return at recovery) rather than a timer, and it makes
 * overstocking *and* understocking both mistakes — grass that gets ahead
 * of the herd goes stemmy and its feed quality drops.
 *
 * ⚠ It is a **floor on the reserve below which the regrowth RATE is
 * penalised until it rebuilds** — not a second stock. An overgrazed
 * paddock is a recovery-rate penalty, never a dead field and never a dead
 * animal, which is what lets world-time run freely across an absence
 * (D45: a slope, because it accrues while you are not there).
 *
 * See [docs/subsystems/ranching.md].
 */

import type { MixinConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { Reserve } from '@saxonberg/server/mud/lib/reserve';
import type { Reserved } from '@saxonberg/server/mud/lib/reserve';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const SECONDS_PER_GAME_DAY = 86_400;

export const SWARD_MIXIN = 'SwardMixin';

/** The standing-crop reserve key (theme `cultivation`, with the soil's). */
export const SWARD_RESERVE_KEY = 'sward';

/**
 * Kilograms of dry matter one square metre of sward carries when it is
 * as full as it gets.
 *
 * ⭐ A real figure rather than a dial: a good temperate pasture carries
 * something like 3 000 kg DM/ha at grazing height, which is 0.3 kg/m².
 * Everything downstream — how many animals a field carries, how much hay
 * comes off it, what a winter costs — is that number times an area, so it
 * has to be the real one.
 */
export const SWARD_CEILING_KG_PER_M2 = 0.3;

/**
 * The residual, as a fraction of the ceiling. Below this the sward has
 * spent its root reserves.
 *
 * ⭐ ~1 500 kg DM/ha is the textbook residual for a rotationally grazed
 * ryegrass sward, which is half of the ceiling above — so the number is
 * the practice, not a knob.
 */
export const SWARD_RESIDUAL_FRACTION = 0.5;

/**
 * Peak growth, kg DM per m² per GAME day, under no limitation at all
 * (D89 — never an unqualified "day").
 *
 * A good sward in a good May puts on ~80 kg DM/ha/day = 0.008 kg/m²/day.
 */
const PEAK_GROWTH_KG_PER_M2_DAY = 0.008;

/**
 * How hard the rate is penalised at zero residual, and how fast the
 * penalty lifts as the sward rebuilds. At the residual and above there is
 * no penalty at all.
 */
const OVERGRAZED_RATE_FLOOR = 0.25;

/** Litres of water a kilogram of standing dry matter transpires a game day. */
const TRANSPIRATION_L_PER_KG_DAY = 4;

/** The bands a sward reads in — ⭐ percepts, never a number in words. */
export const SWARD_BANDS = ['bare', 'grazed-out', 'short', 'ready', 'ahead-of-them'] as const;

export type SwardBand = (typeof SWARD_BANDS)[number];

/**
 * Exhaustive by construction: a sixth band cannot be added without
 * writing its sentence.
 *
 * ⭐ Two of these are FAULTS in opposite directions, which is the whole
 * of D9: `grazed-out` is overstocking and `ahead-of-them` is
 * understocking, and a reader who does not know the number can tell them
 * apart and knows which way to move the stock.
 */
const SWARD_PHRASE: Readonly<Record<SwardBand, string>> = {
  bare: 'grazed to the dirt, with the crowns showing',
  'grazed-out': 'eaten right down; it will be slow to come again',
  short: 'short and even, still coming',
  ready: 'a good even cover, about ready for them',
  'ahead-of-them': 'well ahead of them — going stemmy, and seed heads showing',
};

/** The public surface a paddock speaks. */
export interface Sward {
  /** Standing dry matter, kg, reconciled. */
  standingDryMatterKg(): number;
  /** The ceiling this ground's area implies, kg. */
  swardCeilingKg(): number;
  /** Standing matter as a fraction of the ceiling `[0, 1]`. */
  swardFraction(): number;
  /** Whether the sward is below its residual — the D9 penalty state. */
  isOvergrazed(): boolean;
  /** The band, as a percept. */
  swardBand(): SwardBand;
  /** What it looks like. */
  swardPhrase(): string;
  /** Reconcile growth and grazing over elapsed game-time. */
  reconcileSward(): void;
  /**
   * Take dry matter off the sward. Returns what was actually there.
   * ⚠ The SAME call whether a mouth took it or a scythe did — the
   * difference between grazing and haymaking is not here, it is whether
   * the animal was standing on the field (D7).
   */
  drawSward(kg: number): number;
  /** Install the sward reserve for this ground's area. Idempotent. */
  installSward(): void;

  // ---------- the hooks a host answers ----------

  /**
   * @hook Square metres of sward. A field answers its area; anything else
   * answers 0 and never grows a blade.
   */
  swardAreaM2(): number;
  /**
   * @hook The limiting factor on growth this game day, `[0, 1]` — the
   * MINIMUM of moisture, warmth, daylength and nutrient, resolved by the
   * host because only the host knows its own soil and sky.
   */
  swardGrowthFactor(): number;
  /**
   * @hook Kilograms of dry matter the mouths standing on this ground eat
   * per game day. ⭐ *Whether the mouth is here* is the whole of D7's
   * graze row, and this hook is where that fact enters.
   */
  swardGrazingDemandPerGameDay(): number;
  /**
   * @hook Called once per reconcile with what the mouths actually ate
   * and how long the window was.
   *
   * ⭐⭐ **This is where D7's graze row becomes the nitrogen ledger.**
   * The sward knows what was eaten; only the host knows whether that
   * matters — and for a field it matters enormously, because what an
   * animal eats standing on the ground comes back onto the ground.
   */
  onSwardIntegrated(dryMatterEatenKg: number, days: number): void;
}

export function SwardMixin<TBase extends MixinConstructor<Stuff & Reserved>>(
  Base: TBase,
) {
  return class SwardMixin extends Base implements Sward {
    static _mixinName = SWARD_MIXIN;

    /**
     * ⭐ **The sward affords the cutting of it**, outward to whoever is
     * standing in the field.
     *
     * ⚠ A row's `commandContributions:` is dead silently — the affordance
     * is a STATIC ON A CLASS. And it is safe for this mixin to declare
     * its own alongside `ImprovableMixin`'s: `bucketFilenames` collects
     * the class's own static PLUS every mixin in the chain, so two mixins
     * on one host contribute both lists rather than the outer shadowing
     * the inner.
     */
    static commandContributions = {
      self: ['trade/farming/cmd/farming/mow.yaml'],
      inventory: ['trade/farming/cmd/farming/mow.yaml'],
    };

    static fieldMeta: FieldMeta = {
      swardStamp: { persistent: true },
      swardGrazedKg: { persistent: true },
    };

    /** Game-seconds stamp of the last sward reconcile; `0` = never. */
    public swardStamp = 0;

    /**
     * Dry matter the mouths took over the window the last reconcile
     * closed — the legibility figure behind *"the grass is well ahead of
     * them"*, and what makes a paddock's history readable at all.
     */
    public swardGrazedKg = 0;

    protected _reconcilingSward = false;

    // ---------- hooks ----------

    public swardAreaM2(): number {
      return 0;
    }

    public swardGrowthFactor(): number {
      return 1;
    }

    public swardGrazingDemandPerGameDay(): number {
      return 0;
    }

    /** See {@link Sward.onSwardIntegrated}. */
    public onSwardIntegrated(_dryMatterEatenKg: number, _days: number): void {
      /* nothing by default — a paddock that is only grass is only grass */
    }

    // ---------- state ----------

    public swardCeilingKg(): number {
      return this.swardAreaM2() * SWARD_CEILING_KG_PER_M2;
    }

    public installSward(): void {
      const host = this as unknown as Stuff & Reserved;
      if (host.hasReserve(SWARD_RESERVE_KEY)) return;
      const ceiling = this.swardCeilingKg();
      if (ceiling <= 0) return;
      host.setReserve(
        new Reserve(
          SWARD_RESERVE_KEY,
          Quantity.of(ceiling, 'kg'),
          // ⭐ At the residual, not at zero and not full: ground that has
          // just come out of the rough carries the grass that was already
          // on it, and the player's first decision is whether to graze it
          // or let it get ahead.
          Quantity.of(ceiling * SWARD_RESIDUAL_FRACTION, 'kg'),
          'cultivation',
          null,
        ),
      );
    }

    public standingDryMatterKg(): number {
      this.reconcileSward();
      const r = (this as unknown as Reserved).getReserve(SWARD_RESERVE_KEY);
      return r ? r.current.rawValue() : 0;
    }

    public swardFraction(): number {
      const ceiling = this.swardCeilingKg();
      if (ceiling <= 0) return 0;
      return clamp01(this.standingDryMatterKg() / ceiling);
    }

    public isOvergrazed(): boolean {
      return this.swardFraction() < SWARD_RESIDUAL_FRACTION;
    }

    public swardBand(): SwardBand {
      const f = this.swardFraction();
      if (f < 0.08) return 'bare';
      if (f < SWARD_RESIDUAL_FRACTION) return 'grazed-out';
      if (f < 0.7) return 'short';
      if (f < 0.92) return 'ready';
      return 'ahead-of-them';
    }

    public swardPhrase(): string {
      return SWARD_PHRASE[this.swardBand()];
    }

    public drawSward(kg: number): number {
      if (!Number.isFinite(kg) || kg <= 0) return 0;
      this.reconcileSward();
      const host = this as unknown as Stuff & Reserved;
      const r = host.getReserve(SWARD_RESERVE_KEY);
      if (!r) return 0;
      const taken = Math.min(kg, r.current.rawValue());
      if (taken <= 0) return 0;
      host.adjustReserve(SWARD_RESERVE_KEY, Quantity.of(-taken, 'kg'));
      return taken;
    }

    /**
     * Integrate the sward over elapsed game-time: grow by the limiting
     * factor, penalised while below the residual, and drain by whatever
     * is standing here eating it.
     *
     * ⚠ Growth is applied BEFORE grazing over the window, because that is
     * the order it physically happened in — the grass grew through the
     * days the animals were eating it. Doing it the other way would let a
     * herd eat a paddock to nothing across an absence that in fact grew
     * enough to feed them.
     */
    public reconcileSward(): void {
      if (this._reconcilingSward) return;
      const nowS = nowSeconds();
      if (nowS === null) return;
      const host = this as unknown as Stuff & Reserved;
      if (!host.hasReserve(SWARD_RESERVE_KEY)) {
        this.swardStamp = nowS;
        return;
      }
      if (this.swardStamp === 0) {
        this.swardStamp = nowS;
        return;
      }
      const elapsed = nowS - this.swardStamp;
      if (elapsed <= 0) {
        this.swardStamp = nowS;
        return;
      }

      this._reconcilingSward = true;
      try {
        const days = elapsed / SECONDS_PER_GAME_DAY;
        const ceiling = this.swardCeilingKg();
        const r = host.getReserve(SWARD_RESERVE_KEY)!;
        let standing = r.current.rawValue();
        const area = this.swardAreaM2();
        const factor = clamp01(this.swardGrowthFactor());
        const demandPerDay = Math.max(0, this.swardGrazingDemandPerGameDay());

        // ⭐ Stepped rather than closed-form, because the recovery penalty
        // depends on where the sward IS: a paddock grazed into the floor
        // and then left recovers on a curve, not a line. The cap bounds a
        // long absence by STEPS, never by clamping the time (the family
        // clock's rule).
        const steps = Math.min(365, Math.max(1, Math.ceil(days)));
        const dt = days / steps;
        let grazed = 0;
        for (let i = 0; i < steps; i++) {
          const fraction = ceiling > 0 ? standing / ceiling : 0;
          // D9: below the residual the RATE is penalised, and the penalty
          // lifts as the sward rebuilds. Not a second stock.
          const recovery =
            fraction >= SWARD_RESIDUAL_FRACTION
              ? 1
              : OVERGRAZED_RATE_FLOOR +
                (1 - OVERGRAZED_RATE_FLOOR) * (fraction / SWARD_RESIDUAL_FRACTION);
          // ⭐ And growth slows as the sward closes over: a full sward is
          // shading itself, which is why grass that gets ahead of the
          // herd stops paying and starts going stemmy.
          const headroom = ceiling > 0 ? Math.max(0, 1 - fraction) : 0;
          const growth =
            PEAK_GROWTH_KG_PER_M2_DAY * area * factor * recovery * headroom * dt;
          standing = Math.min(ceiling, standing + growth);
          const eaten = Math.min(standing, demandPerDay * dt);
          standing -= eaten;
          grazed += eaten;
        }

        const delta = standing - r.current.rawValue();
        if (delta !== 0) {
          host.adjustReserve(SWARD_RESERVE_KEY, Quantity.of(delta, 'kg'));
        }
        this.swardGrazedKg = grazed;
        this.swardStamp = nowS;
        // ⚠ AFTER the stamp, so a host that reads its own soil in the
        // hook cannot re-enter this reconcile through it.
        this.onSwardIntegrated(grazed, days);
      } finally {
        this._reconcilingSward = false;
      }
    }

    /**
     * What the standing sward drinks, in litres a game day — the term the
     * SOIL asks its host for.
     *
     * ⭐ This is what closes the loop: the grass drinks the soil, the soil
     * is filled by the sky, and a dry month shows up as a sward that
     * stops growing rather than as a message about rain.
     */
    public swardTranspirationPerGameDay(): number {
      const r = (this as unknown as Reserved).getReserve(SWARD_RESERVE_KEY);
      if (!r) return 0;
      return r.current.rawValue() * TRANSPIRATION_L_PER_KG_DAY;
    }
  };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Game-seconds now, or null when no world clock (pre-boot / tests). */
function nowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
  return WorldClockApi.getNow().rawValue();
}
