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
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { WorkDifficulty } from '@saxonberg/server/mud/lib/ground/Workable';
import type { TapLanded } from '@saxonberg/server/mud/lib/husbandry/Producing';
import type { Bulkable } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import { STOCKMANSHIP } from '../idea/cmd/ranching/HandleController';
import Tract from '@saxonberg/content-trade-farming/src/location/Tract';
import { HeadSeed } from '../lib/HeadSeed';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type HerdRegistry from '../idea/HerdRegistry';
import { DEFAULT_FEMALE_FRACTION } from '../idea/HerdRegistry';

/** The register this head was drafted out of (the Herdbook's own constant). */
const HERD_REGISTRY_PATH = '/trade/ranching/idea/HerdRegistry';

/** Why she cannot be put to the male — the animal's own refusals. */
export type BreedRefusal = 'not-female' | 'no-male';

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
      // ⭐ `slaughter`, not `butcher`. Killing and dressing are two acts
      // and the corpse is the join: the kitchen's `butcher` takes the
      // body apart, wherever and however it died.
      'trade/ranching/cmd/ranching/slaughter.yaml',
      'trade/ranching/cmd/ranching/breed.yaml',
      // ⭐ The three tap verbs are back here, and `Producing`'s header
      // says why: a mixin static is still a CLASS answer, and a hive
      // composes `ProducingMixin` too. `Livestock` is the only other
      // composer, so nothing shipped changes — and an animal with no
      // taps still declines exactly as it did, from the controller.
      'trade/ranching/cmd/ranching/milk.yaml',
      'trade/ranching/cmd/ranching/shear.yaml',
      'trade/ranching/cmd/ranching/gather.yaml',
      // ⭐ Moving the herd is afforded BESIDE one of its animals as well
      // as at the book (cover build D13, R3): a field is farming's and
      // must not name a ranching view, so a keeper standing in a field
      // moves the herd through a head of it.
      'trade/ranching/cmd/ranching/move.yaml',
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
   * The credit on the landing's facts is what retires the old `TapController`'s
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
   * The take, and what the shears read off it.
   *
   * ⭐ How long a fleece has been growing is READ OFF the take, because a
   * continuous tap's standing amount IS its age in growth. No second clock,
   * and no way for the two to disagree. The words are the verb's
   * (`LivestockTapController`).
   */
  public override async completeTap(
    by: Stuff,
    key: string,
    vessel: (Stuff & Bulkable) | null,
  ): Promise<TapLanded> {
    const out = await super.completeTap(by, key, vessel);
    if (out.ok && out.facts.kind === 'drawn' && key === 'wool' && out.facts.drawn > PRIME_WOOL_KG * 1.4) {
      return { ok: true, facts: { ...out.facts, overgrown: true } };
    }
    return out;
  }

  public getHerdId(): string {
    return this.herdId;
  }

  public getHeadIndex(): number {
    return this.headIndex;
  }

  /**
   * ⭐ **A head on its herd's field eats what the field gives the herd**
   * (cover build D10b): its flesh moves on the herd's fed fraction times
   * its own seeded tail — the same rule the tally follows at the draft
   * (`HeadSeed.conditionAfter`), so a head drafted and a head left in
   * the book thin together. Anywhere else it is fed or not by the
   * shipped path (a bowl, a hand, nothing).
   *
   * ⚠ Only a head of stock grazes the field it stands in — never a pet
   * (fed from a bowl) and never a creature in general.
   */
  protected override partitionFlesh(stepMin: number): void {
    const fed = this.grazedFraction();
    if (fed === null) {
      super.partitionFlesh(stepMin);
      return;
    }
    if (!this.hasReserve('flesh')) return;
    const own = fed * HeadSeed.tailFactor(HeadSeed.frameOf(this.herdId, this.headIndex));
    const delta = HeadSeed.fleshRatePerMin(own) * stepMin;
    if (delta !== 0) this.adjustReserve('flesh', Quantity.of(delta, '%'));
  }

  /**
   * The herd's fed fraction on the field this head is standing in, or
   * `null` when it is not standing on a field its herd grazes. A window
   * that has only just opened reads as fed — nothing has gone short yet.
   */
  private grazedFraction(): number | null {
    if (!this.herdId) return null;
    const here = this.getContainer();
    if (!(here instanceof Tract)) return null;
    // ⭐ The herd's line is on one of the tract's FIELDS (tracts build D34).
    const line = here
      .getFields()
      .map((f) => f.grazerLedger(this.herdId))
      .find((l) => l !== null);
    if (!line) return null;
    return line.demandKg > 0 ? Math.min(1, line.fedKg / line.demandKg) : 1;
  }

  /**
   * ⭐ May `by` cull this head? A head out of a herd is its KEEPER's
   * (`HerdRegistry.mayKeep`, controller-liquidity D9, C19) — asked before
   * the kill, because a refusal after it leaves a dead animal nobody may
   * write out of the book. A head in no herd answers `null` (no book).
   */
  public async cullRefusal(by: Stuff): Promise<'not-keeper' | null> {
    if (!this.herdId) return null;
    const registry = await StuffApi.singleton<HerdRegistry>(HERD_REGISTRY_PATH);
    const herd = await registry.read(this.herdId);
    if (!herd) return null;
    return (await registry.mayKeep(by, herd)) ? null : 'not-keeper';
  }

  /**
   * ⭐ Can she be put to the male HERE? (C19.) She must be female — an
   * unrecorded sex is open, the tri-state rule — and a male of her kind
   * must be with her: a live one standing where she stands, or the herd's
   * own males on the field she is grazing with them.
   */
  public async breedRefusal(): Promise<BreedRefusal | null> {
    const sex = this.getSex();
    if (sex !== null && sex !== 'female') return 'not-female';
    const here = this.getContainer();
    const kind = this.getSpecies();
    if (here && MixinApi.isContainer(here)) {
      for (const other of here.getContents()) {
        if (other.stuffId === this.stuffId || !MixinApi.isOrganism(other)) continue;
        if (other.isAlive() && other.getSex() === 'male' && other.getSpecies() === kind) {
          return null;
        }
      }
    }
    if (this.herdId && this.grazedFraction() !== null) {
      const registry = await StuffApi.singleton<HerdRegistry>(HERD_REGISTRY_PATH);
      const herd = await registry.read(this.herdId);
      const female = herd?.femaleFraction ?? DEFAULT_FEMALE_FRACTION;
      if (herd && herd.tally * (1 - female) >= 1) return null;
    }
    return 'no-male';
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
