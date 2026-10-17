/**
 * DirtKind — one KIND of dirt, as a leaf Idea row (cleanliness D2).
 *
 * The `Joint` shape exactly: pure data authored under any pack root
 * (`<root>/idea/DirtKind/<key>.yaml`), read by `DirtKindCatalogue` straight
 * from `template.data`, never cloned as live Stuff. What a dirt IS — the
 * word for something carrying it, whether it is a film you wash or a
 * debris you sweep, which cleanser actions lift it, whether hot water sets
 * it — is data; what depositing and washing DO is `SoilableMixin`'s.
 *
 * ⭐ So a new dirt is a row: the mining pack ships `dust` under its own
 * root, and nothing in the engine changes.
 *
 * `key` is the durable join — a deposit is recorded against the key
 * (`blood`), never the template path.
 */

import { Idea } from "../../lib/stuff/Idea";
import type { FieldMeta } from "../../lib/mixin";
import type { CleanserAction } from "./Cleanser";

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
  };

  public getKey(): string {
    return this.key;
  }
}
