/**
 * Aroma — one WORD a nose can read, as a row in a tree any pack extends.
 *
 * A row lives at `TemplatePathPrefixes.aroma + word`, so a word IS its path:
 * nothing scans for it and nothing warms a roster. It loads when something
 * that names it loads (the naming row's setter awaits {@link Aroma.ensure}),
 * and a read that finds a word not yet resident kicks the load, the
 * `dirtKind` shape.
 *
 * ⭐ The row's `extends:` chain IS the tree (`peat-smoke extends smoke`), so
 * a threshold, a discipline and a hedonic curve inherit through the row, and
 * how deep a reader can name a smell is how far down the chain their
 * competence reaches. A word is a lowercase slug because it is a path leaf;
 * it reads with its hyphens as spaces (`peat-smoke` → *peat smoke*).
 *
 * Values are order-of-magnitude literature figures for the named compound
 * class. `threshold` is mg/L, and only a DISSOLVED aroma needs it: every
 * other source is authored in odor units directly (1 OU = just detectable).
 */

import { SingletonMixin } from "../../lib/stuff/Singleton";
import { Idea } from "../../lib/stuff/Idea";
import { Template } from "../../lib/stuff/Template";
import { StuffApi } from "../../api/stuff";
import { DiagnosticApi } from "../../api/diagnostics";
import { TemplatePathPrefixes } from "../../lib/paths";
import type { FieldMeta } from "../../lib/mixin";

/** How one person's liking moves with a note's strength: a hump, in log10 OU. */
export interface HedonicCurve {
  /** Where liking peaks, in log10 of the note's multiple of threshold. */
  peak: number;
  /** How far either side of the peak it falls to indifference. */
  width: number;
  /** +1 a pleasant smell; −1 a repellent one. */
  valence: number;
}

/** A word and its strength: OU of one kilogram at 293 K. */
export interface OdorTag {
  word: string;
  strength: number;
}

/** A word's shape: a lowercase slug, because it is a path leaf. */
const WORD_SHAPE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export default class Aroma extends SingletonMixin(Idea) {
  /** The class every aroma row names. */
  static readonly CLASS_PATH = "/platform/idea/Aroma";

  static fieldMeta: FieldMeta = {
    threshold: { persistent: true },
    discipline: { persistent: true },
    liking: { persistent: true },
  };

  /** Detection threshold, mg/L; what makes a dissolved amount a multiple. */
  public threshold: number = 1;
  /** A discipline that trains a nose to this word, or `""`. */
  public discipline: string = "";
  /** This word's hedonic curve; `null` takes the default. */
  public liking: HedonicCurve | null = null;
  /** Words from the root of the tree to this one. Runtime, from the row. */
  private lineage: string[] = [];

  /** Words in flight from a read that found them cold. */
  private static readonly loading = new Map<string, Promise<unknown>>();

  /** Whether a string could be an aroma word (no row is consulted). @internal */
  public static isWord(word: unknown): word is string {
    return typeof word === "string" && WORD_SHAPE.test(word);
  }

  /** How a word reads in a sentence: `peat-smoke` → `peat smoke`. @internal */
  public static phraseOf(word: string): string {
    return word.replace(/-/g, " ");
  }

  /**
   * The row for a word, synchronously, for a read that cannot wait. A word
   * not yet resident answers `null` and starts loading; a word with no row
   * at all records an error an author sees in `errors`, never a quiet loss.
   *
   * @internal the nose's and the setters' own; an author names a word on a row.
   */
  public static resolve(word: string): Aroma | null {
    const path = TemplatePathPrefixes.aroma + word;
    const row = StuffApi.findByTemplatePath<Aroma>(path);
    if (!row) Aroma.startLoading(word, path);
    return row ?? null;
  }

  private static startLoading(word: string, path: string): void {
    if (Aroma.loading.has(word)) return;
    const load = StuffApi.singleton(path)
      .catch((err: unknown) => {
        void DiagnosticApi.record({
          path,
          severity: "error",
          message: `Aroma '${word}' is named but has no row: ${String(err)}`,
        }).catch(() => {});
      })
      .finally(() => Aroma.loading.delete(word));
    Aroma.loading.set(word, load);
  }

  /** The row for a word, loaded; throws naming the word if there is none. @internal */
  public static async ensure(word: string): Promise<Aroma> {
    const path = TemplatePathPrefixes.aroma + word;
    try {
      return (await StuffApi.singleton(path)) as unknown as Aroma;
    } catch (err) {
      throw new Error(`Aroma '${word}' has no row at ${path}: ${String(err)}`);
    }
  }

  /**
   * Shape-check authored smell tags and load each word's row, so a row naming
   * a word nobody ships fails where it is named. ⚠ Async by design: this is
   * what makes a material's words resident once the material is.
   *
   * @internal
   */
  public static async resolveOdorTags(
    value: unknown,
    owner: string,
  ): Promise<OdorTag[]> {
    if (!Array.isArray(value)) {
      throw new TypeError(`${owner} must be a list of { word, strength }`);
    }
    const out: OdorTag[] = [];
    for (const [i, raw] of value.entries()) {
      const tag = raw as { word?: unknown; strength?: unknown };
      if (!Aroma.isWord(tag?.word)) {
        throw new TypeError(`${owner}[${i}]: '${String(tag?.word)}' is not an aroma word`);
      }
      if (typeof tag.strength !== "number" || !(tag.strength > 0)) {
        throw new TypeError(`${owner}[${i}] ('${tag.word}') needs a positive strength (OU/kg)`);
      }
      await Aroma.ensure(tag.word);
      out.push({ word: tag.word, strength: tag.strength });
    }
    return out;
  }

  /** Every load a cold read started, to wait out; `null` when there are none. @internal */
  public static settling(): Promise<unknown> | null {
    return Aroma.loading.size > 0 ? Promise.all(Aroma.loading.values()) : null;
  }

  public override async onCreate(context?: unknown): Promise<void> {
    await super.onCreate(context);
    const path = this.getTemplatePath() ?? "";
    const row = await Template.findByPath(path);
    // `chain` is nearest-first and excludes this row.
    const parents = (row?.chain ?? []).map((p) => leafOf(p)).reverse();
    this.lineage = [...parents, leafOf(path)];
    for (const parent of parents) await Aroma.ensure(parent);
  }

  /** This row's word. */
  public word(): string {
    return leafOf(this.getTemplatePath() ?? "");
  }

  /** The tree from its root down to this word. */
  public ancestry(): readonly string[] {
    return this.lineage.length > 0 ? this.lineage : [this.word()];
  }

  /** The word at `depth` steps below the root, or this word if it is shallower. */
  public wordAt(depth: number): string {
    const line = this.ancestry();
    return line[Math.max(0, Math.min(depth, line.length - 1))] ?? this.word();
  }

  public getThreshold(): number {
    return this.threshold;
  }

  /** The discipline nearest this word that trains a nose to it, or `""`. */
  public disciplineOf(): string {
    return this.discipline;
  }

  public getLiking(): HedonicCurve | null {
    return this.liking;
  }
}

function leafOf(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}
