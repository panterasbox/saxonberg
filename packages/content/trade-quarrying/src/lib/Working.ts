/**
 * OpenWorkingMixin — ⭐⭐ **an open working is a place whose WALL is a
 * section through the ground.**
 *
 * A mine grows a graph of headings because navigation is the hazard: air,
 * support, water. A quarry does not. **The face retreats and the floor
 * drops** — one place changing, not new places appearing — which is why
 * this is a mixin on a singleton Location and not a warren.
 *
 * ## The model, and it is the whole of it
 *
 * The face set is **every band the column exposes between the surface
 * (z = 0) and the current floor, plus the floor band itself.** There is no
 * `up`: the column is only sampled at `z ≤ 0`, so the collar rule is
 * structural rather than a guard, and `dig up` refuses because there is
 * nothing above you but sky.
 *
 * - Working the **floor** band removes one {@link LIFT_M} lift and drops
 *   the floor, which exposes more bands. That is how a pit gets deeper.
 * - Working an exposed **wall** band retreats it and mints a unit without
 *   deepening anything. That is how a pit gets wider.
 * - The floor stops at the deposit's **water table**. Below the water is
 *   the mining slate's (a pit that fills, and a pump), and `floorStop()` is
 *   the seam that lands on.
 *
 * ## ⭐ Overburden is the gate, and it is the lesson
 *
 * While the floor is still in earth and no rock is exposed, the working
 * reads *buried* and asking for stone refuses **in words that say what to
 * dig instead**. You strip waste before you win good, and how much waste
 * lies over how much good is what decides whether the ground is worth
 * working. Nothing else in this game charges you for what you throw away.
 *
 * ## ⭐ Depletion is a per-band ledger, and the arithmetic is honest
 *
 * `capacity = ceil(thickness / LIFT_M) × ceil(faceRunM / LIFT_M)` — how many
 * lifts deep the band is, times how far this pit may retreat a face inside
 * its claim. For a 4 m granite band on a 20 m run that is **320 units**,
 * and that number is *correct*: 160 m³ of rock, and a real quarryman cut a
 * few blocks a day. ⚠ **It was tempting to shrink the pit so a session
 * could exhaust a face.** That would be the world lying about scale. The
 * arithmetic stands, and *"worked out"* is observable because a venue
 * authors a **played-out working beside the fresh one** — zero grinding,
 * zero new code, and a second room that proves a second pit is rows.
 *
 * ## What this mixin is NOT
 *
 * It affords **no verb of its own.** Winning a face is the platform's
 * `dig`, afforded by the spade or pick in your hand; splitting a block is
 * the platform's `split`, afforded by the block; firing a limekiln is the
 * platform's `fire`, afforded by the appliance. The working answers the
 * kernel's {@link Diggable} shape and nothing more — which is why the next
 * open-air working in this game is rows.
 */

