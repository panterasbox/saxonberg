import { describe, it, expect } from 'vitest';
import { Door } from './Door';
import { MixinApi } from '../../api/mixin';

describe('Door', () => {
  it('constructs with sensible defaults', () => {
    const door = new Door();
    expect(door.shortDescription).toBe('');
    expect(door.longDescription).toBe('');
    expect(door.getKeywords()).toEqual([]);
    expect(door.isOpen).toBe(false);
  });

  it('accepts template-shaped options', () => {
    const door = new Door({
      shortDescription: 'heavy oak door',
      longDescription: 'An iron-banded slab of oak.',
      keywords: ['portal'],
      isOpen: true,
    });
    expect(door.shortDescription).toBe('heavy oak door');
    expect(door.longDescription).toBe('An iron-banded slab of oak.');
    expect(door.isOpen).toBe(true);
    expect(door.getKeywords()).toContain('portal');
  });

  it('normalizes explicit keywords to lowercase and drops empties', () => {
    const door = new Door({
      shortDescription: 'heavy oak door',
      keywords: ['Oak', '  ', 'OLD'],
    });
    const kw = door.getKeywords();
    expect(kw).toContain('oak');
    expect(kw).toContain('old');
    expect(kw).not.toContain('');
    expect(kw).not.toContain('  ');
  });

  it('open() and close() flip state idempotently', () => {
    const door = new Door({ shortDescription: 'gate' });
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
    const door = new Door({
      shortDescription: 'Heavy Oak Door',
      keywords: ['portal'],
    });
    const kw = door.getKeywords();
    expect(kw).toContain('portal');
    expect(kw).toContain('heavy');
    expect(kw).toContain('oak');
    expect(kw).toContain('door');
  });

  it('composes the expected mixins', () => {
    const door = new Door({ shortDescription: 'gate' });
    expect(MixinApi.isSealable(door)).toBe(true);
    expect(MixinApi.isPerceptible(door)).toBe(true);
    expect(MixinApi.isVisible(door)).toBe(true);
  });
});
