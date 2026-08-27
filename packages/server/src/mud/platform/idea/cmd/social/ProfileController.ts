/**
 * ProfileController — the identity card (`profile`/`finger <player>`) and
 * the self-dashboard (`score`/`me`).
 *
 * One viewer-aware card through different redaction: another player's card
 * is gated by recognition (persona hidden until you know them) and their
 * disclosure dial; your own card is unredacted and carries the standing
 * digest. All composition lives in `SocialApi.composeCard` (the single
 * redaction seam) — this controller only renders.
 *
 * Read-only, self-defaulting (no target ⇒ yourself).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { SocialApi, type ProfileCard } from '../../../../api/social';
import type { MqlOneResult } from '../../../../api/mql';

const TOPIC = 'act.deed';

interface ProfileModel extends CommandModel {
  /** Positional: who to inspect. Omit ⇒ self (the `score`/`me` path). */
  target?: MqlOneResult;
}

export default class ProfileController extends CommandController<ProfileModel> {
  async execute(model: ProfileModel, context: CommandContext): Promise<void> {
    const viewer = context.commandGiver;
    const target = model.target?.stuff ?? viewer;
    const card = await SocialApi.composeCard(viewer, target);
    MessageApi.scene(viewer).topic(TOPIC).toSelf(this.render(card)).send();
  }

  private render(card: ProfileCard): Mml {
    const lines: string[] = [];

    // Header: recognized formal name, else perceived description.
    if (card.nameSurface) {
      lines.push(Mml.strong(this.fullName(card.nameSurface)).toString());
    } else {
      lines.push(Mml.strong(card.header).toString());
    }

    // Observable physicality (one line).
    const physical = [card.species, card.sex, card.pronouns, card.ageStage]
      .filter((v): v is string => !!v)
      .join(', ');
    if (physical) lines.push(Mml.escape(physical));

    // Account / world facts.
    const facts: string[] = [];
    if (card.country) facts.push(`From ${card.country}`);
    if (card.status) facts.push(card.status);
    if (card.newness === 'new-arrival') facts.push('new arrival');
    if (facts.length) lines.push(Mml.escape(facts.join(' · ')));

    if (card.flavor) lines.push(Mml.em(card.flavor).toString());

    // Persona (recognition-gated).
    if (card.aspiration) lines.push(Mml.escape(`Aspires: ${card.aspiration}`));
    if (card.bio) lines.push(Mml.escape(card.bio));

    // Always-outward standing.
    const standing: string[] = [];
    if (card.renownBand) standing.push(`renown: ${card.renownBand}`);
    if (card.competenceBands?.length) {
      standing.push(
        'skilled: ' +
          card.competenceBands
            .map((c) => `${c.discipline} (${c.band})`)
            .join(', ')
      );
    }
    if (standing.length) lines.push(Mml.escape(standing.join(' · ')));

    // Chronicle (recognized). The entry text is already ProseApi-rendered
    // MML (it can carry `<location>` / name refs), so it is emitted as
    // markup — NOT escaped — while the literal bullet prefix is plain.
    if (card.chronicle) {
      if (card.chronicle.prologue) {
        lines.push(card.chronicle.prologue);
      }
      for (const deed of card.chronicle.deeds) {
        lines.push(`• ${deed}`);
      }
    }

    // Observer-owned annotations (your read).
    if (card.yourLabel) {
      lines.push(Mml.escape(`You filed them under "${card.yourLabel}".`));
    }
    if (card.yourRegard) lines.push(Mml.escape(card.yourRegard));

    // Self-only standing digest.
    if (card.isSelf && card.digest) {
      lines.push(Mml.strong('Your standing').toString());
      const d = card.digest;
      if (d.influence) {
        // ⚠ `make` is OPTIONAL — it is account-level, and an account
        // that cannot be resolved yields no figure rather than the
        // per-character one. Interpolating it directly printed
        // `Make: undefined` into player-visible prose, which the type
        // system happily allows inside a template literal. Absent means
        // the segment is omitted; it never becomes a word.
        const parts = [
          `Play: ${d.influence.play}`,
          ...(d.influence.make ? [`Make: ${d.influence.make}`] : []),
          `Renown: ${d.renown ?? 'dormant'}`,
        ];
        lines.push(Mml.escape(parts.join(' · ')));
      }
      if (d.traits?.length) {
        lines.push(
          Mml.escape(
            'Traits: ' + d.traits.map((t) => `${t.axis} (${t.band})`).join(', ')
          )
        );
      }
      lines.push(
        Mml.em(
          'See `standing`, `traits`, `competence`, `chronicle` for the full detail.'
        ).toString()
      );
    }

    return Mml.fromMarkup(lines.join('\n'));
  }

  /** Assemble the formal name from the recognized name surface. */
  private fullName(ns: NonNullable<ProfileCard['nameSurface']>): string {
    return [ns.honorific, ns.name, ns.surname, ns.suffix]
      .filter((v): v is string => !!v)
      .join(' ');
  }
}
