/**
 * Hive — ⭐⭐ **a colony in a box, and the box is why it is a `Vessel`.**
 *
 * What a winter costs a colony is decided by the wall it is living
 * behind, so the hive needs a volume, an area and a conductivity — which
 * is precisely `AtmosphericMixin`'s envelope arithmetic, the same one the
 * buildings use. A thick-walled box needs less honey than a thin one for
 * no reason other than physics, and the epoch ladder (skep → thin box →
 * thick box) is therefore two numbers on a row.
 *
 * ⚠⚠ **`AtmosphericMixin` is composed HERE, not inherited.** It sat on
 * `Vessel` when this build was planned and the base-class narrowing moved
 * it onto `ExitableVessel` in between, on the argument that *inside is
 * something you can only BE for a vessel you can go into* — thirty-seven
 * rows had claimed their own weather and not one authored a field. A hive
 * is the honest counter-case: you cannot go inside it, and the interior
 * climate is the entire mechanism. So the hive makes the claim itself
 * rather than every bag inheriting it, which is a better arrangement than
 * the plan's and costs three small overrides.
 *
 * It is **not** a `Livestock` (a Creature with a body plan, vitals, flesh
 * and a herd behind it — a colony has none of those) and **not** a
 * `Location` (you do not walk into it). When it is occupied it *is* the
 * colony you keep; when it is not, it is a box, and `getSpecies()`
 * answering `null` is what makes the taps go quiet without a guard.
 */

import { Vessel } from '@saxonberg/server/mud/lib/stuff/Vessel';
import { AtmosphericMixin } from '@saxonberg/server/mud/lib/biome/Atmospheric';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { SealableMixin } from '@saxonberg/server/mud/lib/spatial/Sealable';
import { OrganismMixin } from '@saxonberg/server/mud/lib/species/Organism';
import { HandlingMixin } from '@saxonberg/server/mud/lib/husbandry/Handling';
import { ProducingMixin } from '@saxonberg/content-trade-ranching/src/lib/Producing';
import { HandledMixin } from '@saxonberg/content-trade-ranching/src/lib/Handled';
import type { HandleReport } from '@saxonberg/content-trade-ranching/src/lib/Handled';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { EnclosureDefaults } from '@saxonberg/server/mud/lib/spatial/Enclosed';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type {
  Splittable,
  WorkPrognosis,
  WorkResult,
} from '@saxonberg/server/mud/lib/ground/Workable';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { SWARD_MIXIN } from '@saxonberg/content-trade-farming/src/lib/Sward';
import type Field from '@saxonberg/content-trade-farming/src/location/Field';
import { ColonyMixin, APICULTURE } from '../lib/Colony';
import HiveBox from './HiveBox';

/**
 * ⭐ Composition order, and every step of it is load-bearing:
 *
 *  - `OrganismMixin` INSIDE `ColonyMixin`, because the colony's species
 *    is what its taps and handling range are read from;
 *  - `ProducingMixin` OUTSIDE `ColonyMixin`, so `taps()` sees the
 *    vacant-box `getSpecies()` override and an empty hive accrues nothing;
 *  - `HandledMixin` and `HandlingMixin` side by side, never nested —
 *    nesting factories collapses TypeScript's inference through the chain.
 */
const HiveBase = HandledMixin(
  HandlingMixin(
    ProducingMixin(
      ColonyMixin(
        OrganismMixin(SealableMixin(AtmosphericMixin(DetailedMixin(Vessel)))),
      ),
    ),
  ),
);

/** Metres of wall a hive box has when its row does not say. */
const HIVE_WALL_M = 0.019;

/**
 * How far the forage walk will follow exits before giving up, however
 * cheap the edges are. ⚠ A cap on HOPS as well as on minutes, because a
 * warren of one-minute doorways would otherwise walk the whole realm.
 */
const FORAGE_HOP_CAP = 12;

