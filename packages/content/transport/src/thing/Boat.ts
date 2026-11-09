/**
 * Boat — ⭐⭐ **a small craft: a thing in a water room** (river D19–D24).
 *
 * A canoe, a punt, a rowboat, a ship's dinghy. Only places are tracked on
 * the overworld, and a boat is not a place: it is a thing you sit in,
 * standing in whatever water room it is in — the water within hail on a
 * river, a stop at a bank, an authored river place, the room alongside a
 * stopped ship, a ship's deck. Its position is its container's, always.
 *
 * - **Its people move it.** `paddle` (the one new verb) propels it by the
 *   effort of whoever is in it, with whatever part it carries — paddles,
 *   oars, a pole (D21). The part decides the physics and the words.
 * - **Stopping is landing.** `paddle` to a bank, a bar, a landing within
 *   hail lands it there; a killick holds it in slack water (`anchor`, D23).
 * - **It can go over.** Water rougher than its freeboard swamps it: its
 *   people are in the water beside it and it floats upside down; `pull`
 *   rights it (D22).
 * - **It can be carried.** It is haulable: `hitch` it and carry it round
 *   what it cannot float through (D24, portage).
 *
 * ⭐ **Its zone is null for life** (D38): every boat is a kind row of this
 * pack, propped where it lies or sold from a shelf, and a pack `thing` row
 * resolves no spatial zone — so the shipped containment rule lets it go
 * into any water room, a stop or a deck without anything ever being
 * restamped. ⛔ A boat row authored under a venue would be zoned and stuck
 * at its first landing; `Boat.zone.test.ts` refuses one.
 *
 * It persists as content (of the stop it is beached in, the deck it is
 * propped on) and as its owner's estate — not as a host of its own.
 */

import ExitableVessel from '@saxonberg/server/mud/lib/boundary/ExitableVessel';
import { MobileMixin } from '@saxonberg/server/mud/lib/spatial/Mobile';
import { EngagedMixin } from '@saxonberg/server/mud/lib/activity/Engaged';
import { HaulableMixin } from '@saxonberg/server/mud/lib/slot/Haulable';
import { PullableMixin, type PullOutcome, type PullSense } from '@saxonberg/server/mud/lib/spatial/Pullable';
import { StagedMixin } from '@saxonberg/server/mud/lib/stuff/Staged';
import { SmallCraftMixin, type SmallCraft } from '@saxonberg/server/mud/lib/expanse/SmallCraft';
import type { ActOutcome, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import {
  AnchoringMixin,
  type Anchoring,
  type AnchorPlan,
  type AnchorRefusal,
} from '@saxonberg/server/mud/lib/expanse/Anchoring';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MixinConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Mobile } from '@saxonberg/server/mud/lib/spatial/Mobile';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import type { Slotted } from '@saxonberg/server/mud/lib/slot/Slotted';
import type { Engaged } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { Tangible } from '@saxonberg/server/mud/lib/material/Tangible';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import Propulsion from './Propulsion';
import { Propel, type PropelHeading } from '../lib/Propel';
import Killick from './Killick';
import type ReachWarren from '@saxonberg/content-water/src/idea/ReachWarren';
import WaterExpanse from '@saxonberg/content-water/src/idea/WaterExpanse';
import { HirableMixin, type Hirable } from '@saxonberg/server/mud/lib/retail/Hirable';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { FacedMixin, type Faced } from '@saxonberg/server/mud/lib/material/Faced';
import { BilgeMixin, type Bilge } from '@saxonberg/server/mud/lib/expanse/Bilge';
import {
  LiftSourceMixin,
  type LiftSource,
  type BucketLanding,
} from '@saxonberg/server/mud/lib/pump/LiftSource';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';

type BoatShape = Stuff & Slotted & Mobile & Container & Containable & Exitable & Engaged & Tangible & SmallCraft & Anchoring & Hirable & Faced & Bilge &
  { entryMediaIn(env: Stuff & Container): string[]; onMoved(from: (Stuff & Container) | null, to: (Stuff & Container) | null): void };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BoatCtor = new (...args: any[]) => BoatShape;

