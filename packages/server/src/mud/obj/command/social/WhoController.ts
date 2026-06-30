/**
 * WhoController — the online roster.
 *
 * Lists every connected player (presence is a public fact — there is no
 * "appear offline"), each row lensed per-viewer via
 * `SocialApi.composeRow`: known people by name, strangers by salient
 * features, country always appended, a notable presence status badged.
 * Filters narrow only on already-public facts (`--here` / `--friends` /
 * `--country`) — never a private attribute, so `--country` is legitimate
 * precisely because country is unconditionally public.
 *
 * Read-only, in the `StandingController` mold (returns `void`; output
 * rides the scene message).
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { MixinApi } from '../../../api/mixin';
import { PlayerApi } from '../../../api/player';
import { SocialApi, type RosterRow } from '../../../api/social';
import type { Stuff } from '../../../lib/stuff/Stuff';

/** Identity-family self/social readout — reuse, don't invent a topic. */
const TOPIC = 'world.identity';

/** Above this many rows, unrecognized strangers collapse to a count. */
const COLLAPSE_ABOVE = 40;

interface WhoModel extends CommandModel {
  /** `--here`: only people in the room with you. */
  here?: boolean;
  /** `--friends`: only people in your contacts. */
  friends?: boolean;
  /** `--country <c>`: only people whose (always-public) country matches. */
  country?: string;
}

export default class WhoController extends CommandController<WhoModel> {
  async execute(model: WhoModel, context: CommandContext): Promise<void> {
    const viewer = context.commandGiver;
    let people: Stuff[] = SocialApi.online();

    // --here: same containment as the viewer (null env ⇒ nobody is "here").
    if (model.here) {
      const env = MixinApi.isContainable(viewer)
        ? viewer.getContainer()
        : null;
      people = env
        ? people.filter(
            (p) =>
              MixinApi.isContainable(p) &&
              p.getContainer()?.stuffId === env.stuffId
          )
        : [];
    }

    // --friends: avatars the viewer keeps as a contact (any label).
    if (model.friends) {
      const contactIds = new Set<string>();
      if (MixinApi.isContacts(viewer)) {
        for (const c of viewer.allContacts()) {
          if (c.kind === 'avatar') contactIds.add(c.playerId);
        }
      }
      people = people.filter(
        (p) => PlayerApi.isAvatarStuff(p) && contactIds.has(p.getPlayerId())
      );
    }

    let rows: RosterRow[] = await Promise.all(
      people.map((p) => SocialApi.composeRow(viewer, p))
    );

    // --country: narrow on the already-public country field (no leak).
    if (model.country) {
      const q = model.country.toLowerCase();
      rows = rows.filter((r) => r.country?.toLowerCase().includes(q));
    }

    MessageApi.scene(viewer)
      .topic(TOPIC)
      .toSelf(this.render(rows, model))
      .send();
  }

  /** Render the roster — known people named, strangers collapsed when dense. */
  private render(rows: RosterRow[], model: WhoModel): Mml {
    if (rows.length === 0) {
      return Mml.fromMarkup(
        model.here || model.friends || model.country
          ? Mml.escape('No one online matches that.')
          : Mml.escape('No one else is online.')
      );
    }

    const blocks: string[] = [Mml.strong(`Online — ${rows.length}`).toString()];
    const recognized = rows.filter((r) => r.recognized);
    const strangers = rows.filter((r) => !r.recognized);

    for (const r of recognized) blocks.push(Mml.escape(this.line(r)));

    if (strangers.length > 0) {
      const dense = rows.length > COLLAPSE_ABOVE;
      if (dense) {
        blocks.push(
          Mml.escape(
            `…and ${strangers.length} ${
              strangers.length === 1 ? 'stranger' : 'strangers'
            } online.`
          )
        );
      } else {
        for (const r of strangers) blocks.push(Mml.escape(this.line(r)));
      }
    }

    return Mml.fromMarkup(blocks.join('\n'));
  }

  /** One roster line: "<who> — <country> [status]". */
  private line(r: RosterRow): string {
    let line = r.header;
    if (r.country) line += ` — ${r.country}`;
    if (r.status) line += ` [${r.status}]`;
    return line;
  }
}