/** One location's worth of what a colony can work. */
interface ForageCensus {
  /** Clover-equivalent m² of bloom, by the Material or crop it belongs to. */
  sources: Map<string, number>;
  totalM2: number;
  /** How many colonies are working this range, this one included. */
  hives: number;
  /** Flowering plants found, for the pollination push to pay back. */
  flowering: Stuff[];
  /** Game-seconds the census was taken. */
  stamp: number;
}

export default class Hive extends HiveBase implements Splittable {
  /**
   * ⭐ `rob` is the trade's one verb and the hive is what affords it.
   * It does NOT afford `milk` or `shear`: those live on `Livestock`, and
   * a hive offering them so a controller could decline them is the
   * re-narrowing tell.
   */
  static commandContributions: CommandContributions = {
    self: [],
    peers: ['trade/apiculture/cmd/apiculture/rob.yaml'],
    environment: [],
  };

  static fieldMeta: FieldMeta = {
    broodVolumeM3: { persistent: true, authorable: true },
    broodCombKg: { persistent: true, authorable: true },
    superCapacityKg: { persistent: true, authorable: true },
    combDrawn: { persistent: true, authorable: true },
  };

  /** Cubic metres of the brood box itself, before any super. */
  public broodVolumeM3 = 0.045;

  /** Kilograms of comb the brood box holds. */
  public broodCombKg = 8;

  /**
   * ⭐ **How much one `rob` takes** — a box-worth, not everything. This
   * is the number that makes AC 8's choice a choice: you rob again to
   * take more, and you stop to leave them some, and nothing warns you
   * either way.
   */
  public superCapacityKg = 12;

  /**
   * How much comb is drawn out and ready to fill, `[0, 1]`. Crushing
   * takes it away (you destroyed the comb to get the honey); spinning
   * gives it back. That difference IS the choice between the two
   * recipes, expressed as state rather than as a rule.
   */
  public combDrawn = 1;

  // ---------- the box ----------

  /** Every `HiveBox` in the hive — the supers. */
  private boxes(): HiveBox[] {
    const out: HiveBox[] = [];
    for (const item of this.getContents()) {
      if (item instanceof HiveBox) out.push(item);
    }
    return out;
  }

  /**
   * The interior, in m³ — the brood box plus every super in it. ⭐ Supers
   * are ordinary contents, so `put super in hive` is the supering act and
   * there is no verb for it.
   */
  public override getVolume(): Quantity<'m³'> | null {
    let v = this.broodVolumeM3;
    for (const box of this.boxes()) v += box.getVolumeM3();
    return v > 0 ? Quantity.of(v, 'm³') : null;
  }

  /** Kilograms of comb there is room for, brood box plus supers. */
  public combCapacityKg(): number {
    let kg = this.broodCombKg;
    for (const box of this.boxes()) kg += box.getCombCapacityKg();
    return kg;
  }

  /**
   * ⭐ **A hive is made of whatever it is made of**, and the thickness is
   * the wall of a box. A row that authors `enclosure:` wins outright;
   * this is the honest fallback so a hive with no enclosure authored
   * still computes a real winter rather than granite's.
   */
  public override enclosureDefaults(): EnclosureDefaults {
    const material = this.getMaterial();
    const path = material?.getTemplatePath() ?? null;
    if (path === null) return super.enclosureDefaults();
    return { materialPath: path, thicknessM: HIVE_WALL_M };
  }

  // ---------- the stores the colony lives on ----------

  /**
   * ⭐ **The stores ARE the tap.** There is no second honey number: what
   * is standing in the `honey` tap is what the colony has to eat, which
   * is why honey needs no tap-window rule and why robbing in autumn is
   * the same act as taking the winter away.
   */
  protected override storesKg(): number {
    return this.tapState['honey']?.standing ?? 0;
  }

  protected override storesCapacityKg(): number {
    return this.combCapacityKg();
  }

  /** Spend stores: the winter burn, written straight onto the tap. */
  protected override consumeStores(kg: number): void {
    const state = this.tapState['honey'];
    if (!state) return;
    this.tapState = {
      ...this.tapState,
      honey: { ...state, standing: Math.max(0, state.standing - kg) },
    };
  }

