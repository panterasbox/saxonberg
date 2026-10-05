/**
 * SapStandard — **a tree you tap**, and `ProducingMixin(Plant)` is the
 * whole of it.
 *
 * ⭐⭐ In every other respect it is a `Plant`: it grows on the shipped
 * growth model, it sits in a panel slot, it persists as a keyed nested
 * host, it is felled where it stands. What composing `ProducingMixin`
 * adds is a reservoir with a recharge law — which is the RGO law, and a
 * birch satisfies it exactly as a cow does.
 *
 * ⛔ **Not on `Plant` itself.** Every houseplant in the game would then
 * "give something", and a tapless species' silent refusal would be the
 * only thing stopping it. Only sap-bearing species rows name this class;
 * `oak-standard` stays `/platform/thing/Plant`.
 *
 * ## The spiles, and why over-tapping is the real decision
 *
 * `spiles` is per-instance and persistent, so a tree carries its wounds
 * across a bounce and a felled one takes them to the ground. `maxSpiles()`
 * derives from the growth stage — a seedling takes none, an established
 * stem one, a mature one two — so ⭐ **the refusal is the GIRTH**, which
 * is a fact about this tree that a player can see, rather than a cooldown
 * nobody can.
 *
 * `productionFactor()` is `spiles × vigor`, which makes three things true
 * at once with no extra mechanism: a tree with no spile gives nothing, a
 * second spile doubles the run, and a tree having a bad year runs slower.
 * (`perGameDay` on the species row is therefore PER SPILE, and says so.)
 *
 * ## The two phases of one verb
 *
 * `tap` is *set a spile* when there is no sap standing and room for
 * another, and *draw what has run* when there is. ⭐ One verb, because
 * that is one act to a person: you go to the tree, and what happens
 * depends on the tree. The alternative — `spile` then `tap` — is two
 * verbs for the two halves of a thing nobody thinks of as two things.
 *
 * ## The affordance
 *
 * `commandContributions.peers = [tap.yaml]` on THIS class, which is what
 * reaches a player standing in the room: the affordance walk goes one
 * level into an open container standing there, a `Panel` is a `GardenBed`
 * with no `Sealable`, so a tree in a panel slot affords its own verb
 * outward. ⚠ `Plant` declares no statics, so there is nothing to shadow
 * here — unlike `Panel`, which had to copy `Cultivable`'s four.
 * ⚠ And if a future panel is ever made sealable, this affordance dies
 * SILENTLY; `taps.md` records that.
 */

import Plant from '@saxonberg/server/mud/platform/thing/Plant';
import { ProducingMixin } from '@saxonberg/server/mud/lib/husbandry/Producing';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { Bulkable } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import type { WorkDifficulty, WorkPrognosis } from '@saxonberg/server/mud/lib/ground/Workable';
import type { TapClosedReason } from '@saxonberg/server/mud/platform/idea/species/Species';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';

/** The Discipline a tap credits — the same one `fell` and `plant` do. */
const SILVICULTURE = 'silviculture';

/** How long setting a spile takes, in real ms. Grain. */
const SET_SPILE_MS = 8_000;

/** Endurance setting one costs a fresh body, in points. Grain. */
const SET_SPILE_COST = 3;

/**
 * ⭐ Spiles a stem of each stage will take. Grain, and the honest shape:
 * a real sugarer goes by girth, one tap at about ten inches and two at
 * about eighteen, and the growth stage is the game's girth.
 */
const SPILES_BY_STAGE: Record<string, number> = {
  seedling: 0,
  young: 0,
  established: 1,
  mature: 2,
};

const SapStandardBase = ProducingMixin(Plant);

export default class SapStandard extends SapStandardBase {
  static fieldMeta: FieldMeta = {
    spiles: { persistent: true },
  };

  static commandContributions: CommandContributions = {
    self: [],
    peers: ['trade/forestry/cmd/forestry/tap.yaml'],
    environment: [],
  };

  /** The spile line, appended to the tree's description on `look`. */
  static markupAugmenters: MarkupAugmenter[] = [spileAugmenter];

  /** Spiles standing in this stem. Persistent: a tree keeps its wounds. */
  public spiles = 0;

  public getSpiles(): number {
    return this.spiles;
  }

  /** How many this stem will take, by its girth. */
  public maxSpiles(): number {
    return SPILES_BY_STAGE[this.getGrowthStage()] ?? 0;
  }

  /**
   * ⭐ `spiles × vigor` — and three things follow with no extra
   * mechanism: an untapped tree gives nothing at all, a second spile
   * doubles the run, and a tree having a bad year runs slower. ⚠ So
   * `perGameDay` on the species row is PER SPILE.
   */
  public override productionFactor(): number {
    const spiles = this.spiles;
    if (spiles <= 0) return 0;
    return spiles * this.getVigor();
  }

  public override tapCredit(
    _key: string,
  ): { discipline: string; difficulty: WorkDifficulty } | null {
    return { discipline: SILVICULTURE, difficulty: 'standard' };
  }

  /**
   * ⚠ The tree's own refusals, and **not one of them contains a digit
   * or the word *tap*.** The noun `tap` is bound on nine bar fixtures,
   * so a sugaring refusal that said "the tap" could read as being about
   * a beer engine; it says *spile* and *stem*, which is what a sugarer
   * says anyway.
   */
  public override tapRefusal(key: string, reason: TapClosedReason): string {
    switch (reason) {
      case 'before-season':
        return 'The sap is not up. Nothing will run until the days lengthen.';
      case 'after-season':
        return 'Bud break. The run is over for the year.';
      case 'cold':
        return 'It is too cold; nothing is moving in the wood.';
      case 'warm':
        return 'It has gone too warm. The run is finished.';
      default:
        return super.tapRefusal(key, reason);
    }
  }

