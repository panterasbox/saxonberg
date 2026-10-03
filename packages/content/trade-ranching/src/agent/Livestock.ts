/**
 * Livestock — **one head, drafted out of a herd and standing in front of
 * you.**
 *
 * It is a `Creature` with three things added and nothing else:
 *
 *  - **`HandlingMixin`** (kernel) — how easy it is to work with, which
 *    is D27's honest answer to *what is the individual axis for an
 *    animal that must not have pet-love*, and D46's answer to *what
 *    makes it dangerous*.
 *  - a **back-reference to the register** — its herd and its index,
 *    which together ARE its identity. ⚠ The object is the transient
 *    thing here; the record is what persists.
 *  - **`ProducingMixin`** — the taps, which are what you keep it FOR.
 *  - the **act affordances**, because they belong to the animal you are
 *    standing next to.
 *
 * ⭐ Ownership and chain-of-title are composed HERE — see the
 * `ChattelMixin` note beneath. ⚠ This paragraph used to say it was
 * inherited from `Creature`, which was true until the base-class
 * narrowing moved `Chattel` off the creature base (a person is nobody's
 * property) and onto the two animal rungs. A stolen animal still cannot
 * be sold cleanly (D98); what changed is where the claim lives.
 *
 * ⚠ **Branding is composed HERE, not inherited.** It arrived on
 * `Creature` in the same wave and on the same argument — *branding
 * livestock is what marks were invented for* — but `Creature` is also
 * the base of `Character`, so that line marked every player, Cast
 * member, Extra, ShadeAvatar and corpse in the game as somebody's stock. The
 * base-class narrowing build moved it to where the argument pointed: the
 * kernel's `KeptAnimal` and this class. `Livestock` does not extend
 * `KeptAnimal` — a head of stock is not a pet — so it composes the
 * kernel mixin itself, exactly as it already does with `HandlingMixin`.
 *
 * ⚠ **There is no `Herd` class and there never will be.** The herd is a
 * record; the room's prose describes animals; there is never a
 * herd-object to `look` at.
 */

import { Creature } from '@saxonberg/server/mud/lib/creature/Creature';
import { HandlingMixin } from '@saxonberg/server/mud/lib/husbandry/Handling';
import { ChattelMixin } from '@saxonberg/server/mud/lib/chattel/Chattel';
import { BrandedMixin } from '@saxonberg/server/mud/lib/corpo/Branded';
import { HandledMixin } from '../lib/Handled';
import { ProducingMixin } from '@saxonberg/server/mud/lib/husbandry/Producing';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { WorkDifficulty } from '@saxonberg/server/mud/lib/ground/Workable';
import type { TapClosedReason } from '@saxonberg/server/mud/platform/idea/species/Species';
import { STOCKMANSHIP } from '../idea/cmd/ranching/HandleController';

/**
 * ⭐ **`Perceptible` arrives from `Creature` now, and the argument this
 * class used to carry is why.**
 *
 * It composed `PerceptibleMixin` locally, against a `Creature` that had
 * `Visible` and `Named` but not `Perceptible` — on the reasoning that *a
 * person is addressed by their NAME and an animal by what it is.* The
 * symptom was real: the livestock row authored
 * `keywords: [head, stock, animal, beast]` and every one was **silently
 * discarded**, so `handle beast` said *"that is not an animal you can
 * work with"* about the animal standing in front of you. Found by
 * driving it.
 *
 * ⚠⚠ The diagnosis was half right. The premise — that a person is
 * addressed by name — was the thing to reject: **48 shipped agent rows
 * were authoring `primaryKeyword:` into the same void**, and `look
 * clerk` was broken for every one of them. So `Perceptible` went onto
 * `Creature` (a BODY is addressable) and `Named` came off it (a body is
 * not a somebody), and this local composition became a double
 * declaration. The lesson is the mixin-slate one: ⭐ when a fix needs a
 * guard or a local re-composition, the host is usually wrong one level
 * up.
 */
// ⭐⭐ `ChattelMixin` beside `Branded`, and it came off `Creature` in the
// base-class narrowing for the same reason `Branded` did: the argument
// was about STOCK, and `Creature` is also the base of every player, Cast
// member, Extra, ShadeAvatar and corpse in the game. A head of stock is owned;
// a person is not.
/**
 * Game-days of growth past which a fleece starts losing its quality,
 * expressed as the kilos it would have reached — `perGameDay` × a year.
 */
