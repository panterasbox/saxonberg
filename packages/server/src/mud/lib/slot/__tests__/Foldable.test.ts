import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { FoldableMixin } from '../Foldable';
import { PosturedMixin } from '../Postured';
import { SlottedMixin } from '../Slotted';
import { SlottableMixin } from '../Slottable';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestFoldable extends FoldableMixin(Idea) {}

// A folding chair: posture-bearing slot host that also folds.
class FoldingChair extends FoldableMixin(PosturedMixin(SlottedMixin(Idea))) {}
class Sitter extends SlottableMixin(Idea) {}

describe('FoldableMixin', () => {
  it('defaults to unfolded', () => {
    const s = makeStuff(() => new TestFoldable());
    expect(s.isFolded()).toBe(false);
  });

  it('fold() and unfold() flip state idempotently', () => {
    const s = makeStuff(() => new TestFoldable());
    s.fold();
    expect(s.isFolded()).toBe(true);
    s.fold();
    expect(s.isFolded()).toBe(true);
    s.unfold();
    expect(s.isFolded()).toBe(false);
    s.unfold();
    expect(s.isFolded()).toBe(false);
  });

  it('setFolded flips state and rejects non-boolean', () => {
    const s = makeStuff(() => new TestFoldable());
    s.setFolded(true);
    expect(s.isFolded()).toBe(true);
    s.setFolded(false);
    expect(s.isFolded()).toBe(false);
    expect(() => s.setFolded(1 as unknown as boolean)).toThrow(TypeError);
  });

  it('MixinApi.isFoldable narrows correctly', () => {
    const s = makeStuff(() => new TestFoldable());
    expect(MixinApi.isFoldable(s)).toBe(true);
  });

  it('declares persistent field "folded" (noun form)', () => {
    expect(
      MixinApi.getAllPersistentFields(TestFoldable)
    ).toContain('folded');
  });
});

describe('Foldable gates the sit slot', () => {
  let chair: FoldingChair;
  let sitter: Sitter;

  beforeEach(() => {
    chair = makeStuff(() => new FoldingChair());
    chair.setStaticSlots([
      { name: 'sit', accepts: 'SlottableMixin', postures: ['sit'] },
    ]);
    sitter = makeStuff(() => new Sitter());
  });

  it('an unfolded chair accepts the sit slot', () => {
    expect(chair.isFolded()).toBe(false);
    expect(chair.canOccupy(sitter, 'sit')).toBe(true);
  });

  it('a folded chair refuses the sit slot', () => {
    chair.fold();
    expect(chair.canOccupy(sitter, 'sit')).toBe(false);
  });

  it('unfolding restores the sit slot', () => {
    chair.fold();
    expect(chair.canOccupy(sitter, 'sit')).toBe(false);
    chair.unfold();
    expect(chair.canOccupy(sitter, 'sit')).toBe(true);
  });
});
