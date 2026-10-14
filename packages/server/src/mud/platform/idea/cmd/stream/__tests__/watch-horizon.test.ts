/**
 * `watch horizon` (maritime R6): the stream verb keeps a WATCH when its
 * target is the horizon — a `HorizonWatch` on the watcher's attention —
 * for anybody who can be engaged, a hired NPC lookout included (no
 * player client needed). `watch off` stands it down.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WatchController from '../WatchController';
import { EngagedMixin } from '../../../../../lib/activity/Engaged';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { Idea } from '../../../../../lib/stuff/Idea';
import Location from '../../../../../lib/stuff/Location';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import { StuffApi } from '../../../../../api/stuff';
import { MessageApi } from '../../../../../api/message';
import { SchedulerApi } from '../../../../../api/scheduler';
import { HorizonWatch, HORIZON_WATCH_TYPE } from '../../../../../lib/perception/HorizonWatch';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';

/** No SaxonbergClient: an NPC can keep a watch. */
class Lookout extends EngagedMixin(SensorMixin(CommandGiverMixin(ContainableMixin(Idea)))) {
  static _mixinName = 'WatchHorizonLookout';
}

let actor: Lookout;
let said: string[] = [];

function ctx(): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: makeStuff(() => new Location()) as never,
    commandText: 'watch horizon',
    executionId: 't',
    commandId: 't',
    verb: 'watch',
    command: CommandDefinition.fromYaml('verbs: [watch]\ncontroller: WatchController\ndescription: stub\n', '<t>'),
  });
}

beforeEach(() => {
  StuffApi.clearAll();
  said = [];
  actor = makeStuff(() => new Lookout());
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (m: { toString(): string }) => { said.push(m.toString()); return b; };
    b.send = () => {};
    return b as never;
  });
});
afterEach(() => vi.restoreAllMocks());

describe('watch horizon', () => {
  it('⭐ starts a HorizonWatch on the watcher — no player client needed', async () => {
    const start = vi.spyOn(SchedulerApi, 'start').mockReturnValue({ ok: true } as never);
    await makeStuff(() => new WatchController()).execute({ target: 'horizon' } as never, ctx());
    expect(start).toHaveBeenCalledTimes(1);
    expect(start.mock.calls[0]![0]).toBeInstanceOf(HorizonWatch);
    expect(said.join('\n')).toMatch(/You settle to watching the horizon/);
  });

  it('a watch already kept is not started twice', async () => {
    vi.spyOn(actor, 'getEngagementByType').mockImplementation(
      (t: string) => (t === HORIZON_WATCH_TYPE ? ({} as never) : undefined),
    );
    const start = vi.spyOn(SchedulerApi, 'start');
    await makeStuff(() => new WatchController()).execute({ target: 'Horizon' } as never, ctx());
    expect(start).not.toHaveBeenCalled();
    expect(said.join('\n')).toMatch(/already keeping a watch/);
  });

  it('`watch off` stands it down', async () => {
    const w = {} as never;
    vi.spyOn(actor, 'getEngagementByType').mockImplementation(
      (t: string) => (t === HORIZON_WATCH_TYPE ? w : undefined),
    );
    const cancel = vi.spyOn(SchedulerApi, 'cancel').mockImplementation(() => {});
    await makeStuff(() => new WatchController()).execute({ subcommand: 'off' } as never, ctx());
    expect(cancel).toHaveBeenCalledWith(w, 'cancelled');
    expect(said.join('\n')).toMatch(/stand down/);
  });
});