const PRIME_WOOL_KG = 360 * 0.008;

/** One decimal place — milk is measured, wool is weighed. */
function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

const LivestockBase = ProducingMixin(
  HandledMixin(HandlingMixin(ChattelMixin(BrandedMixin(Creature)))),
);

/**
 * ⭐⭐ **What she is doing, appended to `look`** — in words, with no
 * digit in any of them.
 *
 * This is how AC 8 is met: *going off is visible before it is lost.* A
 * player who looks at a cow is told she is overdue before the lactation
 * is gone, told a hen is sitting tight before they wonder why the nest
 * is empty, and told a fleece carries a weak point months before the
 * shears find it. ⚠ None of that is a number, because a number would
 * turn husbandry into arithmetic and the whole point is that you read
 * the animal.
 *
 * The `Character.bodyAugmenter` shape, and the stockman's own read
 * (`stockmanRead`) stays where it is — that one is `draft`/`return`'s
 * and is a different question (*what is this animal worth*, not *what is
 * it doing*).
 */
function productionAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (host.isDestroyed()) return text;
  if (!MixinApi.isProducing(host)) return text;
  const lines = host.productionRead();
  if (lines.length === 0) return text;
  const block = lines.join(' ');
  return text && text.length > 0 ? `${text}\n\n${block}` : block;
}

export default class Livestock extends LivestockBase {
  static markupAugmenters: MarkupAugmenter[] = [productionAugmenter];

  /**
   * ⭐⭐ **Only the acts that are true of a head of STOCK.**
   *
   * `handle` comes from `HandledMixin` and the three taps come from
   * `ProducingMixin`, because those are things an animal HAS rather than
   * things a class IS — a sheepdog is handled and gives nothing, a milk
   * cow is both. What is left here is the short list that genuinely
   * needs a herd behind it or a carcass in front of it:
   *
   *   - `return` — put it back in the tally it was cut out of;
   *   - `breed`  — the herd's own reproduction;
   *   - `butcher`— it is beef at the end, and that is the unsentimental
   *     fact the design likes. ⚠ A working dog is NOT this, which is the
   *     whole reason the collie stopped being a `Livestock`.
   *
   * ⚠ A row's `commandContributions:` is dead silently — the affordance
   * is a static on a class.
   */
  static commandContributions: CommandContributions = {
    self: [],
    peers: [
      'trade/ranching/cmd/ranching/return.yaml',
      'trade/ranching/cmd/ranching/butcher.yaml',
      'trade/ranching/cmd/ranching/breed.yaml',
      // ⭐ The three tap verbs are back here, and `Producing`'s header
      // says why: a mixin static is still a CLASS answer, and a hive
      // composes `ProducingMixin` too. `Livestock` is the only other
      // composer, so nothing shipped changes — and an animal with no
      // taps still declines exactly as it did, from the controller.
      'trade/ranching/cmd/ranching/milk.yaml',
      'trade/ranching/cmd/ranching/shear.yaml',
      'trade/ranching/cmd/ranching/gather.yaml',
    ],
    environment: [],
  };

  static fieldMeta: FieldMeta = {
    herdId: { persistent: true },
    headIndex: { persistent: true },
  };

  /**
   * The register this head belongs to. ⚠ Empty for an animal that was
   * never in one — a pet, a single milk cow — which is a legal state and
   * not an error: D19's base case is the individual, and the herd is the
   * compression you apply to animals you have stopped looking at.
   */
  public herdId = '';

  /** Its index within that herd — its identity, and it never changes. */
  public headIndex = -1;

  /* ──────────────── the taps, in her own voice ──────────────── */

  /**
   * ⭐⭐ **The animal names the Discipline, and the difficulty.**
   *
   * `WorkResult.credit` is what retires the old `TapController`'s
   * `discipline()` hook: a kernel controller credits `stockmanship`
   * without knowing ranching exists, and ⚠ the difficulty is read off
   * HER at the moment of the act rather than off a counter — milking a
   * half-wild heifer is a hard check and milking a quiet old cow is a
   * standard one, which is the estimator's own anti-grind property doing
   * the work instead of a bespoke guard.
   */
  public override tapCredit(
    _key: string,
  ): { discipline: string; difficulty: WorkDifficulty } | null {
    return {
      discipline: STOCKMANSHIP,
      difficulty: this.getHandling() < 0.35 ? 'hard' : 'standard',
    };
  }

