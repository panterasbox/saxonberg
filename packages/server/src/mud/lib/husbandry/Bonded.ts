/**
 * Bonded — ⭐⭐ **an animal that can be won over, and whose opinion of you
 * is its own.**
 *
 * The bond is not a new number. It is the product of two things that
 * already shipped, and saying so is the whole design:
 *
 * ```
 *   bondWith(you) = (its REGARD for you / 100) × its HANDLING
 *                    └ the belief store ┘        └ the temperament axis ┘
 * ```
 *
 * ⭐ **Regard is the memory of you; handling is how tractable it is.**
 * Regard does *not* decay — an animal that loved you remembers it — and
 * handling does, to a species floor. So an animal you abandon and come
 * back to has not forgotten you and is *harder to work with*: **it
 * becomes difficult, not feral.** That asymmetry is why cooling needed no
 * mechanism of its own; it was already in the tree, in the right shape,
 * on the wrong side of an unbuilt bond.
 *
 * ⚠ **It requires `BeliefStoreMixin` and `HandlingMixin` beneath it**,
 * composed as SIBLINGS on the same host and never nested inside each
 * other (the `Handled`/`Handling` lesson: nesting one mixin in another
 * makes the inner one's absence a type error at a site that cannot
 * explain itself). It narrows to both with `MixinApi` inside, so a host
 * that composes it without them degrades to "no bond" rather than
 * throwing.
 *
 * ⚠⚠ **Not on `Creature`.** A wolf must be able to *not apply*: the
 * species dials are nullable precisely so that "not in this conversation"
 * is a state an author can express, and putting the bond on every body
 * would make every body bondable and the dials decorative.
 *
 * What it adds beyond the arithmetic: where home is and how home moves
 * (a place identity, three fed days), whether it is waiting where you
 * left it, who it has followed home, the five verbs it affords, and the
 * bearing line a viewer reads on `look`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import type { MarkupAugmenter } from '../../api/mml';
import type { CommandContributions } from '../../api/command';
import { BulkableApi } from '../../api/bulk';
import { StuffApi } from '../../api/stuff';
import { METABOLIC_DEFAULTS } from '../metabolism/Metabolic';

/**
 * ⭐ The dials, as documented module constants rather than fields.
 *
 * They are the build's opinion about pacing, not the author's about a
 * species — the species dials (`handlingRange`, `biddability`) are the
 * per-animal knobs, and these are the shape of the curve they ride.
 * Promoting one to a field is how a slate turns into a settings sprawl.
 */
/** Handling band at or above which a hand is permitted at all. */
export const TOUCH_BAND = 'wary';
/** Bond at or above which an animal will follow you out of a room. */
export const FOLLOW_BOND = 0.5;
/** Bond at or above which an animal may be named — it has chosen you. */
export const NAME_BOND = 0.6;
/** Regard credited for a welcome hand. */
export const PET_REGARD = 6;
/** Regard credited for food taken from the hand — the strongest ordinary act. */
export const HAND_FEED_REGARD = 10;
/**
 * ⚠ Regard charged when food from your hand made it ill. Nearly three
 * times what feeding earns: trust is cheaper to lose than to build, and
 * an animal has no way to know you did not mean it.
 */
export const ILL_FROM_HAND_REGARD = -25;
/**
 * ⭐ Food from a bowl credits NOBODY. Filling a dish is care and it keeps
 * the animal alive and it moves where home is — but it is not a
 * relationship, and an animal cannot tell whose hand filled it. The one
 * thing you cannot delegate is attention.
 */
export const FEEDER_REGARD = 0;
/** Distinct game days of feeding in one room before home moves there. */
export const HOME_DAYS = 3;
/**
 * Satiation at or above which an animal is in surplus and turns food
 * down. Mirrors `METABOLIC_DEFAULTS.FLESH_SURPLUS_AT` — the level above
 * which intake is genuinely surplus rather than maintenance.
 */
export const SURPLUS_SATIATION = 70;
/** One mouthful, shared with the `eat` verb so a meal is a meal. */
const EAT_PORTION_LITRES = METABOLIC_DEFAULTS.EAT_PORTION_LITRES;

