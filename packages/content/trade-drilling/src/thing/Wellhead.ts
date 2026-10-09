/**
 * Wellhead — ⭐⭐⭐ **the hole in the ground, and the whole reason this
 * trade needed no new verb to get fluid out of one.**
 *
 * `PersistableMixin(BulkableMixin(GroundPointMixin(Good)))`, fixed in
 * place, minted one per staked site. Four claims, in order of how
 * load-bearing they are:
 *
 * ## 1 ⚠⚠ A bore is a POINT, not a PLACE
 *
 * It mints no `Location`, adds no node to the location graph, and has no
 * inside anybody walks into. It is a fixture standing in an ordinary
 * surface room, and it asks the ground through that room
 * (`GroundPointMixin`). The alternative — a hole being a room — would
 * have made every hole in the realm a place, which is the invariant this
 * whole build was written against.
 *
 * ## 2 ⭐⭐ It is `Bulkable`, so withdrawal is SHIPPED behaviour
 *
 * `fill <cask> from <wellhead>` is the platform's verb over the
 * platform's substrate. Nothing in this trade implements pouring,
 * measuring, blending or the rule that a gas poured into an open pail
 * escapes into the room's air — all of it falls out of being a bulk
 * holder. What the trade supplies is the **policy**: what the slot
 * holds (the fluid at depth), and how it gets there.
 *
 * ## 3 ⭐⭐⭐ The bottom of the hole and the wellhead are DIFFERENT PLACES
 *
 * This is the one piece of physics the whole Stage A/Stage B arc hangs
 * on, and it is why the bailer exists and why the pump is a build of its
 * own.
 *
 *  - A body with **head** drives its own fluid to the surface. Flow
 *    accumulates in the `interior` slot on the clock, and you fill a
 *    cask from the wellhead like a tap.
 *  - A body with **no head** — which is most of them, and brine
 *    certainly — sits at the bottom of the hole. `bail` is the only way
 *    up: a leather bucket on a rope, one bucketful at a time, which is
 *    how every well on earth worked before there was a pump.
 *
 * So the slot is empty on a dead well not because of a gate but because
 * the brine is a hundred metres down. ⭐ And *that* is the hole a pump
 * fills: {@link Wellhead.liftL} is a single number, and a lift mechanism
 * raising it is the pump build's entire attach point.
 *
 * ## 4 ⚠⚠ Depth is BANKED; only the swing is ENGAGED
 *
 * Engagements do not survive a server restart (the `restart` abort
 * reason is unbuilt), so nothing here is allowed to be an engagement
 * longer than one swing. A bore is weeks of work, so the work is
 * **banked**: `swingBank` counts swings toward the next metre and
 * survives everything. A restart costs at most one swing.
 *
 * Two things feed the bank — a present person's own swing, and the
 * crew's presence over elapsed game time ({@link Wellhead.reconcileRig},
 * armed on the world clock in `postRegister` so weeks pass with nobody
 * reading).
 *
 * See [docs/subsystems/drilling.md].
 */

import Good from '@saxonberg/server/mud/platform/thing/Good';
import { BulkableMixin } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { GroundPointMixin } from '@saxonberg/content-ground/src/lib/GroundPoint';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { BulkAffordance } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { FluidBody } from '@saxonberg/content-ground/src/idea/Deposit';
import BodyRegister, {
  BODY_REGISTER_PATH,
  type BodyRef,
} from '@saxonberg/content-ground/src/idea/BodyRegister';
import { BoreRegistry, BORE_REGISTRY_PATH } from '../idea/BoreRegistry';
import type { DrillingOutfit } from '../idea/DrillingOutfit';

/**
 * Swings a metre costs in rock of {@link REFERENCE_MPA} hardness.
 *
 * ⭐ Priced on the host's `hardnessMPa`, which is the field the mining
 * build documented as *"what carve cost is priced on"* — so slate is
 * cheap, granite is dear, and a driller who reads the column knows what
 * the next ten metres will cost before paying for it. **The grain, not
 * the law:** an author who wants a harder world moves this number.
 */
const SWINGS_PER_METRE_REF = 6;

/** The hardness the reference cost is quoted at — ordinary country rock. */
const REFERENCE_MPA = 100;

/** How long one hand's swing takes, in game-milliseconds. */
const SWING_MS = 20_000;

