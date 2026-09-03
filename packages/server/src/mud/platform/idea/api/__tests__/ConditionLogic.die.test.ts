/**
 * `ConditionApi.die` — the single death transition.
 *
 * Before this, nine subsystems could kill a character and each flipped
 * `lifecycleState` itself: seven sites, three of them byte-identical
 * copy-pasted helpers. Only combat fed the accountability ledger, so eight
 * of the nine deaths in the game left no record that anything had happened
 * to anybody.
 *
 * The rule that lets one call replace seven without violating
 * accountability's producers-not-a-chokepoint doctrine: **the ledger never
 * infers.** Consent, the killer and the terms are supplied by the producer
 * that knows them. Combat knows; hypothermia does not, and the row it
 * writes is structurally incapable of deriving as a crime.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Creature } from '../../../../lib/creature/Creature';
import { PersonaMixin } from '../../../../lib/character/Persona';
import { ConditionApi } from '../../../../api/condition';
import { AccountabilityApi } from '../../../../api/accountability';
import { StuffApi } from '../../../../api/stuff';
import AccountabilityEvent from '../../../../lib/accountability/AccountabilityEvent';
import type { AccountabilityFields } from '../../../../lib/accountability/AccountabilityEvent';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

let rows: AccountabilityFields[] = [];
let deeds: { tags?: string[] }[] = [];

class StoriedCreature extends PersonaMixin(Creature) {}

function body(): Creature {
  const c = makeStuff(() => new Creature());
  c.setLifecycleState('alive');
  return c;
}

/** A persona-composed body whose own recordDeed is the capture seam. */
function storiedBody(): StoriedCreature {
  const c = makeStuff(() => new StoriedCreature());
  c.setLifecycleState('alive');
  vi.spyOn(c, 'recordDeed').mockImplementation(async (f) => {
    deeds.push(f as { tags?: string[] });
  });
  return c;
}

describe('ConditionApi.die — one transition', () => {
  beforeEach(() => {
    rows = [];
    deeds = [];
    installV1QuantityMarshallers();
    vi.spyOn(AccountabilityApi, 'record').mockImplementation((f) => {
      rows.push(f);
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('flips the lifecycle SYNCHRONOUSLY and stamps the cause', async () => {
    const c = body();
    const promise = ConditionApi.die(c, 'hypothermia');

    // Before the promise settles: everything a reader can observe is
    // already true. A read on the same tick must never catch a half-dead
    // body.
    expect(c.getLifecycleState()).toBe('dead');
    expect(c.getCauseOfDeath()).toBe('hypothermia');

    await promise;
  });

  it('death is NOT destruction — the body persists as a corpse', async () => {
    const c = body();
    await ConditionApi.die(c, 'hypothermia');

    expect(c.isDestroyed()).toBe(false);
    expect(StuffApi.findById(c.stuffId)).toBe(c);
    // Body-state survives into the corpse — the forensic record.
    expect(c.getVitalSign('coreTemperature').rawValue()).toBeGreaterThan(0);
  });

  it('is idempotent — a second call does not double-write', async () => {
    const c = body();
    await ConditionApi.die(c, 'hypothermia');
    await ConditionApi.die(c, 'exsanguination');

    expect(c.getCauseOfDeath()).toBe('hypothermia'); // the first cause
    expect(rows).toHaveLength(1);
  });

  it('clears the dying record it resolves', async () => {
    const c = body();
    c.beginDying('exsanguination', 120);
    expect(c.isDying()).toBe(true);

    await ConditionApi.die(c, 'exsanguination');

    expect(c.getConditions().some((x) => x.kind === 'dying')).toBe(false);
  });

  it('an environmental death is structurally incapable of being a crime', async () => {
    const c = body();
    await ConditionApi.die(c, 'hypothermia');

    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.kind).toBe('death');
    expect(row.killer).toBe('');
    // `lethality` is OMITTED, not falsified. Nobody imposed lethal terms,
    // so the crime expression cannot fire — a stronger statement than
    // claiming the victim consented to freezing to death.
    expect(row.lethality).toBeUndefined();

    const event = new AccountabilityEvent();
    Object.assign(event, row);
    const verdict = AccountabilityEvent.deriveBlame([event]);
    expect(verdict?.crime ?? false).toBe(false);
  });

  it('a death from a NON-COMBAT driver reaches the ledger at all', async () => {
    // The gap this closes: only combat used to write here, so eight of the
    // nine ways to die left the ledger empty.
    const c = body();
    await ConditionApi.die(c, 'starvation');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.victim).toBeTruthy();
  });

  it('caller-supplied attribution is used verbatim — the ledger never infers', async () => {
    const c = body();
    const supplied: AccountabilityFields = {
      kind: 'death',
      sessionId: 'fight-1',
      initiator: '/platform/agent/Avatar/mara',
      opponent: '/platform/agent/Avatar/mara',
      victim: '/platform/agent/Avatar/vic',
      killer: '/platform/agent/Avatar/mara',
      lethality: 'lethal',
      consented: false,
      sentient: true,
    };

    await ConditionApi.die(c, 'slain', { accountability: supplied });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(supplied);
  });

  it('attribution stamped on the dying record survives to the death row', async () => {
    // A bleed-out finishes long after the fight resolves; by then the
    // session is gone and nothing else knows who struck the blow.
    const c = body();
    const supplied: AccountabilityFields = {
      kind: 'death',
      sessionId: 'fight-2',
      initiator: '/platform/agent/Avatar/rat',
      opponent: '/platform/agent/Avatar/rat',
      victim: '/platform/agent/Avatar/vic',
      killer: '/platform/agent/Avatar/rat',
      lethality: 'lethal',
      consented: false,
      sentient: true,
    };
    c.beginDying('exsanguination', 120, supplied);

    await ConditionApi.die(c, 'exsanguination');

    expect(rows[0]!.killer).toBe('/platform/agent/Avatar/rat');
  });

  it('mints a chronicle deed tagged death (persona hosts only)', async () => {
    const c = storiedBody();
    await ConditionApi.die(c, 'hypothermia');
    expect(deeds).toHaveLength(1);
    expect(deeds[0]!.tags).toContain('death');
  });

  it('refuses a non-organism and a corpse without throwing', async () => {
    const rock = makeStuff(() => new Creature());
    rock.setLifecycleState('dead');
    await ConditionApi.die(rock, 'again');
    expect(rows).toHaveLength(0);
  });
});
