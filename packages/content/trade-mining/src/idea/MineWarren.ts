/**
 * MineWarren — ⭐ the **mutation** half of a mine, and only that half.
 *
 * > **The warren creates rooms. It does not interpret them.** (P18)
 *
 * Every read a mine needs — faces, stability, air — lives on
 * {@link Working} and derives from the room and its zone, so a bespoke
 * hand-authored mine with no warren at all behaves identically. What
 * lives here is what a warren genuinely owns and a static mine genuinely
 * cannot do: **carve · abandon · the tier ledger · seal-and-reap.** A
 * static mine is a mine that does not grow, which is a coherent thing to
 * be rather than a degraded one.
 *
 * ## Why `FloorplanWarren` (harbors review 3 — the planned base swap)
 *
 * `Warren.occupantsOf` is abstract — a warren cannot be written without
 * declaring which tier it is — and a mine's members are ROOMS. This header
 * planned the swap from `RoomWarren` for the day the abstract holding
 * graduated to the kernel with the shell clock left behind (*"a field has
 * no paint either"*). It has: `FloorplanWarren` is the kernel's keyed
 * room set, stood up and put to sleep whole, and the fabric is a
 * STRUCTURE's (a building's or a ship's `Durable` condition), never a
 * floorplan's. So a mine
 * `extends FloorplanWarren`, and the keyed mint is the base's
 * (`mintKeyed` — clone, member, placed, restore-or-seed, filed by key):
 * the carve adds keyed members on top of it.
 *
 * ⭐ **A mine names no blueprint** (`blueprint` stays `''`): its spine is
 * authored singletons and its workings are CARVED, so there is no kind of
 * room set to copy — the base's wake mints nothing, and every member is a
 * cell somebody cut. Its members sit on its zone's grid (the cell IS the
 * identity), so it lays out no frame of its own
 * (`laysOutOwnFrame() → false`), and a carved cell keeps its own record
 * by its own acts (`abandon` captures a held cell), never as the warren's
 * dependent.
 *
 * ## The three-tier room identity (D17, and no rowless mints)
 *
 *  - **Spine** — the pithead rooms, the adit, the authored galleries:
 *    real singleton rows in the venue pack, one instance each. Never
 *    members.
 *  - **Workings** — every carved cell is a **keyed member**: scope is
 *    one of the venue's four type rows, key is `<claimExtent>/<cell>`.
 *    ⭐ Not a bare coordinate: it matches the keyed floorplan's
 *    `<extent>/<leaf>` convention (so the base swap cost nothing) and
 *    it puts **claim scoping in the key**, which makes part of
 *    `claimFor` derivable rather than a ledger scan.
 *  - **Geology** — no identity at all.
 *
 * `restoreOrSeed(room, key)` is the whole identity mechanism. Nothing
 * mints a template row, and `lint:instanceable` passes because every
 * `class:` and `templatePath` belongs to one of the four authored rows.
 *
 * ## The ledger, and what it is NOT
 *
 * `{cell, tier, holder}` per carved cell plus the claim-block map, held
 * as instance state and captured through `PersistableApi` into
 * `holder_snapshots`. ⚠ **No new Mongo collection**, so `lint:schema`
 * needs no new doc.
 *
 * ⭐⭐ **The four type rows are LOCALITY content and arrive as policy.**
 * `typeRows` is an authored field on the warren's own row; a second mine
 * supplies sandstone galleries or ice caves and the machinery does not
 * care. That is the falsifiable test the whole trade is built on.
 */

import { FloorplanWarren } from '@saxonberg/server/mud/lib/location/FloorplanWarren';
import type { Attachment } from '@saxonberg/server/mud/lib/location/Warren';
import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import type { Persistable } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { ParcelOwner } from '@saxonberg/server/mud/lib/parcel/ParcelRecord';
import type { WorkingTier, Cell } from '../lib/Working';

type MemberStuff = Stuff & Container;
type ExitableContainer = Stuff & Container & Exitable;

/** Which of the venue's four type rows a carved cell clones from. */
export type WorkingType = 'face' | 'junction' | 'stope' | 'fall';

/** The four type rows, supplied as policy by the venue that owns the mine. */
export interface TypeRows {
  face: string;
  junction: string;
  stope: string;
  fall: string;
}

