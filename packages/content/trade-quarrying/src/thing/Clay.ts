/**
 * Clay — ⭐⭐ **a lump of clay is a COMPOSITION** (ceramics M3, D12).
 *
 * The clay brick you get is the clay you built. A clay MATERIAL row says
 * what a kind of clay is made of (`earth/clay`: half clay mineral, a third
 * sand, some iron, lime and organic matter); this lump's own `alloying`
 * records what was kneaded into it since (sand, grog, breeze — the temper
 * pit's blend by mass). Everything a brickmaker or a potter reads off a clay
 * DERIVES from that composition:
 *
 *  - `plasticity()` — its clay-mineral share, raised by weathering;
 *  - `crackRisk()` — fat (plastic) clay shrinks and cracks as it dries;
 *    sand, grog and breeze open it up;
 *  - `firedColor()` — the iron in it: red, buff, or near white;
 *  - `refractoriness()` — little iron, lime and organic flux, much clay
 *    mineral: a FIRECLAY that stands a furnace's heat.
 *
 * ⭐ And it has a YEAR. Dug in autumn and left in a heap outside, a winter's
 * freeze-thaw crossings break it up and mellow it (`weatheredDays`, advanced
 * on read by its place's `freezeThawDaysSince` — 0 indoors), up to
 * `ceramics.weathering.ceilingDays`: a heap kept in a shed stays raw.
 *
 * Why quarrying owns the class: `dig` mints it (the band's `wins:` row),
 * the burner mints ash so fuel owns ash — the trade whose act mints a thing
 * owns its class. It is a `Lump` (pools, has a temperature, so it fires by
 * its material's heat transitions) with a composition and a water state.
 */

import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { CompositionEntry } from '@saxonberg/server/mud/lib/material/Material';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import { CompositionMixin } from '@saxonberg/server/mud/lib/material/Composition';
import { WaterActivityMixin } from '@saxonberg/server/mud/lib/material/WaterActivity';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import Lump from './Lump';

/** One game day, s (a freeze-thaw count is in whole days). */
const DAY_S = 86_400;

/** The pack's dial, with its literal fallback. */
function ceramicsDial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw == null || raw === '') return fallback;
    const n = Number.parseFloat(String(raw));
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/** Game-seconds now, or `null` when no world clock runs. */
function nowS(): number | null {
  if (!StuffApi.findByTemplatePath('/platform/idea/WorldClockRegistry')) return null;
  return WorldClockApi.getNow().rawValue();
}

/** The constituent shares a clay is read by, from its effective composition. */
export interface ClayShares {
  clayMineral: number;
  /** Sand, grog and breeze — what opens a clay up. */
  opener: number;
  iron: number;
  lime: number;
  organic: number;
}

/** Sort composition entries into the shares, by each constituent's material TAGS. */
function sharesOf(entries: readonly CompositionEntry[]): ClayShares {
  const out: ClayShares = { clayMineral: 0, opener: 0, iron: 0, lime: 0, organic: 0 };
  for (const e of entries) {
    const m = StuffApi.findByTemplatePath<Material>(e.materialPath) ?? null;
    if (m === null) continue;
    if (m.hasTag('clay-mineral')) out.clayMineral += e.fraction;
    else if (m.hasTag('silica') || m.hasTag('grog') || m.hasTag('breeze')) out.opener += e.fraction;
    else if (m.hasTag('iron')) out.iron += e.fraction;
    else if (m.hasTag('carbonate')) out.lime += e.fraction;
    else if (m.hasTag('organic')) out.organic += e.fraction;
  }
  return out;
}

/** A weathering word for a heap — what `look` says of it. */
function weatheringPhrase(days: number, ceiling: number): string {
  if (days <= 0) return 'It is fresh-dug and raw, unweathered.';
  if (days < ceiling / 2) return 'It has weathered a little — crumbling at the edges.';
  return 'It is frost-broken and mellow, crumbled fine by a winter out.';
}

const clayAugmenter: MarkupAugmenter = (text, host, _viewer, opts) => {
  if (opts?.filter) return text;
  if (host.isDestroyed()) return text;
  const clay = host as unknown as Partial<Clay>;
  if (typeof clay.getWeatheredDays !== 'function') return text;
  const line = weatheringPhrase(
    clay.getWeatheredDays(),
    ceramicsDial('ceramics.weathering.ceilingDays', 40),
  );
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
};

const ClayBase = CompositionMixin(WaterActivityMixin(Lump));

export default class Clay extends ClayBase {
  static markupAugmenters: MarkupAugmenter[] = [clayAugmenter];

  static fieldMeta: FieldMeta = {
    // ⭐ How many freeze-thaw days this clay has weathered (ceramics S2) —
    // persistent: a heap's winter is in it.
    weatheredDays: { persistent: true, authorable: true },
    // The day-aligned game-second the weathering was last counted to.
    weatherCheckedS: { persistent: true, runtimeState: true },
  };

  public weatheredDays = 0;
  public weatherCheckedS = 0;

  /** The lot about to be absorbed, captured in `canMergeWith` (Ore's rule). */
  private _absorbing: {
    stuffId: string;
    quantity: number;
    weatheredDays: number;
    alloying: CompositionEntry[];
  } | null = null;

  /** Reentry guard for the weathering read. */
  private _weathering = false;

  // ---------- the year ----------

  /** Freeze-thaw days weathered, brought current first. */
  public getWeatheredDays(): number {
    this.reconcileWeathering();
    return this.weatheredDays;
  }

  public setWeatheredDays(value: number): void {
    this.weatheredDays = Number.isFinite(value) && value > 0 ? value : 0;
  }

