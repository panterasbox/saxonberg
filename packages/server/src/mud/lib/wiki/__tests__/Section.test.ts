/**
 * Sections and sticky anchors — the pure half.
 *
 * Gates the mechanism behind acceptance criteria **35** (two edits to
 * different sections both succeed) and **45** (`pageId#anchor` survives
 * a heading rewording).
 *
 * The commuting property is the interesting one: section editing is
 * concurrency control, not a UI convenience, and what makes it work is
 * that two edits to different sections touch disjoint byte ranges.
 */

import { describe, it, expect } from 'vitest';
import { Sections } from '../Section';

const ARTICLE =
  '<h1 anchor="oak">Oak</h1>intro' +
  '<h2 anchor="uses">Uses</h2>furniture' +
  '<h3 anchor="joinery">Joinery</h3>detail' +
  '<h2 anchor="working">Working</h2>labour';

describe('listing sections', () => {
  it('finds every heading with its anchor and title', () => {
    const list = Sections.list(ARTICLE);
    expect(list.map((s) => s.anchor)).toEqual([
      'oak',
      'uses',
      'joinery',
      'working',
    ]);
    expect(list.map((s) => s.title)).toEqual([
      'Oak',
      'Uses',
      'Joinery',
      'Working',
    ]);
    expect(list.map((s) => s.level)).toEqual([1, 2, 2 + 1, 2]);
  });

  it('⭐ a section OWNS its subsections', () => {
    // An `<h2>` runs until the next h1 or h2, not the next heading of
    // any level — otherwise editing a section would silently orphan
    // the `<h3>`s beneath it.
    const uses = Sections.extract(ARTICLE, 'uses')!;
    expect(uses).toContain('Joinery');
    expect(uses).toContain('detail');
    expect(uses).not.toContain('Working');
  });

  it('the last section runs to the end of the body', () => {
    expect(Sections.extract(ARTICLE, 'working')).toBe(
      '<h2 anchor="working">Working</h2>labour',
    );
  });

  it('mints an anchor from the heading text when none is declared', () => {
    const list = Sections.list('<h2>How To Work It</h2>x');
    expect(list[0]!.anchor).toBe('how-to-work-it');
  });

  it('a declared anchor beats the text', () => {
    const list = Sections.list('<h2 anchor="w">How To Work It</h2>x');
    expect(list[0]!.anchor).toBe('w');
  });

  it('strips markup out of a heading’s title', () => {
    const list = Sections.list('<h2>The <strong>hard</strong> part</h2>x');
    expect(list[0]!.title).toBe('The hard part');
    expect(list[0]!.anchor).toBe('the-hard-part');
  });

  it('a body with no headings has no sections', () => {
    expect(Sections.list('just prose')).toEqual([]);
    expect(Sections.find('just prose', 'x')).toBeNull();
  });

  it('find is case-insensitive on the anchor', () => {
    expect(Sections.find(ARTICLE, 'USES')?.anchor).toBe('uses');
  });
});

describe('⭐ replacing a section (35)', () => {
  it('replaces one span and leaves every other byte alone', () => {
    const out = Sections.replace(
      ARTICLE,
      'working',
      '<h2 anchor="working">Working</h2>NEW',
    )!;
    expect(out).toContain('NEW');
    expect(out).toContain('<h1 anchor="oak">Oak</h1>intro');
    expect(out).toContain('<h2 anchor="uses">Uses</h2>furniture');
  });

  it('⭐ two edits to DIFFERENT sections commute', () => {
    // This is the whole concurrency claim. Two people editing
    // different sections touch disjoint byte ranges, so applying both
    // in either order gives the same article — the conflict was never
    // created, not resolved.
    const editA = (b: string) =>
      Sections.replace(b, 'uses', '<h2 anchor="uses">Uses</h2>A-EDIT')!;
    const editB = (b: string) =>
      Sections.replace(b, 'working', '<h2 anchor="working">Working</h2>B-EDIT')!;
    expect(editB(editA(ARTICLE))).toBe(editA(editB(ARTICLE)));
    const both = editB(editA(ARTICLE));
    expect(both).toContain('A-EDIT');
    expect(both).toContain('B-EDIT');
  });

  it('returns null for a section that is not there', () => {
    expect(Sections.replace(ARTICLE, 'nope', 'x')).toBeNull();
  });

  it('replacing a parent section replaces its children with it', () => {
    const out = Sections.replace(
      ARTICLE,
      'uses',
      '<h2 anchor="uses">Uses</h2>rewritten',
    )!;
    expect(out).not.toContain('Joinery');
    expect(out).toContain('Working');
  });
});

describe('⭐ sticky anchors (45)', () => {
  it('an anchor survives a rewording of its heading', () => {
    // The criterion, and the reason anchors are minted rather than
    // derived: a derived anchor changes when the words do, and every
    // citation to that section breaks silently.
    const before = '<h2 anchor="uses">Uses</h2>text';
    const after = Sections.reconcile(before, '<h2>What It Is Good For</h2>text');
    expect(Sections.list(after)[0]!.anchor).toBe('uses');
  });

  it('mints anchors for a brand-new body', () => {
    const out = Sections.reconcile('', '<h2>Uses</h2>x<h2>Working</h2>y');
    expect(Sections.list(out).map((s) => s.anchor)).toEqual([
      'uses',
      'working',
    ]);
  });

  it('carries anchors across several headings positionally', () => {
    const before = '<h2 anchor="a">A</h2>x<h2 anchor="b">B</h2>y';
    const after = Sections.reconcile(before, '<h2>Alpha</h2>x<h2>Beta</h2>y');
    expect(Sections.list(after).map((s) => s.anchor)).toEqual(['a', 'b']);
  });

  it('⚠ mints FRESH anchors when the heading count changes', () => {
    // The deliberate limit. When headings have been added or removed,
    // positional matching would attach the wrong anchor to the wrong
    // section — and a MIS-AIMED citation is worse than a broken one,
    // because it is silent. So a count change starts over.
    const before = '<h2 anchor="a">A</h2>x';
    const after = Sections.reconcile(before, '<h2>Alpha</h2>x<h2>Beta</h2>y');
    expect(Sections.list(after).map((s) => s.anchor)).toEqual([
      'alpha',
      'beta',
    ]);
  });

  it('an explicitly authored anchor always wins', () => {
    const before = '<h2 anchor="old">A</h2>x';
    const after = Sections.reconcile(before, '<h2 anchor="mine">A</h2>x');
    expect(Sections.list(after)[0]!.anchor).toBe('mine');
  });

  it('is idempotent — reconciling twice changes nothing', () => {
    const once = Sections.reconcile('', '<h2>Uses</h2>x');
    expect(Sections.reconcile(once, once)).toBe(once);
  });

  it('leaves a body with no headings exactly as it was', () => {
    expect(Sections.reconcile('', 'just prose')).toBe('just prose');
  });

  it('skips a heading whose text slugifies to nothing', () => {
    // No anchor is better than `anchor=""`, which would match every
    // other empty-titled heading.
    const out = Sections.reconcile('', '<h2>!!!</h2>x');
    expect(out).toBe('<h2>!!!</h2>x');
  });
});

describe('slugify', () => {
  it('folds case, collapses whitespace, strips punctuation', () => {
    expect(Sections.slugify('  How To  Work It! ')).toBe('how-to-work-it');
    expect(Sections.slugify('snake_case')).toBe('snake-case');
    expect(Sections.slugify('---')).toBe('');
  });
});