  /** What the box leaks, W/K — the envelope arithmetic, unmodified. */
  protected override lossCoefficientWperK(): number {
    return this.envelopeCoefficients()?.uWperK ?? 0;
  }

  // ---------- what it gives ----------

  /**
   * ⭐⭐ **The colony's condition term, and it is not a reserve.**
   *
   * ```
   * factor = strength × forage × (0.5 + 0.5 × combDrawn)
   * ```
   *
   * ⚠ `ProducingMixin`'s default returns **1 flat** for a host with no
   * `flesh` reserve, which would make an empty box a faucet. A `flesh`
   * reserve was rejected rather than added: it would make the colony a
   * body with fat cover, which a colony is not. This is the honest term —
   * how many of them there are, how much there is to work, and whether
   * there is comb to put it in.
   */
  public override productionFactor(): number {
    this.reconcileColony();
    const strength = this.strength;
    if (strength <= 0) return 0;
    const drawn = clamp01(this.combDrawn);
    return clamp01(strength * this.colonyForageFactor() * (0.5 + 0.5 * drawn));
  }

  /**
   * ⭐ **One box-worth per rob**, against the mixin's take-everything.
   * Robbing takes the comb with the honey, so the drawn comb goes too:
   * that is what makes crushing and spinning genuinely different (AC 11)
   * and it is state, not a rule.
   */
  public override takeFrom(key: string): number {
    if (key !== 'honey') return super.takeFrom(key);
    this.reconcileProduction();
    const state = this.tapState['honey'];
    if (!state || state.standing <= 0) return 0;
    const taken = Math.min(state.standing, this.superCapacityKg);
    this.tapState = {
      ...this.tapState,
      honey: {
        ...state,
        standing: state.standing - taken,
        lastTaken: state.lastTaken,
      },
    };
    this.combDrawn = 0;
    return taken;
  }

  // ---------- what goes in it ----------

  /**
   * ⚠ **A hive is not a cupboard.** It takes bees, boxes, frames and
   * comb, and refuses everything else — not out of tidiness but because
   * a hive with a lantern in it is a hive somebody used as a shelf, and
   * the refusal is where the object says what it is for.
   */
  public canAddContainable(thing: Stuff): VetoResult {
    if (MixinApi.hasMixin(thing.constructor as never, 'ColonyMixin' as never)) {
      if (this.strength > 0) {
        return { ok: false, reason: 'There are bees in it already.' };
      }
      return { ok: true };
    }
    if (thing instanceof HiveBox) return { ok: true };
    const path = thing.getTemplatePath() ?? '';
    if (path.startsWith('/trade/apiculture/thing/')) return { ok: true };
    return { ok: false, reason: 'A hive is not a cupboard.' };
  }

  /**
   * ⭐⭐ **Installing a colony is the platform's `put`.** A nucleus you
   * bought, a swarm you caught and a split you made are the same object,
   * and all three go in the same way. The Thing is consumed: the bees are
   * the hive's now, and leaving an empty husk of a nuc behind would be a
   * second object claiming to be the same colony.
   */
  public onContainableAdded(thing: Stuff): void {
    if (MixinApi.hasMixin(thing.constructor as never, 'ColonyMixin' as never)) {
      this.adoptColony(thing);
      return;
    }
    const path = thing.getTemplatePath() ?? '';
    if (path === '/trade/apiculture/thing/drawn-comb') {
      // Spun comb going back in is comb they do not have to draw again.
      this.combDrawn = 1;
      void StuffApi.destruct(thing);
    }
  }

