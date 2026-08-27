/**
 * ChronicleController — the self-view over a character's chronicle.
 *
 * A single-token, zero-arg, self-only, read-only verb. It reads the
 * owner-scoped ledger (`ChronicleApi.entriesFor`) and renders, in a
 * fixed order and never interleaved:
 *   1. **bio** — the Persona-owned claimed self-narrative prose;
 *   2. **prologue** — `claim` entries, by `order` ascending (the
 *      char-gen aspiration seed);
 *   3. **timeline** — `deed` entries, by `when` ascending (witnessed
 *      moments).
 *
 * It subsumes the *view* role the char-gen subsystem sketched as the
 * deferred `records` verb; `records`-style bio **editing** stays
 * deferred.
 *
 * Trust boundary: claim `text` is author-trusted (from `char-gen.yaml`),
 * deed `text` was rendered by `ProseApi` at mint (raw strings escaped) —
 * both are MML-safe, so each entry's `text` re-wraps via
 * `Mml.fromMarkup`. The Persona `bio` is player-editable free text, so it
 * is escaped (`Mml.escape`) before composition.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { ChronicleApi } from '../../../../api/chronicle';

/** Identity-family self readout — reuse, don't invent a topic. */
const TOPIC = 'act.deed';

export default class ChronicleController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const entries = await ChronicleApi.entriesFor(actor);

    // Partition — never interleave. Claims by authored prologue order,
    // deeds by the game-time witness.
    const claims = entries
      .filter((e) => e.kind === 'claim')
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const deeds = entries
      .filter((e) => e.kind === 'deed')
      .sort((a, b) => (a.when ?? 0) - (b.when ?? 0));

    const bio = MixinApi.isPersona(actor) ? actor.getBio() : '';

    const blocks: string[] = [];
    if (bio) blocks.push(Mml.escape(bio));

    if (claims.length) {
      blocks.push(Mml.strong('Prologue').toString());
      blocks.push(
        Mml.unorderedList(claims.map((c) => Mml.fromMarkup(c.text))).toString()
      );
    }

    if (deeds.length) {
      blocks.push(Mml.strong('Deeds').toString());
      blocks.push(
        Mml.unorderedList(deeds.map((d) => Mml.fromMarkup(d.text))).toString()
      );
    }

    // Empty state: bio still renders (above); add a beginning line.
    if (!claims.length && !deeds.length) {
      blocks.push(Mml.escape('Your chronicle is just beginning.'));
    }

    const body = Mml.fromMarkup(blocks.join('\n\n'));
    MessageApi.scene(actor).topic(TOPIC).toSelf(body).send();
  }
}
