/**
 * Chair / FoldingChair — a real sittable seat, and its collapsible
 * variant whose posture slot closes while folded (the gate lives in
 * Slotted.canOccupy, so no verb knows about folding).
 */

import "../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import Chair from '../Chair';
import FoldingChair from '../FoldingChair';
import Bench from '../Bench';
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

describe('Chair / FoldingChair / Bench', () => {
  afterEach(() => StuffApi.clearAll());

  it('a plain Chair is Postured and sittable', () => {
    const chair = withSitSlot(makeStuff(() => new Chair()));
    expect(MixinApi.isPostured(chair as never)).toBe(true);
    const sitter = makeStuff(() => new Sitter());
    expect(() => chair.occupy(sitter, 'sit')).not.toThrow();
  });

  it('Bench reuses the Chair composition (Postured, sittable)', () => {
    const bench = withSitSlot(makeStuff(() => new Bench()));
    expect(MixinApi.isPostured(bench as never)).toBe(true);
    const sitter = makeStuff(() => new Sitter());
    expect(() => bench.occupy(sitter, 'sit')).not.toThrow();
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