  /** Take the loose colony's state into the box, then consume it. */
  private adoptColony(thing: Stuff): void {
    const loose = thing as unknown as {
      getStrength?(): number;
      hasLiveQueen?(): boolean;
      getPollenKg?(): number;
      getHandling?(): number;
    };
    this.strength = clamp01(loose.getStrength?.() ?? 0);
    this.hasQueen = loose.hasLiveQueen?.() ?? false;
    this.pollenKg = loose.getPollenKg?.() ?? 0;
    this.queenlessSince = this.hasQueen ? 0 : this.nowGameSeconds() ?? 0;
    // `handling` is `HandlingMixin`'s own field, and this is the host
    // writing its own state at install — the temper of the bees you put
    // in is the temper of the hive.
    this.handling = clamp01(loose.getHandling?.() ?? 0.4);
    this.setLifecycleState('alive');
    this._lastEvent = '';
    this.starvingSince = 0;
    void StuffApi.destruct(thing);
  }

  // ---------- the lid ----------

  /**
   * ⭐ **Opening a hive is the platform's `open`, and the bees answer.**
   *
   * ⚠ Hydration goes through `setOpen`, not `open()`, so a hive that was
   * left open before a restart does not sting whoever logs in next.
   */
  public override open(): void {
    super.open();
    const actor = ExecutionContextApi.getActingAuthor() as Stuff | null;
    if (!actor) return;
    const report = this.disturb(actor);
    if (!report.prelude) return;
    MessageApi.scene(actor)
      .toSelf(report.prelude.self)
      .toPeers(report.prelude.peers)
      .send();
  }

  // ---------- what your hands tell you ----------

  /**
   * ⭐⭐ **The reading is BANDS, all the way down — and that is AC 2.**
   *
   * A hive gives you no number and there is nothing to palpate. What you
   * get is what a beekeeper actually gets: the traffic at the door, the
   * heft of the box when you tip it, whether there is brood in a tight
   * pattern, the temper, and whether anything has happened since last
   * time. `HandledMixin`'s default — a flesh score out of a hundred and a
   * hand down the spine — is true of a mammal and false of this, which
   * is exactly why the act moved onto the animal.
   */
  public override workedOver(actor: Stuff): HandleReport {
    const sting = this.disturb(actor);
    const strength = this.getStrength();
    const traffic =
      strength <= 0
        ? 'Nothing at the door at all.'
        : strength < 0.25
          ? 'A trickle at the door, and not much of one.'
          : strength < 0.6
            ? 'Steady traffic in and out of the entrance.'
            : 'Bees stacked up on the board, coming and going three deep.';
    const fill = this.combCapacityKg() > 0
      ? this.storesKg() / this.combCapacityKg()
      : 0;
    const heft =
      fill < 0.15
        ? 'It lifts like an empty box.'
        : fill < 0.5
          ? 'Heavier than it looks.'
          : fill < 0.85
            ? 'You can only just tip it.'
            : 'You cannot shift it; it is full to the walls.';
    const brood =
      strength <= 0
        ? ''
        : this.hasLiveQueen()
          ? strength > 0.5
            ? ' Brood in a tight pattern across the middle frames.'
            : ' Brood, but spotty.'
          : ' No brood, and no queen to be found.';
    const event = this.eventPhrase();
    this.handle(1);
    return {
      prelude: sting.prelude,
      self: Mml.compose`${traffic} ${heft}${brood} ${this.handlingPhrase()}.${event}${this.crowdingPhrase()}`,
      peers: Mml.compose`${Mml.actor(actor)} works quietly over an open hive.`,
      difficulty: this.getHandling() < 0.35 ? 'hard' : 'standard',
      discipline: APICULTURE,
    };
  }

  /** What has happened to this colony lately, in one sentence. */
  private eventPhrase(): string {
    switch (this.getLastEvent()) {
      case 'swarmed':
        return ' They have swarmed — half of them are gone.';
      case 'absconded':
        return ' They have gone. The box is empty and there is nothing dead in it.';
      case 'starved':
        return ' They starved. What is left is a floor of dead bees.';
      case 'requeened':
        return ' There is a new queen laying.';
      default:
        return '';
    }
  }

