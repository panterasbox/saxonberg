/**
 * A persistable host ENROLLS itself for the shutdown capture.
 *
 * The world's persistable singletons — venue rooms, stock counters —
 * capture at establish and at the residency sweep, so a stop between two
 * sweeps would lose everything consigned or placed since (the libations
 * live drive watched a dev restart empty the cash-and-carry counter).
 * `AppBootstrap.shutdown()` closes that window.
 *
 * ⭐ What is under test is HOW it finds them. The first cut scanned
 * `getAllObjects()` from the bootstrapper — the centre enumerating the
 * periphery, against the self-maintenance pattern every other lifecycle
 * seam uses. A host that establishes a persistence key now says so, and
 * withdraws on destruct; the bootstrapper reads the set and knows nothing
 * about who is in it. The Avatar exclusion travels with the enrollment
 * for the same reason: "I capture at logout instead" is the Avatar's
 * fact, not the bootstrapper's.
 *
 * Synthetic fixtures throughout.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { PersistableRegistry } from '../PersistableRegistry';
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

describe('PersistableRegistry — self-enrollment for the shutdown capture', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    PersistableRegistry._clearForTesting();
  });

  it('a host enrolls when it establishes a persistence key, not before', async () => {
    seq += 1;
    const counter = makeStuffAtPath(
      () => new Counter(),
      `/fx/thing/counter-${seq}`,
    ) as unknown as Counter;
    expect(PersistableRegistry.hosts()).toHaveLength(0);

    counter.setPersistenceKey('the-cash-and-carry');
    expect(PersistableRegistry.hosts()).toContain(counter as never);
  });

  it('enrollment is idempotent — a re-key does not double-enroll', () => {
    seq += 1;
    const counter = makeStuffAtPath(
      () => new Counter(),
      `/fx/thing/counter-${seq}`,
    ) as unknown as Counter;
    counter.setPersistenceKey('one');
    counter.setPersistenceKey('two');
    expect(PersistableRegistry.hosts()).toHaveLength(1);
  });

  it('a connection endpoint never enrolls — it captures at logout on its own seam', () => {
    seq += 1;
    const persona = makeStuffAtPath(
      () => new Persona(),
      `/fx/agent/persona-${seq}`,
    ) as unknown as Persona;
    persona.setPersistenceKey('someone');
    expect(PersistableRegistry.hosts()).toHaveLength(0);
  });

  it('a destroyed host is not handed to the shutdown capture', async () => {
    seq += 1;
    const counter = makeStuffAtPath(
      () => new Counter(),
      `/fx/thing/counter-${seq}`,
    ) as unknown as Counter;
    counter.setPersistenceKey('gone-soon');
    expect(PersistableRegistry.hosts()).toHaveLength(1);

    await StuffApi.destruct(counter as never);
    expect(PersistableRegistry.hosts()).toHaveLength(0);
  });
});
