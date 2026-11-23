/**
 * ProgramControllerBase — what the `program` subcommands share (stream
 * arrival A1, D10–D13).
 *
 * ⭐ Controllers are IO: each parses its line, calls ONE `StreamApi`
 * program static, and renders the answer — a refusal passed on to its
 * reason row unworded (`this.refuse(context, answer)`). The pen, the proof
 * and the chair are decided in `StreamLogic`, never here (P5); the actor is
 * read there from the execution context, never passed (P14).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import type { ProgramListing } from '@saxonberg/types';

export interface ProgramModel extends CommandModel {
  rest?: string;
  name?: string;
  title?: string;
  line?: string;
  owner?: string;
  carrier?: string;
  channel?: string;
  clear?: boolean;
}

/** A carrier as a person says it. */
const CARRIER_LABELS: Readonly<Record<string, string>> = {
  twitch: 'Twitch',
  youtube: 'YouTube',
  kick: 'Kick',
};

export abstract class ProgramControllerBase extends CommandController<ProgramModel> {
  /** The short name as typed, lower-cased (a name is lower-case by rule). */
  protected nameOf(model: ProgramModel): string {
    return (model.name ?? '').trim().toLowerCase();
  }

  protected tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      // A program's words are its owner's — escaped whole, never markup.
      .toSelf(Mml.fromMarkup(`\n${Mml.escape(text)}\n`))
      .send();
  }

  /** A program's public facts, as lines (`program about`, bare `program`). */
  protected describe(listing: ProgramListing): string {
    const lines = [`${listing.title} (${listing.name})`];
    if (listing.ownerName) lines.push(`  owner: ${listing.ownerName}`);
    lines.push(`  next show: ${listing.nextShow ?? '(not said)'}`);
    const carriers = (['twitch', 'youtube', 'kick'] as const)
      .filter((c) => listing.feeds[c])
      .map((c) => `${CARRIER_LABELS[c]} ${listing.feeds[c]}`);
    lines.push(`  carried on: ${carriers.length > 0 ? carriers.join(', ') : 'no channel yet'}`);
    lines.push(`  ${listing.live ? 'ON THE AIR now' : 'off the air'}`);
    return lines.join('\n');
  }

  protected carrierLabel(carrier: string): string {
    return CARRIER_LABELS[carrier] ?? carrier;
  }
}
