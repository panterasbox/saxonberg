/**
 * ⭐ `look` as segments (client-surface D1): the ONE augmenter fold, read
 * by diffing each step. The text must stay byte-identical to `Mml.augment`
 * (the terminal and the card are one fold), and each appending augmenter
 * becomes a `state` segment sourced by the level that contributed it.
 */

import "../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { Mml, type MarkupAugmenter } from '../mml';
import { MixinApi } from '../mixin';
import { Idea } from '../../lib/stuff/Idea';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';

const append = (line: string): MarkupAugmenter => (text) => `${text}\n\n${line}`;
const inline = (line: string): MarkupAugmenter => (text) => `${text} ${line}`;
const quiet: MarkupAugmenter = (text) => text;
/** A transform: wraps a word, as Detailed wraps detail keys. */
const wrap = (word: string): MarkupAugmenter => (text) =>
  text.replace(word, `<detail key="${word}">${word}</detail>`);
/** A transform that destroys earlier lines (nothing ships like this). */
const clobber: MarkupAugmenter = (text) => text.toUpperCase();

function hostWith(levels: { mixin?: string; fns: MarkupAugmenter[] }[]): Stuff {
  let C: new () => Idea = class extends Idea {};
  for (const l of levels) {
    const Parent = C;
    const Next = class extends Parent {};
    (Next as unknown as { markupAugmenters: MarkupAugmenter[] }).markupAugmenters = l.fns;
    if (l.mixin) (Next as unknown as { _mixinName: string })._mixinName = l.mixin;
    else Object.defineProperty(Next, 'name', { value: 'Bottle' });
    C = Next;
  }
  return makeStuff(() => new C()) as unknown as Stuff;
}

function fold(host: Stuff, text: string) {
  const out = Mml.augmentSegmented(text, host, host);
  // The invariant every case below holds: one fold, the same text.
  expect(out.text).toBe(Mml.augment(text, host, host));
  return out;
}

describe('MixinApi.getMarkupAugmenterLevels', () => {
  it('names a mixin level by its mixin name and a class level by its class', () => {
    const host = hostWith([
      { mixin: 'BulkableMixin', fns: [quiet] },
      { fns: [quiet] },
    ]);
    const levels = MixinApi.getMarkupAugmenterLevels(
      (host as unknown as { constructor: never }).constructor,
    );
    expect(levels.map((l) => l.source)).toEqual([
      { kind: 'mixin', name: 'Bulkable' },
      { kind: 'class', name: 'Bottle' },
    ]);
  });
});

describe('Mml.augmentSegmented', () => {
  it('an append is a state segment sourced by its level; the prose is the Visible description', () => {
    const host = hostWith([{ mixin: 'BulkableMixin', fns: [append('It holds gin.')] }]);
    const { segments } = fold(host, 'A green bottle.');
    expect(segments).toEqual([
      { shape: 'prose', sources: [{ kind: 'mixin', name: 'Visible' }], text: 'A green bottle.' },
      { shape: 'state', sources: [{ kind: 'mixin', name: 'Bulkable' }], text: 'It holds gin.' },
    ]);
  });

  it('a quiet augmenter records nothing', () => {
    const host = hostWith([{ mixin: 'AssembledMixin', fns: [quiet] }]);
    expect(fold(host, 'A knife.').segments).toHaveLength(1);
  });

  it('a same-paragraph append is still its own segment', () => {
    const host = hostWith([{ mixin: 'ChattelMixin', fns: [inline('It is yours.')] }]);
    const { segments } = fold(host, 'A pint.');
    expect(segments.map((s) => s.text)).toEqual(['A pint.', 'It is yours.']);
  });

  it('a transform before any state joins the prose sources (the detail wrap)', () => {
    const host = hostWith([
      { mixin: 'DetailedMixin', fns: [wrap('label')] },
      { mixin: 'BulkableMixin', fns: [append('It holds gin.')] },
    ]);
    const { segments } = fold(host, 'A bottle with a label.');
    expect(segments[0]!.sources).toEqual([
      { kind: 'mixin', name: 'Visible' },
      { kind: 'mixin', name: 'Detailed' },
    ]);
    expect(segments[0]!.text).toContain('<detail key="label">label</detail>');
    expect(segments[1]).toMatchObject({ shape: 'state', text: 'It holds gin.' });
  });

  it('a transform AFTER a state that keeps the state intact re-splits cleanly', () => {
    const host = hostWith([
      { mixin: 'BulkableMixin', fns: [append('It holds gin.')] },
      { mixin: 'DetailedMixin', fns: [wrap('label')] },
    ]);
    const { segments } = fold(host, 'A bottle with a label.');
    expect(segments.map((s) => s.shape)).toEqual(['prose', 'state']);
    expect(segments[1]!.text).toBe('It holds gin.');
  });

  it('a transform that rewrites a state line collapses everything into one prose segment with every source', () => {
    const host = hostWith([
      { mixin: 'BulkableMixin', fns: [append('It holds gin.')] },
      { mixin: 'VisibleMixin', fns: [clobber] },
      { fns: [append('It looks fine.')] },
    ]);
    const { segments, text } = fold(host, 'A bottle.');
    expect(segments).toHaveLength(1);
    expect(segments[0]!.text).toBe(text);
    expect(segments[0]!.sources.map((s) => s.name)).toEqual(['Visible', 'Bulkable', 'Bottle']);
  });

  it('joined, the segments are the text', () => {
    const host = hostWith([
      { mixin: 'BulkableMixin', fns: [append('It holds gin.')] },
      { fns: [append('It looks fine: honestly made.')] },
    ]);
    const { segments, text } = fold(host, 'A bottle.');
    expect(segments.map((s) => s.text).join('\n\n')).toBe(text);
  });
});
