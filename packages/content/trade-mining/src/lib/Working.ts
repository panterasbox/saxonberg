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
 * A pack's own substrate lives in its `src/lib/`, exactly as the
 * kernel's does — inherited, never instanced (TPA reform P2a amended
 * `lint:instanceable`'s invariant 8 to say so). This module is a mixin
 * factory and the types its surface speaks, and nothing else; the
 * classes that compose it are `location/MineRoom` and
 * `location/AuthoredWorking`. A bespoke mine composes `WorkingMixin`
 * over a room class of its own.
 */

import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import { Traversal } from '@saxonberg/server/mud/lib/location/Traversal';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { Atmospheric } from '@saxonberg/server/mud/lib/biome/Atmospheric';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MaterialApi } from '@saxonberg/server/mud/api/material';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import type { SampleAnswer, SampleRequest } from '@saxonberg/server/mud/lib/instrument/Sampleable';
import { NavigationApi, type CardinalDirection } from '@saxonberg/server/mud/api/navigation';
import type { NestingConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Durable } from '@saxonberg/server/mud/lib/material/Durable';
import type { Bulkable } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import type { ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { ParcelOwner } from '@saxonberg/server/mud/lib/parcel/ParcelRecord';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { ConditionApi } from '@saxonberg/server/mud/api/condition';
import MineWarren, { type WorkingType } from '../idea/MineWarren';
import Ore from '../thing/Ore';
import Deposit, {
  type Point,
  type GroundSample,
} from '@saxonberg/content-ground/src/idea/Deposit';
import {
  StrataMixin,
  type Strata,
  type Cell,
  type MixinCtor,
} from '@saxonberg/content-ground/src/lib/Strata';

/**
 * A cell of the workings' grid — integer coordinates, z negative down.
 *
 * ⚠ **Not the deposit's units.** A cell is a room you cut; the deposit
 * speaks metres, because rock does not know what cell size somebody
 * chose. `Strata.metresOf` is the one conversion, and it reads the zone's
 * own `cellSize`.
 *
 * ⭐ Re-exported from `/system/ground`, where it moved with the position
 * reads. Every existing importer keeps working: a cell is the ground's
 * word, and the trade that cuts cells is one of its consumers.
 */
export type { Cell };

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
  /**
   * Loose ground has run into this face and must be cleared before it can
   * be worked. ⚠ The face, never the room — every exit stays open.
   */
  blocked: boolean;
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
  /**
   * ⭐ When the ground is `bad`, WHICH term is to blame — the refusal names
   * the state, so the player knows what lifts it. `null` when it stands.
   */
  cause: GroundCause | null;
}

/** What makes bad ground bad: running wet, too wide a span, or a working back. */
export type GroundCause = 'wet' | 'span' | 'back';
/** Wetter than this, and the water is what is bringing the ground in. */
const WET_ABOVE = 0.5;
/** This many open sides, and it is the span you are holding up. */
const WIDE_SPAN = 4;

/** Below this the ground is `bad` and work refuses. */
const BAD_BELOW = 0.35;
/** Below this the ground is `working` — the free telegraph, not yet a refusal. */
const WORKING_BELOW = 0.55;
/** Hardness at which ground contributes its full share (granite). */
const GROUND_REFERENCE_MPA = 200;
/**
 * What ANY competent rock is worth before hardness is considered.
 *
 * Without it a bare heading in soft rock reads as unquiet with nothing
 * open around it, which is wrong: an untouched drift holds itself up.
 * The floor is what says *rock is rock*; the hardness term above it is
 * what says *and granite is better than slate*.
 */
const GROUND_FLOOR = 0.5;
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

/**
 * Below this the working's atmosphere is no longer air.
 *
 * ⭐ **Air is the build's ONE lethal hazard, and deliberately so.** It
 * carries a free continuous warning (the bird, the crickets going quiet),
 * an obvious unilateral escape (walk out — every exit stays open), and it
 * needs **no rescue**, so unlike collapse it does not wait for other
 * players to exist. Ground cannot kill; air can.
 */
const FOUL_BELOW = 0.34;

/** The atmosphere a spent working holds — odourless, and only the bird reads it. */
const FOUL_ATMOSPHERE = 'blackdamp';

/**
 * ⭐ How many times the cell's own volume of gas the measures behind a
 * face hold. The reservoir term of the RGO law: reservoir · recharge ·
 * act · credit.
 */
const FIREDAMP_RESERVOIR_MULTIPLE = 20;
/** Game-seconds for a drained reservoir to come half the way back. */
const FIREDAMP_RECHARGE_HALF_LIFE_S = 6 * 3600;

/** How many lumps a fresh face holds before it is worked out. */
const FACE_LUMPS = 8;

// ───────────────────────── the labour acts' prices ─────────────────────────
// ⭐ Each act's metabolic watts were chosen to reproduce its old felt cost at
// its reference duration on a fresh body; harder ground takes longer and so
// costs proportionally more (controller-liquidity W9 moved them off the
// controllers).

/** Hardness (MPa) at which a step takes its reference time. */
const PACE_REFERENCE_MPA = 200;
/** No step is quicker than this, however soft the rock. */
const MIN_STEP_MS = 500;
/** One cut, game ms, at reference hardness. */
const HEW_MS = 9000;
/** Swinging a pick: (967 − 300) × 9 s / 1500 = the old 4 %. */
const HEW_EFFORT_W = 967;
/** Condition one hew takes off the pick — fifty good swings to the haft. */
const PICK_WEAR_PER_HEW = 0.02;
/** Lumps one cut wins. */
const HEW_LUMPS = 1;
/** A running face's blow, J — a bruise, far below anything serious. */
const BRUISE_J = 40;
/** Rock this hard credits the hewer a `hard` cut, MPa. */
const HARD_ROCK_MPA = 250;
/** …and this hard, a `standard` one; softer is `easy`. */
const STANDARD_ROCK_MPA = 150;
/** One cell of heading, game ms, at reference hardness. */
const DRIVE_MS = 40000;
/** Driving a heading: (750 − 300) × 40 s / 1500 = the old 12 %. */
const DRIVE_EFFORT_W = 750;
/** Setting one timber, game ms. */
const SHORE_MS = 20000;
/** Setting timber: (900 − 300) × 20 s / 1500 = the old 8 %. */
const SHORE_EFFORT_W = 900;
/** Piping a charge off a face, game ms. */
const DRAIN_MS = 30000;
/** Working a hand pump. */
const DRAIN_EFFORT_W = 600;

