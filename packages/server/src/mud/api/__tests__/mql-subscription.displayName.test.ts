/**
 * `displayName` lives on `Stuff.subscribableFields` — universal
 * across every Stuff regardless of mixin composition, derived from
 * leaf source fields via `dependsOnFields`.
 *
 * Replaces the retired substrate-synthetic-table test; the synthetic
 * map and its overlay step are gone.
 */

import "../../../test-bootstrap";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { collectSubscribableFields } from '../mql-subscription';
import { NamedMixin } from '../../lib/description/Named';
import { Idea } from '../../lib/stuff/Idea';
import { Stuff } from '../../lib/stuff/Stuff';
import { FieldChangedEvent } from '../../lib/events/FieldChangedEvent';
import { ShadowChangedEvent } from '../../lib/events/ShadowChangedEvent';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { FieldMeta } from '../../lib/mixin';

class NamedThing extends NamedMixin(Idea) {
  static fieldMeta: FieldMeta = {};
}

class Plain extends Idea {
  static fieldMeta: FieldMeta = {};
}

describe('MQL subscription — displayName on Stuff', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
  });

  it('every Stuff exposes a displayName descriptor from Stuff.subscribableFields', () => {
    const obj = makeStuff(() => new Plain());
    const descriptors = collectSubscribableFields(obj);
    const displayName = descriptors.get('displayName');
    expect(displayName).toBeDefined();
    expect(displayName!.read).toBeDefined();
  });

  it('displayName.read routes through Stuff.getPresentation()', () => {
    const obj = makeStuff(() => {
      const t = new NamedThing();
      t.setName('Alice');
      return t;
    });
    const descriptors = collectSubscribableFields(obj);
    const displayName = descriptors.get('displayName')!;
    const spy = vi.spyOn(Stuff.prototype, 'getPresentation');
    const value = displayName.read!(
      obj,
      obj as unknown as Parameters<NonNullable<typeof displayName.read>>[1],
    );
    expect(value).toBe('Alice');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("displayName.read returns 'something' for a Stuff with no Named/Visible state", () => {
    const obj = makeStuff(() => new Plain());
    const descriptors = collectSubscribableFields(obj);
    const displayName = descriptors.get('displayName')!;
    const value = displayName.read!(
      obj,
      obj as unknown as Parameters<NonNullable<typeof displayName.read>>[1],
    );
    expect(value).toBe('something');
  });

  it('displayName declares leaf source fields via dependsOnFields', () => {
    const obj = makeStuff(() => new Plain());
    const descriptors = collectSubscribableFields(obj);
    const displayName = descriptors.get('displayName')!;
    expect(displayName.dependsOnFields).toEqual(['name', 'shortDescription']);
  });

  it('displayName declares ShadowChangedEvent in changes', () => {
    const obj = makeStuff(() => new Plain());
    const descriptors = collectSubscribableFields(obj);
    const displayName = descriptors.get('displayName')!;
    const changes = displayName.changes ?? [];
    expect(changes.some((c) => c.on.KIND === ShadowChangedEvent.KIND)).toBe(true);
  });

  it('Stuff.subscribableFields appears in the prototype-chain walk', () => {
    // Sanity: the array on Stuff itself is the one carrying displayName.
    expect(Stuff.subscribableFields.some((d) => d.name === 'displayName')).toBe(true);
    // And FieldChangedEvent is not declared in `changes` — the
    // descriptor relies on `dependsOnFields` for field-event
    // dispatch.
    const displayName = Stuff.subscribableFields.find((d) => d.name === 'displayName')!;
    const changes = displayName.changes ?? [];
    expect(changes.some((c) => c.on.KIND === FieldChangedEvent.KIND)).toBe(false);
  });
});
