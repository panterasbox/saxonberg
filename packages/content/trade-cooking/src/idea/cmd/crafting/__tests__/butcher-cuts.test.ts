/**
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
import Location from '@saxonberg/server/mud/lib/stuff/Location';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ConstructedMixin } from '@saxonberg/server/mud/lib/material/Constructed';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';

const SPECIES = '/stuff/idea/species/_test/cutbeast';
const PLAN = '/stuff/idea/species/BodyPlan/_test/cutplan';
const LOIN_M = '/stuff/idea/material/tissue/muscles/_loin';
const SHOULDER_M = '/stuff/idea/material/tissue/muscles/_shoulder';
const LOIN_ROW = '/trade/cooking/thing/_cut-loin';
const SHOULDER_ROW = '/trade/cooking/thing/_cut-shoulder';

class TestRoom extends ContainerMixin(Location) {}
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

/** A saw / cleaver by capability word. */
function tool(cap: string): Tool {
  const t = makeStuff(() => new Tool());
  t.setCapabilities([cap]);
  return t;
}

/** The world: two muscles, a plan that carries them, two cut rows. */
function world(): Species {
  const loin = makeStuffAtPath(() => new Muscle(), LOIN_M);
  loin.setWork(0.25);
  const shoulder = makeStuffAtPath(() => new Muscle(), SHOULDER_M);
  shoulder.setWork(0.8);
  const plan = makeStuffAtPath(() => new BodyPlan(), PLAN);
  plan.setName('cutplan');
  plan.setBodyParts([
    {
      key: 'body.torso',
      parent: null,
      tissues: [{ tissuePath: LOIN_M, share: 0.3 }],
    },
    {
      key: 'body.leg.frontLeft',
      parent: 'body.torso',
      tissues: [{ tissuePath: SHOULDER_M, share: 0.7 }],
    },
  ]);
  const sp = makeStuffAtPath(() => new Species(), SPECIES);
  sp._bodyPlanPath = PLAN;
  sp.setButcheryYield([
    { cut: LOIN_ROW, units: 1 },
    { cut: SHOULDER_ROW, units: 1 },
  ]);
  return sp;
}

