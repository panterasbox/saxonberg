/**
 * ⭐ `look` arrives as SEGMENTS (client-surface D1/D2): the card is handed
 * the same lines the terminal printed, by shape and source, in the same
 * order — so "the card says exactly what `look` said" holds by
 * construction (AC 6). Identical things group; every `──` section opens
 * on its own line (slate bug 9).
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LookController from '../LookController';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import { MessageApi } from '../../../../../api/message';
import { CardApi } from '../../../../../api/card';
import type { Mml } from '../../../../../api/mml';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../../lib/stuff/Idea';
import Place from '../../../../../lib/stuff/Place';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../../lib/description/Named';
import { VisibleMixin } from '../../../../../lib/description/Visible';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import type { LookSegment } from '@saxonberg/types';
import {
  makeStuff,
  withRootContext,
} from '../../../../../lib/security/__tests__/test-setup';

class Room extends VisibleMixin(NamedMixin(ContainerMixin(Place))) {
  static _mixinName = 'SegRoom';
}
class Bottle extends VisibleMixin(ContainableMixin(NamedMixin(Idea))) {
  static _mixinName = 'SegBottle';
}
class Box extends VisibleMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))) {
  static _mixinName = 'SegBox';
}
class Looker extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
) {
  static _mixinName = 'SegLooker';
}

let room: Room;
let looker: Looker;

function ctx(text: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: looker as never,
    location: room as never,
    commandText: text,
    executionId: 't',
    commandId: 't',
    verb: 'look',
    command: CommandDefinition.fromYaml(
      'verbs: [look]\ncontroller: NoopController\ndescription: stub\nopens_card: [subject]\n',
      '<test>',
    ),
  });
}

/** Run `look` at `target`; return the carded body and the card's segments. */
async function look(target: Stuff, text: string): Promise<{ body: string; segments: LookSegment[] }> {
  const bodies: string[] = [];
  let segments: LookSegment[] = [];
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.meta = () => b;
    b.toSelf = (body: Mml) => {
      bodies.push(body.toString(looker as never));
      return b;
    };
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
  vi.spyOn(CardApi, 'open').mockImplementation((_c, _id, opts) => {
    segments = opts?.segments ?? [];
    return 'card-1';
  });
  const c = ctx(text);
  await withRootContext(null, 'seg.test', () => {
    ExecutionContextApi.tagActingAuthor(looker as never);
    return makeStuff(() => new LookController()).execute(
      { target: { stuff: target, raw: '' } } as never,
      c,
    );
  });
  // The carded body is the longest one (the room/thing description).
  const body = bodies.reduce((a, b) => (b.length > a.length ? b : a), '');
  return { body, segments };
}

function bottle(_name: string): Bottle {
  const b = makeStuff(() => {
    const x = new Bottle();
    x.setShortDescription('bottle of gin');
    return x;
  });
  vi.spyOn(b, 'getTemplatePath').mockReturnValue('/stuff/thing/test-gin-bottle');
  return b;
}

beforeEach(() => {
  StuffApi.clearAll();
  room = makeStuff(() => {
    const r = new Room();
    r.setName('the bar');
    r.setLongDescription('A long zinc counter under low light.');
    return r;
  });
  looker = makeStuff(() => {
    const a = new Looker();
    a.setName('alice');
    return a;
  });
  ContainmentApi.move(looker as never, room as never);
});

afterEach(() => vi.restoreAllMocks());

describe('the room', () => {
  it('⭐ the segments are the body\'s lines, in order — prose first', async () => {
    for (const n of ['one', 'two', 'three']) ContainmentApi.move(bottle(n) as never, room as never);
    const { body, segments } = await look(room as unknown as Stuff, 'look');
    expect(segments[0]).toMatchObject({ shape: 'prose' });
    expect(segments[0]!.text).toContain('zinc counter');
    // Every body segment appears in the body, in order.
    let at = 0;
    for (const s of segments.filter((x) => x.shape !== 'notice')) {
      const idx = body.indexOf(s.text, at);
      expect(idx, `segment not found in order: ${s.text}`).toBeGreaterThanOrEqual(0);
      at = idx + s.text.length;
    }
  });

  it('⭐ identical things group: three bottles are ONE chip of count 3, expandable', async () => {
    for (const n of ['one', 'two', 'three']) ContainmentApi.move(bottle(n) as never, room as never);
    const { body, segments } = await look(room as unknown as Stuff, 'look');
    const seen = segments.find((s) => s.heading === 'You also see');
    expect(seen?.shape).toBe('list');
    expect(seen?.sources).toEqual([{ kind: 'look', name: 'You also see' }]);
    expect(seen?.items).toHaveLength(1);
    expect(seen!.items![0]!.count).toBe(3);
    expect(seen!.items![0]!.members).toHaveLength(3);
    expect(body).toMatch(/3 bottles of gin/);
  });
});

describe('a thing', () => {
  it('⭐ every `──` section is on its own line, and is a list segment with chips', async () => {
    const box = makeStuff(() => {
      const x = new Box();
      x.setName('box');
      x.setShortDescription('wooden box');
      x.setLongDescription('A plain wooden box.');
      return x;
    });
    ContainmentApi.move(box as never, room as never);
    ContainmentApi.move(bottle('one') as never, box as never);
    const { body, segments } = await look(box as unknown as Stuff, 'look box');
    expect(body).not.toMatch(/[^\n]──/);
    const inIt = segments.find((s) => s.heading === 'In it');
    expect(inIt).toMatchObject({ shape: 'list', sources: [{ kind: 'look', name: 'In it' }] });
    expect(inIt!.items).toHaveLength(1);
    expect(segments[0]!.text).toContain('A plain wooden box.');
  });
});
