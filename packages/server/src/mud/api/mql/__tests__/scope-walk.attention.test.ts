/**
 * The attention term — MQL names, the watcher perceives.
 *
 * ⚠ Meaning changed at size-and-carrying W3 (D23): the scope walk no longer
 * gates candidates on `PerceptionApi.perceives`, and `MqlContext.attention`
 * is gone. MQL names the concealed mover for everyone; a detection consumer
 * (the `wary` sentry brain) filters what it NAMED through
 * `PerceptionApi.perceives(viewer, x, attention)`. Asserts:
 *   - MQL names the concealed mover whatever the attention;
 *   - absent attention → passive baseline (a concealed peer stays hidden);
 *   - attention below the band's requirement → still hidden;
 *   - attention at/above the requirement → surfaced;
 *   - an obvious peer is always present regardless of attention.
 *
 * The viewer is cast to the `CommandGiver` the context type wants (MQL calls
 * no CommandGiver methods during resolution — the `scope-walk.recognition`
 * precedent).
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { MqlApi } from '../../mql';
import { PerceptionApi } from '../../perception';
import { BeliefStoreMixin } from '../../../lib/belief/BeliefStore';
import { PerceptionMixin } from '../../../lib/perception/Perception';
import { SensorMixin } from '../../../lib/message/Sensor';
import { ConcealableMixin } from '../../../lib/concealment/Concealable';
import { MobileMixin } from '../../../lib/spatial/Mobile';
import { VisibleMixin } from '../../../lib/description/Visible';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { Idea } from '../../../lib/stuff/Idea';
import { ContainmentApi } from '../../containment';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';
import type { MqlContext } from '../types';
import type { ConcealmentLevel } from '../../../lib/concealment/ConcealmentLevel';

class Viewer extends BeliefStoreMixin(
  PerceptionMixin(SensorMixin(ContainableMixin(Idea))),
) {}
// A mobile (so `:living` keeps it) perceivable that can be concealed.
class Mover extends ConcealableMixin(
  MobileMixin(VisibleMixin(ContainableMixin(Idea))),
) {}

let counter = 0;
function mover(level: ConcealmentLevel): Mover {
  const m = makeStuffAtPath(() => new Mover(), `/obj/test/mover-${counter++}`);
  m.setShortDescription('a figure');
  m.setConcealment(level);
  return m;
}

function ctx(viewer: Viewer): MqlContext {
  return { commandGiver: viewer as never, scope: 'peers' };
}
function named(viewer: Viewer): string[] {
  return MqlApi.resolveMany('peers:living', ctx(viewer)).stuff.map((s) => s.stuffId);
}
function ids(viewer: Viewer, attention?: number): string[] {
  return MqlApi.resolveMany('peers:living', ctx(viewer))
    .stuff.filter((s) => PerceptionApi.perceives(viewer, s, attention))
    .map((s) => s.stuffId);
}

describe('MQL peers:living — the attention term', () => {
  it('a concealed mover is hidden at passive/low attention, surfaced at high', () => {
    const room = makeStuff(() => new Room());
    const viewer = makeStuff(() => new Viewer());
    const hidden = mover('hidden'); // requirement 4
    ContainmentApi.move(viewer, room);
    ContainmentApi.move(hidden, room);

    // MQL names it for everyone (D23).
    expect(named(viewer)).toContain(hidden.stuffId);
    // Absent attention → passive baseline (0) → not perceived (honest fog).
    expect(ids(viewer)).not.toContain(hidden.stuffId);
    // Below the requirement → still hidden.
    expect(ids(viewer, 3)).not.toContain(hidden.stuffId);
    // At/above the requirement → the active watch surfaces it.
    expect(ids(viewer, 4)).toContain(hidden.stuffId);
  });

  it('an obvious mover is present regardless of attention', () => {
    const room = makeStuff(() => new Room());
    const viewer = makeStuff(() => new Viewer());
    const plain = mover('obvious');
    ContainmentApi.move(viewer, room);
    ContainmentApi.move(plain, room);

    expect(ids(viewer)).toContain(plain.stuffId); // passive
    expect(ids(viewer, 0)).toContain(plain.stuffId);
  });
});

class Room extends ContainerMixin(Idea) {}
