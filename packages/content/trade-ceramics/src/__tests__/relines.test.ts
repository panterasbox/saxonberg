/**
 * `relines` — the keeper relines his furnace when its lining wears thin
 * (ceramics D20): idle while it is sound; with firebrick in hand he fits
 * it; with too few he walks to the store, buys what burnt through on the
 * house's card, walks back and fits — every act a literal verb.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { brain } from '../behavior/relines';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import { BrainMoves } from '@saxonberg/server/mud/lib/behavior/BrainMoves';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';

function setup(health: number, heldBricks: number, failed = 3) {
  const exits = { getExits: () => ({ get: (d: string) => ({ d }) }) };
  const smelter = { getTemplatePath: () => '/x/smelter', getContents: () => [furnace], ...exits };
  const store = { getTemplatePath: () => '/x/store', getContents: () => [counter], ...exits };
  const furnace = {
    liningHealth: () => health,
    getContainer: () => smelter,
    getTemplatePath: () => '/x/furnace',
    getPrimaryKeyword: () => 'furnace',
    getKeywords: () => ['furnace'],
    getLine: () => ({ failed }),
  };
  const counter = { getContainer: () => store, getTemplatePath: () => '/x/counter' };
  const held: { getKeywords(): string[]; getQuantity(): number }[] = [];
  if (heldBricks > 0) held.push({ getKeywords: () => ['firebrick'], getQuantity: () => heldBricks });
  let room: unknown = smelter;
  const commands: string[] = [];
  const host = {
    // ⭐ He walks by the `go` verb (`ctx.goTo`, B107): west to the store.
    executeCommand: vi.fn(async (c: string) => {
      const d = /^go (\S+)$/.exec(c)?.[1] ?? '';
      room = d === 'west' ? store : smelter;
      commands.push(`(walks ${d})`);
    }),
    getContainer: () => room,
    getContents: () => held,
    forceCommand: vi.fn(async (c: string) => {
      commands.push(c);
      if (c === 'buy firebrick' && room === store) {
        held.push({ getKeywords: () => ['firebrick'], getQuantity: () => 1 });
      }
    }),
    isFulfilling: () => true,
  };
  // The router over these two rooms: the store is one west of the smelter.
  vi.spyOn(NavigationApi, 'routeBetween').mockImplementation((async (_from: string, to: string) => ({
    ok: true,
    plans: [{ legs: [to === '/x/store' ? { dir: 'west', to } : { dir: 'east', to }] }],
  })) as never);
  vi.spyOn(StuffApi, 'findAllByTemplatePath').mockImplementation(((p: string) =>
    p === '/x/furnace' ? [furnace] : []) as never);
  vi.spyOn(StuffApi, 'findByTemplatePath').mockImplementation(((p: string) =>
    ({ '/x/furnace': furnace, '/x/counter': counter, '/x/store': store, '/x/smelter': smelter })[p] ??
    null) as never);
  for (const k of [
    'isBurner',
    'isMobile',
    'isContainer',
    'isCommandGiver',
    'isPerceptible',
    'isAssembled',
    'isContainable',
    'isExitable',
    'isStackable',
  ]) {
    vi.spyOn(MixinApi, k as never).mockReturnValue(true as never);
  }
  vi.spyOn(MixinApi, 'isEmployed').mockReturnValue(true as never);
  const config = { furnace: '/x/furnace', counter: '/x/counter', knows: '/x' };
  const ctx = {
    host,
    config,
    ...new BrainMoves(host as never, config).members(),
  } as unknown as BrainContext;
  return { ctx, commands };
}

afterEach(() => vi.restoreAllMocks());

describe('relines', () => {
  it('a sound lining is no work', () => {
    const { ctx } = setup(0.9, 3);
    expect(brain.urgency(ctx).band).toBe('idle');
  });

  it('⭐ a thin lining wants work, and firebrick enough in hand is fitted', async () => {
    const { ctx, commands } = setup(0.3, 3);
    expect(brain.urgency(ctx).band).toBe('wanted');
    await brain.act(ctx);
    expect(commands).toEqual(['fit lining to furnace']);
  });

  it('⭐ with too few he walks to the store, buys what burnt through on the house card, and comes back to fit', async () => {
    const { ctx, commands } = setup(0.3, 0, 3);
    await brain.act(ctx);
    expect(commands).toEqual([
      '(walks west)',
      'wallet use house',
      'buy firebrick',
      'buy firebrick',
      'buy firebrick',
      '(walks east)',
      'fit lining to furnace',
    ]);
  });
});
