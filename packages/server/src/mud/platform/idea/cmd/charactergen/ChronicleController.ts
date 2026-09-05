/**
 * ChronicleController — the read over a chronicle, and over an
 * institution's record.
 *
 * Three readings behind one verb, because they answer one question —
 * *what does the world remember about you* — and the answer's shape
 * follows the subject rather than the command:
 *
 *   1. **no subject** — your own chronicle: bio, then prologue, then
 *      deeds, in a fixed order and never interleaved;
 *   2. **a person in reach** — theirs, with one refusal (below);
 *   3. ⭐ **a body of people** — its accountability record: what it has
 *      lost, and what it is blamed for.
 *
 * ## ⚠⚠ Why the target had to be added at all
 *
 * The verb was zero-arg and self-only, and so is `competence`. Meanwhile
 * the permission model already says an NPC's history is a fact about the
 * world that any viewer may learn. **The gate was open and there was no
 * door**: nobody could ask what Dave is good at or what the collier has
 * been through, so a build that seeds authored history would have
 * shipped unreachable — the `feel`/`taste` shape exactly, a capability
 * that ships and has never run.
 *
 * ## The refusal is the feature
 *
 * Asking about another **player** is declined, and that is not a
 * limitation: a person's own history is theirs to tell. An authored
 * character's is a fact about the world. `getPlayerId()` is the
 * discriminator — structural, so a future player-bearing class behaves
 * the same without being enumerated.
 *
 * ## ⭐ Why an institution's record lives here
 *
 * Blame is derived and **nothing player-facing showed it**, so *"the
 * watch counts its losses"* was a claim nobody in the game could check.
 * Rather than minting a verb for it, the reading rides the one that
 * already means *read the record of X* — the subject decides which
 * record, exactly as it decides which shape.
 *
 * Trust boundary: claim `text` is author-trusted (from `char-gen.yaml`),
 * deed `text` was rendered by `ProseApi` at mint (raw strings escaped) —
 * both are MML-safe, so each entry's `text` re-wraps via
 * `Mml.fromMarkup`. The Persona `bio` is player-editable free text, so it
 * is escaped (`Mml.escape`) before composition.
 */

import { RecordControllerBase } from './RecordControllerBase';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { AccountabilityApi } from '../../../../api/accountability';
import { StuffApi } from '../../../../api/stuff';
import type { Stuff } from '../../../../lib/stuff/Stuff';

/** Identity-family self readout — reuse, don't invent a topic. */
const TOPIC = 'act.deed';

interface ChronicleModel extends CommandModel {
  subject?: string;
}

export default class ChronicleController extends RecordControllerBase<ChronicleModel> {
  async execute(model: ChronicleModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as unknown as Stuff;
    const asked = (model.subject ?? '').trim();

    if (!asked) {
      await this.renderChronicle(actor, actor, context, true);
      return;
    }

    // ⭐ One resolution, shared with `competence` — see
    // `RecordControllerBase`. It is not "whatever MQL returns first":
    // the live drive found `chronicle the watch` answering with *a
    // watchful sentry* because MQL matches a prefix.
    const subject = this.resolveSubject(asked, context);
    if (!subject) {
      this.say(
        context,
        `Nobody here goes by "${asked}", and no body of people either.`,
        'chronicle-no-subject',
      );
      return;
    }
    if (subject.kind === 'body') {
      await this.renderInstitution(subject.stuff, actor, context);
      return;
    }
    const person = subject.stuff;
    if (person !== actor && person.getPlayerId() !== null) {
      this.say(
        context,
        `${person.getPresentation()}'s story is theirs to tell.`,
        'chronicle-is-their-own',
      );
      return;
    }
    await this.renderChronicle(person, actor, context, person === actor);
  }

  private say(context: CommandContext, message: string, reason: string): void {
    this.fail(context, message, reason, TOPIC);
  }