/**
 * ⭐ The declared cell↔claim mapping. **Authored on the warren, never
 * derived from geometry** — parcels are titled over PATHS and a claim is
 * a region of coordinate space, and *do not invent coordinate-extent
 * parcels* is the requirements' own constraint. A property-substrate
 * build can replace the scan later without touching a single title.
 *
 * ⭐ A STATIC mine does not need this at all: authored rooms have real
 * paths, so `ParcelApi`'s longest-prefix resolution answers *whose claim
 * is this* directly. The mapping is the workaround for keyed members not
 * having distinct paths.
 */
export interface ClaimBlock {
  /** The parcel extent the block is titled under. */
  parcelExtent: string;
  from: readonly [number, number, number];
  to: readonly [number, number, number];
}

/** One carved cell, as the ledger holds it. */
export interface CarvedEntry {
  cell: string;
  tier: WorkingTier;
  /** Who cut it — a chattel/parcel owner ref, or null for the commons. */
  holder: string | null;
  /** Which type row it was cloned from, so a regenerate is identical. */
  type: WorkingType;
}

const MineWarrenBase = SingletonMixin(FloorplanWarren);

export default class MineWarren extends MineWarrenBase {
  static fieldMeta: FieldMeta = {
    // ⭐ Policy, authored by the LOCALITY. The machinery never names a room row.
    typeRows: { persistent: true, authorable: true },
    claimBlocks: { persistent: true, authorable: true },
    aditPath: { persistent: true, authorable: true },
    mineExtent: { persistent: true, authorable: true },
    zonePath: { persistent: true, authorable: true },
    // The ledger. Persisted through the spine into `holder_snapshots` —
    // ⚠ no new collection, so `lint:schema` needs no new doc.
    carved: { persistent: true },
  };

  /** The venue's four procedural room type rows. */
  protected typeRows: TypeRows | null = null;
  /** The declared cell↔claim mapping. */
  protected claimBlocks: ClaimBlock[] = [];
  /** Where an arrival lands: the authored adit, a Spine singleton. */
  protected aditPath: string = '';
  /** The parcel extent every staked claim subdivides beneath. */
  protected mineExtent: string = '';
  /**
   * The workings' own `CartesianZone` row. ⭐ A locality fact like the
   * type rows: a carved member is placed into this grid by coordinate,
   * and it is the grid — not the warren — that every read afterwards
   * consults.
   */
  protected zonePath: string = '';
  /** The carved-set ledger, keyed by cell string. */
  protected carved: Record<string, CarvedEntry> = {};

  public getTypeRows(): TypeRows | null { return this.typeRows; }
  public setTypeRows(v: TypeRows | null): void { this.typeRows = v ?? null; }
  public getClaimBlocks(): readonly ClaimBlock[] { return this.claimBlocks; }
  public setClaimBlocks(v: ClaimBlock[]): void { this.claimBlocks = v ?? []; }
  public getAditPath(): string { return this.aditPath; }
  public setAditPath(v: string): void { this.aditPath = v; }
  public getMineExtent(): string { return this.mineExtent; }
  public setMineExtent(v: string): void { this.mineExtent = v; }
  public getZonePath(): string { return this.zonePath; }
  public setZonePath(v: string): void { this.zonePath = v; }
  public getCarved(): Readonly<Record<string, CarvedEntry>> { return this.carved; }
  public setCarved(v: Record<string, CarvedEntry>): void { this.carved = v ?? {}; }

  // ─────────────────────── the ledger ───────────────────────

  /** Every carved cell, live or not. */
  public carvedCells(): string[] { return Object.keys(this.carved); }

  /** The tier at `cell`, or `null` where nothing has been cut. */
  public tierOf(cell: Cell): WorkingTier | null {
    return this.carved[keyOf(cell)]?.tier ?? null;
  }

  /** Has this cell been cut? */
  public isCarved(cell: Cell): boolean { return keyOf(cell) in this.carved; }

  /**
   * ⭐ **Shoring is this mine's provisioning act.** Provisional ground was
   * never a member — it is the commons you are cutting into, and it
   * reverts because you never secured it. Promoting is what admits a cell
   * to the holding, and it is the act that writes the record.
   */
  public promote(cell: Cell, holder: string | null = null): boolean {
    const entry = this.carved[keyOf(cell)];
    if (!entry) return false;
    entry.tier = 'held';
    if (holder !== null) entry.holder = holder;
    return true;
  }

  /** The reverse — neglect demotes a working back to the commons. */
  public demote(cell: Cell): boolean {
    const entry = this.carved[keyOf(cell)];
    if (!entry || entry.tier === 'spine') return false;
    entry.tier = 'provisional';
    return true;
  }

