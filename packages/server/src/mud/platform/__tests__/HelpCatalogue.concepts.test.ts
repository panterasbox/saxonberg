/**
 * The concept projector (farmstead W12 / D102) — ⭐⭐ **`help api` is the
 * author surface and player help is a different thing.**
 *
 * Every other help kind is *harvested* from something that exists for
 * another reason: commands from the loaded roster, the API surface from
 * the generated model, collections from their schema docs. All of them
 * answer *what can I call, and what does it do*.
 *
 * None of them can answer **what nitrogen IS**, or what a body condition
 * score means, or why a sward has a residual — and a build that adds a
 * whole agronomy owes that. The concept kind is the fourth projector and
 * the only authored one.
 */

import '../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import HelpCatalogue from '../idea/HelpCatalogue';
import { StuffApi } from '../../api/stuff';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';
import type { HelpTopic } from '@saxonberg/types';

const CATALOGUE = '/platform/idea/HelpCatalogue';

function concept(over: Partial<HelpTopic> = {}): HelpTopic {
  return {
    id: 'concept.nitrogen',
    kind: 'concept',
    title: 'Nitrogen',
    summary: 'The thing your ground runs out of.',
    keywords: ['nitrogen', 'fertility', 'muck'],
    body: 'Plants are mostly built out of air and water.',
    relations: [
      { kind: 'see-also', targetId: 'concept.rotation', targetTitle: 'rotation' },
    ],
    spoiler: false,
    source: { subdivision: 'commands', ref: 'concept:nitrogen' },
    ...over,
  } as HelpTopic;
}

async function catalogue(concepts: HelpTopic[]): Promise<HelpCatalogue> {
  const c = makeStuffAtPath(() => new HelpCatalogue(), CATALOGUE);
  await c.warm({ commandDefs: [], surface: null, schema: null, concepts });
  return c;
}

describe('the concept projector', () => {
  afterEach(() => StuffApi.clearAll());

  it('⭐ an authored concept becomes a first-class help topic', async () => {
    const c = await catalogue([concept()]);
    const topic = c.getTopic('concept.nitrogen');
    expect(topic?.kind).toBe('concept');
    expect(topic?.title).toBe('Nitrogen');
    expect(topic?.body).toContain('air and water');
  });

  it('⭐ it is findable by the words a player would actually type', async () => {
    const c = await catalogue([concept()]);
    // Not `Soil.fixNitrogen` — "muck", which is what somebody standing
    // in a farmyard with a fork would search for.
    expect(c.listByKind('concept').map((t) => t.id)).toContain('concept.nitrogen');
    const entry = c.listByKind('concept')[0]!;
    expect(entry.keywords).toContain('muck');
  });

  it('⚠ NONE ships by default — the projector is inert with no rows', async () => {
    const c = await catalogue([]);
    expect(c.listByKind('concept')).toEqual([]);
  });

  it('⚠ and the other projectors are untouched when concepts are absent', async () => {
    // Degrading one projector must never take the index down; that rule
    // predates this kind and this asserts the new one keeps it.
    const c = await catalogue([]);
    expect(() => c.listByKind('command')).not.toThrow();
  });
});
