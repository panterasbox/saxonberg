/**
 * BoreController — `bore` (alias `drill`), and it is **two acts wearing
 * one verb** on purpose.
 *
 * With no hole in the room, `bore` **sites** one: it commits a wellhead
 * and an outfit to this piece of ground, which is the property act and
 * the only title-gated thing in the trade. With a hole, `bore` is a
 * **swing** — one stroke of the beam, banked toward the next metre.
 *
 * ⭐ One verb because to a person it is one thing: you go to the rig and
 * you work the rig. The fork is which of those the world is in, exactly
 * as `tap` sets a spile or draws what has run depending on the tree.
 *
 * ## ⭐⭐⭐ Where the owner's skill actually is
 *
 * At the **siting**, and nowhere else. A bought act has two acts in it:
 * the owner chose this ground and this depth, and the crew turned the
 * beam. So siting credits `geology` — *hard* when the structure read
 * puts the target deep, because committing a payroll to two hundred
 * metres on a bracketed number is the judgment the trade is about — and
 * the swing credits `mining`, to whoever actually swung.
 *
 * ⚠ **The owner never earns the skill they bought.** An owner who pays
 * a crew for a month of beam work advances no labour discipline at all,
 * which is the honest answer and the one the design insisted on.
 */

import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { BankingApi } from '@saxonberg/server/mud/api/banking';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import {
  DrillingActController,
  ACT_TOPIC,
  type DrillingModel,
} from './DrillingActController';
import type Wellhead from '../../../thing/Wellhead';
import type DrillingOutfit from '../../DrillingOutfit';

/** The seed rows the siting act mints from. */
const WELLHEAD_SEED = '/trade/drilling/thing/wellhead';
const OUTFIT_SEED = '/trade/drilling/idea/business/outfit';
/**
 * ⭐ The rig, raised by the siting act rather than made and carried.
 *
 * ⚠ `make derrick` existed for one revision and was wrong twice:
 * `CraftingLogic` lands a tangible output **at the maker**, so a
 * `fixedInPlace` ton-and-a-half frame arrived in somebody's pocket; and
 * six lengths of mine timber is 240 kg, which no body in this game can
 * carry to a hillside. Raising it on site is what happens in the fiction
 * and it is what the trade's own thesis says should be cheap — *the
 * expensive part of a bore is never the derrick.*
 */
const DERRICK_ROW = '/trade/drilling/thing/derrick';

/** The Discipline the SITING exercises — the owner's own. */
const GEOLOGY = 'geology';
/** The Discipline the SWING exercises — the hand's. */
const MINING = 'mining';

/** Endurance one swing costs a fresh body, in percentage points. */
const SWING_COST = 7;

/** Depth past which committing a payroll is the hard judgment. */
const DEEP_M = 100;

export default class BoreController extends DrillingActController {
  public async execute(
    model: DrillingModel,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const place = this.placeOf(giver);
    if (!place) {
      this.decline(context, Mml.compose`You are nowhere to sink anything.`, 'no-place');
      return;
    }
    const hole = await this.wellheadOf(model);
    if (hole === null) {
      // ⭐ Siting needs NO derrick — it raises one. See `Bailer.ts` for
      // why a derrick cannot be what affords raising a derrick.
      await this.site(context, giver, place);
      return;
    }
    if (this.derrickOf(model) === null) {
      this.noDerrick(context);
      return;
    }
    await this.swing(context, giver, hole);
  }

  /**
   * ⭐⭐ Commit a hole and a payroll to this ground.
   *
   * The stall-counter shape: key on `(seed, claim path)`, clone with
   * `asIdentityPath`, `restoreOrSeed`, move, `capture`. ⚠ The outfit is
   * minted here too even though nobody is hired yet, because the KEY has
   * to exist before a `hire` can reference it — and its seats are
   * authored on the seed row, which is what the no-runtime-setter
   * constraint on `positions` actually permits.
   */
  private async site(
    context: CommandContext,
    giver: Stuff,
    place: Stuff & Container,
  ): Promise<void> {
    const claim = place.getTemplatePath() ?? '';
    if (claim === '') {
      this.decline(context, Mml.compose`This ground has no name to put in a register.`, 'no-claim');
      return;
    }
    if (!(await this.maySite(giver, place))) {
      this.decline(
        context,
        Mml.compose`This ground is not yours to sink a hole in. Stake it first — a bore is capital you cannot carry away.`,
        'untitled',
      );
      return;
    }
    const owner = giver.getIdentityPath() ?? '';
    if (owner === '') {
      this.decline(context, Mml.compose`A hole wants an owner of record.`, 'no-identity');
      return;
    }

    const leaf = claim.replace(/^\/+/, '');
    const holeId = `${WELLHEAD_SEED}/${leaf}`;
    const outfitId = `${OUTFIT_SEED}/${leaf}`;

    // The bank the payroll comes out of — refused BEFORE anything is
    // minted, because a hole with no wage account is a crew working for
    // nothing and finding out later.
    const primary = await BankingApi.primaryAccountIdOf(owner);
    const bank = primary ? await BankingApi.custodianOf(primary) : null;
    if (!primary || !bank) {
      this.decline(
        context,
        Mml.compose`Open an account first. A crew is paid from somewhere, and a hole is nothing but wages.`,
        'no-bank',
      );
      return;
    }

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
    } else if (
      !MixinApi.isContainable(hole) ||
      (hole as unknown as Containable).getContainer() !== place
    ) {
      ContainmentApi.move(hole as unknown as Stuff & Containable, place);
    }
    // ⚠ A restored hole's clock handle died with the process; re-arm it
    // or the rig stands still until somebody types something.
    hole.armRig();