const BoatBase = BilgeMixin(
  FacedMixin(
    HirableMixin(
      PullableMixin(
        HaulableMixin(AnchoringMixin(SmallCraftMixin(StagedMixin(EngagedMixin(MobileMixin(ExitableVessel))))) as unknown as MixinConstructor<BoatShape>),
      ) as unknown as MixinConstructor<BoatShape>,
    ) as unknown as MixinConstructor<BoatShape>,
  ) as unknown as MixinConstructor<BoatShape>,
) as unknown as BoatCtor;

/** What a boat affords to whoever sits in it. */
const FROM_INSIDE = [
  'platform/cmd/device/bail.yaml',
  'system/transport/cmd/movement/paddle.yaml',
  'system/transport/cmd/movement/launch.yaml',
  'system/transport/cmd/movement/recover.yaml',
];

/** A hull's numbers (D20). */
export interface HullSpec {
  form: 'flat' | 'round' | 'keeled';
  draftM: number;
  beamM: number;
  lengthM: number;
  freeboardM: number;
  capacityKg: number;
}

const DEFAULT_HULL: HullSpec = {
  form: 'round',
  draftM: 0.15,
  beamM: 0.9,
  lengthM: 5,
  freeboardM: 0.3,
  capacityKg: 300,
};

/** Below this wind a sail hangs slack, m/s. */
const SAIL_MIN_WIND_MPS = 1.5;

/** Where the river's warren lives — what a boat asks about the water it is in. */
const WARREN_PATH = '/system/water/idea/ReachWarren';

/** Where the sea's warren lives. */
const SEA_PATH = '/system/water/idea/SeaWarren';

/** ⭐ Every reason a boat will not go into the water — `LaunchController` words each. */
export type LaunchRefusal =
  /** No water beside here; `ashore` false = she lies in nothing at all. */
  | ActRefusal<'no-water', { ashore: boolean }>
  | ActRefusal<'already-launched'>;

/** ⭐ Every reason a boat will not come out of the water — `RecoverController` words each. */
export type RecoverRefusal = ActRefusal<'not-afloat'> | ActRefusal<'nowhere'>;

/**
 * How much of the water's roughness comes over a gunwale — the river's rule
 * (`Propel`: `roughness × 0.6`), and the same at sea, where the roughness is
 * the sea state's.
 */
const WAVE_SHARE = 0.6;

/**
 * ⭐ What a hole in her lets in, L/s (grain; `boat.leak.holed`):
 * less than one person bailing moves — so bailing keeps a holed boat up,
 * and stopping lets her fill.
 */
const HOLED_LPS = 0.3;

/** What a hull that does not hold water lets in — a crack, a coat that has opened, L/s (`boat.leak.seep`). */
const SEEP_LPS = 0.02;

/** About one spell of bailing her, game-seconds — what "as fast as you throw it out" compares. */
const BAIL_SPELL_S = 20;

/** What her bilge water is (the bilge well's material). */
const WATER_PATH = '/stuff/idea/material/bulk/water';

/** ⭐ What a look says of a boat: how low she rides, and whose hire she is on. */
const boatAugmenter: MarkupAugmenter = (text, host, _viewer, opts) => {
  if (opts?.filter && !opts.filter.includes('vision')) return text;
  if (!(host instanceof Boat)) return text;
  const lines = host.describeBoat();
  if (lines.length === 0) return text;
  const all = lines.join(' ');
  return text && text.length > 0 ? `${text}\n\n${all}` : all;
};


export default class Boat extends LiftSourceMixin(BoatBase) implements LiftSource {
  static commandContributions: CommandContributions = {
    inventory: FROM_INSIDE,
    // ⭐ Whoever is in the water beside her can right her (D22): `pull`, the
    // trap's way (the river drive: a swamped canoe's people were told
    // "I don't understand 'pull'").
    peers: ['platform/cmd/inventory/pull.yaml'],
  };

  static markupAugmenters: MarkupAugmenter[] = [boatAugmenter];

  static fieldMeta: FieldMeta = {
    eyeHeightM: { persistent: true, authorable: true },
    heightM: { persistent: true, authorable: true },
    hull: { persistent: true, authorable: true },
  };

  /** Eye height of somebody sitting in it, meters. */
  protected eyeHeightM = 1;
  /** How tall it stands as a target, meters. */
  protected heightM = 1.5;
  /** The hull's numbers. */
  protected hull: HullSpec = { ...DEFAULT_HULL };
  /** Upside down in the water (runtime: a restart rights it). */
  private _capsized = false;