  /**
   * ⭐ What a frame pulled out of THIS hive shows — the one sentence
   * `Frame` exists for. *Comb tells you brood.*
   */
  public frameReading(): string {
    this.reconcileColony();
    if (this.strength <= 0) {
      return 'The comb on it is old and empty, and there is nothing working it.';
    }
    const fill = this.combCapacityKg() > 0
      ? this.storesKg() / this.combCapacityKg()
      : 0;
    if (this.hasQueen && this.strength > 0.4 && fill < 0.6) {
      return 'Brood across the middle of it in a tight oval, with a rim of stores above.';
    }
    if (fill >= 0.6) {
      return 'Capped over corner to corner, pale wax, heavy as a paving slab.';
    }
    if (!this.hasQueen) {
      return 'Bees on it, but no eggs and no grubs anywhere in the cells.';
    }
    return 'Drawn comb, patchy, with bees working at the edges of it.';
  }

  // ---------- splitting ----------

  /**
   * ⭐⭐ **A split is the platform's `split`, and it rides with no
   * registration at all.**
   *
   * `Splittable`'s mandate is *divide an oversized or aggregated thing
   * into usable units*, and a strong colony is exactly that: too much of
   * it in one box, and making two is what a beekeeper does with it
   * instead of losing half to the woods. `SplitController` duck-types
   * the shape, so this is three methods and no wiring — which is the
   * `Verbable` pattern doing its job rather than a `handle`-style
   * collision to resolve.
   *
   * ⚠ It is the only acquisition that costs you something you already
   * have (AC 1's third cost): the parent goes back to 60 % and the
   * daughter has no queen until she raises one.
   */
  public readonly splittable = true as const;

  public async planWork(
    by: Stuff,
    tool: (Stuff & Tooled) | null,
    what: string | null,
  ): Promise<WorkPrognosis> {
    void tool;
    void what;
    this.reconcileColony();
    if (this.strength <= 0) {
      return {
        kind: 'refusal',
        reason: 'no-colony',
        prose: 'There are no bees in it to divide.',
      };
    }
    if (!this.hasQueen) {
      return {
        kind: 'refusal',
        reason: 'no-queen',
        prose:
          'They have no queen as it is. Splitting them would leave you two ' +
          'halves of nothing.',
      };
    }
    if (this.strength < 0.6) {
      return {
        kind: 'refusal',
        reason: 'too-weak',
        prose: 'There is not enough of them to make two.',
      };
    }
    void by;
    return {
      kind: 'plan',
      durationMs: 20 * 60 * 1000,
      cost: 6,
      beginSelf:
        'You start going through the frames, looking for brood and eggs to ' +
        'take across.',
      beginPeers: 'Somebody is working slowly through an open hive.',
      token: 'split',
    };
  }

  public async completeWork(
    by: Stuff,
    tool: (Stuff & Tooled) | null,
    token: unknown,
  ): Promise<WorkResult> {
    void tool;
    if (token !== 'split') {
      return { self: 'Nothing came of it.', peers: null, credit: null };
    }
    this.reconcileColony();
    const taken = this.strength * 0.4;
    if (taken <= 0) {
      return { self: 'There are no bees in it to divide.', peers: null };
    }
    this.strength = this.strength * 0.6;
    let made: Stuff | null = null;
    try {
      made = await StuffApi.clone<Stuff>('/trade/apiculture/thing/nuc');
    } catch {
      made = null;
    }
    if (made) {
      const half = made as unknown as {
        strength?: number;
        hasQueen?: boolean;
        queenlessSince?: number;
      };
      half.strength = taken;
      // ⚠ NO queen. They raise their own in three weeks, which is the
      // real cost of a split and the reason it is not free bees.
      half.hasQueen = false;
      half.queenlessSince = this.nowGameSeconds() ?? 0;
      if (MixinApi.isContainer(by)) {
        ContainmentApi.move(
          made as Stuff & Containable,
          by as Stuff & Container,
        );
      }
    }
    return {
      self:
        'You lift four frames of brood and bees across into a box of their ' +
        'own. They have no queen; they will have to make one.',
      peers: 'Somebody divides a hive into two.',
      credit: { discipline: APICULTURE, difficulty: 'standard' },
    };
  }

  // ---------- the range ----------

