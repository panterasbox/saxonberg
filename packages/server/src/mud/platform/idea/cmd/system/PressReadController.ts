/**
 * PressReadController — bare `press`: the live ticker window, as prose
 * and as the `news` card (over {@link PressControllerBase}).
 *
 * ⭐ Its own shape (`press-read.yaml`, no args): bare `press` with NO
 * headline is the READ, and anyone may ask it. ⚠ It used to refuse —
 * first *headline required*, then (found by DRIVING) *you hold no
 * publishing position* — a publishing answer to a reading question,
 * which made the news the one shipped surface a player could not ask for.
 * The publishing gate lives on `post` / `edit` / `retract`, and the bare
 * `press <headline>` shorthand is refused at `PressApi.publish`'s own
 * entitlement before anything is minted.
 */

import type { CommandContext } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { CardApi } from '../../../../api/card';
import { PressApi } from '../../../../api/press';
import { PressControllerBase, type ReleaseModel } from './PressControllerBase';

export default class PressReadController extends PressControllerBase {
  execute(_model: ReleaseModel, context: CommandContext): void {
    const releases = PressApi.recent();
    const rows = releases.map((r) => PressApi.toRow(r));
    const body =
      rows.length === 0
        ? Mml.fromMarkup('\nNothing on the wire.\n')
        : Mml.fromMarkup(
            '\n' +
              rows
                .map(
                  (r) =>
                    `${r.pinned ? '📌 ' : ''}${Mml.escape(r.headline)}` +
                    ` — ${Mml.escape(r.publisher)}`,
                )
                .join('\n') +
              '\n',
          );
    /*
     * ⭐ The card carries **the rows this read already projected**. One
     * `PressApi.recent` call, two renderings. Opened before the frame so
     * `carded` is a fact — see the note on `MessageFrame.meta.carded`.
     */
    const opened = CardApi.open(context, 'news', {
      payload: { kind: 'releases', rows },
      prose: body,
    });
    const scene = MessageApi.scene(context.commandGiver).topic('shell.result');
    if (opened) scene.meta({ carded: opened });
    scene.toSelf(body).send();
  }
}
