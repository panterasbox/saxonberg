/**
 * ⭐⭐ The pelt (organism-biology D5): the skin is the FIRST line of a
 * carcass and comes off with what happened to it — a puncture is a hole at
 * the part it was on, and a hand short of the job nicks it.
 *
 * `butcher <body> [for <cut>]` — the tools gate the depth, the hand
 * decides joint or trim, and the carcass reduces.
 *
 * ⭐⭐⭐ These are the four things that turn butchery from a yield table
 * into a craft, and each one failed closed and silent before: a knife-only
 * butchering silently produced joints it had no business producing, a
 * master and a novice produced the same things, a body vanished whole, and
 * a wound on a carcass meant nothing.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import ButcherController, { type ButcherModel } from '../ButcherController';
import Corpse from '@saxonberg/server/mud/platform/thing/Corpse';
import Cut from '@saxonberg/server/mud/platform/thing/Cut';
import Muscle from '@saxonberg/server/mud/platform/idea/material/Muscle';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import BodyPlan from '@saxonberg/server/mud/platform/idea/species/BodyPlan';
import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { SpeciesApi } from '@saxonberg/server/mud/api/species';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult, MqlManyResult } from '@saxonberg/server/mud/api/mql';
import type { Difficulty } from '@saxonberg/server/mud/lib/advancement/ActSignature';
import Place from '@saxonberg/server/mud/lib/stuff/Place';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ConstructedMixin } from '@saxonberg/server/mud/lib/material/Constructed';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { TestHarnessApi } from '@saxonberg/server/mud/api/test-harness';
import { setFlatParts } from '@saxonberg/server/mud/lib/species/__tests__/flat-body';

import Provision from '@saxonberg/server/mud/platform/thing/Provision';
import Material from '@saxonberg/server/mud/lib/material/Material';
import type { Flaw } from '@saxonberg/server/mud/lib/material/Flawed';

const SPECIES = '/stuff/idea/species/_test/peltbeast';
const PLAN = '/stuff/idea/species/BodyPlan/_test/peltplan';
const LOIN_M = '/stuff/idea/material/tissue/muscles/_ploin';
const SKIN_M = '/stuff/idea/material/organic/_rawhide';
const LOIN_ROW = '/trade/cooking/thing/_pcut-loin';
const HIDE_ROW = '/trade/ranching/thing/_hide';

class TestRoom extends ContainerMixin(Place) {}
class TestKnife extends ConstructedMixin(Good) {}
class TestGiver extends NamedMixin(ContainableMixin(ContainerMixin(Idea))) {}

let room: TestRoom;
let giver: TestGiver;
let knife: TestKnife;
let notes: { kind: string; reason?: string }[] = [];

function ctx(): CommandContext {
  notes = [];
  return {
    commandGiver: giver,
    note: (n: { kind: string; reason?: string }) => notes.push(n),
  } as unknown as CommandContext;
}

function model(body: Stuff, over: Partial<ButcherModel> = {}): ButcherModel {
  return {
    body: { stuff: body, raw: 'body' } as unknown as MqlOneResult,
    blade: { stuff: [knife] } as unknown as MqlManyResult,
    block: { stuff: [] } as unknown as MqlManyResult,
    tools: { stuff: [] } as unknown as MqlManyResult,
    ...over,
  } as unknown as ButcherModel;
}

function sceneStub(): unknown {
  const leg: Record<string, unknown> = {};
  leg.toSelf = () => leg;
  leg.toPeers = () => leg;
  leg.send = () => undefined;
  leg.topic = () => leg;
  return leg;
}


function world(): Species {
  const loin = makeStuffAtPath(() => new Muscle(), LOIN_M);
  loin.setWork(0.25);
  makeStuffAtPath(() => new Material(), SKIN_M);
  const plan = makeStuffAtPath(() => new BodyPlan(), PLAN);
  setFlatParts(plan, [
    {
      key: 'body.torso',
      parent: null,
      tissues: [{ tissuePath: LOIN_M, share: 0.9 }],
      integument: { skin: { material: SKIN_M, weight: 0.1, form: 'hide' } },
      comesOffAs: [{ tissue: LOIN_M, cut: LOIN_ROW }, { tissue: SKIN_M, cut: HIDE_ROW }],
    },
  ]);
  const sp = makeStuffAtPath(() => new Species(), SPECIES);
  sp._bodyPlanPath = PLAN;
  return sp;
}

function installCloneStub(): Stuff[] {
  const minted: Stuff[] = [];
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
    if (path === HIDE_ROW) {
      const h = makeStuff(() => new Provision());
      h.setShortDescription('hide');
      h.setKeywords(['hide', 'pelt', 'skin']);
      h.setMass(Quantity.of(1, 'kg'));
      minted.push(h);
      return h;
    }
    const c = makeStuff(() => new Cut());
    c.setShortDescription('loin');
    c.setMass(Quantity.of(1, 'kg'));
    c.tissues = [LOIN_M];
    c.cutting = 'boneless';
    c.difficulty = 'easy';
    c.setKeywords(['loin']);
    minted.push(c);
    return c;
  }) as unknown as typeof StuffApi.clone);
  return minted;
}

function corpse(sp: Species, kg = 100): Corpse {
  const c = makeStuff(() => new Corpse());
  c.setLifecycleState('dead');
  c.setMass(Quantity.of(kg, 'kg'));
  c.setConditionAtDeath(100);
  c.setSpecies(sp);
  ContainmentApi.move(c, room);
  return c;
}

/** What is still in the room and not destroyed. */
function survivors(minted: Stuff[]): Stuff[] {
  return minted.filter((c) => !c.isDestroyed());
}

