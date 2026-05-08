/**
 * Shared MQL test world. Builds a giver in a location with two
 * peer items, an inventory item, and Details on the location —
 * `inscription` (top-level) plus `bookcase` with a child `book`
 * (nested). Enough surface to exercise the resolver's scope-walk,
 * transforms, detail-keyword extension at multiple depths, and
 * basic seeds.
 *
 * Each call to {@link makeWorld} clears the StuffApi registry first
 * so tests are isolated.
 */

import { ContainableMixin } from '../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { DetailedMixin } from '../../../lib/description/Detailed';
import { Idea } from '../../../lib/stuff/Idea';
import { NamedMixin } from '../../../lib/description/Named';
import { PerceptibleMixin } from '../../../lib/description/Perceptible';
import { CommandGiverMixin } from '../../../lib/command/CommandGiver';
import { FocusedMixin } from '../../../lib/command/Focused';
import { SensorMixin } from '../../../lib/message/Sensor';
import { ContainmentApi } from '../../containment';
import { StuffApi } from '../../stuff';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { CommandGiver } from '../../../lib/command/CommandGiver';
import type { Focused } from '../../../lib/command/Focused';

class TestLocation extends ContainerMixin(
  DetailedMixin(NamedMixin(PerceptibleMixin(Idea)))
) {}

class TestThing extends ContainableMixin(
  DetailedMixin(NamedMixin(PerceptibleMixin(Idea)))
) {}

// SensorMixin is composed so controllers that fire Scenes against
// the giver (LookController's `Scene.toSelf` in particular) work
// out of the box. Doesn't change the surface seen by tests that
// don't use messaging.
class TestGiver extends ContainerMixin(
  ContainableMixin(
    SensorMixin(
      FocusedMixin(CommandGiverMixin(NamedMixin(PerceptibleMixin(Idea))))
    )
  )
) {}

export interface MqlWorld {
  giver: Stuff & CommandGiver & Focused;
  location: Stuff;
  rose: Stuff;
  daisy: Stuff;
  apple: Stuff;
  /** Top-level detail name on the location ("inscription"). */
  inscriptionId: string;
}

/**
 * Build the fixture. Resets `StuffApi` first, so tests interleaving
 * `makeWorld()` with their own fixture creation see a clean registry.
 */
export function makeWorld(): MqlWorld {
  StuffApi.clearAll();

  const location = makeStuff(() => new TestLocation()) as unknown as Stuff & {
    setName: (n: string) => void;
    addKeyword: (k: string) => void;
    setDetail: (ids: string[], desc: string, parent?: string) => number;
  };
  location.setName('Town Square');
  location.addKeyword('square');
  location.addKeyword('town');
  location.setDetail(['inscription'], 'A weathered inscription on the cobblestones.');
  location.setDetail(['bookcase'], 'A tall oak bookcase, its shelves crammed with old volumes.');
  location.setDetail(['book'], 'A leather-bound tome, spine cracked with use.', 'bookcase');

  const giver = makeStuff(() => new TestGiver()) as unknown as Stuff &
    CommandGiver &
    Focused & { setName: (n: string) => void };
  giver.setName('bob');
  ContainmentApi.move(
    giver as unknown as Parameters<typeof ContainmentApi.move>[0],
    location as unknown as Parameters<typeof ContainmentApi.move>[1]
  );

  const rose = makeStuff(() => new TestThing()) as unknown as Stuff & {
    setName: (n: string) => void;
    addKeyword: (k: string) => void;
  };
  rose.setName('rose');
  rose.addKeyword('rose');
  rose.addKeyword('flower');
  ContainmentApi.move(
    rose as unknown as Parameters<typeof ContainmentApi.move>[0],
    location as unknown as Parameters<typeof ContainmentApi.move>[1]
  );

  const daisy = makeStuff(() => new TestThing()) as unknown as Stuff & {
    setName: (n: string) => void;
    addKeyword: (k: string) => void;
  };
  daisy.setName('daisy');
  daisy.addKeyword('daisy');
  daisy.addKeyword('flower');
  ContainmentApi.move(
    daisy as unknown as Parameters<typeof ContainmentApi.move>[0],
    location as unknown as Parameters<typeof ContainmentApi.move>[1]
  );

  const apple = makeStuff(() => new TestThing()) as unknown as Stuff & {
    setName: (n: string) => void;
    addKeyword: (k: string) => void;
  };
  apple.setName('apple');
  apple.addKeyword('apple');
  apple.addKeyword('fruit');
  ContainmentApi.move(
    apple as unknown as Parameters<typeof ContainmentApi.move>[0],
    giver as unknown as Parameters<typeof ContainmentApi.move>[1]
  );

  return {
    giver,
    location: location as unknown as Stuff,
    rose: rose as unknown as Stuff,
    daisy: daisy as unknown as Stuff,
    apple: apple as unknown as Stuff,
    inscriptionId: 'inscription',
  };
}