  /** The last census, or `null`. Recomputed when it goes stale. */
  private _forage: ForageCensus | null = null;

  /**
   * ⭐⭐ **What this colony can actually find, and it is a read of the
   * LANDSCAPE rather than a number on the hive.**
   *
   * A bounded breadth-first walk **over exits**, not containers: bees fly
   * out of a hive and across the ground, so the walk is the one a
   * traveller makes, priced in minutes, stopping at about an hour's
   * flight. Every read on it is sync — this runs inside
   * `reconcileColony`, which must never await.
   *
   * What it counts, in clover-equivalent square metres:
   *
   *   - a **sward** contributes `inFlowerFraction() × swardAreaM2()`,
   *     which is the field's own answer (the sward knows when it blooms;
   *     the hive asks);
   *   - every **flowering plant** contributes a flat patch's worth,
   *     including the plants seated in a bed one level down;
   *   - and it counts **every colony on the range, itself included**,
   *     which is the whole of crowding (AC 13): nobody is told, nothing
   *     adjudicates, and the second beekeeper finds out by looking at
   *     their own bees.
   *
   * ⚠ An exit whose destination does not resolve is not an edge. A
   * deferred destination, a reaped room and a broken clone must not take
   * a colony's forage down with them.
   */
  public forageCensus(): ForageCensus {
    const nowS = this.nowGameSeconds();
    const fresh = this._forage;
    if (fresh && nowS !== null && nowS - fresh.stamp < 3600) return fresh;

    const sources = new Map<string, number>();
    const flowering: Stuff[] = [];
    let hives = 0;
    const perPlant = this.dial('apiculture.bloomM2PerPlant', 6);
    const rangeMinutes = this.dial('apiculture.forageRangeMinutes', 40);
    const defaultEdge = this.dial('apiculture.defaultEdgeMinutes', 5);

    const start = (this as unknown as Stuff & Containable).getContainer();
    const visited = new Set<Stuff>();
    const queue: Array<{ at: Stuff; minutes: number }> = [];
    if (start !== null) queue.push({ at: start, minutes: 0 });

    let hops = 0;
    while (queue.length > 0 && hops < FORAGE_HOP_CAP) {
      const step = queue.shift();
      if (!step) break;
      const { at, minutes } = step;
      if (visited.has(at)) continue;
      visited.add(at);
      hops += 1;

      // The sward under this patch of ground.
      if (MixinApi.hasMixin(at.constructor as never, SWARD_MIXIN as never)) {
        const field = at as unknown as Field;
        const m2 = field.inFlowerFraction() * field.swardAreaM2();
        if (m2 > 0) {
          const key = '/trade/apiculture/idea/material/clover-nectar';
          sources.set(key, (sources.get(key) ?? 0) + m2);
        }
      }

      if (MixinApi.isContainer(at)) {
        for (const item of at.getContents()) {
          this.countBloom(item, sources, flowering, perPlant);
          // One level into a bed: a plant seated in a garden bed is a
          // content of a content, and a bee does not care.
          if (MixinApi.isCultivable(item)) {
            for (const plant of item.getPlants()) {
              this.countBloom(
                plant as unknown as Stuff,
                sources,
                flowering,
                perPlant,
              );
            }
          }
          if (
            MixinApi.hasMixin(item.constructor as never, 'ColonyMixin' as never)
          ) {
            const other = item as unknown as { getStrength?(): number };
            if ((other.getStrength?.() ?? 0) > 0) hives += 1;
          }
        }
      }

      if (minutes >= rangeMinutes) continue;
      if (!MixinApi.isExitable(at)) continue;
      for (const exit of at.getObviousExits()) {
        let dest: Stuff | null = null;
        try {
          dest = exit.getDestination() as unknown as Stuff | null;
        } catch {
          continue;
        }
        if (dest === null || visited.has(dest)) continue;
        const cost = exit.getEdgeMinutes() ?? defaultEdge;
        const next = minutes + (cost > 0 ? cost : defaultEdge);
        if (next > rangeMinutes) continue;
        queue.push({ at: dest, minutes: next });
      }
    }

    let totalM2 = 0;
    for (const v of sources.values()) totalM2 += v;
    const census: ForageCensus = {
      sources,
      totalM2,
      hives: Math.max(1, hives),
      flowering,
      stamp: nowS ?? 0,
    };
    this._forage = census;
    return census;
  }

