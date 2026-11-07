/**
 * WaterFixture — plumbed water you can work at: a wash basin, a tap, a
 * standpipe. Its matter is water, it is the thing that affords `wash`, and
 * ⭐⭐ **it gives what its SUPPLY gives, and nothing from nowhere**
 * (water-supply build, D2): a fixture resolves its premises (the room it
 * stands in — a keyed holding room by its persistence key), asks the parcel
 * registry where that premises takes its water (`ParcelApi.waterOf`), loads
 * that supply on use, and reads it. A premises that cites nothing reads
 * `unplumbed`. An author marks a fixture that IS a source (a leat, a pond, a
 * spring trough) `natural: true`; a fixture plumbed to a NAMED source keeps
 * `suppliedBy`.
 *
 * ⚠ **Fail closed.** Before its supply resolves a fixture reports empty and
 * says nothing; it never runs endlessly because a main was not loaded (the
 * fail-open warn it replaces). Every draw verb awaits `settleBulk` first, so
 * the resolve happens on the async path that is already there.
 *
 * ⭐ **Pressure is head** (D4): the supply's water surface against this
 * outlet's own height — its room's zone elevation plus its storey. No head
 * and nothing comes; little head and a draw gives a trickle.
 *
 * ⭐ **Composition: `ThermalMixin(BulkableMixin(Thing))` — its own stack,
 * not {@link UnboundedReceptacle}'s.** (`UnboundedSourceMixin` came off in
 * the water-supply build: it claimed every fixture is endless.) It used to extend
 * that class, which sits on `Receptacle`, which since the base-class
 * narrowing sits on `Good`. A standpipe is plumbed into the ground: it is
 * nobody's chattel and you cannot hide it, and the constructor below has
 * been saying exactly that with `fixedInPlace` since a live drive walked out
 * of Dave's Bar carrying the wash basin. The three mixins it actually wants
 * are the three it now names; `UnboundedReceptacle`'s own two rows — the
 * coffee urn and the formless vessel — stay movable, which is right.
 *
 * ⚠ **`wash` was on `UnboundedReceptacle` itself, which is a different
 * fact.** That class says only *inexhaustible liquid source* — and its
 * other shipped row is the demo's **coffee urn**, which offered you a
 * verb for washing a glass in the coffee. "Afford statically, decline
 * diegetically" does not cover this: that rule is about a thing which
 * legitimately affords a verb being temporarily unable (a broken anvil
 * still hammers when mended). An urn is not a degraded basin.
 *
 * ⚠⚠ **And it was in the wrong bucket, so it reached nobody.**
 * `environment` grants OUTWARD to the containers ABOVE a thing — which
 * is why a rock in a bag in your pack still hands you `throw`. A basin
 * stands in the room as the player's SIBLING, not their ancestor, and
 * nobody carries a basin. So `wash` was afforded to no one, anywhere it
 * shipped: the bar basin, the tap, the standpipe, the dorm tap. The
 * sideways bucket is `peers`, and no test had ever asserted that a
 * person standing at a basin could actually see the verb.
 *
 * The controller stays more permissive than the affordance, deliberately:
 * `WashController` accepts **any** reachable bulk holder whose matter is
 * water, a carried jug included. What the fixture provides is
 * DISCOVERABILITY — you learn `wash` by standing at a sink — while what
 * makes it work is water in reach. A static cannot read a holder's
 * contents, and should not: that is the state-dependent affordance the
 * `InstanceContributor` seam used to express, and it was deleted for
 * good reasons (see command-routing.md).
 */

