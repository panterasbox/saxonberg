/**
 * `rive` — the controller after the binder (the view's shapes are pinned
 * in `rive.test.ts`). The giver has no engagement capacity, so
 * `engageStep` applies the effect at once (the degenerate fallback); the
 * completion is async and awaited by settling the microtask queue — the
 * `FellController.test` shape.
 *
 * ⭐ The bole arm: one length off the trunk becomes a STACK of green
 * billets of the bole's own wood, landed where the bole lies.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RiveController, { BILLET_PATH, BILLET_KG, type RiveModel } from '../idea/cmd/forestry/RiveController';
import Bole, { BOLE_LENGTHS, TIMBER_MASS_KG } from '../thing/Bole';
import Billet from '../thing/Billet';
import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import Material from '@saxonberg/server/mud/lib/material/Material';
import { CommandGiverMixin } from '@saxonberg/server/mud/lib/command/CommandGiver';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import { SensorMixin } from '@saxonberg/server/mud/lib/message/Sensor';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import { CommandApi, type CommandContext, type ModelData } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ShadowApi } from '@saxonberg/server/mud/api/shadow';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

class TestGiver extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
) {
  static _mixinName = 'TestGiverRive';
  received: unknown[] = [];
  protected handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

const OAK_WOOD = '/stuff/idea/material/wood/oak';

let seq = 0;
const fresh = (p: string): string => `${p}-${++seq}`;

function oak(): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('oak');
    m.setTags(['wood']);
    m.setDensity(Quantity.of(750, 'kg/m³'));
    return m;
  }, OAK_WOOD) as unknown as Material;
}

function tool(caps: string[], name: string): Tool {
  return makeStuffAtPath(() => {
    const t = new Tool();
    t.setShortDescription(name);
    t.setCapabilities(caps);
    return t;
  }, fresh('/trade/carpentry/thing/_tool'));
}

function ctx(giver: TestGiver, room: Stuff): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: room as never,
    commandText: 'rive',
    executionId: 'test',
    commandId: 'test',
    verb: 'rive',
    command: CommandDefinition.fromYaml(
      'verbs: [rive]\ncontroller: NoopController\ndescription: stub\n',
      '<test>',
    ),
  });
}
const one = (stuff: Stuff | null, raw: string): MqlOneResult => ({ stuff, raw });
function model(target?: MqlOneResult, froe?: MqlOneResult, into?: string): RiveModel {
  return { target, froe, into } as ModelData as unknown as RiveModel;
}
const reasons = (c: CommandContext): string[] =>
  c.getNotes().map((n) => (n as { reason?: string }).reason ?? '');
const settle = async (): Promise<void> => {
  for (let i = 0; i < 20; i += 1) await new Promise((r) => setTimeout(r, 0));
};

describe('rive', () => {
  let wood: Material;
  let room: Stuff;
  let giver: TestGiver;
  let bole: Bole;

  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    vi.spyOn(PersistableApi, 'captureHostOf').mockImplementation((async () => {}) as unknown as typeof PersistableApi.captureHostOf);
    wood = oak();
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      if (path === BILLET_PATH) {
        return makeStuffAtPath(() => {
          const b = new Billet();
          b.setShortDescription('riven billet');
          b.setMass(Quantity.of(BILLET_KG, 'kg'));
          return b;
        }, path);
      }
      throw new Error(`no template ${path}`);
    }) as unknown as typeof StuffApi.clone);

    room = makeStuff(() => new (ContainerMixin(NamedMixin(Idea)))()) as unknown as Stuff;
    giver = makeStuffAtPath(() => new TestGiver(), fresh('/platform/agent/Avatar/_river'));
    ContainmentApi.move(giver, room as never);
    bole = makeStuffAtPath(() => {
      const b = new Bole();
      b.setMaterial(wood);
      b.setMass(Quantity.of(675, 'kg'));
      return b;
    }, fresh('/trade/forestry/thing/bole'));
    ContainmentApi.move(bole, room as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ `rive bole` — one length off the trunk is a stack of green billets of its wood', async () => {
    const froe = tool(['riving'], 'froe');
    ContainmentApi.move(froe, giver);
    const c = ctx(giver, room);
    await makeStuff(() => new RiveController()).execute(model(one(bole, 'bole'), one(froe, 'froe')), c);
    await settle();
    expect(reasons(c)).toEqual([]);
    expect(bole.getLengthsLeft()).toBe(BOLE_LENGTHS - 1);
    const billets = (room as unknown as { getContents(): Stuff[] })
      .getContents()
      .filter((s): s is Billet => s instanceof Billet);
    expect(billets).toHaveLength(1);
    const stack = billets[0]!;
    expect(stack.getQuantity()).toBe(Math.floor(TIMBER_MASS_KG / BILLET_KG));
    expect(stack.getMaterial()?.getName()).toBe('oak');
    // A bole is green wood, and riving dries nothing.
    expect(stack.getSeasonedFraction()).toBe(0);
  });

  it('no froe bound: refused, naming the froe', async () => {
    const c = ctx(giver, room);
    await makeStuff(() => new RiveController()).execute(model(one(bole, 'bole')), c);
    expect(reasons(c)).toContain('no-froe');
    expect(JSON.stringify(giver.received)).toMatch(/froe/);
    expect(bole.getLengthsLeft()).toBe(BOLE_LENGTHS);
  });

  it('a tool that does not rive: refused in words', async () => {
    const hook = tool(['cutting'], 'billhook');
    ContainmentApi.move(hook, giver);
    const c = ctx(giver, room);
    await makeStuff(() => new RiveController()).execute(model(one(bole, 'bole'), one(hook, 'billhook')), c);
    expect(reasons(c)).toContain('wrong-tool');
  });

  it('a spent bole: nothing left but the butt', async () => {
    const froe = tool(['riving'], 'froe');
    ContainmentApi.move(froe, giver);
    bole.setLengthsLeft(0);
    const c = ctx(giver, room);
    await makeStuff(() => new RiveController()).execute(model(one(bole, 'bole'), one(froe, 'froe')), c);
    expect(reasons(c)).toContain('bole-spent');
  });

  it('a thing that is neither a bole nor a billet is not riven', async () => {
    const froe = tool(['riving'], 'froe');
    ContainmentApi.move(froe, giver);
    const c = ctx(giver, room);
    await makeStuff(() => new RiveController()).execute(model(one(froe, 'froe'), one(froe, 'froe')), c);
    expect(reasons(c)).toContain('not-rivable');
  });
});
