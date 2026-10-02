/**
 * ⭐⭐ **`TemplateApi.describeFill` — what will fill this row in.**
 *
 * The question four authoring surfaces had no way to answer. An author
 * could see the keys they wrote; nothing told them which ones LAND, which
 * the applier silently discards, or that an instance will also be filled
 * from somewhere the row never mentions.
 *
 * ⚠ One method, four readers (`cat`, `write`, the Studio's create
 * disposition, the CMS's `templateMeta.fill`), so the sentence has exactly
 * one copy — the `describeFill` half of D5. It takes a SPEC and not only a
 * path, because `write` has to answer before the row exists.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TemplateApi } from '../template';
import { StuffApi } from '../stuff';
import { Idea } from '../../lib/stuff/Idea';
import { BeliefStoreMixin } from '../../lib/belief/BeliefStore';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import type { FieldMeta } from '../../lib/mixin';

/** Every phase, plus a birth-only field. */
class FillAll extends Idea {
  static fieldMeta: FieldMeta = {
    keywords: { persistent: true },
    quantity: { persistent: true, birthOnly: true },
    layout: { instruction: true },
    prologue: { persistent: true, seed: true },
  };
  public keywords: string[] = [];
  public quantity = 0;
  public prologue: string[] = [];
  public async applyLayout(_v: unknown): Promise<void> {}
  public async seedPrologue(_v: unknown): Promise<void> {}
}

/** Declares a remembered source — the third list. */
class Remembering extends SingletonMixin(BeliefStoreMixin(Idea)) {}

beforeEach(() => {
  StuffApi.clearAll();
  // `describeFill` resolves the class by path; stub the one lookup.
  vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(
    async (p: string) => {
      if (p === '/test/FillAll') return FillAll;
      if (p === '/test/Remembering') return Remembering;
      throw new Error(`no class at ${p}`);
    },
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('describeFill — applies', () => {
  it('⭐ names the phase for each key, and flags a birth-only field', async () => {
    const d = await TemplateApi.describeFill({
      class: '/test/FillAll',
      data: { keywords: ['x'], quantity: 5, layout: {}, prologue: ['a'] },
    });
    expect(d.applies).toEqual([
      { field: 'keywords', phase: 'property', birthOnly: false },
      { field: 'quantity', phase: 'property', birthOnly: true },
      { field: 'layout', phase: 'instruction', birthOnly: false },
      { field: 'prologue', phase: 'seed', birthOnly: false },
    ]);
    expect(d.unapplied).toEqual([]);
  });

  it('⚠ a seed field reports as `seed`, though phase 1 assigns it too', async () => {
    // The author's question is "what does this DO", and the answer that
    // matters for `prologue:` is that it is written into a ledger once —
    // not that it is also kept on the instance.
    const d = await TemplateApi.describeFill({
      class: '/test/FillAll',
      data: { prologue: ['a'] },
    });
    expect(d.applies).toEqual([
      { field: 'prologue', phase: 'seed', birthOnly: false },
    ]);
  });
});

describe('describeFill — unapplied', () => {
  it('⭐ names a key nobody will apply', async () => {
    const d = await TemplateApi.describeFill({
      class: '/test/FillAll',
      data: { keywords: ['x'], material: '/stuff/idea/material/wood' },
    });
    expect(d.applies.map((f) => f.field)).toEqual(['keywords']);
    expect(d.unapplied).toEqual(['material']);
  });

  it('⚠ an UNRESOLVABLE class reports nothing, not "nothing applies"', async () => {
    // Saying "nothing applies" would read as a finding about the ROW.
    // An unresolvable class is the clone pipeline's error to raise, with
    // its own message.
    const d = await TemplateApi.describeFill({
      class: '/test/Ghost',
      data: { keywords: ['x'] },
    });
    expect(d).toEqual({ applies: [], unapplied: [], remembers: [] });
  });

  it('a row with no class anywhere reports every key as unapplied', async () => {
    const d = await TemplateApi.describeFill({ data: { a: 1, b: 2 } });
    expect(d.unapplied).toEqual(['a', 'b']);
  });
});

describe('describeFill — remembers', () => {
  it('⭐⭐ names the sources the COMPOSITION declares, which the row never mentions', async () => {
    const d = await TemplateApi.describeFill({
      class: '/test/Remembering',
      data: {},
    });
    expect(d.remembers).toEqual([
      { mixin: 'BeliefStoreMixin', source: 'beliefs' },
    ]);
  });

  it('a class with no declared source remembers nothing', async () => {
    const d = await TemplateApi.describeFill({
      class: '/test/FillAll',
      data: {},
    });
    expect(d.remembers).toEqual([]);
  });

  it('⭐ and "nothing at all" is representable — three empty lists', async () => {
    // Which is what lets every reader print "nothing" out loud rather
    // than omitting a line, the failure shape this build is about.
    const d = await TemplateApi.describeFill({
      class: '/test/FillAll',
      data: {},
    });
    expect(d).toEqual({ applies: [], unapplied: [], remembers: [] });
  });
});