/**
 * ⭐⭐ **How keen a nose has to be to catch what is wrong with food.**
 *
 * Contaminated food is the SILENT population: nothing renders it,
 * nothing smells of it to a person, and a spoiled thing and a poisoned
 * thing look identical. An animal's nose is the one instrument in the
 * game that reads it — and only some animals, only some of the time.
 *
 * ⚠ `dull` never catches it, at any load. That is the design: a dog
 * eating something that will hurt it is a thing that happens, and the
 * refusal and the acceptance must be indistinguishable to the person
 * holding it out. **You never learn whether it refused because it
 * wasn't hungry or because it knew.**
 */
const NOSE_THRESHOLD: Record<string, number | null> = {
  keen: 0.1,
  normal: 0.35,
  dull: null,
  none: null,
};

/**
 * Why an animal did not eat. ⚠ Every one of these renders as the SAME
 * behaviour to the player — the reason is for the code, never the prose.
 */
export type FoodRefusal = 'not-edible' | 'not-hungry' | 'turned' | 'sensed-bad';

/** The three sentences an animal's bearing says toward the viewer. */
const BOND_PHRASE = {
  off: 'It moves off as you look at it.',
  holds: 'It holds its ground and watches you.',
  comes: 'It comes to you.',
} as const;

/**
 * The bearing line: how this animal is with people, and how it is with
 * YOU. ⭐ Band words and no number — a keeper reads an animal, they do
 * not read a stat, and the second sentence is per-viewer because the
 * whole point is that it feels differently about different people.
 */
