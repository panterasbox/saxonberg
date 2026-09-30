/**
 * Chair / FoldingChair — a real sittable seat, and its collapsible
 * variant whose posture slot closes while folded (the gate lives in
 * Slotted.canOccupy, so no verb knows about folding).
 *
 * ⚠ `Bench` was tested here too, and `Bench` was `class Bench extends
 * Chair {}` with an empty body and no row anywhere naming it. The case
 * asserted that an empty subclass inherits its parent's composition,
 * which is a fact about TypeScript. Both are gone (base-class
 * narrowing); a bench is a Chair row with bench prose and a
 * higher-capacity `sit` slot, which is what the class's own docstring
 * always said it was for.
 */

import "../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import Chair from '../thing/Chair';
import FoldingChair from '../thing/FoldingChair';
import { SlottableMixin } from '../../lib/slot/Slottable';
import { Idea } from '../../lib/stuff/Idea';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

class Sitter extends SlottableMixin(Idea) {}

function withSitSlot<T extends Chair>(chair: T): T {
  chair.setStaticSlots([
    { name: 'sit', accepts: 'SlottableMixin', postures: ['sit'] },
  ]);
  return chair;
}

describe('Chair / FoldingChair', () => {
  afterEach(() => StuffApi.clearAll());

  it('a plain Chair is Postured and sittable', () => {
    const chair = withSitSlot(makeStuff(() => new Chair()));
    expect(MixinApi.isPostured(chair as never)).toBe(true);
    const sitter = makeStuff(() => new Sitter());
    expect(() => chair.occupy(sitter, 'sit')).not.toThrow();
  });

  it('FoldingChair adds Foldable and starts deployed', () => {
    const chair = makeStuff(() => new FoldingChair());
    expect(MixinApi.isFoldable(chair as never)).toBe(true);
    expect(chair.isFolded()).toBe(false);
  });

  it('a folded FoldingChair refuses its sit slot; unfolded accepts it', () => {
    const chair = withSitSlot(makeStuff(() => new FoldingChair()));
    chair.fold();
    const sitter = makeStuff(() => new Sitter());
    expect(() => chair.occupy(sitter, 'sit')).toThrow();
    chair.unfold();
    expect(() => chair.occupy(sitter, 'sit')).not.toThrow();
  });
});