beforeAll(() => {
  installV1QuantityMarshallers();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

beforeEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  WorldClockApi._setNowProviderForTesting(() => 1_000_000);
  vi.spyOn(MessageApi, 'scene').mockReturnValue(sceneStub() as never);
  vi.spyOn(SpeciesApi, 'preloadAnatomy').mockResolvedValue(undefined);
  room = makeStuff(() => new TestRoom());
  giver = makeStuff(() => {
    const g = new TestGiver();
    g.setName('Iris');
    return g;
  });
  ContainmentApi.move(giver, room);
  knife = makeStuff(() => new TestKnife());
  knife.setConstructionForm('bladed');
  ContainmentApi.move(knife, room);
});


const hideOf = (minted: Stuff[]): (Stuff & { getFlaws(): readonly Flaw[] }) | undefined =>
  survivors(minted).find((m) => !MixinApi.isCut(m)) as never;

describe('⭐⭐ the pelt', () => {
  it('a puncture on the torso is a HOLE in the hide, at the torso', async () => {
    const sp = world();
    const minted = installCloneStub();
    const body = corpse(sp);
    body.afflict({ kind: 'trauma', type: 'puncture', site: 'body.torso', severity: 2, mechanism: 'point' } as never);
    const ctrl = makeStuff(() => new ButcherController());
    await ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => ctrl.execute(model(body), ctx$)))(ctx());
    const hide = hideOf(minted);
    expect(hide).toBeDefined();
    const holes = hide!.getFlaws().filter((f) => f.kind === 'holed');
    expect(holes.map((f) => f.site)).toEqual(['body.torso']);
  });

  it('⭐ an untrained hand nicks it; `for pelt` takes the hide and nothing else', async () => {
    const sp = world();
    const minted = installCloneStub();
    const body = corpse(sp);
    const ctrl = makeStuff(() => new ButcherController());
    await ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => ctrl.execute(model(body, { cut: 'pelt' } as never), ctx$)))(ctx());
    const kept = survivors(minted);
    expect(kept.every((m) => !MixinApi.isCut(m))).toBe(true);
    expect(hideOf(minted)!.getFlaws().some((f) => f.kind === 'nicked')).toBe(true);
  });
});
