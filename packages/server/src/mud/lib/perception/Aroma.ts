/**
 * Aroma — one smell a nose can read: an `aroma` document, in a tree any pack
 * extends.
 *
 * ⭐ A Document and not an Idea: an aroma is authored metadata. Nothing writes to
 * one after it loads, nothing acts on one, and nothing should find one with MQL.
 *
 * ⭐⭐ **An aroma is named by its PATH**, a document's only identity. A pack
 * ships `content/aromas/<word>.yaml`, the installer stores it under the pack's
 * root (`/base-library/aromas/smoke`), and every reference names that path — a
 * material's `smells:`, a dirt's `odor:`, another aroma's `parent:`. So two packs
 * may each ship a `smoke` and neither is the other. Nothing scans the kind and
 * nothing warms a roster: a path is read when something names it.
 *
 * The tree is each document's `parent:`, so `peat-smoke` names `smoke`'s path. A
 * threshold, a discipline and a hedonic curve an aroma leaves unstated come from
 * its parent, and how deep a reader can name a smell is how far down the chain
 * their competence reaches. Its WORD is the path's last segment, a lowercase slug,
 * and it reads with its hyphens as spaces (`peat-smoke` → *peat smoke*).
 *
 * Loaded on use: a material's setter awaits {@link Aroma.ensure} for each aroma it
 * names, and a read that finds one not yet resident starts the load, which
 * `smell`, `taste` and `analyze` wait out ({@link Aroma.settling}). The cache is
 * the memory of what has been read, never a roster.
 *
 * `threshold` is mg/L, and only a DISSOLVED aroma needs it: every other source is
 * authored in odor units directly (1 OU = just detectable).
 */

import { DocumentApi } from '../../api/document';
import { DiagnosticApi } from '../../api/diagnostics';
import { StuffApi } from '../../api/stuff';

/** How one person's liking moves with a note's strength: a hump, in log10 OU. */
export interface HedonicCurve {
  /** Where liking peaks, in log10 of the note's multiple of threshold. */
  peak: number;
  /** How far either side of the peak it falls to indifference. */
  width: number;
  /** +1 a pleasant smell; −1 a repellent one. */
  valence: number;
}

/** An aroma (by path) and its strength: OU of one kilogram at 293 K. */
export interface OdorTag {
  aroma: string;
  strength: number;
}

/** What an `aroma` document says, before its parent fills the gaps. */
export interface AromaData {
  /** The parent aroma's path. */
  parent?: string;
  threshold?: number;
  discipline?: string;
  liking?: HedonicCurve;
}


/** An aroma path's shape: absolute, under an `aromas/` directory, a slug leaf. */
const PATH_SHAPE = /^(\/[a-z0-9][a-z0-9._-]*)*\/aromas(\/[a-z][a-z0-9]*(-[a-z0-9]+)*)+$/;
/** How deep a tree may go before it is a mistake. */
const MAX_DEPTH = 8;

export class Aroma {
  /** Every aroma read so far, by path. */
  private static readonly known = new Map<string, Aroma>();
  /** Loads in flight, by path. */
  private static readonly loading = new Map<string, Promise<unknown>>();

  private constructor(
    private readonly lineage: readonly string[],
    private readonly threshold: number,
    private readonly discipline: string,
    private readonly liking: HedonicCurve | null,
  ) {}

  /** Whether a string could be an aroma's path (no document is consulted). @internal */
  public static isAromaPath(path: unknown): path is string {
    return typeof path === 'string' && PATH_SHAPE.test(path);
  }

  /** An aroma's word: the last segment of its path (`/…/aromas/peat-smoke` → `peat-smoke`). @internal */
  public static wordOf(path: string): string {
    return path.slice(path.lastIndexOf('/') + 1);
  }

  /** How an aroma reads in a sentence: `/…/aromas/peat-smoke` → `peat smoke`. @internal */
  public static phraseOf(path: string): string {
    return Aroma.wordOf(path).replace(/-/g, ' ');
  }

  /**
   * The aroma, synchronously, for a read that cannot wait. One not yet read
   * answers `null` and starts loading; a path with no document records an error an
   * author sees in `errors`, never a quiet loss.
   *
   * @internal the nose's and the setters' own; an author names a path on a row.
   */
  public static resolve(path: string): Aroma | null {
    const found = Aroma.known.get(path);
    if (found) return found;
    if (!Aroma.loading.has(path)) {
      const load = Aroma.ensure(path)
        .catch((err: unknown) => {
          void DiagnosticApi.record({
            path,
            severity: 'error',
            message: `Aroma '${path}' is named but has no document: ${String(err)}`,
          }).catch(() => {});
        })
        .finally(() => Aroma.loading.delete(path));
      Aroma.loading.set(path, load);
    }
    return null;
  }

