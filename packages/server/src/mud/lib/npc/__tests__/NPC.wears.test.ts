/**
 * ⭐⭐ `wears:` — an authored person can be dressed by their own row
 * (envelope D9).
 *
 * Until this build there was no way to say it. No `wears:`, no `worn:`,
 * no `outfit:` on any NPC class, any archetype or any row in the tree,
 * and `props:` places a thing onto a `Surfaced` host rather than onto a
 * person — so **every authored person in the realm was naked**. It
 * never showed because every interior was 21 °C by decree and a naked
 * body survives 21 °C. The envelope build removes the decree.
 *
 * The recipe (`Character.wearGarments`) lives one rung up, on
 * `Character`, because both rungs of person need it and nothing below
 * does; the FIELD is here, because a player dresses at enroll.
 *
 * ⚠ **What this file tests is the PLUMBING**, not the cloning: a unit
 * fixture has no Template store, so `StuffApi.clone` has nothing to
 * clone and a test that seeded live instances at those paths would be
 * asserting against a world that does not exist. The clone→move→occupy
 * half is `Character.wearGarments`, which the wire harness has been
 * driving since the fishing build (it is the same call `TestHooks`
 * makes to dress a test character), and the envelope drive reads the
 * cast's actual insulation in a live world. What is checked here is the
 * part a live run would NOT notice going wrong: that the field is read
 * at all, and that the override still chains.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NPC } from '../NPC';
import { StuffApi } from '../../../api/stuff';
import { ProxyApi } from '../../../api/proxy';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const SHIRT = '/stuff/thing/clothes/student-shirt';
const TROUSERS = '/stuff/thing/clothes/student-trousers';

function person(wears: string[]): NPC {
  return makeStuff(() => {
    const n = new NPC();
    n.wears = wears;
    return n;
  }) as NPC;
}

/** Capture what `postRegister` hands the shared recipe. */
function spyOnDressing(n: NPC): { calls: string[][] } {
  const calls: string[][] = [];
  (n as unknown as Record<string, unknown>).wearGarments = (
    paths: readonly string[],
  ): Promise<void> => {
    calls.push([...paths]);
    return Promise.resolve();
  };
  return { calls };
}

describe('NPC.wears', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('hands the authored garments to the dressing recipe at postRegister', async () => {
    const n = person([SHIRT, TROUSERS]);
    const spy = spyOnDressing(n);
    await n.postRegister();
    expect(spy.calls).toEqual([[SHIRT, TROUSERS]]);
  });

  it('a person wearing nothing never calls it — the field is opt-in', async () => {
    const n = person([]);
    const spy = spyOnDressing(n);
    await n.postRegister();
    expect(spy.calls).toEqual([]);
  });

  it('⚠⚠ still wires `behaviors:` — the override chains super.postRegister', async () => {
    // `BehavedMixin` is outermost of the mixin chain and its
    // `postRegister` is what wires the behavior specs; `NPC`'s own
    // override sits outside it. A forgotten `super` call would leave
    // every authored person in the realm silently inert, and no test of
    // the dressing itself would notice — which is exactly the class of
    // failure this project keeps paying for.
    const n = person([SHIRT]);
    spyOnDressing(n);
    n.behaviors = [{ trigger: 'cadence:30s', brain: 'idle' }] as never;
    await n.postRegister();
    expect(MixinApi.isBehaved(n)).toBe(true);
    expect(n.getBehaviors()).toHaveLength(1);
    // ⭐ The observable proof that `super` ran: `_wireBehaviors` sets
    // `_behaviorsLive`. Reached through `RAW_TARGET` because it is a
    // private runtime slot and there is no public reader — a deliberate
    // observation seam rather than a field read, which is what
    // `CLAUDE.md` asks for when a test needs raw state.
    const raw = (n as unknown as Record<symbol, unknown>)[
      ProxyApi.RAW_TARGET
    ] as { _behaviorsLive?: boolean } | undefined;
    expect((raw ?? (n as unknown as { _behaviorsLive?: boolean }))
      ._behaviorsLive).toBe(true);
  });

  it('the field is authorable and persistent — a row can say it and a reclone keeps it', () => {
    const meta = (NPC as unknown as { fieldMeta: Record<string, unknown> })
      .fieldMeta;
    expect(meta.wears).toEqual({ persistent: true, authorable: true });
  });
});
