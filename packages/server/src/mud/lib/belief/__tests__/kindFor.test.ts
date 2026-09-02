/**
 * `RecognitionApi.kindOf` — which identity tag a reference renders as,
 * and the one fact it must not give away.
 *
 * The tag axis is new surface: before this build every reference in the
 * game emitted `<name>`, which asserted nothing. `<player>` asserts
 * something real — that a human being is behind this figure — and that
 * is exactly the fact a disguise exists to hide. So the resolution is
 * viewer-aware, and these tests pin both directions of it.
 *
 * ⚠ The `npc` answers below are **false statements told to a fooled
 * viewer**. That is deliberate and consistent: `getPresentation()`
 * already tells a fooled viewer the covering's name. The alternative —
 * a third "unknown" tag — would announce *that* something is being
 * withheld, which leaks the same fact one level up.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import { Mml } from '../../../api/mml';
import { PerceptionMixin } from '../../perception/Perception';
import { SensorMixin } from '../../message/Sensor';
import { ContainableMixin } from '../../spatial/Containable';
import { NamedMixin } from '../../description/Named';
import { VisibleMixin } from '../../description/Visible';
import { OrganismMixin } from '../../species/Organism';
import { HasInteractiveMixin } from '../../connection/HasInteractive';
import { DisguisableMixin } from '../../disguise/Disguisable';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

/** A viewer that can actually run perception queries. */
class Viewer extends PerceptionMixin(
  SensorMixin(ContainableMixin(NamedMixin(Idea))),
) {}

/** An NPC: alive, named, but nobody is driving. */
class Npc extends VisibleMixin(
  OrganismMixin(NamedMixin(ContainableMixin(Idea))),
) {}

/** A player character: alive AND connected-capable. */
class PlayerBody extends DisguisableMixin(
  HasInteractiveMixin(
    VisibleMixin(OrganismMixin(NamedMixin(ContainableMixin(Idea)))),
  ),
) {}

/** Not alive at all. */
class Rock extends VisibleMixin(NamedMixin(ContainableMixin(Idea))) {}

afterEach(() => {
  for (const m of StuffApi.findAllByTemplatePath('/platform/idea/modalities/vision')) {
    StuffApi.unregister(m);
  }
});

describe('RecognitionApi.kindOf — the three answers', () => {
  it('a non-organism is `thing`, whatever else it composes', () => {
    const viewer = makeStuff(() => new Viewer());
    const rock = makeStuff(() => new Rock());
    rock.setName('a blue rock');
    expect(rock.kindFor(viewer)).toBe('thing');
  });

  it('a living thing nobody is driving is `npc`', () => {
    const viewer = makeStuff(() => new Viewer());
    const guard = makeStuff(() => new Npc());
    guard.setName('a guard');
    expect(guard.kindFor(viewer)).toBe('npc');
  });

  it('a living thing that can hold a connection is `player`', () => {
    const viewer = makeStuff(() => new Viewer());
    const alice = makeStuff(() => new PlayerBody());
    alice.setName('Alice');
    expect(alice.kindFor(viewer)).toBe('player');
  });
});

describe('⚠ kindOf does not out a disguised player', () => {
  it('reports `npc` for a player whose disguise masks identity', () => {
    const viewer = makeStuff(() => new Viewer());
    const alice = makeStuff(() => new PlayerBody());
    alice.setName('Alice');
    expect(alice.kindFor(viewer)).toBe('player');

    alice.setDisguise({
      appearsAs: 'a hooded figure',
      covers: ['face'],
      masksIdentity: true,
    });

    // The whole point: the viewer now sees a hooded figure, and
    // nothing on the wire says a human is inside it.
    expect(alice.kindFor(viewer)).toBe('npc');
  });

  it('a mask that does NOT claim to hide identity changes nothing', () => {
    // A costume is not a disguise. Only `masksIdentity` withholds.
    const viewer = makeStuff(() => new Viewer());
    const alice = makeStuff(() => new PlayerBody());
    alice.setName('Alice');
    alice.setDisguise({
      appearsAs: 'a party hat',
      covers: [],
      masksIdentity: false,
    });
    expect(alice.kindFor(viewer)).toBe('player');
  });

  it('with no viewer at all, the object\'s own truth is reported', () => {
    // Logs, snapshots, `refOf`. Nobody is being fooled, so there is
    // nothing to protect — and a log that lied would be useless.
    const alice = makeStuff(() => new PlayerBody());
    alice.setName('Alice');
    alice.setDisguise({
      appearsAs: 'a hooded figure',
      covers: ['face'],
      masksIdentity: true,
    });
    expect(alice.kindFor(undefined)).toBe('player');
  });
});

describe('Mml.actor renders what kindOf decided', () => {
  it('resolves the tag per viewer, not per emitter', () => {
    const viewer = makeStuff(() => new Viewer());
    const alice = makeStuff(() => new PlayerBody());
    alice.setName('Alice');

    // One composed fragment. Two renders. Two different tags — the
    // emitter wrote `Mml.actor` once and never chose.
    const fragment = Mml.actor(alice);
    expect(fragment.toString(viewer)).toContain('<player ');

    alice.setDisguise({
      appearsAs: 'a hooded figure',
      covers: ['face'],
      masksIdentity: true,
    });
    expect(fragment.toString(viewer)).toContain('<npc ');
    expect(fragment.toString(viewer)).not.toContain('<player');
  });
});
