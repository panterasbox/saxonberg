/**
 * ⭐⭐ The ways cannot disagree with trying (navigation-server D8, D9):
 *
 * - a refusal is THE refusal — `wayFor`'s reason is the sentence `go`
 *   prints, through the same cascade, asked as a probe;
 * - a plain yes is kept; a yes that depends on something says what —
 *   `unseen` (the far side is not standing), `flee` (leaving is fleeing);
 * - a probe moves nothing, and a fight is not left;
 * - a boundary's facts appear by composition (`aspect: 'way'`).
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { BoundaryApi } from '../../../api/boundary';
import { ContainmentApi } from '../../../api/containment';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import Location from '../../location/Location';
import Exit from '../Exit';
import Door from '../../../platform/thing/Door';
import { CommandGiverMixin } from '../../command/CommandGiver';
import { SensorMixin } from '../../message/Sensor';
import { ContainableMixin } from '../../spatial/Containable';
import { NamedMixin } from '../../description/Named';
import { MobileMixin } from '../../spatial/Mobile';
import { Idea } from '../../stuff/Idea';
import { CombatantMixin } from '../../combat/Combatant';
import { MixinApi } from '../../../api/mixin';
import { makeStuff, seedKernelContentStore } from '../../security/__tests__/test-setup';
import { buildMode } from '../../locomotion/__tests__/test-helpers';

class Fighter extends CombatantMixin(Idea) {}

class Walker extends CommandGiverMixin(NamedMixin(MobileMixin(SensorMixin(ContainableMixin(Idea))))) {}

describe('Exit.wayFor — the verdict is the check moving runs', () => {
  let a: Location;
  let b: Location;
  let walker: Walker;
  let north: Exit;

  beforeEach(async () => {
    seedKernelContentStore();
    buildMode('walk');
    const zone = makeStuff(() => new CartesianZone());
    a = makeStuff(() => new Location());
    a.setShortDescription('Place A');
    b = makeStuff(() => new Location());
    b.setShortDescription('Place B');
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    north = makeStuff(() => new Exit({ direction: 'north', source: a, destination: b }));
    await a.addExit(north);
    await b.addExit(makeStuff(() => new Exit({ direction: 'south', source: b, destination: a })));
    walker = makeStuff(() => new Walker());
    walker.setName('Alice');
    ContainmentApi.move(walker, a);
  });

  it('a plain yes when every gate was asked and the far side stands', async () => {
    const way = await north.wayFor(walker);
    expect(way.take).toEqual({ ok: true });
    expect(way.destination).toMatch(/Place B/);
  });

  it('⭐ a refusal is the refusal: the probe\'s reason is the one trying gives', async () => {
    const door = await StuffApi.create(() => new Door());
    door.setShortDescription('oak door');
    BoundaryApi.attach(door, north);
    const way = await north.wayFor(walker);
    expect(way.take?.ok).toBe(false);
    const tried = await walker.traverse(north, 'walk');
    expect(tried.ok).toBe(false);
    expect(way.take && !way.take.ok ? way.take.reason : '').toBe(tried.reason);
    expect(walker.getContainer()).toBe(a);
  });

  it('⭐ the boundary\'s facts arrive by composition (state, opening; lock, key)', async () => {
    const door = await StuffApi.create(() => new Door());
    door.setShortDescription('oak door');
    BoundaryApi.attach(door, north);
    door.setLocked(true);
    const way = await north.wayFor(walker);
    expect(way.facts).toMatchObject({ state: 'locked', locked: true, keyHeld: false });
    expect(typeof way.facts?.opening).toBe('string');
  });

  it('⭐ unseen: the far side is not standing — yes, as far as you know — and the probe stands nothing up', async () => {
    vi.spyOn(north, 'peekDestination').mockReturnValue(null);
    const resolve = vi.spyOn(north, 'resolveDestination');
    const way = await north.wayFor(walker);
    expect(way.take).toEqual({ ok: true, unseen: true });
    expect(resolve).not.toHaveBeenCalled();
  });

  it('⭐ flee: a way out of a fight says so — the verdict carries the fighter\'s own answer', async () => {
    const said = vi.fn(() => ({ ok: true, flee: true as const }));
    vi.spyOn(MixinApi, 'isCombatant').mockReturnValue(true);
    (walker as unknown as { beforeTraverse: typeof said }).beforeTraverse = said;
    const way = await north.wayFor(walker);
    expect(way.take).toEqual({ ok: true, flee: true });
    expect(said).toHaveBeenCalledWith(north, { probe: true });
  });

  it('⭐ a fighter asked as a probe says it would flee, and does NOT disengage', () => {
    const fighter = makeStuff(() => new Fighter());
    vi.spyOn(fighter, 'moraleBand').mockReturnValue('resolute');
    const disengage = vi.spyOn(fighter, 'disengage');
    expect(fighter.beforeTraverse(north, { probe: true })).toEqual({ ok: true, flee: true });
    expect(disengage).not.toHaveBeenCalled();
    vi.spyOn(fighter, 'moraleBand').mockReturnValue(null);
    expect(fighter.beforeTraverse(north, { probe: true })).toEqual({ ok: true });
  });

  it('a state change tells whoever stands at the way', async () => {
    const door = await StuffApi.create(() => new Door());
    door.setShortDescription('oak door');
    BoundaryApi.attach(door, north);
    const told = vi.spyOn(north, 'wayChanged');
    door.setLocked(true);
    expect(told).toHaveBeenCalled();
  });
});
