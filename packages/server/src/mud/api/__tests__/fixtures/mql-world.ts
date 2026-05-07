/**
 * Shared MQL test world. Builds a giver in a location with two
 * contents, an inventory item, a north exit, and a Detail on the
 * location — enough surface to exercise the resolver's scope-walk,
 * transforms, detail-drill, and basic seeds.
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
import { ContainmentApi } from '../../containment';
import { StuffApi } from '../../stuff';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { CommandGiver } from '../../../lib/command/CommandGiver';

class TestLocation extends ContainerMixin(
  DetailedMixin(NamedMixin(PerceptibleMixin(Idea)))
) {}

class TestThing extends ContainableMixin(
  DetailedMixin(NamedMixin(PerceptibleMixin(Idea)))
) {}

class TestGiver extends ContainerMixin(
  ContainableMixin(CommandGiverMixin(NamedMixin(PerceptibleMixin(Idea))))
) {}

export interface MqlWorld {
  giver: Stuff & CommandGiver;
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

  const giver = makeStuff(() => new TestGiver()) as unknown as Stuff &
    CommandGiver & { setName: (n: string) => void };
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
