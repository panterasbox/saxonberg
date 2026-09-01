/**
 * Working — a room somebody cut, and ⭐⭐ **every read a mine needs.**
 *
 * ## The governing split (P18)
 *
 * > **The warren creates rooms. It does not interpret them. Reads go to
 * > the space.**
 *
 * An earlier draft put `facesOf`, `stabilityAt` and `airAt` on
 * `MineWarren`, deriving them from its carved-set ledger. That breaks a
 * **bespoke, hand-authored mine** outright — no warren, no ledger, no
 * ground refusal and no foul air, which is half of what makes a mine a
 * mine. And the exemplar claim this whole trade is built on says *a
 * second mining town needs zero pack code*; a static hand-built mine is
 * the most likely second mine anybody authors.
 *
 * So every read here derives from **the room and its zone**:
 *
 * | Read | Derived from |
 * |---|---|
 * | {@link Working.facesOf} | the neighbour cells' geology — a zone lookup by coordinate |
 * | {@link Working.stabilityAt} | span (which neighbours are open rooms — a zone lookup, **not** a ledger scan) · ground (the deposit's host material) · support (the timber sets in THIS room) · water |
 * | {@link Working.airAt} | a walk over the **exit graph** to a room that breathes |
 *
 * **A hand-authored room composing this mixin, at real coordinates in a
 * deposit-bearing zone, behaves identically to a carved one**, because
 * nothing consults how it came to exist. What a static mine still cannot
 * do — carve, tier, seal-and-reap — is the elastic half, and living
 * without it means only that the mine does not grow.
 *
 * ## What is authored, and by whom
 *
 * The four procedural room type rows (`Face`/`Junction`/`Stope`/`Fall`)
 * are **LOCALITY content** — if they lived in this pack every mine's
 * workings would read identically, which is mechanism leaking into
 * aesthetic. They name this class and supply their own prose banks
 * (`backPhrases`, `seamPhrases`, `airPhrases`, `groundPhrases`), drawn
 * deterministically by the cell seed. A second mine overwrites the banks
 * and nothing else.
 *
 * ⚠ The banks are **plain authored data, not the `descriptor-bank`
 * document kind** — `pnpm lint:descriptors` enforces
 * *descriptor ∩ material keywords = ∅ in both directions*, and mining
 * prose must name slate, quartz and malachite. The idea transfers; the
 * document kind does not.
 *
 * ## Where the mixin lives
 *
 * A pack ships no `lib/`, and this is a mixin the four type rows'
 * concrete class composes — so the factory and the one class that
 * composes it share a module in the pack's `location/` branch, the
 * abstract-base-plus-thin-concrete-face split written in one file. A
 * bespoke mine either names {@link Working} directly or composes
 * `WorkingMixin` over a room class of its own.
 */

import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { AddressApi } from '@saxonberg/server/mud/api/address';
import { NavigationApi, type CardinalDirection } from '@saxonberg/server/mud/api/navigation';
import type { MixinConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Durable } from '@saxonberg/server/mud/lib/material/Durable';
import Deposit, { type Point, type GroundSample } from '../idea/Deposit';

/**
 * A cell of the workings' grid — integer coordinates, z negative down.
 *
 * ⚠ **Not the deposit's units.** A cell is a room you cut; the deposit
 * speaks metres, because rock does not know what cell size somebody
 * chose. {@link Working.metresOf} is the one conversion, and it reads the
 * zone's own `cellSize`.
 */
export type Cell = readonly [number, number, number];

/** The mixin's marker, and the string `MixinApi.isActive` narrows on. */
export const WORKING_MIXIN = 'WorkingMixin';

/**
 * The tier a working is held at. ⭐ **Provisional ground was never a
 * member** — it is the commons you are cutting into, and it reverts
 * because you never secured it; **shoring is what admits a cell to the
 * holding.** A room with no warren reads `spine`: a static mine is a
 * mine that does not grow, so every room in it is authored ground.
 */
