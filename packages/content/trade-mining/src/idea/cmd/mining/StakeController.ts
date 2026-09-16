/**
 * StakeController — `stake [<block>]`.
 *
 * ⭐⭐ **A claim is STAKED, not bought.**
 *
 * `title buy <lot>` is buying from a catalogue — lots somebody laid out,
 * with prices, terms and a provisioner that builds you a house. A mining
 * claim has none of that. You find ground, you post a notice, and the
 * recorder writes it down.
 *
 * So this calls the gated `ParcelApi` directly: `subdivide` beneath the
 * mine's extent, then `transfer` to the staker. **A pack calling a kernel
 * Api is sanctioned**; there is no residence-pack dependency; and the
 * security invariant is untouched — parcels stay written only by
 * `ParcelApi` and are never declared in content, which is precisely why
 * ⚠ **a content edit cannot forge a title.** That is not incidental
 * here: a claim field in an editable collection is exactly the attack
 * this layer exists to refuse.
 *
 * ⭐ It mints **a title and no room**, which is what a claim IS. What
 * stands on the ground afterwards is whatever you cut.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import MineWarren from '../../MineWarren';
import type { ClaimBlock } from '../../MineWarren';

const TOPIC = 'act.deed';

/** How big a staked block is, in cells, in each direction. */
const BLOCK_HALF = 3;

interface StakeModel extends CommandModel {
  block?: string;
}

export default class StakeController extends CommandController<StakeModel> {
  async execute(model: StakeModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const room = (giver as unknown as { getContainer(): Stuff | null }).getContainer();
    const counter = room && MixinApi.isContainer(room)
      ? room.getContents().find((c) => isRegister(c))
      : undefined;
    if (!counter) {
      this.decline(
        context,
        Mml.compose`Claims are recorded at the claims office, not out here.`,
        'no-register',
      );
      return;
    }
    const warrenPath = (counter as unknown as { getWarrenPath?(): string }).getWarrenPath?.() ?? '';
    if (!warrenPath) {
      // The register names nothing — a real, diegetic answer.
      this.decline(context, Mml.compose`The register names no diggings.`, 'no-diggings');
      return;
    }
    // ⚠⚠ **Get-or-create, and `singleton` IS the get-or-create.** A
    // `MineWarren` is a reference Idea and nothing warms a roster of
    // them, so on a fresh process the index is empty and a bare
    // `findByTemplatePath` reads null forever — which is why `stake`
    // answered *"the register names no diggings"* to every claim ever
    // attempted in a booted world. `singleton` reads the same index
    // bucket first and clones only on a miss.
    let warren: MineWarren;
    try {
      warren = await StuffApi.singleton<MineWarren>(warrenPath);
    } catch (err) {
      // ⚠ A register that names diggings which will not resolve is an
      // AUTHORING fault, and it must not borrow the refusal above. That
      // sentence is what a player sees when nobody has recorded a mine
      // here; reusing it for a broken row is how the original bug hid —
      // the message was true-sounding and the cause was unfindable.
      // ⚠ `decline` files the `controller-rejected` note itself, so the
      // cause goes to the log rather than to a second note (the
      // `QuenchController` mint-failure precedent).
      console.error(`StakeController: warren '${warrenPath}' did not resolve`, err);
      this.decline(
        context,
        Mml.compose`The register names diggings the recorder cannot find — ${warrenPath}. That is a fault in the books, not in your claim; nobody can stake here until somebody fixes it.`,
        'warren-unresolvable',
      );
      return;
    }

    const centre = parseBlock(model.block);
    if (!centre) {
      this.decline(
        context,
        Mml.compose`Which block? Name it as three numbers — the cell at its centre, like ${'-4,-8,-2'}.`,
        'no-block',
      );
      return;
    }

    // ⚠ Already held? The register says so, and says by whom. First come
    // is the whole rule, so the refusal is the rule working.
    const existing = warren.claimFor(centre);
    if (existing) {
      const owner = await ParcelApi.ownerOf(existing.parcelExtent);
      this.decline(
        context,
        owner
          ? Mml.compose`That ground is already recorded, and it is not yours to record again.`
          : Mml.compose`That ground is already in the register.`,
        'already-claimed',
      );
      return;
    }

    const mine = warren.getMineExtent();
    const number = warren.getClaimBlocks().length + 1;
    const extent = `${mine}/claims/${number}`;

    // ⭐ The gated Api, called from a pack. Ownership lives OUTSIDE the
    // editable collection, which is the point.
    const record = await ParcelApi.subdivide(
      extent,
      mine,
      // ⚠⚠ The IDENTITY path, never the template path. Every player
      // Avatar shares one `templatePath`, so keying the title on it
      // made every claim in the mine owned by every player at once —
      // invisibly, because every fixture authors a distinct owner path.
      // `ParcelOwner.templatePath` is an identity path by the kernel's
      // own convention (`TitleController`, `TransferController`,
      // `ChattelLogic`, `EmploymentLogic` all write one); this pack
      // simply never got the MR !251 sweep. `lint:person-keys` holds
      // the shape at zero now.
      { kind: 'player', templatePath: giver.getIdentityPath() ?? '' },
      0,
      1,
      'industrial',
    );
    if (!record) {
      this.decline(
        context,
        Mml.compose`The recorder cannot enter that. Something is wrong with the register.`,
        'subdivide-failed',
      );
      return;
    }

    const block: ClaimBlock = {
      parcelExtent: extent,
      from: [centre[0] - BLOCK_HALF, centre[1] - BLOCK_HALF, centre[2] - 1],
      to: [centre[0] + BLOCK_HALF, centre[1] + BLOCK_HALF, centre[2] + 1],
    };
    warren.addClaimBlock(block);

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`The recorder turns the ledger round, writes the block and the date, and turns it back for your mark. Claim ${String(number)} is yours — the ground, and nothing standing on it.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} records a claim.`)
      .send();
  }

  private decline(
    context: CommandContext,
    prose: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}

/** `-4,-8,-2` → a cell. */
function parseBlock(raw?: string): [number, number, number] | null {
  if (!raw) return null;
  const parts = raw.split(',').map((n) => Number(n.trim()));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  return [parts[0]!, parts[1]!, parts[2]!];
}

/** The claims register: a fixture that names the diggings it records for. */
function isRegister(item: Stuff): boolean {
  return typeof (item as unknown as { getWarrenPath?: unknown }).getWarrenPath === 'function';
}
