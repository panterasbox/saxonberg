/**
 * ⭐⭐ `props:` on a person — an NPC is born holding what its row names.
 *
 * Until the storage-and-ice sweep the field was undeclared on `NPC`, and
 * the template applier applies only what a class's `fieldMeta` declares,
 * so a plain `Cast`/`Extra` row's `props:` was dropped in SILENCE: the
 * ice crew authored with saws, the Rejection hewers with picks, the
 * wharfside fisher with a rod — every one born with empty hands, every
 * forced verb refused "nothing to do that with". Only the four loadout
 * classes (`CastMixin(StagedMixin(NPC))`) carried anything.
 *
 * The fix split `StagedMixin`'s props half out as `PropsMixin` (a person
 * has a loadout; only a place has a troupe). What is pinned here is the
 * PLUMBING a live run cannot see going wrong: the field is declared, the
 * applier places into the person, the designation gate still holds, and
 * a loadout class still has both halves.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NPC } from '../NPC';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { makeStuff, seedKernelContentStore } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { StagedMixin } from '../../stuff/Staged';
import { Template } from '../../stuff/Template';
import ThingClass from '../../../platform/thing/Thing';
import type { Stuff } from '../../stuff/Stuff';

const SAW = '/stuff/thing/saw';
const PERSON = '/stuff/agent/somebody';

function person(): NPC {
  return makeStuff(() => new NPC()) as NPC;
}

describe('NPC props — a person born holding things', () => {
  beforeEach(() => seedKernelContentStore());
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ declares `props:` as an instruction field (the applier reads only what is declared)', () => {
    const meta = MixinApi.getAllFieldMeta(NPC);
    expect(meta.props?.instruction).toBe(true);
    expect(MixinApi.hasMixin(NPC, Mixins.Props)).toBe(true);
    // ⚠ A person has a loadout, not a troupe.
    expect(meta.cast).toBeUndefined();
  });

  it('places each prop INTO the person, once', async () => {
    const n = person();
    vi.spyOn(Template, 'findByPath').mockResolvedValue({ path: SAW, class: '/platform/thing/Thing' } as never);
    vi.spyOn(StuffApi, 'loadClassByPath').mockResolvedValue(ThingClass as never);
    vi.spyOn(StuffApi, 'clone').mockImplementation((async () => makeStuff(() => new ThingClass())) as never);
    await n.applyProps([SAW]);
    await n.applyProps([SAW]);
    const held = n.getContents().filter((c: Stuff) => c instanceof ThingClass);
    expect(held).toHaveLength(1);
  });

  it('still refuses a PERSON listed as a prop (that is cast)', async () => {
    const n = person();
    vi.spyOn(Template, 'findByPath').mockResolvedValue({ path: PERSON, class: '/platform/agent/Cast' } as never);
    vi.spyOn(StuffApi, 'loadClassByPath').mockResolvedValue(NPC as never);
    await expect(n.applyProps([PERSON])).rejects.toThrow(/that is cast, not props/);
  });

  it('a loadout class over NPC keeps both halves, one props field', () => {
    const Loadout = StagedMixin(NPC);
    const meta = MixinApi.getAllFieldMeta(Loadout);
    expect(meta.props?.instruction).toBe(true);
    expect(meta.cast?.instruction).toBe(true);
    expect(MixinApi.hasMixin(Loadout, Mixins.Staged)).toBe(true);
  });
});
