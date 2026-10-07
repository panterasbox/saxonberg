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
 *
 * ⭐⭐ **Rewritten by the carcass-chain build.** These tests used to pin
 * *"death is NOT destruction — the body persists as a corpse"*, which was
 * two claims wearing one sentence: the body persisted AND it was the
 * corpse. The second half is gone. Every death now mints a `Corpse` and
 * destructs the thing that died, so the body does not persist — what
 * persists is a body, which is the thing the sentence was actually
 * promising. A dead ewe is no longer a ewe that cannot be milked.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Creature } from '../../../../lib/creature/Creature';
import Corpse from '../../../thing/Corpse';
import { Quantity } from '../../../../lib/quantity';
import { Reserve } from '../../../../lib/reserve';
import { ContaminableMixin } from '../../../../lib/material/Contaminable';
import { ContainmentApi } from '../../../../api/containment';
import { installCorpseMintStub } from '../../../../lib/mortality/__tests__/corpse-mint-test-helpers';
import { MixinApi } from '../../../../api/mixin';
import { PersonaMixin } from '../../../../lib/character/Persona';
import { ConditionApi } from '../../../../api/condition';
import { AccountabilityApi } from '../../../../api/accountability';
import { StuffApi } from '../../../../api/stuff';
import { Stuff } from '../../../../lib/stuff/Stuff';
import AccountabilityEvent from '../../../../lib/accountability/AccountabilityEvent';
import type { AccountabilityFields } from '../../../../lib/accountability/AccountabilityEvent';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

let rows: AccountabilityFields[] = [];
/** The bodies the stubbed mint has left this test — see the helper. */
let corpses: Corpse[] = [];
let deeds: { tags?: string[] }[] = [];

class StoriedCreature extends PersonaMixin(Creature) {}

/**
 * A body that can carry a silent population — a fish, in the shipped
 * tree. ⭐ `Creature` itself is NOT `Contaminable` and should not be: a
 * living animal's gut flora is not a surface load. The CORPSE is, which
 * is the crossing this fixture exists to pin.
 */
class SeededCreature extends ContaminableMixin(Creature) {}

/**
 * ⚠ The fixture is TEMPLATE-STAMPED, and it has to be. The ledger keys
 * every party on `getIdentityPath()` — which for an ordinary body IS its
 * template path — and refuses a terminal row that names no victim rather
 * than filing it under the empty string. An unstamped fixture is not a
 * body the world could ever contain; the old `?? stuffId` fallback made
 * it look like one, at the price of minting a session-ephemeral key that
 * no reader could query after a reboot.
 */
let bodySeq = 0;
function body(): Creature {
  const c = makeStuff(() => new Creature());
  Stuff._stampTemplatePath(c, `/stuff/agent/test-body/${++bodySeq}`);
  c.setLifecycleState('alive');
  return c;
}