  // ─────────────────────── claims ───────────────────────

  /** The claim block covering `cell`, or `null` on unclaimed ground. */
  public claimFor(cell: Cell): ClaimBlock | null {
    for (const b of this.claimBlocks) {
      if (
        cell[0] >= Math.min(b.from[0], b.to[0]) && cell[0] <= Math.max(b.from[0], b.to[0]) &&
        cell[1] >= Math.min(b.from[1], b.to[1]) && cell[1] <= Math.max(b.from[1], b.to[1]) &&
        cell[2] >= Math.min(b.from[2], b.to[2]) && cell[2] <= Math.max(b.from[2], b.to[2])
      ) return b;
    }
    return null;
  }

  /**
   * Who holds title to the ground at `cell` — ⭐ the PARCEL's answer, not
   * the ledger's. *"May you drive here?"* is a title question and title
   * lives outside the editable collection precisely so a content edit
   * cannot forge one.
   */
  public async holderOf(cell: Cell): Promise<ParcelOwner | null> {
    const block = this.claimFor(cell);
    if (!block) return null;
    return ParcelApi.ownerOf(block.parcelExtent);
  }

  /**
   * ⭐⭐ The claim a proposed block would **overlap**, or `null` when the
   * ground is clear — the question `stake` has to ask, and a different
   * one from {@link MineWarren.claimFor}.
   *
   * ⚠⚠ `claimFor` answers *"which claim is this CELL in"*, which is the
   * right question for `holderOf` and the wrong one for staking: a block
   * is three cells each way, so two centres four cells apart pass a
   * centre test while their extents share nine columns of ground. The
   * register then holds two claims over the same rock and `holderOf`
   * answers with whichever was written first — *first come is the whole
   * rule* quietly becoming *first come, and then whoever overlaps you*.
   *
   * It went unnoticed because the shipped world had exactly ONE block in
   * it, and one block cannot overlap anything.
   */
  public overlappingClaim(from: Cell, to: Cell): ClaimBlock | null {
    const lo = (a: number, b: number): number => Math.min(a, b);
    const hi = (a: number, b: number): number => Math.max(a, b);
    for (const b of this.claimBlocks) {
      const clear =
        hi(from[0], to[0]) < lo(b.from[0], b.to[0]) ||
        lo(from[0], to[0]) > hi(b.from[0], b.to[0]) ||
        hi(from[1], to[1]) < lo(b.from[1], b.to[1]) ||
        lo(from[1], to[1]) > hi(b.from[1], b.to[1]) ||
        hi(from[2], to[2]) < lo(b.from[2], b.to[2]) ||
        lo(from[2], to[2]) > hi(b.from[2], b.to[2]);
      if (!clear) return b;
    }
    return null;
  }

  /** Register a freshly staked claim's block. The `stake` act's write. */
  public addClaimBlock(block: ClaimBlock): void {
    this.claimBlocks = [...this.claimBlocks, block];
  }

  // ─────────────────────── carving ───────────────────────

  /**
   * Cut a new working at `cell`. ⚠ Refuses a cell already carved — the
   * `(scope, key)` singleton invariant is what keeps two rooms from
   * standing in one place, and a silent second clone would be exactly the
   * rowless-mint failure D17 exists to prevent.
   *
   * Carves through **its own serialization chain**, so two cuts of one
   * cell never race to two clones.
   */
  public async carve(
    cell: Cell,
    type: WorkingType,
    holder: string | null = null,
  ): Promise<MemberStuff | null> {
    const key = keyOf(cell);
    if (key in this.carved) return this.roomAt(cell);
    const rows = this.typeRows;
    if (!rows) {
      throw new Error(
        `MineWarren ${this.stuffId}: no typeRows policy. The four procedural ` +
          `room type rows are LOCALITY content and must be authored on this row.`,
      );
    }
    const run = this._carveChain.then(
      () => this._carveOne(cell, type, holder),
      () => this._carveOne(cell, type, holder),
    );
    this._carveChain = run.then(() => undefined, () => undefined);
    return run;
  }

  /** The subclass's own serialization chain (see {@link MineWarren.carve}). */
  private _carveChain: Promise<unknown> = Promise.resolve();

