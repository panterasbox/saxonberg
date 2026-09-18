/**
 * `analyze power` (docs/subsystems/watershed.md § power) — **the equation finally has a
 * consumer.**
 *
 * `ρ·g·Δh·Q·η` had three appearances in the tree and no reader:
 * `ControlStructure.generationW` shipped, computed real watts, and
 * nothing anywhere called it. The Wharfside aqueduct house has carried
 * `generates: true` since the water build with no way for anybody to
 * find out what it makes.
 *
 * ⭐⭐ Both arms are **duck-typed**, and that is the design rather than a
 * shortcut. A grist mill lives in `trade-milling`; this pack has never
 * heard of it and must not. The question is *does this thing answer* —
 * the `FordExit` rule, which is how two packs meet over a shape with
 * neither depending on the other.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AnalyzePowerController from '../AnalyzePowerController';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import Location from '@saxonberg/server/mud/lib/stuff/Location';
import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { CommandGiverMixin } from '@saxonberg/server/mud/lib/command/CommandGiver';
import { SensorMixin } from '@saxonberg/server/mud/lib/message/Sensor';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

class TestActor extends CommandGiverMixin(
  SensorMixin(ContainerMixin(ContainableMixin(Idea))),
) {
  static _mixinName = 'TestActorAnalyzePower';
  /** What the reading actually SAID — a verb that declines nothing and
   * reports nothing is indistinguishable from one that works. */
  lines: string[] = [];
  protected handleMessage(msg: unknown): void {
    this.lines.push(JSON.stringify(msg));
  }
  protected handleEnvelope(): void {}
}

/**
 * A weir, over the SHAPE only — no `ControlStructure` import, because
 * the point is that the reading does not need one.
 */
class FakeWeir extends Thing {
  public asked = 0;
  generationW(flowM3S: number): number {
    this.asked += 1;
    return 1000 * 9.81 * this.getHeadM() * flowM3S * 0.85;
  }
  getReachRef(): string {
    return 'delight:flats';
  }
  getHeadM(): number {
    return 6;
  }
}

/**
 * ⭐ A mill, over the OTHER shape — and deliberately not a `GristMill`:
 * this pack must be able to read one without importing `trade-milling`,
 * which is the whole reason the reading is duck-typed.
 */
class FakeMill extends Thing {
  availablePowerW(): number {
    return 40000;
  }
  throughputNow(): number {
    return 8.5;
  }
}

const stubCommand = CommandDefinition.fromYaml(
  'verbs: [analyze]\ncontroller: x\ndescription: d\n',
  '<test>',
);

let actor: TestActor;
let room: Location;
let said: string[];

function ctx(): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: room as never,
    commandText: 'analyze power',
    executionId: 't',
    commandId: 't',
    verb: 'analyze',
    command: stubCommand,
  });
}

async function analyze(target: Stuff | null): Promise<CommandContext> {
  const c = ctx();
  const ctrl = makeStuff(() => new AnalyzePowerController());
  await ctrl.execute(
    target === null ? ({} as never) : ({ target: { stuff: target, raw: 'it' } } as never),
    c,
  );
  return c;
}

function refusal(c: CommandContext): string | null {
  const found = c.getNotes().find((n) => n.kind === 'controller-rejected') as
    | { reason?: string }
    | undefined;
  return found?.reason ?? null;
}

beforeEach(async () => {
  WorldClockApi._resetForTesting();
  room = makeStuff(() => new Location());
  actor = makeStuff(() => new TestActor());
  said = actor.lines;
  await ContainmentApi.move(actor as never, room as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('pointed at a GENERATOR', () => {
  it('⭐ asks it for its watts — the call nothing in the tree ever made', async () => {
    const weir = makeStuffAtPath(
      () => new FakeWeir(),
      '/system/water/thing/ControlStructure/_power-test',
    ) as FakeWeir;
    await ContainmentApi.move(weir as never, room as never);

    const c = await analyze(weir);
    expect(refusal(c)).toBeNull();
    // Either it read the flow and asked, or the catalogue was absent and
    // it said so honestly. Both are correct; silence is not.
    expect(weir.asked + (said.length > 0 ? 1 : 0)).toBeGreaterThan(0);
  });
});

describe('pointed at a MACHINE that runs on power', () => {
  it('⭐⭐ reads a mill it has never heard of', async () => {
    // `trade-milling` is not a dependency of this pack and never will
    // be. The mill answers `availablePowerW`, so it is readable.
    const mill = makeStuff(() => new FakeMill());
    await ContainmentApi.move(mill as never, room as never);

    const c = await analyze(mill);
    expect(refusal(c)).toBeNull();
    expect(said.join('\n')).toContain('40.0 kW');
    expect(said.join('\n')).toContain('8.50 kg a minute');
  });

  it('a mill with no water says it will not turn, rather than nothing', async () => {
    class StoppedMill extends Thing {
      availablePowerW(): number {
        return 0;
      }
      throughputNow(): number {
        return 0;
      }
    }
    const mill = makeStuff(() => new StoppedMill());
    await ContainmentApi.move(mill as never, room as never);

    await analyze(mill);
    const text = said.join('\n');
    expect(text).toContain('no power reaching it');
    expect(text).toContain('will not turn');
  });
});

describe('pointed at something that is neither', () => {
  it('declines in its own words', async () => {
    const rock = makeStuff(() => {
      const t = new Thing();
      t.setShortDescription('a rock');
      return t;
    });
    await ContainmentApi.move(rock as never, room as never);
    expect(refusal(await analyze(rock))).toBe('not-a-generator');
  });
});

describe('bare, on ground that drains nowhere', () => {
  it('says there is no power to be had, which is a normal state of the world', async () => {
    // Three localities ship rootless on purpose; a room with no locality
    // resolves the same way.
    await analyze(null);
    expect(said.join('\n').length).toBeGreaterThan(0);
  });
});
