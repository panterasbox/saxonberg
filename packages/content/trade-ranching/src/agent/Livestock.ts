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
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { CelestialApi } from '@saxonberg/server/mud/api/celestial';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import type HerdRegistry from '../idea/HerdRegistry';
import { DEFAULT_FEMALE_FRACTION } from '../idea/HerdRegistry';
import type { HeadOverlay, RefileAnswer } from '../idea/HerdRegistry';
import type Species from '@saxonberg/server/mud/platform/idea/species/Species';
import type { SlaughterRefusal } from '@saxonberg/server/mud/lib/species/Organism';
import { AccessApi } from '@saxonberg/server/mud/api/access';

/** The register this head was drafted out of (the Herdbook's own constant). */
const HERD_REGISTRY_PATH = '/trade/ranching/idea/HerdRegistry';

/** Her season and his (organism-biology D9) — conditions the species' phenology carries. */
const IN_SEASON = '/platform/idea/Condition/reproduction/in-season';
const RUT = '/platform/idea/Condition/reproduction/rut';
/** In milk (D9) — brought on by freshening at the draft, relieved by drying off. */
export const LACTATING = '/platform/idea/Condition/reproduction/lactating';

const SECONDS_PER_GAME_DAY = 86_400;

/** What `breed` answers: the words' facts, or why not. */
export type ServeAnswer =
  | { ok: true; index: number; gestationDays: number }
  | { ok: false; reason: 'not-mature'; stage: string }
  | { ok: false; reason: 'not-keeper'; herdName: string }
  /** `longDays` — the days are still too long (autumn breeders wait for them to shorten). */
  | { ok: false; reason: 'out-of-season'; longDays: boolean }
  | { ok: false; reason: 'no-breeding' | 'not-in-herd' | 'no-herd' | BreedRefusal };

