/**
 * HidingMixin — the actor-side concealment state. Asserts the load-bearing
 * seam: while `hiding`, `getConcealment()` returns the dynamic snapshot;
 * when not, it defers to `super` (the authored static band, so an NPC
 * authored lurking keeps its concealment). Discovery is non-sticky while
 * hiding (a fresh contest per hide), durable via `super` otherwise.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { HidingMixin } from '../Hiding';
import { ConcealableMixin } from '../Concealable';
import { Idea } from '../../stuff/Idea';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

// The actor-side composition: HidingMixin OUTSIDE ConcealableMixin (the
// Character seam), so the override can call super.getConcealment().
class Hider extends HidingMixin(ConcealableMixin(Idea)) {}

let counter = 0;
function makeHider(): Hider {
  return makeStuffAtPath(() => new Hider(), `/obj/test/hider-${counter++}`);
}

describe('HidingMixin — state surface', () => {
  it('starts not hiding, obvious concealment (backcompat)', () => {
    const h = makeHider();
    expect(h.isHiding()).toBe(false);
    expect(h.getConcealment()).toBe('obvious');
  });

  it('enterHide sets the state and presents the dynamic level', () => {
    const h = makeHider();
    h.enterHide('deep');
    expect(h.isHiding()).toBe(true);
    expect(h.getHiddenLevel()).toBe('deep');
    expect(h.getConcealment()).toBe('deep');
  });

  it('breakHide reverts to the authored (super) band', () => {
    const h = makeHider();
    h.setConcealment('hidden'); // an authored lurk band on the carrier
    h.enterHide('buried');
    expect(h.getConcealment()).toBe('buried'); // dynamic wins while hiding
    h.breakHide();
    expect(h.isHiding()).toBe(false);
    expect(h.getConcealment()).toBe('hidden'); // super's authored field
  });

  it('rejects an unknown band word', () => {
    const h = makeHider();
    expect(() => h.enterHide('sneaky' as never)).toThrow(RangeError);
  });

  it('has no durable discovery key while hiding (non-sticky), super key otherwise', () => {
    const h = makeHider();
    // Not hiding: the authored templatePath key (durable found-memory).
    expect(h.getDiscoveryKey()).toBe(h.getTemplatePath());
    h.enterHide('hidden');
    // Hiding: no durable key → a searcher's reveal doesn't stick.
    expect(h.getDiscoveryKey()).toBeUndefined();
  });
});