  /**
   * ⚠ Her refusals, not the verb's — and **not one of them carries a
   * digit**, because a shut tap is something you read off the animal
   * rather than a figure you are quoted.
   */
  public override tapRefusal(key: string, reason: TapClosedReason): string {
    if (reason === 'dried-off') {
      return 'She has dried off for this season. Nothing will come of it until she freshens again.';
    }
    if (reason === 'brooding') {
      return 'She is sitting tight on the clutch and will not be shifted. Take the eggs and she will start again.';
    }
    if (key === 'eggs' && reason === 'before-season') {
      return 'The days are too short for laying. There is nothing wrong with the bird.';
    }
    if (key === 'eggs' && reason === 'after-season') {
      return 'The laying season is over. She will come back to it as the days lengthen.';
    }
    return super.tapRefusal(key, reason);
  }

  public override tapEmptyPhrase(key: string): string {
    if (key === 'milk') return 'There is nothing in her yet. Come back later.';
    if (key === 'wool') return 'There is nothing on it worth the shears yet.';
    if (key === 'eggs') return 'Nothing in the nest.';
    return super.tapEmptyPhrase(key);
  }

  public override tapBeginPhrase(key: string): string {
    if (key === 'milk') {
      return 'You set the pail under her, settle in against her flank, and start.';
    }
    if (key === 'wool') {
      return 'You get her off her feet and set to with the shears.';
    }
    if (key === 'eggs') return 'You start feeling under the straw.';
    return super.tapBeginPhrase(key);
  }

  /**
   * What the take came to.
   *
   * ⭐ The numbers stay here — you WEIGH a fleece and you MEASURE milk,
   * so a figure is honest at the moment of the act in a way it never is
   * in a refusal. ⚠ And milk reports **completeness**: a pail too small
   * is the player's own information, and it is the one line in the
   * build that teaches what a vessel is for.
   */
  public override tapTookPhrase(
    key: string,
    drawn: number,
    kept: number,
    minted?: Stuff[],
  ): string {
    if (key === 'milk') {
      if (kept <= 0) {
        return 'She stands for it, and it all goes on the floor — you had nothing to catch it in.';
      }
      if (kept < drawn - 0.05) {
        return `You milk her out and the pail fills before she is done; ${round1(drawn - kept)} litres go on the straw. ${this.handlingPhrase()}.`;
      }
      return `You milk her right out — ${round1(kept)} litres, and she stands for it. ${this.handlingPhrase()}.`;
    }
    if (key === 'wool') {
      // ⚠ How long it has been growing is READ OFF the take, because a
      // continuous tap's standing amount IS its age in growth. No second
      // clock, and no way for the two to disagree.
      const overgrown = drawn > PRIME_WOOL_KG * 1.4;
      return overgrown
        ? `It comes off in one heavy matted piece — ${round1(drawn)} kilos of it, and half of that is second cuts and dung. It should have come off a year ago.`
        : `The fleece comes off clean in a single piece, ${round1(drawn)} kilos, and the animal walks away looking half the size.`;
    }
    if (key === 'eggs') {
      const n = minted?.length ?? 0;
      if (n <= 0) return 'Nothing comes of it.';
      return n === 1
        ? 'You come away with one egg, still warm.'
        : `You come away with ${n} eggs, still warm.`;
    }
    return super.tapTookPhrase(key, drawn, kept, minted);
  }

  public getHerdId(): string {
    return this.herdId;
  }

  public getHeadIndex(): number {
    return this.headIndex;
  }

  /** Bind this object to the record it was drafted out of. */
  public bindToHerd(herdId: string, index: number): void {
    this.herdId = herdId;
    this.headIndex = index;
  }

  /**
   * ⭐ **What a person standing here can see**, in one sentence: the
   * animal's condition and how it takes to being approached, read
   * separately.
   *
   * ⚠ Both are BANDS. A precise body-condition score is palpation of
   * spine and ribs and costs an act (`handle`); by eye you get *thin*,
   * *good*, *fat*, which is exactly what by eye gets you in life.
   */
  public stockmanRead(): string {
    return `${this.bodyConditionPhrase()}; ${this.handlingPhrase()}`;
  }
}