  private async _carveOne(
    cell: Cell,
    type: WorkingType,
    holder: string | null,
  ): Promise<MemberStuff> {
    const key = this.memberKeyOf(cell);
    // ⭐ The base's keyed mint (harbors review 3). The coordinate IS the
    // identity — the persistence key, the survey address and the MQL atom
    // are one fact with three faces — so the cell is placed on the grid
    // before the record comes back.
    const room = await this.mintKeyed(this.typeRows![type], key, {
      beforeRestore: (r) => this.placeInGrid(r, cell),
    });
    this.carved[keyOf(cell)] = { cell: keyOf(cell), tier: 'provisional', holder, type };
    await this.wireHubExit(room);
    // ⭐ The topology changed, so the air did. Driving a heading makes the
    // far end worse; holing it through makes it better — and both are the
    // same call, because both are the same fact.
    await refreshAirAround(room);
    return room;
  }

  /**
   * The member's persistence key: `<claimExtent>/<cell>` — the venue's
   * claim scoping carried IN the key, so part of `claimFor` is derivable
   * and the Stage-B base swap is free. Unclaimed ground keys under the
   * mine's own extent.
   */
  public memberKeyOf(cell: Cell): string {
    const block = this.claimFor(cell);
    const extent = block?.parcelExtent ?? (this.mineExtent || '/world/mine');
    return `${extent}/${keyOf(cell)}`;
  }

  /** The live room at `cell`, or `null` when it is not resident. */
  public roomAt(cell: Cell): MemberStuff | null {
    for (const m of this.getMembers()) {
      const c = (m as unknown as { getCoordinates?(): [number, number, number] }).getCoordinates?.();
      if (c && c[0] === cell[0] && c[1] === cell[1] && c[2] === cell[2]) return m;
    }
    return null;
  }

  /**
   * Give up a working. A Held cell is torn down but **keeps its record**
   * (dormancy is not lapse — held workings sleep and wake whole); a
   * Provisional one is forgotten entirely and leaves nothing behind, so
   * re-driving it regenerates the identical tunnel from the seed.
   */
  public async abandon(cell: Cell): Promise<void> {
    const key = keyOf(cell);
    const entry = this.carved[key];
    const room = this.roomAt(cell);
    if (room) {
      if (entry?.tier === 'held') {
        await PersistableApi.capture(room, this.memberKeyOf(cell));
      } else if (MixinApi.isPersistable(room)) {
        room.markForRevert();
      }
      const neighbours = liveNeighboursOf(room);
      this.unwireHubExit(room);
      const filed = this.mintedKeyOf(room);
      if (filed !== null) this.forgetKey(filed);
      this.removeMember(room);
      StuffApi.destruct(room as unknown as Stuff);
      for (const n of neighbours) await refreshAirAround(n);
    }
    if (entry && entry.tier !== 'held') delete this.carved[key];
  }

  // ─────────────────────── Warren policy hooks ───────────────────────

  /**
   * ⭐ A mine's members are cells on its zone's GRID — the coordinate is
   * the identity — never a frame of its own (a copy's rooms are).
   */
  public override laysOutOwnFrame(): boolean {
    return false;
  }

  /**
   * A carved cell keeps its own record by its own acts — `abandon`
   * captures a held cell; a provisional one is forgotten — so the mine's
   * capture writes its ledger, never its cells.
   *
   * @hook
   */
  public override dependentPersistables(): (Stuff & Persistable)[] {
    return [];
  }

  /** Unused: `wireHubExit` is overridden wholesale (there is no hub). */
  protected attachmentFor(): Attachment {
    return { direction: 'in' };
  }

  /**
   * Cull the cold Provisional tail. ⚠ **Held ground is never culled** —
   * shoring is what bought it — and an occupied working is never culled
   * either, whatever its tier.
   */
  protected async reconcile(): Promise<void> {
    for (const m of this.getMembers()) {
      const c = (m as unknown as { getCoordinates?(): [number, number, number] }).getCoordinates?.();
      if (!c) continue;
      const entry = this.carved[keyOf(c)];
      if (!entry || entry.tier !== 'provisional') continue;
      if (this.occupantsOf(m).length > 0) continue;
      await this.abandon(c);
    }
  }