/** What turning a head back in answers: the words' facts, or why not. */
export type HerdReturn =
  | { ok: true; index: number; read: string }
  | { ok: false; reason: 'not-drafted' | 'not-in-book' };

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
    // who is acting must be who is named (call-security pass D5)
    AccessApi.requireActor(by);
    if (!this.herdId) return null;
    const registry = await StuffApi.singleton<HerdRegistry>(HERD_REGISTRY_PATH);
    const herd = await registry.read(this.herdId);
    if (!herd) return null;
    return (await registry.mayKeep(by, herd)) ? null : 'not-keeper';
  }

  /**
   * ⭐ The organism's ladder, then the BOOK: a head out of somebody's herd
   * is its keeper's to cull (D9, C19) — asked before the kill.
   */
  public override async slaughterRefusal(by: Stuff): Promise<SlaughterRefusal | null> {
    // who is acting must be who is named (call-security pass D5)
    AccessApi.requireActor(by);
    const base = await super.slaughterRefusal(by);
    if (base !== null) return base;
    return this.cullRefusal(by);
  }

  /**
   * ⭐ The kill, then the book: the head returns and the tally falls
   * (`HerdRegistry.cull`). The record's half is read BEFORE the kill —
   * afterwards there is no live animal to ask. ⚠ A failed write leaves the
   * herd over-counted, which is recoverable; the body already stands.
   */
  public override async slaughter(by: Stuff): Promise<{ recordFailed: string | null }> {
    const herdId = this.herdId;
    const index = this.headIndex;
    const flesh = this.getReserve('flesh')?.current.rawValue();
    const handling = this.getHandling();
    const done = await super.slaughter(by);
    if (!herdId || index < 0) return done;
    try {
      const registry = await StuffApi.singleton<HerdRegistry>(HERD_REGISTRY_PATH);
      await registry.cull(by, herdId, index, {
        note: 'slaughtered',
        ...this.bookTraits(),
        ...(flesh !== undefined ? { flesh } : {}),
        handling,
      });
      return done;
    } catch (err) {
      console.warn('Livestock: the book write failed:', err);
      return { recordFailed: `${herdId}/${String(index)} stays drafted` };
    }
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
        // ⭐ …and a male standing by her is one in RUT (D9): a steer or a
        // yearling does not serve. A species with no rut on its schedule
        // reads any live male, as before.
        if (other.isAlive() && other.getSex() === 'male' && other.getSpecies() === kind && this.ready(other)) {
          return null;
        }
      }
    }
    if (this.herdId && this.grazedFraction() !== null) {
      const registry = await StuffApi.singleton<HerdRegistry>(HERD_REGISTRY_PATH);
      const herd = await registry.read(this.herdId);
      const female = herd?.femaleFraction ?? DEFAULT_FEMALE_FRACTION;
      // ⭐ A steer serves nobody (review): the entire males are the males
      // less the share cut young.
      const entire = 1 - (herd?.neuteredFraction ?? 0);
      if (herd && herd.tally * (1 - female) * entire >= 1) return null;
    }
    return 'no-male';
  }

  /** Does this head carry the condition at `path`? */
  public carries(path: string): boolean {
    return this.getConditions().some((c) => c.kind === 'affliction' && c.templatePath === path);
  }

  /** A male of her kind standing by: in rut, if his species schedules one. */
  private ready(male: Stuff): boolean {
    const ruts = this.getSpecies()?.getPhenology().some((e) => e.condition === RUT) ?? false;
    if (!ruts) return true;
    return MixinApi.isVitals(male) && male.getConditions().some((c) => c.kind === 'affliction' && c.templatePath === RUT);
  }

  /**
   * ⭐⭐ **A head answers to what it IS NOW** (organism-biology D8): the
   * generic row's words, then its species' words for its form — a calf, a
   * bull, a cow — read LATE, at every bind. Nothing is stamped at draft,
   * which is what lets a calf come to answer to its adult name with no
   * re-draft. A word only the other sex goes by is not hers (`milk bull`
   * in a byre with a cow in it finds the bull or nothing).
   */
  override getKeywords(viewer?: Stuff): string[] {
    const own = super.getKeywords(viewer);
    const words = this.getCommonNames().map((n) => n.toLowerCase());
    return [...new Set([...own.map((k) => k.toLowerCase()), ...words])];
  }

  /**
   * ⭐ What the head is called, read late for the same reason: the row's
   * `head of stock` stands only for a head with no species words.
   */
  override getShortDescription(): string {
    return this.getCommonNames()[0]?.toLowerCase() ?? super.getShortDescription();
  }

  /**
   * ⭐ (dairy D12) A head returned dried off is still dry if it comes out
   * again inside the species' rest: returning and redrafting cannot
   * launder a dry cow. Past the rest she is drafted fresh.
   */
  public restoreDryPeriods(
    species: Species | null,
    driedOffAt: Readonly<Record<string, number>> | undefined,
    nowS: number,
  ): void {
    if (!driedOffAt || !species) return;
    for (const tap of this.taps()) {
      const at = driedOffAt[tap.key];
      if (typeof at !== 'number' || !(tap.restDays && tap.restDays > 0)) continue;
      if (nowS - at < tap.restDays * SECONDS_PER_GAME_DAY) this.dryOff(tap.key);
    }
  }

  /**
   * ⭐⭐ **Freshening at the draft** (organism-biology D9): a mature female
   * whose milk runs by the ACT (her species schedules `lactating` as an
   * `event`) is in milk when she comes out of the book — unless she is
   * still inside her rest (`restoreDryPeriods` has dried her). The draft
   * is the stand-in for calving, as the shipped rest already was.
   */
  public freshenAtDraft(): void {
    const schedule = this.getSpecies()?.getPhenology() ?? [];
    if (!schedule.some((e) => e.condition === LACTATING && e.trigger.event)) return;
    if (this.getSex() === 'male' || !this.isMature() || this.carries(LACTATING)) return;
    const milk = this.taps().filter((t) => t.activeIn === LACTATING);
    if (milk.length === 0 || milk.every((t) => this.isDriedOff(t.key))) return;
    this.afflict({ kind: 'affliction', templatePath: LACTATING, stage: 0, elapsed: 0 });
  }

  /**
   * ⭐ What the book must carry beyond the seed (organism-biology D8): the
   * parts lost and the sex, so a steer is still a steer at the next draft
   * and a refiled head is not redrawn by its new index.
   */
  public bookTraits(): HeadOverlay {
    const sex = this.getSex();
    const lost = this.getLostParts();
    return {
      ...(sex === 'male' || sex === 'female' ? { sex } : {}),
      ...(lost.length > 0 ? { lostParts: lost } : {}),
    };
  }

  /**
   * ⭐⭐ `return` (controller-liquidity W10): **turn this head back into
   * the book.** What it became — its flesh and when that was true (cover
   * build D10), its handling, its age, and when each expiring tap went dry
   * (dairy D12: a stamp still inside its rest is kept, so turning her in
   * twice does not restart the clock) — is folded into the record, and the
   * object goes LAST, after the write has landed: the identity was the
   * record, not the flesh. A head in no herd is just itself.
   */
  public async returnToHerd(): Promise<HerdReturn> {
    const herdId = this.herdId;
    const index = this.headIndex;
    if (!herdId || index < 0) return { ok: false, reason: 'not-drafted' };
    const registry = await StuffApi.singleton<HerdRegistry>(HERD_REGISTRY_PATH);
    const clocked = !!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry);
    const nowS = clocked ? WorldClockApi.getNow().rawValue() : 0;
    let driedOffAt: Record<string, number> | null = null;
    if (clocked) {
      const prior = (await registry.overlayFor(herdId, index))?.driedOffAt ?? {};
      const out: Record<string, number> = {};
      for (const tap of this.taps()) {
        if (tap.behaviour !== 'expire' || !this.isDriedOff(tap.key)) continue;
        const was = prior[tap.key];
        const rest = (tap.restDays ?? 0) * SECONDS_PER_GAME_DAY;
        out[tap.key] = typeof was === 'number' && nowS - was < rest ? was : nowS;
      }
      if (Object.keys(out).length > 0) driedOffAt = out;
    }
    const flesh = this.getReserve('flesh');
    const ok = await registry.returnHead(herdId, index, {
      flesh: flesh ? Math.round(flesh.current.rawValue() * 10) / 10 : undefined,
      ...(clocked ? { fleshAt: nowS } : {}),
      handling: Math.round(this.getHandling() * 100) / 100,
      ageDays: Math.round(this.getAgeDays() * 10) / 10,
      ...(driedOffAt ? { driedOffAt } : {}),
      ...this.bookTraits(),
    });
    if (!ok) return { ok: false, reason: 'not-in-book' };
    const read = this.stockmanRead();
    await StuffApi.destruct(this as unknown as Stuff);
    return { ok: true, index, read };
  }

  /**
   * ⭐⭐ `breed` (controller-liquidity W10): **put her to the male and write
   * it in the book.** Her species must breed in keeping; she must be
   * mature (a STAGE, not an age); the DAYLENGTH must be her season; she
   * must be in a herd with a book; she must be female with a male of her
   * kind by her (C19); and the book is the keeper's (D9). ⚠⚠ The tally
   * does not move — nothing has gestated; the honest record is the date.
   */
  public async serveBy(by: Stuff): Promise<ServeAnswer> {
    const species = this.getSpecies();
    const spec = species?.getBreeding() ?? null;
    if (!species || !spec) return { ok: false, reason: 'no-breeding' };
    if (!this.isMature()) return { ok: false, reason: 'not-mature', stage: this.getLifeStage() ?? 'youngster' };
    // ⭐⭐ Her season is a condition on HER (organism-biology D9): the
    // species' phenology brings `in-season` on in its breeding band, and
    // this reads it — the daylength is read here only for the words.
    if (!this.carries(IN_SEASON)) {
      const where = MixinApi.isContainable(by) ? by.getContainer() : null;
      const daylight = where ? await CelestialApi.daylightFractionAt(where) : 0.5;
      return { ok: false, reason: 'out-of-season', longDays: daylight > spec.daylightTo };
    }
    if (!this.herdId) return { ok: false, reason: 'not-in-herd' };
    const registry = await StuffApi.singleton<HerdRegistry>(HERD_REGISTRY_PATH);
    const herd = await registry.read(this.herdId);
    if (!herd) return { ok: false, reason: 'no-herd' };
    const breed = await this.breedRefusal();
    if (breed !== null) return { ok: false, reason: breed };
    const nowS = StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry) ? WorldClockApi.getNow().rawValue() : 0;
    const served = await registry.serve(by, this.herdId, this.headIndex, nowS);
    if (served === 'not-keeper') return { ok: false, reason: 'not-keeper', herdName: herd.name };
    return { ok: true, index: this.headIndex, gestationDays: spec.gestationDays };
  }

  /** Bind this object to the record it was drafted out of. */
  /**
   * ⭐ `herd enter <animal> in <herd>` (organism-biology D8): this drafted
   * head is written into another register by `by`, and answers to its new
   * book from then on. The register decides (`HerdRegistry.refile`); the
   * head carries what the new book must not redraw — its sex, its handling
   * and flesh, its birth, what it has lost.
   */
  public async enterHerd(toId: string, by: Stuff | null): Promise<RefileAnswer> {
    if (!this.herdId || this.headIndex < 0) return { ok: false, reason: '/trade/ranching/reasons/not-drafted' };
    const registry = await StuffApi.singleton<HerdRegistry>(HERD_REGISTRY_PATH);
    const flesh = this.getReserve('flesh')?.current.rawValue();
    const bornAt = this.getBornAt();
    const answer = await registry.refile(this.herdId, this.headIndex, toId, by, {
      ...this.bookTraits(),
      handling: Math.round(this.getHandling() * 100) / 100,
      ...(flesh !== undefined ? { flesh: Math.round(flesh * 10) / 10 } : {}),
      ...(bornAt !== 0 ? { bornAt } : {}),
    });
    if (answer.ok) this.bindToHerd(toId, answer.index);
    return answer;
  }

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
