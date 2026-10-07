/**
 * The governed-eval jurisdiction bound (sandbox Decision K): what a
 * field-side `eval --parcel <path>` may and may not touch.
 *
 * There was no test over this branch, which is how it shipped able to
 * touch almost nothing. The bound asked each receiver for its
 * `templatePath` and required it to sit under the parcel — but a
 * templatePath is LINEAGE, not location. An avatar's is
 * `/platform/agent/Avatar/<id>` and a cloned corpse's is `/stuff/thing/Corpse`,
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
import type { Stuff } from '../../lib/stuff/Stuff';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
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

/**
 * ⭐ A Stuff that belongs to a place without being CONTAINED by it —
 * the exit's shape. It is not `Containable`; it names its host.
 */
class Hosted extends NamedMixin(Idea) {
  static _mixinName = 'Hosted';
  constructor(private readonly host: Location) {
    super();
  }
  public override jurisdictionHost(): Stuff | null {
    return this.host as unknown as Stuff;
  }
}

/** A host hook that throws — the gate must deny, not propagate. */
class Breaks extends NamedMixin(Idea) {
  static _mixinName = 'Breaks';
  public override jurisdictionHost(): Stuff | null {
    throw new Error('host hook exploded');
  }
}

/** Declares `commons`: shared vocabulary nobody holds title to. */
class Vocabulary extends NamedMixin(Idea) {
  static _mixinName = 'Vocabulary';
  static boundaryRole: BoundaryRole = 'commons';
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
    const fixture = probeAt('/world/lounge/thing/bar-counter', null);
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
      '/stuff/thing/Corpse',
      roomAt('/world/lounge/location/bar'),
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

  /*
   * ⭐⭐ THE HOST HOOK — the rung that used to hardcode containment.
   *
   * `jurisdictionHost()` defaults to `getContainer()`, which is why
   * every case above still passes. What it ADDS is a Stuff that
   * belongs to a place **without being contained by it** — the exit.
   * An inline exit answers to its exit-KIND path
   * (`/platform/idea/exits/passage`: the kernel, not the world) and a
   * room holds a `direction → exit` map rather than containing its
   * exits, so rule 1 said no and rule 2 had nothing to walk. A
   * governed `eval --parcel <extent>` was refused on every exit of
   * every room in its own extent — `getDoor()` included, so not even
   * a read got through. Found by a browser drive.
   */

  it('⭐⭐ admits a HOSTED thing — the exit shape, pathed by KIND', async () => {
    const room = roomAt('/world/lounge/location/bar');
    const hosted = makeStuff(() => new Hosted(room));
    // The defect in one line: its own path is the kernel's.
    stampTemplatePathForTest(hosted, '/platform/idea/exits/passage');
    await SandboxApi.runGoverned(BOUND, async () => {
      hosted.setName('removed');
    });
    expect(hosted.getName()).toBe('removed');
  });

  it('⚠ and DENIES one whose host is outside the parcel', async () => {
    // The reason the hook answers the SOURCE and never the destination:
    // an exit has two ends and the far one may be somebody else's.
    const far = roomAt('/world/moor/location/heath');
    const hosted = makeStuff(() => new Hosted(far));
    stampTemplatePathForTest(hosted, '/platform/idea/exits/passage');
    await expect(
      SandboxApi.runGoverned(BOUND, async () => {
        hosted.setName('reached');
      }),
    ).rejects.toThrow(/sandbox boundary denied/);
    expect(hosted.getName()).not.toBe('reached');
  });

  it('⚠ a host that THROWS fails closed, it does not take the gate down', async () => {
    // One rung of an authorization decision. A hook that cannot answer
    // must deny, never propagate.
    const broken = makeStuff(() => new Breaks());
    stampTemplatePathForTest(broken, '/platform/idea/exits/passage');
    await expect(
      SandboxApi.runGoverned(BOUND, async () => {
        broken.setName('reached');
      }),
    ).rejects.toThrow(/sandbox boundary denied/);
  });

  it('⭐ a COMMONS class is reachable under any bound — declared, not listed', async () => {
    // `Locality` was the tenth member of a nine-member list, and the
    // only reason it was not there is that nothing had driven it:
    // `AddressApi.resolveLocalityFor` sits on the Cartographer's own
    // write path, so a governed eval could not resolve an address.
    const vocab = makeStuff(() => new Vocabulary());
    stampTemplatePathForTest(vocab, '/platform/idea/Locality/somewhere-else');
    await SandboxApi.runGoverned(BOUND, async () => {
      vocab.setName('read');
    });
    expect(vocab.getName()).toBe('read');
  });

  it('⚠ and an UNDECLARED class in the same position is denied', async () => {
    // The default is `place` and it fails closed — a new module
    // category, or a misspelled role, gets the ordinary compare.
    const plain = probeAt('/platform/idea/Locality/somewhere-else', null);
    await expect(
      SandboxApi.runGoverned(BOUND, async () => {
        plain.setName('read');
      }),
    ).rejects.toThrow(/sandbox boundary denied/);
  });

  it('leaves the unbounded world alone (no bound ⇒ no check)', async () => {
    const anywhere = probeAt('/world/moor/stone', null);
    anywhere.setName('ordinary');
    expect(anywhere.getName()).toBe('ordinary');
  });
});
