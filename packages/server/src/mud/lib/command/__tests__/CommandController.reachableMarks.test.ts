/**
 * ⭐ `reachableMarks` reads what the giver carries WHERE IT SITS (size and
 * carrying D-W10-1; finalize run 16): since W9 a thing in a worn bag is
 * the BAG's contents, so the two-leg pool's old read of the giver's
 * top-level contents missed every tool in an open satchel. A shut one
 * stays out (shut means shut).
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import { CommandController } from '../CommandController';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { Idea } from '../../stuff/Idea';
import { ContainerMixin } from '../../spatial/Container';
import type { Stuff } from '../../stuff/Stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import { makeBody, wornBag, tool } from '../../slot/__tests__/carrying-fixture';

class Room extends ContainerMixin(Idea) {
  static _mixinName = 'ReachableMarksRoom';
}
class Probe extends CommandController {
  execute(): void {}
  marks(giver: Stuff): Stuff[] {
    return this.reachableMarks(giver);
  }
}

afterEach(() => StuffApi.clearAll());

describe('reachableMarks — the giver\'s carried tree, where it sits', () => {
  it('⭐ a tool in an open worn satchel is a mark; shut in it, it is not', () => {
    const room = makeStuff(() => new Room());
    const { me, plan } = makeBody();
    ContainmentApi.move(me, room);
    const satchel = wornBag(me, plan, 'satchel', 'torso');
    const awl = tool('awl', 0.1);
    ContainmentApi.move(awl, satchel);
    const probe = makeStuff(() => new Probe());
    expect(probe.marks(me)).toContain(awl);
    satchel.setOpen(false);
    expect(probe.marks(me)).not.toContain(awl);
  });
});
