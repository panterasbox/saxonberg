/**
 * Warren substrate tests — exercise the base mechanism through a
 * trivial non-lounge consumer (`TestOverflowWarren`), proving the base
 * stands alone (AC 11). Rooms/occupants are built with `makeStuff` (no
 * DB clone); the consumer's `createMember` mints a bare test room.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { Warren, type Attachment } from '../Warren';
import { WarrenMemberMixin } from '../WarrenMember';
import { ExitableMixin } from '../../boundary/Exitable';
import { ContainableMixin } from '../../spatial/Containable';
import { HasInteractiveMixin } from '../../connection/HasInteractive';
import Location from '../../stuff/Location';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

// ── Test fixtures ────────────────────────────────────────────────

class TestRoom extends ExitableMixin(WarrenMemberMixin(Location)) {}

// A countable occupant: HasInteractive + Containable, nothing else.
class TestOccupant extends HasInteractiveMixin(ContainableMixin(Idea)) {}

const CARDINALS = ['north', 'east', 'south', 'west'];

class TestOverflowWarren extends Warren {
  private _attachCount = 0;

  protected async createMember(): Promise<Stuff & Container> {
    return makeStuff(() => new TestRoom()) as unknown as Stuff & Container;
  }

  public async admitArrival(
    host: Stuff & Container,
    actor: Stuff,
  ): Promise<void> {
    const eligible = this.getMembers()
      .filter((m) => m !== host)
      .sort((a, b) => this.occupantsOf(a).length - this.occupantsOf(b).length);
    let target = eligible[0];
    if (!target) target = await this.spawnMember();
    ContainmentApi.move(
      actor as unknown as Stuff & import('../../spatial/Containable').Containable,
      target,
    );
  }

  protected attachmentFor(_m: Stuff & Container): Attachment {
    const dir = CARDINALS[this._attachCount % CARDINALS.length]!;
    this._attachCount += 1;
    return { direction: dir };
  }

  protected async reconcile(): Promise<void> {
    /* no-op for the trivial consumer */
  }

  protected async wireHostFixtures(_host: Stuff & Container): Promise<void> {
    /* no fixtures */
  }

  protected async unwireHostFixtures(): Promise<void> {
    /* no fixtures */
  }

  // Public passthroughs so tests can drive the protected mechanism.
  public reap(m: Stuff & Container): void {
    this.reapMember(m);
  }
  public spawn(): Promise<Stuff & Container> {
    return this.spawnMember();
  }
  public countOccupants(m: Stuff & Container): number {
    return this.occupantsOf(m).length;
  }
}

function makeWarren(): TestOverflowWarren {
  return makeStuff(() => new TestOverflowWarren());
}
function makeOccupant(): TestOccupant {
  return makeStuff(() => new TestOccupant());
}