export type WorkingTier = 'spine' | 'held' | 'provisional';

/** One face of a working: a direction, and what is behind it. */
export interface Face {
  direction: CardinalDirection;
  /** The cell behind the face. */
  cell: Cell;
  /** Is a room already cut there? Then it is a way on, not a face. */
  open: boolean;
  /**
   * ⭐ `seam` where the ground behind carries ore, `carve-face` where it
   * does not. This is the read that turns *"which way do I dig"* from a
   * guess into a decision.
   */
  kind: 'seam' | 'carve-face';
  /** The resolved ore fraction behind the face, 0–1. */
  grade: number;
  /** The host rock's hardness behind the face, MPa — the carve price. */
  hardnessMPa: number;
  /** Ore still winnable at this face, in lumps. `null` where it is barren. */
  remaining: number | null;
}

/** How the ground is behaving here — a THRESHOLD, never a roll. */
export type GroundState = 'sound' | 'working' | 'bad';

/** The support read, with everything that went into it. */
export interface Stability {
  /** 0 (about to run) … 1 (solid). */
  value: number;
  state: GroundState;
  /** How many neighbouring cells stand open — the span you are holding up. */
  span: number;
  /** The host rock's hardness, MPa. */
  groundMPa: number;
  /** Total condition-weighted support from the timber sets in this room. */
  support: number;
  /** Wetness, 0–1. */
  water: number;
}

/** Below this the ground is `bad` and work refuses. */
const BAD_BELOW = 0.35;
/** Below this the ground is `working` — the free telegraph, not yet a refusal. */
const WORKING_BELOW = 0.55;
/** Hardness at which ground contributes its full share (granite). */
const GROUND_REFERENCE_MPA = 200;
/**
 * What one open neighbour costs.
 *
 * Calibrated so the two rocks say different things: a through-drift in
 * slate (two open sides) stands but is WORKING — the free telegraph — and
 * a junction (four) refuses without timber, while the same junction in
 * granite is sound. Competent rock holds itself up; soft rock does not.
 */
const SPAN_COST = 0.06;
/** What one pristine timber set is worth. */
const SET_WORTH = 0.3;
/** The most support timber can contribute, however much you stack in. */
const SUPPORT_CAP = 0.6;
/** What saturation costs. */
const WATER_COST = 0.25;

/** Steps along the carved graph at which the air is entirely spent. */
const AIR_REACH = 12;

/** How many lumps a fresh face holds before it is worked out. */
const FACE_LUMPS = 8;

/**
 * The public shape {@link WorkingMixin} provides — what a *working*
 * affords, whether it was carved or hand-authored. Consumers narrow with
 * `MixinApi.isActive(room, WORKING_MIXIN)` and speak this.
 */
export interface Working {
  getBackPhrases(): readonly string[];
  getSeamPhrases(): readonly string[];
  getAirPhrases(): readonly string[];
  getGroundPhrases(): readonly string[];
  /** The ore row a cut from this working mints — locality content. */
  getOreRow(): string;
  getWorkedFaces(): Readonly<Record<string, number>>;
  /** Record `lumps` won from `direction`. The only writer of the depletion. */
  recordWinning(direction: string, lumps: number): void;
  /** This working's grid cell. */
  getCell(): Cell;
  /** A cell converted to the deposit's metres, through the zone's `cellSize`. */
  metresOf(cell: Cell): Point;
  getDeposit(): Promise<Deposit | null>;
  getGroundSeed(): Promise<number>;
  sampleHere(): Promise<GroundSample | null>;
  /** `spine` on a room with no warren — authored ground does not grow. */
  getTier(): WorkingTier;
  /** Every direction out, and what is behind it. */
  facesOf(): Promise<Face[]>;
  /** `f(span, ground, support, water)` — a threshold, never a roll. */
  stabilityAt(): Promise<Stability>;
  /** Condition-weighted timber support standing in this room. */
  supportHere(): number;
  /** 1 fresh … 0 unbreathable, by distance along the carved graph. */
  airAt(): Promise<number>;
}

