/**
 * The brickfield's three brains (ceramics W6) — `moulds`, `sets`, `pots`:
 * ONE act per beat, furthest along first, every act a literal verb, every
 * walk a planned route taken a `go` at a time (`ctx.goTo`, B107), and never
 * a player's goods.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { brain as moulds } from '../behavior/moulds';
import { brain as sets } from '../behavior/sets';
import { brain as pots } from '../behavior/pots';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import { BrainMoves } from '@saxonberg/server/mud/lib/behavior/BrainMoves';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';

/** A brain's context with the REAL moves (`BrainMoves`) bound to the host. */
function ctxOf(host: unknown, config: Record<string, unknown>): BrainContext {
  return { host, config, ...new BrainMoves(host as never, config).members() } as unknown as BrainContext;
}

const CLAY = '/trade/quarrying/thing/clay';
const BRICK = '/trade/ceramics/thing/brick';

/** A fake good: the fields the brains read, and nothing else. */
interface Fake {
  tpl: string;
  kw: string[];
  qty?: number;
  green?: boolean;
  fireable?: boolean;
  ruin?: string | null;
  alloy?: number;
  player?: boolean;
  /** The maker's identity path (a Crafted good). */
  maker?: string;
  id?: string;
  tempK?: number;
  wetCoat?: boolean;
  insideCoats?: number;
  tool?: string[];
  material?: string[];
  contents?: Fake[];
  lit?: boolean;
  fuel?: number;
}

function good(f: Fake) {
  return {
    ...f,
    stuffId: f.id ?? `${f.tpl}:${f.player ? 'player' : 'gang'}`,
    isDestroyed: () => false,
    getTemplatePath: () => f.tpl,
    getKeywords: () => f.kw,
    getPrimaryKeyword: () => f.kw[0] ?? '',
    hasKeyword: (w: string) => f.kw.includes(w),
    getQuantity: () => f.qty ?? 1,
    isGreen: () => f.green === true,
    isFireable: () => f.fireable === true,
    getRuin: () => f.ruin ?? null,
    getMakeup: () => Array.from({ length: f.alloy ?? 0 }, () => ({ materialPath: '/sand', fraction: 0.1 })),
    stampedOwner: () => (f.player ? { kind: 'player', templatePath: '/p' } : null),
    getMaker: () => f.maker ?? '',
    getTemperature: () => ({ rawValue: () => f.tempK ?? 290 }),
    getCoats: (face: string) =>
      face === 'inside'
        ? Array.from({ length: f.insideCoats ?? (f.wetCoat ? 1 : 0) }, () => ({ state: f.wetCoat ? 'wet' : 'fused' }))
        : [],
    getCapabilities: () => f.tool ?? [],
    getMaterial: () => (f.material ? { hasTag: (t: string) => f.material!.includes(t) } : null),
    getContents: () => (f.contents ?? []).map(good),
    isLit: () => f.lit === true,
    fuelRemaining: () => f.fuel ?? 0,
  };
}

type Room = { path: string; things: ReturnType<typeof good>[]; exits: Record<string, string> };

