/**
 * `analyze water` (watershed W5/W10) — **the kernel reading a pack
 * object without importing it.**
 *
 * Two things are under test and the second one is the interesting one:
 *
 *  1. bare, it reports the ground you stand on; pointed at a thing, it
 *     reports that thing's own supply state — over the
 *     {@link SupplyReporting} SHAPE, so a realm with no water pack gets
 *     an honest sentence rather than a crash;
 *  2. ⚠⚠ it resolves the drainage catalogue with `StuffApi.singleton`
 *     (creating) and **not** `findByTemplatePath` (non-creating). With
 *     the non-creating lookup the verb reported "nothing here knows
 *     about water" forever on any realm where nothing else had happened
 *     to clone the catalogue first — and a test whose fixture built one
 *     by hand would have passed anyway. That is the
 *     roster-nothing-warms failure this codebase has paid for three
 *     times, and the test below deliberately does NOT pre-create it.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AnalyzeWaterController from '../AnalyzeWaterController';
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
  protected handleMessage(): void {}
  protected handleEnvelope(): void {}
}

/** A thing that answers the supply SHAPE — no water-pack import here. */
class FakeSupply extends Thing {
  public asked = 0;
  public async supplyReport(
    nowS: number,
  ): Promise<{ label: string; state: null; lines: string[] }> {
    this.asked += 1;
    return {
      label: 'the city intake',
      state: null,
      lines: [`asked at ${Math.round(nowS)}`],
    };
  }
}

const stubCommand = CommandDefinition.fromYaml(
  'verbs: [analyze]\ncontroller: x\ndescription: d\n',
  '<test>',
);

let actor: TestActor;
let room: Location;

function ctx(): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: room as never,
    commandText: 'analyze water',
    executionId: 't',
    commandId: 't',
    verb: 'analyze',
    command: stubCommand,
  });
}

async function analyze(target: Stuff | null): Promise<CommandContext> {
  const c = ctx();
  const ctrl = makeStuff(() => new AnalyzeWaterController());
  await ctrl.execute(
    target === null
      ? ({} as never)
      : ({ target } as never),
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
  await ContainmentApi.move(actor as never, room as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('pointed at a thing, it goes over the SHAPE', () => {
  it('a supply answers, and the kernel never imported its class', async () => {
    const supply = makeStuffAtPath(
      () => new FakeSupply(),
      '/system/water/thing/Conduit/_analyze-test',
    ) as FakeSupply;
    await ContainmentApi.move(supply as never, room as never);

    const c = await analyze(supply);
    expect(refusal(c)).toBeNull();
    expect(supply.asked).toBe(1);
  });

  it('a thing that carries no water declines in its own words', async () => {
    const rock = makeStuff(() => {
      const t = new Thing();
      t.setShortDescription('a rock');
      return t;
    });
    await ContainmentApi.move(rock as never, room as never);
    expect(refusal(await analyze(rock))).toBe('not-a-supply');
  });
});

describe('⚠⚠ the catalogue is resolved CREATINGLY — nothing pre-warms it', () => {
  it('bare, on ground off the watershed, it says so rather than crashing', async () => {
    // No locality, no catalogue row, nothing cloned by anybody. The
    // honest answer is a sentence, not an exception.
    const c = await analyze(null);
    expect(refusal(c)).toBeNull();
  });

  it('it asks StuffApi.singleton for the catalogue — the creating lookup', async () => {
    const singleton = vi.spyOn(StuffApi, 'singleton');
    // Give the actor's place a locality that declares a reach, so the
    // controller gets as far as wanting the drainage.
    const locality = makeStuffAtPath(() => {
      const l = new Idea() as unknown as { getReach: () => string };
      (l as unknown as { getReach: () => string }).getReach = () =>
        'kestrel:confluence';
      return l as unknown as Idea;
    }, '/stuff/idea/Locality/_analyze-test');
    const { AddressApi } = await import('@saxonberg/server/mud/api/address');
    vi.spyOn(AddressApi, 'resolveLocalityFor').mockResolvedValue(
      locality as never,
    );

    await analyze(null);

    // ⭐ The assertion that would have caught the bug: the controller
    // must ASK for the catalogue to exist, not hope somebody else made
    // it. `findByTemplatePath` would never appear here.
    expect(
      singleton.mock.calls.some(
        (call) => call[0] === '/system/water/idea/WatercourseCatalogue',
      ),
    ).toBe(true);
  });
});
