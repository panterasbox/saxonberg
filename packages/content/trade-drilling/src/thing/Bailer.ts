/**
 * Bailer — ⭐⭐ **the carried instrument that affords `spud`, and the
 * reason a bore site can exist before there is anything standing on
 * it.**
 *
 * ## The circularity this class exists to break
 *
 * The derrick affords every act at a hole, which is correct — the
 * instrument affords the verb, and a derrick is the instrument. But
 * **siting** is the act that puts the first rig on a piece of ground,
 * and at that moment there is nothing there to afford it. A derrick
 * cannot be what affords raising a derrick.
 *
 * ⭐ The kernel already blessed this exact split and said why: *`plot` is
 * deliberately NOT afforded by the field — you plot ground that is not
 * yet a field, so a field cannot be what affords it; a spade is. The two
 * halves of the ladder are afforded by the two things that are actually
 * present at each end of it.* A bailer is the spade of this trade: it is
 * the one tool that is on the rig from the first yard to the last, and
 * it is in your hands rather than in the ground.
 *
 * ## ⚠ Why there is no `make derrick`
 *
 * There was, for about an hour, and it was wrong twice. `CraftingLogic`
 * lands a tangible output **at the maker**, so a `fixedInPlace` frame
 * weighing a ton and a half would have arrived in somebody's pocket; and
 * six lengths of mine timber is two hundred and forty kilograms, which
 * no body in this game can carry to a hillside. So the rig is **raised
 * by the siting act** — which is also what happens in the fiction, and
 * what the trade's own thesis says should be cheap: *the expensive part
 * of a bore is never the derrick, it is the fifteen hundred in wages
 * that go down the hole after it.*
 */

import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { BankingApi } from '@saxonberg/server/mud/api/banking';
import { AccessApi } from '@saxonberg/server/mud/api/access';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import Wellhead from './Wellhead';
import type DrillingOutfit from '../idea/DrillingOutfit';

/** The capability a bailer affords. An open vocabulary, like every other. */
export const BAILING = 'bailing';

/**
 * Places a bore crew's seat has on a REAL outfit.
 *
 * ⭐ Four is the honest figure rather than a dial: a walking-beam rig is
 * worked in pairs on a two-shift day — which is also why hiring two
 * hands halves the time and doubles the wage bill, the arithmetic the
 * whole trade is about.
 */
const CREW_PLACES = 4;
/** The seed rows siting mints from. */
const WELLHEAD_SEED = '/trade/drilling/thing/wellhead';
const OUTFIT_SEED = '/trade/drilling/idea/business/outfit';
/**
 * ⭐ The rig, raised by the siting act rather than made and carried — six
 * lengths of mine timber is 240 kg, which no body in this game carries to
 * a hillside, and a `fixedInPlace` frame minted by a craft lands in the
 * maker's pocket. *The expensive part of a bore is never the derrick.*
 */
const DERRICK_ROW = '/trade/drilling/thing/derrick';
/** The Discipline the SITING exercises — the owner's own. */
const GEOLOGY = 'geology';
/** Depth past which committing a payroll is the hard judgment. */
const DEEP_M = 100;

/** Why a hole cannot be sited here — worded by `spud`. */
export type SpudRefusal = ActRefusal<
  'no-place' | 'no-claim' | 'untitled' | 'no-identity' | 'no-bank' | 'already-sited'
>;
/** A hole sited: whether the ground under it was ever read, and whether it was an old one. */
export interface SpudDone {
  /** The structure read found something under this spot. */
  surveyed: boolean;
  /** The hole's own record came back (it was sited before). */
  restored: boolean;
}

export default class Bailer extends Tool {
  /**
   * ⚠⚠ **The affordance is this static and nothing else.** A row's
   * `commandContributions:` is dead silently; two builds in this repo
   * shipped exactly that failure. Without this block, somebody standing
   * on staked ground holding a bailer types `bore` and is told *"I don't
   * understand 'bore'."*
   *
   * ⚠⚠ **`environment`, and `inventory` was WRONG** — the buckets name
   * WHO RECEIVES, from the declaring object's point of view. `inventory`
   * is *everything nested inside this object* (a pack affords `rummage`
   * to what it swallowed), so a bailer declaring `inventory` granted
   * `bore` to whatever was inside the bailer. `environment` is *its
   * container chain, outward* — the doc's own example is a wand in your
   * hand granting YOU `zap`, which is exactly this. The drive found it:
   * a player holding a bailer on staked ground typed `bore` and was told
   * *I don't understand 'bore'.*
   *
   * ⭐ And `peers` beside it, so a bailer lying at the wellhead works
   * too. Putting your tools down at the rig should not take the verbs
   * away.
   */
  static commandContributions = {
    environment: [
      'trade/drilling/cmd/drilling/spud.yaml',
      'trade/drilling/cmd/drilling/bore.yaml',
      'platform/cmd/device/bail.yaml',
      'trade/drilling/cmd/drilling/line.yaml',
    ],
    peers: [
      'trade/drilling/cmd/drilling/spud.yaml',
      'trade/drilling/cmd/drilling/bore.yaml',
      'platform/cmd/device/bail.yaml',
      'trade/drilling/cmd/drilling/line.yaml',
    ],
  };