describe('Warren base mechanism', () => {
  let warren: TestOverflowWarren;
  beforeEach(() => {
    warren = makeWarren();
  });

  it('getHost on an empty graph creates and designates the first member as host (AC 1 mech)', async () => {
    expect(warren.getMembers()).toHaveLength(0);
    const host = await warren.getHost();
    expect(host).toBeDefined();
    expect(warren.getMembers()).toContain(host);
    expect(warren.isCurrentHost(host)).toBe(true);
    // Idempotent: a second getHost returns the same instance.
    expect(await warren.getHost()).toBe(host);
  });

  it('spawnMember buds a fresh member and wires a walkable bidirectional hub exit (AC 2)', async () => {
    const host = await warren.getHost();
    const sat = await warren.spawn();
    expect(warren.getMembers()).toEqual(expect.arrayContaining([host, sat]));

    // Host → satellite and back are both wired.
    const hostExits = [...(host as unknown as TestRoom).getExits().values()];
    expect(hostExits.length).toBe(1);
    const toSat = hostExits[0]!;
    expect(toSat.getDestination()).toBe(sat);

    const satExits = [...(sat as unknown as TestRoom).getExits().values()];
    expect(satExits.length).toBe(1);
    expect(satExits[0]!.getDestination()).toBe(host);
  });

  it('reapMember drains occupants to the host, destructs the satellite, and leaves no host-side dead exit (AC 3, 10)', async () => {
    const host = await warren.getHost();
    const sat = await warren.spawn();

    const occ1 = makeOccupant();
    const occ2 = makeOccupant();
    ContainmentApi.move(occ1 as never, sat);
    ContainmentApi.move(occ2 as never, sat);
    expect(warren.countOccupants(sat)).toBe(2);

    warren.reap(sat);

    expect((sat as Stuff).isDestroyed()).toBe(true);
    expect(warren.getMembers()).toEqual([host]);
    // Occupants drained to the host.
    expect((host as unknown as Container).getContents()).toEqual(
      expect.arrayContaining([occ1, occ2]),
    );
    // No leaked / blocked host-side exit (the asymmetry fix).
    expect([...(host as unknown as TestRoom).getExits().values()]).toHaveLength(
      0,
    );
  });

  it('never reaps the host (AC 3)', async () => {
    const host = await warren.getHost();
    warren.reap(host);
    expect((host as Stuff).isDestroyed()).toBe(false);
    expect(warren.getMembers()).toContain(host);
  });

  it('getMembers prunes a member destructed out-of-band (R2.3, AC 10)', async () => {
    const host = await warren.getHost();
    const sat = await warren.spawn();
    expect(warren.getMembers()).toHaveLength(2);
    StuffApi.destruct(sat as unknown as Stuff);
    const members = warren.getMembers();
    expect(members).toEqual([host]);
    expect(warren.hasMember(sat)).toBe(false);
  });

  it('addMember/removeMember own the WarrenMember back-ref symmetrically (R2.2/R2.4, AC 10)', async () => {
    const host = await warren.getHost();
    // Host composes WarrenMemberMixin (TestRoom) → back-ref set.
    expect(MixinApi.isWarrenMember(host as Stuff)).toBe(true);
    expect((host as unknown as { getWarren(): unknown }).getWarren()).toBe(
      warren,
    );
    warren.removeMember(host);
    expect((host as unknown as { getWarren(): unknown }).getWarren()).toBeNull();
  });

  it('destructing a member fires R2.4 cleanup → removeMember (AC 10)', async () => {
    const host = await warren.getHost();
    const sat = await warren.spawn();
    StuffApi.destruct(sat as unknown as Stuff);
    expect(warren.hasMember(sat)).toBe(false);
    expect(warren.getMembers()).toEqual([host]);
  });

  it('single-warren guard: a member owned by another Warren is rejected, stays put, and warns (AC 14, Q2b)', async () => {
    const warrenA = makeWarren();
    const warrenB = makeWarren();
    const room = makeStuff(() => new TestRoom()) as unknown as Stuff &
      Container;

    expect(warrenA.addMember(room)).toBe(true);
    expect((room as unknown as { getWarren(): unknown }).getWarren()).toBe(
      warrenA,
    );

    const warnings: unknown[] = [];
    const orig = console.warn;
    console.warn = (...a: unknown[]) => warnings.push(a);
    try {
      expect(warrenB.addMember(room)).toBe(false);
    } finally {
      console.warn = orig;
    }
    expect(warnings.length).toBeGreaterThan(0);
    // Still owned by A.
    expect(warrenB.hasMember(room)).toBe(false);
    expect((room as unknown as { getWarren(): unknown }).getWarren()).toBe(
      warrenA,
    );
  });

  it('migrates the host role to a survivor on forced host destruction, re-wiring hub exits (AC 8)', async () => {
    const host = await warren.getHost();
    const s1 = await warren.spawn();
    const s2 = await warren.spawn();
    expect(warren.getMembers()).toHaveLength(3);

    // Force-destroy the host.
    StuffApi.destruct(host as unknown as Stuff);
    expect((host as Stuff).isDestroyed()).toBe(true);

    // Next getHost migrates to a survivor and re-wires.
    const newHost = await warren.getHost();
    expect([s1, s2]).toContain(newHost);
    expect(warren.isCurrentHost(newHost)).toBe(true);
    expect((newHost as Stuff).isDestroyed()).toBe(false);

    const survivors = warren.getMembers();
    expect(survivors).toHaveLength(2);
    const other = survivors.find((m) => m !== newHost)!;

    // New host links to the other survivor and back; no dead exits.
    const newHostExits = [...(newHost as unknown as TestRoom).getExits().values()];
    expect(newHostExits.map((e) => e.getDestination())).toContain(other);
    const otherExits = [...(other as unknown as TestRoom).getExits().values()];
    expect(otherExits.map((e) => e.getDestination())).toContain(newHost);
  });

  it('teardown destructs every member and clears state (AC 4 mech)', async () => {
    const host = await warren.getHost();
    const s1 = await warren.spawn();
    warren.teardown();
    expect((host as Stuff).isDestroyed()).toBe(true);
    expect((s1 as Stuff).isDestroyed()).toBe(true);
    expect(warren.getMembers()).toHaveLength(0);
  });
});
