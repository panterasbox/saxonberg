/**
 * DrinkController — `drink X`.
 *
 * Consumes the whole of holder X's bulk slot (X reached by name or by
 * material keyword, e.g. `drink coffee`). A thin direction over
 * `BulkableApi.transfer` with a `null` discard sink. The consumed
 * `{ material, amount }` is handed to the actor's `ingest` seam, whose
 * v1 default is a no-op.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { BulkableApi } from '../../../../api/bulk';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';

interface DrinkModel extends CommandModel {
  target: MqlOneResult;
  /** `--amount 100ml` — how much to take. Absent ⇒ the whole slot. */
  amount?: string;
  /** `--exact` — take the full measure or none of it. */
  exact?: boolean;
}

export default class DrinkController extends CommandController<DrinkModel> {
  execute(model: DrinkModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const target = model.target.stuff;

    if (!target) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' to drink.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: model.target.raw });
      return;
    }

    const fromSlot = BulkableApi.slotFor(target, model.target.via?.bulk?.affordance);
    if (fromSlot === null || fromSlot.isEmpty()) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's nothing to drink in ${Mml.thing(target)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'nothing-to-drink',
        detail: 'source slot empty or absent',
      });
      return;
    }

    // Capture the material BEFORE the transfer empties (and clears) the
    // slot, for the ingest hand-off and the prose.
    const material = fromSlot.getMaterial();
    // ⭐ The INGEST payload, not the stored one: whatever the matter
    // has spoiled into rides along with it (see `Freshness.withDose`).
    const payload = fromSlot.getIngestPayload();
    // …and, for an IDENTIFIABLE substance, capture how it looked to this
    // drinker before they swallowed it. Taken here on purpose:
    // swallowing an unidentified draught may teach you what it was
    // (use-identification), and the prose should name what you thought
    // you were drinking rather than spoil the reveal by rendering after
    // the fact.
    //
    // Only the identifiable case, because the two phrasings differ:
    // `getContentsDescriptionFor` returns a full noun phrase carrying
    // its OWN article ("an iridescent crimson potion"), while a plain
    // material's appearance is a bare phrase that still wants "the"
    // ("You drink the dark, steaming coffee.").
    const seenAs =
      material && MixinApi.isIdentifiable(material) &&
      MixinApi.isBulkable(target)
        ? target.getContentsDescriptionFor(
            giver,
            model.target.via?.bulk?.affordance,
          )
        : null;
    // **A measure if one was named, the whole slot otherwise** — the
    // `pour` shape, where the quantity rides the target's own MQL
    // result rather than a separate arg. It matters because dose
    // response is continuous (`Dose.scaleFor`), so a graded potion has
    // a real half-dose that nothing could previously ask for: `drink`
    // took everything and `sip` took a fixed 0.03 L.
    //
    // ⚠ NO PLAYER CAN REACH THIS YET. Measures do not parse for ANY
    // bulk verb — `pour 2 cups urn into mug`, pour's own documented
    // example, fails shape-matching, as does `urn:{2 cup}`. The
    // controllers read `.quantity`, MQL has the measure variant, and
    // the command shape-matcher rejects the phrasing before either is
    // consulted. Pre-existing and its own fix; this side is now ready
    // for it.
    const amount = BulkableApi.amountFromOption(
      model.amount,
      { kind: 'all' },
      model.exact === true,
    );
    const result = BulkableApi.transfer(fromSlot, null, amount);
    for (const note of result.notes) context.note(note);

    if (result.applied <= 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's nothing to drink in ${Mml.thing(target)}.`)
        .send();
      return;
    }

    BulkableApi.ingest(giver, material, result.applied, payload);

    const drunk = seenAs
      ? Mml.compose`You drink ${seenAs}.`
      : Mml.compose`You drink the ${
          payload?.appearance ?? (material?.getAppearance() || 'it')
        }.`;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(drunk)
      .toPeers(Mml.compose`${Mml.actor(giver)} drinks from ${Mml.thing(target)}.`)
      .send();
  }
}