  /**
   * ⭐⭐ **Site a hole here** — the `spud` verb's act (controller-liquidity
   * W12: siting split from `bore`, rung 5, the driller's own word).
   *
   * Commits a wellhead and an outfit to the ground `by` stands on — the
   * property act and the only title-gated thing in the trade, so the title
   * question is asked HERE, of the room, by `AccessApi.can`: an unstaked
   * site resolves to the town's committee and is denied, which is the
   * refusal `stake` exists to lift. ⭐ Labour is not gated — a hired hand
   * swings on the employer's claim all day; committing capital is.
   *
   * The bank is refused before anything is minted: a hole with no wage
   * account is a crew working for nothing and finding out later.
   *
   * ⭐⭐ The owner's own skill, exercised at the one moment it is theirs:
   * choosing this ground credits `geology` — *hard* when the structure read
   * puts the target deep. Nothing they pay for afterwards credits them.
   */
  public async spudPlanFor(by: Stuff): Promise<ActPlan<undefined, SpudDone, SpudRefusal> | SpudRefusal> {
    const room = MixinApi.isContainable(by) ? by.getContainer() : null;
    if (room === null || !MixinApi.isContainer(room)) return { ok: false, reason: 'no-place' };
    const place = room as Stuff & Container;
    const claim = place.getTemplatePath() ?? '';
    if (claim === '') return { ok: false, reason: 'no-claim' };
    if (place.getContents().some((c) => c instanceof Wellhead)) {
      return { ok: false, reason: 'already-sited' };
    }
    if ((await AccessApi.can(by, 'bore', place)) !== true) return { ok: false, reason: 'untitled' };
    const owner = by.getIdentityPath() ?? '';
    if (owner === '') return { ok: false, reason: 'no-identity' };
    const primary = await BankingApi.primaryAccountIdOf(owner);
    const bank = primary ? await BankingApi.custodianOf(primary) : null;
    if (!primary || !bank) return { ok: false, reason: 'no-bank' };
    return {
      ok: true,
      durationMs: 0,
      effortW: 0,
      facts: undefined,
      onComplete: async () => ({ ok: true, facts: await Bailer.site(by, place, claim, owner, bank) }),
    };
  }

  /**
   * The siting, landed. The stall-counter shape: key on `(seed, claim
   * path)`, clone with `asIdentityPath`, `restoreOrSeed`, move, `capture`.
   * ⚠ The outfit is minted too even though nobody is hired yet, because
   * the KEY has to exist before a `house appoint` can reference it.
   */
  private static async site(
    by: Stuff,
    place: Stuff & Container,
    claim: string,
    owner: string,
    bank: string,
  ): Promise<SpudDone> {
    const leaf = claim.replace(/^\/+/, '');
    const holeId = `${WELLHEAD_SEED}/${leaf}`;
    const outfitId = `${OUTFIT_SEED}/${leaf}`;
    // identity-keyed-by: own-record — the hole's own `holder_snapshots`
    // record, below, plus the outfit's `operatingLocations` round-trip.
    const hole = await StuffApi.clone<Wellhead>(WELLHEAD_SEED, undefined, {
      asIdentityPath: holeId,
    });
    const restored = await PersistableApi.restoreOrSeed(hole, claim);
    hole.setClaimPath(claim);
    hole.setOutfitPath(outfitId);
    if (!restored) {
      ContainmentApi.move(hole as unknown as Stuff & Containable, place);
      await PersistableApi.capture(hole, claim);
    } else if ((hole as unknown as Containable).getContainer() !== place) {
      ContainmentApi.move(hole as unknown as Stuff & Containable, place);
    }
    // ⚠⚠ Arm the rig HERE, on both branches — this is the only place a
    // wellhead comes into the world, so this is where its clock starts; a
    // restored hole's handle died with the process.
    hole.armRig();

    // ⭐ The rig itself: one per site, a plain clone (a derrick holds no
    // state of its own, so there is nothing for a record to hold).
    if (!place.getContents().some((c) => c.getTemplatePath() === DERRICK_ROW)) {
      const derrick = await StuffApi.clone<Stuff>(DERRICK_ROW);
      ContainmentApi.move(derrick as unknown as Stuff & Containable, place);
    }

    if (!StuffApi.findByTemplatePath<DrillingOutfit>(outfitId)) {
      await StuffApi.clone<DrillingOutfit>(OUTFIT_SEED, undefined, {
        // identity-keyed-by: referenced — employment records reference
        // this as `organizationPath` and its wage account keys on it.
        asIdentityPath: outfitId,
        dataOverlay: {
          name: `${by.getPresentation() ?? 'a driller'}'s outfit`,
          appointingAuthority: { kind: 'entity', path: owner },
          banksAt: bank,
          operatingLocations: [claim],
          // ⭐⭐ The HEADCOUNT is the mint's, not the seed's (`lint:openings`:
          // a seed advertising a place authors no `banksAt`). The seat is
          // defined once on the row; only *how many* is said here.
          positions: await Bailer.openPlaces(),
        },
      });
    }

    const structures = await hole.structuresHere(0.15);
    const deep = structures.some((s) => s.crestDepthM > DEEP_M);
    if (MixinApi.isAdvancing(by)) {
      await by.creditDeed({ discipline: GEOLOGY, difficulty: deep ? 'hard' : 'standard', outcome: 'success' });
    }
    return { surveyed: structures.length > 0, restored };
  }

  /**
   * The seed's own seats, with a headcount added. ⚠ Degrades to a bare
   * roustabout seat if the seed cannot be resolved — an outfit with no
   * seats is one nobody can be hired onto, and that would be silent.
   */
  private static async openPlaces(): Promise<unknown[]> {
    try {
      const seed = await StuffApi.singleton<DrillingOutfit>(OUTFIT_SEED);
      const seats = seed.getPositions();
      if (seats.length > 0) {
        return seats.map((seat) => ({ ...(seat as unknown as Record<string, unknown>), headcount: CREW_PLACES }));
      }
    } catch (err) {
      console.error('Bailer: the outfit seed did not resolve', err);
    }
    return [{ key: 'roustabout', title: 'roustabout', wageRate: 4, headcount: CREW_PLACES }];
  }
}