  public getEyeHeightM(): number { return this.eyeHeightM; }
  public setEyeHeightM(v: number): void { this.eyeHeightM = Math.max(0, Number(v) || 0); }
  public getHeightM(): number { return this.heightM; }
  public setHeightM(v: number): void { this.heightM = Math.max(0, Number(v) || 0); }

  public getHull(): HullSpec {
    return { ...this.hull };
  }
  public setHull(v: Partial<HullSpec> | null): void {
    this.hull = { ...DEFAULT_HULL, ...(v ?? {}) };
  }

  public isCapsized(): boolean {
    return this._capsized;
  }

  /** The crew-powered part it carries, if any — what `paddle` propels it with. */
  public propulsion(): Propulsion | null {
    for (const c of this.getContents()) {
      if (c instanceof Propulsion && c.isCrewPowered()) return c;
    }
    return null;
  }

  /** ⭐ The sail she carries, if any — what `course` from her tiller sets (D20). */
  public sail(): Propulsion | null {
    for (const c of this.getContents()) {
      if (c instanceof Propulsion && c.getNeeds() === 'wind') return c;
    }
    return null;
  }

  /**
   * ⭐ Sail her (D20, D21): `course` from her tiller, a direction or a
   * landing on the river she is on. The water must be wide enough to sail
   * (three of her lengths) and there must be wind; then the wind drives her
   * as arms drive a paddle — `Propel` under sail, on the steersman's hands.
   */
  public override async sailCourse(heading: string, giver: Stuff): Promise<{ ok: boolean; line: string }> {
    if (this.sail() === null) return { ok: false, line: 'She has no sail.' };
    if (this._capsized) return { ok: false, line: 'She is upside down.' };
    if (!MixinApi.isEngaged(giver)) return { ok: false, line: 'You cannot sail her.' };
    const water = await StuffApi.singleton<ReachWarren>(WARREN_PATH).catch(() => null);
    const room = this.getContainer();
    if (!water || room === null) {
      return { ok: false, line: 'There is no water here that goes anywhere.' };
    }
    const river = await water.riverAt(room);
    if (river === null) return { ok: false, line: 'She is not on any water that goes anywhere.' };
    const width = river.widthM ?? Number.POSITIVE_INFINITY;
    if (width < 3 * this.hull.lengthM) return { ok: false, line: 'The river is too narrow here to sail her; she would be in the bank before she came about.' };
    const wind = MixinApi.isAtmospheric(room) ? (await room.getWind()).rawValue() : 0;
    if (wind < SAIL_MIN_WIND_MPS) return { ok: false, line: 'There is no wind to fill her sail; she lies becalmed.' };
    const word = heading.trim().toLowerCase();
    const ways: Record<string, PropelHeading> = { upstream: 'upstream', up: 'upstream', downstream: 'downstream', down: 'downstream', left: 'left', right: 'right' };
    const way = ways[word];
    if (way === undefined) return { ok: false, line: 'Sail her which way — upstream, downstream, left or right?' };
    const started = SchedulerApi.start(new Propel({ actor: giver as Stuff & Engaged, boat: this, heading: way, inside: false, hard: false, water, windMps: wind }));
    if (!started.ok) return { ok: false, line: 'Your hands are already busy.' };
    return { ok: true, line: `You put the tiller over and sheet in, and she heels and gathers way ${way}.` };
  }

  /** Whoever is sitting in it. */
  public crew(): Stuff[] {
    return this.getContents().filter((x) => MixinApi.isOrganism(x));
  }

  /**
   * ⭐ How much of the hull is above the water now, m (D22): what the hull
   * gives, less what its load presses it down.
   */
  public override freeboardNowM(): number {
    return this.freeboardWithM(this.bilgeNowL());
  }

  /** Her freeboard with `bilgeL` litres in her (water weighs a kilogram a litre). */
  private freeboardWithM(bilgeL: number): number {
    let load = bilgeL;
    for (const c of this.getContents()) {
      if (MixinApi.isTangible(c)) load += c.getMass().rawValue();
    }
    return this.hull.freeboardM - load / Math.max(1, this.waterplaneKgPerM());
  }

  /** Kilograms that sink her a meter (her waterplane in water). */
  private waterplaneKgPerM(): number {
    return 1000 * this.hull.lengthM * this.hull.beamM * 0.7;
  }

