/**
 * PaddleController — `paddle`: propel the small boat you are sitting in by
 * your own effort (river D21).
 *
 * The controller reads what you said and starts the paddling; the boat and
 * the water decide everything else (`Propel`). Words: `downstream` /
 * `down`, `upstream` / `up`, `left`, `right`, `bar` (whichever bank is
 * gravel here), or the name of a landing within hail. ⚠ Direction words
 * are read before anything is looked up: a landing is matched against the
 * room's own ways by name, never a scan.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import Boat from '../../../thing/Boat';
import { Propel, type PaddleWater, type PropelHeading } from '../../../lib/Propel';

interface PaddleModel extends CommandModel {
  heading?: string;
  inside?: boolean;
  hard?: boolean;
}

const WARREN_PATH = '/system/water/idea/ReachWarren';

const WORDS: Record<string, PropelHeading> = {
  downstream: 'downstream',
  down: 'downstream',
  on: 'downstream',
  upstream: 'upstream',
  up: 'upstream',
  left: 'left',
  right: 'right',
};

export default class PaddleController extends CommandController<PaddleModel> {
  async execute(model: PaddleModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const boat = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (!(boat instanceof Boat)) return this.refuse(context, 'act.deed', 'You are not sitting in a boat.', 'not-in-boat');
    const part = boat.propulsion();
    if (part === null) return this.refuse(context, 'act.deed', 'There is nothing in her to paddle with.', 'no-propulsion');
    if (boat.isCapsized()) return this.refuse(context, 'act.deed', 'She is upside down.', 'capsized');
    if (!MixinApi.isEngaged(giver)) return this.refuse(context, 'act.deed', 'You cannot paddle.', 'not-engaged');
    const water = (await StuffApi.singleton<Stuff>(WARREN_PATH).catch(() => null)) as unknown as PaddleWater | null;
    if (!water || typeof water.riverAt !== 'function') {
      return this.refuse(context, 'act.deed', 'There is no water here that goes anywhere.', 'no-river');
    }
    const word = (model.heading ?? 'downstream').trim().toLowerCase();
    const room = (boat as unknown as { getContainer(): Stuff | null }).getContainer();
    let heading: PropelHeading | undefined = WORDS[word];
    let target = '';
    if (heading === undefined && room !== null && MixinApi.isExitable(room)) {
      // A landing within hail, by the way's own name (`quay`, `towpath`).
      const exit = room.getExit(word) as unknown as { getWay?(): string; getTarget?(): string } | undefined;
      if (exit?.getWay?.() === 'place') {
        heading = 'place';
        target = exit.getTarget?.() ?? '';
      } else if (word === 'bar' || word === 'bank' || word === 'ashore') {
        const river = await water.riverAt(room);
        heading = river?.barSide ?? (river ? 'left' : undefined);
      }
    }
    if (heading === undefined) {
      return this.refuse(context, 'act.deed', `Paddle which way — downstream, upstream, left, right, or to a landing you can see?`, 'which-way');
    }
    const propel = new Propel({
      actor: giver,
      boat,
      heading,
      target,
      inside: model.inside === true,
      hard: model.hard === true,
      water,
    });
    const started = SchedulerApi.start(propel);
    if (!started.ok) return this.refuse(context, 'act.deed', 'Your hands are already busy.', 'engagement-conflict');
    const kind = part.getPropulsionKind();
    const verb = kind === 'pole' ? 'pole' : kind === 'oar' ? 'row' : 'paddle';
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`You take up the ${kind} and ${verb} ${heading === 'place' ? 'for the landing' : heading}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} takes up the ${kind} and ${verb}s.`)
      .send();
  }
}
