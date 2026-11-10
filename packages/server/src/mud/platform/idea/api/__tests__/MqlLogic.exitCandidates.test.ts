/**
 * ⭐⭐ **An exit is a candidate in its own right**.
 *
 * A direction used to bind the ROOM carrying `via: { exit }` — a live
 * Exit inside a via, which reached its door's boundary and back (a cycle
 * that broke `JSON.stringify` and shipped `unlock north` as `mql-error`),
 * and an exit no verb could show: `look north` re-rendered the room.
 *
 * Now each exit the viewer can see is a candidate whose `stuff` IS the
 * way, scored by the one scorer over its own name (its direction) and
 * its keywords. A verb acts on what came back: `look` describes it, `go`
 * crosses it, and `open` reaches its door through `effectiveTarget` —
 * MQL's one door rule.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import { MqlApi } from '../../../../api/mql';
import Exit from '../../../../lib/boundary/Exit';
import Door from '../../../thing/Door';
import Location from '../../../../lib/location/Location';
import CartesianZone from '../../location/CartesianZone';
import { ContainmentApi } from '../../../../api/containment';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { MobileMixin } from '../../../../lib/spatial/Mobile';
import { NamedMixin } from '../../../../lib/description/Named';
import { Idea } from '../../../../lib/stuff/Idea';
import Good from '../../../thing/Good';
import { readFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import {
  makeStuff,
  seedKernelContentStore,
} from '../../../../lib/security/__tests__/test-setup';

const MoverBase = NamedMixin(
  MobileMixin(SensorMixin(ContainableMixin(Idea))),
);
class TestMover extends MoverBase {
  protected override handleMessage(): void {}
}

describe('an exit binds as itself', () => {
  let zone: CartesianZone;
  let here: Location;
  let there: Location;
  let mover: TestMover;
  let door: Door;

  beforeEach(async () => {
    seedKernelContentStore();
    zone = makeStuff(() => new CartesianZone());
    here = makeStuff(() => new Location());
    here.setShortDescription('Here');
    there = makeStuff(() => new Location());
    there.setShortDescription('There');
    zone.addLocation(here, 0, 0, 0);
    zone.addLocation(there, 0, 1, 0);

    door = await StuffApi.create(() => new Door());
    door.setShortDescription('iron gate');
    door.setKeywords(['gate']);
    await here.addBidirectionalExit(there, 'north', { boundary: door });

    mover = makeStuff(() => new TestMover());
    mover.setName('Alice');
    ContainmentApi.move(mover, here);
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  const north = (): Exit => here.getExit('north')!;
  const ctx = (scope: string) => ({ commandGiver: mover as never, scope });

  it('⭐⭐ a direction resolves to the EXIT — no via, on the fast path', () => {
    const one = MqlApi.resolveOne('north', ctx('reachable'));
    expect(one.stuff).toBe(north());
    expect(one.via).toBeUndefined();
  });

  it('⭐ …and on the slow path (a scope that is a query), the same', () => {
    const one = MqlApi.resolveOne('north', ctx('reachable:[class.Exit]'));
    expect(one.stuff).toBe(north());
  });

  it('⭐⭐ `n` binds the north exit through the EXIT’s keywords — no query-side rewrite', () => {
    expect(north().getKeywords()).toEqual(expect.arrayContaining(['north', 'n']));
    expect(MqlApi.resolveOne('n', ctx('reachable')).stuff).toBe(north());
    expect(MqlApi.resolveOne('n', ctx('reachable:[class.Exit]')).stuff).toBe(north());
  });

  it('⭐ an exit answers to its authored keywords too (a berth way’s `gangway`)', () => {
    north().setKeywords(['archway']);
    expect(MqlApi.resolveOne('archway', ctx('reachable')).stuff).toBe(north());
  });

  it('⭐⭐ the DOOR on a bound exit is what a boundary verb acts on', () => {
    const one = MqlApi.resolveOne('north', ctx('reachable'));
    const found = MqlApi.effectiveTarget(
      { ...one, raw: 'north' },
      (s): s is Door => s === (door as unknown as typeof s),
    );
    expect(found, 'the way reaches the door hanging in it').toBe(door);
    // The bound exit itself answers first when it satisfies the predicate.
    const self = MqlApi.effectiveTarget(
      { ...one, raw: 'north' },
      (s): s is Exit => s instanceof Exit,
    );
    expect(self).toBe(north());
  });

  it('⭐⭐ a hidden exit stays hidden — on BOTH paths', () => {
    north().setConcealment('hidden');
    expect(MqlApi.resolveOne('north', ctx('reachable')).stuff).toBeNull();
    // The slow path used to list `getObviousExits()` viewer-blind.
    expect(MqlApi.resolveOne('north', ctx('here:i,here')).stuff).toBeNull();
    expect(MqlApi.resolveOne('north', ctx('reachable:[class.Exit]')).stuff).toBeNull();
  });

  it('⭐ the exit describes itself — its direction, and what hangs in it; never where it leads', () => {
    const exit = north();
    expect(exit.getPresentation()).toBe('north');
    const said = exit.getLongFor(mover as never);
    expect(said).toMatch(/^A way north; the iron gate is (closed|open)\.$/);
    expect(said).not.toMatch(/There/);
  });

  /*
   * ⭐⭐ `go hesper` can only mean the WAY. The Stage A drive (run 6) put
   * a line FROM the Hesper in focus, and `go hesper` searched the focus
   * first and bound the line. The view's scope now names ways only, so no
   * focus and no private scope order is needed.
   */
  it('⭐⭐ `go`’s declared scope binds the way even with a thing of that name in focus', async () => {
    const VIEW = join(
      __dirname,
      '..', '..', '..', '..', '..', '..', '..',
      'content', 'platform', 'content', 'platform', 'cmd', 'movement', 'go.yaml',
    );
    const view = YAML.parse(readFileSync(VIEW, 'utf8')) as {
      args: Array<{ name: string; scope: string[] }>;
    };
    const scopes = view.args.find((a) => a.name === 'target')!.scope;
    expect(scopes.join(' ')).not.toMatch(/\$focus/);

    // A way named for her, and a line from her lying here — in focus.
    await here.addBidirectionalExit(there, 'hesper', { opposite: 'ashore' });
    const way = here.getExit('hesper')!;
    const line = makeStuff(() => new Good());
    line.setShortDescription('line from the Hesper');
    line.setKeywords(['line', 'hesper']);
    ContainmentApi.move(line, here);
    // The focus alone finds the line (what the old `$focus`-first order hit)…
    expect(MqlApi.resolveOne('hesper', ctx(`#${line.stuffId}`)).stuff).toBe(line);
    // …and the view's first scope try finds the way, and only ways.
    const first = MqlApi.resolveMany('hesper', ctx(scopes[0]!));
    expect(first.stuff).toEqual([way]);
  });
});