function world(rooms: Room[], start: string, heldGoods: Fake[]) {
  const byPath = new Map(rooms.map((r) => [r.path, r]));
  const roomObj = (r: Room) => ({
    getTemplatePath: () => r.path,
    getContents: () => r.things,
    getExits: () => ({ get: (d: string) => (r.exits[d] ? { to: r.exits[d] } : undefined) }),
  });
  let here = byPath.get(start)!;
  const held = heldGoods.map(good);
  const commands: string[] = [];
  const host = {
    // ⭐ The worker walks by the `go` verb through the room's real exit.
    executeCommand: vi.fn(async (c: string) => {
      const d = /^go (\S+)$/.exec(c)?.[1];
      const to = d === undefined ? undefined : here.exits[d];
      if (to === undefined) return;
      here = byPath.get(to)!;
      commands.push(`(→ ${to})`);
    }),
    getContainer: () => roomObj(here),
    getContents: () => held,
    getEngagements: () => [],
    isFulfilling: () => true,
    forceCommand: vi.fn(async (c: string) => {
      commands.push(c);
    }),
  };
  // The router, over these rooms' own exits and scoped by the extent as the
  // kernel's is (an identity prefix): the shortest way, legs with their dirs.
  vi.spyOn(NavigationApi, 'routeBetween').mockImplementation((async (
    from: string,
    to: string,
    _profile: unknown,
    knowledge: { extent?: string },
  ) => {
    const seen = new Map<string, { dir: string; to: string }[]>([[from, []]]);
    const queue = [from];
    while (queue.length > 0) {
      const at = queue.shift()!;
      if (at === to) return { ok: true, plans: [{ legs: seen.get(at)! }] };
      for (const [dir, next] of Object.entries(byPath.get(at)?.exits ?? {})) {
        if (seen.has(next) || (knowledge.extent && !next.startsWith(knowledge.extent))) continue;
        seen.set(next, [...seen.get(at)!, { dir, to: next }]);
        queue.push(next);
      }
    }
    return { ok: false, reason: 'no-way' };
  }) as never);
  for (const k of ['isMobile', 'isContainer', 'isContainable', 'isCommandGiver', 'isExitable', 'isEmployed', 'isEngaged', 'isTangible', 'isPerceptible']) {
    vi.spyOn(MixinApi, k as never).mockReturnValue(true as never);
  }
  const has = (key: string) => (o: Record<string, unknown>) => o[key] !== undefined;
  vi.spyOn(MixinApi, 'isGreenware').mockImplementation(((o: Record<string, unknown>) => has('green')(o)) as never);
  vi.spyOn(MixinApi, 'isStackable').mockImplementation(((o: Record<string, unknown>) => has('qty')(o)) as never);
  vi.spyOn(MixinApi, 'isComposition').mockImplementation(((o: Record<string, unknown>) => has('alloy')(o)) as never);
  vi.spyOn(MixinApi, 'isChattel').mockReturnValue(true as never);
  vi.spyOn(MixinApi, 'isCrafted').mockImplementation(((o: Record<string, unknown>) => has('maker')(o)) as never);
  vi.spyOn(MixinApi, 'isThermal').mockReturnValue(true as never);
  vi.spyOn(MixinApi, 'isFaced').mockReturnValue(true as never);
  vi.spyOn(MixinApi, 'isTool').mockImplementation(((o: Record<string, unknown>) => has('tool')(o)) as never);
  vi.spyOn(MixinApi, 'isBurner').mockImplementation(((o: Record<string, unknown>) => has('lit')(o)) as never);
  return { host, commands, held, here: () => here.path };
}

afterEach(() => vi.restoreAllMocks());

describe('moulds', () => {
  const rooms = (shed: Fake[], pit: Fake[]): Room[] => {
    const temperPit = good({ tpl: '/bf/temper-pit', kw: ['pit'], contents: pit });
    vi.spyOn(StuffApi, 'findByTemplatePath').mockImplementation(((p: string) =>
      p === '/bf/temper-pit' ? { ...temperPit, getContainer: () => ({ getTemplatePath: () => '/bf/temper' }) } : null) as never);
    return [
      { path: '/bf/shed', things: shed.map(good), exits: { south: '/bf/hacks', west: '/bf/temper' } },
      { path: '/bf/hacks', things: [], exits: { north: '/bf/shed' } },
      { path: '/bf/temper', things: [good({ tpl: '/bf/sand', kw: ['sand'], material: ['silica'] })], exits: { east: '/bf/shed', south: '/bf/pit' } },
      { path: '/bf/pit', things: [], exits: { north: '/bf/temper' } },
    ];
  };
  const config = {
    shed: '/bf/shed',
    temper: '/bf/temper-pit',
    hacks: '/bf/hacks',
    pit: '/bf/pit',
    knows: '/bf',
  };

  it('⭐ green bricks in hand go to the hacks before anything else', async () => {
    const w = world(rooms([], []), '/bf/shed', [{ tpl: BRICK, kw: ['bricks'], qty: 10, green: true }]);
    await moulds.act(ctxOf(w.host, config));
    expect(w.commands).toEqual(['(→ /bf/hacks)', 'put bricks on hack', '(→ /bf/shed)']);
  });

  it('tempered clay in hand is moulded — a day at the table', async () => {
    const w = world(rooms([], []), '/bf/shed', [{ tpl: CLAY, kw: ['clay'], qty: 3, alloy: 2 }]);
    await moulds.act(ctxOf(w.host, config));
    expect(w.commands).toEqual(['shape clay into brick']);
  });

  it('raw clay in the pit is opened with sand and trodden; he stays for the tread', async () => {
    const w = world(rooms([], [{ tpl: CLAY, kw: ['clay'], qty: 3, alloy: 0 }]), '/bf/shed', []);
    await moulds.act(ctxOf(w.host, config));
    expect(w.commands).toEqual(['(→ /bf/temper)', 'put sand in pit', 'knead pit']);
  });

  it('⚠ a PLAYER’s bricks on the pallet are not his to bear off', async () => {
    const w = world(rooms([{ tpl: BRICK, kw: ['bricks'], qty: 9, green: true, player: true }], []), '/bf/shed', [
      { tpl: CLAY, kw: ['clay'], qty: 3, alloy: 2 },
    ]);
    await moulds.act(ctxOf(w.host, config));
    expect(w.commands).toEqual(['shape clay into brick']);
  });

  it('with no clay anywhere he walks to the pit and digs', async () => {
    const w = world(rooms([], []), '/bf/shed', []);
    await moulds.act(ctxOf(w.host, config));
    expect(w.commands).toEqual(['(→ /bf/temper)', '(→ /bf/pit)', 'get 1 spade', 'dig clay']);
  });

  it('⭐ he leaves the pit’s spade AT the pit when he carries his clay home', async () => {
    // A brain that took the spades home left the brickfield with none —
    // and players and potters stood in the pit with nothing to dig with.
    const w = world(rooms([], []), '/bf/pit', [
      { tpl: '/spade', kw: ['spade'], tool: ['digging'] },
      { tpl: CLAY, kw: ['clay'], qty: 1, alloy: 0 },
    ]);
    await moulds.act(ctxOf(w.host, config));
    expect(w.commands[0]).toBe('drop spade');
    expect(w.commands).toContain('(→ /bf/shed)');
  });
});

