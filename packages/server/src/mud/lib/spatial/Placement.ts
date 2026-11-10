/**
 * Placement — ⭐⭐ **a way of sitting**, and the words a player types for it,
 * as a `placement` document (a document since the path-identity build).
 *
 * One placement is one relation between a thing and the host it sits on or
 * in: `on` a shelf, `in` a compartment with its own air, `from` a hook. A
 * host names the ways it offers by PATH (`placements:
 * [/platform/placements/from]`), and `put`, `look` and `dry` read the
 * document to know what words to accept, what sentence to print, and what
 * to call the drill-in list:
 *
 * ```yaml
 * # content/placements/from.yaml
 * prepositions: [from, on]
 * encloses: false
 * prose: "{{ actor }} hang{{ s }} {{ item }} from {{ host }}."
 * heading: Hanging from it
 * ```
 *
 * ⭐ A new way of sitting is one file plus one word on every verb whose
 * argument accepts a placement host (`lint:placement-words --list`). A
 * typed word is resolved against the HOST's own placements — so there is
 * no global placement dictionary to search.
 *
 * ⭐⭐ Resident by construction (documents D7): the kernel's three
 * ({@link Placement.ON} · {@link Placement.IN} · {@link Placement.FROM}) load
 * with every place (`Place.onCreate`); a host's authored ones load through
 * its `placements` setter; a restored placed thing's through the restore
 * pass. A sync read ({@link Placement.need}) of one nothing loaded is an
 * engine defect, thrown by path — never a refusal and never a default.
 *
 * ⚠ `Placement` is also a type in `lib/combat/AimResolution.ts` (the aim ×
 * answer grid) — a different module. The persisted record of where a thing
 * sits is `ContentPlacement` (`lib/persistence/PersistenceSlice.ts`).
 *
 * @internal the spatial substrate's; an author names a path on a row.
 */

import { DocumentApi } from '../../api/document';
import { DocumentCache } from '../document/DocumentCache';

/** Where the kernel's ways of sitting live — one prefix read loads them. */
const KERNEL_PLACEMENT_PREFIX = '/platform/placements/';

/**
 * The placement documents, by path — see the module header.
 *
 * @internal the spatial substrate's; an author names a path on a row.
 */
export class Placement {
  /** On a surface — a mug on a desk. */
  static readonly ON = '/platform/placements/on';
  /** Inside a compartment with its own air — every container's inside. */
  static readonly IN = '/platform/placements/in';
  /** Hanging from a hook. */
  static readonly FROM = '/platform/placements/from';

  private static memo: DocumentCache<Placement> | null = null;
  private static kernel: Promise<void> | null = null;
  private static get cache(): DocumentCache<Placement> {
    // Built on first use: a static built at module load races an import
    // cycle through the document store.
    return (Placement.memo ??= new DocumentCache<Placement>('placement', (doc) =>
      Placement.fromData(doc.getData(), doc.getPath()),
    ));
  }

  private constructor(
    private readonly path: string,
    private readonly prepositions: readonly string[],
    private readonly encloses: boolean,
    private readonly prose: string,
    private readonly heading: string,
  ) {}

  /** Validate a placement document at `path` (the installer's validator too). */
  public static fromData(data: Record<string, unknown>, path: string): Placement {
    const words = Array.isArray(data.prepositions)
      ? data.prepositions.filter((w): w is string => typeof w === 'string' && w.length > 0)
      : [];
    if (words.length === 0) {
      throw new Error(`placement '${path}' lists no prepositions — a way of sitting a player cannot name`);
    }
    return new Placement(
      path,
      Object.freeze(words.map((w) => w.toLowerCase())),
      data.encloses === true,
      typeof data.prose === 'string' ? data.prose : '',
      typeof data.heading === 'string' ? data.heading : '',
    );
  }

  /** The placement at `path`, read if it is not resident; throws naming a path with none. */
  public static ensure(path: string): Promise<Placement> {
    return Placement.cache.ensure(path);
  }

  /** The resident placement at `path`; `DocumentNotResidentError` if whatever cites it never loaded it. */
  public static need(path: string): Placement {
    return Placement.cache.need(path);
  }

  /** Keep a placement (a unit fixture with no store behind it). */
  public static remember(value: Placement): Placement {
    return Placement.cache.remember(value.path, value);
  }

  /**
   * ⭐ The kernel's ways of sitting (`/platform/placements/*`), loaded once
   * for the process — one prefix read, and a no-op when they are resident.
   * Every place awaits it in `onCreate`, so the engine's own
   * `move(item, desk, Placement.ON)` and a container's inside always find
   * theirs.
   */
  public static ensureKernel(): Promise<void> {
    if ([Placement.ON, Placement.IN, Placement.FROM].every((p) => Placement.cache.has(p))) {
      return Promise.resolve();
    }
    return (Placement.kernel ??= (async () => {
      for (const doc of await DocumentApi.list(KERNEL_PLACEMENT_PREFIX)) {
        if (doc.getKind() === 'placement') await Placement.cache.ensure(doc.getPath());
      }
    })().catch((err: unknown) => {
      Placement.kernel = null;
      throw err;
    }));
  }

  /** This placement's path — its only name. */
  public getPath(): string {
    return this.path;
  }

  /** Its own word: the path's leaf (`on`, `from`) — what a client is shown. */
  public getName(): string {
    return this.path.slice(this.path.lastIndexOf('/') + 1);
  }

  /** The words a player may type, primary first. */
  public getPrepositions(): readonly string[] {
    return this.prepositions;
  }

  /** The placement's own word — its first preposition (`from`). */
  public getPrimaryWord(): string {
    return this.prepositions[0] ?? this.getName();
  }

  /** Whether sitting here puts the thing INSIDE something (air, sight, reach). */
  public getEncloses(): boolean {
    return this.encloses;
  }

  /** The Liquid sentence `put` / `dry` render (`actor` · `item` · `host`). */
  public getProse(): string {
    return this.prose;
  }

  /** The drill-in heading `look` / `sense` print over what sits here. */
  public getHeading(): string {
    return this.heading;
  }
}
