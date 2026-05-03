import { describe, it, expect } from 'vitest';
import { Door } from '../Door';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/test-setup';

/**
 * Door has a no-arg constructor — fields are populated either by the
 * clone-pipeline hydrator (via the mixin setters) or, in unit tests, by
 * direct property assignment after construction. The setters on
 * `SealableMixin.isOpen` and `PerceptibleMixin.keywords` enforce the
 * shape of those fields regardless of the entry path.
 */

describe('Door', () => {
  it('constructs with sensible defaults', () => {
    const door = makeStuff(() => new Door());
    expect(door.shortDescription).toBe('');
    expect(door.longDescription).toBe('');
    expect(door.getKeywords()).toEqual([]);
    expect(door.isOpen).toBe(false);
  });

  it('accepts post-construction field assignment', () => {
    const door = makeStuff(() => new Door());
    door.shortDescription = 'heavy oak door';
    door.longDescription = 'An iron-banded slab of oak.';
    door.keywords = ['portal'];
    door.isOpen = true;

    expect(door.shortDescription).toBe('heavy oak door');
    expect(door.longDescription).toBe('An iron-banded slab of oak.');
    expect(door.isOpen).toBe(true);
    expect(door.getKeywords()).toContain('portal');
  });

  it('normalizes keywords assigned via the setter (lowercase, trim, dedupe)', () => {
    const door = makeStuff(() => new Door());
    door.shortDescription = 'heavy oak door';
    door.keywords = ['Oak', '  ', 'OLD', 'oak'];

    const kw = door.getKeywords();
    expect(kw).toContain('oak');
    expect(kw).toContain('old');
    expect(kw).not.toContain('');
    expect(kw).not.toContain('  ');
    // Dedupe: the duplicate 'Oak'/'oak' results in a single entry.
    expect(kw.filter((k) => k === 'oak')).toHaveLength(1);
  });

  it('isOpen setter rejects non-boolean values with TypeError', () => {
    const door = makeStuff(() => new Door());
    expect(() => {
      (door as unknown as { isOpen: unknown }).isOpen = 1;
    }).toThrow(TypeError);
    expect(() => {
      (door as unknown as { isOpen: unknown }).isOpen = 'true';
    }).toThrow(TypeError);
    expect(door.isOpen).toBe(false);
  });

  it('keywords setter rejects non-arrays with TypeError', () => {
    const door = makeStuff(() => new Door());
    expect(() => {
      (door as unknown as { keywords: unknown }).keywords = 'oak';
    }).toThrow(TypeError);
  });

  it('open() and close() flip state idempotently', () => {
    const door = makeStuff(() => new Door());
    door.shortDescription = 'gate';
    door.open();
    expect(door.isOpen).toBe(true);
    door.open();
    expect(door.isOpen).toBe(true);
    door.close();
    expect(door.isOpen).toBe(false);
    door.close();
    expect(door.isOpen).toBe(false);
  });

  it('getKeywords() merges explicit keywords with shortDescription tokens', () => {
    const door = makeStuff(() => new Door());
    door.shortDescription = 'Heavy Oak Door';
    door.keywords = ['portal'];

    const kw = door.getKeywords();
    expect(kw).toContain('portal');
    expect(kw).toContain('heavy');
    expect(kw).toContain('oak');
    expect(kw).toContain('door');
  });

  it('composes the expected mixins', () => {
    const door = makeStuff(() => new Door());
    door.shortDescription = 'gate';
    expect(MixinApi.isSealable(door)).toBe(true);
    expect(MixinApi.isPerceptible(door)).toBe(true);
    expect(MixinApi.isVisible(door)).toBe(true);
  });
});