  public override tapEmptyPhrase(_key: string): string {
    return this.spiles > 0
      ? 'Nothing has run into it yet. Give it time.'
      : 'There is no spile in it. Nothing can run out of a whole stem.';
  }

  public override tapBeginPhrase(_key: string): string {
    return 'You unhook the pail and let it run.';
  }

  /**
   * ⭐⭐ **One verb, two phases.** Set a spile when there is none and
   * the stem will take one; draw what has run when there is.
   *
   * The order of refusals is the order a person hits them: is the run on
   * at all, then — if you are setting — will this stem take another and
   * have you the auger and a spile, and if you are drawing, is there
   * anything in the pail yet.
   */
  public override async planTap(
    by: Stuff,
    key: string,
    tool: (Stuff & Tooled) | null,
    vessel: (Stuff & Bulkable) | null,
    what: string | null,
  ): Promise<WorkPrognosis> {
    // ⚠ The SEASON first, whichever phase this is: there is no sense
    // boring a hole into a stem that will not run for three months, and
    // the sentence a player wants is about the season rather than about
    // their auger.
    const window = this.tapWindow(key);
    if (!window.open && window.reason !== null) {
      return {
        kind: 'refusal',
        reason: `season-${window.reason}`,
        prose: this.tapRefusal(key, window.reason),
      };
    }

    // Something has run: draw it. The mixin's default owns that whole
    // path, including the vessel and the pour.
    if (this.standingIn(key) > 0.01) {
      return super.planTap(by, key, tool, vessel, what);
    }

    // Nothing has run — so this is the setting phase.
    if (this.spiles >= this.maxSpiles()) {
      return {
        kind: 'refusal',
        reason: 'girth',
        prose:
          this.maxSpiles() === 0
            ? 'The stem is too slender to take a spile at all. Leave it to grow.'
            : 'The stem will not take another spile at this girth.',
      };
    }
    if (!tool || !tool.hasCapability('boring')) {
      return {
        kind: 'refusal',
        reason: 'no-tool',
        prose: 'You would need an auger to bore the hole.',
      };
    }
    const spile = findSpile(by);
    if (!spile) {
      return {
        kind: 'refusal',
        reason: 'no-spile',
        prose: 'You have no spile to drive into it.',
      };
    }
    return {
      kind: 'plan',
      durationMs: SET_SPILE_MS,
      cost: SET_SPILE_COST,
      beginSelf:
        'You set the auger against the trunk and start to bore, cranking slowly so the bit does not bind.',
      beginPeers: null,
      token: { phase: 'set', spilePath: spile.getTemplatePath() },
    };
  }

  /**
   * Land it. A draw is the mixin's; a SET consumes the spile and leaves
   * it in the tree.
   *
   * ⚠ Re-checks the girth at completion. The interval is real game time
   * and somebody else could have set the second spile while this one was
   * being bored — which is the sort of thing that only happens when two
   * players share a sugarbush, and is exactly why the check is here.
   */
  public override async completeTap(
    by: Stuff,
    key: string,
    tool: (Stuff & Tooled) | null,
    vessel: (Stuff & Bulkable) | null,
    token: unknown,
  ): Promise<{ self: string; peers?: string | null; credit?: { discipline: string; difficulty: WorkDifficulty } | null }> {
    const phase = (token as { phase?: string } | null)?.phase;
    if (phase !== 'set') {
      return super.completeTap(by, key, tool, vessel, token);
    }
    if (this.spiles >= this.maxSpiles()) {
      return { self: 'Somebody has been here before you. Nothing came of it.' };
    }
    const spile = findSpile(by);
    if (!spile) return { self: 'Nothing came of it.' };
    // ⭐ The spile is CONSUMED and stays in the tree. That is what makes
    // over-tapping a decision with a cost rather than a free action.
    StuffApi.destruct(spile);
    this.spiles = this.spiles + 1;
    return {
      self:
        'The bit breaks through into the wet wood and you drive the spile home with the heel of your hand. It beads, and then it drips.',
      peers: null,
      credit: this.tapCredit(key),
    };
  }
}

/** A spile in the taker's hands, or null. */
function findSpile(by: Stuff): Stuff | null {
  if (!MixinApi.isContainer(by)) return null;
  for (const item of by.getContents()) {
    if (item.getTemplatePath()?.endsWith('/spile') === true) return item;
  }
  return null;
}

/**
 * ⭐ What is in the stem, appended to `look` — in words, and the one
 * number here is a count of spiles, which is a thing you can see by
 * looking at the tree.
 */
function spileAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (host.isDestroyed()) return text;
  const tree = host as unknown as SapStandard;
  if (typeof tree.getSpiles !== 'function') return text;
  const lines: string[] = [];
  const spiles = tree.getSpiles();
  const max = tree.maxSpiles();
  if (spiles <= 0) {
    lines.push(
      max === 0
        ? 'It is too slender to tap.'
        : 'There is no spile in it.',
    );
  } else {
    lines.push(
      spiles === 1
        ? 'One spile stands in the trunk about waist high.'
        : `${spiles} spiles stand in the trunk about waist high.`,
    );
    if (spiles >= max) lines.push('It will not take another at this girth.');
  }
  if (MixinApi.isProducing(host)) {
    lines.push(...host.productionRead());
    const sap = host.standingIn('sap');
    if (sap > 0.5) lines.push('Sap is standing in whatever is hung under it.');
  }
  const block = lines.join(' ');
  return text && text.length > 0 ? `${text}\n\n${block}` : block;
}
