/**
 * The illustration's declared shape (client-surface D10): authored, else
 * the branch default — a place is wide, an agent tall, anything else
 * square. A value outside the closed set refuses at the setter.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { VisibleMixin } from '../Visible';
import { Idea } from '../../stuff/Idea';
import Place from '../../stuff/Place';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

class Thingish extends VisibleMixin(Idea) {}
class PlaceLike extends VisibleMixin(Place) {}

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('Visible.getIllustrationShape', () => {
  it('defaults by branch: a place wide, an agent tall, a thing square', () => {
    expect(makeStuff(() => new PlaceLike()).getIllustrationShape()).toBe('wide');
    const agentish = makeStuff(() => new Thingish());
    vi.spyOn(agentish, 'isAgent').mockReturnValue(true);
    expect(agentish.getIllustrationShape()).toBe('tall');
    expect(makeStuff(() => new Thingish()).getIllustrationShape()).toBe('square');
  });

  it('an authored shape wins; an unknown one refuses', () => {
    const t = makeStuff(() => new Thingish());
    t.setIllustrationShape('wide');
    expect(t.getIllustrationShape()).toBe('wide');
    expect(() => t.setIllustrationShape('banner' as never)).toThrow(/unknown shape/);
  });
});
