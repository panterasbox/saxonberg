/**
 * One loaf, three grades (sugar W2/D6): the loaf reads its colour head to
 * foot, and `cut` with nips breaks it into three pieces of their bands.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Place from '@saxonberg/server/mud/lib/stuff/Place';
import Provision from '@saxonberg/server/mud/platform/thing/Provision';
import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import SugarLoaf from '../thing/SugarLoaf';

const settle = async (): Promise<void> => {
  for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 0));
};

function loaf(band: string): SugarLoaf {
  const l = makeStuff(() => new SugarLoaf());
  l.setMass(Quantity.of(6, 'kg'));
  if (MixinApi.isGraded(l)) l.setGrade(Grade.of(band));
  return l;
}

describe('a sugar loaf', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    vi.restoreAllMocks();
  });

  it('⭐ unclayed it is muscovado throughout; clayed through, white · pale · brown', () => {
    const l = loaf('fine');
    expect(l.colourLine()).toBe('muscovado from head to foot');
    l.percolationReach = 1;
    expect(l.colourLine()).toBe('white at the head, pale through the middle and brown at the foot');
    l.percolationReach = 0.4;
    expect(l.getBands()).toEqual(['exceptional', 'poor', 'poor']);
  });

  it('will not cut without nips', async () => {
    const l = loaf('fine');
    const actor = makeStuff(() => new Place());
    const plan = await l.cutPlan({ actor, tools: [], raw: null, options: {} });
    expect(plan.ok).toBe(false);
  });

  it('⭐ nipped, it breaks into three pieces of its three bands', async () => {
    vi.spyOn(StuffApi, 'clone').mockImplementation((async () =>
      makeStuff(() => new Provision())) as unknown as typeof StuffApi.clone);
    const scene = { topic: () => scene, toSelf: () => scene, toPeers: () => scene, send: () => undefined };
    vi.spyOn(MessageApi, 'scene').mockReturnValue(scene as never);
    const room = makeStuff(() => new Place());
    const l = loaf('fine');
    l.percolationReach = 1;
    ContainmentApi.move(l, room);
    const nips = makeStuff(() => new Tool());
    nips.setCapabilities(['nipping']);
    const plan = await l.cutPlan({ actor: room, tools: [nips], raw: null, options: {} });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    plan.onComplete();
    await settle();
    const pieces = room.getContents().filter((c) => c instanceof Provision && !(c instanceof SugarLoaf));
    expect(pieces).toHaveLength(3);
    const bands = pieces.map((p) => (MixinApi.isGraded(p) ? p.getGrade().getBand() : ''));
    expect(bands).toEqual(['exceptional', 'fine', 'fair']);
    expect(l.isDestroyed()).toBe(true);
  });
});