export function WorkingMixin<TBase extends MixinConstructor<Stuff & Container>>(Base: TBase) {
  return class WorkingMixin extends Base {
    static _mixinName = WORKING_MIXIN;

    static fieldMeta: FieldMeta = {
      // Locality prose, authored on the type row. Not spoilered: how a
      // back READS is the description itself, and withholding it would
      // withhold the room.
      backPhrases: { persistent: true, authorable: true },
      seamPhrases: { persistent: true, authorable: true },
      airPhrases: { persistent: true, authorable: true },
      groundPhrases: { persistent: true, authorable: true },
      // ⭐ Per-face depletion is state about THIS ROOM, so it rides the
      // room's own record: a Held working keeps its worked faces and a
      // Provisional one loses them along with the room, which is exactly
      // right. Nothing about it needs a warren.
      workedFaces: { persistent: true },
      oreRow: { persistent: true, authorable: true },
    };

    /** How the back reads here — one is drawn by the cell seed. */
    protected backPhrases: string[] = [];
    /** How a seam reads when you cut into one. */
    protected seamPhrases: string[] = [];
    /** How the air reads at each band. */
    protected airPhrases: string[] = [];
    /** How the ground reads at each state. */
    protected groundPhrases: string[] = [];

    /** Direction → lumps already won from that face. */
    protected workedFaces: Record<string, number> = {};

    /**
     * The ore row a cut from this working mints. ⭐ LOCALITY content: what
     * comes out of Rejection's ground is Rejection's fact, and a second
     * mine names its own row without touching this pack.
     */
    protected oreRow: string = '';

    public getBackPhrases(): readonly string[] { return this.backPhrases; }
    public setBackPhrases(v: string[]): void { this.backPhrases = v ?? []; }
    public getSeamPhrases(): readonly string[] { return this.seamPhrases; }
    public setSeamPhrases(v: string[]): void { this.seamPhrases = v ?? []; }
    public getAirPhrases(): readonly string[] { return this.airPhrases; }
    public setAirPhrases(v: string[]): void { this.airPhrases = v ?? []; }
    public getGroundPhrases(): readonly string[] { return this.groundPhrases; }
    public setGroundPhrases(v: string[]): void { this.groundPhrases = v ?? []; }

    public getOreRow(): string { return this.oreRow; }
    public setOreRow(v: string): void { this.oreRow = v; }

    public getWorkedFaces(): Readonly<Record<string, number>> { return this.workedFaces; }
    public setWorkedFaces(v: Record<string, number>): void { this.workedFaces = v ?? {}; }

    /** Record `lumps` won from `direction`. The only writer of the depletion. */
    public recordWinning(direction: string, lumps: number): void {
      this.workedFaces[direction] = (this.workedFaces[direction] ?? 0) + lumps;
    }

    // ───────────────────── the place, resolved ─────────────────────

    /** This working's cell. The persistence key, the survey address and the MQL atom are all this. */
    public getCell(): Cell {
      const c = (this as unknown as { getCoordinates(): [number, number, number] }).getCoordinates();
      return [c[0], c[1], c[2]];
    }

    /**
     * This working's position in the ground, **in metres** — the cell
     * times the zone's own `cellSize`. The single conversion between the
     * grid a mine is cut on and the rock it is cut through.
     */
    public metresOf(cell: Cell): Point {
      const zone = (this as unknown as { getZone(): { getCellSize?(): number } | null }).getZone();
      const size = zone?.getCellSize?.() ?? 1;
      return [cell[0] * size, cell[1] * size, cell[2] * size];
    }

    /**
     * The deposit governing this working, resolved through the ZONE's
     * `deposit:` field — ⭐ declared on the shared parent zone, so the
     * surface pithead and the workings resolve the same one and the
     * outcrop, the float and the three-point problem are all played
     * above ground.
     */
    public async getDeposit(): Promise<Deposit | null> {
      const zone = (this as unknown as { getZone(): { lookupField<T>(f: string): Promise<T | null> } | null }).getZone();
      if (!zone) return null;
      const path = await zone.lookupField<string>('deposit');
      if (!path) return null;
      return StuffApi.findByTemplatePath<Deposit>(path) ?? null;
    }

    /**
     * The deposit's seed — derived from the covering Locality's claimed
     * address and stored nowhere. Rename the mine and its ore moves.
     */
    public async getGroundSeed(): Promise<number> {
      const locality = await AddressApi.resolveLocalityFor(this as unknown as Stuff & Container);
      return Deposit.seedFor(locality?.getAddress() ?? '');
    }

    /** Everything the ground says about the cell this room occupies. */
    public async sampleHere(): Promise<GroundSample | null> {
      const d = await this.getDeposit();
      if (!d) return null;
      return d.sampleAt(this.metresOf(this.getCell()), await this.getGroundSeed());
    }

    /**
     * The tier — ⭐ the ONE read that consults a warren, and it has an
     * honest static answer. A room whose warren is null is authored
     * ground, and authored ground is Spine by definition.
     */
    public getTier(): WorkingTier {
      const warren = (this as unknown as { getWarren?(): unknown }).getWarren?.();
      if (!warren) return 'spine';
      const tierOf = (warren as { tierOf?(c: Cell): WorkingTier | null }).tierOf;
      return (typeof tierOf === 'function' ? tierOf.call(warren, this.getCell()) : null) ?? 'spine';
    }

    // ───────────────────────── the three reads ─────────────────────

    /**
     * ⭐ Every direction out of this working, and what is behind it —
     * the read that makes driving a decision. A direction whose cell
     * already holds a room is a **way on**, not a face.
     *
     * Derived from the neighbour cells' geology and the zone's own grid.
     * **Nothing here consults a warren**, which is what makes a
     * hand-authored mine work.
     */
    public async facesOf(): Promise<Face[]> {
      const d = await this.getDeposit();
      const zone = (this as unknown as { getZone(): { hasRoomAt(x: number, y: number, z: number): boolean } | null }).getZone();
      if (!d) return [];
      const seed = await this.getGroundSeed();
      const here = this.getCell();
      const out: Face[] = [];
      for (const dir of NavigationApi.cardinalDirections()) {
        const off = NavigationApi.directionOffset(dir);
        if (!off) continue;
        const cell: Cell = [here[0] + off[0], here[1] + off[1], here[2] + off[2]];
        const s = d.sampleAt(this.metresOf(cell), seed);
        const won = this.workedFaces[dir] ?? 0;
        const ore = s.grade > 0;
        out.push({
          direction: dir,
          cell,
          open: zone?.hasRoomAt(cell[0], cell[1], cell[2]) ?? false,
          kind: ore ? 'seam' : 'carve-face',
          grade: s.grade,
          hardnessMPa: s.hardnessMPa,
          remaining: ore ? Math.max(0, FACE_LUMPS - won) : null,
        });
      }
      return out;
    }

    /**
     * How the ground is behaving — **`f(span, ground, support, water)`,
     * and a THRESHOLD rather than a roll.** `uncertainty.md`'s
     * resolutional ban is the whole reason: nothing may roll to decide
     * what your action did, and a collapse that comes up on a die is
     * exactly that.
     *
     * Span comes from **the zone's grid** (which neighbouring cells stand
     * open), ground from the deposit's host material, support from the
     * **timber sets in this room and their `Durable` condition** — a
     * decayed set is worth less than a sound one, which is what puts
     * shoring on the shipped repair economy rather than on a flag.
     */
    public async stabilityAt(): Promise<Stability> {
      const sample = await this.sampleHere();
      const zone = (this as unknown as { getZone(): { hasRoomAt(x: number, y: number, z: number): boolean } | null }).getZone();
      const here = this.getCell();

      let span = 0;
      for (const dir of NavigationApi.cardinalDirections()) {
        if (dir === 'up' || dir === 'down') continue;
        const off = NavigationApi.directionOffset(dir);
        if (!off) continue;
        if (zone?.hasRoomAt(here[0] + off[0], here[1] + off[1], here[2] + off[2])) span++;
      }

      const groundMPa = sample?.hardnessMPa ?? GROUND_REFERENCE_MPA;
      const water = sample?.water ?? 0;
      const support = this.supportHere();

      const value = clamp01(
        Math.min(1, groundMPa / GROUND_REFERENCE_MPA) +
          Math.min(SUPPORT_CAP, SET_WORTH * support) -
          SPAN_COST * span -
          WATER_COST * water,
      );
      return {
        value,
        state: value < BAD_BELOW ? 'bad' : value < WORKING_BELOW ? 'working' : 'sound',
        span,
        groundMPa,
        support,
        water,
      };
    }

    /**
     * Condition-weighted timber support standing in this room. A set is a
     * placed `Durable` object carrying the `timber-set` capability — not a
     * flag on the room, which is why it decays and why `repair` is the
     * answer when it does.
     */
    public supportHere(): number {
      let total = 0;
      for (const item of (this as unknown as Stuff & Container).getContents()) {
        if (!isTimberSet(item)) continue;
        total += MixinApi.isDurable(item) ? (item as unknown as Durable).getCondition() : 1;
      }
      return total;
    }

    /**
     * **Air is the shortest distance, along the carved graph, to a room
     * that breathes** — one with a way out of the workings, or one an
     * author has declared ventilated.
     *
     * So a dead-end heading degrades as you drive it and **recovers the
     * moment you hole it through**, because holing through shortens that
     * distance. Planning a connection is a real decision and not only a
     * convenience — which is the whole reason air, and not collapse, is
     * this build's lethal hazard: it carries a free continuous warning,
     * an obvious unilateral escape, and needs no rescue.
     *
     * 1 is fresh; 0 is unbreathable.
     */
    public async airAt(): Promise<number> {
      const start = this as unknown as Stuff & Container;
      const seen = new Set<string>([start.stuffId]);
      let frontier: (Stuff & Container)[] = [start];
      for (let depth = 0; depth <= AIR_REACH && frontier.length > 0; depth++) {
        const next: (Stuff & Container)[] = [];
        for (const room of frontier) {
          if (breathes(room)) return clamp01(1 - depth / AIR_REACH);
          for (const neighbour of neighboursOf(room)) {
            if (seen.has(neighbour.stuffId)) continue;
            seen.add(neighbour.stuffId);
            next.push(neighbour);
          }
        }
        frontier = next;
      }
      return 0;
    }
  };
}

