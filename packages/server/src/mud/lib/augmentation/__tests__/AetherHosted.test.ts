/**
 * AetherHostedMixin — the update side of the aether hosting relation.
 * Asserts the back-ref surface and that a bare Idea (Biome-shaped) is
 * unaffected (the must-be-hosted invariant lives on the relation, not
 * on Idea).
 */

import { describe, it, expect } from 'vitest';
import { AetherHostedMixin } from '../AetherHosted';
import { AetherMixin, type AetherHost } from '../../message/Aether';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestUpdate extends AetherHostedMixin(Idea) {}
class TestHost extends AetherMixin(Idea) {}

describe('AetherHostedMixin', () => {
  it('starts unhosted; setHost records the back-ref', () => {
    const update = makeStuff(() => new TestUpdate());
    const host = makeStuff(() => new TestHost());
    expect(update.isAetherHosted()).toBe(false);
    expect(update.getHost()).toBeNull();

    update.setHost(host as unknown as Stuff & AetherHost);
    expect(update.getHost()).toBe(host);
    expect(update.isAetherHosted()).toBe(true);

    update.setHost(null);
    expect(update.getHost()).toBeNull();
    expect(update.isAetherHosted()).toBe(false);
  });

  it('a bare Idea composes no AetherHostedMixin (unaffected)', () => {
    const idea = makeStuff(() => new Idea());
    expect(MixinApi.isAetherHosted(idea)).toBe(false);
  });

  it('an AetherHostedMixin update narrows via the predicate', () => {
    const update = makeStuff(() => new TestUpdate());
    expect(MixinApi.isAetherHosted(update)).toBe(true);
  });
});