/**
 * The public shape {@link WorkingMixin} provides — what a *working*
 * affords, whether it was carved or hand-authored. Consumers narrow with
 * `MixinApi.isActive(room, WORKING_MIXIN)` and speak this.
 */
export interface Working extends Strata {
  getBackPhrases(): readonly string[];
  setBackPhrases(v: string[]): void;
  getSeamPhrases(): readonly string[];
  setSeamPhrases(v: string[]): void;
  getAirPhrases(): readonly string[];
  setAirPhrases(v: string[]): void;
  getGroundPhrases(): readonly string[];
  setGroundPhrases(v: string[]): void;
  /** The ore row a cut from this working mints — locality content. */
  getOreRow(): string;
  setOreRow(v: string): void;
  getWorkedFaces(): Readonly<Record<string, number>>;
  setWorkedFaces(v: Record<string, number>): void;
  /** Directions whose face is blocked by loose ground. */
  getBlockedFaces(): readonly string[];
  setBlockedFaces(v: string[]): void;
  /** Loose ground has run into a face. Idempotent. */
  blockFace(direction: string): void;
  /** The face has been cleared. */
  clearFace(direction: string): void;
  /** Record `lumps` won from `direction`. The only writer of the depletion. */
  recordWinning(direction: string, lumps: number): void;
  // ⭐ `getCell` · `metresOf` · `getDeposit` · `getGroundSeed` ·
  // `sampleHere` are inherited from `Strata` (`/system/ground`) — see the
  // interface's `extends` clause. A working is a place in the ground that
  // somebody also CUTS.
  /** `spine` on a room with no warren — authored ground does not grow. */
  getTier(): WorkingTier;
  /** Every direction out, and what is behind it. */
  facesOf(): Promise<Face[]>;
  /**
   * ⭐⭐⭐ Draw the gas standing here off into a sealed vessel — the one
   * hazard in this trade you can HARVEST rather than merely survive.
   */
  drain(vessel: Stuff | null): Promise<DrainOutcome>;
  /** How much of the measures' gas has been drawn off, 0–1. */
  firedampDrawnFraction(): number;
  /** Litres the measures behind this working hold. */
  firedampReservoirL(): number;
  /** `f(span, ground, support, water)` — a threshold, never a roll. */
  stabilityAt(): Promise<Stability>;
  /**
   * ⭐ `hew`: win ore from the named face (or the richest unopened seam) with
   * `tool` — or bar down the fall that blocks it. The plan, or why not.
   */
  hewPlanFor(actor: Stuff, tool: Stuff | null, named?: string): Promise<HewPlan | HewRefusal>;
  /**
   * ⭐ `drift`/`sink`/`raise`: drive a heading `direction`; the vertical pair
   * passes the medium the fresh edges admit (a winze is climbed).
   */
  drivePlanFor(actor: Stuff, direction: string, medium: string | null): Promise<DrivePlan | DriveRefusal>;
  /** How long a step takes in this rock: `baseMs` scaled by hardness. */
  paceFor(baseMs: number, hardnessMPa: number): number;
  /** ⭐ `shore`: stand `set` under the back and secure the working. */
  shorePlanFor(actor: Stuff, set: Stuff | null): ShorePlan | ShoreRefusal;
  /** ⭐ `drain`: pipe the standing gas off into `vessel` — refused before the pump, never after. */
  drainPlanFor(actor: Stuff, vessel: Stuff | null): Promise<DrainPlan | DrainRefusal>;
  /** Condition-weighted timber support standing in this room. */
  supportHere(): number;
  /** The free warning, off the same threshold as the refusal. `null` when sound. */
  groundTelegraph(): Promise<string | null>;
  /** 1 fresh … 0 unbreathable, by distance along the carved graph. */
  airAt(): Promise<number>;
  /** Re-settle the air here and everywhere the change could have reached. */
  refreshAir(): Promise<void>;
}

