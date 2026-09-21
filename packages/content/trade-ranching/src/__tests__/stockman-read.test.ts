/**
 * ⭐ The stockman's read is a CONTRACT with the nutrition-and-fitness
 * build — kept permanently, not a content golden. That build hung a body
 * line on every PERSON (`Character.markupAugmenters`) and left the
 * animal's read byte-identical: an animal is a `Creature` and not a
 * `Character`, and the words a stockman uses are the words they used.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AppApi } from '@saxonberg/server/mud/api/app';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import Livestock from '../agent/Livestock';

describe('the stockman read — untouched by the mirror', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a default body reads exactly the shipped string', () => {
    installV1QuantityMarshallers();
    const beast = makeStuff(() => new Livestock());
    expect(beast.stockmanRead()).toBe(
      'in good flesh — the ribs felt rather than seen; it gives ground as you come up, and settles again a few paces off',
    );
  });

  it('⭐ `look` at an animal carries no body line — that is a person\'s', () => {
    installV1QuantityMarshallers();
    vi.spyOn(AppApi, 'setting').mockReturnValue('');
    const beast = makeStuff(() => new Livestock());
    beast.setLongDescription('A brindled ox.');
    const viewer = makeStuff(() => new Livestock()) as unknown as Stuff;
    const out = beast.getMarkupLong(viewer);
    expect(out).not.toContain('In good flesh.');
    expect(out).not.toContain('flesh');
  });
});