/** Does this room have a way OUT of the workings — or say it breathes? */
function breathes(room: Stuff & Container): boolean {
  const declared = (room as unknown as { getVentilated?(): boolean }).getVentilated?.();
  if (declared === true) return true;
  if (!MixinApi.isExitable(room)) return false;
  const myZone = (room as unknown as { getZone?(): unknown }).getZone?.() ?? null;
  for (const [, exit] of room.getExits()) {
    const dest = exit.getDestination();
    if (!dest) continue;
    const theirZone = (dest as unknown as { getZone?(): unknown }).getZone?.() ?? null;
    // A way out of the workings' own zone is a way to the air. The adit
    // is the canonical one; a shaft would be another.
    if (theirZone !== myZone) return true;
  }
  return false;
}

/** The rooms one step along the exit graph. */
function neighboursOf(room: Stuff & Container): (Stuff & Container)[] {
  if (!MixinApi.isExitable(room)) return [];
  const out: (Stuff & Container)[] = [];
  for (const [, exit] of room.getExits()) {
    const dest = exit.getDestination();
    if (dest && MixinApi.isContainer(dest)) out.push(dest as Stuff & Container);
  }
  return out;
}

/** A timber set is whatever affords the `timber-set` tool capability. */
function isTimberSet(item: Stuff): boolean {
  return MixinApi.isTool(item) && item.hasCapability('timber-set');
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
