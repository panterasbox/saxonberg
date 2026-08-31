/**
 * `capturesAtShutdown()` — who wants a capture as the process ends, as a
 * PREDICATE the host answers about itself.
 *
 * ⭐ This briefly was a `PersistableRegistry`: hosts enrolled themselves
 * on `setPersistenceKey` and withdrew on destruct, and
 * `AppBootstrap.shutdown()` iterated the set. It was a THIRD index of
 * Stuff (beside `byId` and `byTemplatePath`) holding no fact the objects
 * did not already hold — and its one consumer re-derived every one of
 * them on read: `isPersistable`, a null key, `isDestroyed`. A cache
 * whose reader revalidates everything it caches is buying nothing, and
 * this one was maintained on every key-set and every destruct, forever,
 * to save a single sweep at process exit.
 *
 * The hosts are now found by the sanctioned world search —
 * `world:[mixin.PersistableMixin]` in system mode, which is exactly what
 * `lint:world-scan` points a bespoke `getAllObjects()` loop at — and
 * asked. Nothing to keep in sync, nothing to go stale on a hot reload.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { MqlApi } from '../../../api/mql';
import { PersistableMixin } from '../Persistable';
import { PostRegistrationMixin } from '../../stuff/PostRegistration';
import { ContainerMixin } from '../../spatial/Container';
import { HasInteractiveMixin } from '../../connection/HasInteractive';
import Thing from '../../stuff/Thing';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

class Counter extends PersistableMixin(
  PostRegistrationMixin(ContainerMixin(Thing)),
) {}

/** A host that is also a connection endpoint — the Avatar's shape. */
class Persona extends PersistableMixin(
  PostRegistrationMixin(HasInteractiveMixin(ContainerMixin(Thing))),
) {}

let seq = 0;

/** What the shutdown loop actually does, minus the capture itself. */
function shutdownHosts(): unknown[] {
  return MqlApi.resolveMany('world:[mixin.PersistableMixin]', {
    commandGiver: null,
    scope: 'world',
  }).stuff.filter(
    (s) =>
      (s as unknown as { capturesAtShutdown(): boolean }).capturesAtShutdown(),
  );
}

describe('capturesAtShutdown — the shutdown capture asks, it does not remember', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('a host with no persistence key says no — there is nothing to write', () => {
    seq += 1;
    const counter = makeStuffAtPath(
      () => new Counter(),
      `/fx/thing/counter-${seq}`,
    ) as unknown as Counter;
    expect(counter.capturesAtShutdown()).toBe(false);
    expect(shutdownHosts()).toHaveLength(0);
  });

  it('and says yes once it establishes one', () => {
    seq += 1;
    const counter = makeStuffAtPath(
      () => new Counter(),
      `/fx/thing/counter-${seq}`,
    ) as unknown as Counter;
    counter.setPersistenceKey('the-cash-and-carry');
    expect(counter.capturesAtShutdown()).toBe(true);
    expect(shutdownHosts()).toContain(counter as never);
  });

  it('a connection endpoint says no — it captures at logout on its own seam', () => {
    seq += 1;
    const persona = makeStuffAtPath(
      () => new Persona(),
      `/fx/agent/persona-${seq}`,
    ) as unknown as Persona;
    persona.setPersistenceKey('someone');
    expect(persona.capturesAtShutdown()).toBe(false);
    expect(shutdownHosts()).toHaveLength(0);
  });

  // The registry needed an explicit withdraw on destruct AND an
  // isDestroyed filter on read. Derivation needs neither: a destroyed
  // host is out of the registry MQL walks, so it cannot be answered.
  it('a destroyed host is simply not there — no withdrawal to forget', async () => {
    seq += 1;
    const counter = makeStuffAtPath(
      () => new Counter(),
      `/fx/thing/counter-${seq}`,
    ) as unknown as Counter;
    counter.setPersistenceKey('gone-soon');
    expect(shutdownHosts()).toHaveLength(1);

    await StuffApi.destruct(counter as never);
    expect(shutdownHosts()).toHaveLength(0);
  });
});