export function WorkingMixin<TBase extends NestingConstructor<Stuff & Container>>(
  Base: TBase,
): TBase & MixinCtor<Working> {
  // ⭐ Composed over `StrataMixin` (`/system/ground`), which owns the five
  // position reads this mixin used to carry — `getCell`, `metresOf`,
  // `getDeposit`, `getGroundSeed`, `sampleHere`. Knowing where you are in
  // the column is the GROUND's business; cutting it is the trade's, and
  // the quarry that arrives next needs the first without the second.
  class WorkingMixin extends StrataMixin(Base) {
    static _mixinName = WORKING_MIXIN;

    /**
     * The inherited `Strata` reads, typed.
     *
     * ⚠ Not decoration: TypeScript does not surface a mixin's members on
     * `this` inside a class whose base is `SomeMixin(TypeParameter)`, so
     * `this.ground.getCell()` reads as *"Property 'getCell' does not exist"* even
     * though it resolves perfectly at runtime. One accessor rather than
     * eight casts. See `StrataMixin`'s header for the whole story.
     */
    private get ground(): Strata {
      return this as unknown as Strata;
    }

    /**
     * ⭐⭐ **The acts are afforded by the PLACE, and this is the only
     * thing that makes them exist.**
     *
     * ⚠ A row's `commandContributions:` is dead silently — the affordance
     * is a STATIC ON A CLASS. Without this block `hew`, `drift`, `sink`,
     * `raise` and `shore` parse as nothing at all: *"I don't understand
     * 'hew'."* Found by driving, in the tutorial drift, where every one
     * of them was supposed to be taught.
     *
     * `self` and `environment` rather than `peers`: the acts belong to
     * the working you are STANDING IN. A room affords them outward to its
     * contents (`environment` walks a thing's container chain), so
     * walking into a face lights up the verbs and walking out puts them
     * away — which is also the honest answer to *"why can't I hew in the
     * street"*.
     *
     * ⭐ Content affords the verbs; no core mixin does. That is the rule,
     * and it is what lets a second mine ship the same acts by naming this
     * class and nothing else.
     */
    static commandContributions = {
      // `inventory`: a location's occupants hear it (`self` is a giver's).
      inventory: [
        'trade/mining/cmd/mining/hew.yaml',
        'trade/mining/cmd/mining/drift.yaml',
        'trade/mining/cmd/mining/sink.yaml',
        'trade/mining/cmd/mining/raise.yaml',
        'trade/mining/cmd/mining/shore.yaml',
        'trade/mining/cmd/mining/drain.yaml',
      ],
    };

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
      // ⭐ The reservoir, as state about THIS ROOM. Draining is an ACT
      // with a credit and a consequence, so what has been taken has to
      // be remembered — a working you have drained stays drained until
      // the measures give it up again.
      firedampDrawnL: { persistent: true, runtimeState: true },
      firedampDrawnStamp: { persistent: true, runtimeState: true },
      oreRow: { persistent: true, authorable: true },
      // ⭐ A fall blocks a FACE, never a room. Persistent because clearing
      // one is work somebody did, and it should still be cleared after a
      // restart.
      blockedFaces: { persistent: true },
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
     * ⭐ Litres of gas drawn out of the measures behind this working.
     * The reservoir term: what you have taken, so that taking more gives
     * less and leaving it alone gives it back.
     */
    protected firedampDrawnL = 0;
    /** Game-time (s) the draw total was last reconciled; `-1` unseeded. */
    protected firedampDrawnStamp = -1;

    /**
     * The ore row a cut from this working mints. ⭐ LOCALITY content: what
     * comes out of Rejection's ground is Rejection's fact, and a second
     * mine names its own row without touching this pack.
     */
    protected oreRow: string = '';

    /**
     * Directions whose face has run and is blocked by loose ground.
     *
     * ⚠⚠ **A face, never a room.** Nothing cascades and nobody is buried:
     * every exit stays open, so a character can always walk out, and the
     * cost of neglect is ACCESS TO YOUR ORE rather than your life.
     */
    protected blockedFaces: string[] = [];

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

    public getBlockedFaces(): readonly string[] { return this.blockedFaces; }
    public setBlockedFaces(v: string[]): void { this.blockedFaces = v ?? []; }

    /** Loose ground has run into a face. Idempotent. */
    public blockFace(direction: string): void {
      if (!this.blockedFaces.includes(direction)) {
        this.blockedFaces = [...this.blockedFaces, direction];
      }
    }

    /** The face has been cleared. */
    public clearFace(direction: string): void {
      this.blockedFaces = this.blockedFaces.filter((d) => d !== direction);
    }

    /** Record `lumps` won from `direction`. The only writer of the depletion. */
    public recordWinning(direction: string, lumps: number): void {
      this.workedFaces[direction] = (this.workedFaces[direction] ?? 0) + lumps;
    }

    /**
     * Settle this working's air once the room is standing.
     *
     * ⭐ **This is what makes a hand-authored static mine hold foul air.**
     * The warren re-settles after every carve because it knows when the
     * shape changed; a static mine's shape never changes, so it settles
     * once, here, and stays right forever. Without it a bespoke mine
     * would read as fresh air everywhere — the exemplar claim quietly
     * false in the one place nobody would test.
     *
     * @hook Chained from `Stuff.onCreate`.
     */
    public async onCreate(context?: unknown): Promise<void> {
      // The `Persistable` chain shape: reach the base's own hook off the
      // prototype, because a mixin's `super` is not a class.
      await super.onCreate(context);
      await this.airAt();
    }

    // ───────────────────── the place, resolved ─────────────────────
    //
    // ⭐ `getCell`, `metresOf`, `getDeposit`, `getGroundSeed` and
    // `sampleHere` come from `StrataMixin` (`/system/ground`) now — the
    // position reads are the GROUND's, and the quarry the extraction build
    // adds needs them without depending on a mine. This mixin's own reads
    // (`facesOf`, `stabilityAt`, `airAt`, `getTier`) all call them through
    // `this`, unchanged.

    /**
     * The tier — ⭐ the ONE read that consults a warren, and it has an
     * honest static answer. A room whose warren is null is authored
     * ground, and authored ground is Spine by definition.
     */
    public getTier(): WorkingTier {
      const warren = this.mineWarren();
      if (!warren) return 'spine';
      return warren.tierOf(this.ground.getCell()) ?? 'spine';
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
    /**
     * ⭐ The `sample` act in a working (controller-liquidity W7c — the
     * ground's `samplePiece`, overridden): a lump of the face named (or the
     * richest), set down here; the verb stamps it with where you stand.
     */
    public override async samplePiece(actor: Stuff, req: SampleRequest): Promise<SampleAnswer> {
      const piece = await this.sampleFace(actor, req.face);
      if (!piece) return { ok: false, reason: 'nothing-to-take' };
      if (MixinApi.isContainable(piece)) ContainmentApi.move(piece, this as unknown as Stuff & Container);
      return { ok: true, facts: { piece, from: 'face', at: null, part: null } };
    }

    /**
     * ⭐⭐ **A working's lump of its face** (what `samplePiece` takes): it has
     * faces, an ore row and a grade, none of which plain ground knows
     * about. One lump, no engagement, no tool — a sample is a piece you
     * knock off with whatever is in your hand, and the JUDGEMENT is
     * what costs you.
     *
     * ⚠ `SAMPLE_LUMPS` is deliberately NOT recorded against the face's
     * remaining ore. A sample is a chip, not a cut; charging the face
     * for it would mean prospecting a claim slowly destroys it, which is
     * the opposite of what a sample is for.
     *
     * ⚠⚠ It is `sampleFace`, not `sampleHere`. `sampleHere()` is a DATA
     * READING of the deposit and returns a `GroundSample`; this returns
     * a lump of `Ore`. One dot apart on the same host — see `Strata`.
     */
    public async sampleFace(
      _actor: Stuff,
      direction: string,
    ): Promise<Stuff | null> {
      const wanted = direction.trim().toLowerCase();
      const faces = await this.facesOf();
      // Nothing named → the richest face that is still rock. Naming one
      // is how a prospector chooses; naming none is how they ask.
      const face =
        wanted === ''
          ? [...faces]
              .filter((f) => !f.open && !f.blocked)
              .sort((a, b) => b.grade - a.grade)[0]
          : faces.find(
              (f) => !f.open && !f.blocked && wanted.includes(f.direction),
            );
      if (!face) return null;
      const row = this.getOreRow();
      if (row.length === 0) return null;
      const lump = (await StuffApi.clone(row)) as unknown as {
        setGrade?(g: number): void;
      };
      if (typeof lump.setGrade === 'function') lump.setGrade(face.grade);
      return lump as unknown as Stuff;
    }

    public async facesOf(): Promise<Face[]> {
      const d = await this.ground.getDeposit();
      const zone = (this as unknown as { getZone(): { hasRoomAt(x: number, y: number, z: number): boolean } | null }).getZone();
      if (!d) return [];
      const seed = await this.ground.getGroundSeed();
      const here = this.ground.getCell();
      const out: Face[] = [];
      for (const dir of NavigationApi.cardinalDirections()) {
        const off = NavigationApi.directionOffset(dir);
        if (!off) continue;
        const cell: Cell = [here[0] + off[0], here[1] + off[1], here[2] + off[2]];
        const s = d.sampleAt(this.ground.metresOf(cell), seed);
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
          blocked: this.blockedFaces.includes(dir),
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
      const sample = await this.ground.sampleHere();
      const zone = (this as unknown as { getZone(): { hasRoomAt(x: number, y: number, z: number): boolean } | null }).getZone();
      const here = this.ground.getCell();

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
        GROUND_FLOOR + (1 - GROUND_FLOOR) * Math.min(1, groundMPa / GROUND_REFERENCE_MPA) +
          Math.min(SUPPORT_CAP, SET_WORTH * support) -
          SPAN_COST * span -
          WATER_COST * water,
      );
      const state: GroundState = value < BAD_BELOW ? 'bad' : value < WORKING_BELOW ? 'working' : 'sound';
      const cause: GroundCause | null =
        state !== 'bad' ? null : water > WET_ABOVE ? 'wet' : span >= WIDE_SPAN ? 'span' : 'back';
      return { value, state, span, groundMPa, support, water, cause };
    }

    /**
     * ⭐ **The free telegraph**, and it is free on purpose: creaking
     * timber, dust off the back, rock that sounds drummy. It rides the
     * SAME threshold the refusal does, so a player who is paying
     * attention is never surprised — the warning and the rule are one
     * number, and cannot drift apart.
     *
     * `null` when the ground is sound and has nothing to say.
     */
    public async groundTelegraph(): Promise<string | null> {
      const s = await this.stabilityAt();
      if (s.state === 'sound') return null;
      const bank = this.groundPhrases;
      if (bank.length > 0) {
        // Deterministic by cell, so one working always reads the same way.
        const cell = this.ground.getCell();
        return bank[Math.abs(cell[0] * 31 + cell[1] * 17 + cell[2] * 7) % bank.length]!;
      }
      return s.state === 'bad'
        ? 'The back is working here — dust sifts down where it should not.'
        : 'A timber creaks somewhere behind you.';
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
     * that breathes** — one with a way out of the workings.
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
      // ⭐ One traversal, or none (`docs/lint-family.md`
      // § `lint:graph-walks`). What is this walk's own and therefore
      // stayed: `breathes` as the halt condition, `AIR_REACH` as both
      // the bound AND the divisor, and `destinationsOf` as the
      // neighbour source — ⚠ deliberately `getExits()`, ALL of them,
      // where the perception walks read only the obvious ones. A
      // hidden heading still has air in it.
      const walk = new Traversal<Stuff & Container, number, void>({
        order: 'breadth-first',
        keyOf: (room) => room.stuffId,
        neighbours: (room) => neighboursOf(room).map((node) => ({ node })),
        bound: { hops: AIR_REACH },
        enter: (room) => (breathes(room) ? ('halt' as const) : undefined),
        fold: (_room, depth) => depth,
      });
      const { result, halted } = walk.walk(start, { carry: undefined });
      return halted === undefined
        ? this.settleAir(0)
        : this.settleAir(clamp01(1 - result / AIR_REACH));
    }

    /**
     * Memo the derived air value into the room's own `_atmosphere`
     * override, which is the field the respiration driver's chain walk
     * reads.
     *
     * ⭐ **Derive-on-read for TRUTH, write-through for CONSEQUENCE.** The
     * value itself is always a fresh function of the topology; this write
     * is what lets a body suffocate on it without the respiration driver
     * knowing anything about mines. Nothing else in the engine learns a
     * new concept — the working simply reports a different atmosphere,
     * and every shipped consequence (the crisis, the rescuable dying
     * clock, the recovery when you walk out) follows for free.
     */
    private settleAir(value: number): number {
      const want = value < FOUL_BELOW ? FOUL_ATMOSPHERE : null;
      const self = this as unknown as { _atmosphere: string | null };
      // `null` falls back through the biome chain, which is what a room
      // with good air should do — never a hardcoded 'air'.
      if (self._atmosphere !== want) self._atmosphere = want;
      void this.settleGas(value);
      return value;
    }

    /**
     * ⭐⭐⭐ **The third damp, and it is a GROUND fact.**
     *
     * Firedamp is methane adsorbed in coal measures: cut into them and it
     * comes out, and it accumulates wherever the air is not moving. So
     * the amount standing in a working is `strength × (how dead the air
     * is) × (how much the measures have left)` — three terms, each of
     * which is already true of something else in the model.
     *
     * ⚠ **It is the opposite hazard from blackdamp, and that is the
     * whole design.** Blackdamp is air with nothing left in it: odourless,
     * only the bird reads it, kills you quietly. Firedamp is breathable
     * at the fractions that matter — ⭐ so the canary SINGS, and the
     * player who has learnt to trust the bird learns that the bird is
     * answering a different question. Its tell is the flame: a lamp burns
     * a blue cap in it, which is what a Davy lamp was FOR.
     *
     * ⭐ Written through `setAtmosphereStanding`, a derived
     * write-through: standing amounts never decay (the measures are still
     * giving it off) and drawing one off suppresses it on a ramp. The
     * accumulated contents a fire emits are a different list in the same
     * medium, which is what lets the gas and the exhaust coexist without
     * either knowing about the other.
     */
    private async settleGas(air: number): Promise<void> {
      const self = this as unknown as Stuff & Container;
      if (!MixinApi.isAtmospheric(self)) return;
      const atm = self as unknown as Atmospheric;
      let sample: GroundSample | null = null;
      try {
        sample = await this.ground.sampleHere();
      } catch {
        return;
      }
      const gas = sample?.gas ?? null;
      if (gas === null) return;
      // ⭐ Dead air is what lets it build up: a heading with the air
      // moving through it carries the gas away, which is both true and
      // the remedy — hole it through and it clears, exactly as blackdamp
      // does.
      const standing =
        gas.strength * (1 - air) * (1 - this.firedampDrawnFraction());
      atm.setAtmosphereStanding(gas.materialPath, Math.max(0, standing));
    }

    /**
     * How much of the measures' gas has been drawn off, 0–1 —
     * reconcile-on-read with a half-life, so a drained working comes
     * back and an abandoned one is full again.
     */
    public firedampDrawnFraction(): number {
      const reservoir = this.firedampReservoirL();
      if (!(reservoir > 0)) return 0;
      this.reconcileFiredampDrawn();
      const f = this.firedampDrawnL / reservoir;
      return f > 1 ? 1 : f < 0 ? 0 : f;
    }

    /** Litres the measures behind this working hold. */
    public firedampReservoirL(): number {
      const self = this as unknown as Atmospheric;
      const volume = self.getVolume?.() ?? null;
      if (volume === null) return 0;
      const litres = volume.rawValue() * 1000;
      return litres * FIREDAMP_RESERVOIR_MULTIPLE;
    }

    /** Let the drawn total decay back toward zero over game time. */
    private reconcileFiredampDrawn(): void {
      const now = workingNowSeconds();
      if (now === null) return;
      if (this.firedampDrawnStamp < 0) {
        this.firedampDrawnStamp = now;
        return;
      }
      const elapsed = now - this.firedampDrawnStamp;
      if (elapsed <= 0) return;
      this.firedampDrawnStamp = now;
      if (!(this.firedampDrawnL > 0)) return;
      const halves = elapsed / FIREDAMP_RECHARGE_HALF_LIFE_S;
      this.firedampDrawnL *= Math.pow(0.5, halves);
      if (this.firedampDrawnL < 1) this.firedampDrawnL = 0;
    }

    /**
     * ⭐⭐⭐ **Draw the gas off into a vessel** — and the thing that was
     * trying to kill you becomes stock you can carry out.
     *
     * That inversion is the whole point of the act. Every other hazard in
     * this trade is something you avoid or survive; this one is something
     * you can decide to HARVEST, which is also why it is the act the
     * industrial epoch is built on (a town's gas supply is this, at
     * scale).
     *
     * ⚠ Only a SEALED vessel will hold it, and the refusal is the
     * vessel's own: *"it will not stay in a pail"*. That is not a check
     * this act invented — it is `requiredClosureFor` reading the gas's
     * boiling point, the same read that makes a bungled pour escape into
     * the room.
     */
    public async drain(vessel: Stuff | null): Promise<DrainOutcome> {
      const found = await this.drainable(vessel);
      if (!found.ok) return found;
      const { atm, material, litres } = found;
      const into = vessel as Stuff & Bulkable;
      const slot = into.getBulk('interior');
      if (found.fresh) into.setBulkMaterial('interior', material);
      into.setBulkAmount('interior', Quantity.of(slot.getAmount().rawValue() + litres, 'L'));
      // ⭐ Out of the air AND off the reservoir. The first makes the
      // heading workable; the second is what makes draining it twice
      // give less the second time.
      atm.drawAtmosphereContent(found.gasPath, litres);
      this.reconcileFiredampDrawn();
      this.firedampDrawnL += litres;
      return { ok: true, litres, material: material.getName() };
    }

    /**
     * What `drain` would draw, or why it would not — every refusal, nothing
     * written. Read before the pump starts AND again as it lands.
     */
    protected async drainable(vessel: Stuff | null): Promise<
      | Exclude<DrainOutcome, { ok: true }>
      | { ok: true; atm: Atmospheric; material: Material; litres: number; fresh: boolean; gasPath: string }
    > {
      const self = this as unknown as Stuff & Container;
      if (!MixinApi.isAtmospheric(self)) return { ok: false, reason: 'no-gas' };
      const atm = self as unknown as Atmospheric;
      let sample: GroundSample | null = null;
      try {
        sample = await this.ground.sampleHere();
      } catch {
        return { ok: false, reason: 'no-gas' };
      }
      const gas = sample?.gas ?? null;
      if (gas === null) return { ok: false, reason: 'no-gas' };
      const standing = atm
        .getAtmosphereContents()
        .find((c) => c.type === gas.materialPath);
      const volume = atm.getVolume();
      if (volume === null) return { ok: false, reason: 'no-gas' };
      const standingL = (standing?.amount ?? 0) * volume.rawValue() * 1000;
      if (!(standingL > 0)) return { ok: false, reason: 'no-gas' };

      if (vessel === null || !MixinApi.isBulkable(vessel)) {
        return { ok: false, reason: 'no-vessel' };
      }
      const material =
        MaterialApi.materials().need(gas.materialPath);
      if (material === null) return { ok: false, reason: 'no-gas' };
      const slot = vessel.getBulk('interior');
      if (slot.getCapacity() === null) return { ok: false, reason: 'no-vessel' };
      // ⚠ Construction AND the lid. A sealed bladder standing open is a
      // hole, which is the vessel's own answer and not this act's.
      if (
        BulkableApi.compareClosure(
          slot.getClosure(),
          BulkableApi.requiredClosureFor(material),
        ) < 0 ||
        (MixinApi.isSealable(vessel) && vessel.isOpen())
      ) {
        return { ok: false, reason: 'not-sealed' };
      }
      const existing = slot.getMaterialPath();
      if (existing !== null && existing !== gas.materialPath) {
        return { ok: false, reason: 'not-sealed' };
      }
      const litres = Math.min(standingL, slot.remaining());
      if (!(litres > 0)) return { ok: false, reason: 'no-room' };
      return { ok: true, atm, material, litres, fresh: existing === null, gasPath: gas.materialPath };
    }

    // ───────────────────────── the labour acts ─────────────────────────
    //
    // ⚠⚠ **None of these carries a deed gate, and that is a decision.**
    // They are LABOUR, not craft: a Discipline changes what you LEARN,
    // never what the ground GIVES. A miner with no transcript cuts exactly
    // as much ore out of a face as a master does.

    /** The warren that carved this room, or `null` for authored ground. */
    protected mineWarren(): MineWarren | null {
      const self = this as unknown as Stuff;
      if (!MixinApi.isWarrenMember(self)) return null;
      const warren = self.getWarren();
      return warren instanceof MineWarren ? warren : null;
    }

    /** How long a step takes in this rock: the reference time, scaled by hardness. */
    public paceFor(baseMs: number, hardnessMPa: number): number {
      return Math.max(MIN_STEP_MS, Math.round(baseMs * (hardnessMPa / PACE_REFERENCE_MPA)));
    }

    /**
     * ⚠ The ground refusal, and it **names the state**: neglecting support
     * costs you ACCESS to your ore, never your life.
     */
    protected async groundRefusal(): Promise<GroundRefusal | null> {
      const s = await this.stabilityAt();
      return s.cause === null ? null : { ok: false, reason: 'bad-ground', facts: { cause: s.cause } };
    }

    public async hewPlanFor(actor: Stuff, tool: Stuff | null, named?: string): Promise<HewPlan | HewRefusal> {
      // ⚠⚠ The pick, asked for: a tool that is not required is a number
      // with no referent. Bare-handed and wrong-tool are different
      // refusals — the delve's NPC hewers log which one they are.
      if (tool === null) return { ok: false, reason: 'no-tool' };
      if (!MixinApi.isTool(tool) || !tool.hasCapability('winning')) return { ok: false, reason: 'no-pick' };
      const pick = tool;
      const face = this.faceNamed(await this.facesOf(), named);
      if (!face) return { ok: false, reason: 'no-such-face', facts: { named: named ?? null } };
      if (face.open) return { ok: false, reason: 'face-is-open' };
      if (face.kind !== 'seam' || face.remaining === null) return { ok: false, reason: 'barren-face' };
      if (face.remaining <= 0) return { ok: false, reason: 'face-worked-out' };
      const bad = await this.groundRefusal();
      if (bad) return bad;
      const durationMs = this.paceFor(HEW_MS, face.hardnessMPa);
      // ⚠ A blocked face is cleared before it is worked — the same swing,
      // spent on the wrong rock. Neglect costs you a shift, not a life.
      if (face.blocked) {
        return {
          ok: true,
          durationMs,
          effortW: HEW_EFFORT_W,
          facts: { direction: face.direction, barring: true },
          onComplete: () => {
            // The rock does not care who barred it down.
            this.clearFace(face.direction);
            return { ok: true, facts: { kind: 'barred' } };
          },
        };
      }
      const oreRow = this.oreRow;
      if (oreRow.length === 0) return { ok: false, reason: 'no-ore-row' };
      return {
        ok: true,
        durationMs,
        effortW: HEW_EFFORT_W,
        facts: { direction: face.direction, barring: false },
        onComplete: async () => {
          // ⭐ The swing JARS the pick, and the haft gives first.
          if (MixinApi.isDurable(pick) && !pick.isDestroyed()) pick.wear(PICK_WEAR_PER_HEW, 'shock');
          // ⚠ The hewer may be GONE: a barge-in leaves the rock standing.
          if (actor.isDestroyed()) return { ok: true, facts: { kind: 'gone' } };
          return { ok: true, facts: await this.winOre(actor, face, oreRow) };
        },
      };
    }

    /** The named face, or the richest unopened seam when none is named. */
    protected faceNamed(faces: readonly Face[], named?: string): Face | null {
      if (named) {
        const dir = NavigationApi.normalizeDirection(named);
        return faces.find((f) => f.direction === dir) ?? null;
      }
      const workable = faces
        .filter((f) => !f.open && f.kind === 'seam' && (f.remaining ?? 0) > 0)
        .sort((a, b) => b.grade - a.grade);
      return workable[0] ?? null;
    }

    /**
     * Mint the lump at the deposit's grade (⭐ competence never multiplies
     * yield), stamp its owner, record the face, let an undercut face run,
     * credit the Discipline.
     */
    protected async winOre(hewer: Stuff, face: Face, oreRow: string): Promise<HewDone> {
      const room = this as unknown as Stuff & Container;
      // ⭐ Rock dust on the hewer — the pack's `dust` DirtKind row.
      if (MixinApi.isHygienic(hewer)) {
        // The act loads the pack's own dirt it lands (documents D7).
        await MaterialApi.dirtKinds().ensure('/trade/mining/dirt/dust');
        hewer.soilFrom([
          { kind: '/trade/mining/dirt/dust', amount: 0.2, where: 'hands' },
          { kind: '/trade/mining/dirt/dust', amount: 0.1, where: 'apron' },
        ]);
      }
      const lump = await StuffApi.clone<Stuff>(oreRow);
      if (lump instanceof Ore) lump.setGrade(face.grade);
      // ⭐ Title is stamped BEFORE it arrives: a titled good is not fresh.
      if (MixinApi.isChattel(lump)) await lump.stampChattel(this.winningOwner(hewer));
      ContainmentApi.move(lump as Stuff & Containable, room);
      this.recordWinning(face.direction, HEW_LUMPS);
      const ran = await this.maybeRun(hewer, face);
      if (MixinApi.isAdvancing(hewer)) {
        // World-derived difficulty: the rock decides how hard the cut was.
        const mpa = face.hardnessMPa;
        await hewer.creditDeed({
          discipline: 'geology',
          difficulty: mpa >= HARD_ROCK_MPA ? 'hard' : mpa >= STANDARD_ROCK_MPA ? 'standard' : 'easy',
          outcome: 'success',
        });
      }
      return { kind: 'won', lump, ran, direction: face.direction };
    }

    /**
     * ⭐ Loose falling — a THRESHOLD, never a roll: unquiet ground (the free
     * telegraph, off the same number) and the LAST cut off an undercut face.
     * ⚠⚠ It blocks the FACE, never the room; the cost is a shift and a
     * bruise through the harm system. Ground cannot kill.
     */
    protected async maybeRun(hewer: Stuff, face: Face): Promise<boolean> {
      const stability = await this.stabilityAt();
      if (stability.state === 'sound') return false;
      if ((face.remaining ?? 0) > HEW_LUMPS) return false;
      this.blockFace(face.direction);
      if (MixinApi.isVitals(hewer)) {
        ConditionApi.inflict(hewer, { mechanism: 'blunt', site: 'body.torso', energy: BRUISE_J });
      }
      return true;
    }

    /**
     * Who the lump belongs to: the house the hewer is on shift for here —
     * that is what tutwork MEANS (*the business keeps the ground and the
     * ore*) — otherwise the hewer.
     */
    protected winningOwner(hewer: Stuff): Stuff {
      if (this.mineWarren() === null || !MixinApi.isEmployed(hewer)) return hewer;
      const house = EmploymentApi.businessAt((this as unknown as Stuff).getTemplatePath() ?? '');
      return house && hewer.isOnShiftFor(house.getOrganizationPath()) ? house : hewer;
    }

    public async drivePlanFor(actor: Stuff, direction: string, medium: string | null): Promise<DrivePlan | DriveRefusal> {
      const dir = NavigationApi.normalizeDirection(direction);
      if (!dir) return { ok: false, reason: 'no-direction' };
      const warren = this.mineWarren();
      if (!warren) return { ok: false, reason: 'no-warren' };
      const face = (await this.facesOf()).find((f) => f.direction === dir);
      if (!face) return { ok: false, reason: 'no-such-face' };
      if (face.open) return { ok: false, reason: 'already-driven' };
      const bad = await this.groundRefusal();
      if (bad) return bad;
      // ⭐ Which type row the new cell clones from is the GROUND's call: a
      // cell in the seam opens out into a stope; barren rock stays a face.
      const type: WorkingType = face.kind === 'seam' ? 'stope' : 'face';
      // ⭐ Who cut it, as a title-shaped holder keyed by IDENTITY (D11 —
      // it was the lineage path every player shares).
      const holder: ParcelOwner = { kind: 'player', templatePath: actor.getIdentityPath() ?? '' };
      return {
        ok: true,
        durationMs: this.paceFor(DRIVE_MS, face.hardnessMPa),
        effortW: DRIVE_EFFORT_W,
        facts: { direction: dir },
        onComplete: async () => {
          if (actor.isDestroyed()) return { ok: true, facts: { kind: 'gone' } };
          const room = await warren.carve(face.cell, type, holder);
          if (!room) return { ok: true, facts: { kind: 'wont-take' } };
          if (medium !== null) this.widenEdge(room as unknown as Stuff, dir, medium);
          return { ok: true, facts: { kind: 'through', seam: face.kind === 'seam', direction: dir } };
        },
      };
    }

    /** Let the fresh exit pair at `room` admit `medium`, both sides. */
    protected widenEdge(room: Stuff, direction: string, medium: string): void {
      if (!MixinApi.isExitable(room)) return;
      const back = NavigationApi.invertDirection(direction);
      for (const [dir, exit] of room.getExits()) {
        if (dir !== back) continue;
        exit.setMedia([...new Set([...exit.getMedia(), medium])]);
        const other = exit.getDestination();
        if (other && MixinApi.isExitable(other)) {
          const inverse = other.getExit(direction);
          if (inverse) inverse.setMedia([...new Set([...inverse.getMedia(), medium])]);
        }
      }
    }

    public shorePlanFor(actor: Stuff, set: Stuff | null): ShorePlan | ShoreRefusal {
      if (!set || !isTimberSet(set)) return { ok: false, reason: 'no-timber' };
      const room = this as unknown as Stuff & Container;
      return {
        ok: true,
        durationMs: SHORE_MS,
        effortW: SHORE_EFFORT_W,
        facts: { set },
        onComplete: async () => {
          if (actor.isDestroyed()) return { ok: true, facts: { kind: 'gone' } };
          if (MixinApi.isContainable(set) && set.getContainer() !== room) {
            ContainmentApi.move(set as Stuff & Containable, room);
          }
          // ⭐ The promotion — the warren secures (and keeps) its own member.
          // A working with no warren is already Spine.
          const warren = this.mineWarren();
          const holder: ParcelOwner = { kind: 'player', templatePath: actor.getIdentityPath() ?? '' };
          if (warren && (await warren.secure(this.ground.getCell(), holder))) {
            return { ok: true, facts: { kind: 'secured' } };
          }
          const after = await this.stabilityAt();
          return { ok: true, facts: { kind: after.state === 'sound' ? 'sound' : 'not-enough' } };
        },
      };
    }

    public async drainPlanFor(actor: Stuff, vessel: Stuff | null): Promise<DrainPlan | DrainRefusal> {
      // ⭐ Refused BEFORE the pump (survey C20 — the refusals came after
      // thirty seconds of pumping), and read again as it lands.
      const found = await this.drainable(vessel);
      if (!found.ok) return found;
      return {
        ok: true,
        durationMs: DRAIN_MS,
        effortW: DRAIN_EFFORT_W,
        facts: undefined,
        onComplete: async () => {
          if (actor.isDestroyed()) return { ok: true, facts: { kind: 'gone' } };
          const out = await this.drain(vessel);
          if (!out.ok) return out;
          if (MixinApi.isAdvancing(actor)) {
            await actor.creditDeed({ discipline: 'mining', difficulty: 'standard', outcome: 'success' });
          }
          return { ok: true, facts: { kind: 'drawn', material: out.material, litres: out.litres } };
        },
      };
    }

    /**
     * Re-settle the air here and in every working within reach along the
     * exit graph. Called after the topology CHANGES (a carve, an abandon,
     * a hole-through), which is the only time it can change — the shape
     * of the workings is the whole of the model.
     */
    public async refreshAir(): Promise<void> {
      const start = this as unknown as Stuff & Container;
      // ⭐ Reach first (synchronously), then re-settle each room in
      // reach order. The skeleton is sync by design, and that costs
      // nothing here: `airAt` reads the topology and `getVentilated`,
      // never the `_atmosphere` it writes, so no room's answer depends
      // on whether a neighbour has already been re-settled. Collecting
      // then awaiting is identical to interleaving.
      const reached: (Stuff & Container)[] = [];
      const walk = new Traversal<Stuff & Container, void, void>({
        order: 'breadth-first',
        keyOf: (room) => room.stuffId,
        neighbours: (room) => neighboursOf(room).map((node) => ({ node })),
        bound: { hops: AIR_REACH * 2 },
        fold: (room) => {
          reached.push(room);
        },
      });
      walk.walk(start, { carry: undefined });
      for (const room of reached) {
        const w = room as unknown as { airAt?(): Promise<number> };
        if (typeof w.airAt === 'function') await w.airAt();
      }
    }
  }
  // ⚠ The cast pairs with the annotated return type — see `StrataMixin`'s
  // header for why the annotation is needed at all (TS drops a mixin's
  // base-of-a-type-parameter members from the derived class type, and
  // `MineRoom` lost the five position reads two mixins further up).
  return WorkingMixin as unknown as TBase & MixinCtor<Working>;
}


/**
 * What `drain` did, or why it would not. ⭐ Every refusal names a thing
 * the player can change: find a gassy heading, carry a vessel, carry a
 * SEALED one, or empty the one you have.
 */
export type DrainOutcome =
  | { ok: true; litres: number; material: string }
  | { ok: false; reason: 'no-gas' | 'no-vessel' | 'not-sealed' | 'no-room' };

// ───────────────────────── the acts' answers ─────────────────────────
//
// ⭐ controller-liquidity W9: the five labour acts (`hew`, `drift`/`sink`/
// `raise`, `shore`, `drain`) are the WORKING's — its plans decide every
// refusal before anything is written, and their completions do the work.
// The controllers word what these say.

/** Bad ground refuses, and names which term is to blame. */
export type GroundRefusal = ActRefusal<'bad-ground', { cause: GroundCause }>;

/** ⭐ Every reason `hew` will not swing. */
export type HewRefusal =
  /** Bare-handed — a different refusal from the wrong tool, and a diagnostic. */
  | ActRefusal<'no-tool'>
  /** Something in hand that does not win rock. */
  | ActRefusal<'no-pick'>
  | ActRefusal<'no-such-face', { named: string | null }>
  | ActRefusal<'face-is-open'>
  | ActRefusal<'barren-face'>
  | ActRefusal<'face-worked-out'>
  /** The locality authored no ore row for this working. */
  | ActRefusal<'no-ore-row'>
  | GroundRefusal;
export interface HewBegin {
  direction: string;
  /** Clearing a fall rather than cutting ore — the same swing on the wrong rock. */
  barring: boolean;
}
export type HewDone =
  | { kind: 'barred' }
  /** A lump won; `ran` when the undercut face let go after it. */
  | { kind: 'won'; lump: Stuff; ran: boolean; direction: string }
  /** The hewer left mid-swing: a barge-in leaves the rock standing. */
  | { kind: 'gone' };
export type HewPlan = ActPlan<HewBegin, HewDone, never>;

/** ⭐ Every reason a heading will not be driven. */
export type DriveRefusal =
  | ActRefusal<'no-direction'>
  /** Cut and finished workings — nobody drives here any more. */
  | ActRefusal<'no-warren'>
  | ActRefusal<'no-such-face'>
  | ActRefusal<'already-driven'>
  | GroundRefusal;
export interface DriveBegin {
  direction: string;
}
export type DriveDone =
  | { kind: 'through'; seam: boolean; direction: string }
  /** The warren would not carve there. */
  | { kind: 'wont-take' }
  | { kind: 'gone' };
export type DrivePlan = ActPlan<DriveBegin, DriveDone, never>;

export type ShoreRefusal = ActRefusal<'no-timber'>;
export interface ShoreBegin {
  set: Stuff;
}
export type ShoreDone =
  /** Promoted: held ground, kept with its contents. */
  | { kind: 'secured' }
  /** Authored ground needs no admitting; the back went quiet. */
  | { kind: 'sound' }
  /** It took some of the weight, not enough. */
  | { kind: 'not-enough' }
  | { kind: 'gone' };
export type ShorePlan = ActPlan<ShoreBegin, ShoreDone, never>;

export type DrainRefusal = Exclude<DrainOutcome, { ok: true }>;
export type DrainDone = { kind: 'drawn'; material: string; litres: number } | { kind: 'gone' };
export type DrainPlan = ActPlan<undefined, DrainDone, DrainRefusal>;

/** In-session game-time (seconds), or null when no world clock runs. */
function workingNowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    return null;
  }
  return WorldClockApi.getNow().rawValue();
}

