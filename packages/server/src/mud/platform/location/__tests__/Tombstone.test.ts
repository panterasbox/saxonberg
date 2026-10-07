/**
 * The tombstone — ⭐⭐ offline is a camera, not a wall.
 *
 * Draft content has never been live, so the flag alone is enough. Live
 * content coming down is different: somebody may be standing in it, and
 * the honest thing is to move them somewhere that **tells them what
 * happened and who to ask**, rather than to a void room or to a refusal
 * with no fiction behind it.
 *
 * And then to get out of the way. A tombstone is a MESSAGE, not a
 * place; a message nobody is reading is litter, and one room per
 * offlining for the life of the world is litter that accumulates.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Tombstone, { TOMBSTONE_ROW } from '../Tombstone';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { Idea } from '../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { HasInteractiveMixin } from '../../../lib/connection/HasInteractive';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';

const EXTENT = '/test/pub/draftville';

/** Somebody with a connection — the only thing that pins a tombstone. */
class Person extends HasInteractiveMixin(
  ContainerMixin(ContainableMixin(Idea)),
) {
  static _mixinName = 'TombstoneTestPerson';
}

/** A thing left behind — must NOT pin the tombstone open. */
class Crate extends ContainableMixin(Idea) {}

beforeEach(() => {
  StuffApi.clearAll();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/*
 * ⚠ The identity FORMULA is not tested here, because it does not live
 * here: `lint:lib-statics` refused a new static on a non-Api class, and
 * the better placement is with its one asker (`ParcelLogic`, the
 * offlining). What that formula BUYS is tested where it matters — in
 * `ParcelRegistry.published`, offlining the same ground twice leaves one
 * marker standing. That is the guarantee; the string is an
 * implementation of it.
 */

describe('it names what happened, and who to ask', () => {
  it('carries the extent and the holder', () => {
    const stone = makeStuffAtPath(() => new Tombstone(), TOMBSTONE_ROW);
    stone.setExtent(EXTENT);
    stone.setTakenDownBy('the Compact');
    expect(stone.getExtent()).toBe(EXTENT);
    expect(stone.getTakenDownBy()).toBe('the Compact');
  });
});

describe('⭐⭐ it reaps itself once the last reader leaves', () => {
  it('destructs when the last PERSON goes', async () => {
    const stone = makeStuffAtPath(() => new Tombstone(), TOMBSTONE_ROW);
    const person = makeStuff(() => new Person());
    ContainmentApi.move(
      person as unknown as Stuff & Containable,
      stone as unknown as Stuff & Container,
    );

    // The exit hook fires after the move; simulate the departure.
    ContainmentApi.move(
      person as unknown as Stuff & Containable,
      makeStuff(() => new Person()) as unknown as Stuff & Container,
    );
    stone.onExited(person as never, {} as never);
    await new Promise((r) => setTimeout(r, 0));

    expect((stone as unknown as Stuff).isDestroyed()).toBe(true);
  });

  it('stays while somebody is still reading it', async () => {
    const stone = makeStuffAtPath(() => new Tombstone(), TOMBSTONE_ROW);
    const a = makeStuff(() => new Person());
    const b = makeStuff(() => new Person());
    for (const p of [a, b]) {
      ContainmentApi.move(
        p as unknown as Stuff & Containable,
        stone as unknown as Stuff & Container,
      );
    }

    // One of two leaves.
    ContainmentApi.move(
      a as unknown as Stuff & Containable,
      makeStuff(() => new Person()) as unknown as Stuff & Container,
    );
    stone.onExited(a as never, {} as never);
    await new Promise((r) => setTimeout(r, 0));

    expect((stone as unknown as Stuff).isDestroyed()).toBe(false);
  });

  it('⚠ a dropped OBJECT does not pin it open forever', async () => {
    // Only `HasInteractive` occupants count. A crate left behind by an
    // evicted player must not keep a marker standing for the life of
    // the world.
    const stone = makeStuffAtPath(() => new Tombstone(), TOMBSTONE_ROW);
    const person = makeStuff(() => new Person());
    const crate = makeStuff(() => new Crate());
    for (const thing of [person, crate]) {
      ContainmentApi.move(
        thing as unknown as Stuff & Containable,
        stone as unknown as Stuff & Container,
      );
    }

    ContainmentApi.move(
      person as unknown as Stuff & Containable,
      makeStuff(() => new Person()) as unknown as Stuff & Container,
    );
    stone.onExited(person as never, {} as never);
    await new Promise((r) => setTimeout(r, 0));

    expect((stone as unknown as Stuff).isDestroyed()).toBe(true);
  });
});