import { StrataMixin, type Strata, type MixinCtor } from '@saxonberg/content-ground/src/lib/Strata';
import type Deposit from '@saxonberg/content-ground/src/idea/Deposit';
import type { StratumBand } from '@saxonberg/content-ground/src/idea/Deposit';
import type { MixinConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import type {
  Diggable,
  WorkPrognosis,
  WorkResult,
} from '@saxonberg/server/mud/lib/ground/Workable';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import type { Chattel } from '@saxonberg/server/mud/lib/chattel/Chattel';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import {
  CompetenceBand,
  type CompetenceBandName,
} from '@saxonberg/server/mud/lib/advancement/CompetenceBand';

/** The mixin's marker, and the string `MixinApi.isActive` narrows on. */
export const OPEN_WORKING_MIXIN = 'OpenWorkingMixin';

/** The Discipline an open working credits. */
export const QUARRYING = 'quarrying';

/**
 * Metres of ground one act takes off, in either direction.
 *
 * ⭐ A lift is the quarryman's own unit — the depth of one bench cut — and
 * half a metre is about right for hand tools. It is the whole calibration:
 * a band's capacity is *how many lifts fit in it*, so the unit is visible
 * in the arithmetic rather than hidden in a yield table.
 */
export const LIFT_M = 0.5;

/** How far a pit retreats a face by default, when the row authors none. */
const DEFAULT_FACE_RUN_M = 20;

/** Reference hardness (MPa) the pace is normalised at — a slate. */
const REFERENCE_MPA = 100;

/** Reference game-ms one act takes at reference hardness. */
const ACT_MS = 8_000;

/** Endurance one act costs a fresh body, in percentage points. */
const ACT_COST = 6;

/** Material tag that makes a band earth rather than rock. */
const EARTH_TAG = 'earth';

/** The capability a spade offers — what shifts earth. */
const DIGGING = 'digging';

/** The capability a pick offers — what wins rock. */
const WINNING = 'winning';

/** Default row a won earth band mints when the band authors no `wins:`. */
const DEFAULT_EARTH_ROW = '/trade/quarrying/thing/spoil';

/** Default row a won rock band mints when the band authors no `wins:`. */
const DEFAULT_ROCK_ROW = '/trade/quarrying/thing/block';

/** Litres of bulk one unit of a bulk-winning band yields. */
export const BULK_PER_UNIT_L = 2;

/** Words that mean *above me* — the collar rule, stated. */
const UPWARD_WORDS: readonly string[] = ['up', 'above', 'sky', 'overhead', 'ceiling'];

/** One band of the column as this working sees it. */
export interface Band {
  /** The band's top, in zone metres (`0` for the surface band). */
  topZ: number;
  /** The band's bottom, in zone metres. */
  toZ: number;
  /** The host material's template path. */
  hostPath: string;
  /** What winning it mints — a row path or a material path. */
  wins: string | null;
}

/** A band, exposed, with everything an act needs to know about it. */
export interface ExposedFace extends Band {
  /** The resolved host material, or `null` when the row is missing. */
  host: Material | null;
  /** Is this earth (a spade) rather than rock (a pick)? */
  earth: boolean;
  /** Is this the band the floor currently sits in? */
  floor: boolean;
  /** Units already won out of it. */
  won: number;
  /** Units it holds in total. */
  capacity: number;
}

/** What `planWork` hands back to `completeWork` — the band, by path. */
interface DigToken {
  hostPath: string;
  floor: boolean;
}

/** The public surface an open working adds. */
export interface OpenWorking extends Strata, Diggable {
  /** How far below the collar the floor has been taken, in metres. */
  getFloorDepthM(): number;
  /** Every band the wall currently exposes, top-down. */
  exposedBands(): Promise<ExposedFace[]>;
  /** The band a player's word names, if the wall exposes it. */
  faceOf(word: string | null): Promise<ExposedFace | null>;
  /** Is the floor still in earth with no rock exposed? */
  isBuried(): Promise<boolean>;
  /** Units still winnable out of a band. */
  remainingIn(face: ExposedFace): number;
  /** The depth (m) the floor may not pass — the water. */
  floorStop(): Promise<number>;
  /** How this working reads, at a viewer's competence. */
  faceReadFor(band: CompetenceBandName): Promise<string>;

  // Public so the Hydrator can reflect into them. Not the contract.
  floorDepthM: number;
  wonByBand: Record<string, number>;
  faceRunM: number;
  spoilTo: string | null;
}

/**
 * *"a face of pale rock, with earth over it"* — appended on `look`, and
 * ⭐ **banded on the viewer's own `quarrying`**: an untrained eye gets the
 * colour, a quarryman gets the rock, the thickness and how far it has been
 * worked. The `Shore.readFor` shape, one trade over.
 *
 * ⚠ Synchronous, because `look` is: it renders the LAST resolved read and
 * kicks a refresh. A first look at a working nobody has read reports the
 * generic line, and the one after it is precise — the same bargain the
 * fishery's shore read makes, for the same reason (the column is an async
 * walk and a markup augmenter cannot await).
 */
function faceAugmenter(text: string, host: Stuff, viewer: Stuff): string {
  if (!MixinApi.isActive(host, OPEN_WORKING_MIXIN)) return text;
  const working = host as unknown as OpenWorking & {
    _faceLine: string | null;
    refreshFaceRead(band: CompetenceBandName): void;
  };
  const band = bandOf(viewer);
  working.refreshFaceRead(band);
  const line = working._faceLine;
  if (!line) return text;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

/** The viewer's `quarrying` band — the floor when unknown. */
function bandOf(viewer: Stuff): CompetenceBandName {
  if (!MixinApi.isAdvancing(viewer)) return CompetenceBand.FLOOR;
  const bands = viewer.competenceDigestCached();
  return (
    bands?.find((b) => b.discipline.endsWith(`/${QUARRYING}`) || b.discipline === QUARRYING)
      ?.band ?? CompetenceBand.FLOOR
  );
}

export function OpenWorkingMixin<
  TBase extends MixinConstructor<Stuff & Container>,
>(Base: TBase): TBase & MixinCtor<OpenWorking> {
  class OpenWorkingMixin extends StrataMixin(Base) {
    static _mixinName: string = OPEN_WORKING_MIXIN;

    /**
     * The inherited `Strata` reads, typed.
     *
     * ⚠ Not decoration: TypeScript does not surface a mixin's members on
     * `this` inside a class whose base is `SomeMixin(TypeParameter)`, so
     * `this.getDeposit()` reads as *"Property does not exist"* even though it
     * resolves perfectly at runtime. `WorkingMixin` carries the identical
     * accessor for the identical reason — see `StrataMixin`'s header.
     */
    private get ground(): Strata {
      return this as unknown as Strata;
    }

    /**
     * ⭐⭐ **The working affords `dig` to whoever is standing in it — and the
     * DRIVE is what put this here.**
     *
     * It was omitted at first, on the argument that the trade ships no verbs
     * and the instrument affords the act. Both halves of that are still true:
     * this names the **platform's** view, so the pack still ships no view and
     * no controller. What was wrong was the consequence — with the affordance
     * on the spade alone, a player who walked into a quarry **empty-handed**
     * got *"I don't understand 'dig'"*, and the acceptance criterion says
     * plainly: *"attempting to work a face with no tool is refused in words
     * that name what is needed."*
     *
     * ⭐⭐ **The refusal IS the progression UI.** If something lifts a
     * refusal, the verb has to EXIST so you can be told what would lift it.
     * That is the shipped rule and this is the second time this repo has paid
     * for forgetting it: the metal chain shipped `measure` afforded by the
     * instrument alone and a prospector with no dial was told the verb did
     * not exist.
     *
     * ⭐ So two rungs, as everything else in this tree has: the **ground**
     * affords digging to whoever stands in it, and the **spade** affords it
     * to whoever holds one. `hew` is afforded by the working; `measure` by
     * the instrument; `dig` is the verb that is honestly both.
     *
     * ⚠ `self` and `inventory` rather than `peers`: the act belongs to the
     * ground you are STANDING IN, so walking in lights it up and walking out
     * puts it away — which is also the honest answer to *"why can't I dig in
     * the street"*.
     */
    static commandContributions = {
      self: ['platform/cmd/ground/dig.yaml'],
      inventory: ['platform/cmd/ground/dig.yaml'],
    };

    static markupAugmenters: MarkupAugmenter[] = [faceAugmenter];

    static fieldMeta: FieldMeta = {
      floorDepthM: { persistent: true, authorable: true },
      wonByBand: { persistent: true, authorable: true },
      faceRunM: { persistent: true, authorable: true },
      spoilTo: { persistent: true, authorable: true },
    };

    /** Metres the floor has been taken below the collar. */
    public floorDepthM = 0;

    /**
     * Units won out of each band, keyed by the host material's path.
     *
     * ⭐ Authorable, which is what lets a venue ship a **played-out
     * working** — a second room beside the fresh one with its bands seeded
     * at capacity. That is how *"this face is worked out"* becomes
     * observable by walking rather than by grinding 320 units off a face
     * whose 320 is the correct number.
     */
    public wonByBand: Record<string, number> = {};

    /**
     * How far this pit may retreat a face, in metres — *how much ground
     * inside its claim*. Authored; the zone's cell size otherwise.
     */
    public faceRunM = 0;

    /**
     * Where the waste goes: a room's template path, or `null` to leave it
     * on the pit floor. ⭐ Either way it is **visible**, which is the whole
     * of AC 3 — the cost of extraction is a heap somebody can see.
     */
    public spoilTo: string | null = null;

    /** The last resolved face line, rendered by `look`. */
    public _faceLine: string | null = null;

    /** The band the last read was resolved at. */
    private _faceBand: CompetenceBandName | null = null;

    /** Guard: one refresh in flight. */
    private _faceRefreshing = false;

    // ───────────────────────── the column ─────────────────────────

    public getFloorDepthM(): number {
      return Math.max(0, this.floorDepthM);
    }

    /** How far this pit runs, in metres. */
    private runM(): number {
      if (this.faceRunM > 0) return this.faceRunM;
      const zone = (
        this as unknown as { getZone(): { getCellSize?(): number } | null }
      ).getZone();
      return zone?.getCellSize?.() ?? DEFAULT_FACE_RUN_M;
    }

    /** The column, as bands with tops filled in. */
    private async column(): Promise<Band[]> {
      const deposit = await this.ground.getDeposit();
      if (deposit === null) return [];
      const strata = deposit.getStratigraphy();
      const out: Band[] = [];
      let topZ = 0;
      for (const b of strata as readonly StratumBand[]) {
        out.push({
          topZ,
          toZ: b.toZ,
          hostPath: b.host,
          wins: b.wins ?? null,
        });
        topZ = b.toZ;
      }
      return out;
    }

    public async exposedBands(): Promise<ExposedFace[]> {
      const floorZ = -this.getFloorDepthM();
      const bands = await this.column();
      const out: ExposedFace[] = [];
      for (const b of bands) {
        // ⭐ Exposed iff the band's TOP is at or above the floor. At a fresh
        // collar (floor 0) only the surface band shows, which is the whole
        // of *you cannot work stone you have not uncovered*.
        if (b.topZ < floorZ) continue;
        const host = await resolveMaterial(b.hostPath);
        const earth = host !== null ? host.hasTag(EARTH_TAG) : false;
        const thickness = Math.max(0, b.topZ - b.toZ);
        out.push({
          ...b,
          host,
          earth,
          floor: floorZ > b.toZ && floorZ <= b.topZ,
          won: this.wonByBand[b.hostPath] ?? 0,
          capacity: capacityOf(thickness, this.runM()),
        });
      }
      return out;
    }

    public async faceOf(word: string | null): Promise<ExposedFace | null> {
      const faces = await this.exposedBands();
      if (word === null || word.trim() === '') {
        return faces.find((f) => f.floor) ?? faces[faces.length - 1] ?? null;
      }
      const want = word.trim().toLowerCase();
      for (const face of faces) {
        if (matchesBand(face, want)) return face;
      }
      return null;
    }

    public async isBuried(): Promise<boolean> {
      const faces = await this.exposedBands();
      if (faces.length === 0) return false;
      return faces.every((f) => f.earth);
    }

    public remainingIn(face: ExposedFace): number {
      return Math.max(0, face.capacity - face.won);
    }

    public async floorStop(): Promise<number> {
      const deposit = await this.ground.getDeposit();
      // ⚠ The water table is a NEGATIVE z; the floor depth is positive.
      // Below the water is `mining-slate`'s — a pit that fills, and a pump.
      if (deposit === null) return 0;
      return Math.max(0, -deposit.getWaterTable());
    }

    // ───────────────────────── the Diggable shape ─────────────────────────

    public readonly diggable = true as const;

    public async planWork(
      _by: Stuff,
      tool: (Stuff & Tooled) | null,
      what: string | null,
    ): Promise<WorkPrognosis> {
      const asked = what?.trim().toLowerCase() ?? '';
      if (UPWARD_WORDS.includes(asked)) {
        return {
          kind: 'refusal',
          reason: 'no-face-above',
          prose:
            'There is no face above you. The ground stops at the surface, and there is nothing over your head but sky.',
        };
      }

      const face = await this.faceOf(what);
      if (face === null) {
        // ⚠ Two different absences, and they must not share a sentence. A
        // band that exists in the column but is not yet uncovered is a
        // *lesson*; a word that names nothing at all is a *mistake*.
        const buriedBand = await this.buriedBandFor(asked);
        if (buriedBand !== null) {
          return {
            kind: 'refusal',
            reason: 'under-overburden',
            prose: `The ${nameOfBand(buriedBand)} is under your feet yet. The floor has to come down to it — strip what is over it first.`,
          };
        }
        return {
          kind: 'refusal',
          reason: 'no-such-face',
          prose: asked
            ? `There is no ${asked} in this ground. Look at the wall and see what is in it.`
            : 'There is no face here to work.',
        };
      }

      // ⭐⭐ The overburden gate. Asking for rock while the floor is still
      // in earth and nothing is uncovered refuses in words that say what to
      // do about it — the lesson, not a wall.
      if (!face.earth && (await this.isBuried())) {
        return {
          kind: 'refusal',
          reason: 'under-overburden',
          prose:
            'There is drift over this ground yet. Take a spade to that before you look for stone under it.',
        };
      }

      // ⭐⭐ **The tool is the constraint, and the GROUND names it.** One
      // verb serves earth and rock, so the refusal is about the tool rather
      // than about another verb — which is the whole of what makes `dig`
      // one act instead of two.
      const wanted = face.earth ? DIGGING : WINNING;
      if (tool === null || !tool.hasCapability(wanted)) {
        // ⚠⚠ **Bare-handed and WRONG-TOOL are different refusals**, and the
        // live browser drive is what proved it. One branch served both, so
        // standing at an earth face with empty hands read *"A pick will not
        // shift drift"* — naming a tool the player had never picked up, in
        // the first sentence a new quarryman ever sees.
        //
        // ⭐ The wire checkpoint passed throughout: it asserts the `reason`
        // (`no-spade`), and the sentence does go on to mention a spade. Only
        // a reader notices the opening clause is false. That is the whole
        // argument for walking a build in a browser.
        const barehanded = tool === null;
        return {
          kind: 'refusal',
          reason: face.earth ? 'no-spade' : 'no-pick',
          prose: face.earth
            ? barehanded
              ? `You will not shift ${nameOfFace(face)} with your hands — take a spade to it.`
              : `A pick will not shift ${nameOfFace(face)} — take a spade to it.`
            : barehanded
              ? `You would want a pick. That is ${nameOfFace(face)}, and it wants winning — not bare hands.`
              : `You would want a pick. That is ${nameOfFace(face)}, and it wants winning, not shovelling.`,
        };
      }

      if (this.remainingIn(face) <= 0) {
        return {
          kind: 'refusal',
          reason: 'worked-out',
          prose: `This face is worked out. There is no ${nameOfFace(face)} left in it that anybody could reach from here.`,
        };
      }

      if (face.floor) {
        const stop = await this.floorStop();
        if (stop > 0 && this.getFloorDepthM() + LIFT_M > stop) {
          return {
            kind: 'refusal',
            reason: 'at-the-water',
            prose:
              'The floor is standing in water. Anything below this wants pumping, and nobody here has a pump.',
          };
        }
      }

      const hardness = face.host?.getHardness().rawValue() ?? REFERENCE_MPA;
      return {
        kind: 'plan',
        durationMs: Math.max(
          1_000,
          Math.round(ACT_MS * (hardness / REFERENCE_MPA)),
        ),
        cost: ACT_COST,
        beginSelf: face.earth
          ? `You set into the ${nameOfFace(face)}, cutting and casting back.`
          : `You set the point of it into the ${nameOfFace(face)} and start working a block free.`,
        beginPeers: face.earth
          ? 'Somebody starts stripping the face.'
          : 'Somebody starts working stone out of the face.',
        token: { hostPath: face.hostPath, floor: face.floor } satisfies DigToken,
      };
    }

    public async completeWork(
      by: Stuff,
      _tool: (Stuff & Tooled) | null,
      token: unknown,
    ): Promise<WorkResult> {
      const tok = token as DigToken;
      const faces = await this.exposedBands();
      const face = faces.find((f) => f.hostPath === tok.hostPath) ?? null;
      if (face === null) {
        return { self: 'The face has changed under you. Look again.' };
      }

      this.recordWon(face.hostPath);
      if (tok.floor) this.deepen();

      const won = await this.mintWinnings(face, by);
      const tail = this.remainingIn(face) <= 0 ? ' That is the last of this face.' : '';
      return {
        self: won === null
          ? `You work a load of ${nameOfFace(face)} free.${tail}`
          : `${won}${tail}`,
        peers: null,
        credit: {
          discipline: QUARRYING,
          // ⭐ Difficulty is the ROCK's, read at the moment of the act: a
          // granite face is a hard check and drift is a trivial one, which
          // is the estimator's own anti-grind property rather than a guard.
          difficulty: face.earth
            ? 'easy'
            : (face.host?.getHardness().rawValue() ?? 0) >= 150
              ? 'hard'
              : 'standard',
        },
      };
    }

    /** Bank one unit against a band. */
    public recordWon(hostPath: string): void {
      const before = this.wonByBand[hostPath] ?? 0;
      this.wonByBand = { ...this.wonByBand, [hostPath]: before + 1 };
    }

    /** Drop the floor one lift. */
    public deepen(): void {
      this.floorDepthM = this.getFloorDepthM() + LIFT_M;
      // A deeper floor is a different wall, so the cached read is stale.
      this._faceLine = null;
      this._faceBand = null;
    }

    /**
     * Mint what the band yields and put it where it goes.
     *
     * ⭐ **The band decides, not this file.** `wins:` names a row (a block,
     * a lump, a turf) or a material (bulk, recognised by the
     * `/idea/material/` infix). Absent, earth defaults to spoil and rock to
     * a block, with the material restamped onto it so a granite block is
     * granite and a limestone block is limestone off one row.
     */
    private async mintWinnings(
      face: ExposedFace,
      by: Stuff,
    ): Promise<string | null> {
      const wins = face.wins ?? (face.earth ? DEFAULT_EARTH_ROW : DEFAULT_ROCK_ROW);
      if (wins.includes('/idea/material/')) {
        return this.fillBulk(face, wins, by);
      }
      let thing: Stuff;
      try {
        thing = await StuffApi.clone<Stuff>(wins);
      } catch {
        // ⚠ A missing row is a content gap, not a reason to lose the work:
        // the ledger is banked either way and the log carries the fault.
        console.error(`OpenWorking: won row '${wins}' did not resolve`);
        return null;
      }
      // Restamp the material so ONE block row serves every rock in the game.
      if (face.host !== null && MixinApi.isTangible(thing)) {
        thing.setMaterial(face.host);
      }
      const where = await this.destinationFor(face);
      if (MixinApi.isContainable(thing) && MixinApi.isContainer(where)) {
        ContainmentApi.move(thing as Stuff & Containable, where as Stuff & Container);
      }
      // ⭐ The good carries its owner from the face onward — what makes
      // stone theft mean anything later. ⚠ Best-effort: ground nobody holds
      // yields an UNSTAMPED good rather than refusing the work, which is
      // honest — a trespasser's barrowload is nobody's in the register too.
      if (MixinApi.isChattel(thing)) {
        try {
          await (thing as Stuff & Chattel).stampChattel(by);
        } catch {
          /* unowned ground: the good is nobody's */
        }
      }
      const heaped =
        where !== (this as unknown as Stuff)
          ? 'and it goes to the tip'
          : 'and it lies where it fell';
      return `You work ${thing.getPresentation()} free, ${heaped}.`;
    }

    /**
     * A bulk band fills a vessel instead of minting a thing — rock salt is
     * the case, and it is why `cure` runs on salt from a face exactly as it
     * runs on salt from a pan.
     */
    private async fillBulk(
      face: ExposedFace,
      materialPath: string,
      by: Stuff,
    ): Promise<string | null> {
      const material = await resolveMaterial(materialPath);
      if (material === null) return null;
      const vessel = MixinApi.isContainer(by)
        ? by.getContents().find((c) => MixinApi.isBulkable(c)) ?? null
        : null;
      if (vessel === null || !MixinApi.isBulkable(vessel)) {
        // ⚠ Not a refusal: the work was done. The band is banked and the
        // player is told plainly why they have nothing to show for it.
        return `You break ${nameOfFace(face)} loose and it runs away between your fingers. You want something to carry it in.`;
      }
      vessel.setBulkMaterial('interior', material);
      const before = vessel.getBulkAmount('interior').rawValue();
      vessel.setBulkAmount('interior', Quantity.of(before + BULK_PER_UNIT_L, 'L'));
      return `You break ${nameOfFace(face)} loose and shovel it into ${vessel.getPresentation()}.`;
    }

    /** Where a won good lands: the tip when one is authored, else here. */
    private async destinationFor(face: ExposedFace): Promise<Stuff> {
      const self = this as unknown as Stuff;
      if (!face.earth || this.spoilTo === null) return self;
      try {
        const tip = await StuffApi.singleton<Stuff>(this.spoilTo);
        return tip ?? self;
      } catch {
        return self;
      }
    }

    /** A band that IS in the column but is not uncovered yet. */
    private async buriedBandFor(word: string): Promise<Band | null> {
      if (word === '') return null;
      const bands = await this.column();
      const floorZ = -this.getFloorDepthM();
      for (const b of bands) {
        if (b.topZ >= floorZ) continue;
        const host = await resolveMaterial(b.hostPath);
        const face: ExposedFace = {
          ...b,
          host,
          earth: host?.hasTag(EARTH_TAG) ?? false,
          floor: false,
          won: 0,
          capacity: 0,
        };
        if (matchesBand(face, word)) return b;
      }
      return null;
    }

    // ───────────────────────── the read ─────────────────────────

    public async faceReadFor(band: CompetenceBandName): Promise<string> {
      const faces = await this.exposedBands();
      if (faces.length === 0) {
        return 'The ground here is turned over and tells you nothing.';
      }
      const rank = COMPETENT_OR_BETTER.includes(band);
      const buried = await this.isBuried();
      const parts: string[] = [];

      if (!rank) {
        // ⚠ The vague read: colour and a gesture, no rock named and no
        // figure. An untrained eye genuinely cannot tell limestone from
        // chalk, and saying so is the progression UI.
        const stone = faces.find((f) => !f.earth);
        parts.push(
          stone
            ? 'A face of some kind of pale rock stands open here'
            : 'A cut of bare earth stands open here',
        );
        if (buried) parts.push('with earth over whatever is under it');
        return `${parts.join(', ')}.`;
      }

      for (const face of faces) {
        const thickness = Math.max(0, face.topZ - face.toZ);
        const state = this.wearOf(face);
        parts.push(
          `${nameOfFace(face)}, ${describeThickness(thickness)}${state ? `, ${state}` : ''}`,
        );
      }
      const head = `The wall reads top-down: ${parts.join('; ')}.`;
      const tail = buried
        ? ' Nothing under the drift is open yet.'
        : '';
      return head + tail;
    }

    /** How worked a face is, in words. ⚠ Never a number. */
    private wearOf(face: ExposedFace): string | null {
      if (face.capacity <= 0) return null;
      const left = this.remainingIn(face) / face.capacity;
      if (left <= 0) return 'worked out';
      if (left < 0.15) return 'very nearly gone';
      if (left < 0.5) return 'thinning';
      if (left < 0.98) return 'well into';
      return 'barely touched';
    }

    /**
     * Kick a face read if the cached one is missing or was resolved at a
     * different band. Fire-and-forget — the augmenter is sync.
     */
    public refreshFaceRead(band: CompetenceBandName): void {
      if (this._faceRefreshing) return;
      if (this._faceLine !== null && this._faceBand === band) return;
      this._faceRefreshing = true;
      void this.faceReadFor(band)
        .then((line) => {
          this._faceLine = line;
          this._faceBand = band;
        })
        .catch(() => {
          /* a column that will not resolve reads as nothing, not as a crash */
        })
        .finally(() => {
          this._faceRefreshing = false;
        });
    }
  }
  return OpenWorkingMixin as unknown as TBase & MixinCtor<OpenWorking>;
}

/** Bands at or above this rank get the precise read. */
const COMPETENT_OR_BETTER: readonly CompetenceBandName[] = [
  'competent',
  'proficient',
  'expert',
];

/**
 * Units a band holds: how many lifts deep it is, times how many lifts of
 * face this pit may retreat.
 *
 * ⚠ ⭐ **The number is large and it is CORRECT.** A 4 m band on a 20 m run
 * is 320 units — 160 m³ of rock, and a real quarryman cut a few blocks a
 * day. Shrinking it so one session could exhaust a face would be the world
 * lying about scale, which is exactly the failure the pedagogy lens exists
 * to catch. *Worked out* is authored, not ground down.
 */
function capacityOf(thicknessM: number, faceRunM: number): number {
  if (!(thicknessM > 0) || !(faceRunM > 0)) return 0;
  return Math.ceil(thicknessM / LIFT_M) * Math.ceil(faceRunM / LIFT_M);
}

/** Does a player's word name this band? */
function matchesBand(face: ExposedFace, want: string): boolean {
  if (leafOf(face.hostPath) === want) return true;
  const name = face.host?.getName()?.toLowerCase() ?? '';
  if (name === want) return true;
  if (name.includes(want) && want.length >= 4) return true;
  // ⭐ `dig floor` / `dig down` works on whatever is under you, which is
  // what a player types when they mean *deepen the pit*.
  if (face.floor && (want === 'floor' || want === 'down' || want === 'ground')) {
    return true;
  }
  return false;
}

/** The last segment of a template path. */
function leafOf(path: string): string {
  const cut = path.lastIndexOf('/');
  return (cut >= 0 ? path.slice(cut + 1) : path).toLowerCase();
}

/** What to call a band in a sentence. */
function nameOfFace(face: ExposedFace): string {
  return face.host?.getName() ?? leafOf(face.hostPath);
}

/** What to call a band nobody has uncovered. */
function nameOfBand(band: Band): string {
  return leafOf(band.hostPath);
}

/** Thickness in words. ⚠ Never a bare number in player-facing prose. */
function describeThickness(m: number): string {
  if (m <= 0.6) return "a spade's depth of it";
  if (m <= 1.5) return 'about a yard of it';
  if (m <= 3) return 'a couple of yards of it';
  if (m <= 6) return 'several yards of it';
  return 'yards and yards of it';
}

/** Resolve a `Material` row, or `null`. */
async function resolveMaterial(path: string): Promise<Material | null> {
  try {
    return (await StuffApi.singleton<Material>(path)) ?? null;
  } catch {
    console.error(`OpenWorking: material '${path}' did not resolve`);
    return null;
  }
}

/** Re-exported so a consumer needs one import. */
export type { Deposit };
