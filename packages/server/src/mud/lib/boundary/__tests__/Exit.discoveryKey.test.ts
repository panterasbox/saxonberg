/**
 * An exit's `DISCOVERY` key reads its source's **durable handle**, not
 * its lineage.
 *
 * ⚠⚠ The defect this file pins has two faces, and both were live:
 *
 *   - **Too wide.** Forty provisioned dorm rooms share one template row,
 *     so a hidden door keyed on `getTemplatePath()` gave every one of
 *     them the same referent. Find the secret in your room and it reads
 *     as found in all of them, for you and for everybody.
 *   - **Too generous.** A lounge satellite is a fresh clone per landing,
 *     named by nothing durable. Keyed on its row it answered with a
 *     handle it had no right to, so a find in a room that no longer
 *     exists stayed found forever.
 *
 * The handle answers both: a keyed room is `<row>#<extent/leaf>`, a
 * minted one its identity, a singleton place its row — byte-identical to
 * what every DISCOVERY belief already written used — and an ephemeral
 * clone has no handle, so there is nothing to remember it by.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import Exit from '../Exit';
import { PerceptionApi } from '../../../api/perception';
import { StuffApi } from '../../../api/stuff';
import { Idea } from '../../stuff/Idea';
import { SingletonMixin } from '../../stuff/Singleton';
import { PersistableMixin } from '../../persistence/Persistable';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { BeliefStoreMixin } from '../../belief/BeliefStore';
import { PerceptionMixin } from '../../perception/Perception';
import { NamedMixin } from '../../description/Named';
import { PerceptibleMixin } from '../../description/Perceptible';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';

const DORM_ROW = '/world/terminus/campus/duncan-hall/location/dormroom';
const BAR_ROW = '/world/terminus/dives/location/bar';
const LOUNGE_ROW = '/world/lounge/location/satellite';

/** A keyed, multi-instance place — the provisioned dorm room's shape. */
class KeyedRoom extends PersistableMixin(ContainerMixin(Idea)) {}

/** A one-place-per-row place — the bar's shape. */
class LoneRoom extends SingletonMixin(ContainerMixin(Idea)) {}

/** An ephemeral clone — the lounge satellite's shape: no key, no stamp,
 *  no Singleton. */
class SatelliteRoom extends ContainerMixin(Idea) {}

class Viewer extends BeliefStoreMixin(
  PerceptionMixin(
    ContainerMixin(ContainableMixin(NamedMixin(PerceptibleMixin(Idea)))),
  ),
) {}

function hiddenExitFrom(source: Stuff & Container, direction: string): Exit {
  return makeStuff(
    () =>
      new Exit({
        direction,
        source,
        destination: source as unknown as Stuff & Container,
        hidden: true,
      }),
  );
}

beforeEach(() => {
  StuffApi.clearAll();
});

describe('a secret found in one instance is not found in all of them', () => {
  it('⭐⭐ two keyed rooms of ONE row do not share a discovery key', () => {
    const roomA = makeStuffAtPath(() => new KeyedRoom(), DORM_ROW);
    const roomB = makeStuffAtPath(() => new KeyedRoom(), DORM_ROW);
    roomA.setPersistenceKey('duncan/f1-r1');
    roomB.setPersistenceKey('duncan/f1-r2');

    const keyA = hiddenExitFrom(roomA, 'down').getDiscoveryKey();
    const keyB = hiddenExitFrom(roomB, 'down').getDiscoveryKey();

    expect(keyA).toBe(`${DORM_ROW}#duncan/f1-r1#exit:down`);
    expect(keyB).toBe(`${DORM_ROW}#duncan/f1-r2#exit:down`);
    expect(keyA).not.toBe(keyB);
  });

  it('⭐⭐ and the belief does not leak between them', () => {
    const roomA = makeStuffAtPath(() => new KeyedRoom(), DORM_ROW);
    const roomB = makeStuffAtPath(() => new KeyedRoom(), DORM_ROW);
    roomA.setPersistenceKey('duncan/f1-r1');
    roomB.setPersistenceKey('duncan/f1-r2');
    const exitA = hiddenExitFrom(roomA, 'down');
    const exitB = hiddenExitFrom(roomB, 'down');
    const viewer = makeStuffAtPath(
      () => new Viewer(),
      '/platform/agent/PrimaryAvatar',
      '/platform/agent/Avatar/p1',
    );

    PerceptionApi.recordDiscovery(viewer, exitA);

    expect(PerceptionApi.hasDiscovered(viewer, exitA)).toBe(true);
    // Red before the handle: the two exits shared one referent.
    expect(PerceptionApi.hasDiscovered(viewer, exitB)).toBe(false);
  });

  it('two row-prefixed MINTED rooms of one row do not share a key either', () => {
    const one = makeStuffAtPath(
      () => new KeyedRoom(),
      DORM_ROW,
      `${DORM_ROW}/one`,
    );
    const two = makeStuffAtPath(
      () => new KeyedRoom(),
      DORM_ROW,
      `${DORM_ROW}/two`,
    );
    expect(hiddenExitFrom(one, 'down').getDiscoveryKey()).toBe(
      `${DORM_ROW}/one#exit:down`,
    );
    expect(hiddenExitFrom(two, 'down').getDiscoveryKey()).toBe(
      `${DORM_ROW}/two#exit:down`,
    );
  });
});

describe('the regression guard, and the honest nothing', () => {
  it("⭐ a singleton place's key is BYTE-IDENTICAL to the old one", () => {
    // Every DISCOVERY belief already written against the bar's secret
    // door must keep resolving. This is the whole reason the Singleton
    // rung exists.
    const bar = makeStuffAtPath(() => new LoneRoom(), BAR_ROW);
    expect(hiddenExitFrom(bar, 'north').getDiscoveryKey()).toBe(
      `${BAR_ROW}#exit:north`,
    );
  });

  it('⭐ an ephemeral clone yields NO key — nothing durable names it', () => {
    const satellite = makeStuffAtPath(() => new SatelliteRoom(), LOUNGE_ROW);
    expect(satellite.getDurableHandle()).toBeNull();
    expect(hiddenExitFrom(satellite, 'out').getDiscoveryKey()).toBeUndefined();
  });

  it('and a find in an ephemeral room records nothing to follow you', () => {
    const satellite = makeStuffAtPath(() => new SatelliteRoom(), LOUNGE_ROW);
    const exit = hiddenExitFrom(satellite, 'out');
    const viewer = makeStuff(() => new Viewer());

    PerceptionApi.recordDiscovery(viewer, exit);
    expect(PerceptionApi.hasDiscovered(viewer, exit)).toBe(false);

    // A second landing is a fresh instance of the same row; it starts
    // hidden because the first find was never written anywhere.
    const nextVisit = makeStuffAtPath(() => new SatelliteRoom(), LOUNGE_ROW);
    expect(
      PerceptionApi.hasDiscovered(viewer, hiddenExitFrom(nextVisit, 'out')),
    ).toBe(false);
  });

  it('an unbound kind clone of an Exit still has no key', () => {
    const loose = makeStuff(() => new Exit());
    expect(loose.getDiscoveryKey()).toBeUndefined();
  });
});
