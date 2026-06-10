/**
 * TangibleMixin setMaterial / setMass fire FieldChangedEvent.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Material from '../Material';
import Thing from '../../stuff/Thing';
import { Quantity } from '../../quantity';
import { EventApi } from '../../../api/event';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import EventRegistry from '../../../obj/EventRegistry';
import { Stuff } from '../../stuff/Stuff';
import { FieldChangedEvent } from '../../events/FieldChangedEvent';
import { MixinApi } from '../../../api/mixin';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('TangibleMixin field change firing', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  it('setMaterial(iron) fires FieldChangedEvent { field: "bulkMaterial" }', async () => {
    await bootRegistry();
    const iron = makeStuff(() => new Material());
    stampTemplatePathForTest(iron, '/lib/material/iron');
    const sword = makeStuff(() => new Thing());
    if (!MixinApi.isTangible(sword)) throw new Error('expected tangible');
    const seen: Array<{ field: string }> = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push({ field: e.payload.field });
    });
    sword.setMaterial(iron);
    await flushMicrotasks();
    expect(seen).toEqual([{ field: 'bulkMaterial' }]);
  });

  it('setMaterial(steel, "head") fires FieldChangedEvent { field: "detailMaterials" }', async () => {
    await bootRegistry();
    const steel = makeStuff(() => new Material());
    stampTemplatePathForTest(steel, '/lib/material/steel');
    const axe = makeStuff(() => new Thing());
    if (!MixinApi.isTangible(axe)) throw new Error('expected tangible');
    const seen: Array<{ field: string }> = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push({ field: e.payload.field });
    });
    axe.setMaterial(steel, 'head');
    await flushMicrotasks();
    expect(seen).toEqual([{ field: 'detailMaterials' }]);
  });

  it('re-setting same bulk material noop-skips', async () => {
    await bootRegistry();
    const iron = makeStuff(() => new Material());
    stampTemplatePathForTest(iron, '/lib/material/iron');
    const sword = makeStuff(() => new Thing());
    if (!MixinApi.isTangible(sword)) throw new Error('expected tangible');
    sword.setMaterial(iron);
    await flushMicrotasks();
    const seen: unknown[] = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });
    sword.setMaterial(iron);
    await flushMicrotasks();
    expect(seen).toEqual([]);
  });

  it('setMaterial(null) on a populated bulk + overrides fires both bulkMaterial and detailMaterials', async () => {
    await bootRegistry();
    const iron = makeStuff(() => new Material());
    stampTemplatePathForTest(iron, '/lib/material/iron');
    const steel = makeStuff(() => new Material());
    stampTemplatePathForTest(steel, '/lib/material/steel');
    const axe = makeStuff(() => new Thing());
    if (!MixinApi.isTangible(axe)) throw new Error('expected tangible');
    axe.setMaterial(iron);
    axe.setMaterial(steel, 'head');
    await flushMicrotasks();
    const seen: Array<{ field: string }> = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push({ field: e.payload.field });
    });
    axe.setMaterial(null);
    await flushMicrotasks();
    const fields = seen.map((s) => s.field).sort();
    expect(fields).toEqual(['bulkMaterial', 'detailMaterials']);
  });

  it('setMass fires FieldChangedEvent { field: "mass" }', async () => {
    await bootRegistry();
    const sword = makeStuff(() => new Thing());
    if (!MixinApi.isTangible(sword)) throw new Error('expected tangible');
    const seen: Array<{ field: string }> = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push({ field: e.payload.field });
    });
    sword.setMass(Quantity.of(5, 'kg'));
    await flushMicrotasks();
    expect(seen).toEqual([{ field: 'mass' }]);
  });

  it('setMass with equal value noop-skips', async () => {
    await bootRegistry();
    const sword = makeStuff(() => new Thing());
    if (!MixinApi.isTangible(sword)) throw new Error('expected tangible');
    sword.setMass(Quantity.of(5, 'kg'));
    await flushMicrotasks();
    const seen: unknown[] = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });
    sword.setMass(Quantity.of(5, 'kg'));
    await flushMicrotasks();
    expect(seen).toEqual([]);
  });
});