/** The cut rows, as a clone stub — the rows themselves are content. */
function installCloneStub(difficulty: Difficulty = 'easy'): Stuff[] {
  const minted: Stuff[] = [];
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
    const c = makeStuff(() => new Cut());
    c.setShortDescription(path.split('/').pop() ?? 'cut');
    c.setMass(Quantity.of(1, 'kg'));
    if (path === LOIN_ROW) {
      c.tissues = [LOIN_M];
      c.cutting = 'boneless';
      c.difficulty = difficulty;
      c.setKeywords(['loin']);
    } else if (path === SHOULDER_ROW) {
      c.tissues = [SHOULDER_M];
      c.cutting = 'bone-in';
      c.difficulty = difficulty;
      c.setKeywords(['shoulder']);
    } else {
      c.setKeywords(['trim']);
    }
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

describe('⭐⭐ the tool is the depth', () => {
  it('a knife alone leaves the BONE-IN joint on the carcass', async () => {
    const sp = world();
    const minted = installCloneStub();
    const body = corpse(sp);
    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(model(body), ctx());

    // The boneless loin came off; the bone-in shoulder did not.
    const kept = survivors(minted).filter((c) => MixinApi.isCut(c));
    const stems = kept.map((c) => (c as unknown as Cut).getTissues()[0]);
    expect(stems).toContain(LOIN_M);
    expect(stems).not.toContain(SHOULDER_M);
    // ⭐⭐ And the body STAYS, because a line is still on it.
    expect(body.isDestroyed()).toBe(false);
    expect(body.hasTissue(SHOULDER_M)).toBe(true);
  });

  it('⭐ with a SAW the joint comes off, and then the body is spent', async () => {
    const sp = world();
    const minted = installCloneStub();
    const body = corpse(sp);
    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(
      model(body, { tools: { stuff: [tool('saw')] } as unknown as MqlManyResult }),
      ctx(),
    );
    const stems = survivors(minted)
      .filter((c) => MixinApi.isCut(c))
      .map((c) => (c as unknown as Cut).getTissues()[0]);
    expect(stems).toContain(LOIN_M);
    expect(stems).toContain(SHOULDER_M);
    // Every line is off it now.
    expect(body.isDestroyed()).toBe(true);
  });
});

describe('⭐⭐⭐ the carcass reduces', () => {
  it('a second butchering cannot take the same muscle twice', async () => {
    const sp = world();
    installCloneStub();
    const body = corpse(sp);
    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(model(body), ctx());
    expect(body.hasTissue(LOIN_M)).toBe(false);

    const minted2 = installCloneStub();
    await ctrl.execute(model(body), ctx());
    // Nothing new off the loin — it is already gone.
    const again = survivors(minted2)
      .filter((c) => MixinApi.isCut(c))
      .map((c) => (c as unknown as Cut).getTissues()[0]);
    expect(again).not.toContain(LOIN_M);
  });

  it('⭐⭐ `for <cut>` takes ONE line and leaves the rest hanging', async () => {
    const sp = world();
    const minted = installCloneStub();
    const body = corpse(sp);
    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(
      model(body, {
        cut: 'loin',
        tools: { stuff: [tool('saw')] } as unknown as MqlManyResult,
      }),
      ctx(),
    );
    // ⭐ The saw was in hand and the shoulder was reachable — it was not
    // asked for, so it is still on the body.
    expect(body.hasTissue(LOIN_M)).toBe(false);
    expect(body.hasTissue(SHOULDER_M)).toBe(true);
    expect(body.isDestroyed()).toBe(false);
    void minted;
  });

  it('⚠ a cut this animal does not have is refused in words', async () => {
    const sp = world();
    installCloneStub();
    const body = corpse(sp);
    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(model(body, { cut: 'porterhouse' }), ctx());
    expect(notes.map((n) => n.reason)).toContain('no-such-cut');
    expect(body.isDestroyed()).toBe(false);
  });
});

describe('⭐⭐ the cut knows what it is OF', () => {
  it('stamps the species, so texture weighs by how much of the animal it is', async () => {
    const sp = world();
    const minted = installCloneStub();
    const body = corpse(sp);
    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(model(body), ctx());
    const loin = survivors(minted).find(
      (c) => MixinApi.isCut(c) && (c as unknown as Cut).getTissues()[0] === LOIN_M,
    ) as unknown as Cut;
    expect(loin.getSpeciesPath()).toBe(SPECIES);
    // ⭐ And the derived texture is the muscle's, not anything authored.
    expect(loin.textureBand()).toBe('tender');
  });

  it('⭐⭐ the MASS is the animal’s share, not the row’s default', async () => {
    const sp = world();
    const minted = installCloneStub();
    // 30 % of 100 kg is the loin, in one piece.
    const body = corpse(sp, 100);
    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(model(body), ctx());
    const loin = survivors(minted).find(
      (c) => MixinApi.isCut(c) && (c as unknown as Cut).getTissues()[0] === LOIN_M,
    )!;
    const kg = (loin as unknown as { getMass(): Quantity<'kg'> })
      .getMass()
      .rawValue();
    // Not the row's authored 1.0 kg — the share of this animal.
    expect(kg).toBeGreaterThan(5);
  });
});

describe('⭐⭐⭐ the hand decides JOINT or TRIM', () => {
  it('an untrained hand leaves TRIM where a standard joint should be', async () => {
    const sp = world();
    // ⭐ The Discipline's own sentence — "which cut is which" — made true,
    // and it puts skill in the OUTPUT where a player can see it instead
    // of in a mass multiplier nobody can read.
    const minted = installCloneStub('standard');
    const body = corpse(sp);
    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(model(body), ctx());
    const kept = survivors(minted).filter((c) => MixinApi.isCut(c));
    // Nothing claims the loin muscle: what came off is trim.
    expect(
      kept.map((c) => (c as unknown as Cut).getTissues()[0]),
    ).not.toContain(LOIN_M);
    expect(kept.length).toBeGreaterThan(0);
  });

  it('⭐ an EASY cut comes off cleanly for the same hand', async () => {
    const sp = world();
    const minted = installCloneStub('easy');
    const body = corpse(sp);
    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(model(body), ctx());
    expect(
      survivors(minted)
        .filter((c) => MixinApi.isCut(c))
        .map((c) => (c as unknown as Cut).getTissues()[0]),
    ).toContain(LOIN_M);
  });
});