  /**
   * Count the WHOLE days since the stamp that the heap's place crossed
   * freezing. Day-aligned on both ends, so two reads in one day never
   * count that day twice.
   */
  private reconcileWeathering(): void {
    if (this._weathering) return;
    const now = nowS();
    if (now === null) return;
    const today = Math.floor(now / DAY_S) * DAY_S;
    if (this.weatherCheckedS === 0) {
      this.weatherCheckedS = today;
      return;
    }
    if (!(today > this.weatherCheckedS)) return;
    this._weathering = true;
    try {
      const place = this.placeOf();
      const ceiling = ceramicsDial('ceramics.weathering.ceilingDays', 40);
      if (place !== null && this.weatheredDays < ceiling) {
        // ⚠ The place counts days from `atS` up to NOW; only completed
        // days are wanted, so a crossing today is left for tomorrow.
        const days = place.freezeThawDaysSince(this.weatherCheckedS);
        const todayCounted = place.freezeThawDaysSince(today);
        const whole = Math.max(0, days - todayCounted);
        this.weatheredDays = Math.min(ceiling, this.weatheredDays + whole);
      }
      this.weatherCheckedS = today;
    } finally {
      this._weathering = false;
    }
  }

  /** The nearest place up the container chain that has its own air. */
  private placeOf(): (Stuff & { freezeThawDaysSince(atS: number): number }) | null {
    let at: Stuff | null = this.getContainer() as unknown as Stuff | null;
    for (let hops = 0; at !== null && hops < 16; hops++) {
      if (MixinApi.isAtmospheric(at)) return at;
      at = MixinApi.isContainable(at) ? (at.getContainer() as unknown as Stuff | null) : null;
    }
    return null;
  }

  // ---------- what the composition says ----------

  /** The constituent shares, from the effective composition. */
  public shares(): ClayShares {
    return sharesOf(this.getEffectiveComposition());
  }

  /**
   * ⭐ How plastic it is, `0..1` — its clay-mineral share, raised up to a
   * third by a winter's weathering (frost opens the plates, and a weathered
   * clay throws better).
   */
  public plasticity(): number {
    const ceiling = ceramicsDial('ceramics.weathering.ceilingDays', 40);
    const weathered = ceiling > 0 ? Math.min(1, this.getWeatheredDays() / ceiling) : 0;
    return Math.min(1, this.shares().clayMineral * (1 + 0.3 * weathered));
  }

  /**
   * ⭐ How likely it is to crack as it dries, `0..1`: a fat clay shrinks
   * hard; sand, grog and breeze open it so the water can leave.
   */
  public crackRisk(): number {
    const r = this.plasticity() * 1.6 - this.shares().opener * 1.2;
    return r < 0 ? 0 : r > 1 ? 1 : r;
  }

  /** The colour it fires, by the iron in it. */
  public firedColor(): 'red' | 'buff' | 'white' {
    const iron = this.shares().iron;
    return iron >= 0.04 ? 'red' : iron >= 0.015 ? 'buff' : 'white';
  }

  /**
   * ⭐ Whether it stands a furnace's heat: little flux (iron, lime,
   * organic), much clay mineral — a fireclay.
   */
  public refractoriness(): 'refractory' | 'common' {
    const s = this.shares();
    return s.iron + s.lime + s.organic < 0.05 && s.clayMineral >= 0.6 ? 'refractory' : 'common';
  }

  // ---------- pooling ----------

  /** Capture the absorbed lot before it is destructed (Ore's rule). */
  public override canMergeWith(other: Stuff): boolean {
    const ok = super.canMergeWith(other);
    const lot = other as unknown as Partial<Clay>;
    this._absorbing =
      ok && typeof lot.getWeatheredDays === 'function' && typeof lot.getQuantity === 'function'
        ? {
            stuffId: other.stuffId,
            quantity: lot.getQuantity(),
            weatheredDays: lot.getWeatheredDays(),
            alloying: [...(lot.getAlloying?.() ?? [])],
          }
        : null;
    return ok;
  }

  /** ⭐ Two heaps pooled are one heap: weathering and temper mass-weighted. */
  public override onMerged(absorbed: Stuff): void {
    const stashed = this._absorbing;
    this._absorbing = null;
    const total = this.getQuantity();
    if (
      stashed !== null &&
      stashed.stuffId === absorbed.stuffId &&
      total > 0 &&
      stashed.quantity > 0 &&
      stashed.quantity <= total
    ) {
      const mine = total - stashed.quantity;
      this.weatheredDays =
        (this.weatheredDays * mine + stashed.weatheredDays * stashed.quantity) / total;
      const acc = new Map<string, number>();
      for (const e of this.getAlloying()) {
        acc.set(e.materialPath, (acc.get(e.materialPath) ?? 0) + (e.fraction * mine) / total);
      }
      for (const e of stashed.alloying) {
        acc.set(
          e.materialPath,
          (acc.get(e.materialPath) ?? 0) + (e.fraction * stashed.quantity) / total,
        );
      }
      this.setAlloying([...acc].map(([materialPath, fraction]) => ({ materialPath, fraction })));
    }
    super.onMerged(absorbed);
  }

  /** A lump cut off a heap is the heap's clay. */
  public override onSplit(splitoff: Stuff): void {
    const cut = splitoff as unknown as Partial<Clay>;
    if (typeof cut.setWeatheredDays === 'function') cut.setWeatheredDays(this.weatheredDays);
    if (typeof cut.setAlloying === 'function') cut.setAlloying(this.getAlloying());
    super.onSplit(splitoff);
  }
}