  /* ───────────── the leak and the bilge ───────────── */

  /** Is she in water now — a water place holding water? */
  public isAfloat(): boolean {
    const room = this.getContainer();
    return room !== null && MixinApi.isWaterPlace(room) && room.depthNow() > 0;
  }

  /**
   * ⭐ What comes in through her hull now, L/s — from her STATE, never
   * the calendar: every hole stove in her (an integrity flaw, from a
   * grounding's blow), and a hull that no longer holds water (a crack; a
   * coat that has opened). Nothing comes in ashore.
   */
  public leakLps(): number {
    return this.isAfloat() ? this.hullLeakLps() : 0;
  }

  /** What her hull lets in when she is in the water, L/s — her holes and her seal. */
  public hullLeakLps(): number {
    const self = this as unknown as Stuff;
    const holes = MixinApi.isIntegrity(self) ? self.getFlaws().filter((f) => f.kind === 'holed').length : 0;
    const holed = holes * boatSetting('boat.leak.holed', HOLED_LPS);
    const seep = this.holdsWater('outside') ? 0 : boatSetting('boat.leak.seep', SEEP_LPS);
    return holed + seep;
  }

  /** ⭐ Her hull's leak between two moments (`BilgeMixin`): what comes in now — only afloat. */
  public override leakedBetween(fromS: number, toS: number): number {
    return this.leakLps() * Math.max(0, toS - fromS);
  }

  /** Litres in her now — the stamp's, plus the leak since (sync: her state is sync). */
  public bilgeNowL(): number {
    return this.bilgeAt(boatNowS());
  }

  /** Bring her bilge up to now and keep it (the leak as she lay since the stamp). */
  public reconcileBilge(): number {
    this.integrateBilge(boatNowS());
    return this.bilgeAtStamp();
  }

  /* ───────────── bailing her: a LiftSource ───────────── */

  /** How far below her gunwale the water in her stands, m — a reach over the side. */
  public standingDepthM(): number {
    return Math.max(0, this.hull.freeboardM);
  }

  public async standingMaterial(): Promise<string | null> {
    return this.bilgeNowL() >= 1 ? WATER_PATH : null;
  }

  public async standingAvailableL(): Promise<number> {
    return this.reconcileBilge();
  }

  /** ⭐ Over her side: what comes out of her never fills anything. */
  public receivableL(): number {
    return Infinity;
  }

  /** ⭐ Up to `litres` out of her and over the side; the hand is credited with seamanship. */
  public async liftInto(litres: number, by?: Stuff): Promise<number> {
    this.reconcileBilge();
    const moved = this.takeBilge(litres);
    if (moved > 0 && by !== undefined && MixinApi.isAdvancing(by)) {
      await by.creditDeed({ discipline: 'seamanship', difficulty: 'easy', outcome: 'success' });
    }
    this.armFloodWatch();
    return moved;
  }

  public liftScope(): (Stuff & Container) | null {
    const room = this.getContainer();
    return room !== null && MixinApi.isContainer(room) ? (room as unknown as Stuff & Container) : null;
  }

  public liftedWords(what: string): Mml {
    return Mml.compose`${what} goes out over her side.`;
  }

  /** Upside down, there is nothing to bail; dry, there is nothing in her. */
  public async bucketRefusal(by: Stuff, tool: Stuff | null): Promise<{ reason: string; line: Mml } | null> {
    void by;
    void tool;
    if (this._capsized) return { reason: 'capsized', line: Mml.compose`She is upside down. Right her first.` };
    if (this.bilgeNowL() < 1) return { reason: 'dry', line: Mml.compose`She is dry; there is nothing in her to bail.` };
    return null;
  }

  /** ⭐ A bucketful over her side, and whether she is winning. */
  public async bucketLanded(by: Stuff, landing: BucketLanding): Promise<Mml | null> {
    void by;
    const left = this.bilgeNowL();
    const leak = this.leakLps();
    const words =
      left < 1
        ? 'She is dry.'
        : leak * BAIL_SPELL_S >= landing.litres
          ? 'The water is coming in as fast as you throw it out.'
          : 'The water in her is going down.';
    return Mml.compose`You throw a bucketful of water out over her side. ${words}`;
  }

