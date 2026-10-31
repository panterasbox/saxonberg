/**
 * Rope — ⭐⭐ **one rope; its use is where its ends are tied** (cordage D1).
 *
 * A lifeline is a rope a tender holds with a diver on the end; a heaving
 * line is a rope thrown to a swimmer; a painter is a rope on a boat's bow;
 * a rope tied round a post at the lip of a pit is a way down. There is one
 * class and one row shape — what it is FOR is where its two ends are:
 *
 *  - the FIXED end, in somebody's hands or tied round a fixture here;
 *  - the FREE end (`RopeEnd`, minted when it is made fast), in somebody's
 *    hands, tied to a load, or hanging down a drop.
 *
 * Everything a line does (`throw … to`, `tug`, `pull`) it inherits from
 * `Line`. What a rope adds:
 *
 *  - **a length and a thickness**, and from them its mass and its strength
 *    (D4, D6): strength goes as the square of the diameter and as its
 *    fiber's toughness — hemp before flax before jute — and is told in
 *    words, never a number;
 *  - **knots** (D7): a knot is a platform `Joint` row whose `strength` is
 *    the share of the rope it keeps, dressed by the tier's `ropework` band
 *    at tie-time — a green hand's bowline keeps less, every time;
 *  - **cut, splice, coil** (D4, D9, D10): two ropes whose lengths sum, one
 *    rope from two, a coil that throws clean;
 *  - **the rogue's yarn** (D15): colored yarns laid in the heart, shown at
 *    a cut end;
 *  - **rot and tar** (D13′): a plant fiber rots wet; a set coat of pitch on
 *    its outside (a `waterproofing` coat, laid by `dip`) stops it.
 *
 * ⭐ A hose is not a rope (the owner: *a rope and a hose are different
 * things; if they share a superclass that's fine*): the diving pack's
 * `Hose` is the other `Line`.
 */

import Line from '../../lib/spatial/Line';
import LineEnd from './LineEnd';
import { TieableMixin, type TieOutcome } from '../../lib/spatial/Tieable';
import { SpliceableMixin, type SpliceOutcome } from '../../lib/spatial/Spliceable';
import { ClimbableMixin } from '../../lib/locomotion/Climbable';
import { BelayEngagement } from '../../lib/locomotion/BelayEngagement';
import type { Engaged } from '../../lib/activity/Engaged';
import type Exit from '../../lib/boundary/Exit';
import { HazardDelivery } from '../../lib/hazard/HazardDelivery';
import { ConditionApi } from '../../api/condition';
import { SchedulerApi } from '../../api/scheduler';
import type { TossOutcome } from '../../lib/spatial/Tossable';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { FieldMeta } from '../../lib/mixin';
import type { CutRequest } from '../../lib/craft/Cuttable';
import type { ActPlan, ActRefusal } from '../../lib/craft/ActPlan';
import type { CompetenceBandName } from '../../lib/advancement/CompetenceBand';
import type { MarkupAugmenter } from '../../api/mml';
import type { CommandContributions } from '../../api/command';
import type JointCatalogue from '../idea/JointCatalogue';
import { Quantity, type Quantity as Q } from '../../lib/quantity';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { TemplatePaths } from '../../lib/paths';
import { AppApi } from '../../api/app';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { GrammarApi } from '../../api/grammar';
import { MessageApi } from '../../api/message';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { Mml } from '../../api/mml';

/** What whoever holds a rope, or stands by one, can do with it. */
const HELD = [
  'platform/cmd/inventory/pull.yaml',
  'platform/cmd/inventory/tie.yaml',
  'platform/cmd/inventory/untie.yaml',
  'platform/cmd/inventory/coil.yaml',
  'platform/cmd/crafting/splice.yaml',
  'platform/cmd/movement/climb.yaml',
  'platform/cmd/movement/belay.yaml',
];

/** The plain rope row — what a cut piece of an unrowed rope is minted as. */
const ROPE_ROW = '/platform/thing/rope';

/** The knots a rope can be TIED in (a splice is made, never tied). */
const KNOTS = ['bowline', 'clove-hitch', 'sheet-bend', 'reef-knot'] as const;

/** Fibers pack into a rope at about this share of its section (D4). */
const PACKING = 0.6;

/** A tarred rope weighs this much more than a bare one. */
const TAR_GAIN = 1.15;

/** A plant fiber's density when the rope's material has none, kg/m³. */
const FIBER_DENSITY = 1480;

/** A coat of pitch drawn out of the tub sets below this, K. */
const SETS_BELOW_K = 300;

/** A rope longer than this, not coiled, will not go far when thrown, m. */
const THROWS_UNCOILED_M = 5;

const SECONDS_PER_GAME_DAY = 86_400;

/** What a practised hand's dressing keeps of a knot, by band (D7). */
const DRESSING: Record<CompetenceBandName, number> = {
  untrained: 0.8,
  novice: 0.8,
  competent: 0.9,
  proficient: 1,
  expert: 1,
};

