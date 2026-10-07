/**
 * The durable per-instance handle, rung by rung.
 *
 * ⭐⭐ The contract (requirements 9a): **an identity exists iff the NAME
 * is durable** — re-derivable from inputs that outlive the instance, or
 * recorded somewhere durable. The handle is that rule as a string, and
 * `null` is a real answer: an object that is one of an unbounded many,
 * named by nothing, has no handle and `stuffId` is what covers it
 * within one life.
 *
 * Three rungs, each on the host that owns the fact:
 *   Stuff        — a minted identity is a durable name.
 *   Persistable  — `<row>#<key>` for an explicitly keyed host.
 *   Singleton    — the one instance IS the row.
 *
 * Precedence is composition order: a key beats a stamp, and Singleton
 * only ever fills in a null.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { Idea } from '../Idea';
import { SingletonMixin } from '../Singleton';
import { PersistableMixin } from '../../persistence/Persistable';
import { ContainerMixin } from '../../spatial/Container';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';

const ROW = '/stuff/idea/widget';

class Widget extends Idea {}
class KeyedWidget extends PersistableMixin(ContainerMixin(Idea)) {}
class LoneWidget extends SingletonMixin(Idea) {}
class KeyedLoneWidget extends SingletonMixin(
  PersistableMixin(ContainerMixin(Idea)),
) {}

beforeEach(() => {
  StuffApi.clearAll();
});

describe('the base rung — a minted identity is a durable name', () => {
  it('an ordinary clone of a row has NO handle', () => {
    // Many of these exist; nothing names this one. `stuffId` covers it.
    const bare = makeStuffAtPath(() => new Widget(), ROW);
    expect(bare.getDurableHandle()).toBeNull();
  });

  it('a row-prefixed minted identity IS the handle', () => {
    const minted = makeStuffAtPath(() => new Widget(), ROW, `${ROW}/one`);
    expect(minted.getDurableHandle()).toBe(`${ROW}/one`);
  });

  it('a family-prefixed minted identity is the handle too', () => {
    // Continuity: the identity is not under the row, and that is fine —
    // the handle asks whether the NAME is durable, not what shape it is.
    const avatar = makeStuffAtPath(
      () => new Widget(),
      '/platform/agent/PrimaryAvatar',
      '/platform/agent/Avatar/p1',
    );
    expect(avatar.getDurableHandle()).toBe('/platform/agent/Avatar/p1');
  });

  it('⚠ an unregistered object with no template path has no handle', () => {
    const loose = makeStuff(() => new Widget());
    expect(loose.getTemplatePath()).toBeNull();
    expect(loose.getDurableHandle()).toBeNull();
  });

  it("⚠ the id !== row test is the rung: a default identity is NOT a handle", () => {
    // `getIdentityPath()` falls back to the template path, so an
    // ephemeral clone's "identity" is its own row. Read naively that
    // hands a lounge satellite a handle it has no right to.
    const bare = makeStuffAtPath(() => new Widget(), ROW);
    expect(bare.getIdentityPath()).toBe(ROW);
    expect(bare.getDurableHandle()).toBeNull();
  });
});

describe('the keyed rung — row plus decoration', () => {
  it('⭐ an explicitly keyed host reads <row>#<key>', () => {
    const room = makeStuffAtPath(() => new KeyedWidget(), ROW);
    room.setPersistenceKey('extent-a/kitchen');
    expect(room.getDurableHandle()).toBe(`${ROW}#extent-a/kitchen`);
  });

  it('two keyed instances of one row have different handles', () => {
    const a = makeStuffAtPath(() => new KeyedWidget(), ROW);
    const b = makeStuffAtPath(() => new KeyedWidget(), ROW);
    a.setPersistenceKey('extent-a/room');
    b.setPersistenceKey('extent-b/room');
    expect(a.getDurableHandle()).not.toBe(b.getDurableHandle());
  });

  it('⚠ a SCOPE-DERIVED key does not qualify — provenance, not nullness', () => {
    // `explicit: false` is what the spine stashes for a singleton's
    // self-owner. Folding it in would give one room two handles either
    // side of a capture it never asked for.
    const room = makeStuffAtPath(() => new KeyedWidget(), ROW);
    room.setPersistenceKey('parcel:somewhere', false);
    expect(room.getPersistenceKey()).toBe('parcel:somewhere');
    expect(room.isPersistenceKeyExplicit()).toBe(false);
    expect(room.getDurableHandle()).toBeNull();
  });

  it('the key beats the stamp: both present reads <row>#<key>', () => {
    const counter = makeStuffAtPath(
      () => new KeyedWidget(),
      ROW,
      `${ROW}/pitch-3`,
    );
    counter.setPersistenceKey('stalls/3');
    expect(counter.getDurableHandle()).toBe(`${ROW}#stalls/3`);
  });

  it('an unkeyed persistable host falls through to the rung below', () => {
    const minted = makeStuffAtPath(
      () => new KeyedWidget(),
      ROW,
      `${ROW}/one`,
    );
    expect(minted.getDurableHandle()).toBe(`${ROW}/one`);
  });
});

describe('the singleton rung — the one instance IS the row', () => {
  it('⭐ a singleton place reads its row, byte-identical to the old key', () => {
    const bar = makeStuffAtPath(() => new LoneWidget(), ROW);
    expect(bar.getDurableHandle()).toBe(ROW);
  });

  it('it only fills a null — a stamp above it still wins', () => {
    const odd = makeStuffAtPath(() => new LoneWidget(), ROW, `${ROW}/one`);
    expect(odd.getDurableHandle()).toBe(`${ROW}/one`);
  });

  it('a keyed singleton keeps the keyed answer', () => {
    const host = makeStuffAtPath(() => new KeyedLoneWidget(), ROW);
    host.setPersistenceKey('k');
    expect(host.getDurableHandle()).toBe(`${ROW}#k`);
  });
});