import Thing from '../../lib/stuff/Thing';
import { BulkableMixin } from '../../lib/bulk/Bulkable';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { SwitchableMixin } from '../../lib/boundary/Switchable';
import type { CommandContributions } from '../../api/command';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { BulkAffordance } from '../../lib/bulk/Bulkable';
import type { MarkupAugmenter } from '../../api/mml';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import type Material from '../../lib/material/Material';
import { MixinApi } from '../../api/mixin';
import { ParcelApi } from '../../api/parcel';
import { ZoneApi } from '../../api/zone';
import { NavigationApi } from '../../api/navigation';
import { AppApi } from '../../api/app';
import { WorldClockApi } from '../../api/worldclock';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { WaterHardness } from '../../lib/cleanliness/WaterHardness';
import PipeRun from './PipeRun';
import type WaterHose from './WaterHose';
import Street from '../location/Street';
import WaterStore from './WaterStore';
import '../../lib/supply/WaterChemistry';
import {
  SUPPLY_STATE_GLOSS,
  type SupplyReport,
  type SupplyReporting,
  type SupplyServing,
  type SupplyState,
  type WaterSupply,
} from '../../lib/supply/SupplyState';

/**
 * ⭐ *The water is soft.* (cleanliness D12) — what a hand at the basin
 * feels, said with the shipped river's own rule. Nothing when unknown.
 */
function hardnessAugmenter(text: string, host: Stuff): string {
  if (!(host instanceof WaterFixture)) return text;
  const dgh = host.getWaterHardnessDgh();
  if (dgh === null) return text;
  return `${text}\n\nThe water is ${new WaterHardness(dgh).word()}.`;
}

/**
 * ⭐ Says why nothing comes out of a tap whose supply is not delivering — in
 * the shipped vocabulary's own gloss, so a player who has learned what
 * *shut off* means at one tap has learned it at every tap. A weak tap says
 * it runs weak.
 */
function supplyAugmenter(text: string, host: Stuff): string {
  if (!(host instanceof WaterFixture)) return text;
  const state = host.supplyStateNow();
  if (state !== null) {
    return `${text}\n\nNothing comes out of it: ${SUPPLY_STATE_GLOSS[state]}.`;
  }
  if (host.runsWeak()) return `${text}\n\nIt runs weak — a thin stream.`;
  return text;
}

/** Numeric dial with a call-site fallback (the water pack's `dial` shape). */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/** A supply as the fixture holds it — the shape, read structurally. */
type Supply = Stuff & WaterSupply;

/**
 * How the fixture's water was last resolved. `pending` = never asked
 * (sync reads are silent and empty); `natural` = it is its own source;
 * `unplumbed` = its premises cites nothing (or `none`); `missing` = it cites
 * a supply that would not load; `supply` = resolved.
 */
type Resolution = 'pending' | 'natural' | 'unplumbed' | 'missing' | 'supply';

// The same order `Receptacle` uses, and for the same reason: Thermal outer
// of Bulkable, so a holder's heat capacity derives from what is in it.
/** What a tap delivers, clean and fouled. */
const PLAIN_WATER_PATH = '/stuff/idea/material/bulk/water';
const FOULED_WATER_PATH = '/stuff/idea/material/bulk/fouled-water';

// ⭐ A piped outlet has a VALVE (the browser walk: the public health
// officer had no way to take a fouled standpipe out of service). `switch
// standpipe off` shuts it; it reads `off` in the shipped vocabulary.
const WaterFixtureBase = SwitchableMixin(ThermalMixin(BulkableMixin(Thing)));

