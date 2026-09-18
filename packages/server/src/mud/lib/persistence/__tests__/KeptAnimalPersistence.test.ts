/**
 * ⭐⭐ **A named animal persists ITSELF, and its owner's estate holds a
 * reference to it.**
 *
 * The distinction is the whole of W1b. A saucer in your estate is a
 * *copy*: the owner's record says what it is and what state it is in,
 * because a saucer has no life of its own. A pet is a *reference*: its
 * regard for you, its hunger, its handling and its home are the PET's
 * state, and its own `holder_snapshots` record is authoritative.
 *
 * ⚠ Without the split the owner's capture would snapshot the animal into
 * the owner's record while the animal went on writing its own — two
 * copies of one creature, diverging from its first meal, with nothing
 * anywhere to say which was right.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EstateMixin } from '../../chattel/Estate';
import { PersistableMixin } from '../Persistable';
import { BeliefStoreMixin } from '../../belief/BeliefStore';
import { ChattelMixin } from '../../chattel/Chattel';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import type { EstateEntry, MixinSlice } from '../PersistenceSlice';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

/** An owner: holds title to things. */
class Owner extends EstateMixin(ContainerMixin(Idea)) {}
/** A pet: persists itself, and remembers you. */
class Pet extends PersistableMixin(
  BeliefStoreMixin(ChattelMixin(ContainableMixin(Idea))),
) {}
/** An ordinary good: no life of its own. */
class Saucer extends ChattelMixin(ContainableMixin(Idea)) {}

const ctx = {
  captureState: () => ({ marker: { fields: { copied: true } } }) as Record<string, MixinSlice>,
};

let n = 0;
beforeEach(() => StuffApi.clearAll());
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

function entryFor(chattelId: string, path: string): EstateEntry {
  return { chattelId, templatePath: path, state: {}, place: 'inventory' };
}

describe('the estate captures a self-persisting good as a REFERENCE', () => {
  /**
   * ⭐ The estate's entry map is written behind a `SelfOnly` gate by the
   * spine itself. What is under test here is the **capture decision** —
   * given an entry and the live good it names, copy or reference? — so
   * the host is stubbed to its two reads and the security machinery
   * (which has its own tests) stays out of it.
   */
  const captureWith = (entry: EstateEntry, live: unknown): EstateEntry[] => {
    const host = {
      getEstateEntries: () => [entry],
      getEstateLive: () => live,
    };
    const slice = Owner.captureSlice(host as never, ctx as never);
    return (slice as { entries: EstateEntry[] }).entries;
  };

  it('a keyed pet rides as { key }, with empty state', () => {
    const pet = makeStuffAtPath(() => new Pet(), `/stuff/agent/cat-${n++}`);
    pet.setPersistenceKey('mouse-1');

    const entries = captureWith(entryFor('ch-1', pet.getTemplatePath()!), pet);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.key).toBe('mouse-1');
    // ⭐ Empty — the animal's own record says everything about it.
    expect(entries[0]!.state).toEqual({});
  });

  it('an ordinary good is still captured by VALUE', () => {
    // The regression guard: every good written before keys existed must
    // keep riding as a copy, or every shipped estate record changes shape.
    const saucer = makeStuffAtPath(() => new Saucer(), `/stuff/thing/saucer-${n++}`);
    const entries = captureWith(
      entryFor('ch-2', saucer.getTemplatePath()!),
      saucer,
    );
    expect(entries[0]!.key).toBeUndefined();
    expect(entries[0]!.state).toEqual({ marker: { fields: { copied: true } } });
  });

  it('⚠ a good with an IMPLICIT key is still a copy', () => {
    // Only an EXPLICIT key means "multi-instance, persists itself". A
    // singleton derives its key from its scope and is not this.
    const pet = makeStuffAtPath(() => new Pet(), `/stuff/agent/cat-${n++}`);
    pet.setPersistenceKey('derived', false);
    const entries = captureWith(entryFor('ch-3', pet.getTemplatePath()!), pet);
    expect(entries[0]!.key).toBeUndefined();
  });

  it('a good that is NOT live is carried forward verbatim', () => {
    const entry = entryFor('ch-4', '/stuff/thing/lantern');
    expect(captureWith(entry, null)[0]).toEqual(entry);
  });
});

describe('the belief slice rides WITH the animal', () => {
  it('a keyed pet carries its regard in its own capture, and round-trips', () => {
    const me = makeStuffAtPath(
      () => new Idea(),
      '/platform/agent/Avatar',
      '/platform/agent/Avatar/me',
    );
    const pet = makeStuffAtPath(() => new Pet(), `/stuff/agent/cat-${n++}`);
    pet.setPersistenceKey('mouse-2');
    pet.adjustRegard(me, 61);

    const slice = Pet.captureSlice(pet as never, {} as never);
    expect('beliefs' in slice && slice.beliefs).toHaveLength(1);

    const reborn = makeStuffAtPath(() => new Pet(), `/stuff/agent/cat-${n++}`);
    reborn.setPersistenceKey('mouse-2');
    void Pet.restoreSlice(reborn as never, slice, {} as never);
    expect(reborn.regardFor(me)).toBe(61);
  });
});
