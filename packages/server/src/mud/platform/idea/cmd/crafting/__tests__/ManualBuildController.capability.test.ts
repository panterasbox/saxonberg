/**
 * ⚠⚠ `findCapability` picks the BEST rung, not the first one it trips
 * over — and for the whole build's life it did the opposite.
 *
 * Every trade here is built on one shape: **rung zero is portable and
 * bad, rung one is fixed and good.** A drop spindle against a spinning
 * wheel, a hand loom against a broad loom, a household vat against a
 * dye vat, a sewing kit against a sewing machine, shears against a
 * cutting table. `findCapability` scanned held kit first and returned
 * the first match, so **carrying your cheap tool made you worse off
 * than leaving it at home**: walk into a workshop with a spindle in
 * your pack and you spun at the spindle's rate beside an idle wheel.
 *
 * ⭐ Nothing reported it, and nothing could have. A slower step is not
 * an error — it completes, it produces the right goods, and the only
 * symptom is a number nobody sees. It surfaced from a design question
 * about which object should afford `cut`.
 *
 * ⚠ Ties still keep held-first, so this is strictly "prefer the better
 * one when they differ" and no existing arrangement moves.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import { ManualBuildController } from '../ManualBuildController';
import { ToolMixin } from '../../../../../lib/craft/Tooled';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import Thing from '../../../../../lib/stuff/Thing';
import Location from '../../../../../lib/stuff/Location';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../../../lib/stuff/Stuff';

/** A tool with one authored capability entry. */
class Tool extends ToolMixin(ContainableMixin(Thing)) {
  static _mixinName = 'Tool';
}

/** Someone who can hold things and stand somewhere. */
class Worker extends ContainerMixin(ContainableMixin(Thing)) {
  static _mixinName = 'Worker';
}

/**
 * The protected helper, reached the way a subclass reaches it. The
 * method is `protected` by design — it is a controller's own seam, not
 * external surface — so the test subclasses rather than casting.
 */
class Probe extends ManualBuildController<never> {
  execute(): void {
    /* not dispatched — this exists for `findCapability` alone */
  }
  probe(giver: Stuff, cap: string): Stuff | null {
    return this.findCapability(giver, cap);
  }
}

function tool(name: string, kind: string, rate: number): Tool {
  const t = makeStuff(() => new Tool());
  t.setPrimaryKeyword(name);
  t.setKeywords([name]);
  t.setShortDescription(`a ${name}`);
  t.setCapabilities([{ kind, rate }]);
  return t;
}

function standUp(): { worker: Worker; room: Location; probe: Probe } {
  const room = makeStuff(() => new Location());
  const worker = makeStuff(() => new Worker());
  ContainmentApi.move(worker as never, room as never);
  return { worker, room, probe: makeStuff(() => new Probe()) };
}

afterEach(() => StuffApi.clearAll());

describe('findCapability picks the best rung', () => {
  it('⚠⚠ a HELD cheap tool no longer beats a good one in the room', () => {
    /*
     * The regression itself. Held-first + first-match returned the
     * spindle; a player who happened to be carrying one got the worse
     * rate standing at the wheel, silently.
     */
    const { worker, room, probe } = standUp();
    const spindle = tool('spindle', 'spinning', 1);
    const wheel = tool('wheel', 'spinning', 3);
    ContainmentApi.move(spindle as never, worker as never);
    ContainmentApi.move(wheel as never, room as never);

    expect(probe.probe(worker as never, 'spinning')).toBe(wheel);
  });

  it('⭐ and a held GOOD tool still wins over a poor one in the room', () => {
    // The other direction, which the old code got right by accident and
    // the new code gets right on purpose.
    const { worker, room, probe } = standUp();
    const good = tool('good-shears', 'cutting', 3);
    const poor = tool('blunt-knife', 'cutting', 1);
    ContainmentApi.move(good as never, worker as never);
    ContainmentApi.move(poor as never, room as never);

    expect(probe.probe(worker as never, 'cutting')).toBe(good);
  });

  it('ties keep HELD-FIRST, so no existing arrangement moves', () => {
    const { worker, room, probe } = standUp();
    const mine = tool('my-needle', 'mending', 1);
    const theirs = tool('their-needle', 'mending', 1);
    ContainmentApi.move(mine as never, worker as never);
    ContainmentApi.move(theirs as never, room as never);

    expect(probe.probe(worker as never, 'mending')).toBe(mine);
  });

  it('ignores tools of a different kind entirely', () => {
    const { worker, room, probe } = standUp();
    const loom = tool('loom', 'weaving', 9);
    ContainmentApi.move(loom as never, room as never);
    expect(probe.probe(worker as never, 'cutting')).toBeNull();
  });

  it('answers null when nothing reachable offers the kind', () => {
    const { worker, probe } = standUp();
    expect(probe.probe(worker as never, 'spinning')).toBeNull();
  });
});