  private async renderChronicle(
    subject: Stuff,
    actor: Stuff,
    context: CommandContext,
    isSelf: boolean,
  ): Promise<void> {
    if (!MixinApi.isPersona(subject)) {
      this.say(
        context,
        `${subject.getPresentation()} keeps no chronicle.`,
        'chronicle-no-persona',
      );
      return;
    }
    const entries = await subject.chronicleEntries();

    // Partition — never interleave. Claims by authored prologue order,
    // deeds by the game-time witness.
    const claims = entries
      .filter((e) => e.kind === 'claim')
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const deeds = entries
      .filter((e) => e.kind === 'deed')
      .sort((a, b) => (a.when ?? 0) - (b.when ?? 0));

    const bio = subject.getBio();

    const blocks: string[] = [];
    if (!isSelf) {
      blocks.push(Mml.strong(subject.getPresentation()).toString());
    }
    if (bio) blocks.push(Mml.escape(bio));

    if (claims.length) {
      blocks.push(Mml.strong('Prologue').toString());
      blocks.push(
        // ⚠ `Mml.li` per entry. `unorderedList` wraps a sequence of `<li>`
        // items — handed bare bodies it emits one run-together blob, which
        // nobody noticed while a prologue was a single line and which the
        // live drive made obvious the moment a character had three.
        Mml.unorderedList(
          claims.map((c) => Mml.li(Mml.fromMarkup(c.text))),
        ).toString()
      );
    }

    if (deeds.length) {
      blocks.push(Mml.strong('Deeds').toString());
      blocks.push(
        Mml.unorderedList(
          deeds.map((d) => Mml.li(Mml.fromMarkup(d.text))),
        ).toString()
      );
    }

    // Empty state: bio still renders (above); add a beginning line. ⭐ An
    // Extra lands here and should read as a role rather than as an empty
    // person — asking for a history it cannot have says so plainly.
    if (!claims.length && !deeds.length) {
      blocks.push(
        Mml.escape(
          isSelf
            ? 'Your chronicle is just beginning.'
            : `Nothing is written down about ${subject.getPresentation()}.`,
        ),
      );
    }

    const rendered = Mml.fromMarkup(blocks.join('\n\n'));
    MessageApi.scene(actor).topic(TOPIC).toSelf(rendered).send();
  }

  /**
   * ⭐⭐ **Losses are not crime-gated; blame is.** A lawful duel that kills
   * a guard is no crime against the watch, and it is still a guard the
   * watch lost. That asymmetry is what gives a casualty list its teeth —
   * gate it on crime and a body could only ever count its murdered.
   */
  private async renderInstitution(
    body: Stuff,
    actor: Stuff,
    context: CommandContext,
  ): Promise<void> {
    const path = body.getTemplatePath() ?? '';
    const name = this.labelOf(body);
    void context;
    const record = await AccountabilityApi.institutionRecordFor(path);

    /**
     * ⚠ **A durable id is a PATH, and a player must never read one.** The
     * live drive printed "/world/newbie-wilds/agent/sentry — to
     * /platform/agent/Avatar/7tbTQQ…", which is a filesystem, not a
     * casualty list. Resolve it to whoever is standing (the registry
     * indexes on identity, so this is the same key), and fall back to the
     * path's leaf when they are gone — a body that died IS gone, and its
     * post is still the honest name for it.
     */
    const nameOf = (id: string): string => {
      if (!id) return 'nobody';
      const live = StuffApi.findAllByTemplatePath(id)[0];
      if (live) return live.getPresentation();
      const leaf = id.split('/').filter(Boolean).pop() ?? id;
      return leaf.replace(/[-_]/g, ' ');
    };

    const blocks: string[] = [Mml.strong(name).toString()];
    if (record.losses.length) {
      blocks.push(
        Mml.escape(
          `Lost: ${record.losses.length} ` +
            `${record.losses.length === 1 ? 'person' : 'people'}.`,
        ),
      );
      blocks.push(
        Mml.unorderedList(
          record.losses.map((r) =>
            Mml.li(
              Mml.compose`${
                r.killer
                  ? `${nameOf(r.victim)} — to ${nameOf(r.killer)}.`
                  : `${nameOf(r.victim)} — to nobody in particular.`
              }`,
            ),
          ),
        ).toString(),
      );
    }
    if (record.blamed.length) {
      blocks.push(
        Mml.escape(`Answers for ${record.blamed.length} wrong(s):`),
      );
      blocks.push(
        Mml.unorderedList(
          record.blamed.map((r) =>
            Mml.li(
              Mml.compose`${`${nameOf(r.victim)} — by ${r.killer ? nameOf(r.killer) : 'one of theirs'}.`}`,
            ),
          ),
        ).toString(),
      );
    }
    if (!record.losses.length && !record.blamed.length) {
      blocks.push(
        Mml.escape(`${name} has lost nobody and answers for nothing.`),
      );
    }
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(blocks.join('\n\n')))
      .send();
  }
}