  /** Add one flowering plant's patch to the census, if it is in flower. */
  private countBloom(
    item: Stuff,
    sources: Map<string, number>,
    flowering: Stuff[],
    perPlant: number,
  ): void {
    if (!MixinApi.isGrowing(item)) return;
    let inFlower = false;
    try {
      inFlower = item.isFlowering();
    } catch {
      return;
    }
    if (!inFlower) return;
    flowering.push(item);
    // ⭐ The crop's own template is the key, resolved to its material at
    // rob time — so cherry-blossom honey is cherry-blossom honey with no
    // row written about bees anywhere in trade-farming.
    const key = item.getHarvestTemplatePath() ?? 'bloom';
    sources.set(key, (sources.get(key) ?? 0) + perPlant);
  }

  /**
   * ⭐⭐ **How good the forage is, and it is a SHARE rather than a total.**
   *
   * `totalM2 / (perHive × hives)` — so two hives on one valley's bloom
   * each get half a living, and nothing anywhere tells either keeper
   * that. That is AC 13: the lesson is that a range is finite and
   * somebody else is on it, and a gauge saying *"forage 47 %"* would
   * replace the lesson with a number.
   */
  protected override colonyForageFactor(): number {
    const census = this.forageCensus();
    const perHive = this.dial('apiculture.forageM2PerHive', 600);
    if (perHive <= 0) return 0;
    return clamp01(census.totalM2 / (perHive * census.hives));
  }

  /**
   * ⭐⭐ **The hive pays the land back, and asks nobody's permission.**
   *
   * Every flowering plant on the range gets pollinated in proportion to
   * how long the window was and how well the colony is doing. The plant
   * does not know bees exist — it exposes `pollinate(share)` and this is
   * the thing that pushes — so a grower whose trees set a full crop
   * benefits from a keeper who put a box over the wall, and neither of
   * them had to agree to anything. That asymmetry IS the trade.
   */
  protected override repayForage(days: number): void {
    if (days <= 0) return;
    const census = this.forageCensus();
    if (census.flowering.length === 0) return;
    const share =
      this.dial('apiculture.pollinationPerHiveDay', 0.08) *
      days *
      this.colonyForageFactor();
    if (!(share > 0)) return;
    for (const plant of census.flowering) {
      if (!MixinApi.isGrowing(plant)) continue;
      try {
        plant.pollinate(share);
      } catch {
        // A plant that refuses a push is a plant; it is not an error.
      }
    }
  }

  /**
   * ⭐⭐ **What a crowded range feels like — in words, with no number and
   * no appeal.** The second beekeeper in the valley finds out that
   * somebody else's bees are on the same bloom, and nothing adjudicates
   * it: that is the lesson (AC 13), and a gauge would delete it.
   */
  protected crowdingPhrase(): string {
    const census = this.forageCensus();
    const perHive = this.dial('apiculture.forageM2PerHive', 600);
    if (census.hives <= 1) return '';
    if (census.totalM2 >= perHive * census.hives) return '';
    return (
      ' And bees from another stand are working the same bloom — the flow ' +
      'is thinner than the flowers would give one hive.'
    );
  }

  /**
   * ⭐ What the bees brought in, as Material paths against their share.
   * `RobController` stamps this onto every frame of comb it mints, and
   * the recipes carry it into the jar — so honey tastes of where it came
   * from with nothing authored about any particular honey.
   */
  public forageComposition(): Array<{ path: string; share: number }> {
    const census = this.forageCensus();
    if (census.totalM2 <= 0) return [];
    const out: Array<{ path: string; share: number }> = [];
    for (const [path, m2] of census.sources) {
      out.push({ path, share: m2 / census.totalM2 });
    }
    return out;
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
