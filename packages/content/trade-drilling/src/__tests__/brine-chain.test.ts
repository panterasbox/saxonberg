/**
 * ⭐⭐ **The chain, end to end, read off the SHIPPED ROWS.**
 *
 * What only a pack test can see is whether the citations line up — and
 * every link in this chain is a citation that fails closed and silent if
 * it does not:
 *
 *  1. ⭐⭐⭐ **The brine meets the pan by TAG, and nothing in this build
 *     wrote a line of code for it.** The leg's fluid is `salt-water`,
 *     whose tags carry `brine`, which is the `inputCategory` quarrying's
 *     evaporative profile already asks for. If those three strings ever
 *     stop agreeing, the pan sits full of brine forever with nothing
 *     anywhere to say why — the failure this file exists for.
 *  2. The instruments are on the shelf people already buy from, priced,
 *     and the derrick is deliberately NOT (a ton and a half of timber
 *     frame is not a thing you carry out of a shop).
 *  3. The recipes resolve: every output template is a row that exists.
 *  4. ⭐ The saltern stands at the FLAT, because brine is mostly water
 *     and salt is light — the same fact about freight that puts a
 *     limekiln at a quarry.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const PACK = fileURLToPath(new URL('../../', import.meta.url));
const CONTENT = fileURLToPath(new URL('../../../', import.meta.url));
const REJECTION = `${CONTENT}rejection/content/world/terminus/rejection/`;
const QUARRYING = `${CONTENT}trade-quarrying/content/trade/quarrying/`;
const BASE = `${CONTENT}base-library/content/`;

function row(abs: string): Record<string, unknown> {
  return YAML.parse(readFileSync(abs, 'utf8')) as Record<string, unknown>;
}
function data(abs: string): Record<string, unknown> {
  return (row(abs).data ?? {}) as Record<string, unknown>;
}

describe('⭐⭐⭐ the brine meets the pan by TAG', () => {
  it('the leg\'s fluid, the water\'s tags and the profile\'s category all agree', () => {
    // Three strings in three packs. Nothing checks them at runtime; a
    // mismatch is a pan that never starts.
    const fluids = data(`${REJECTION}idea/deposit/ferrow.yaml`).fluids as Array<{
      key: string;
      fluid: string;
    }>;
    const leg = fluids.find((f) => f.key === 'salt-leg')!;
    expect(leg.fluid).toBe('/stuff/idea/material/bulk/salt-water');

    const water = data(`${BASE}stuff/idea/material/bulk/salt-water.yaml`);
    const tags = (water.tags ?? []) as string[];

    const profile = data(`${QUARRYING}idea/maturation/brine.yaml`);
    expect(tags).toContain(profile.inputCategory);
    expect(profile.mechanism).toBe('evaporative');
    expect(profile.productMaterial).toBe('/stuff/idea/material/food/salt');
  });

  it('⭐ the saltern stands at the FLAT, where the brine comes out', () => {
    // Brine is ninety-odd per cent water and salt is light: you boil it
    // where it comes out of the ground and carry the salt. A fact about
    // freight, and the reason a saltern is a place rather than a shop.
    const flat = data(`${REJECTION}location/salt-flat.yaml`);
    const props = (flat.props ?? []) as string[];
    expect(props).toContain('/trade/quarrying/thing/brine-hearth');
    expect(props).toContain('/trade/quarrying/thing/salt-pan');
  });

  it('the pan is a MaturingMixin vessel and the hearth is the heat', () => {
    // ⚠ The mechanism is on the VESSEL, not on the fire — which is why
    // the pan in a lit hearth reconciles on read and nothing drives it.
    const pan = row(`${QUARRYING}thing/salt-pan.yaml`);
    expect(pan.class).toBe('/platform/thing/Vat');
    const hearth = row(`${QUARRYING}thing/brine-hearth.yaml`);
    expect(hearth.class).toBe('/platform/thing/Oven');
  });
});

describe('the kit is on the shelf people already buy from', () => {
  const counter = data(`${REJECTION}thing/store-counter.yaml`);
  const lines = (counter.stockLines ?? []) as Array<{
    itemTemplatePath: string;
  }>;
  const prices = (counter.prices ?? {}) as Record<string, number>;

  it('stocks the bailer, the liner and the pan, and prices all three', () => {
    for (const path of [
      '/trade/drilling/thing/bailer',
      '/trade/drilling/thing/liner',
      '/trade/quarrying/thing/salt-pan',
    ]) {
      expect(lines.map((l) => l.itemTemplatePath)).toContain(path);
      expect(prices[path]).toBeGreaterThan(0);
    }
  });

  it('⚠ does NOT stock a derrick — you do not carry one out of a shop', () => {
    expect(lines.map((l) => l.itemTemplatePath)).not.toContain(
      '/trade/drilling/thing/derrick',
    );
  });

  it('⭐ every priced line is a line it actually stocks', () => {
    // The failure this guards is the one the store already paid for: a
    // `Stock` with lines and no prices holds the goods and prices none,
    // and every `buy` answers *"isn't for sale"*. The reverse — a price
    // for something never stocked — is the same defect mirrored.
    const stocked = new Set(lines.map((l) => l.itemTemplatePath));
    for (const path of Object.keys(prices)) {
      expect(stocked.has(path)).toBe(true);
    }
  });
});

describe('the recipes name rows that exist', () => {
  for (const id of ['bailer', 'liner']) {
    it(`\`make ${id}\` resolves to a shipped row`, () => {
      const recipe = row(`${PACK}content/recipes/${id}.yaml`);
      const out = String(recipe.outputTemplate);
      expect(out.startsWith('/trade/drilling/thing/')).toBe(true);
      const leaf = out.split('/').pop()!;
      expect(existsSync(`${PACK}content/trade/drilling/thing/${leaf}.yaml`)).toBe(
        true,
      );
      // ⭐ A tangible output, and no material: the row names its own.
      expect(recipe.outputApplication).toBe('tangible');
    });
  }

  it('⚠⚠ the wellhead and the DERRICK have no recipe — the siting act raises both', () => {
    // A hole is not a thing you make and carry; it is capital committed
    // to a piece of ground. A recipe for one would be a hole in your
    // pocket — and `make derrick` was exactly that for one revision:
    // `CraftingLogic` lands a tangible output AT THE MAKER, so a
    // `fixedInPlace` ton-and-a-half frame arrived in somebody's pocket,
    // and six lengths of mine timber is 240 kg, which no body in this
    // game can carry to a hillside.
    expect(existsSync(`${PACK}content/recipes/wellhead.yaml`)).toBe(false);
    expect(existsSync(`${PACK}content/recipes/derrick.yaml`)).toBe(false);
  });

  it('⭐⭐ the BAILER affords `bore`, because a derrick cannot afford raising one', () => {
    // The spade/field split the kernel already blessed. The bailer is
    // the one tool on the rig from the first yard to the last, and it is
    // in your hands rather than in the ground.
    expect(row(`${PACK}content/trade/drilling/thing/bailer.yaml`).class).toBe(
      '/trade/drilling/thing/Bailer',
    );
    const src = readFileSync(`${PACK}src/thing/Bailer.ts`, 'utf8');
    expect(src).toMatch(/static commandContributions/);
    expect(src).toMatch(/inventory/);
    expect(src).toMatch(/bore\.yaml/);
    // ⚠ And the derrick keeps the `peers` rung, so putting the bailer
    // down at the wellhead costs nothing.
    const derrick = readFileSync(`${PACK}src/thing/Derrick.ts`, 'utf8');
    expect(derrick).toMatch(/peers/);
  });
});

describe('the labour pool is content, and the hands have no brain', () => {
  it('two roustabouts stand in the Dry, cast rather than propped', () => {
    const dry = data(`${REJECTION}location/the-dry.yaml`);
    const cast = (dry.cast ?? []) as string[];
    expect(cast).toContain('/world/terminus/rejection/agent/roustabout-a');
    expect(cast).toContain('/world/terminus/rejection/agent/roustabout-b');
    // ⚠ `cast:`, never `props:` — they are people.
    expect((dry.props ?? []) as string[]).not.toContain(
      '/world/terminus/rejection/agent/roustabout-a',
    );
  });

  it('⚠⚠ neither has a BEHAVIOUR, and that is deliberate', () => {
    // What a crew contributes is PRESENCE: rostered, on shift, standing
    // at the rig with hands free, and the rig counts them. A brain would
    // be a second mechanism doing the same job worse — and would make
    // them wander off the beam.
    for (const who of ['roustabout-a', 'roustabout-b']) {
      const d = data(`${REJECTION}agent/${who}.yaml`);
      expect(d.behaviors).toBeUndefined();
      expect(d.lifecycleState).toBe('alive');
    }
  });

  it('the outfit seed authors its ONE seat, with a wage on it', () => {
    // ⭐ `positions` has no runtime setter and should not: what seats a
    // business has is a fact about the KIND of business. Authoring them
    // on the seed is what the constraint permits rather than blocks.
    const seed = data(
      `${PACK}content/trade/drilling/idea/business/outfit.yaml`,
    );
    const positions = (seed.positions ?? []) as Array<{
      key: string;
      wageRate: number;
    }>;
    expect(positions).toHaveLength(1);
    expect(positions[0]!.key).toBe('roustabout');
    expect(positions[0]!.wageRate).toBeGreaterThan(0);
    // ⚠ Empty on purpose — overlaid at mint from whoever sited the hole.
    expect(seed.banksAt).toBe('');
  });
});
