/**
 * Focused-detail projection — `projectFocus` merges per-detail
 * slices from every contributing mixin into a `StuffDetailFocusRecord`.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { projectFocus } from '../mql-subscription';
import { NamedMixin } from '../../lib/description/Named';
import { VisibleMixin } from '../../lib/description/Visible';
import { DetailedMixin } from '../../lib/description/Detailed';
import Material from '../../lib/material/Material';
import Thing from '../../lib/stuff/Thing';
import { Idea } from '../../lib/stuff/Idea';
import { ShadowApi } from '../shadow';
import { StuffApi } from '../stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../lib/security/__tests__/test-setup';
import type { FieldMeta } from '../../lib/mixin';

class Axe extends DetailedMixin(VisibleMixin(NamedMixin(Thing))) {
  static _mixinName = 'Axe';
}

class PlainNamed extends NamedMixin(Idea) {
  static fieldMeta: FieldMeta = {};
}

describe('MQL subscription — projectFocus', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('merges DetailedMixin + TangibleMixin slices at the focus key', () => {
    const oak = makeStuff(() => new Material());
    stampTemplatePathForTest(oak, '/lib/material/oak');
    oak.setName('oak');
    const iron = makeStuff(() => new Material());
    stampTemplatePathForTest(iron, '/lib/material/iron');
    iron.setName('iron');
    const steel = makeStuff(() => new Material());
    stampTemplatePathForTest(steel, '/lib/material/steel');
    steel.setName('steel');

    const axe = makeStuff(() => {
      const a = new Axe();
      a.setName('axe');
      a.setDetail(['head'], 'the iron head');
      a.setDetail(['edge'], 'a keen edge', 'head');
      a.setMaterial(oak);
      a.setMaterial(iron, 'head');
      a.setMaterial(steel, 'head.edge');
      return a;
    });

    const focus = projectFocus(
      axe,
      'head.edge',
      axe as unknown as Parameters<typeof projectFocus>[2],
    );
    expect(focus.stuffId).toBe(axe.stuffId);
    expect(focus.detailKey).toBe('head.edge');
    expect(focus.ids).toEqual(['edge']);
    expect(focus.description).toBe('a keen edge');
    expect(focus.hasChildren).toBe(false);
    expect((focus.material as { name: string }).name).toBe('steel');
  });

  it('returns stuffId + detailKey only when no slice contributes', () => {
    const axe = makeStuff(() => {
      const a = new Axe();
      a.setName('axe');
      return a;
    });
    const focus = projectFocus(
      axe,
      'no-such-key',
      axe as unknown as Parameters<typeof projectFocus>[2],
    );
    expect(focus.stuffId).toBe(axe.stuffId);
    expect(focus.detailKey).toBe('no-such-key');
    expect(focus.ids).toBeUndefined();
    expect(focus.description).toBeUndefined();
    expect(focus.material).toBeUndefined();
  });

  it('skips descriptors without perDetailRead (flat-only fields are absent)', () => {
    const obj = makeStuff(() => {
      const t = new PlainNamed();
      t.setName('Alice');
      return t;
    });
    const focus = projectFocus(
      obj,
      'foo',
      obj as unknown as Parameters<typeof projectFocus>[2],
    );
    expect(focus).toEqual({ stuffId: obj.stuffId, detailKey: 'foo' });
    // NamedMixin's `name` descriptor has no perDetailRead, so it
    // never appears in focus records.
    expect(focus.name).toBeUndefined();
  });

  it('Tangible prefix-walk resolves at the focus key', () => {
    const iron = makeStuff(() => new Material());
    stampTemplatePathForTest(iron, '/lib/material/iron');
    iron.setName('iron');
    const steel = makeStuff(() => new Material());
    stampTemplatePathForTest(steel, '/lib/material/steel');
    steel.setName('steel');

    const axe = makeStuff(() => {
      const a = new Axe();
      a.setDetail(['head'], 'the head');
      a.setDetail(['edge'], 'the edge', 'head');
      a.setMaterial(iron, 'head'); // prefix override
      return a;
    });
    // head.edge has no explicit material — prefix-walk gives iron.
    const focusInherit = projectFocus(
      axe,
      'head.edge',
      axe as unknown as Parameters<typeof projectFocus>[2],
    );
    expect((focusInherit.material as { name: string }).name).toBe('iron');

    // Add an explicit override at head.edge — steel wins.
    axe.setMaterial(steel, 'head.edge');
    const focusOverride = projectFocus(
      axe,
      'head.edge',
      axe as unknown as Parameters<typeof projectFocus>[2],
    );
    expect((focusOverride.material as { name: string }).name).toBe('steel');
  });
});