describe('sets', () => {
  const CLAMP = '/trade/ceramics/thing/clamp';
  const config = { home: '/bf/ground', clamp: CLAMP, hacks: '/bf/hacks', batch: 20, knows: '/bf' };

  it('⭐ a charged clamp is stoked, lit and fired', async () => {
    const clamp = good({ tpl: CLAMP, kw: ['clamp'], lit: false, fuel: 0, contents: [{ tpl: BRICK, kw: ['bricks'], qty: 24, green: true, fireable: true }] });
    const w = world(
      [
        { path: '/bf/ground', things: [clamp, good({ tpl: '/coal', kw: ['coal'] })], exits: { west: '/bf/hacks' } },
        { path: '/bf/hacks', things: [], exits: { east: '/bf/ground' } },
      ],
      '/bf/ground',
      [],
    );
    await sets.act(ctxOf(w.host, config));
    expect(w.commands).toEqual(['stoke coal into clamp', 'ignite clamp']);
  });

  it('a cold clamp of burnt bricks is drawn; a warm one is left', async () => {
    const mk = (tempK: number) =>
      good({ tpl: CLAMP, kw: ['clamp'], lit: false, contents: [{ tpl: BRICK, kw: ['bricks'], qty: 24, green: false, tempK }] });
    for (const [tempK, expected] of [[300, ['get bricks from clamp']], [600, []]] as const) {
      const w = world([{ path: '/bf/ground', things: [mk(tempK)], exits: {} }], '/bf/ground', []);
      await sets.act(ctxOf(w.host, config));
      expect(w.commands).toEqual(expected);
      vi.restoreAllMocks();
    }
  });

  it('⭐ a player\'s brick in the hacks is never taken — the gang fetches its own by identity', async () => {
    // Run 22: `get 20 bricks` took the player's bone-dry test brick too.
    const clamp = good({ tpl: CLAMP, kw: ['clamp'], lit: false, contents: [] });
    const theirs = good({ tpl: BRICK, kw: ['bricks'], qty: 1, green: true, fireable: true, player: true, id: 'players-brick' });
    const gangs = good({ tpl: BRICK, kw: ['bricks'], qty: 30, green: true, fireable: true, id: 'gangs-bricks' });
    const w = world(
      [
        { path: '/bf/ground', things: [clamp], exits: { west: '/bf/hacks' } },
        { path: '/bf/hacks', things: [theirs, gangs], exits: { east: '/bf/ground' } },
      ],
      '/bf/ground',
      [],
    );
    await sets.act(ctxOf(w.host, config));
    const gets = w.commands.filter((c) => c.startsWith('get '));
    expect(gets).toEqual(['get 20 #gangs-bricks']);
  });

  it('⭐ a player\'s untitled STACK in the hacks is theirs by its maker (drive A, run 32)', async () => {
    // A stack bears no title, so the nine bricks a player set out carry no
    // stamp; the maker is what says whose they are.
    const clamp = good({ tpl: CLAMP, kw: ['clamp'], lit: false, contents: [] });
    const theirs = good({
      tpl: BRICK, kw: ['bricks'], qty: 9, green: true, fireable: true,
      maker: '/platform/agent/Avatar/p-1', id: 'players-stack',
    });
    const gangs = good({ tpl: BRICK, kw: ['bricks'], qty: 30, green: true, fireable: true, maker: '/bf/moulder', id: 'gangs-bricks' });
    const w = world(
      [
        { path: '/bf/ground', things: [clamp], exits: { west: '/bf/hacks' } },
        { path: '/bf/hacks', things: [theirs, gangs], exits: { east: '/bf/ground' } },
      ],
      '/bf/ground',
      [],
    );
    await sets.act(ctxOf(w.host, config));
    expect(w.commands.filter((c) => c.startsWith('get '))).toEqual(['get 20 #gangs-bricks']);
  });

  it('an under-charged clamp sends him to the hacks for bone-dry bricks', async () => {
    const clamp = good({ tpl: CLAMP, kw: ['clamp'], lit: false, contents: [] });
    const w = world(
      [
        { path: '/bf/ground', things: [clamp], exits: { west: '/bf/hacks' } },
        { path: '/bf/hacks', things: [good({ tpl: BRICK, kw: ['bricks'], qty: 30, green: true, fireable: true })], exits: { east: '/bf/ground' } },
      ],
      '/bf/ground',
      [],
    );
    await sets.act(ctxOf(w.host, config));
    expect(w.commands).toEqual(['(→ /bf/hacks)', expect.stringMatching(/^get 20 #/), '(→ /bf/ground)']);
  });
});

describe('pots', () => {
  const KILN = '/trade/ceramics/thing/updraft-kiln';
  const config = {
    shop: '/bf/shop',
    kiln: KILN,
    pit: '/bf/pit',
    forms: ['mug', 'jug'],
    glaze: { tub: 'lead tub', forms: ['jar'] },
    batch: 2,
    knows: '/bf',
  };
  const shop = (things: Fake[], kilnContents: Fake[] = []): Room[] => [
    { path: '/bf/shop', things: [good({ tpl: KILN, kw: ['kiln'], lit: false, fuel: 1, contents: kilnContents }), ...things.map(good)], exits: { west: '/bf/pit' } },
    { path: '/bf/pit', things: [], exits: { east: '/bf/shop' } },
  ];

  it('⭐ clay in hand is thrown into the next form in turn', async () => {
    const w = world(shop([{ tpl: '/ware/mug', kw: ['mug'], green: true }]), '/bf/shop', [{ tpl: CLAY, kw: ['clay'], qty: 1 }]);
    await pots.act(ctxOf(w.host, config));
    expect(w.commands).toEqual(['shape clay into jug']);
  });

  it('⭐ fired ware that takes a glaze is dipped inside and put back; the rest is shelved', async () => {
    const jar = world(shop([]), '/bf/shop', [{ tpl: '/ware/jar', kw: ['jar'], green: false }]);
    await pots.act(ctxOf(jar.host, config));
    expect(jar.commands).toEqual(['dip jar inside in lead tub', 'put jar in kiln']);
    vi.restoreAllMocks();
    const mug = world(shop([]), '/bf/shop', [{ tpl: '/ware/mug', kw: ['mug'], green: false }]);
    await pots.act(ctxOf(mug.host, config));
    expect(mug.commands).toEqual(['put mug in shelf']);
  });

  it('a kiln-load waiting is lit and fired', async () => {
    const load = [
      { tpl: '/ware/mug', kw: ['mug'], green: true, fireable: true },
      { tpl: '/ware/jug', kw: ['jug'], green: true, fireable: true },
    ];
    const w = world(shop([], load), '/bf/shop', []);
    await pots.act(ctxOf(w.host, config));
    expect(w.commands).toEqual(['ignite kiln']);
  });
});
