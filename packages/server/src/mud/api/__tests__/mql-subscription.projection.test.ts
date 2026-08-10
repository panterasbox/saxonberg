/**
 * Projection-level tests — `collectSubscribableFields` walk and
 * `MqlSubscriptionApi.projectFields` flat record build.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import {
  MqlSubscriptionApi,
  collectSubscribableFields,
  REF_FIELDS,
  DETAIL_FIELDS,
} from '../mql-subscription';
import { NamedMixin } from '../../lib/description/Named';
import { VisibleMixin } from '../../lib/description/Visible';
import { DetailedMixin } from '../../lib/description/Detailed';
import { GlobbableMixin } from '../../lib/stuff/Globbable';
import Material from '../../lib/material/Material';
import { Quantity } from '../../lib/quantity';
import { Idea } from '../../lib/stuff/Idea';
import Thing from '../../lib/stuff/Thing';
import { ShadowApi } from '../shadow';
import { StuffApi } from '../stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../lib/security/__tests__/test-setup';
import type { FieldMeta } from '../../lib/mixin';

class PlainNamed extends NamedMixin(Idea) {
  static fieldMeta: FieldMeta = {};
}

class FullThing extends GlobbableMixin(
  DetailedMixin(VisibleMixin(NamedMixin(Thing))),
) {
  static _mixinName = 'FullThing';
}

describe('MQL subscription — collectSubscribableFields', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('collects every contributing descriptor by name', () => {
    const obj = makeStuff(() => new FullThing());
    const descriptors = collectSubscribableFields(obj);
    const names = [...descriptors.keys()].sort();
    expect(names).toContain('name');
    expect(names).toContain('shortDescription');
    expect(names).toContain('longDescription');
    expect(names).toContain('details');
    expect(names).toContain('bulkMaterial');
    expect(names).toContain('mass');
    expect(names).toContain('detailMaterial');
    expect(names).toContain('quantity');
    expect(names).toContain('displayName'); // substrate-synthetic
  });

  it('overlays the substrate-synthetic table without overriding mixins', () => {
    // PlainNamed only composes NamedMixin; displayName comes from
    // the synthetic table.
    const obj = makeStuff(() => new PlainNamed());
    const descriptors = collectSubscribableFields(obj);
    expect(descriptors.has('name')).toBe(true);
    expect(descriptors.has('displayName')).toBe(true);
    expect(descriptors.has('quantity')).toBe(false);
  });
});

describe('MQL subscription — MqlSubscriptionApi.projectFields (flat)', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('REF_FIELDS yields { displayName, quantity } for a Globbable host', () => {
    const obj = makeStuff(() => {
      const t = new FullThing();
      t.setName('coin');
      t.setQuantity(3);
      return t;
    });
    const viewer = obj as unknown as Parameters<typeof MqlSubscriptionApi.projectFields>[2];
    const rec = MqlSubscriptionApi.projectFields(obj, REF_FIELDS, viewer);
    // getPresentation folds the Globbable count in as an affix, so the
    // displayName render is count-aware; `quantity` still rides along
    // separately for clients that want the raw number.
    expect(rec.displayName).toBe('3 coins');
    expect(rec.quantity).toBe(3);
  });

  it('non-Globbable host has no quantity in the record', () => {
    const obj = makeStuff(() => {
      const t = new PlainNamed();
      t.setName('Alice');
      return t;
    });
    const rec = MqlSubscriptionApi.projectFields(
      obj,
      REF_FIELDS,
      obj as unknown as Parameters<typeof MqlSubscriptionApi.projectFields>[2],
    );
    expect(rec.displayName).toBe('Alice');
    expect(rec.quantity).toBeUndefined();
  });

  it('DETAIL_FIELDS surfaces description + details + material + mass', () => {
    const iron = makeStuff(() => new Material());
    stampTemplatePathForTest(iron, '/obj/material/iron');
    iron.setName('iron');
    const obj = makeStuff(() => {
      const t = new FullThing();
      t.setName('sword');
      t.setShortDescription('a heavy iron blade');
      t.setLongDescription('a heavy iron blade, well-balanced');
      t.setDetail(['hilt'], 'a leather-wrapped hilt');
      t.setMaterial(iron);
      t.setMass(Quantity.of(2, 'kg'));
      return t;
    });
    const rec = MqlSubscriptionApi.projectFields(
      obj,
      DETAIL_FIELDS,
      obj as unknown as Parameters<typeof MqlSubscriptionApi.projectFields>[2],
    );
    expect(rec.displayName).toBe('sword');
    expect(rec.shortDescription).toBe('a heavy iron blade');
    expect(rec.longDescription).toBe('a heavy iron blade, well-balanced');
    expect(rec.details).toEqual([
      { ids: ['hilt'], description: 'a leather-wrapped hilt', hasChildren: false },
    ]);
    expect(rec.bulkMaterial).toEqual({
      materialId: iron.stuffId,
      templatePath: '/obj/material/iron',
      name: 'iron',
    });
    expect(rec.mass).toEqual({ value: 2, unit: 'kg' });
  });

  it('aliased setDetail surfaces as one entry with both ids', () => {
    const obj = makeStuff(() => {
      const t = new FullThing();
      t.setDetail(['handle', 'doorknob'], 'a brass handle');
      return t;
    });
    const rec = MqlSubscriptionApi.projectFields(
      obj,
      DETAIL_FIELDS,
      obj as unknown as Parameters<typeof MqlSubscriptionApi.projectFields>[2],
    );
    expect(rec.details).toEqual([
      {
        ids: ['handle', 'doorknob'],
        description: 'a brass handle',
        hasChildren: false,
      },
    ]);
  });

  it('nested child detail flips parent hasChildren to true', () => {
    const obj = makeStuff(() => {
      const t = new FullThing();
      t.setDetail(['handle'], 'a brass handle');
      t.setDetail(['lock'], 'a small lock', 'handle');
      return t;
    });
    const rec = MqlSubscriptionApi.projectFields(
      obj,
      DETAIL_FIELDS,
      obj as unknown as Parameters<typeof MqlSubscriptionApi.projectFields>[2],
    );
    const entries = rec.details as Array<{ ids: string[]; hasChildren: boolean }>;
    const handle = entries.find((e) => e.ids.includes('handle'));
    expect(handle!.hasChildren).toBe(true);
  });
});