/**
 * Swings one rostered hand contributes per game-hour of presence.
 *
 * ⚠ The crew is not faster than a player per swing; it is **continuous**,
 * which is the whole economic point. A player swings while they are at
 * the keyboard; a crew swings while the owner is asleep, and sends a bill
 * either way.
 */
const CREW_SWINGS_PER_HOUR = 120;

/**
 * ⚠ The longest stretch one reconcile will credit, in game-seconds.
 *
 * The watch doctrine's own cap, and for its reason: presence is sampled,
 * not watched, so a hand who was in the room at the last sample and at
 * this one is paid for the gap. One game hour bounds the error for a hand
 * that wandered off in between — and it bounds it the same way for a
 * player, so a player on the crew has to actually stay.
 */
const SAMPLE_CAP_S = 3_600;

/** Litres one bailer-load brings up. The pre-pump lift, and it is small. */
const BAILER_L = 12;

/**
 * Litres per game-hour a charged leg gives up into an open hole, per
 * metre of leg the hole is standing in.
 *
 * ⭐ Seepage, not flow: this is what makes a hole at the trap's rim worth
 * almost nothing even when it reaches the leg. One metre of leg seeps a
 * trickle; forty metres fills the hole as fast as a crew can empty it.
 */
const SEEP_L_PER_HOUR_PER_M = 4;

/** How much a hole can hold standing at its bottom, in litres. */
const SUMP_L = 400;

/**
 * Below this head, in atmospheres, a well has stopped driving its own
 * fluid up and has to be bailed. ⚠ Not zero: the last fraction of an
 * atmosphere lifts nothing a hundred metres.
 */
const FLOW_FLOOR_ATM = 0.25;

/** Litres per game-hour a flowing well delivers per atmosphere of head. */
const FLOW_L_PER_HOUR_PER_ATM = 300;

/**
 * Hardness below which rock will not stand open under the water table —
 * the hole needs lining before it goes deeper.
 *
 * ⚠ **A threshold, not a roll.** `uncertainty.md`'s resolutional ban:
 * nothing decides whether your hole caved in. Soft wet ground will not
 * hold, the bill says so before the swing, and the refusal names the
 * remedy.
 */
const LINING_MPA = 120;

/** What the hole owes for its next metre. */
export interface CutCost {
  /** Swings the next metre takes, from the host rock's hardness. */
  swingsPerMetre: number;
  /**
   * Depth beyond which this hole will not go unlined, or `null` where
   * the ground will stand open all the way.
   */
  wantsLinerBeyondM: number | null;
  /** Depth the hole cannot usefully pass, or `null`. */
  stopAtM: number | null;
  /** The host rock at the next metre — what the log line records. */
  hostPath: string;
}