function bondAugmenter(text: string, host: Stuff, viewer: Stuff): string {
  if (!MixinApi.isBonded(host) || host.isDestroyed()) return text;
  const lines: string[] = [];
  if (MixinApi.isHandling(host)) lines.push(host.handlingPhrase());
  if (viewer) {
    const bond = host.bondWith(viewer);
    lines.push(
      bond >= FOLLOW_BOND
        ? BOND_PHRASE.comes
        : bond >= 0.15
          ? BOND_PHRASE.holds
          : BOND_PHRASE.off,
    );
  }
  if (!lines.length) return text;
  const line = lines.join(' ');
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

export interface Bonded {
  /** `[0,1]` — regard × handling. See the class doc. */
  bondWith(person: Stuff): number;
  /** Would it do what `person` asks? Deterministic; never a roll. */
  wouldComply(person: Stuff): boolean;
  /** Where it goes when nobody is keeping it — a place identity. */
  getHome(): string;
  setHome(value: string): void;
  /** Is it holding position where it was told to? */
  isWaiting(): boolean;
  setWaiting(value: boolean): void;
  /** Identity paths of people it has followed home at least once. */
  getFollowedKeys(): readonly string[];
  /** Record that `person` was followed home — the naming gate. */
  rememberFollowed(person: Stuff): void;
  /** Credit a meal eaten in `placeId` toward moving home there. */
  creditHomeCandidate(placeId: string, gameDay: number): void;
  /** Why it would not eat `food`, or `null` if it would. */
  wouldEat(food: Stuff): FoodRefusal | null;
  /** Eat it. Credits `offerer` when it came from a hand. */
  eatFood(food: Stuff, offerer: Stuff | null): Promise<boolean>;
}

export function BondedMixin<TBase extends MixinConstructor>(Base: TBase) {
  class BondedMixin extends Base implements Bonded {
    static _mixinName = 'BondedMixin';

    /** The bearing line a viewer reads on `look`. */
    static markupAugmenters: MarkupAugmenter[] = [bondAugmenter];

    /**
     * ⭐⭐ The verbs are afforded by the ANIMAL, to whoever is standing
     * beside it — a static on the mixin, so `KeptAnimal` and ranching's
     * `WorkingAnimal` both confer them and neither shadows the other.
     * ⚠ A row's `commandContributions:` is dead silently; this is the
     * live seam.
     */
    static commandContributions: CommandContributions = {
      peers: [
        'platform/cmd/social/pet.yaml',
        'platform/cmd/social/call.yaml',
        'platform/cmd/social/stay.yaml',
        'platform/cmd/social/name.yaml',
        'platform/cmd/inventory/offer.yaml',
      ],
    };

    static fieldMeta: FieldMeta = {
      home: { persistent: true, authorable: true },
      waiting: { persistent: true },
      followedKeys: { persistent: true },
      homeCandidate: { persistent: true },
      homeCandidateDays: { persistent: true },
      homeCandidateLastDay: { persistent: true },
    };

    /** Where it returns to. A `PersistableApi.placeIdOf` string. */
    public home = '';
    /** Told to stay: `follows` and `homes` both honour it. */
    public waiting = false;
    /** Who it has followed home — the gate on being allowed to name it. */
    public followedKeys: string[] = [];
    /** The room it is being fed in, and how many distinct days so far. */
    public homeCandidate = '';
    public homeCandidateDays = 0;
    public homeCandidateLastDay = -1;

    public bondWith(person: Stuff): number {
      const self = this as unknown as Stuff;
      if (!person) return 0;
      if (!MixinApi.isBeliefStore(self) || !MixinApi.isHandling(self)) return 0;
      const regard = self.regardFor(person);
      // ⚠ Only affection counts toward a bond. An animal that dislikes
      // you is not "negatively bonded" — it is unbonded, and the verbs
      // that gate on the bond must refuse identically either way.
      const affection = regard <= 0 ? 0 : Math.min(1, regard / 100);
      return affection * self.getHandling();
    }

    /**
     * ⭐ Deterministic, and that is a rule rather than a convenience:
     * `docs/uncertainty.md` bans **resolutional** randomness — you may
     * roll to decide what the world IS, never what your action DID. If
     * calling the cat were a dice roll, the player would learn nothing
     * about the cat by calling it.
     *
     * A cat at `biddability 0.1` never reaches the threshold however
     * devoted it is; a collie at `0.9` complies once well bonded. ⚠ A
     * species that declares no biddability is not askable at all —
     * absent is *not in this conversation*, not "average".
     */
    public wouldComply(person: Stuff): boolean {
      const self = this as unknown as Stuff;
      if (!MixinApi.isOrganism(self)) return false;
      const biddability = self.getSpecies()?.getBiddability();
      if (biddability === null || biddability === undefined) return false;
      return biddability * this.bondWith(person) >= 0.5;
    }

    public getHome(): string {
      return this.home;
    }
    public setHome(value: string): void {
      this.home = value;
    }
    public isWaiting(): boolean {
      return this.waiting;
    }
    public setWaiting(value: boolean): void {
      this.waiting = value;
    }
    public getFollowedKeys(): readonly string[] {
      return this.followedKeys;
    }

    public rememberFollowed(person: Stuff): void {
      const key = person.getIdentityPath();
      if (!key || this.followedKeys.includes(key)) return;
      this.followedKeys = [...this.followedKeys, key];
    }

    /**
     * ⭐ **Home moves where it is fed and kept** — three *distinct* game
     * days in one place, not three meals. You cannot move an animal's
     * home by standing there with a sack; you move it by being where it
     * lives, for days.
     */
    public creditHomeCandidate(placeId: string, gameDay: number): void {
      if (!placeId) return;
      if (this.homeCandidate !== placeId) {
        this.homeCandidate = placeId;
        this.homeCandidateDays = 1;
        this.homeCandidateLastDay = gameDay;
        return;
      }
      if (gameDay === this.homeCandidateLastDay) return;
      this.homeCandidateLastDay = gameDay;
      this.homeCandidateDays += 1;
      if (this.homeCandidateDays >= HOME_DAYS) {
        this.home = placeId;
        this.homeCandidate = '';
        this.homeCandidateDays = 0;
        this.homeCandidateLastDay = -1;
      }
    }

    /**
     * ⭐⭐ **Whether this animal will eat that, and why not.**
     *
     * Lives on the animal because the decision is the animal's, and
     * because the verb (`offer`) and the beat (`feeds`) must reach the
     * identical answer — a hand-fed scrap and a bowl-fed one are refused
     * on exactly the same terms, or the player learns to launder food
     * through a dish.
     *
     * Four refusals, in the order a body applies them:
     *
     *  1. **not edible** — no material, or a material nothing eats;
     *  2. **not hungry** — it is in surplus, and an animal in surplus
     *     sniffs and walks off;
     *  3. **turned** — the spoilage band is past `fresh`. This one it
     *     can smell, and so can you;
     *  4. **sensed bad** — the SILENT population, caught only by a nose
     *     keen enough. ⚠ And the refusal sentence is the same as (2)
     *     and (3), so the animal never tells you what it knows.
     */
    public wouldEat(food: Stuff): FoodRefusal | null {
      const self = this as unknown as Stuff;
      const material = MixinApi.isTangible(food) ? food.getMaterial() : null;
      if (!material || material.getEdibility() !== true) return 'not-edible';

      if (MixinApi.isReserved(self)) {
        // ⚠ The surplus line, not "full": an animal in maintenance is
        // eating what it needs and will still take a scrap. Refusing at
        // anything less would make a well-kept animal untreatable.
        const satiation = self.getReserve('satiation');
        if (satiation && satiation.current.rawValue() >= SURPLUS_SATIATION) {
          return 'not-hungry';
        }
      }

      if (MixinApi.isFresh(food) && food.getFreshnessBand() !== 'fresh') {
        return 'turned';
      }

      if (MixinApi.isContaminable(food) && MixinApi.isOrganism(self)) {
        const acuity =
          self.getSpecies()?.getOlfactoryProfile()?.acuity ?? 'normal';
        const threshold = NOSE_THRESHOLD[acuity] ?? null;
        if (threshold !== null) {
          const loads = Object.values(food.getPathogenLoads());
          if (loads.some((v) => (v ?? 0) > threshold)) return 'sensed-bad';
        }
      }
      return null;
    }

    /**
     * ⭐⭐ **Eat it — and decide what that was worth to whoever offered.**
     *
     * The ingest goes through the same bridge a person's meal does
     * (`Fresh.ingestPayload`), so an animal is poisoned by identical
     * arithmetic and harm from a meal names the same maker.
     *
     * ⭐ **The regard arithmetic is the design in three constants.**
     * Food from a HAND is the strongest ordinary act there is
     * (`HAND_FEED_REGARD`). Food from a BOWL credits **nobody**
     * (`FEEDER_REGARD = 0`) — filling a dish is care, it keeps the
     * animal alive, it moves where home is, and it is not a
     * relationship, because an animal cannot tell whose hand filled it.
     * *The one thing you cannot delegate is attention.*
     *
     * ⚠ And food from your hand that made it ill costs nearly three
     * times what feeding earns. Trust is cheaper to lose than to build,
     * and the animal has no way to know you did not mean it.
     */
    public async eatFood(food: Stuff, offerer: Stuff | null): Promise<boolean> {
      const self = this as unknown as Stuff;
      const material = MixinApi.isTangible(food) ? food.getMaterial() : null;
      if (!material) return false;
      const payload = MixinApi.isFresh(food) ? food.ingestPayload() : null;
      const accepted = BulkableApi.ingestSolid(
        self,
        material,
        EAT_PORTION_LITRES,
        payload,
      );
      if (accepted < EAT_PORTION_LITRES - 1e-9) return false;

      if (offerer && MixinApi.isBeliefStore(self)) {
        // ⚠ Whether it HARMS is read from the food, before it is gone.
        const harmful =
          MixinApi.isContaminable(food) &&
          Object.values(food.getPathogenLoads()).some((v) => (v ?? 0) > 0);
        self.adjustRegard(
          offerer,
          harmful ? ILL_FROM_HAND_REGARD : HAND_FEED_REGARD,
        );
        if (MixinApi.isHandling(self)) self.handle(0.5);
      }
      await StuffApi.destruct(food);
      return true;
    }

    /**
     * ⚠ A named animal is not a cold object. Residency evicts a quiet
     * tail; an animal somebody owns and has named is exactly the thing
     * that must still be standing where they left it.
     */
    public canEvict(): boolean {
      const self = this as unknown as Stuff;
      const stamped = MixinApi.isChattel(self) && self.isStamped();
      const alive = MixinApi.isOrganism(self)
        ? self.getLifecycleState() !== 'dead'
        : true;
      return !(stamped && alive);
    }
  }
  return BondedMixin;
}
