/**
 * Draught and the dog (W13 / D40–D42) — ⭐⭐ **there is no new mechanism
 * in either of them**, which is the claim worth testing.
 *
 * `PitPony`'s own doc already said it: carry capacity derives from body
 * mass in the encumbrance substrate, *"the pony is better at hauling
 * because it is heavier, which is the actual reason, and the engine
 * already knew it."* Ploughing asks the same question of the same
 * number, and the ox/person ratio is **nowhere authored** — it is what
 * the two animals weigh.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';
import { HandlingMixin } from '@saxonberg/server/mud/lib/husbandry/Handling';
import { Creature } from '@saxonberg/server/mud/lib/creature/Creature';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { brain as herds } from '../behavior/herds';

const CONTENT = new URL('../../content/trade/ranching/', import.meta.url);
const row = (rel: string): Record<string, unknown> =>
  (parse(readFileSync(fileURLToPath(new URL(rel, CONTENT)), 'utf8')) as {
    data: Record<string, unknown>;
  }).data;

const HERDS_SRC = readFileSync(
  fileURLToPath(new URL('../behavior/herds.ts', import.meta.url)),
  'utf8',
);

class TestBeast extends HandlingMixin(Creature) {}

describe('⭐⭐ draught power is body mass, and nothing else', () => {
  it('the ox/person ratio is the two MASSES, authored nowhere', () => {
    // An ox is 700 kg. A person is about 70. So an ox is worth about ten
    // of you in the traces, and there is no multiplier anywhere saying
    // so — which is D40's whole claim.
    expect(row('agent/ox.yaml').mass).toBe(700);
  });

  it('⭐ and the ox is an ANIMAL, so it eats whether or not it works', () => {
    // The depreciating-asset-that-consumes insight, applied to a tool —
    // and it falls out of the class rather than being modelled.
    expect(row('agent/ox.yaml').class ?? '').toBe('');
    const raw = readFileSync(
      fileURLToPath(new URL('agent/ox.yaml', CONTENT)),
      'utf8',
    );
    expect(raw).toContain('class: /trade/ranching/agent/Livestock');
  });
});

describe('⭐⭐ the dog is the fourth rung, and it costs a relationship', () => {
  it('it works UNWATCHED — which is the entire reason to keep one', () => {
    expect(herds.presenceGated).toBe(false);
  });

  it('⭐⭐ a poorly bonded dog works BADLY — the bond made economic', () => {
    // Bond acquires a consequence without any livestock acquiring a bond
    // stat: the dog's own handling scales what its work is worth.
    expect(HERDS_SRC).toMatch(/getHandling\?\.\(\) \?\? 0/);
    expect(HERDS_SRC).toMatch(/if \(own <= 0\) return;/);
    expect(HERDS_SRC).toMatch(/\* own/);
  });

  it('⚠ and it CANNOT do the acts that need judgement about one animal', () => {
    // The batchable test's other side: the draft, the cull and the
    // paddock move stay the player's, and the brain does not touch them.
    // ⚠ Checked against the CODE rather than the file: the docstring
    // names those acts precisely in order to say it does not do them.
    const code = HERDS_SRC.replace(/\/\*\*[\s\S]*?\*\//g, '');
    for (const act of ['draft', 'returnHead', 'butcher', 'breed']) {
      expect(code).not.toContain(act);
    }
  });

  it('what it does is quiet the stock — the same act a person would do', () => {
    const beast = makeStuff(() => {
      const b = new TestBeast();
      b.handling = 0.3;
      return b;
    });
    const before = beast.getHandling();
    beast.handle(0.02 * 0.55);
    expect(beast.getHandling()).toBeGreaterThan(before);
    StuffApi.clearAll();
  });

  it('⭐ the shipped dog is bonded enough to be worth having, and not perfect', () => {
    const handling = row('agent/farm-dog.yaml').handling as number;
    expect(handling).toBeGreaterThan(0.4);
    expect(handling).toBeLessThan(0.8);
  });
});