  /** The aroma at `path`, read with its parents; throws naming the path if there is none. @internal */
  public static async ensure(path: string, depth = 0): Promise<Aroma> {
    if (!Aroma.isAromaPath(path)) throw new Error(`'${String(path)}' is not an aroma path`);
    const found = Aroma.known.get(path);
    if (found) return found;
    if (depth > MAX_DEPTH) throw new Error(`Aroma '${path}': the tree is deeper than ${MAX_DEPTH}`);
    const doc = await DocumentApi.read(path);
    if (!doc || doc.getKind() !== 'aroma') {
      throw new Error(`Aroma '${path}' has no aroma document`);
    }
    const data = doc.getData() as AromaData;
    const parent = data.parent ? await Aroma.ensure(data.parent, depth + 1) : null;
    return Aroma.remember(path, data, parent);
  }

  /**
   * Keep an aroma read from its document, its parent already known. The one way
   * an aroma enters the cache: `ensure` calls it, and so does a unit fixture that
   * has no document store behind it. @internal
   */
  public static remember(path: string, data: AromaData, parent: Aroma | null): Aroma {
    const row = new Aroma(
      [...(parent?.lineage ?? []), path],
      data.threshold ?? parent?.threshold ?? 1,
      data.discipline ?? parent?.discipline ?? '',
      data.liking ?? parent?.liking ?? null,
    );
    Aroma.known.set(path, row);
    return row;
  }

  /** An aroma already read, or `null`; starts nothing. @internal */
  public static resolveKnown(path: string): Aroma | null {
    return Aroma.known.get(path) ?? null;
  }

  /** Forget every aroma read, so a test starts clean. @internal */
  public static forgetAll(): void {
    Aroma.known.clear();
  }

  /**
   * Shape-check authored smell tags and load each aroma, so a row naming a path
   * with no aroma fails where it is named. ⚠ Async by design: this is what makes a
   * material's aromas resident once the material is. @internal
   */
  public static async resolveOdorTags(value: unknown, owner: string): Promise<OdorTag[]> {
    if (!Array.isArray(value)) {
      throw new TypeError(`${owner} must be a list of { aroma, strength }`);
    }
    const out: OdorTag[] = [];
    for (const [i, raw] of value.entries()) {
      const tag = raw as { aroma?: unknown; strength?: unknown };
      if (!Aroma.isAromaPath(tag?.aroma)) {
        throw new TypeError(`${owner}[${i}]: '${String(tag?.aroma)}' is not an aroma path`);
      }
      if (typeof tag.strength !== 'number' || !(tag.strength > 0)) {
        throw new TypeError(`${owner}[${i}] ('${tag.aroma}') needs a positive strength (OU/kg)`);
      }
      await Aroma.ensure(tag.aroma);
      out.push({ aroma: tag.aroma, strength: tag.strength });
    }
    return out;
  }

  /**
   * Have {@link Aroma.settling} wait for another load a cold read started (a dirt
   * kind on a restored floor, an ingredient of a restored blend), so the first read
   * after a restart does not lose a smell. @internal
   */
  public static waitFor(key: string, load: Promise<unknown>): void {
    // Caught first, whatever happens next: a load is never left to reject unheard.
    const caught = load.catch(() => {});
    if (Aroma.loading.has(key)) return;
    Aroma.loading.set(
      key,
      caught.finally(() => Aroma.loading.delete(key)),
    );
  }

  /**
   * Start loading a row a smell read found cold, by path, and have
   * {@link Aroma.settling} wait for it. @internal
   */
  public static loadRow(path: string): void {
    // ⚠ Start one load per path. A second cold read must not start another:
    // nothing would catch it, and a rejection nobody catches ends the process
    // (found by the drive: a dirt kind with no row crashed the server).
    if (Aroma.loading.has(path)) return;
    Aroma.waitFor(path, StuffApi.singleton(path));
  }

  /** Every load a cold read started, to wait out; `null` when there are none. @internal */
  public static settling(): Promise<unknown> | null {
    return Aroma.loading.size > 0 ? Promise.all(Aroma.loading.values()) : null;
  }

  /** This aroma's path. */
  public path(): string {
    return this.lineage[this.lineage.length - 1] ?? '';
  }

  /** This aroma's word: its path's last segment. */
  public word(): string {
    return Aroma.wordOf(this.path());
  }

  /** The tree from its root down to this aroma, as paths. */
  public ancestry(): readonly string[] {
    return this.lineage;
  }

  /** The aroma (a path) `depth` steps below the root, or this one if it is shallower. */
  public aromaAt(depth: number): string {
    const line = this.lineage;
    return line[Math.max(0, Math.min(depth, line.length - 1))] ?? this.path();
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
