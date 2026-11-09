/**
 * TitleControllerBase — what the `title` subcommands share
 * (controllers-are-io W8, D9: one controller per subcommand over a base per
 * noun; *a transaction with an institution's book is a subcommand of its
 * noun*). The parcel registry's book is `title`'s: `publish` and `offline`
 * (the flag on the parcel), `transfer` and `subdivide` (the two acts on
 * ground you hold, flat verbs until W8) are kernel controllers here; bare
 * `title`, `list` and `buy` read a plat book, a RESIDENCE class, so their
 * controllers live in that pack over this base
 * (`/system/residence/idea/cmd/civics/`) — a kernel controller cannot name
 * a pack class, and the structural probe it used instead is gone.
 *
 * ⚠ Inside a sandbox circle a title act is refused twice over —
 * `subdivide` and `transfer` both carry `assertFieldMutation`, and the
 * `parcels` collection is REFUSE in the PM policy table. A title minted in
 * a holodeck would be a real title.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { ParcelApi } from '../../../../api/parcel';
import { StuffApi } from '../../../../api/stuff';
import { Zone } from '../../../../lib/zone/Zone';
import type { Stuff } from '../../../../lib/stuff/Stuff';

const TOPIC = 'act.deed';
/** Where `transfer` / `subdivide` report: the shell's answer, not a deed. */
const RESULT_TOPIC = 'shell.result';

export interface TitleModel extends CommandModel {
  /** `buy` / `publish` / `offline`: the lot or the extent, as typed. */
  lot?: string;
}

export abstract class TitleControllerBase<
  T extends TitleModel = TitleModel,
> extends CommandController<T> {
  /**
   * ⭐⭐ `title publish <extent>` / `title offline <extent>` — declare
   * the content on ground you hold ready to be walked into, or take it
   * down.
   *
   * On the `title` verb because **the flag lives on the parcel**, and
   * the parcel's verb is `title`. An author holds title to their
   * extent, so they already hold the authority this needs: the gate is
   * `write-template` at the extent — the authority to change what the
   * rows there SAY, which is exactly what declaring them live is.
   * ⛔ Never a wizard check.
   *
   * ⭐ Taking live content down evicts the people inside to a tombstone
   * that names the extent and its holder, and tells the author of every
   * room that pointed in. `ParcelApi.setPublished` owns both halves and
   * the title gate (as the acting principal); this controller is the
   * prose.
   */
  protected async declareLive(
    model: TitleModel,
    context: CommandContext,
    live: boolean,
  ): Promise<void> {
    const giver = context.commandGiver;
    const word = live ? 'publish' : 'offline';
    const extent = (model.lot ?? '').trim();
    if (!extent) {
      return this.reject(
        context,
        Mml.compose`Which ground? \`title ${word} <extent>\`.`,
        'no-extent',
        `title ${word} needs an extent`,
      );
    }
    if (!extent.startsWith('/')) {
      return this.reject(
        context,
        Mml.compose`An extent is a path, like \`/world/terminus/market\`.`,
        'not-an-extent',
        `'${extent}' is not a path`,
      );
    }
    // Every refusal is the flip's own, as the acting principal (W8 — the
    // title gate moved off this verb onto the write it protects).
    const flipped = await ParcelApi.setPublished(extent, live);
    if (!flipped.ok) {
      switch (flipped.reason) {
        case 'untitled':
          return this.reject(
            context,
            Mml.compose`Nobody holds title to ${extent}, so there is nothing to ${word}.`,
            'untitled',
            `no parcel claims ${extent}`,
          );
        case 'not-yours':
          return this.reject(
            context,
            Mml.compose`${extent} is not yours to ${word}.`,
            'not-yours',
            `${word} refused at ${extent}`,
          );
        case 'no-change':
          return this.reject(
            context,
            live
              ? Mml.compose`${extent} is already open.`
              : Mml.compose`${extent} is already dark.`,
            'no-change',
            `${extent} is already ${live ? 'published' : 'offline'}`,
          );
      }
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        live
          ? Mml.compose`${extent} is open. Exits into it no longer refuse.`
          : Mml.compose`${extent} is dark. Anyone inside has been moved out, every exit into it refuses, and the authors of the rooms that pointed there have been told.`,
      )
      .send();
    context.note({
      kind: 'info',
      detail: `title:${word}:${extent}`,
    } as never);
  }

  /** A deed's refusal: said to the giver and noted. */
  protected reject(
    context: CommandContext,
    line: ReturnType<typeof Mml.compose>,
    reason: string,
    detail: string,
  ): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(line).send();
    context.note({ kind: 'controller-rejected', reason, detail });
  }

  /** A parcel's backing zone, stood up from its template path, or null. */
  protected async resolveZone(path: string): Promise<Zone | null> {
    if (!path) return null;
    try {
      const z = await StuffApi.singleton<Stuff>(path);
      return z instanceof Zone ? z : null;
    } catch {
      return null;
    }
  }

  /** The shell's answer to a `transfer` / `subdivide`. */
  protected send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(RESULT_TOPIC).toSelf(body).send();
  }

  /** The shell's refusal of a `transfer` / `subdivide`, said and noted. */
  protected fail(context: CommandContext, detail: string, reason: string): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