  /**
   * ⭐ Her flood watch: one game-time call when the water in her will
   * have taken her freeboard at the leak she has now. Nothing is sampled;
   * a bailed boat re-arms it.
   */
  private armFloodWatch(): void {
    try {
      WorldClockApi.cancelByTag('boat.flood', this as unknown as Stuff);
    } catch {
      return; // no clock (a unit world)
    }
    const leak = this.leakLps();
    if (!(leak > 0) || this._capsized) return;
    const room = this.freeboardWithM(0) * this.waterplaneKgPerM();
    const dueS = Math.max(1, (room - this.bilgeNowL()) / leak);
    try {
      WorldClockApi.at(
        Quantity.of(boatNowS() + dueS, 's'),
        () => {
          void this.reconcileFloat().catch(() => undefined);
        },
        { host: this as unknown as Stuff, tag: 'boat.flood' },
      );
    } catch {
      // no clock
    }
  }

  /**
   * ⭐ She goes down: the water in her has taken the last of her
   * freeboard. Whoever sits in her is in the water beside her; she goes to
   * the bottom with everything else in her. A water with no bottom to send
   * her to (a stop you stand in) keeps her where she lies, swamped.
   */
  private async goDown(): Promise<boolean> {
    const room = this.getContainer();
    if (room === null || !MixinApi.isWaterPlace(room)) return false;
    for (const c of [...this.getContents()]) {
      if (!MixinApi.isContainable(c) || !MixinApi.isOrganism(c)) continue;
      try {
        ContainmentApi.move(c, room as unknown as Stuff & Container);
        MessageApi.scene(c).topic('act.deed').toSelf(Mml.compose`The water comes in over her gunwale and she goes down under you. You are in the water.`).send();
      } catch {
        /* it stays in */
      }
    }
    try {
      WorldClockApi.cancelByTag('boat.flood', this as unknown as Stuff);
    } catch {
      // no clock
    }
    if (await room.sink(this as unknown as Stuff)) return true;
    this.capsize('She fills to her gunwale and settles in the water.');
    return true;
  }

  /**
   * ⭐ Over she goes (D22): its people are in the water beside it, and it
   * floats upside down until somebody rights it.
   */
  public override capsize(why: string): void {
    if (this._capsized) return;
    const room = this.getContainer();
    if (room === null) return;
    this._capsized = true;
    for (const c of [...this.getContents()]) {
      if (!MixinApi.isContainable(c)) continue;
      if (!MixinApi.isOrganism(c)) continue;
      try {
        ContainmentApi.move(c, room as unknown as Stuff & Container);
        MessageApi.scene(c).topic('act.deed').toSelf(Mml.compose`${why} The boat goes over and you are in the water beside it.`).send();
      } catch {
        /* it stays in */
      }
    }
  }

  /**
   * ⭐ Pull on the boat (D22): upside down, you right it — and hold onto it,
   * which holds you up. The right way up, there is nothing to pull it by.
   */
  public async pullBy(puller: Stuff, sense: PullSense | null): Promise<PullOutcome> {
    void sense;
    if (!this._capsized) {
      return { ok: false, reason: 'not-capsized', line: `${this.getPresentation()} is the right way up already. Climb in.` };
    }
    this._capsized = false;
    if (MixinApi.isRespiration(puller)) puller.holdUp();
    return {
      ok: true,
      self: Mml.compose`You get your hands under the gunwale and heave, and ${Mml.thing(this)} comes over the right way up. You hang on to it.`,
      peers: Mml.compose`${Mml.actor(puller)} rights ${Mml.thing(this)}.`,
    };
  }

  /**
   * ⭐ `launch` (river D30, controller-liquidity W8): put her into the water
   * beside where she lies. Which water, and whether there is any, is the
   * water's (`Launchable`) — the river's warren is asked first, then the
   * sea's.
   */
  public async launch(): Promise<LaunchRefusal | ActOutcome<undefined>> {
    const from = this.getContainer();
    if (from === null) return { ok: false, reason: 'no-water', facts: { ashore: false } };
    if (MixinApi.isWaterPlace(from) && from.depthNow() > 0) return { ok: false, reason: 'already-launched' };
    for (const path of [WARREN_PATH, SEA_PATH]) {
      const water = await StuffApi.singleton<Stuff>(path).catch(() => null);
      if (water === null || !MixinApi.isLaunchable(water)) continue;
      const into = await water.launchPlaceFor(from);
      if (into === null) continue;
      ContainmentApi.move(this, into);
      return { ok: true, facts: undefined };
    }
    return { ok: false, reason: 'no-water', facts: { ashore: true } };
  }