/** What a rope holds, in words, kg (D6). */
const HOLDS: readonly [number, string][] = [
  [40, 'it would hardly hold a child'],
  [120, 'it would hold a man'],
  [250, 'it would hold a man and his load'],
  [700, 'it would hold a horse'],
  [Infinity, 'it would hold an ox and more'],
];

/** Which end of the rope, or its middle (a splice). */
export type RopeEndName = 'fixed' | 'free' | 'mid';

/** ⭐ A knot or splice on the rope, as it was made (D7). */
export interface KnotRecord {
  end: RopeEndName;
  /** The joint row's key (`bowline`). */
  key: string;
  /** Its label, for the look (`tied in a bowline`). */
  label: string;
  /** The share of the rope it keeps, from its row. */
  strength: number;
  /** How well it was dressed — the tier's band at tie-time. */
  dressing: number;
  /** Who tied it, by identity path (accountability's, later). */
  by: string;
}

/** A rope's stage at the walk: a strand is laid up into a rope (D5). */
export type RopeStage = 'strand' | 'rope';

/** One numeric dial read, falling back to the literal when unseeded. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw == null || raw === '') return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/** Game-seconds now, or `null` when no world clock is running. */
function nowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
  return WorldClockApi.getNow().rawValue();
}

/** `10`, `10 m`, `10 meters` → 10; anything else → null. */
function parseMeters(text: string): number | null {
  const m = /^(\d+(?:\.\d+)?)\s*(m|meters?|metres?)?$/i.exec(text.trim());
  if (!m) return null;
  const n = Number.parseFloat(m[1]!);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** A length in words: `twenty meters`, `3.5 meters`. */
function meters(n: number): string {
  const r = Math.round(n * 10) / 10;
  return `${r} ${r === 1 ? 'meter' : 'meters'}`;
}

/** ⭐ What a look says of a rope: length, fiber, thickness, what it holds, wear. */
const ropeAugmenter: MarkupAugmenter = (text, host, _viewer, opts) => {
  if (opts?.filter && !opts.filter.includes('vision')) return text;
  if (!(host instanceof Rope)) return text;
  const lines = host.describeRope();
  if (lines.length === 0) return text;
  const all = lines.join(' ');
  return text && text.length > 0 ? `${text}\n\n${all}` : all;
};

export default class Rope extends SpliceableMixin(TieableMixin(ClimbableMixin(Line))) {
  static commandContributions: CommandContributions = {
    self: [],
    environment: HELD,
    peers: HELD,
  };

  static markupAugmenters: MarkupAugmenter[] = [ropeAugmenter];

  static fieldMeta: FieldMeta = {
    diameterMm: { persistent: true, authorable: true },
    stage: { persistent: true, authorable: true },
    marks: { persistent: true, authorable: true },
    chafe: { persistent: true, runtimeState: true },
    rot: { persistent: true, runtimeState: true },
    rotAt: { persistent: true, runtimeState: true },
    coiledDown: { persistent: true, authorable: true },
    cutEnds: { persistent: true, runtimeState: true },
    knots: { persistent: true, runtimeState: true },
    anchorPath: { persistent: true, runtimeState: true },
    hungVia: { persistent: true, runtimeState: true },
  };

  static override END_ROW = '/platform/thing/rope-end';

  /** How thick it is, mm — what its strength goes as the square of. */
  public diameterMm = 12;

  /** A strand at the walk, or a rope laid up from strands (D5). */
  public stage: RopeStage = 'rope';

  /** ⭐ The rogue's yarn: colored yarns laid in the heart (D15). */
  public marks: string[] = [];

  /** Wear at the lip, `0..1` (D11). */
  public chafe = 0;

  /** Rot, `0..1` (D13). */
  public rot = 0;

  /** Game-seconds rot was last reconciled; `0` = never. */
  public rotAt = 0;

  /** Laid down in a coil, ready to throw (D10). */
  public coiledDown = true;

  /** How many of its two ends are bare cut ends (D15). */
  public cutEnds = 0;

  /** The knots and splices on it, as they were made (D7). */
  public knots: KnotRecord[] = [];

  /**
   * The fixture its fixed end is tied round, by template path — the post
   * at the lip, the ring on the quay — so a restart finds it again.
   */
  public anchorPath: string | null = null;

  /** The fixture itself (runtime; found again from `anchorPath`). */
  private _anchor: Stuff | null = null;

  /** ⭐ The drop it hangs down, by exit direction (`down`), while tied off above one (D11). */
  public hungVia: string | null = null;

  /** Whoever is belaying the person on the free end (runtime; D12). */
  private _belay: BelayEngagement | null = null;

  /* ─────────────────────────── the numbers ─────────────────────────── */

  public getDiameterMm(): number {
    return this.diameterMm;
  }

  public setDiameterMm(mm: number): void {
    if (Number.isFinite(mm) && mm > 0) this.diameterMm = mm;
  }

  public setLengthM(m: number): void {
    if (Number.isFinite(m) && m > 0) this.lengthM = m;
  }

  public getStage(): RopeStage {
    return this.stage;
  }

  public getMarks(): readonly string[] {
    return this.marks;
  }

  /** ⭐ Lay a colored yarn in its heart — the rogue's yarn (D15), at the walk. */
  public addMark(color: string): void {
    const c = color.trim().toLowerCase();
    if (c !== '' && !this.marks.includes(c)) this.marks = [...this.marks, c];
  }

  /** Is either end a bare cut end (where the rogue's yarn shows)? */
  public hasCutEnd(): boolean {
    return this.cutEnds > 0;
  }

  public isCoiled(): boolean {
    return this.coiledDown;
  }

  public getChafe(): number {
    return this.chafe;
  }

  public getKnots(): readonly KnotRecord[] {
    return this.knots;
  }

  /** The fiber it is laid from — its material's name (`hemp`). */
  public fiber(): string {
    return this.getMaterial()?.getName() || 'fiber';
  }

  /**
   * ⭐ Mass DERIVED (D4): linear density `ρ·φ·π(d/2)²` × length, × 1.15
   * tarred; wetness then weighs on it as on any good.
   */
  public override getMass(): Q<'kg'> {
    this.syncMass();
    return super.getMass();
  }

  public override getDryMass(): Q<'kg'> {
    this.syncMass();
    return super.getDryMass();
  }

  private syncMass(): void {
    const rho = this.getMaterial()?.getDensity().rawValue() || FIBER_DENSITY;
    const r = this.diameterMm / 2000;
    let kg = rho * PACKING * Math.PI * r * r * this.lengthM;
    if (this.isTarred()) kg *= TAR_GAIN;
    const now = super.getDryMass().rawValue();
    if (Math.abs(now - kg) > 1e-9) this.setMass(Quantity.of(kg, 'kg'));
  }

  /** ⭐ What it breaks at, new and untied, kg (D6). */
  public breakingKg(): number {
    const toughness = this.getMaterial()?.getToughness().rawValue() ?? 2;
    const tenacity = toughness * dial(AppSettingKeys.cordageTenacityMPaPerToughness, 25);
    const r = this.diameterMm / 2;
    return (tenacity * Math.PI * r * r) / 9.81;
  }

  /**
   * ⭐ What it holds as it is now, kg: its breaking strain × the weakest knot
   * on it (as dressed) × what chafe and rot have left (D6).
   */
  public effectiveKg(): number {
    this.reconcileRot();
    const knot = this.knots.reduce((min, k) => Math.min(min, k.strength * k.dressing), 1);
    return this.breakingKg() * knot * (1 - this.chafe) * (1 - this.rot);
  }

  /** What it holds, in words. */
  public holdsWords(): string {
    const kg = this.effectiveKg();
    return HOLDS.find(([upTo]) => kg < upTo)![1];
  }

  /** What it would hold new and untied, in words. */
  public holdsWordsNew(): string {
    const kg = this.breakingKg();
    return HOLDS.find(([upTo]) => kg < upTo)![1];
  }

  /* ─────────────────────────── rot and tar ─────────────────────────── */

  /**
   * ⭐ Tarred: a SET coat of a `waterproofing` material outermost on its
   * outside (D13′). Read off the face, never stored; a pitch coat drawn out
   * of a hot tub sets as it cools.
   */
  public isTarred(): boolean {
    this.coolCoats(SETS_BELOW_K);
    const top = this.getCoats('outside')[0];
    if (top === undefined || top.state !== 'set') return false;
    return this.outermost('outside')?.hasTag('waterproofing') ?? false;
  }

  /** How rotten it is, `0..1`, reconciled to now. */
  public getRot(): number {
    this.reconcileRot();
    return this.rot;
  }

  /**
   * ⭐ A plant fiber rots wet (D13): `rotPerWetDay × wetness` per game day
   * elapsed, while untarred. Reconciled on every read.
   */
  public reconcileRot(): void {
    const now = nowSeconds();
    if (now === null) return;
    if (this.rotAt === 0) {
      this.rotAt = now;
      return;
    }
    const days = (now - this.rotAt) / SECONDS_PER_GAME_DAY;
    this.rotAt = now;
    if (!(days > 0) || this.isTarred()) return;
    // The window's wetness: as it stood at the last read, and as it is now
    // that drying has caught up — their mean.
    const before = this._saturation;
    const wet = (before + this.getWetness()) / 2;
    if (!(wet > 0)) return;
    this.rot = Math.min(1, this.rot + dial(AppSettingKeys.cordageRotPerWetDay, 0.03) * wet * days);
  }

  /* ─────────────────────────── where it is tied ─────────────────────────── */

  /** The fixture the fixed end is tied round, here, or null. */
  public getAnchor(): Stuff | null {
    const here = this.getContainer() as Stuff | null;
    const held = this._anchor;
    if (held !== null && !held.isDestroyed() && MixinApi.isContainable(held) && held.getContainer() === here) {
      return held;
    }
    this._anchor = null;
    if (this.anchorPath === null || here === null || !MixinApi.isContainer(here)) return null;
    const found = here.getContents().find((c) => c !== (this as unknown as Stuff) && c.getTemplatePath() === this.anchorPath);
    if (found === undefined) return null;
    this._anchor = found;
    return found;
  }

  /** ⭐ A rope tied round a post stays where it was tied. */
  public override isFixedInPlace(): boolean {
    return super.isFixedInPlace() || this.getAnchor() !== null;
  }

  /** Is either end tied to anything — a post, a person? */
  public isTied(): boolean {
    return this.getAnchor() !== null || this.getOnEnd() !== null;
  }

  /**
   * ⭐ `tie rope to <person>` — their hands on the free end (a diver going
   * down, a climber going up); `tie rope to <fixture>` — the fixed end
   * round a post here, and the rope stays. `with <knot>` names the knot.
   */
  public override async tieTo(by: Stuff, load: Stuff, knot: string | null): Promise<TieOutcome> {
    const self = this as unknown as Stuff;
    if (load === self) return { ok: false, reason: 'self', line: 'You cannot tie a rope to itself.' };
    const place = MixinApi.isContainable(by) ? by.getContainer() : null;
    const there = MixinApi.isContainable(load) ? load.getContainer() : null;
    if (place === null || there !== place) {
      return { ok: false, reason: 'out-of-reach', line: `${GrammarApi.cap(load.describeFor(by))} is not here.` };
    }
    if (this.getHolder() !== by) {
      return { ok: false, reason: 'not-holding', line: `You are not holding ${this.getPresentation()}.` };
    }
    const made = await this.makeKnot(by, knot);
    if (!made.ok) return made;
    const name = made.knot.label;
    if (load.isAgent?.()) {
      if (load === by) return { ok: false, reason: 'self', line: 'You keep hold of your own end; somebody else ties you on.' };
      await this.makeFast(load);
      this.knots = [...this.knots.filter((k) => k.end !== 'free'), { ...made.knot, end: 'free' }];
      this.coiledDown = false;
      try {
        MessageApi.scene(load)
          .topic('act.deed')
          .toSelf(Mml.compose`${Mml.actor(by)} ties the end of a rope round you.`)
          .send();
      } catch {
        // decoration
      }
      return {
        ok: true,
        line: `You tie the end of ${this.getPresentation()} round ${load.describeFor(by)}, ${name}.`,
        peers: 'ties the end of a rope round somebody.',
      };
    }
    const already = this.getAnchor();
    if (already !== null) {
      return { ok: false, reason: 'already-tied', line: `It is already tied round ${already.getPresentation()}.` };
    }
    ContainmentApi.move(self as Stuff & Line, place as Stuff & Container);
    this._anchor = load;
    this.anchorPath = load.getTemplatePath();
    this.knots = [...this.knots.filter((k) => k.end !== 'fixed'), { ...made.knot, end: 'fixed' }];
    this.coiledDown = false;
    const hung = await this.hangDown(place as Stuff & Container);
    return {
      ok: true,
      line: `You tie ${this.getPresentation()} round ${load.getPresentation()}, ${name}.${hung}`,
      peers: `ties a rope round ${load.getPresentation()}.`,
    };
  }

  /**
   * `untie rope` — the fixed end off its post, into your hands; or, held,
   * the free end off whoever is on it.
   */
  public override async untieBy(by: Stuff): Promise<TieOutcome> {
    const anchor = this.getAnchor();
    if (anchor !== null) {
      if (!MixinApi.isContainer(by)) return { ok: false, reason: 'no-hands', line: 'You have no hands to take it in.' };
      if (this.hungVia !== null) {
        this.hungVia = null;
        await this.castOff();
      }
      this._anchor = null;
      this.anchorPath = null;
      this.knots = this.knots.filter((k) => k.end !== 'fixed');
      ContainmentApi.move(this as unknown as Stuff & Line, by as Stuff & Container);
      return { ok: true, line: `You untie ${this.getPresentation()} from ${anchor.getPresentation()} and take it up.` };
    }
    const onEnd = this.getOnEnd();
    if (onEnd !== null && (this.getHolder() === by || onEnd === by)) {
      await this.castOff();
      return { ok: true, line: `You cast off the end of ${this.getPresentation()}.` };
    }
    return { ok: false, reason: 'not-tied', line: `${GrammarApi.cap(this.getPresentation())} is not tied to anything.` };
  }

  /** Cast off the free end: its knot goes with it. */
  public override async castOff(): Promise<void> {
    await super.castOff();
    this.knots = this.knots.filter((k) => k.end !== 'free');
  }

  /**
   * ⭐ The knot the tier named, dressed by their `ropework` band (D7), and
   * credited to it. A knot nobody knows is refused by name.
   */
  private async makeKnot(by: Stuff, asked: string | null): Promise<{ ok: true; knot: KnotRecord } | { ok: false; reason: string; line: string }> {
    const key = (asked ?? 'bowline').trim().toLowerCase().replace(/^an? /, '').replace(/\s+/g, '-');
    if (!(KNOTS as readonly string[]).includes(key)) {
      return { ok: false, reason: 'no-such-knot', line: `You know no knot called a ${asked ?? key}.` };
    }
    const cat = await StuffApi.singleton<JointCatalogue>(TemplatePaths.jointCatalogue).catch(() => null);
    const row = cat ? await cat.warmed(key) : null;
    if (row === null) return { ok: false, reason: 'no-such-knot', line: `You know no knot called a ${asked ?? key}.` };
    let band: CompetenceBandName = 'untrained';
    if (MixinApi.isAdvancing(by)) {
      band = await by.competenceBandFor('ropework').catch(() => 'untrained' as CompetenceBandName);
      void by.creditSignature({ discipline: [{ discipline: 'ropework', difficulty: 'easy', outcome: 'success' }] }).catch(() => {});
    }
    return {
      ok: true,
      knot: {
        end: 'fixed',
        key,
        label: row.label,
        strength: row.strength,
        dressing: DRESSING[band],
        by: by.getIdentityPath() ?? '',
      },
    };
  }

  /* ─────────────────────────── the rope at a drop (D11) ─────────────────────────── */

  /**
   * ⭐ Tied off above a drop — a `down` exit here that is climbed — the rope
   * goes over the edge: its free end lies at the bottom, and the rope is a
   * way down from here and a way up from there. Too short to reach, it
   * just lies at the lip. Returns what to add to the tie's line.
   */
  private async hangDown(place: Stuff & Container): Promise<string> {
    if (!MixinApi.isExitable(place)) return '';
    const down = place.getExit('down');
    if (!down || !down.getMedia().includes('vertical')) return '';
    if (this.lengthM < dial(AppSettingKeys.cordageMinHangM, 3)) return ' It is too short to reach the bottom.';
    let below: Stuff & Container;
    try {
      below = await down.resolveDestination();
    } catch {
      return '';
    }
    await this.castOff();
    await this.mintEnd(below);
    this.hungVia = 'down';
    return ' You pay the rest of it out over the edge, and it hangs down into the dark.';
  }

  /** Does it hang down a drop from where it is tied? */
  public isHung(): boolean {
    return this.hungVia !== null && this.getAnchor() !== null && this.getEnd() !== null;
  }

  /** ⭐ Hung, the rope is the way DOWN from where it is tied (its end is the way up). */
  public override getAxes(): readonly string[] {
    return this.isHung() ? ['down'] : [];
  }

  public override canEngageAxis(direction: string): boolean {
    return this.getAxes().includes(direction);
  }

  /** @hook A climb on this rope (D11): the wear at the lip, and whether it holds. */
  public override async afterEnabledTraverse(actor: Stuff, direction: string, exit: Exit): Promise<void> {
    void direction;
    void exit;
    await this.takeClimb(actor);
  }

  /**
   * ⭐ The climb's load on the rope (D11): the climber and what they carry.
   * A reef knot spills under an uneven load; a load past what the rope holds
   * parts it; anything less chafes it at the lip — more the heavier.
   */
  public async takeClimb(climber: Stuff): Promise<void> {
    if (!this.isHung()) return;
    const burden = MixinApi.isLoadBearing(climber) ? climber.getBorneBurden().rawValue() : 0;
    const load = (MixinApi.isTangible(climber) ? climber.getMass().rawValue() : 70) + burden;
    if (this.knots.some((k) => k.end === 'fixed' && k.key === 'reef-knot') && burden >= dial(AppSettingKeys.cordageUnevenLoadKg, 10)) {
      await this.spill(climber, load);
      return;
    }
    if (load > this.effectiveKg()) {
      await this.part(climber, load);
      return;
    }
    this.chafe = Math.min(1, this.chafe + dial(AppSettingKeys.cordageChafePerUse, 0.06) * (load / this.breakingKg()));
  }

  /** The bottom of the drop — where the free end lies. */
  private bottom(): (Stuff & Container) | null {
    const end = this.getEnd();
    const at = end !== null ? (end.getContainer() as Stuff | null) : null;
    return at !== null && MixinApi.isContainer(at) ? at : null;
  }

  /** ⭐ A reef knot spills: the whole rope comes away from the post and goes down. */
  private async spill(climber: Stuff, load: number): Promise<void> {
    const below = this.bottom();
    const post = this.getAnchor();
    this.hungVia = null;
    await this.castOff();
    this._anchor = null;
    this.anchorPath = null;
    this.knots = this.knots.filter((k) => k.end !== 'fixed');
    if (below !== null) ContainmentApi.move(this as unknown as Stuff & Line, below);
    this.say(climber, `The reef knot round ${post?.getPresentation() ?? 'the post'} spills under the uneven weight — the rope comes away above you.`);
    this.fall(climber, below, load);
  }

  /** ⭐ It parts: the stub stays tied round the post, the rest goes down with the climber. */
  private async part(climber: Stuff, load: number): Promise<void> {
    const below = this.bottom();
    const stubM = 1;
    const row = this.getTemplatePath() ?? ROPE_ROW;
    const rest = await StuffApi.clone<Rope>(row).catch(() => null);
    this.hungVia = null;
    await this.castOff();
    if (rest instanceof Rope && below !== null) {
      const material = this.getMaterial();
      if (material) rest.setMaterial(material);
      rest.setLengthM(Math.max(0.5, this.lengthM - stubM));
      rest.setDiameterMm(this.diameterMm);
      rest.copyWearFrom(this);
      rest.setCoats(structuredClone(this.coats));
      rest.cutEnds = 1;
      rest.coiledDown = false;
      ContainmentApi.move(rest as unknown as Stuff & Line, below);
    }
    this.lengthM = stubM;
    this.cutEnds = Math.min(2, this.cutEnds + 1);
    this.say(climber, 'With a crack like a shot the rope parts above you.');
    this.fall(climber, below, load);
  }

  /**
   * ⭐ The fall (the hazard's drop, on the rope): asked of the climber's
   * belay first — caught, they hang and are hauled in unhurt; else to the
   * bottom and a blunt landing.
   */
  private fall(climber: Stuff, below: (Stuff & Container) | null, load: number): void {
    const shock = load * dial(AppSettingKeys.cordageFallFactor, 3);
    for (const belay of Rope.belaysOf(climber)) {
      if (belay.catches(climber, shock)) {
        this.say(climber, 'The rope round you comes up taut; you hang, and are hauled in.');
        return;
      }
    }
    if (below !== null && MixinApi.isContainable(climber) && climber.getContainer() !== below) {
      ContainmentApi.move(climber, below);
    }
    const energy = dial(AppSettingKeys.hazardDropFallEnergy, 4);
    const site = HazardDelivery.from({
      channel: 'blunt',
      energy,
      siteSelector: ['body.torso', 'body.leg.left', 'body.leg.right'],
    }).resolveSite(climber);
    if (site && energy > 0) ConditionApi.inflict(climber, { mechanism: 'blunt', site, energy });
    this.say(climber, 'You fall, and hit the bottom hard.');
  }

  /** The belays on whoever `climber` is — the ropes round them somebody is holding. */
  private static belaysOf(climber: Stuff): BelayEngagement[] {
    if (!MixinApi.isContainer(climber)) return [];
    const out: BelayEngagement[] = [];
    for (const c of climber.getContents()) {
      const line = c instanceof LineEnd ? c.getLine() : null;
      if (line instanceof Rope && line._belay !== null) out.push(line._belay);
    }
    return out;
  }

  private say(climber: Stuff, line: string): void {
    try {
      MessageApi.scene(climber).topic('act.deed').toSelf(Mml.compose`${line}`).send();
    } catch {
      // decoration
    }
  }

  /* ─────────────────────────── the belay (D12) ─────────────────────────── */

  /** The engagement holding this rope as a belay, while one does. */
  public getBelay(): BelayEngagement | null {
    return this._belay;
  }

  /** @internal The belay engagement's own link (onStart / onAbort). */
  public _setBelay(belay: BelayEngagement | null): void {
    this._belay = belay;
  }

  /**
   * ⭐ `belay <person>` (D12): hold this rope for the person tied on its
   * free end, here or one way from here, round a post if there is one.
   */
  public belayFor(by: Stuff, climber: Stuff): TieOutcome {
    if (this.getHolder() !== by) return { ok: false, reason: 'not-holding', line: `You are not holding ${this.getPresentation()}.` };
    if (this.getOnEnd() !== climber) {
      return { ok: false, reason: 'not-tied-on', line: `${GrammarApi.cap(climber.describeFor(by))} is not tied on the end of it — \`tie rope to\` them first.` };
    }
    if (!MixinApi.isEngaged(by)) return { ok: false, reason: 'cannot', line: 'You cannot hold a belay.' };
    const belay = new BelayEngagement(by as Stuff & Engaged, this, climber);
    const started = SchedulerApi.start(belay);
    if (!started.ok) return { ok: false, reason: 'busy', line: 'Your hands are on something else.' };
    return {
      ok: true,
      line: `You take in the slack and hold the rope for ${climber.describeFor(by)}, ${belay.holdWords()}.`,
      peers: `takes up a rope to belay somebody.`,
    };
  }


  /* ─────────────────────────── cut, splice, coil ─────────────────────────── */

  /**
   * ⭐ `cut rope at 10 m` (D4): a knife in reach cuts that length off the
   * free end — two ropes whose lengths sum; wear, marks, fiber and coat go
   * to both, and a knot goes with the end it was on.
   */
  public async cutPlan(req: CutRequest): Promise<ActPlan | ActRefusal> {
    const self = this as unknown as Stuff;
    const knife = req.tools.find((t) => MixinApi.isTool(t) && t.hasCapability('cutting'));
    if (!knife) {
      return { ok: false, reason: 'no-knife', line: Mml.compose`You need a knife to cut ${Mml.thing(self)}.` };
    }
    if (this.isTied()) {
      return { ok: false, reason: 'tied', line: Mml.compose`${Mml.thing(self)} is tied; untie it before you cut it.` };
    }
    if (req.length === null) {
      return { ok: false, reason: 'no-length', line: Mml.compose`Cut it where? \`cut rope at 10 m\` cuts ten meters off the end.` };
    }
    const take = parseMeters(req.length);
    if (take === null) {
      return { ok: false, reason: 'bad-length', line: Mml.compose`"${req.length}" is not a length — say it in meters, like \`at 10 m\`.` };
    }
    if (take >= this.lengthM) {
      return {
        ok: false,
        reason: 'too-long',
        line: Mml.compose`${Mml.thing(self)} is only ${meters(this.lengthM)} long.`,
      };
    }
    const actor = req.actor;
    return {
      ok: true,
      durationMs: 5_000,
      effortW: 60,
      beginSelf: Mml.compose`You measure off ${meters(take)} of ${Mml.thing(self)} and set the knife to it.`,
      beginPeers: Mml.compose`${Mml.actor(actor)} cuts a length off a rope.`,
      onComplete: () => this.cutOff(actor, take),
    };
  }

  /** The cut lands: the piece goes to the cutter's hands. */
  private async cutOff(actor: Stuff, take: number): Promise<void | ActRefusal> {
    const self = this as unknown as Stuff;
    if (self.isDestroyed() || this.isTied() || !(take < this.lengthM)) {
      return { ok: false, reason: 'changed', line: Mml.compose`The rope is not as it was; you leave it uncut.` };
    }
    const row = this.getTemplatePath() ?? ROPE_ROW;
    const piece = await StuffApi.clone<Rope>(row).catch(() => null);
    if (piece === null || !(piece instanceof Rope)) {
      return { ok: false, reason: 'no-piece', line: Mml.compose`The knife slips; nothing comes away.` };
    }
    const material = this.getMaterial();
    if (material) piece.setMaterial(material);
    piece.setLengthM(take);
    piece.setDiameterMm(this.diameterMm);
    piece.copyWearFrom(this);
    piece.setCoats(structuredClone(this.coats));
    piece.knots = this.knots.filter((k) => k.end === 'free').map((k) => ({ ...k, end: 'free' as const }));
    piece.cutEnds = 1;
    piece.coiledDown = false;
    this.knots = this.knots.filter((k) => k.end !== 'free');
    this.lengthM = Math.round((this.lengthM - take) * 1000) / 1000;
    this.cutEnds = Math.min(2, this.cutEnds + 1);
    this.coiledDown = false;
    const into = MixinApi.isContainer(actor) ? actor : (this.getContainer() as Stuff | null);
    if (into !== null && MixinApi.isContainer(into)) ContainmentApi.move(piece as unknown as Stuff & Line, into);
    MessageApi.scene(actor)
      .topic('act.deed')
      .toSelf(Mml.compose`The knife goes through; you have ${meters(take)} of rope in your hand and ${meters(this.lengthM)} left.`)
      .send();
    return undefined;
  }

  /** Copy what a rope has been through — fiber stage, marks, chafe, rot. */
  private copyWearFrom(from: Rope): void {
    this.stage = from.stage;
    this.marks = [...from.marks];
    this.chafe = from.chafe;
    from.reconcileRot();
    this.rot = from.rot;
    this.rotAt = from.rotAt;
  }

  /**
   * ⭐ `splice rope to rope` (D9): the strands of two ends laid into each
   * other — one rope, the lengths summed, a splice on the record that keeps
   * nine tenths of it, and both ropes' marks (*a splice shows both*). A
   * splice is cut out, never untied.
   */
  public override async spliceBy(by: Stuff, other: Stuff | null): Promise<SpliceOutcome> {
    if (other === null) {
      return { ok: false, reason: 'no-other', line: 'Splice it to what? `splice rope to 2nd rope` lays two ropes into one.' };
    }
    if (other === (this as unknown as Stuff)) {
      return { ok: false, reason: 'self', line: 'That is the same rope — name the other one (`2nd rope`).' };
    }
    if (!(other instanceof Rope)) {
      return { ok: false, reason: 'not-rope', line: `You cannot splice a rope to ${other.getPresentation()}.` };
    }
    if (other.stage !== this.stage) {
      return { ok: false, reason: 'stage', line: 'A strand is laid up with strands, not spliced to a rope.' };
    }
    if (this.isTied() || other.isTied()) {
      return { ok: false, reason: 'tied', line: 'Untie them both before you splice them.' };
    }
    const made = await this.dressed(by);
    other.reconcileRot();
    this.reconcileRot();
    this.lengthM = Math.round((this.lengthM + other.lengthM) * 1000) / 1000;
    this.marks = [...new Set([...this.marks, ...other.marks])];
    this.chafe = Math.max(this.chafe, other.chafe);
    this.rot = Math.max(this.rot, other.rot);
    this.cutEnds = Math.max(0, Math.min(2, this.cutEnds + other.cutEnds - 2));
    this.knots = [
      ...this.knots.filter((k) => k.end !== 'free'),
      ...other.knots.filter((k) => k.end === 'mid'),
      { end: 'mid', key: 'splice', label: 'spliced', strength: made.strength, dressing: made.dressing, by: by.getIdentityPath() ?? '' },
    ];
    this.coiledDown = false;
    StuffApi.destruct(other);
    return {
      ok: true,
      line: `You unlay the two ends and work their strands back into each other: one rope now, ${meters(this.lengthM)} long.`,
      peers: 'splices two ropes into one.',
    };
  }

  /** A splice's share and the splicer's dressing, credited to `ropework`. */
  private async dressed(by: Stuff): Promise<{ strength: number; dressing: number }> {
    const cat = await StuffApi.singleton<JointCatalogue>(TemplatePaths.jointCatalogue).catch(() => null);
    const row = cat ? await cat.warmed('splice') : null;
    let band: CompetenceBandName = 'untrained';
    if (MixinApi.isAdvancing(by)) {
      band = await by.competenceBandFor('ropework').catch(() => 'untrained' as CompetenceBandName);
      void by.creditSignature({ discipline: [{ discipline: 'ropework', difficulty: 'standard', outcome: 'success' }] }).catch(() => {});
    }
    return { strength: row?.strength ?? 0.9, dressing: DRESSING[band] };
  }

  /** ⭐ `coil rope` (D10): a moment for every two meters, then it throws clean. */
  public coilPlan(actor: Stuff): ActPlan | ActRefusal {
    const self = this as unknown as Stuff;
    if (this.isTied()) {
      return { ok: false, reason: 'tied', line: Mml.compose`${Mml.thing(self)} is tied; you cannot coil it down.` };
    }
    if (this.coiledDown) {
      return { ok: false, reason: 'coiled', line: Mml.compose`${Mml.thing(self)} is already coiled.` };
    }
    return {
      ok: true,
      durationMs: Math.max(2_000, this.lengthM * 500),
      effortW: 60,
      beginSelf: Mml.compose`You start coiling ${Mml.thing(self)} down, turn over turn.`,
      beginPeers: Mml.compose`${Mml.actor(actor)} coils a rope.`,
      onComplete: () => {
        if (self.isDestroyed() || this.isTied()) return;
        this.coiledDown = true;
        MessageApi.scene(actor).topic('act.deed').toSelf(Mml.compose`${Mml.thing(self)} lies in a neat coil.`).send();
      },
    };
  }

  /** ⭐ An uncoiled rope will not go far (D10): coil it first. */
  public override async tossTo(thrower: Stuff, who: string): Promise<TossOutcome> {
    if (!this.coiledDown && this.lengthM > THROWS_UNCOILED_M) {
      return { ok: false, reason: 'not-coiled', line: `${GrammarApi.cap(this.getPresentation())} is in a tangle — coil it first.` };
    }
    const out = await super.tossTo(thrower, who);
    if (out.ok) this.coiledDown = false;
    return out;
  }

  /* ─────────────────────────── the look ─────────────────────────── */

  /** ⭐ What a look says of the rope, in words (D6, D15). */
  public describeRope(): string[] {
    const lines: string[] = [];
    const what = this.stage === 'strand' ? 'strand' : 'rope';
    lines.push(
      `${GrammarApi.cap(meters(this.lengthM))} of ${this.fiber()} ${what}, about ${Math.round(this.diameterMm)} mm thick; ${this.holdsWords()}.`,
    );
    if (this.isCoiled()) lines.push('It is coiled down, ready to throw.');
    const wear = this.chafeWords();
    if (wear !== '') lines.push(wear);
    const rot = this.rotWords();
    if (rot !== '') lines.push(rot);
    for (const k of this.knots) {
      if (k.end === 'mid') lines.push('There is a splice in it.');
    }
    if (this.cutEnds > 0 && this.marks.length > 0) {
      lines.push(`At the cut end, ${this.marks.map((m) => `a ${m} yarn`).join(' and ')} runs in the heart of it.`);
    }
    return lines;
  }

  /** Chafe, in words: scuffed · fraying · a few yarns parted · about to go. */
  public chafeWords(): string {
    const c = this.chafe;
    if (c < 0.15) return '';
    if (c < 0.35) return 'It is scuffed where it has gone over an edge.';
    if (c < 0.6) return 'It is fraying where it has gone over an edge.';
    if (c < 0.85) return 'A few yarns have parted where it has gone over an edge.';
    return 'It is chafed nearly through — it is about to go.';
  }

  private rotWords(): string {
    const r = this.getRot();
    if (r < 0.1) return '';
    if (r < 0.3) return 'It smells musty.';
    if (r < 0.6) return 'It is soft and dark with rot.';
    return 'It is rotten through.';
  }
}
