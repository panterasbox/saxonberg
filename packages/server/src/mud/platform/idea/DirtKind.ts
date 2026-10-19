/**
 * DirtKind — one KIND of dirt, as a leaf Idea row (cleanliness D2).
 *
 * A CLOSED platform vocabulary (cleanliness B50): every row lives at
 * `DIRT_KIND_ROOT + key` (`/platform/idea/DirtKind/<key>.yaml`), so a kind
 * key IS its path — the row loads by path the first time something is
 * soiled with it, with no catalogue and no scan. What a dirt IS — the
 * word for something carrying it, whether it is a film you wash or a
 * debris you sweep, which cleanser actions lift it, whether hot water sets
 * it — is data; what depositing and washing DO is `SoilableMixin`'s.
 *
 * ⭐ So a new dirt is a row — in the platform pack, beside the other ten:
 * nothing in the engine changes, and nothing searches for it.
 *
 * `key` is the durable join — a deposit is recorded against the key
 * (`blood`), never the template path.
 */

import { Idea } from "../../lib/stuff/Idea";
import type { FieldMeta } from "../../lib/mixin";
import { CLEANSER_ACTIONS, type CleanserAction } from "./Cleanser";

/**
 * What a dirt does on a surface — the three things the kernel does
 * something different with. `film` is washed off; `debris` is swept up;
 * a `stain` is a film that can SET (and then answers only to what its
 * row's `setAnswersTo` names).
 */
export const DIRT_FORMS = ["film", "debris", "stain"] as const;
export type DirtForm = (typeof DIRT_FORMS)[number];

/** The runtime descriptor the catalogue caches. */
export interface DirtKindDescriptor {
  key: string;
  /** The word a band sentence uses: *bloodied*, *greasy*, *muddy*. */
  adjective: string;
  form: DirtForm;
  /** Which cleanser actions remove it. Water alone always does a little. */
  answersTo: CleanserAction[];
  /** Washing at or above this sets it (blood: 318 K); `null` never sets. */
  setsAboveK: number | null;
  /** What a SET deposit still answers to (blood: `oxidiser` only). */
  setAnswersTo: CleanserAction[];
  /** A strewn absorbent turns this film into debris (blood, grease). */
  absorbedBy: boolean;
  /** What a deposit seeds on a Contaminable host: pathogen → severity. */
  contaminates: Record<string, number>;
  /** Water alone lifts this share per standard wash (mud a lot, grease
   * almost none). */
  waterLifts: number;
  /** ⭐ A dry brushing (or a beating) lifts this share — what is LOOSE:
   * crumbs, ash, flour, dried mud. Grease, sweat and a stain take nothing
   * from a brush. 0 by default. */
  brushLifts: number;
  /** ⭐ What it smells of, and how strongly — ppm per unit of load (B57).
   * Sweat, dung, sour milk; `null` for a dirt with no nose (mud, ash). */
  odour: DirtOdour | null;
}

/** A dirt's smell (`DirtKind.odour`). */
export interface DirtOdour {
  /** The odour identity the smell walk names (*stale sweat*). */
  identity: string;
  /** ppm emitted per unit of load. */
  ppmPerLoad: number;
}

export default class DirtKind extends Idea {
  /** The class every DirtKind row names — what the catalogue warms by. */
  static readonly CLASS_PATH = "/platform/idea/DirtKind";

  public key: string = "";
  public adjective: string = "";
  public form: DirtForm = "film";
  public answersTo: CleanserAction[] = [];
  public setsAboveK: number | null = null;
  public setAnswersTo: CleanserAction[] = [];
  public absorbedBy: boolean = false;
  public contaminates: Record<string, number> = {};
  public waterLifts: number = 0.3;
  public brushLifts: number = 0;
  public odour: DirtOdour | null = null;

  static fieldMeta: FieldMeta = {
    key: { persistent: true },
    adjective: { persistent: true },
    form: { persistent: true },
    answersTo: { persistent: true },
    setsAboveK: { persistent: true },
    setAnswersTo: { persistent: true },
    absorbedBy: { persistent: true },
    contaminates: { persistent: true },
    waterLifts: { persistent: true },
    brushLifts: { persistent: true },
    odour: { persistent: true },
  };

  public getKey(): string {
    return this.key;
  }

  /**
   * ⭐ This row as the chemistry and the look read it — validated, never
   * thrown. Rows live at `DIRT_KIND_ROOT + key` (a closed platform
   * vocabulary, cleanliness B50), so a kind loads BY PATH the first time
   * something is soiled with it — no catalogue, no scan.
   */
  public descriptor(): DirtKindDescriptor | null {
    const why = (r: string): null => {
      console.warn(`DirtKind '${this.getTemplatePath() ?? this.key}': ${r}`);
      return null;
    };
    if (!this.key) return why("no key");
    if (!(DIRT_FORMS as readonly string[]).includes(String(this.form))) {
      return why(`form '${String(this.form)}' is not one of ${DIRT_FORMS.join("|")}`);
    }
    const actions = (v: unknown, field: string): CleanserAction[] | null => {
      if (!Array.isArray(v)) return [];
      for (const a of v) {
        if (!(CLEANSER_ACTIONS as readonly string[]).includes(String(a))) {
          why(`${field} names '${String(a)}', not one of ${CLEANSER_ACTIONS.join("|")}`);
          return null;
        }
      }
      return [...(v as CleanserAction[])];
    };
    const answersTo = actions(this.answersTo, "answersTo");
    const setAnswersTo = actions(this.setAnswersTo, "setAnswersTo");
    if (!answersTo || !setAnswersTo) return null;
    const contaminates: Record<string, number> = {};
    for (const [k, v] of Object.entries(this.contaminates ?? {})) {
      if (typeof v === "number" && v > 0) contaminates[k] = Math.min(1, v);
    }
    const unit = (v: unknown, fallback: number): number =>
      typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
    return {
      key: this.key,
      adjective: this.adjective || this.key,
      form: this.form,
      answersTo,
      setsAboveK: typeof this.setsAboveK === "number" && Number.isFinite(this.setsAboveK) ? this.setsAboveK : null,
      setAnswersTo,
      absorbedBy: this.absorbedBy === true,
      contaminates,
      waterLifts: unit(this.waterLifts, 0.3),
      brushLifts: unit(this.brushLifts, 0),
      odour:
        this.odour &&
        typeof this.odour.identity === "string" &&
        this.odour.identity &&
        typeof this.odour.ppmPerLoad === "number" &&
        this.odour.ppmPerLoad > 0
          ? { identity: this.odour.identity, ppmPerLoad: this.odour.ppmPerLoad }
          : null,
    };
  }
}

/** Where every dirt kind's row lives: `DIRT_KIND_ROOT + key`. */
export const DIRT_KIND_ROOT = "/platform/idea/DirtKind/";