/** Does this room have a way OUT of the workings — or say it breathes? */
function breathes(room: Stuff & Container): boolean {
  const myZone = (room as unknown as { getZone?(): unknown }).getZone?.() ?? null;
  for (const dest of destinationsOf(room)) {
    const theirZone = (dest as unknown as { getZone?(): unknown }).getZone?.() ?? null;
    // A way out of the workings' own zone is a way to the air. The adit
    // is the canonical one; a shaft would be another.
    if (theirZone !== myZone) return true;
  }
  return false;
}

/** The rooms one step along the exit graph. */
function neighboursOf(room: Stuff & Container): (Stuff & Container)[] {
  return destinationsOf(room);
}

/**
 * Every live room an exit of `room` leads to.
 *
 * ⚠ An exit whose destination has been reaped throws rather than
 * answering null (a blocked edge is a real state, not a missing one), so
 * the walk is guarded: a graph read during a teardown must degrade to
 * *"that way leads nowhere any more"* rather than take the reap down
 * with it.
 */
function destinationsOf(room: Stuff & Container): (Stuff & Container)[] {
  if (!MixinApi.isExitable(room)) return [];
  const out: (Stuff & Container)[] = [];
  for (const [, exit] of room.getExits()) {
    let dest: Stuff | null = null;
    try {
      dest = exit.getDestination() as unknown as Stuff | null;
    } catch {
      continue;
    }
    if (dest && !dest.isDestroyed() && MixinApi.isContainer(dest)) {
      out.push(dest as Stuff & Container);
    }
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