  /**
   * ⭐ **Wire the new cell to its already-carved orthogonal neighbours**,
   * not to a hub — the `DormWarren` precedent of overriding this
   * wholesale. A mine's topology is the ground it was cut through, and
   * that is exactly why air can be a function of it.
   */
  protected override async wireHubExit(room: MemberStuff): Promise<void> {
    const c = (room as unknown as { getCoordinates?(): [number, number, number] }).getCoordinates?.();
    if (!c) return;
    const here: Cell = [c[0], c[1], c[2]];
    const roomEx = this.requireExitable(room);
    for (const dir of NavigationApi.cardinalDirections()) {
      const off = NavigationApi.directionOffset(dir);
      if (!off) continue;
      const neighbourCell: Cell = [here[0] + off[0], here[1] + off[1], here[2] + off[2]];
      const neighbour = this.roomAt(neighbourCell) ?? (await this.spineAt(neighbourCell));
      if (!neighbour || !MixinApi.isExitable(neighbour)) continue;
      if (roomEx.getExit(dir)) continue;
      await roomEx.addBidirectionalExit(neighbour as ExitableContainer, dir, {
        opposite: NavigationApi.invertDirection(dir),
        keepLiveDestination: true,
      });
    }
  }

  // ─────────────────────── the survey seam ───────────────────────

  /**
   * ⭐ The duck-typed shape `SurveyController` reads through the
   * `WarrenMember` back-ref — *"never by import: the residential
   * programme is a capability pack's class and the kernel does not import
   * packs."* Answering it gets `survey` reporting honestly in a working —
   * *a stope, shored, on claim 3* — with **no kernel change, no platform
   * edit and no residence dependency.** The mirror doing its job in a new
   * venue is what it was built for.
   */
  public getHoldingLabel(): string {
    return this.getPresentation();
  }

  /** The parcel extent a member sits under — `survey`'s "whose is this". */
  public extentOfMember(m: MemberStuff): string | null {
    const c = (m as unknown as { getCoordinates?(): [number, number, number] }).getCoordinates?.();
    if (!c) return null;
    return this.claimFor([c[0], c[1], c[2]])?.parcelExtent ?? (this.mineExtent || null);
  }

  // ─────────────────────── private helpers ───────────────────────

  /**
   * Stamp the fresh member into the workings' grid at `cell` — the
   * zone's `addLocation` stamps both the coordinates and the back-ref,
   * which is what makes every subsequent read a ZONE lookup rather than
   * a ledger scan.
   */
  private placeInGrid(room: MemberStuff, cell: Cell): void {
    const zone = this.zonePath ? StuffApi.findByTemplatePath<Stuff>(this.zonePath) : null;
    const place = (zone as unknown as { addLocation?(l: unknown, x: number, y: number, z: number): void } | null)?.addLocation;
    if (zone && typeof place === 'function') {
      place.call(zone, room, cell[0], cell[1], cell[2]);
      return;
    }
    (room as unknown as { setCoordinates(v: [number, number, number]): void })
      .setCoordinates([cell[0], cell[1], cell[2]]);
  }

  /**
   * An authored Spine room at `cell`, if the venue put one there. The
   * adit and the galleries are singletons, not members, so a carve that
   * meets one must still wire to it.
   */
  private async spineAt(cell: Cell): Promise<MemberStuff | null> {
    const adit = this.aditPath ? StuffApi.findByTemplatePath<MemberStuff>(this.aditPath) : null;
    if (!adit) return null;
    const c = (adit as unknown as { getCoordinates?(): [number, number, number] }).getCoordinates?.();
    if (c && c[0] === cell[0] && c[1] === cell[1] && c[2] === cell[2]) return adit;
    return null;
  }
}

/**
 * Re-settle the air across the workings this room can reach. The read
 * itself lives on the room ({@link Working.refreshAir}); the warren only
 * knows WHEN the shape changed.
 */
async function refreshAirAround(room: MemberStuff): Promise<void> {
  const w = room as unknown as { refreshAir?(): Promise<void> };
  if (typeof w.refreshAir === 'function') await w.refreshAir();
}

/** The live rooms one step away, before this one goes. */
function liveNeighboursOf(room: MemberStuff): MemberStuff[] {
  if (!MixinApi.isExitable(room)) return [];
  const out: MemberStuff[] = [];
  for (const [, exit] of room.getExits()) {
    let dest: Stuff | null = null;
    try {
      dest = exit.getDestination() as unknown as Stuff | null;
    } catch {
      continue; // a reaped neighbour — that way leads nowhere any more
    }
    if (dest && !dest.isDestroyed() && MixinApi.isContainer(dest)) {
      out.push(dest as MemberStuff);
    }
  }
  return out;
}

/** The canonical cell key. Also the survey address and the MQL atom. */
function keyOf(cell: Cell): string {
  return `${cell[0]},${cell[1]},${cell[2]}`;
}
