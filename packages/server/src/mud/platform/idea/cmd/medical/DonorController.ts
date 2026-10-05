/**
 * DonorController — `donor` (blood build D4), the self-record of your
 * blood directive.
 *
 * Bare `donor` reads your card: your tested blood type (or that you are
 * untested), whether you have joined the donor roll, and your standing
 * directive about receiving blood. The subcommands set those two facts:
 *
 *   - `donor register` / `donor withdraw` — join or leave the donor roll,
 *     the readable list a shortage is answered from. ⭐ Registration is a
 *     pull surface, never a push target: nobody is paged, a registrant is
 *     someone who chose to be found (D14).
 *   - `donor accept` / `donor refuse` — set a STANDING directive. `refuse`
 *     holds even unconscious, even dying (the consent ladder reads it
 *     first, D5).
 *   - `donor clear` — drop the directive; let the moment decide.
 *
 * Self-only, afforded by `PersonaMixin.commandContributions.self` — the
 * same surface `chronicle`/`traits` ride. Acts on the giver alone; there
 * is no target, because a directive about your own body is your own act.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Persona } from '../../../../lib/character/Persona';

/** Identity-family self readout — reuse, don't invent a topic. */
const TOPIC = 'act.deed';

interface DonorModel extends CommandModel {
  action?: string;
}

export default class DonorController extends CommandController<DonorModel> {
  async execute(model: DonorModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    if (!MixinApi.isPersona(giver)) {
      return this.fail(context, 'You keep no donor card.', 'no-persona');
    }

    const verb = (model.action ?? '').trim().toLowerCase().split(/\s+/)[0] ?? '';
    const card = giver.getDonorCard();

    switch (verb) {
      case '':
        this.showCard(giver, context);
        return;
      case 'register':
        giver.setDonorCard({ receive: card.receive, donor: true });
        this.say(giver, context, 'You are on the donor roll — someone facing a shortage of your type can find you here, and ask. Nobody will page you.');
        return;
      case 'withdraw':
        giver.setDonorCard({ receive: card.receive, donor: false });
        this.say(giver, context, 'You have left the donor roll.');
        return;
      case 'accept':
        giver.setDonorCard({ receive: 'will', donor: card.donor });
        this.say(giver, context, 'Your card now accepts a transfusion — a standing yes, should you be unable to answer.');
        return;
      case 'refuse':
        giver.setDonorCard({ receive: 'wont', donor: card.donor });
        this.say(giver, context, 'Your card now refuses a transfusion — and it holds even if you are unconscious or dying.');
        return;
      case 'clear':
        giver.setDonorCard({ receive: '', donor: card.donor });
        this.say(giver, context, 'You have cleared your directive — if you cannot answer, the moment will decide.');
        return;
      default:
        return this.fail(
          context,
          `"${verb}" is not something a donor card does. Try: register, withdraw, accept, refuse, clear — or bare \`donor\` to read it.`,
          'unknown-subcommand',
        );
    }
  }

  private showCard(giver: Stuff & Persona, context: CommandContext): void {
    const card = giver.getDonorCard();

    const typed =
      MixinApi.isVitals(giver) && giver.isBloodTyped()
        ? `Your blood is typed ${Mml.strong(giver.bloodType() ?? 'unknown').toString()}.`
        : MixinApi.isVitals(giver) && giver.bloodType() !== null
          ? 'Your blood is untested — a `test` would tell you your type.'
          : 'You have no blood to type.';

    const roll = card.donor
      ? 'You are on the donor roll.'
      : 'You are not on the donor roll (`donor register` to join).';

    const directive =
      card.receive === 'will'
        ? 'Your directive: you have pre-consented to receive blood.'
        : card.receive === 'wont'
          ? 'Your directive: you refuse a transfusion — even unconscious, even dying.'
          : 'Your directive: none — if you cannot answer, the moment decides.';

    const rendered = Mml.fromMarkup(
      [typed, roll, directive].join('\n'),
    );
    MessageApi.scene(giver).topic(TOPIC).toSelf(rendered).send();
  }

  private say(giver: Stuff, context: CommandContext, line: string): void {
    void context;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
  }

  private fail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }
}
