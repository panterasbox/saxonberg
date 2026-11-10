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
 * material's `smells:`, a dirt's `odor:`, another pack's aroma `parent:`. So two packs
 * may each ship a `smoke` and neither is the other. Nothing scans the kind and
 * nothing warms a roster: a path is read when something names it.
 *
 * The tree is the aroma folder: a child lives in its parent's directory
 * (`aromas/smoke/peat-smoke.yaml` → `/base-library/aromas/smoke/peat-smoke`), so
 * its parent is the path one segment up; an explicit `parent:` names a parent in
 * another pack. A threshold, a discipline and a hedonic curve an aroma leaves unstated come from
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
  /** A parent aroma in ANOTHER pack; otherwise the folder decides (D14). */
  parent?: string;
  threshold?: number;
  discipline?: string;
  liking?: HedonicCurve;
}



/**
 * An aroma's path: a pack root, then `/aromas/`, then slug segments — the
 * folder is the tree (documents D14). A shape test only: no document is
 * consulted.
 */
export const AROMA_PATH_SHAPE = /^(\/[a-z0-9][a-z0-9._-]*)*\/aromas(\/[a-z][a-z0-9]*(-[a-z0-9]+)*)+$/;

export class Aroma {
  /** An aroma read with its parents (built by `AromaCatalogue`). */
  public constructor(
    private readonly lineage: readonly string[],
    private readonly threshold: number,
    private readonly discipline: string,
    private readonly liking: HedonicCurve | null,
  ) {}

  public path(): string {
    return this.lineage[this.lineage.length - 1] ?? '';
  }

  /** This aroma's word: its path's last segment. */
  public word(): string {
    const path = this.path();
    return path.slice(path.lastIndexOf('/') + 1);
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