  /**
   * ⭐ `recover` (river D30, W8): take her out of the water — onto the deck
   * of a ship lying alongside, or up onto the bank she is beached against.
   * The sea's warren is asked first, then the river's.
   */
  public async recover(): Promise<RecoverRefusal | ActOutcome<undefined>> {
    const from = this.getContainer();
    if (from === null || !MixinApi.isWaterPlace(from) || from.depthNow() <= 0) {
      return { ok: false, reason: 'not-afloat' };
    }
    for (const path of [SEA_PATH, WARREN_PATH]) {
      const water = await StuffApi.singleton<Stuff>(path).catch(() => null);
      if (water === null || !MixinApi.isLaunchable(water)) continue;
      const onto = await water.recoverPlaceFor(from);
      if (onto === null) continue;
      ContainmentApi.move(this, onto);
      return { ok: true, facts: undefined };
    }
    return { ok: false, reason: 'nowhere' };
  }

  /**
   * ⭐ The killick's question (D23): hold the boat where it is, if the water
   * there is slack enough to hold in.
   */
  public async holdAt(giver: Stuff): Promise<{ ok: boolean; line: string }> {
    void giver;
    const water = await StuffApi.singleton<ReachWarren>(WARREN_PATH).catch(() => null);
    if (!water) return { ok: false, line: 'The killick goes over the side and hangs there.' };
    return water.holdBoat(this);
  }

  /**
   * ⭐ Afloat, she is climbed into from the water as well as from a bank
   * or a deck alongside (river C21 — the browser walk: a swimmer righted
   * her, was told by `go canoe` to swim for it, and by `swim canoe` that
   * they could not).
   */
  public override entryMediaIn(env: Stuff & Container): string[] {
    return MixinApi.isWaterPlace(env) && env.depthNow() > 0 ? ['ground', 'water'] : [];
  }

  /** ⭐ She carries a killick (D28): a stop that holds her is held by it. */
  public override carriesKedge(): boolean {
    return this.getContents().some((c) => c instanceof Killick);
  }

  /**
   * ⭐ `anchor` in a boat (D23): over goes her killick, if she carries one
   * (`null` without one — the verb asks the craft she lies in next). The
   * water says whether it held (`holdAt`), in its own line.
   */
  public override async anchorPlanFor(by: Stuff): Promise<AnchorPlan | AnchorRefusal | null> {
    if (!this.carriesKedge()) return null;
    return {
      ok: true,
      durationMs: 0,
      effortW: 0,
      facts: undefined,
      onComplete: async () => {
        const out = await this.holdAt(by);
        return out.ok
          ? { ok: true, facts: { line: out.line } }
          : { ok: false, reason: 'anchor-drags', facts: { line: out.line } };
      },
    };
  }

  /**
   * ⭐ What a look says of her: how low her load has her
   * riding — the freeboard IS her capacity — and that she is out on hire.
   */
  public describeBoat(): string[] {
    const out: string[] = [];
    if (this._capsized) return out;
    const full = this.hull.freeboardM;
    const now = this.freeboardNowM();
    if (full > 0) {
      const share = now / full;
      if (share <= 0) out.push('She is loaded past her gunwale.');
      else if (share < 0.34) out.push('She is riding very low; the water is nearly at her gunwale.');
      else if (share < 0.67) out.push('She is riding low with what is in her.');
      else if (share < 0.9) out.push('She sits lower in the water with what is in her.');
    }
    // ⭐ The water in her, in words.
    const water = this.bilgeNowL();
    const room = this.freeboardWithM(0) * this.waterplaneKgPerM();
    if (water >= 1 && room > 0) {
      const share = water / room;
      if (share < 0.15) out.push('There is water slopping in the bottom of her.');
      else if (share < 0.5) out.push('She has a good deal of water in her.');
      else out.push('She is half full of water and low in it.');
    }
    if (this.leakLps() > 0) out.push('Water is coming in through her hull.');
    const by = this.hiredByName();
    if (by !== null) out.push(`She is out on hire to ${by}.`);
    return out;
  }

