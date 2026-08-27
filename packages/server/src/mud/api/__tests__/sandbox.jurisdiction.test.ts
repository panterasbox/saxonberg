/**
 * The governed-eval jurisdiction bound (sandbox Decision K): what a
 * field-side `eval --parcel <path>` may and may not touch.
 *
 * There was no test over this branch, which is how it shipped able to
 * touch almost nothing. The bound asked each receiver for its
 * `templatePath` and required it to sit under the parcel — but a
 * templatePath is LINEAGE, not location. An avatar's is
 * `/platform/agent/Avatar/<id>` and a cloned corpse's is `/stuff/agent/Corpse`,
 * wherever either happens to be standing, so a governed eval was denied
 * the wizard's own body in the very parcel they hold title to. Worse,
 * the eval scratch is minted and *then* stamped, so at the instant of
 * the stamp it had no path at all and `eval <code>` could not execute a
 * single statement in a field jurisdiction.
 *
 * These cases pin the three ways in (content of / standing in / newborn
 * of) and — the half that matters for containment — the ways out.
 */

import "../../../test-bootstrap";
import { describe, it, expect, afterEach, vi } from 'vitest';
import { SandboxApi } from '../sandbox';
import { StuffApi } from '../stuff';
import { ContainmentApi } from '../containment';
import Location from '../../lib/stuff/Location';
import { Idea } from '../../lib/stuff/Idea';
import { NamedMixin } from '../../lib/description/Named';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { ContainerMixin } from '../../lib/spatial/Container';
import {


  makeStuff,
  stampTemplatePathForTest,
} from '../../lib/security/__tests__/test-setup';

/*
 * ⚠ **20 s, not vitest's 5 s default.** Every sandbox test stands up a
 * circle and runs at least one session ceremony, which costs seconds —
 * so on a loaded full-suite run they time out in ones and twos while
 * passing in isolation, which reads as a flake and is really a budget.
 * The measurement and the argument for raising it per FILE rather than
 * globally live in `escape/round-trip.test.ts`.
 */
vi.setConfig({ testTimeout: 20_000 });


const BOUND = '/world/lounge';

/** A movable, nameable probe — the stand-in for a body or an item. */
class Probe extends ContainableMixin(NamedMixin(Idea)) {
  static _mixinName = 'Probe';
}

/** A probe that also holds things — for the nesting case. */
class Bag extends ContainerMixin(ContainableMixin(NamedMixin(Idea))) {
  static _mixinName = 'Bag';
}

function roomAt(path: string): Location {
  const room = makeStuff(() => new Location());
  stampTemplatePathForTest(room, path);
  return room;
}

function probeAt(templatePath: string | null, room: Location | null): Probe {
  const p = makeStuff(() => new Probe());
  if (templatePath !== null) stampTemplatePathForTest(p, templatePath);
  if (room !== null) ContainmentApi.move(p as never, room as never);
  return p;
}

describe('governed eval — the jurisdiction bound', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('admits content OF the parcel (lineage and location coincide)', async () => {
    const fixture = probeAt('/world/lounge/bar-counter', null);
    await SandboxApi.runGoverned(BOUND, async () => {
      fixture.setName('polished');
    });
    expect(fixture.getName()).toBe('polished');
  });

  it('admits a body STANDING in the parcel, whatever its lineage', async () => {
    // The case the shipped check got wrong. `/platform/agent/Avatar/<id>` is an
    // identity; the lounge is where the person is.
    const avatar = probeAt('/platform/agent/Avatar/player-1', roomAt('/world/lounge'));
    await SandboxApi.runGoverned(BOUND, async () => {
      avatar.setName('changed');
    });
    expect(avatar.getName()).toBe('changed');
  });

  it('admits a clone standing in the parcel (a corpse, say)', async () => {
    const corpse = probeAt(
      '/stuff/agent/Corpse',
      roomAt('/world/lounge/bar'),
    );
    await SandboxApi.runGoverned(BOUND, async () => {
      corpse.setName('examined');
    });
    expect(corpse.getName()).toBe('examined');
  });

  it('admits a NEWBORN of the run — nowhere yet, nothing to protect', async () => {
    // The scratch mint: created, then stamped. Unstamped and unplaced.
    const newborn = probeAt(null, null);
    await SandboxApi.runGoverned(BOUND, async () => {
      newborn.setName('scratch');
    });
    expect(newborn.getName()).toBe('scratch');
  });

  it('DENIES a body standing outside the parcel', async () => {
    const outsider = probeAt('/platform/agent/Avatar/player-2', roomAt('/world/moor'));
    await expect(
      SandboxApi.runGoverned(BOUND, async () => {
        outsider.setName('reached');
      }),
    ).rejects.toThrow(/sandbox boundary denied/);
    expect(outsider.getName()).not.toBe('reached');
  });

  it('DENIES content of another parcel', async () => {
    const elsewhere = probeAt('/world/moor/stone', null);
    await expect(
      SandboxApi.runGoverned(BOUND, async () => {
        elsewhere.setName('reached');
      }),
    ).rejects.toThrow(/sandbox boundary denied/);
  });

  it('does not let a sibling parcel share a prefix', async () => {
    // `/world/lounge` must not swallow `/world/loungewear` — the
    // extent test is segment-wise, not `startsWith`.
    const neighbour = probeAt('/world/loungewear/rack', null);
    await expect(
      SandboxApi.runGoverned(BOUND, async () => {
        neighbour.setName('reached');
      }),
    ).rejects.toThrow(/sandbox boundary denied/);
  });

  it('reaches through nesting — a thing in a bag in the parcel', async () => {
    const room = roomAt('/world/lounge');
    const bag = makeStuff(() => new Bag());
    stampTemplatePathForTest(bag, '/obj/bag');
    ContainmentApi.move(bag as never, room as never);
    const coin = probeAt('/obj/coin', null);
    ContainmentApi.move(coin as never, bag as never);
    await SandboxApi.runGoverned(BOUND, async () => {
      coin.setName('counted');
    });
    expect(coin.getName()).toBe('counted');
  });

  it('leaves the unbounded world alone (no bound ⇒ no check)', async () => {
    const anywhere = probeAt('/world/moor/stone', null);
    anywhere.setName('ordinary');
    expect(anywhere.getName()).toBe('ordinary');
  });
});