/** A persona-composed body whose own recordDeed is the capture seam. */
function storiedBody(): StoriedCreature {
  const c = makeStuff(() => new StoriedCreature());
  Stuff._stampTemplatePath(c, `/stuff/agent/test-storied/${++bodySeq}`);
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
    // Every death mints a corpse now, so the stand-in is universal rather
    // than per-test.
    corpses = installCorpseMintStub();
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

  it('a death leaves A BODY — the dead thing is replaced by its corpse', async () => {
    const minted = corpses;
    const c = body();
    const temperatureAtDeath = c.getVitalSign('coreTemperature').rawValue();

    await ConditionApi.die(c, 'hypothermia');

    // The thing that died is gone; exactly one body stands in its place.
    expect(c.isDestroyed()).toBe(true);
    expect(minted).toHaveLength(1);
    const corpse = minted[0]!;
    expect(corpse.isDestroyed()).toBe(false);
    expect(corpse.getCauseOfDeath()).toBe('hypothermia');
    expect(corpse.getLifecycleState()).toBe('dead');
    // The forensic record travelled — the vital signs as they stood. This
    // is the assertion the old test made on the same object.
    expect(corpse.getVitalSign('coreTemperature').rawValue()).toBe(
      temperatureAtDeath,
    );
  });

  it('the corpse carries the mass the body HAD, not a newborn\'s', async () => {
    // ⚠ The defect this pins: `Creature.getMass()` derives from
    // `species.massAt(getAgeDays())` when no mass is stored, and a fresh
    // clone's `bornAt` is 0 — so an unstamped corpse of a full-grown ewe
    // would have dressed out as a lamb.
    const minted = corpses;
    const c = body();
    c.setMass(Quantity.of(70, 'kg'));
    c.setBornAt(1000);

    await ConditionApi.die(c, 'slaughtered');

    const corpse = minted[0]!;
    expect(corpse.getMass().rawValue()).toBeCloseTo(70, 5);
    expect(corpse.getBornAt()).toBe(1000);
  });

  it('the corpse carries the condition the body DIED in, as a number', async () => {
    const minted = corpses;
    const c = body();
    c.setReserve(
      new Reserve('flesh', Quantity.of(100, '%'), Quantity.of(82, '%'), 'biological', null),
    );

    await ConditionApi.die(c, 'slaughtered');

    expect(minted[0]!.getConditionAtDeath()).toBe(82);
  });

  it('the corpse answers to the dead thing\'s own keywords', async () => {
    const minted = corpses;
    const c = body();
    c.setKeywords(['ewe', 'sheep']);

    await ConditionApi.die(c, 'slaughtered');

    const kw = minted[0]!.getKeywords();
    expect(kw).toContain('ewe');
    expect(kw).toContain('body');
  });

  it('a silent contamination load moves onto the corpse', async () => {
    // The fishing pack's outfall load used to ride a dead `Fish`; a dead
    // fish is a `Corpse` now, so the load has to make the crossing or the
    // fillet comes out clean when it should not.
    const minted = corpses;
    const c = makeStuff(() => new SeededCreature());
    Stuff._stampTemplatePath(c, `/stuff/agent/test-seeded/${++bodySeq}`);
    c.setLifecycleState('alive');
    expect(MixinApi.isContaminable(c)).toBe(true);
    // ⚠ `contaminate()` resolves the pathogen's BEHAVIOR off a content
    // row and no-ops without one, so the load is set directly here. The
    // roster is content; what this test is about is the crossing.
    c.setPathogenLoads({ salmonella: 0.4 });

    await ConditionApi.die(c, 'slaughtered');

    const corpse = minted[0]!;
    expect(MixinApi.isContaminable(corpse)).toBe(true);
    expect(corpse.getPathogenLoads()['salmonella']).toBeGreaterThan(0);
  });

  it('the loadout moves to the body, which is where someone has to go for it', async () => {
    const minted = corpses;
    const c = body();
    const held = makeStuff(() => new Creature());
    Stuff._stampTemplatePath(held, '/stuff/thing/test-held');
    ContainmentApi.move(held, c);

    await ConditionApi.die(c, 'slaughtered');

    expect([...minted[0]!.getContents()]).toContain(held);
  });

  it('a body destructed while in the dying window mints nothing and throws nothing', async () => {
    // ⚠ The fox race. `raids.ts` destructs a hen it has already put in the
    // dying window; the window's expiry then runs `die` on a hole.
    const minted = corpses;
    const c = body();
    const promise = ConditionApi.die(c, 'mauled');
    await StuffApi.destruct(c);
    await expect(promise).resolves.toBeUndefined();
    expect(minted).toHaveLength(0);
  });

  it('stops the dead body persisting before anything can capture it', async () => {
    // Without this a named pet's periodic capture could write a DEAD body
    // into `holder_snapshots`, and the boot-time vitals backstop would
    // stand the destructed animal back up alive.
    const c = body();
    let persistedAtFirstAwait: boolean | null = null;
    if (MixinApi.isPersistable(c)) {
      const real = c.shouldPersist.bind(c);
      vi.spyOn(c, 'shouldPersist').mockImplementation(() => {
        const out = real();
        if (persistedAtFirstAwait === null) persistedAtFirstAwait = out;
        return out;
      });
    }

    await ConditionApi.die(c, 'slaughtered');

    if (MixinApi.isPersistable(c)) {
      expect(c.shouldPersist()).toBe(false);
    }
  });

  it('is idempotent — a second call does not double-write', async () => {
    const c = body();
    await ConditionApi.die(c, 'hypothermia');
    await ConditionApi.die(c, 'exsanguination');

    // The second call finds a destroyed body and a `dead` guard, so there
    // is one ledger row and one corpse carrying the FIRST cause.
    expect(rows).toHaveLength(1);
    expect(corpses).toHaveLength(1);
    expect(corpses[0]!.getCauseOfDeath()).toBe('hypothermia');
  });

  it('clears the dying record it resolves', async () => {
    const c = body();
    c.beginDying('exsanguination', 120);
    expect(c.isDying()).toBe(true);

    await ConditionApi.die(c, 'exsanguination');

    // The clock is resolved by the transition, so the Trauma slice the
    // corpse adopts carries the wound map MINUS the dying record: a
    // corpse is not still dying.
    expect(
      corpses[0]!.getConditions().some((x) => x.kind === 'dying'),
    ).toBe(false);
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
    // ⚠ Read the key BEFORE the death: the body is destructed by the
    // transition now, and a destroyed Stuff answers every question with
    // `undefined`.
    const victim = c.getIdentityPath();
    await ConditionApi.die(c, 'starvation');
    expect(rows).toHaveLength(1);
    // And it reaches it under the key a reader will actually ask with:
    // the victim's IDENTITY, not a session-ephemeral stand-in.
    expect(rows[0]!.victim).toBe(victim);
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



/**
 * ⭐⭐⭐ Two bodies, and who gets a minted identity.
 *
 * ⚠⚠ **The rule: a body with no MINTED identity gets no minted identity.**
 * `getIdentityPath()` is `#identityPath ?? getTemplatePath()`, so a
 * beast's "identity" is the ROW its whole flock shares — and a key built
 * from it could only ever mean *the Nth body off the ewe row in
 * game-second T*. Not durable (no deed is written for a non-persona, and
 * `Creature` composes no `PersistableMixin`), not constructible, and — the
 * axis that decides it — **not legible**: the UX refers to things by
 * keyword, then the `distinguishing` form, then an ordinal, and nothing in
 * that ladder can name a game-second.
 *
 * ⭐ The mint SURVIVES where the identity is genuine, which is the case
 * that corrected an earlier reading of this: a player can die, `reembody`
 * and die again before the first body decays, so **one avatar owns two
 * coexisting corpses at different states of decay** and `<gameSecond>`
 * names which death. So the ordinal is still live code — on that path.
 *
 * ⚠ The suite's own `body()` stamps a UNIQUE path per fixture, so no test
 * here could ever have produced the shared-row case. These do.
 */
describe('ConditionApi.die — two bodies, and who earns an identity', () => {
  let corpses: Corpse[] = [];

  /** A head out of a flock: its identity IS the row, as for real stock. */
  const FLOCK_ROW = '/stuff/agent/test-flock/ewe';
  function head(): Creature {
    const c = makeStuff(() => new Creature());
    Stuff._stampTemplatePath(c, FLOCK_ROW);
    c.setLifecycleState('alive');
    return c;
  }

  /**
   * A body with a GENUINELY minted identity — an avatar's shape. The
   * override is how `Avatar` itself does it, and it is the honest fixture
   * for the one path where the mint earns its keep.
   */
  class MintedBody extends Creature {
    public override getIdentityPath(): string {
      return '/platform/agent/Avatar/test-player';
    }
  }
  function mintedBody(): MintedBody {
    const c = makeStuff(() => new MintedBody());
    Stuff._stampTemplatePath(c, '/stuff/agent/test-avatar-body');
    c.setLifecycleState('alive');
    return c;
  }

  beforeEach(() => {
    installV1QuantityMarshallers();
    // Files each body where production would: under the minted identity
    // when the mint asked for one, under the bare corpse row when not.
    corpses = installCorpseMintStub({ stampRequestedIdentity: true });
    vi.spyOn(AccountabilityApi, 'record').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  // ── the invariant: true under every resolution ───────────────────────
  it('⭐ two deaths leave TWO bodies — neither replaces the other', async () => {
    await ConditionApi.die(head(), 'slaughtered');
    await ConditionApi.die(head(), 'slaughtered');

    expect(corpses).toHaveLength(2);
    const [a, b] = corpses as [Corpse, Corpse];
    expect(a.stuffId).not.toBe(b.stuffId);
    expect(a.isDestroyed()).toBe(false);
    expect(b.isDestroyed()).toBe(false);
  });

  // ── the beast: no mint, an ordinary multi-instance clone ─────────────
  it('⭐⭐ a beast gets NO minted identity — both bodies are the corpse row', async () => {
    await ConditionApi.die(head(), 'slaughtered');
    await ConditionApi.die(head(), 'slaughtered');

    // Exactly what cuts and logs already do: many clones of one kind row.
    for (const corpse of corpses) {
      expect(corpse.getTemplatePath()).toBe('/stuff/thing/Corpse');
    }
    expect(StuffApi.findAllByTemplatePath('/stuff/thing/Corpse')).toHaveLength(
      2,
    );
    // ⚠ And the key that used to be minted here is GONE, not merely
    // unused: nothing names the flock row or a game-second any more.
    for (const corpse of corpses) {
      expect(corpse.getTemplatePath()).not.toContain('test-flock');
    }
  });

  // ── the player: the mint survives, and the ordinal with it ───────────
  it('⭐⭐ a minted identity still earns one, keyed by WHICH DEATH', async () => {
    await ConditionApi.die(mintedBody(), 'hypothermia');
    await ConditionApi.die(mintedBody(), 'hypothermia');

    const paths = corpses.map((c) => c.getTemplatePath()) as string[];
    expect(new Set(paths).size).toBe(2);
    for (const p of paths) {
      expect(p).toContain('/stuff/thing/Corpse/');
      // The avatar identity, not the body's lineage row.
      expect(p).toContain('platform/agent/Avatar/test-player');
    }
    // Two coexisting corpses for one avatar: both deaths land in one
    // game-second, so the ORDINAL is the disambiguator.
    expect(paths[1]).toBe(`${paths[0]}-2`);
  });
});
