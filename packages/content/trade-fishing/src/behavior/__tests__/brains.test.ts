/**
 * The fisher's two brains (fishing D16): he fishes on his own cadence
 * and never twice at once; he reads the water from the record and says
 * nothing about who emptied it.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AddressApi } from '@saxonberg/server/mud/api/address';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import Location from '@saxonberg/server/mud/lib/stuff/Location';
import Locality from '@saxonberg/server/mud/platform/idea/Locality';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { EngagedMixin } from '@saxonberg/server/mud/lib/activity/Engaged';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { standUpBranchHarness } from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import { brain as fishes } from '../fishes';
import { brain as readsWater } from '../reads-water';
import Waters, { WATERS_PATH } from '../../idea/Waters';
import Rod from '../../thing/Rod';
import { FISHING_TYPE } from '../../lib/FishingEngagement';
import type { SpeciesStanding } from '../../lib/FisheryRead';

class Fisher extends EngagedMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))) {
  static _mixinName = 'Fisher';
}

let room: Location;
let fisher: Fisher;
let standing: SpeciesStanding[];
const sp = (over: Partial<SpeciesStanding>): SpeciesStanding => ({
  speciesPath: '/stuff/idea/species/eel', name: 'eel', capacity: 180, full: 180, level: 180, fit: 1, limiting: null, stocked: false, role: 'forage', fightRating: 0.35, ...over,
});

function ctx(config: Record<string, unknown> = {}): BrainContext {
  return { host: fisher as unknown as Stuff, config, state: {}, trigger: { source: 'cadence', raw: 'cadence:90s' } } as unknown as BrainContext;
}

beforeEach(async () => {
  await standUpBranchHarness();
  standing = [sp({})];
  room = makeStuff(() => new Location());
  fisher = makeStuff(() => new Fisher());
  ContainmentApi.move(fisher as never, room as never);
  const locality = makeStuffAtPath(() => new Locality(), '/stuff/idea/Locality/wharf');
  locality.setReach('kestrel:confluence');
  vi.spyOn(AddressApi, 'resolveLocalityFor').mockResolvedValue(locality);
  const waters = makeStuffAtPath(() => new Waters(), WATERS_PATH);
  vi.spyOn(waters, 'registry').mockResolvedValue({
    standingAt: async () => ({ reachRef: 'kestrel:confluence', species: standing, water: {} as never, contamination: null }),
    readFor: (s, band) => (band === 'proficient' ? [`Plenty of ${s.species[0]?.name ?? 'fish'} in this water.`] : []),
    draw: async (_r, _s, n) => n,
    release: async () => {},
  });
});
afterEach(() => {
  SchedulerApi._clearAllForTesting();
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('fishes', () => {
  it('⭐ starts one wait with the rod in his own inventory, and never a second', async () => {
    ContainmentApi.move(makeStuff(() => new Rod()) as never, fisher as never);
    await fishes.act(ctx());
    const live = fisher.getEngagementByType(FISHING_TYPE);
    expect(live).toBeDefined();
    await fishes.act(ctx());
    expect(fisher.getEngagementByType(FISHING_TYPE)).toBe(live);
    expect(fisher.getEngagements().filter((e) => e.type === FISHING_TYPE)).toHaveLength(1);
  });

  it('no rod, no wait; no water, no wait', async () => {
    await fishes.act(ctx());
    expect(fisher.getEngagementByType(FISHING_TYPE)).toBeUndefined();
    ContainmentApi.move(makeStuff(() => new Rod()) as never, fisher as never);
    vi.spyOn(AddressApi, 'resolveLocalityFor').mockResolvedValue(null);
    await fishes.act(ctx());
    expect(fisher.getEngagementByType(FISHING_TYPE)).toBeUndefined();
  });

  it('a configured shore names the reach', async () => {
    ContainmentApi.move(makeStuff(() => new Rod()) as never, fisher as never);
    const shore = makeStuffAtPath(() => new Idea(), '/world/test/thing/river-edge');
    (shore as unknown as { getReachRef: () => string }).getReachRef = () => 'holloway:head';
    await fishes.act(ctx({ shore: '/world/test/thing/river-edge' }));
    expect((fisher.getEngagementByType(FISHING_TYPE) as unknown as { reachRef: string }).reachRef).toBe('holloway:head');
  });
});

describe('reads-water', () => {
  it('⭐ the line is the empty one when the record is empty, and names nobody', async () => {
    standing = [sp({ level: 0 })];
    const line = await readsWater.lineFor(fisher as unknown as Stuff, { lines: { empty: 'Nothing in it. Nothing.' } });
    expect(line).toBe('Nothing in it. Nothing.');
  });

  it('the holds line carries the species read at the practised band', async () => {
    const line = await readsWater.lineFor(fisher as unknown as Stuff, { lines: { holds: 'Eels run on the ebb. {{read}}' } });
    expect(line).toBe('Eels run on the ebb. Plenty of eel in this water.');
  });

  it('thin water gets the thin line; an apex in the water gets the apex line', async () => {
    standing = [sp({ level: 30 })];
    expect(await readsWater.lineFor(fisher as unknown as Stuff, { lines: { thin: 'Thin.' } })).toBe('Thin.');
    standing = [sp({}), sp({ speciesPath: '/stuff/idea/species/sturgeon', name: 'sturgeon', role: 'apex', capacity: 6, full: 6, level: 6 })];
    expect(await readsWater.lineFor(fisher as unknown as Stuff, { lines: { apex: 'The big one lies under the far bank.' } })).toBe('The big one lies under the far bank.');
  });

  it('builds a one-beat terminal tree; with no water it has no tree', async () => {
    const tree = await readsWater.treeFor(fisher as unknown as Stuff, {});
    expect(tree).not.toBeNull();
    expect(tree!.entry).toEqual([{ node: 'read' }]);
    expect(tree!.nodes.read!.terminal).toBe(true);
    expect(tree!.nodes.read!.beat).toMatch(/Plenty of eel/);
    vi.spyOn(AddressApi, 'resolveLocalityFor').mockResolvedValue(null);
    expect(await readsWater.treeFor(fisher as unknown as Stuff, {})).toBeNull();
  });

  it('a busy fisher declines', async () => {
    const player = makeStuff(() => new Fisher());
    vi.spyOn(MixinApi, 'isEngaged').mockReturnValue(true as never);
    (fisher as unknown as { getEngagementByType: (t: string) => unknown }).getEngagementByType = (t) =>
      t === 'tree-dialogue-conversation' ? {} : undefined;
    const result = await readsWater.open({ player: player as unknown as Stuff, npc: fisher as unknown as Stuff, config: {}, interactive: {} as never });
    expect(result).toEqual({ ok: false, reason: 'busy' });
  });
});
