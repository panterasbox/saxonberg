/**
 * The horizon section is stood up before it is read (navigation-server
 * drive, step 15g): at a session's open the section is the place's FIRST
 * read, and the sync horizon read takes unknown weather as clear air — it
 * named a light eighteen miles off through fog. The section now awaits the
 * place's `standUpHorizon` (which resolves the weather), as a `look` does.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { SensorMixin } from '../../message/Sensor';
import { PerceiverMixin } from '../Perceiver';
import { makeStuff } from '../../security/__tests__/test-setup';
import { MixinApi } from '../../../api/mixin';
import { PerceptionApi } from '../../../api/perception';
import type { Stuff } from '../../stuff/Stuff';

class Body extends PerceiverMixin(SensorMixin(Idea)) {}

afterEach(() => vi.restoreAllMocks());

describe('Perceiver.navigation — the horizon section', () => {
  it('stands the place\'s horizon up BEFORE reading it', async () => {
    const order: string[] = [];
    const place = {
      isPlace: () => true,
      standUpHorizon: vi.fn(async () => {
        await Promise.resolve();
        order.push('stand-up');
      }),
    } as unknown as Stuff;
    const body = makeStuff(() => new Body());
    vi.spyOn(MixinApi, 'isContainable').mockReturnValue(true);
    (body as unknown as { getContainer(): Stuff }).getContainer = () => place;
    vi.spyOn(PerceptionApi, 'horizonFor').mockImplementation(() => {
      order.push('read');
      return { things: [], traffic: [], atSea: false };
    });
    const out = await body.navigation(['horizon']);
    expect(order).toEqual(['stand-up', 'read']);
    expect(out.horizon).toBeDefined();
  });
});