    // ⭐ The rig itself. One per site, and it is a plain clone of the
    // row rather than a keyed identity: a derrick has no state of its
    // own, so there is nothing for a record to hold.
    const standing = place
      .getContents()
      .some((c) => c.getTemplatePath() === DERRICK_ROW);
    if (!standing) {
      const derrick = await StuffApi.clone<Stuff>(DERRICK_ROW);
      ContainmentApi.move(derrick as unknown as Stuff & Containable, place);
    }

    let outfit = StuffApi.findByTemplatePath<DrillingOutfit>(outfitId) ?? null;
    if (!outfit) {
      outfit = await StuffApi.clone<DrillingOutfit>(OUTFIT_SEED, undefined, {
        // identity-keyed-by: referenced — employment records reference
        // this as `organizationPath` and its wage account keys on it.
        asIdentityPath: outfitId,
        dataOverlay: {
          name: `${giver.getPresentation() ?? 'a driller'}'s outfit`,
          appointingAuthority: { kind: 'entity', path: owner },
          banksAt: bank,
          operatingLocations: [claim],
        },
      });
    }

    const structures = await hole.structuresHere(0.15);
    const deep = structures.some((s) => s.crestDepthM > DEEP_M);
    MessageApi.scene(giver)
      .topic(ACT_TOPIC)
      .toSelf(
        structures.length === 0
          ? Mml.compose`Four legs of timber up and a beam across the top of them, over a spot you picked for reasons of your own. There is nothing under it that anybody has surveyed, which is a thing you will find out about slowly and expensively.`
          : Mml.compose`Four legs of timber up and a beam across the top of them. The rig is over the structure you read, and from here it is wages and time.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} raises a rig over the ground.`)
      .send();

    // ⭐⭐ The owner's own skill, exercised at the one moment it is
    // theirs: choosing this ground. Nothing they pay for afterwards
    // credits them anything.
    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: GEOLOGY,
        difficulty: deep ? 'hard' : 'standard',
        outcome: 'success',
      });
    }
  }

  /** One stroke of the beam, banked toward the next metre. */
  private async swing(
    context: CommandContext,
    giver: Stuff,
    hole: Wellhead,
  ): Promise<void> {
    const bill = await hole.cutBill();
    if (bill === null) {
      // ⚠ Silence is not "free": a hole over no column says so.
      this.decline(
        context,
        Mml.compose`Nothing under this ground has ever been written down. There is no telling what the next yard costs, and nobody will swing on that.`,
        'no-bill',
      );
      return;
    }
    if (await hole.wantsLining()) {
      this.decline(
        context,
        Mml.compose`The hole will not stand open any deeper — soft ground and standing water, and it comes in as fast as you clear it. It wants lining. \`line\` it.`,
        'wants-lining',
      );
      return;
    }
    if (hole.getSumpL() > 0 && (await hole.headAtm()) <= 0) {
      this.decline(
        context,
        Mml.compose`There is water standing in the hole and the bit is swimming in it. Bail it out before you cut any further.`,
        'wants-bailing',
      );
      return;
    }

    // Resolved at DISPATCH, while the controller is alive.
    const durationMs = await hole.swingMs();
    this.engageAct(context, {
      durationMs,
      cost: SWING_COST,
      beginSelf: Mml.compose`You put your weight on the beam.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} leans into the beam.`,
      // ⚠⚠ A module function taking values. Nothing here touches `this`
      // — see the base's header for what that cost once.
      onComplete: () => {
        void completeSwing(context, hole, bill.swingsPerMetre);
      },
    });
  }
}

/** The swing, landed. ⚠ Runs long after the controller is a corpse. */
async function completeSwing(
  context: CommandContext,
  hole: Wellhead,
  needed: number,
): Promise<void> {
  // ⚠⚠ The actor may be GONE: a player can log out mid-swing, and
  // `Mml.actor(giver)` would render `undefined` and take the process
  // down. Banking the swing anyway would be worse than returning — the
  // work is the body's and the body has left.
  if (context.commandGiver.isDestroyed()) return;
  const giver = context.commandGiver as unknown as Stuff;
  const before = hole.getDepthM();
  const result = await hole.bankSwing(1);
  const scene = MessageApi.scene(giver).topic(ACT_TOPIC);
  if (result.deepened) {
    const fluid = await hole.fluidAtDepth(result.depthM);
    scene.toSelf(
      fluid === null
        ? Mml.compose`The bit drops through and the tools go down another yard. ${String(result.depthM)} m, and dry.`
        : Mml.compose`The bit drops through — and the hole changes its voice. ${String(result.depthM)} m, and there is something in it.`,
    );
  } else {
    scene.toSelf(
      Mml.compose`The beam comes up, the bit comes down. ${String(result.bank)} of ${String(needed)} strokes toward the next yard.`,
    );
  }
  scene.send();
  void before;

  // ⭐ The LABOUR discipline, to whoever actually swung — which is this
  // body, whether it is a player's or a hired hand's.
  if (MixinApi.isAdvancing(giver)) {
    await giver.creditDeed({
      discipline: MINING,
      difficulty: 'standard',
      outcome: result.deepened ? 'success' : 'partial',
    });
  }
}