  /**
   * ⭐ Does she still float? Asked whenever her load changes
   * and whenever she is put into water. Ashore — on a bank, a landing, a
   * deck — she floats on nothing and nothing happens. Afloat, loaded past
   * her freeboard, she swamps where she lies; otherwise the water's own
   * roughness must top what freeboard her load has left her: the sea state
   * where a sea patch lies (a pinned storm's chop), the river's broken
   * water. A ship's wake is the river's own act (`ReachWarren.wakeAt`).
   * `true` when she went over.
   */
  public async reconcileFloat(): Promise<boolean> {
    if (this._capsized) return false;
    const room = this.getContainer();
    if (room === null || !MixinApi.isWaterPlace(room) || room.depthNow() <= 0) return false;
    const freeboard = this.freeboardNowM();
    if (freeboard <= 0) {
      // ⭐ Filled through her hull: she goes down; loaded past it, she swamps.
      if (this.bilgeNowL() > 0 && this.freeboardWithM(0) > 0) return this.goDown();
      this.capsize('She is loaded past her freeboard.');
      return true;
    }
    this.armFloodWatch();
    const wave = await this.waveAt(room);
    if (wave > freeboard) {
      this.capsize('A sea comes in over her gunwale, and then another, and she fills.');
      return true;
    }
    return false;
  }

  /** How high the water's roughness throws a wave where she lies, m. */
  private async waveAt(room: Stuff): Promise<number> {
    if (MixinApi.isPositioned(room)) {
      const pos = room.getExpansePosition();
      const sea = StuffApi.findByTemplatePath<Stuff>(room.getExpanse() ?? '');
      if (pos !== null && sea instanceof WaterExpanse) {
        return (await sea.roughnessAt(pos, room).catch(() => 0)) * WAVE_SHARE;
      }
    }
    const water = await StuffApi.singleton<ReachWarren>(WARREN_PATH).catch(() => null);
    const river = water ? await water.riverAt(room).catch(() => null) : null;
    return river ? river.roughness * WAVE_SHARE : 0;
  }

  /** Her load changed: does she still float? */
  public onContainableAdded(thing: Stuff & Containable): void {
    void thing;
    void this.reconcileFloat().catch(() => undefined);
  }

  public onContainableRemoved(thing: Stuff & Containable): void {
    void thing;
    void this.reconcileFloat().catch(() => undefined);
  }

  /**
   * ⭐ Put down somewhere: on the landing she was let
   * from, her hire is over; into water, she must float.
   */
  public override onMoved(from: (Stuff & Container) | null, to: (Stuff & Container) | null): void {
    // ⭐ The water that came in came in where she WAS: afloat there,
    // the leak ran; ashore it did not. Brought up to now before she counts
    // as wherever she is now.
    const wasAfloat = from !== null && MixinApi.isWaterPlace(from) && from.depthNow() > 0;
    this.resetBilge(wasAfloat ? this.bilgeLeakedSinceAfloat() : this.bilgeAtStamp(), boatNowS());
    super.onMoved(from, to);
    if (to === null) return;
    const home = this.home();
    if (home !== null && (to.getDurableHandle() ?? to.getTemplatePath()) === home) this.endHire();
    void this.reconcileFloat().catch(() => undefined);
  }

  /** Her bilge up to now as though she had lain afloat since the stamp. */
  private bilgeLeakedSinceAfloat(): number {
    const nowS = boatNowS();
    const stamp = this.getBilgeStamp();
    const since = stamp > 0 && nowS > stamp ? nowS - stamp : 0;
    return this.bilgeAtStamp() + this.hullLeakLps() * since;
  }

  /** The boat is its own watch. */
  public async watchRoom(): Promise<(Stuff & Container) | null> {
    return this as unknown as Stuff & Container;
  }
}

/** Game-seconds now, or 0 with no clock (a unit world). */
function boatNowS(): number {
  try {
    return WorldClockApi.getNow().rawValue();
  } catch {
    return 0;
  }
}

/** A numeric setting, else the shipped grain. */
function boatSetting(key: string, fallback: number): number {
  try {
    const n = Number.parseFloat(AppApi.setting(key) ?? '');
    if (Number.isFinite(n) && n >= 0) return n;
  } catch {
    // a cold cache or an unregistered key
  }
  return fallback;
}