export default class WaterFixture
  extends WaterFixtureBase
  implements SupplyServing, SupplyReporting
{
  /**
   * ⭐⭐ A NAMED supply this fixture is plumbed to — an identity path, or
   * `''` to read its premises' citation (the ordinary case). A named source
   * wins over the premises: a yard hydrant on a district main is the
   * district's, whatever the lot behind it declares.
   */
  protected suppliedBy = '';

  /**
   * ⭐ This fixture IS a source — a leat, a pond, a spring-fed trough — and
   * runs on its own water, endlessly. An author's declaration; the default
   * is that a fixture is plumbed to something.
   */
  protected natural = false;

  /**
   * ⭐ It draws its share whether anybody uses it or not — the fountain's
   * *calix* bore (D24). Counted in its supply's demand.
   */
  protected continuous = false;

  /**
   * ⭐ How hard this fixture's water is when it is its own source (a well, a
   * spring) — `null` when it does not say. A fixture on a supply answers the
   * supply's (cleanliness D12).
   */
  protected hardnessDgh: number | null = null;

  static fieldMeta: FieldMeta = {
    suppliedBy: { persistent: true, authorable: true, ref: 'identity:relation' },
    natural: { persistent: true, authorable: true },
    continuous: { persistent: true, authorable: true },
    hardnessDgh: { persistent: true, authorable: true },
  };

  static markupAugmenters: MarkupAugmenter[] = [supplyAugmenter, hardnessAugmenter];

  /** Transient: how the water was last resolved, and against what. */
  private _resolution: Resolution = 'pending';
  private _sourcePath = '';
  private _supply: Supply | null = null;
  /** Head of water over this outlet, m — `null` when either end is unknown. */
  private _headM: number | null = null;
  /** The premises' declared land use — the tap's words and its rank (D6). */
  private _landUse = '';
  /** The share of a full draw this outlet gets from its supply (D6). */
  private _share = 1;

  constructor() {
    super();
    // ⭐ Plumbed in. A live drive walked out of Dave's Bar carrying the
    // wash basin — 30 kg is well inside a person's lift, so encumbrance
    // was never going to stop it, and nothing else did either. What
    // stops you is that it is connected to the water, which is exactly
    // what `fixedInPlace` says: no agent pockets it, while a remodel or
    // a `place` still moves it.
    this.fixedInPlace = true;
    // Its valve stands open until somebody shuts it.
    this.setOn(true);
  }

  public getSuppliedBy(): string {
    return this.suppliedBy;
  }
  public setSuppliedBy(value: string): void {
    this.suppliedBy = typeof value === 'string' ? value.trim() : '';
    this._resolution = 'pending';
  }

  public isNatural(): boolean {
    return this.natural;
  }
  public setNatural(value: boolean): void {
    this.natural = value === true;
    this._resolution = 'pending';
  }

  public isContinuous(): boolean {
    return this.continuous;
  }
  public setContinuous(value: boolean): void {
    this.continuous = value === true;
  }

  // ---------- the premises, and the supply it cites ----------

  /**
   * ⭐ The premises this fixture stands on — the path the parcel registry is
   * asked about. The room at the end of the containment walk; ⭐ a keyed
   * holding room answers by its PERSISTENCE KEY (`<lot extent>/<leaf>`),
   * because its template path is the shared row every lot's kitchen clones
   * from, and that row resolves the district, not the lot.
   */
  public resolvePremisesPath(): string | null {
    const self = this as unknown as Stuff;
    let cursor: Stuff = self;
    const seen = new Set<string>();
    while (MixinApi.isContainable(cursor)) {
      const next = cursor.getContainer() as Stuff | null;
      if (next === null || seen.has(next.stuffId)) break;
      seen.add(next.stuffId);
      cursor = next;
    }
    if (cursor === self) return null;
    if (MixinApi.isPersistable(cursor)) {
      const key = cursor.getPersistenceKey();
      if (key !== null && key.startsWith('/')) return key;
    }
    return cursor.getTemplatePath();
  }

  /**
   * Where this fixture's water comes from, by path — sync, a trie read: the
   * named source, else the premises' citation. `''` = nothing.
   */
  private citedSourcePath(): string {
    if (this.suppliedBy !== '') return this.suppliedBy;
    const premises = this.resolvePremisesPath();
    if (premises === null) return '';
    const water = ParcelApi.waterOf(premises);
    return water.source === 'none' ? '' : water.source;
  }

  /**
   * ⭐ Resolve the supply and this outlet's head. Async, on the settle path
   * every draw verb already awaits; re-run each settle, so a premises a
   * plumber has just connected is read at the next draw. The supply loads
   * on use (`StuffApi.singleton` — a supply composes `SingletonMixin`, so
   * the room that props it later adopts the same instance).
   */
  public async ensureSupply(): Promise<void> {
    if (this.natural) {
      this._resolution = 'natural';
      this._supply = null;
      this._headM = null;
      return;
    }
    const path = this.citedSourcePath();
    if (path === '') {
      this._resolution = 'unplumbed';
      this._sourcePath = '';
      this._supply = null;
      this._headM = null;
      return;
    }
    if (path !== this._sourcePath || this._supply === null || this._supply.isDestroyed()) {
      this._sourcePath = path;
      try {
        this._supply = await StuffApi.singleton<Supply>(path);
      } catch {
        this._supply = null;
      }
    }
    if (this._supply === null || typeof this._supply.drawL !== 'function') {
      this._resolution = 'missing';
      this._supply = null;
      this._headM = null;
      return;
    }
    // ⭐⭐ A room has water because a pipe brings it (D10): the supply alone
    // is not enough. A natural source needs none, a fixture on a NAMED
    // source is its own pipe (a hydrant on the district main), a public
    // outlet on a street has its pipe under the street, and a store
    // standing in the same room feeds the tap beside it.
    // ⭐ A tap implies its pipe: a plumbed room with no run in it yet stands
    // its own up here, once (`Plumbed`) — no author props one.
    if (this.needsRun(this._supply)) {
      if (this.runOf() === null) await this.standUpRun();
      if (this.soundRun() === null) {
        this._resolution = 'unplumbed';
        this._headM = null;
        return;
      }
    }
    this._resolution = 'supply';
    this._headM = await this.resolveHead(this._supply);
    // ⭐ Its rank in a shortage is its premises' land use (D6): the market
    // fountain before the brewery before the house.
    const premises = this.resolvePremisesPath();
    this._landUse = premises === null ? '' : ParcelApi.landUseOf(premises);
    this._share = await this._supply.shareFor(this.shortageRank()).catch(() => 1);
    await this.settleHoses();
  }

  /** Hoses screwed onto this outlet — runtime, as their couplings are. */
  private _hoses = new Set<WaterHose>();

  /** A hose's own act: it is screwed onto this outlet, or off it. */
  public coupleHose(hose: WaterHose, on: boolean): void {
    if (on) this._hoses.add(hose);
    else this._hoses.delete(hose);
  }

  /**
   * ⭐ A sprinkler on a hose from here draws on this outlet's supply: bring
   * it current whenever this outlet is (a draw, a fill, `analyze water`), so
   * the supply never reads as if it had not run (the live walk: a tank read
   * full under a sprinkler nobody's bed had asked about).
   */
  private async settleHoses(): Promise<void> {
    if (this._hoses.size === 0) return;
    const nowS = WorldClockApi.getNow().rawValue();
    for (const hose of [...this._hoses]) {
      if ((hose as unknown as Stuff).isDestroyed() || hose.getOutlet() !== (this as unknown as WaterFixture)) {
        this._hoses.delete(hose);
        continue;
      }
      await hose.getSprinkler()?.settleIrrigation(nowS);
    }
  }

  /**
   * Its rank in a shortage (D6). A PUBLIC outlet is civic whatever the
   * ground under it is zoned: the fountain's continuous bore, and an
   * outlet standing in a street (the market standpipe — the square is a
   * commercial parcel, and the browser walk found the public standpipe
   * going weak with the trades). Otherwise its premises' land use.
   */
  private shortageRank(): string {
    if (this.continuous || this.roomOf() instanceof Street) return 'civic';
    return this._landUse;
  }

  /** The room this fixture stands in — the end of its containment walk. */
  private roomOf(): Stuff | null {
    const self = this as unknown as Stuff;
    let cursor: Stuff = self;
    while (MixinApi.isContainable(cursor)) {
      const next = cursor.getContainer() as Stuff | null;
      if (next === null) break;
      cursor = next;
    }
    return cursor === self ? null : cursor;
  }

  /** The run in this fixture's room, whatever its state, or `null`. */
  public runOf(): PipeRun | null {
    const room = this.roomOf();
    if (room === null) return null;
    // A run rides the room's `props:` (its contents) or hangs as a fixture;
    // either way it is the room's own, read locally — never a search.
    const here: Stuff[] = [
      ...(MixinApi.isContainer(room) ? (room.getContents() as Stuff[]) : []),
      ...(MixinApi.isAdornable(room) ? (room.getFixtures() as readonly Stuff[]) : []),
    ];
    for (const f of here) {
      if (f instanceof PipeRun && f.getRunKind() === 'room') return f;
    }
    return null;
  }

  /** Have this fixture's room stand up the run its plumbing names (`Plumbed`). */
  private async standUpRun(): Promise<void> {
    const room = this.roomOf();
    if (room === null || !MixinApi.isContainer(room)) return;
    const pending = WaterFixture.standingUp.get(room);
    if (pending) {
      await pending;
      return;
    }
    const work = this.cloneRunInto(room as Stuff & Container).finally(() => {
      WaterFixture.standingUp.delete(room);
    });
    WaterFixture.standingUp.set(room, work);
    await work;
  }

  /**
   * ⭐ A tap implies its pipe (the review): stand up, in this room, the run
   * its PREMISES says carries the water — `ParcelRecord.pipe`, inherited up
   * the claim chain ("Seznick House with the landlord's lead"), else
   * `plumbing.defaultRun`. No author props one. A word with no run row is a
   * content error, said loudly: the tap reads unplumbed rather than invent
   * a pipe.
   */
  private async cloneRunInto(room: Stuff & Container): Promise<void> {
    if (this.runOf() !== null) return;
    const premises = this.resolvePremisesPath();
    const word = (premises !== null ? ParcelApi.waterOf(premises).pipe : undefined) ?? WaterFixture.defaultPipe();
    const row = `/stuff/thing/fixture/${word}-run`;
    try {
      const run = await StuffApi.clone<Stuff>(row);
      if (MixinApi.isContainable(run)) ContainmentApi.move(run, room);
    } catch (err) {
      console.warn(`WaterFixture: ${premises ?? '?'} names no run at ${row}: ${String(err)}`);
    }
  }

  /** The runs being stood up, by room — two taps in one room make one pipe. */
  private static standingUp = new WeakMap<Stuff, Promise<void>>();

  /** The run word a premises that names none gets (`plumbing.defaultRun`). */
  private static defaultPipe(): string {
    try {
      const raw = AppApi.setting(AppSettingKeys.plumbingDefaultRun);
      if (typeof raw === 'string' && raw.trim() !== '') return raw.trim();
    } catch {
      // Unwarmed settings read the shipped default.
    }
    return 'iron';
  }

  /** The room's run when it carries water, after its frost is read. */
  private soundRun(): PipeRun | null {
    const run = this.runOf();
    if (run === null) return null;
    run.reconcileFrost(WorldClockApi.getNow().rawValue());
    return run.isSound() ? run : null;
  }

  /** Does this outlet need a pipe in its room to reach `supply`? */
  private needsRun(supply: Supply): boolean {
    if (this.suppliedBy !== '') return false;
    const room = this.roomOf();
    if (room instanceof Street) return false;
    if (supply instanceof WaterStore && MixinApi.isContainable(supply) && supply.getContainer() === room) {
      return false;
    }
    return true;
  }

  /** The supply as last resolved — a SYNC read for hot paths; null = none. */
  private supplyNow(): Supply | null {
    if (this._resolution === 'pending') void this.ensureSupply().catch(() => {});
    return this._resolution === 'supply' ? this._supply : null;
  }

  /**
   * ⭐ Head of water over this outlet, m: the supply's water surface minus
   * the outlet's own elevation (its room's zone elevation + its storey).
   * `null` when either end is unknown — which reads as full head, never as
   * none.
   */
  private async resolveHead(supply: Supply): Promise<number | null> {
    const surface = await supply.supplyHeadM().catch(() => null);
    if (surface === null) return null;
    const outlet = await this.outletElevationM();
    if (outlet === null) return null;
    return surface - outlet;
  }

  /**
   * This outlet's elevation, m ASL: its room's zone elevation plus the
   * room's storey × the storey height (D4). A room in no structure, or on
   * the implicit storey, stands at its zone's elevation.
   */
  public async outletElevationM(): Promise<number | null> {
    const self = this as unknown as Stuff;
    let room: Stuff = self;
    while (MixinApi.isContainable(room)) {
      const next = room.getContainer() as Stuff | null;
      if (next === null) break;
      room = next;
    }
    const ground = await ZoneApi.elevationFor(room).catch(() => null);
    if (ground === null) return null;
    return ground + this.storeyIndexOf(room) * dial(AppSettingKeys.constructionStoreyHeightM, 3);
  }

  /**
   * How many storeys up the room stands: the depth of its storey in its
   * structure's `on:` chain (0 = the ground). One question, asked of the
   * structure the room belongs to.
   */
  private storeyIndexOf(room: Stuff): number {
    const path = room.getTemplatePath();
    if (!path) return 0;
    const structure = NavigationApi.structureAtNow(path);
    if (structure === null) return 0;
    let storey = structure.storeyOf(path);
    let depth = 0;
    const seen = new Set<string>();
    while (storey?.on !== undefined && !seen.has(storey.key)) {
      seen.add(storey.key);
      depth++;
      storey = structure.storeyByKey(storey.on);
    }
    return depth;
  }

  /**
   * ⭐ What a hose coupled to this outlet is fed with, as last settled: the
   * head the water stands at above it, its rank's share in a shortage, and
   * what the supply can give — or `null` when nothing flows under pressure
   * (a natural source has no head; an unplumbed or dry one gives nothing).
   * A sprinkler throws by it (water supply, the review).
   */
  public pressureNow(): { headM: number; share: number; availableL: number } | null {
    if (this.natural) return null;
    const supply = this.supplyNow();
    if (supply === null || this.supplyStateNow() !== null) return null;
    const head = this._headM;
    if (head === null || !(head > 0)) return null;
    const share = this._share > 0 && this._share < 1 ? this._share : 1;
    return { headM: head, share, availableL: supply.availableL() };
  }

  /** Is the head so low a draw gives only a trickle? */
  public runsWeak(): boolean {
    if (this.supplyNow() === null) return false;
    // A rank given part of its demand in a shortage trickles (D6).
    if (this._share > 0 && this._share < 1) return true;
    const head = this._headM;
    return head !== null && head > 0 && head < dial(AppSettingKeys.waterWeakHeadM, 3);
  }

  // ---------- the six-and-one words ----------

  /**
   * Why this fixture gives nothing, or `null`. A natural source, and a
   * fixture not yet resolved, say nothing (the second is empty all the
   * same — see {@link isBulkEmpty}).
   */
  public supplyStateNow(): SupplyState | null {
    if (this.natural) return null;
    // The valve first: a shut outlet gives nothing, whatever its supply.
    if (!this.isOn()) return 'off';
    const supply = this.supplyNow();
    if (this._resolution === 'pending') return null;
    if (supply === null) return 'unplumbed';
    const state = supply.supplyStateNow();
    if (state !== null) return state;
    // ⭐ Its rank has gone dry in a shortage — more is asked of the supply
    // than it carries, and this outlet is the one that goes without.
    if (this._share <= 0) return 'overdrawn';
    // ⭐ The water stands below this outlet: the source has nothing to give
    // HERE, whatever it gives the ground floor.
    if (this._headM !== null && this._headM <= 0) return 'dry';
    return null;
  }

  /**
   * ⭐ Settle the water before it is read: resolve the supply and the head,
   * then pull the supply's hardness — its source's — into the fixture's own
   * water, so a pail filled here and carried away is soft or hard as the
   * tap is (cleanliness D12).
   */
  public override async settleBulk(affordance: BulkAffordance): Promise<void> {
    await super.settleBulk(affordance);
    if (affordance !== 'interior') return;
    await this.ensureSupply();
    const supply = this._resolution === 'supply' ? this._supply : null;
    // ⭐ The supply's whole chemistry where it says (water-supply D8) — so a
    // pail from this tap carries the main's acidity and salt as well as its
    // hardness — else its hardness alone, else this fixture's own.
    const chemistry =
      supply && typeof supply.readWaterChemistry === 'function'
        ? await supply.readWaterChemistry().catch(() => null)
        : null;
    const fromSupply =
      chemistry?.hardnessDgh ??
      (supply && typeof supply.readWaterHardnessDgh === 'function'
        ? await supply.readWaterHardnessDgh().catch(() => null)
        : null);
    const dgh = fromSupply ?? this.hardnessDgh;
    // ⭐ A fouled supply delivers fouled water — the material whose dose is
    // the dysentery — and clean water again once it clears.
    if (chemistry !== null && chemistry.fouled !== undefined && !this.natural) {
      const want = chemistry.fouled ? FOULED_WATER_PATH : PLAIN_WATER_PATH;
      if (this.getBulkMaterialPath('interior') !== want) {
        const m = StuffApi.findByTemplatePath<Material>(want) ?? null;
        if (m !== null) this.setBulkMaterial('interior', m);
      }
    }
    // ⭐ What stood in the room's pipe since the last draw comes out first
    // (D8/D10): a lead run in soft acid water has leached into it overnight.
    const run = supply !== null && this.needsRun(supply) ? this.runOf() : null;
    const standing = run?.standingWater(chemistry) ?? null;
    if (dgh === null && chemistry === null && standing === null) return;
    this.setBulkPayload('interior', {
      ...(this.getBulkPayload('interior') ?? {}),
      ...(dgh !== null ? { hardnessDgh: dgh } : {}),
      ...(chemistry !== null ? { pH: chemistry.pH, salinityPpt: chemistry.salinityPpt } : {}),
      ...(standing?.dissolvedToxins ? { dissolvedToxins: standing.dissolvedToxins } : {}),
    });
  }

  /** The water's hardness as last settled, or `null`. */
  public getWaterHardnessDgh(): number | null {
    const dgh = this.getBulkPayload('interior')?.hardnessDgh;
    return typeof dgh === 'number' ? dgh : this.hardnessDgh;
  }

  public override getBulkAvailable(affordance: BulkAffordance): number {
    if (affordance !== 'interior') return super.getBulkAvailable(affordance);
    if (this.getBulkMaterialPath('interior') === null) return 0;
    if (this.natural) return Infinity;
    const supply = this.supplyNow();
    if (supply === null || this.supplyStateNow() !== null) return 0;
    const available = supply.availableL();
    return this.runsWeak()
      ? Math.min(available, dial(AppSettingKeys.waterWeakDrawL, 2))
      : available;
  }

  public override isBulkEmpty(affordance: BulkAffordance): boolean {
    if (affordance !== 'interior') return super.isBulkEmpty(affordance);
    return this.getBulkAvailable('interior') <= 0;
  }

  /** ⭐ A draw takes from the SUPPLY — a store's level falls; a main's does not. */
  public override debitBulk(affordance: BulkAffordance, litres: number): void {
    if (affordance !== 'interior') {
      super.debitBulk(affordance, litres);
      return;
    }
    if (this.natural) return;
    this.supplyNow()?.drawL(litres);
    // The draw flushed the pipe: fresh water stands in it now.
    if (litres > 0) this.runOf()?.flush();
  }

  /** ⭐ Why `fill` got nothing here, in the tap's own words. */
  public override bulkWhyEmpty(affordance: BulkAffordance): string | null {
    if (affordance !== 'interior') return super.bulkWhyEmpty(affordance);
    const state = this.supplyStateNow();
    if (state === 'unplumbed' && this._supply !== null) {
      // ⭐ On a supply, but the pipe in this room is missing or failed (the
      // browser walk: a burst scullery pipe read "this house isn't on any
      // supply" in a house that was).
      const run = this.runOf();
      return run === null
        ? 'Nothing comes out — no pipe brings water into this room.'
        : `Nothing comes out — the pipe is ${run.stateWords()}.`;
    }
    if (state === 'unplumbed') {
      const premises = this.resolvePremisesPath();
      const residential =
        premises !== null && ParcelApi.landUseOf(premises) === 'residential';
      return residential
        ? "Nothing comes out — this house isn't on any supply."
        : "Nothing comes out — this place isn't on any supply.";
    }
    if (state === 'dry' && this._headM !== null && this._headM <= 0) {
      return 'Nothing comes out — the water stands below here.';
    }
    if (state !== null) return `Nothing comes out: ${SUPPLY_STATE_GLOSS[state]}.`;
    return null;
  }

  /**
   * ⭐ `analyze water <tap>` reads the SUPPLY — the tap has no working of its
   * own to show, and the whole lesson is that what you see at the tap is
   * decided somewhere else — then what this outlet's height makes of it.
   */
  public async supplyReport(nowS: number): Promise<SupplyReport> {
    await this.ensureSupply();
    const label = this.getPresentation();
    if (this.natural) {
      return {
        label,
        state: null,
        lines: ['It draws on its own source, and nothing upstream decides whether it runs.'],
      };
    }
    const supply = this._resolution === 'supply' ? this._supply : null;
    if (supply === null) {
      return {
        label,
        state: 'unplumbed',
        lines: [
          this._resolution === 'missing'
            ? `It is plumbed to ${this._sourcePath}, which cannot be found.`
            : `unplumbed — ${SUPPLY_STATE_GLOSS.unplumbed}.`,
        ],
      };
    }
    const report =
      typeof supply.supplyReport === 'function'
        ? await supply.supplyReport(nowS)
        : { label: supply.getPresentation(), state: supply.supplyStateNow(), lines: [] };
    const lines = [...report.lines];
    // ⭐ What a shortage leaves THIS outlet (D6) — the main's report says it
    // is short; only the outlet can say whose rank goes without (the
    // browser walk: a tap on a short main read exactly like a full one).
    const rank = this.shortageRank();
    const rankWord =
      rank === 'civic' ? 'public outlets' : rank === 'commercial' || rank === 'industrial' ? 'the trades' : 'houses';
    if (this._share <= 0) {
      lines.push(`more is asked of it than it carries, and ${rankWord} go without — nothing reaches this outlet`);
    } else if (this._share < 1) {
      lines.push(
        `more is asked of it than it carries: ${rankWord} get ${Math.round(this._share * 100)}% of their share — it runs weak`,
      );
    }
    const head = this._headM;
    if (head !== null) {
      lines.push(
        head <= 0
          ? `the water stands ${(-head).toFixed(1)} m below this outlet — nothing reaches it`
          : head < dial(AppSettingKeys.waterWeakHeadM, 3)
            ? `${head.toFixed(1)} m of head over this outlet — it runs weak`
            : `${head.toFixed(1)} m of head over this outlet`,
      );
    }
    return {
      label: report.label,
      state: this.supplyStateNow(),
      lines,
    };
  }

  /** Sideways: anyone in the room with the basin can wash at it. */
  static commandContributions: CommandContributions = {
    peers: [
      // The valve: anybody at the outlet can shut it or open it.
      'platform/cmd/device/switch.yaml',
      'platform/cmd/crafting/wash.yaml',
      // ⭐ …and `scrub`, the same act harder (cleanliness D10).
      'platform/cmd/crafting/scrub.yaml',
      // ⭐ You learn `rinse` the same way you learn `wash`: by standing
      // at water. A separate verb rather than a second `wash` stanza —
      // `wash`'s arg is a CRAFTED thing, and widening it to also accept a
      // body would delete a check (see `RinseController`'s header).
      'platform/cmd/medical/rinse.yaml',
      // ⭐ …and you cool a burn at water the same way (recovery build).
      'platform/cmd/medical/cool.yaml',
      // ⭐ …and you wash your hands clean at it — bare `wash` (recovery
      // build, D10). Handwashing folded into `wash` rather than a
      // separate `scrub`: it has no object arg (the hands are your own
      // body), so nothing was widened. `rinse` stays separate because it
      // takes a body ARG.
    ],
  };
}
