/**
 * MQL scope-walk attention (the `MqlContext.attention` term).
 *
 * The scope walk gates every candidate through `PerceptionApi.perceives`.
 * By default that gate runs at the passive baseline — honest fog for
 * player-typed queries. A **code-only** caller (a detection consumer like
 * the `wary` sentry brain) may pass `attention` so `peers` resolves what it
 * perceives *when actively watching*. Asserts:
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

function ctx(viewer: Viewer, attention?: number): MqlContext {
  return { commandGiver: viewer as never, scope: 'peers', attention };
}
function ids(viewer: Viewer, attention?: number): string[] {
  return MqlApi.resolveMany('peers:living', ctx(viewer, attention)).stuff.map(
    (s) => s.stuffId,
  );
}

describe('MQL peers:living — the attention term', () => {
  it('a concealed mover is hidden at passive/low attention, surfaced at high', () => {
    const room = makeStuff(() => new Room());
    const viewer = makeStuff(() => new Viewer());
    const hidden = mover('hidden'); // requirement 4
    ContainmentApi.move(viewer, room);
    ContainmentApi.move(hidden, room);

    // Absent attention → passive baseline (0) → not surfaced (honest fog).
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