export default class Wellhead extends PersistableMixin(
  BulkableMixin(GroundPointMixin(Good)),
) {
  /** Metres sunk. The hole's own fact, on the hole. */
  protected depthM = 0;

  /** Metres lined. Nothing above this depth leaks in. */
  protected linedToM = 0;

  /** Swings banked toward the next metre. Survives everything. */
  protected swingBank = 0;

  /** Game-seconds of the last rig reconcile; `0` = never. */
  protected rigStamp = 0;

  /** Litres standing at the BOTTOM of the hole, waiting for a bailer. */
  protected sumpL = 0;

  /** Litres this straw has taken out of the body, ever. */
  protected drawnL = 0;

  /** The body this hole is in, once it has reached one. `''` = none yet. */
  protected bodyKey = '';

  /** The outfit whose payroll is sinking this hole. `''` = none. */
  protected outfitPath = '';

  /** The claim this hole was sited on — its durable key and its log's leaf. */
  protected claimPath = '';

  static fieldMeta: FieldMeta = {
    depthM: { persistent: true, authorable: true },
    linedToM: { persistent: true, authorable: true },
    swingBank: { persistent: true },
    rigStamp: { persistent: true },
    sumpL: { persistent: true },
    drawnL: { persistent: true },
    bodyKey: { persistent: true },
    outfitPath: { persistent: true, authorable: true },
    claimPath: { persistent: true, authorable: true },
  };

  /** Reentry guard — the reconcile must never recurse through a read. */
  protected _reconcilingRig = false;

  /** The per-instance clock handle, cancelled on destruct. */
  private _clockHandle: { cancel(): void } | null = null;

  // ---------- the authored surface ----------

  public getDepthM(): number {
    return this.depthM;
  }
  public setDepthM(value: number): void {
    this.depthM = Math.max(0, Number(value) || 0);
  }

  public getLinedToM(): number {
    return this.linedToM;
  }
  public setLinedToM(value: number): void {
    this.linedToM = Math.max(0, Number(value) || 0);
  }

  public getSwingBank(): number {
    return this.swingBank;
  }

  public getSumpL(): number {
    return this.sumpL;
  }

  public getDrawnL(): number {
    return this.drawnL;
  }

  public getBodyKey(): string {
    return this.bodyKey;
  }

  public getOutfitPath(): string {
    return this.outfitPath;
  }
  public setOutfitPath(value: string): void {
    this.outfitPath = String(value ?? '');
  }

  public getClaimPath(): string {
    return this.claimPath;
  }
  public setClaimPath(value: string): void {
    this.claimPath = String(value ?? '');
  }

  // ---------- the clock ----------

  /**
   * Arm the hourly reconcile on the WORLD clock.
   *
   * ⭐ Per instance and on the world clock rather than a global sweep,
   * because the thing being measured is game time: a bore is weeks of
   * work, and the owner is entitled to come back after a month away and
   * find the hole deeper and the wage bill larger. The handle is
   * cancelled in `onDestruct` — the `FastTravel._clockHandles` shape.
   *
   * ⚠⚠ **Called by the SITING ACT and not by `onCreate`.** It was an
   * `onCreate` override, and `lint:on-create` refused it — the hook is a
   * RATCHET (*the ceiling may fall, never rise*) and a caller audit
   * showed the override was redundant: every path that brings a wellhead
   * into the world goes through `BoreController.site`, which clones or
   * `restoreOrSeed`s it and then arms it on both branches. There is no
   * other way for one to exist, so there was nothing for the hook to
   * cover.
   *
   * ⭐ And it is better here: arming at the siting means the rig starts
   * when the hole is committed, which is the moment the owner can point
   * at — rather than at an `onCreate` that also fires for a clone
   * nobody has staked.
   */
  public override onDestruct(): void {
    this.disarmRig();
    super.onDestruct();
  }

  /** Arm the hourly reconcile. Idempotent — it disarms first. */
  public armRig(): void {
    this.disarmRig();
    // ⚠ `'1 hour'`, NOT `'1h'`. The duration grammar is words
    // (`/^\s*(\d+)\s*(second|minute|hour|day)s?\s*$/`) and an
    // abbreviation THROWS — which, from `onCreate`, meant the whole
    // siting act failed with `controller-error` and the hole was never
    // minted. Found by driving; no unit test could see it, because a
    // fixture built with `makeStuff` never runs `onCreate`.
    this._clockHandle = WorldClockApi.every(
      '1 hour',
      () => {
        void this.reconcileRig();
      },
      { host: this as unknown as Stuff },
    );
  }

  /** Drop the handle. Called on destruct and before re-arming. */
  public disarmRig(): void {
    this._clockHandle?.cancel();
    this._clockHandle = null;
  }

  // ---------- ⭐⭐ what the next metre costs ----------

  /**
   * ⭐⭐ **What does this hole owe for its next metre?** — the one
   * question the acts ask, and the `improvementBill` shape exactly.
   *
   * `null` means *the ground has not said*, and the acts refuse in words
   * rather than treating silence as free: a hole standing somewhere with
   * no column under it is then **visibly** broken instead of silently
   * bottomless, which is the failure mode this repo keeps paying for.
   */
  public async cutBill(): Promise<CutCost | null> {
    const next = this.depthM + 1;
    const sample = await this.sampleAtDepth(next);
    if (sample === null) return null;
    const hardness = sample.hardnessMPa > 0 ? sample.hardnessMPa : REFERENCE_MPA;
    const deposit = await this.getDeposit();
    const table = deposit?.getWaterTable() ?? 0;
    // ⭐ The hole wants lining where soft rock meets standing water. A
    // threshold the bill states before the swing — never a roll.
    const wantsLiner =
      hardness < LINING_MPA && table < 0 ? Math.abs(table) : null;
    return {
      swingsPerMetre: Math.max(
        1,
        Math.round((SWINGS_PER_METRE_REF * hardness) / REFERENCE_MPA),
      ),
      wantsLinerBeyondM: wantsLiner,
      stopAtM: null,
      hostPath: sample.hostPath,
    };
  }

  /** How long one swing at the current depth takes, in game-milliseconds. */
  public async swingMs(): Promise<number> {
    const bill = await this.cutBill();
    if (bill === null) return SWING_MS;
    // Harder rock is slower per swing AND wants more swings — two
    // different questions, the `improvementPace` distinction.
    return Math.round(SWING_MS * Math.min(3, bill.swingsPerMetre / SWINGS_PER_METRE_REF));
  }

  /**
   * Does the hole refuse to go deeper until it is lined? ⚠ Stated as a
   * question the acts ask, so the refusal can name the remedy.
   */
  public async wantsLining(): Promise<boolean> {
    const bill = await this.cutBill();
    if (bill === null || bill.wantsLinerBeyondM === null) return false;
    return this.depthM + 1 > bill.wantsLinerBeyondM && this.linedToM < bill.wantsLinerBeyondM;
  }

  // ---------- ⭐ the bank ----------

  /**
   * Bank one swing's worth of work, and drop a metre when the bank pays
   * for one. Returns what happened, so the act can narrate it.
   *
   * ⚠ Called from an engagement's completion, which is a module-level
   * callback: it must never reach back through the controller (the
   * `WorkedActController` scar — a controller is destructed in a
   * `finally` while its engagement is still pending).
   */
  public async bankSwing(swings = 1): Promise<{
    deepened: boolean;
    depthM: number;
    bank: number;
    needed: number;
  }> {
    let bill = await this.cutBill();
    let needed = bill?.swingsPerMetre ?? SWINGS_PER_METRE_REF;
    if (!(swings > 0)) {
      return { deepened: false, depthM: this.depthM, bank: this.swingBank, needed };
    }
    this.swingBank += swings;
    let deepened = false;
    // ⚠ The bill is re-read EVERY metre, not once before the loop. A
    // crew's banked presence can pay for twenty metres in one reconcile,
    // and twenty metres is enough to cross out of slate and into
    // granite — so a single reading would have charged the whole run at
    // the price of its first yard. The ground changes under the bit, and
    // the cost has to change with it.
    while (bill !== null && this.swingBank >= needed) {
      this.swingBank -= needed;
      this.depthM += 1;
      deepened = true;
      await this.logMetre(bill.hostPath);
      // The hole stops where it will not stand open; the refusal names
      // the remedy and the banked swings wait for the liner.
      if (await this.wantsLining()) break;
      bill = await this.cutBill();
      needed = bill?.swingsPerMetre ?? needed;
    }
    return { deepened, depthM: this.depthM, bank: this.swingBank, needed };
  }

  /**
   * ⭐⭐ **The crew's presence, converted into depth and into a wage
   * bill.** Called hourly by the world clock and before every act.
   *
   * *The engine measures presence, not virtue* — the watch doctrine. A
   * hand counts for the stretch since the last sample if they are
   * rostered to this hole's outfit, on shift, standing in this hole's
   * room, and holding no engagement of their own. ⭐ The resolver is the
   * **room's own contents**, which is why an NPC resolves here where the
   * contract watch's `claimantStuff` (connected Avatars only) would
   * never have.
   */
  public async reconcileRig(): Promise<void> {
    if (this._reconcilingRig) return;
    this._reconcilingRig = true;
    try {
      const nowS = WorldClockApi.getNow().rawValue();
      if (this.rigStamp === 0) {
        this.rigStamp = nowS;
        return;
      }
      const elapsed = Math.min(Math.max(0, nowS - this.rigStamp), SAMPLE_CAP_S);
      this.rigStamp = nowS;
      if (elapsed <= 0) return;

      const hands = this.crewOnShift().length;
      if (hands > 0) {
        const swings = (hands * CREW_SWINGS_PER_HOUR * elapsed) / 3600;
        if (swings > 0) await this.bankSwing(swings);
      }
      await this.reconcileInflow(elapsed);
      await this.payCrew();
    } finally {
      this._reconcilingRig = false;
    }
  }

  /**
   * ⭐ Every hand this rig may count: rostered to its outfit, on shift,
   * standing right here, hands free.
   *
   * ⚠ Reads the ROOM, never a roster scan. A hand who is on the books and
   * at home is not sinking anything, and the whole doctrine is that the
   * engine measures where somebody is.
   */
  public crewOnShift(): Stuff[] {
    const place = this.groundPlace();
    if (place === null || this.outfitPath === '') return [];
    if (!MixinApi.isContainer(place)) return [];
    const outfit = StuffApi.findByTemplatePath<Stuff & DrillingOutfit>(
      this.outfitPath,
    );
    if (!outfit) return [];
    const here = (place as unknown as Stuff & Container).getContents();
    return here.filter((who) => {
      if (!outfit.isWorkingHere(who)) return false;
      // ⚠ Hands that are busy with something else are not on the beam.
      // The same test for a player and for an NPC.
      if (MixinApi.isEngaged(who) && who.getEngagements().length > 0) return false;
      return true;
    });
  }

  /** Settle a game-day's wages when one has passed. */
  private async payCrew(): Promise<void> {
    if (this.outfitPath === '') return;
    const outfit = StuffApi.findByTemplatePath<Stuff & DrillingOutfit>(
      this.outfitPath,
    );
    await outfit?.payDay();
  }

  // ---------- ⭐⭐⭐ the fluid, and the two places it can be ----------

  /** The body this hole has reached, or `null`. */
  public async bodyHere(): Promise<FluidBody | null> {
    if (this.bodyKey === '') return null;
    const deposit = await this.getDeposit();
    return deposit?.fluidBody(this.bodyKey) ?? null;
  }

  /**
   * ⭐⭐ **The head at the wellhead, derived and never stored.**
   *
   * `headAtm0 × (1 − Σdrawn / capacity)` — and the sum is over **every
   * straw in the body**, which is the whole reason withdrawal lives in a
   * register rather than on the hole. Two owners who have never met
   * watch the same gauge fall.
   */
  public async headAtm(): Promise<number> {
    const body = await this.bodyHere();
    if (body === null) return 0;
    const initial = body.headAtm0 ?? 0;
    if (initial <= 0) return 0;
    const deposit = await this.getDeposit();
    if (!deposit) return 0;
    const capacity = deposit.capacityOf(body);
    if (!(capacity > 0)) return 0;
    const register = await this.bodyBook();
    const drawn = register === null ? this.drawnL : await register.drawnFrom(await this.bodyRef());
    return Math.max(0, initial * (1 - Math.min(1, drawn / capacity)));
  }

  /**
   * ⭐ **Litres one act of lifting brings up** — and the pump's entire
   * attach point.
   *
   * A leather bucket on a rope is {@link BAILER_L}. Anything that raises
   * this number is a pump, and the reason a pump is a build of its own
   * rather than a dial is that it also turns a bucket-at-a-time act into
   * a continuous rate.
   */
  public liftL(): number {
    return BAILER_L;
  }

  /**
   * ⭐⭐⭐ **Lift what is standing at the bottom of the hole up to the
   * wellhead.** Returns the litres raised.
   *
   * The physical act a bailer performs, and the reason brine is work
   * rather than a tap: the fluid is a hundred metres down, and nothing
   * in the game moves it up except this.
   */
  public async lift(): Promise<number> {
    await this.reconcileRig();
    const litres = Math.min(this.liftL(), this.sumpL);
    if (!(litres > 0)) return 0;
    const material = await this.sumpMaterial();
    if (material === null) return 0;
    this.sumpL -= litres;
    this.addToHead(material, litres);
    return litres;
  }

  /**
   * What the body gives up into the hole over `elapsed` game-seconds,
   * and where it lands.
   *
   * ⭐ A **flowing** body drives its fluid to the wellhead; a dead one
   * seeps into the sump and waits for a bailer. The same body does both
   * in its life, in that order, which is the arc the whole of Stage C is
   * about.
   *
   * ⚠ This is also where the BODY is debited — at the moment the hole
   * takes the fluid, not when a cask is filled, because once it is in the
   * hole it is out of the ground.
   */
  private async reconcileInflow(elapsed: number): Promise<void> {
    const body = await this.bodyHere();
    if (body === null) return;
    const deposit = await this.getDeposit();
    const place = this.groundPlace();
    if (!deposit || place === null) return;
    const at = this.metresHere(this.depthM);
    if (at === null) return;
    const leg = deposit.legAt(body, at[0], at[1]);
    if (leg === null || leg.thicknessM <= 0) return;

    const hours = elapsed / 3600;
    const head = await this.headAtm();
    const flowing = head >= FLOW_FLOOR_ATM;
    const wanted = flowing
      ? FLOW_L_PER_HOUR_PER_ATM * head * hours
      : SEEP_L_PER_HOUR_PER_M * leg.thicknessM * hours;
    if (!(wanted > 0)) return;

    // ⚠ Capped by what is left in the BODY, which is the register's sum
    // over every straw — not by this hole's own draw.
    const register = await this.bodyBook();
    const ref = await this.bodyRef();
    const alreadyOut =
      register === null ? this.drawnL : await register.drawnFrom(ref);
    const left = Math.max(0, deposit.capacityOf(body) - alreadyOut);
    const material = StuffApi.findByTemplatePath<Material>(body.fluid) ?? null;
    if (material === null) return;

    let litres = Math.min(wanted, left);
    if (flowing) {
      const slot = this.getBulk('interior');
      litres = Math.min(litres, slot.remaining());
      if (litres > 0) this.addToHead(material, litres);
    } else {
      litres = Math.min(litres, Math.max(0, SUMP_L - this.sumpL));
      if (litres > 0) this.sumpL += litres;
    }
    if (!(litres > 0)) return;

    this.drawnL += litres;
    if (register !== null) {
      await register.recordDraw(
        ref,
        this.getIdentityPath() ?? this.getTemplatePath() ?? '',
        litres,
        WorldClockApi.getNow().rawValue(),
      );
    }
  }

  /** What is standing in the sump, as a resolved Material. */
  private async sumpMaterial(): Promise<Material | null> {
    const body = await this.bodyHere();
    if (body === null) return null;
    return StuffApi.findByTemplatePath<Material>(body.fluid) ?? null;
  }

  /**
   * Put `litres` of `material` into the wellhead's own slot.
   *
   * ⚠ Refuses to mix: a slot already holding something else keeps it, and
   * the inflow waits. A well producing two substances at once is a thing
   * this build does not model and must not silently fake.
   */
  private addToHead(material: Material, litres: number): void {
    const slot = this.getBulk('interior');
    const held = slot.getMaterialPath();
    const want = material.getTemplatePath() ?? '';
    if (held !== null && held !== want) return;
    if (held === null) slot.setMaterial(material);
    const now = slot.getAmount().rawValue();
    slot.setAmount(Quantity.of(now + litres, 'L'));
  }

  // ---------- the body's book ----------

  /** Which body, anywhere in the realm — the register's key. */
  public async bodyRef(): Promise<BodyRef> {
    return { address: await this.getGroundAddress(), key: this.bodyKey };
  }

  private async bodyBook(): Promise<BodyRegister | null> {
    if (this.bodyKey === '') return null;
    try {
      return await StuffApi.singleton<BodyRegister>(BODY_REGISTER_PATH);
    } catch (err) {
      console.error('Wellhead: the body register did not resolve', err);
      return null;
    }
  }

  // ---------- the log ----------

  /**
   * File what this metre cut, and what came up.
   *
   * ⭐ *You file; you do not hold the pen* — the log is the trade's and
   * append-only, so it is worth something to a buyer precisely because
   * its subject cannot edit it. A dry hole's log is the thing that was
   * still worth the payroll.
   */
  private async logMetre(hostPath: string): Promise<void> {
    const fluid = await this.fluidAtDepth(this.depthM);
    // ⭐ Reaching a body is how the hole learns which one it is in. ⚠ A
    // body the trap holds nothing of answers `null` here, which is the
    // dry hole: the log records what was actually found, and *nothing* is
    // a finding.
    if (fluid?.bodyKey && this.bodyKey === '') this.bodyKey = fluid.bodyKey;
    try {
      const registry = await StuffApi.singleton<BoreRegistry>(BORE_REGISTRY_PATH);
      await registry.appendLine(this as unknown as Stuff, {
        atS: WorldClockApi.getNow().rawValue(),
        depthM: this.depthM,
        host: hostPath,
        fluid: fluid?.materialPath ?? null,
      });
    } catch (err) {
      console.error('Wellhead: the bore log did not resolve', err);
    }
  }

  // ---------- the bulk seams ----------

  /**
   * ⚠ A draw from the wellhead is fluid leaving a tank that is already
   * out of the ground, so this does **not** touch the body's book — the
   * register was written when the hole took it. Overridden only to keep
   * that statement somewhere a reader will find it.
   */
  public override debitBulk(affordance: BulkAffordance, litres: number): void {
    super.debitBulk(affordance, litres);
  }
}
