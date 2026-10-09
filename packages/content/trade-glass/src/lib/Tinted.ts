/**
 * TintedMixin — a glass good whose COLOUR is derived from the iron (and,
 * for amber ware, the carbon) dissolved in this particular piece.
 *
 * ## ⚠⚠ It stores no colour word — the colour is a function of the alloy
 *
 * The iron fraction is an `AlloyedMixin` minor constituent (stamped at
 * the sand pit, carried through the melt and the gather, merged when
 * cullet re-melts). `lightTransmittance()` turns that fraction into a
 * per-channel transmittance by Beer–Lambert: iron absorbs red and blue
 * weakly and green hardly at all, so more iron ⇒ greener glass; carbon
 * (the amber colourant) absorbs blue hard. No colour is ever written to
 * an instance, which is the immersion firewall — a bottle is green
 * *because of* its sand, never decoratively (glass build D1).
 *
 * ## The host must be Alloyed
 *
 * The mixin reads `fractionOf(...)`, so its host composes `AlloyedMixin`.
 * Its composers (`GlassBottle`, `Sheet`) are all glass by construction —
 * which is exactly why it is a pack `lib/` mixin and NOT on the kernel
 * `Vessel`/`Bottle`: a clay pot or a steel flask would need an "is it
 * glass?" guard, and a guard that re-narrows the host set is the tell
 * that the host is wrong.
 *
 * It answers the kernel's `LightFilter` duck-shape (`lightTransmittance():
 * Colour`) — so a tinted bottle is what light-strike reads to decide how
 * fast the beer inside goes off, the same shape a stained `Window` answers.
 */

import { Colour } from "@saxonberg/server/mud/lib/perception/Colour";
import type { MixinConstructor, FieldMeta } from "@saxonberg/server/mud/lib/mixin";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import { AppApi } from "@saxonberg/server/mud/api/app";
import { Mml } from "@saxonberg/server/mud/api/mml";
import type { MarkupAugmenter } from "@saxonberg/server/mud/api/mml";
import { PerceptionApi } from "@saxonberg/server/mud/api/perception";

export const TINTED_MIXIN = "TintedMixin";

const IRON = "/stuff/idea/material/element/iron";
const CARBON = "/stuff/idea/material/element/carbon";

/** Numeric pack-setting read with a seeded-literal fallback. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === "" || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/** The colour-band word a piece reads as, by iron (then carbon) fraction. */
export type GlassColourBand =
  | "clear"
  | "pale green"
  | "green"
  | "bottle-green"
  | "amber";

/** The shape the mixin's host offers — an Alloyed good. */
type TintedBase = Stuff & {
  fractionOf(materialPath: string): number;
};

export interface Tinted {
  /** Per-channel transmittance of this piece's glass (the LightFilter shape). */
  lightTransmittance(): Colour;
  /** Alias for {@link lightTransmittance}. */
  getColour(): Colour;
  /** The palette-style band word. */
  colourBand(): GlassColourBand;
}

export function TintedMixin<TBase extends MixinConstructor<TintedBase>>(
  Base: TBase,
) {
  return class TintedMixin extends Base implements Tinted {
    static _mixinName: string = TINTED_MIXIN;
    static _mixinRefusal = "{} is not a piece of glass";

    static fieldMeta: FieldMeta = {};

    static markupAugmenters: MarkupAugmenter[] = [tintAugmenter];

    /**
     * ⭐ The optical path length, as a factor on the absorption. A pane
     * is thin (0.5) and a bottle wall full (1.0), so the same glass reads
     * paler in a sheet than in a bottle — the one thing the geometry
     * changes. `Sheet` overrides this.
     */
    protected thicknessFactor(): number {
      return 1.0;
    }

    public lightTransmittance(): Colour {
      const self = this as unknown as TintedBase;
      const fe = self.fractionOf(IRON);
      const c = self.fractionOf(CARBON);
      const t = this.thicknessFactor();
      // Beer–Lambert per channel: transmittance = exp(−(Σ kᵢ·cᵢ)·path).
      // Iron absorbs red and blue but barely green (→ green); carbon
      // absorbs blue hardest (→ amber/brown).
      const kFeR = dial("glass.colour.iron.r", 1.6);
      const kFeG = dial("glass.colour.iron.g", 0.35);
      const kFeB = dial("glass.colour.iron.b", 1.1);
      const kCR = dial("glass.colour.carbon.r", 0.3);
      const kCG = dial("glass.colour.carbon.g", 1.2);
      const kCB = dial("glass.colour.carbon.b", 6.0);
      return Colour.of(
        Math.exp(-(kFeR * fe * 100 + kCR * c * 100) * t),
        Math.exp(-(kFeG * fe * 100 + kCG * c * 100) * t),
        Math.exp(-(kFeB * fe * 100 + kCB * c * 100) * t),
      );
    }

    public getColour(): Colour {
      return this.lightTransmittance();
    }

    public colourBand(): GlassColourBand {
      // Edges are in PERCENT (Fe% / C%), the figures a glassmaker names.
      const self = this as unknown as TintedBase;
      const cPct = self.fractionOf(CARBON) * 100;
      if (cPct >= dial("glass.colour.band.amberAt", 0.1)) return "amber";
      const fePct = self.fractionOf(IRON) * 100;
      if (fePct >= dial("glass.colour.band.bottleAt", 0.6)) return "bottle-green";
      if (fePct >= dial("glass.colour.band.greenAt", 0.2)) return "green";
      if (fePct >= dial("glass.colour.band.paleAt", 0.08)) return "pale green";
      return "clear";
    }
  };
}

/**
 * Append the derived colour band to a glass good's long description —
 * the ordinary authored case the slate names, finally read. Gated on
 * `canMakeOutMarks` (the shipped light gate — you cannot tell a bottle's
 * colour in the dark), and carries the WORD with a client tint on top.
 */
function tintAugmenter(text: string, host: Stuff, viewer: Stuff): string {
  const h = host as unknown as Partial<Tinted>;
  if (typeof h.colourBand !== "function" || typeof h.getColour !== "function") {
    return text;
  }
  if (!PerceptionApi.canMakeOutMarks(viewer, host)) {
    return `${text}\n\nToo dim to tell what colour the glass is.`;
  }
  const band = h.colourBand();
  const word = h.getColour().nearestTag();
  return `${text}\n\nThe glass is ${Mml.color(word, band).toString()}.`;
}
