/**
 * Viewer-relative targeting — the name-leak gate (Wave 5).
 *
 * A target resolves only by what the viewer can perceive: its `knownAs`
 * if recognized, salient features if not, the disguise's descriptors if
 * masked — never its true name. Naming and targeting share
 * `RecognitionApi.describe`, so `look bob` works iff the room view shows
 * the viewer "Bob". Ordinal disambiguation carries no identity.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { MqlApi } from '../../mql';
import { RECOGNITION } from '../../../lib/belief/BeliefStore';
import { BeliefStoreMixin } from '../../../lib/belief/BeliefStore';
import { PerceptionMixin } from '../../../lib/perception/Perception';
import { SensorMixin } from '../../../lib/message/Sensor';
import { DisguisableMixin } from '../../../lib/disguise/Disguisable';
import { NamedMixin } from '../../../lib/description/Named';
import { VisibleMixin } from '../../../lib/description/Visible';
import { OrganismMixin } from '../../../lib/species/Organism';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { Idea } from '../../../lib/stuff/Idea';
import { ContainmentApi } from '../../containment';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';
import type { MqlContext } from '../types';

class Viewer extends BeliefStoreMixin(
  PerceptionMixin(SensorMixin(ContainableMixin(Idea))),
) {}

class Figure extends DisguisableMixin(
  OrganismMixin(VisibleMixin(NamedMixin(ContainableMixin(Idea)))),
) {}

class Room extends ContainerMixin(Idea) {}

let counter = 0;
function makeFigure(name: string, appearance: string): Figure {
  const f = makeStuffAtPath(() => new Figure(), `/obj/npc/fig-${counter++}`);
  f.setName(name);
  f.setShortDescription(appearance);
  return f;
}

function peersCtx(viewer: Viewer): MqlContext {
  return { commandGiver: viewer as never, scope: 'peers' };
}

describe('viewer-relative targeting (name-leak gate)', () => {
  it('look bob fails for a viewer who does not recognize Bob', () => {
    const room = makeStuff(() => new Room());
    const viewer = makeStuff(() => new Viewer());
    const bob = makeFigure('Bob', 'a tall stranger');
    ContainmentApi.move(viewer, room);
    ContainmentApi.move(bob, room);

    // "bob" is not a keyword — Bob is unknown.
    expect(MqlApi.resolveOne('bob', peersCtx(viewer)).stuff).toBeNull();
    // But his salient features address him.
    expect(MqlApi.resolveOne('stranger', peersCtx(viewer)).stuff).toBe(bob);
  });

  it('a recognized Bob IS addressable as "bob"', () => {
    const room = makeStuff(() => new Room());
    const viewer = makeStuff(() => new Viewer());
    const bob = makeFigure('Bob', 'a tall stranger');
    ContainmentApi.move(viewer, room);
    ContainmentApi.move(bob, room);

    viewer.know(RECOGNITION, bob.getTemplatePath()!, { knownAs: 'Bob' });
    expect(MqlApi.resolveOne('bob', peersCtx(viewer)).stuff).toBe(bob);
  });

  it('a masked Bob is not addressable by name even by someone who knows him', () => {
    const room = makeStuff(() => new Room());
    const viewer = makeStuff(() => new Viewer());
    const bob = makeFigure('Bob', 'a tall stranger');
    ContainmentApi.move(viewer, room);
    ContainmentApi.move(bob, room);

    viewer.know(RECOGNITION, bob.getTemplatePath()!, { knownAs: 'Bob' });
    bob.setDisguise({
      appearsAs: 'a hooded figure',
      covers: ['face'],
      masksIdentity: true,
    });

    expect(MqlApi.resolveOne('bob', peersCtx(viewer)).stuff).toBeNull();
    // Addressable only by the disguise's descriptors.
    expect(MqlApi.resolveOne('hooded', peersCtx(viewer)).stuff).toBe(bob);
  });

  it('perceptually-identical figures disambiguate by ordinal, no name leak', () => {
    const room = makeStuff(() => new Room());
    const viewer = makeStuff(() => new Viewer());
    const a = makeFigure('Alice', 'a tall stranger');
    const b = makeFigure('Bianca', 'a tall stranger');
    const c = makeFigure('Cara', 'a tall stranger');
    for (const s of [viewer, a, b, c]) ContainmentApi.move(s, room);

    // All three match the salient keyword; none leak a true name.
    const many = MqlApi.resolveMany('stranger', peersCtx(viewer));
    expect(many.stuff).toHaveLength(3);
    expect(MqlApi.resolveOne('alice', peersCtx(viewer)).stuff).toBeNull();

    // Ordinal picks one out of the set (an index into the snapshot, not
    // an identity). `second stranger` → `stranger:[2]`.
    const second = MqlApi.resolveOne('second stranger', peersCtx(viewer)).stuff;
    expect([a, b, c]).toContain(second);
  });
});
