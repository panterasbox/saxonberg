/**
 * ⭐⭐ `costume:` — an authored person can be dressed by their own row
 * (envelope D9), on the same rail as `props:` and `cast:`.
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
 * does. ⭐ The FIELD and its applier are `CostumedMixin`'s, beside
 * `props:` and `cast:` in `lib/stuff/Staged.ts` — it shipped as a
 * `wears: string[]` on `NPC` with a `postRegister` dressing step, and
 * review named it: that was `applyProps` with the designation check
 * missing plus one slot occupation.
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
import { CostumedMixin } from '../../stuff/Staged';
import { Template } from '../../stuff/Template';
import GarmentClass from '../../../platform/thing/equipment/Garment';
import ThingClass from '../../../platform/thing/Thing';

const SHIRT = '/stuff/thing/clothes/student-shirt';
const TROUSERS = '/stuff/thing/clothes/student-trousers';
const ROCK = '/stuff/thing/rock';

/** A class that composes `WearableMixin`, and one that does not. */
const WEARABLE = '/platform/thing/equipment/Garment';
const NOT_WEARABLE = '/platform/thing/Thing';

/**
 * The applier resolves each path's template and loads its class before
 * cloning anything, so the gate is what a unit fixture can test: stub
 * the two lookups and assert on the refusal.
 */
function stubTemplates(map: Record<string, string>): void {
  vi.spyOn(Template, 'findByPath').mockImplementation(((path: string) =>
    Promise.resolve(
      map[path] ? ({ path, class: map[path] } as never) : null,
    )) as never);
  vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(((
    cls: string,
  ) =>
    Promise.resolve(
      cls === WEARABLE ? GarmentClass : ThingClass,
    )) as never);
}

function person(): NPC {
  return makeStuff(() => new NPC()) as NPC;
}

/** Capture what the applier hands the shared recipe. */
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

describe('NPC costume — the third designation', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('hands the authored garments to the dressing recipe, ONCE', async () => {
    const n = person();
    const spy = spyOnDressing(n);
    stubTemplates({ [SHIRT]: WEARABLE, [TROUSERS]: WEARABLE });
    await n.applyCostume([SHIRT, TROUSERS]);
    // ⭐ The once-flag, which the old `postRegister` shape did not have:
    // `restoreFromTemplate` re-runs the FULL hydrate on every go-live,
    // so without this a publish re-dressed every live person.
    await n.applyCostume([SHIRT, TROUSERS]);
    expect(spy.calls).toEqual([[SHIRT, TROUSERS]]);
  });

  it('a person wearing nothing never calls it — the field is opt-in', async () => {
    const n = person();
    const spy = spyOnDressing(n);
    await n.applyCostume([]);
    expect(spy.calls).toEqual([]);
  });

  it('⭐⭐ REFUSES a non-garment, before anything is cloned', async () => {
    // The designation rule `props:`/`cast:` already live by: *the
    // designation is declared and the class is the check.* The old
    // `wears:` checked nothing, so this row cloned the rock, moved it
    // into the person's hands, found no slot and carried on silently —
    // the row claimed a garment and the world got a carried rock.
    const n = person();
    const spy = spyOnDressing(n);
    stubTemplates({ [ROCK]: NOT_WEARABLE });
    await expect(n.applyCostume([ROCK])).rejects.toThrow(
      /does not compose WearableMixin/,
    );
    // Nothing was worn, and the flag is clear so a corrected row still runs.
    expect(spy.calls).toEqual([]);
    expect((n as unknown as { _costumeWorn: boolean })._costumeWorn).toBe(
      false,
    );
  });

  it('refuses a path that names no template at all — a typo is LOUD', async () => {
    // The old shape swallowed this in the per-garment catch, so a
    // mistyped path cost the garment and said nothing — and since the
    // cold branch now cares whether a person is dressed, silence is the
    // expensive answer.
    const n = person();
    stubTemplates({});
    await expect(
      n.applyCostume(['/stuff/thing/clothes/nope']),
    ).rejects.toThrow(/resolves to no template/);
  });

  it('⚠⚠ still wires `behaviors:` — the override chains super.postRegister', async () => {
    // `BehavedMixin` is outermost of the mixin chain and its
    // `postRegister` is what wires the behavior specs; `NPC`'s own
    // override sits outside it. A forgotten `super` call would leave
    // every authored person in the realm silently inert, and no test of
    // the dressing itself would notice — which is exactly the class of
    // failure this project keeps paying for.
    const n = person();
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

  it('⭐ the field rides the INSTRUCTION rail, exactly as props and cast do', () => {
    // Not `persistent: true` — an instruction field is consumed during
    // hydration and discarded, which is what makes the once-flag the
    // thing that survives rather than the list.
    const meta = (CostumedMixin(Object as never) as unknown as {
      fieldMeta: Record<string, unknown>;
    }).fieldMeta;
    expect(meta.costume).toEqual({ instruction: true, authorable: true });
    expect(meta._costumeWorn).toEqual({
      persistent: true,
      runtimeState: true,
    });
  });
});
