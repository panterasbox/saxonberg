/**
 * `[capability.X]` — ⭐⭐ **what a tool OFFERS, as against what it IS.**
 *
 * `[mixin.ToolMixin]` finds every tool in the room; `[capability.digging]`
 * finds the one you can dig with. Until this atom existed MQL had only
 * the first kind of question, so every verb that needed *the thing that
 * can do job Y* hand-rolled a walk over the room and the inventory
 * instead of declaring an arg — the census `lint:instrument-args` holds.
 *
 * ⚠ A capability is a mixin FIELD, not a `PropertiedMixin` property, so
 * `[prop.digging]` reads different storage and will never see it. The
 * last test pins that, because the two read so alike in a query that a
 * reader could reasonably expect either to work.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import Thing from '../../lib/stuff/Thing';
import { ToolMixin } from '../../lib/craft/Tooled';
import { NamedMixin } from '../../lib/description/Named';
import { PerceptibleMixin } from '../../lib/description/Perceptible';
import { VisibleMixin } from '../../lib/description/Visible';
import { CommandGiverMixin } from '../../lib/command/CommandGiver';
import { SensorMixin } from '../../lib/message/Sensor';
import { StuffApi } from '../stuff';
import { MqlApi } from '../mql';
import type { MqlContext } from '../mql/types';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { Idea } from '../../lib/stuff/Idea';
import { ContainmentApi } from '../containment';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

/*
 * ⚠ The perception mixins are load-bearing in a fixture, not decoration.
 * MQL's seeds are viewer-scoped, so a candidate the giver cannot
 * PERCEIVE is filtered out before any bracket filter runs — a fixture
 * missing `Perceptible`/`Visible` returns an empty set for every query,
 * including `[mixin.ToolMixin]`, which reads exactly like a broken
 * filter. These shapes mirror `fixtures/mql-world.ts`.
 */
class TestTool extends ToolMixin(
  VisibleMixin(NamedMixin(PerceptibleMixin(Thing))),
) {
  static _mixinName = 'TestToolCapability';
}
class TestRoom extends ContainerMixin(
  VisibleMixin(NamedMixin(PerceptibleMixin(Idea))),
) {
  static _mixinName = 'TestRoomCapability';
}
class TestActor extends ContainerMixin(
  ContainableMixin(
    SensorMixin(CommandGiverMixin(NamedMixin(PerceptibleMixin(Idea)))),
  ),
) {
  static _mixinName = 'TestActorCapability';
  protected handleMessage(): void {}
  protected handleEnvelope(): void {}
}

let room: TestRoom;
let actor: TestActor;

function tool(name: string, caps: string[]): TestTool {
  const t = makeStuff(() => new TestTool());
  t.setShortDescription(name);
  t.setKeywords([name]);
  t.setCapabilities(caps);
  return t;
}

function ctx(): MqlContext {
  return { commandGiver: actor as never, scope: 'world' };
}

/** The short descriptions of whatever resolved, defensively. */
function names(query: string): string[] {
  return MqlApi.resolveMany(query, ctx())
    .stuff.map((s) => {
      const d = s as unknown as { getShortDescription?(): string };
      return typeof d.getShortDescription === 'function'
        ? d.getShortDescription()
        : '';
    })
    .filter((n) => n.length > 0)
    .sort();
}

beforeEach(async () => {
  StuffApi.clearAll();
  room = makeStuff(() => new TestRoom());
  actor = makeStuff(() => new TestActor());
  await ContainmentApi.move(actor as never, room as never);
});

describe('[capability.X] narrows a set to what can do the job', () => {
  it('⭐ finds the tool that offers the capability, not every tool', async () => {
    const spade = tool('spade', ['digging']);
    const scythe = tool('scythe', ['reaping']);
    for (const t of [spade, scythe]) {
      await ContainmentApi.move(t as never, actor as never);
    }
    // The question MQL could already ask.
    expect(names('me:i:[mixin.ToolMixin]')).toEqual(['scythe', 'spade']);
    // The question it could not.
    expect(names('me:i:[capability.digging]')).toEqual(['spade']);
  });

  it('matches case-insensitively on the QUERY side', async () => {
    // ⚠ Only the query side can vary: `ToolCapabilities.isCapabilityName`
    // validates stored names against /^[a-z][a-z0-9-]*$/, so a tool
    // cannot carry `Surveying` in the first place. What a player types
    // can be anything, and the lexer lowercases barewords.
    const t = tool('dial', ['surveying']);
    await ContainmentApi.move(t as never, actor as never);
    expect(names('me:i:[capability.SURVEYING]')).toEqual(['dial']);
  });

  it('a tool offering several capabilities answers to each', async () => {
    const t = tool('multitool', ['digging', 'whetstone']);
    await ContainmentApi.move(t as never, actor as never);
    expect(names('me:i:[capability.digging]')).toEqual(['multitool']);
    expect(names('me:i:[capability.whetstone]')).toEqual(['multitool']);
  });

  it('⚠ a NON-tool answers false rather than throwing', async () => {
    // So `[capability.X]` is safe over a mixed set — which is the normal
    // case, since a room holds furniture and people as well as tools.
    const rock = makeStuff(() => {
      const r = new Thing();
      r.setShortDescription('rock');
      return r;
    });
    await ContainmentApi.move(rock as never, actor as never);
    expect(() => names('me:i:[capability.digging]')).not.toThrow();
    expect(names('me:i:[capability.digging]')).toEqual([]);
  });

  it('⭐ a HYPHENATED capability lexes — `timber-set`, `soil-testing`', async () => {
    // ⚠ Worth pinning rather than assuming: `scanWord` accepts a hyphen
    // only BETWEEN word characters, and a good third of the shipped
    // capability names carry one. If this ever regressed, every
    // hyphenated capability arg would stop parsing at once.
    const set = tool('timbers', ['timber-set']);
    await ContainmentApi.move(set as never, actor as never);
    expect(names('me:i:[capability.timber-set]')).toEqual(['timbers']);
  });

  it('an unknown capability matches nothing, quietly', async () => {
    const t = tool('spade', ['digging']);
    await ContainmentApi.move(t as never, actor as never);
    expect(names('me:i:[capability.frobnicating]')).toEqual([]);
  });

  it('composes with the other atoms', async () => {
    const spade = tool('spade', ['digging']);
    const trowel = tool('trowel', ['digging']);
    for (const t of [spade, trowel]) {
      await ContainmentApi.move(t as never, actor as never);
    }
    expect(names('me:i:[capability.digging and keyword.spade]')).toEqual([
      'spade',
    ]);
    expect(names('me:i:[capability.digging and not keyword.spade]')).toEqual([
      'trowel',
    ]);
  });

  it('⚠⚠ `[prop.X]` is NOT the same question and never was', async () => {
    // A capability is a mixin FIELD; `prop.` reads `PropertiedMixin`
    // storage. The two read alike in a query and a reader could
    // reasonably expect either to work, so this pins that they do not.
    const spade = tool('spade', ['digging']);
    await ContainmentApi.move(spade as never, actor as never);
    expect(names('me:i:[capability.digging]')).toEqual(['spade']);
    expect(names('me:i:[prop.digging]')).toEqual([]);
  });
});
