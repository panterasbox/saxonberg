/**
 * ⭐⭐ **The D3 check, and the single most important test in this build.**
 *
 * The defect that opened the cycle: `sit` / `lie` / `kneel` returned
 * `empty-result[target]` in the room a brand-new character opens their eyes
 * in. The obvious diagnosis — *no room has a floor* — is true and is only
 * half of it. The other half, measured in W0: the view's `default: "ground"`
 * is applied **at assembly**, so the word `ground` was reaching MQL all
 * along and matching nothing.
 *
 * Why it matched nothing: `api/mql/scope-walk.ts` pools a thing's own
 * candidate from `perceivedKeywordsFor(viewer)` →
 * `RecognitionLogic` → `getKeywords()`, and `pushDetails` emits one
 * candidate per detail **id** with the pool `[id.toLowerCase()]` —
 * *"keyword pool for a detail is just its id list"*. So `default-floor`'s
 * `details.floor.keywords: [floor, ground, dirt, surface]` was dead text,
 * and **attaching that row to every Location in the game would have fixed
 * `look floor` and left bare `sit` broken.**
 *
 * Hence the keyword union on the class. This file proves it where it
 * matters: through the real scope walk, on a floor whose row authors
 * NEITHER word — which is `weeping-floor`, verbatim.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { MqlApi } from '../../../api/mql';
import { ContainmentApi } from '../../../api/containment';
import CartesianLocation from '../../location/CartesianLocation';
import Floor from '../../../platform/thing/Floor';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { PerceptibleMixin } from '../../description/Perceptible';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
import type { CommandGiver } from '../../command/CommandGiver';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestActor extends ContainerMixin(
  ContainableMixin(PerceptibleMixin(Idea))
) {}

function resolve(actor: Stuff, query: string): Stuff[] {
  return MqlApi.resolveMany(query, {
    commandGiver: actor as unknown as Stuff & CommandGiver,
    scope: 'reachable',
  }).stuff;
}

describe('a floor answers to `ground` through the real scope walk', () => {
  let room: CartesianLocation;
  let actor: TestActor;
  let floor: Floor;

  beforeEach(() => {
    room = makeStuff(() => new CartesianLocation());
    room.setShortDescription('a flagged cell');
    actor = makeStuff(() => new TestActor());
    ContainmentApi.move(actor, room);

    floor = makeStuff(() => new Floor());
    // `weeping-floor.yaml`, verbatim: neither `floor` nor `ground`.
    floor.setKeywords(['flagstones', 'wet']);
    floor.setShortDescription('wet flagstones');
    room.addFixture(floor, 'floor');
  });

  it('⭐ resolves the bare word `ground` — what `sit` sends', () => {
    expect(resolve(actor, 'ground')).toContain(floor);
  });

  it('⭐ resolves `floor` — what `look floor` sends', () => {
    expect(resolve(actor, 'floor')).toContain(floor);
  });

  it('still resolves the words the row DID author', () => {
    expect(resolve(actor, 'flagstones')).toContain(floor);
    expect(resolve(actor, 'wet')).toContain(floor);
  });

  it('a fixture is in the reachable pool at all (the premise)', () => {
    // If this ever fails, nothing above means anything — the keywords
    // would be right and the floor still untargetable.
    expect(resolve(actor, 'flagstones')).toHaveLength(1);
  });

  it('the floor is its own target, distinct from the room (AC 4)', () => {
    const asGround = resolve(actor, 'ground');
    expect(asGround).toContain(floor);
    expect(asGround).not.toContain(room as unknown as Stuff);
  });
});
