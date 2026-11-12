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
 * ({@link Placements.ON} · {@link Placements.IN} · {@link Placements.FROM}) load
 * with every place (`Place.onCreate`); a host's authored ones load through
 * its `placements` setter; a restored placed thing's through the restore
 * pass. A sync read ({@link Placement.need}) of one nothing loaded is an
 * engine defect, thrown by path — never a refusal and never a default.
 *
 * ⚠ `Placement` is also a type in `lib/combat/AimResolution.ts` (the aim ×
 * answer grid) — a different module. The persisted record of where a thing
 * sits is `ContentPlacement` (`lib/persistence/PersistenceSlice.ts`).
 *
 * The placements are SERVED by `PlacementCatalogue`, reached as
 * `ContainmentApi.placements()`.
 */


/** Where the kernel's ways of sitting live — one prefix read loads them. */
export const KERNEL_PLACEMENT_PREFIX = '/platform/placements/';

/** The kernel's three ways of sitting, by path. */
export const Placements = {
  /** On a surface — a mug on a desk. */
  ON: '/platform/placements/on',
  /** Inside a compartment with its own air — every container's inside. */
  IN: '/platform/placements/in',
  /** Hanging from a hook. */
  FROM: '/platform/placements/from',
} as const;

/** One way of sitting — see the module header. */
export class Placement {
  /** A placement as its document says (read through `PlacementCatalogue.parse`). */
  public constructor(
    private readonly path: string,
    private readonly prepositions: readonly string[],
    private readonly encloses: boolean,
    private readonly prose: string,
    private readonly heading: string,
    private readonly hangs: boolean = false,
    private readonly fastens: boolean = false,
  ) {}

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

  /**
   * ⭐ Does sitting here mean HANGING from a length (size and carrying D4)?
   * A host's hanging members are bounded by its length and what it bears —
   * a belt, a rail, a strap, a key ring (`Placing.hangingLengthM`).
   */
  public getHangs(): boolean {
    return this.hangs;
  }

  /**
   * ⭐ Is a thing sitting here FASTENED — clipped or tied (D5)? A fastened
   * thing stays put under water and at zero gravity; `on` fastens nothing.
   */
  public getFastens(): boolean {
    return this.fastens;
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
