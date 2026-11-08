/**
 * Aroma — one WORD a nose can read: an `aroma` document, in a tree any pack
 * extends.
 *
 * ⭐ A Document and not an Idea: a word is authored metadata. Nothing writes to
 * one after it loads, nothing acts on one, and nothing should find one with MQL.
 * Each lives at `/aromas/<word>` (a pack ships `content/aromas/<word>.yaml`), so a
 * word IS its path: nothing scans for it and nothing warms a roster.
 *
 * The tree is each document's `parent:`, so `peat-smoke` names `smoke`. A
 * threshold, a discipline and a hedonic curve a word leaves unstated come from
 * its parent, and how deep a reader can name a smell is how far down the chain
 * their competence reaches. A word is a lowercase slug because it is a path leaf;
 * it reads with its hyphens as spaces (`peat-smoke` → *peat smoke*).
 *
 * Loaded on use: a material's setter awaits {@link Aroma.ensure} for each word it
 * names, and a read that finds a word not yet resident starts the load, which
 * `smell`, `taste` and `analyze` wait out ({@link Aroma.settling}). The cache is
 * the memory of what has been read, never a roster.
 *
 * `threshold` is mg/L, and only a DISSOLVED aroma needs it: every other source is
 * authored in odor units directly (1 OU = just detectable).
 */

import { DocumentApi } from '../../api/document';
import { DiagnosticApi } from '../../api/diagnostics';

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

/** What an `aroma` document says, before its parent fills the gaps. */
export interface AromaData {
  parent?: string;
  threshold?: number;
  discipline?: string;
  liking?: HedonicCurve;
}

/** Where every word's document lives: `AROMA_ROOT + word`. */
export const AROMA_ROOT = '/aromas/';

/** A word's shape: a lowercase slug, because it is a path leaf. */
const WORD_SHAPE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
/** How deep a tree may go before it is a mistake. */
const MAX_DEPTH = 8;

export class Aroma {
  /** Every word read so far. */
  private static readonly known = new Map<string, Aroma>();
  /** Loads in flight, by word or by path. */
  private static readonly loading = new Map<string, Promise<unknown>>();

  private constructor(
    private readonly lineage: readonly string[],
    private readonly threshold: number,
    private readonly discipline: string,
    private readonly liking: HedonicCurve | null,
  ) {}

  /** Whether a string could be an aroma word (no document is consulted). @internal */
  public static isWord(word: unknown): word is string {
    return typeof word === 'string' && WORD_SHAPE.test(word);
  }

  /** How a word reads in a sentence: `peat-smoke` → `peat smoke`. @internal */
  public static phraseOf(word: string): string {
    return word.replace(/-/g, ' ');
  }

  /**
   * The word, synchronously, for a read that cannot wait. A word not yet read
   * answers `null` and starts loading; a word with no document records an error an
   * author sees in `errors`, never a quiet loss.
   *
   * @internal the nose's and the setters' own; an author names a word on a row.
   */
  public static resolve(word: string): Aroma | null {
    const found = Aroma.known.get(word);
    if (found) return found;
    if (!Aroma.loading.has(word)) {
      const load = Aroma.ensure(word)
        .catch((err: unknown) => {
          void DiagnosticApi.record({
            path: AROMA_ROOT + word,
            severity: 'error',
            message: `Aroma '${word}' is named but has no document: ${String(err)}`,
          }).catch(() => {});
        })
        .finally(() => Aroma.loading.delete(word));
      Aroma.loading.set(word, load);
    }
    return null;
  }

  /** The word, read with its parents; throws naming the word if there is none. @internal */
  public static async ensure(word: string, depth = 0): Promise<Aroma> {
    const found = Aroma.known.get(word);
    if (found) return found;
    if (depth > MAX_DEPTH) throw new Error(`Aroma '${word}': the tree is deeper than ${MAX_DEPTH}`);
    const doc = await DocumentApi.read(AROMA_ROOT + word);
    if (!doc || doc.getKind() !== 'aroma') {
      throw new Error(`Aroma '${word}' has no document at ${AROMA_ROOT}${word}`);
    }
    const data = doc.getData() as AromaData;
    const parent = data.parent ? await Aroma.ensure(data.parent, depth + 1) : null;
    return Aroma.remember(word, data, parent);
  }

  /**
   * Keep a word read from its document, its parent already known. The one way a
   * word enters the cache: `ensure` calls it, and so does a unit fixture that has
   * no document store behind it. @internal
   */
  public static remember(word: string, data: AromaData, parent: Aroma | null): Aroma {
    const row = new Aroma(
      [...(parent?.lineage ?? []), word],
      data.threshold ?? parent?.threshold ?? 1,
      data.discipline ?? parent?.discipline ?? '',
      data.liking ?? parent?.liking ?? null,
    );
    Aroma.known.set(word, row);
    return row;
  }

  /** A word already read, or `null`; starts nothing. @internal */
  public static resolveKnown(word: string): Aroma | null {
    return Aroma.known.get(word) ?? null;
  }

  /** Forget every word read, so a test starts clean. @internal */
  public static forgetAll(): void {
    Aroma.known.clear();
  }

  /**
   * Shape-check authored smell tags and load each word, so a row naming a word
   * nobody ships fails where it is named. ⚠ Async by design: this is what makes a
   * material's words resident once the material is. @internal
   */
  public static async resolveOdorTags(value: unknown, owner: string): Promise<OdorTag[]> {
    if (!Array.isArray(value)) {
      throw new TypeError(`${owner} must be a list of { word, strength }`);
    }
    const out: OdorTag[] = [];
    for (const [i, raw] of value.entries()) {
      const tag = raw as { word?: unknown; strength?: unknown };
      if (!Aroma.isWord(tag?.word)) {
        throw new TypeError(`${owner}[${i}]: '${String(tag?.word)}' is not an aroma word`);
      }
      if (typeof tag.strength !== 'number' || !(tag.strength > 0)) {
        throw new TypeError(`${owner}[${i}] ('${tag.word}') needs a positive strength (OU/kg)`);
      }
      await Aroma.ensure(tag.word);
      out.push({ word: tag.word, strength: tag.strength });
    }
    return out;
  }

  /**
   * Have {@link Aroma.settling} wait for another load a cold read started (a dirt
   * kind on a restored floor, an ingredient of a restored blend), so the first read
   * after a restart does not lose a smell. @internal
   */
  public static waitFor(key: string, load: Promise<unknown>): void {
    if (Aroma.loading.has(key)) return;
    Aroma.loading.set(
      key,
      load.catch(() => {}).finally(() => Aroma.loading.delete(key)),
    );
  }

  /** Every load a cold read started, to wait out; `null` when there are none. @internal */
  public static settling(): Promise<unknown> | null {
    return Aroma.loading.size > 0 ? Promise.all(Aroma.loading.values()) : null;
  }

  /** This word. */
  public word(): string {
    return this.lineage[this.lineage.length - 1] ?? '';
  }

  /** The tree from its root down to this word. */
  public ancestry(): readonly string[] {
    return this.lineage;
  }

  /** The word at `depth` steps below the root, or this word if it is shallower. */
  public wordAt(depth: number): string {
    const line = this.lineage;
    return line[Math.max(0, Math.min(depth, line.length - 1))] ?? this.word();
  }

  public getThreshold(): number {
    return this.threshold;
  }

  /** The discipline that trains a nose to this word, or `""`. */
  public disciplineOf(): string {
    return this.discipline;
  }

  public getLiking(): HedonicCurve | null {
    return this.liking;
  }
}
