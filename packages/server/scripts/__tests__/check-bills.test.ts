/**
 * check-bills — assert the gate FIRES on each broken shape and stays quiet
 * on a sound one (the shipped-broken-gate clause: a gate proven only by
 * staying green may have silently stopped matching).
 */

import { describe, it, expect } from 'vitest';
import { checkBills } from '../check-bills';
import type { TemplateRow } from '../pack-roots';

function row(path: string, raw: Record<string, unknown>): [string, TemplateRow] {
  return [path, { path, file: `/content/x/content${path}.yaml`, pack: 'x', raw }];
}

const SOUND: [string, TemplateRow][] = [
  row('/stuff/idea/material/wood/ash', { class: '/platform/idea/material/Material', data: {} }),
  row('/x/idea/Discipline/mining', { class: '/platform/idea/Discipline', data: { key: 'mining' } }),
  row('/platform/idea/Joint/wedged', {
    class: '/platform/idea/Joint',
    data: { key: 'wedged', portability: 'hand', competence: null },
  }),
  row('/x/thing/head', { class: '/platform/thing/Tool', data: { mass: 1.8 } }),
  row('/x/thing/haft', { class: '/platform/thing/Tool', data: { mass: 0.8 } }),
  row('/x/thing/pick', {
    class: '/platform/thing/Tool',
    data: {
      mass: 2.6,
      bill: {
        parts: [
          { part: 'head', template: '/x/thing/head', count: 1, role: 'structural' },
          { part: 'haft', template: '/x/thing/haft', count: 1, role: 'structural', material: '/stuff/idea/material/wood/ash' },
        ],
        joints: [{ key: 'hafting', method: 'wedged', members: ['head', 'haft'] }],
      },
    },
  }),
];

const PICK_RECIPE = {
  file: '/content/x/content/recipes/pick.yaml',
  recipeId: 'pick',
  outputTemplate: '/x/thing/pick',
  application: 'tangible',
  slots: [
    { slot: 'head', count: 1, kind: 'item' },
    { slot: 'haft', count: 1, kind: 'item' },
  ],
};

function details(rows: [string, TemplateRow][], recipes = [PICK_RECIPE]): string[] {
  return checkBills(new Map(rows), recipes).map((f) => f.detail);
}

describe('check-bills', () => {
  it('is quiet on a sound bill and the recipe that makes it', () => {
    expect(details(SOUND)).toEqual([]);
  });

  it('fires when a recipe does not supply a structural part (one declaration)', () => {
    const recipe = { ...PICK_RECIPE, slots: [{ slot: 'head', count: 1, kind: 'item' }] };
    expect(details(SOUND, [recipe]).join('\n')).toMatch(/no item slot named 'haft'/);
  });

  it('⭐ fires when the parts outweigh the whole (salvage conserves mass)', () => {
    const heavy = SOUND.map(([p, r]) =>
      p === '/x/thing/pick'
        ? row(p, { ...r.raw, data: { ...(r.raw.data as object), mass: 1 } })
        : ([p, r] as [string, TemplateRow]),
    );
    expect(details(heavy).join('\n')).toMatch(/parts weigh 2\.60 kg and the whole 1 kg/);
  });

  it('fires when a slot count disagrees with the bill', () => {
    const recipe = {
      ...PICK_RECIPE,
      slots: [
        { slot: 'head', count: 1, kind: 'item' },
        { slot: 'haft', count: 2, kind: 'item' },
      ],
    };
    expect(details(SOUND, [recipe]).join('\n')).toMatch(/slot 'haft' takes 2/);
  });

  it('fires on a part template, a joint method and a member that do not exist', () => {
    const broken = row('/x/thing/broken', {
      class: '/platform/thing/Tool',
      data: {
        bill: {
          parts: [{ part: 'blade', template: '/x/thing/nothing', count: 1, role: 'structural' }],
          joints: [{ key: 'j', method: 'welded', members: ['blade', 'ghost'] }],
        },
      },
    });
    const all = details([...SOUND, broken]).join('\n');
    expect(all).toMatch(/'\/x\/thing\/nothing', which no row ships/);
    expect(all).toMatch(/method 'welded', which no Joint row ships/);
    expect(all).toMatch(/member 'ghost'/);
  });

  it('refuses a bill on mail and on a hive', () => {
    const mail = row('/x/thing/hauberk', {
      class: '/platform/thing/equipment/Garment',
      data: {
        constructionForm: 'mail',
        bill: { parts: [{ part: 'ring', template: '/x/thing/head', count: 1, role: 'structural' }] },
      },
    });
    const hive = row('/trade/apiculture/thing/hive', {
      class: '/platform/thing/Thing',
      data: { bill: { parts: [{ part: 'frame', template: '/x/thing/head', count: 1, role: 'structural' }] } },
    });
    const all = details([...SOUND, mail, hive]).join('\n');
    expect(all).toMatch(/mail is a MATERIAL/);
    expect(all).toMatch(/container you put things IN/);
  });

  it('fires on a joint gated on a Discipline nobody ships, and on an ungated tool joint', () => {
    const hooped = row('/x/idea/Joint/hooped', {
      class: '/platform/idea/Joint',
      data: { key: 'hooped', portability: 'tool', competence: { discipline: 'coopering', band: 'competent' } },
    });
    const bare = row('/x/idea/Joint/bare', {
      class: '/platform/idea/Joint',
      data: { key: 'bare', portability: 'tool', competence: null },
    });
    const all = details([...SOUND, hooped, bare]).join('\n');
    expect(all).toMatch(/Discipline 'coopering', which no row ships/);
    expect(all).toMatch(/joint 'bare' carries no competence/);
  });
  describe('arm 7 — the mixin on the FAMILIES; a billless row is one piece (repair D7)', () => {
    const FAMILY = '/platform/thing/Tool';
    const assembled = (c: string): boolean => c === FAMILY || c === '/x/thing/CookPot';
    const withPickClass = (cls: string): [string, TemplateRow][] =>
      SOUND.map(([p, r]) =>
        p === '/x/thing/pick' ? row(p, { ...r.raw, class: cls }) : ([p, r] as [string, TemplateRow]),
      );
    const run = (
      rows: [string, TemplateRow][],
      recipes = [PICK_RECIPE],
      opts: { undeclared?: Map<string, string> } = {},
    ): string =>
      checkBills(
        new Map(rows),
        recipes,
        assembled,
        {
          durable: (c) => c === FAMILY || c.endsWith('Pot') || c === '/x/thing/Stock',
          stackable: (c) => c === '/x/thing/Stock',
        },
        undefined,
        opts.undeclared,
      )
        .map((f) => f.detail)
        .join('\n');

    it('is quiet when the billed row names the family', () => {
      expect(run(withPickClass(FAMILY))).toBe('');
    });

    it('7a — fires on a bill on a class that does not compose the mixin', () => {
      expect(run(withPickClass('/x/thing/Plain'))).toMatch(
        /a bill on a \/x\/thing\/Plain, which does not compose AssembledMixin/,
      );
    });

    it('7c — a billless row of the family is ONE PIECE and passes', () => {
      const rows = [
        ...withPickClass(FAMILY),
        row('/x/thing/knife', { class: FAMILY, data: { mass: 0.2 } }),
      ];
      expect(run(rows)).toBe('');
    });

    it('⭐ 7b — fires on a two-part recipe output with no bill, unless the census names it', () => {
      const rows = [
        ...withPickClass(FAMILY),
        row('/x/thing/hook', { class: FAMILY, data: { mass: 1 } }),
      ];
      const hook = {
        ...PICK_RECIPE,
        recipeId: 'hook',
        outputTemplate: '/x/thing/hook',
        slots: [
          { slot: 'blade', count: 1, kind: 'item' },
          { slot: 'handle', count: 1, kind: 'item' },
        ],
      };
      expect(run(rows, [PICK_RECIPE, hook])).toMatch(/consumes 2 distinct parts \(blade, handle\)/);
      expect(run(rows, [PICK_RECIPE, hook], { undeclared: new Map([['/x/thing/hook', 'why']]) })).toBe('');
      // …a BULK recipe fills a vessel; it does not make one.
      expect(run(rows, [PICK_RECIPE, { ...hook, application: 'bulk' }])).toBe('');
      // …and a census entry that no longer applies must leave.
      expect(run(rows, [PICK_RECIPE], { undeclared: new Map([['/x/thing/hook', 'why']]) })).toMatch(
        /take it off the list/,
      );
    });

    it('⭐ 7d — a recipe output that WEARS composes the mixin; stock is exempt', () => {
      const rows = [
        ...withPickClass(FAMILY),
        row('/x/thing/pot', { class: '/x/thing/IronPot', data: { mass: 1 } }),
        row('/x/thing/stave', { class: '/x/thing/Stock', data: { mass: 1 } }),
      ];
      const make = (out: string) => ({
        ...PICK_RECIPE,
        recipeId: out,
        outputTemplate: `/x/thing/${out}`,
        slots: [{ slot: 'stock', count: 1, kind: 'item' }],
      });
      expect(run(rows, [PICK_RECIPE, make('pot')])).toMatch(
        /makes \/x\/thing\/pot, a \/x\/thing\/IronPot that wears \(Durable\) but does not compose AssembledMixin/,
      );
      expect(run(rows, [PICK_RECIPE, make('stave')])).toBe('');
    });
  });

  describe('arm 8 — every bill part is MADE by something (repair D7)', () => {
    const run = (unmade: Map<string, string>, recipes = [PICK_RECIPE]): string =>
      checkBills(new Map(SOUND), recipes, undefined, undefined, unmade)
        .map((f) => `${f.where}: ${f.detail}`)
        .join('\n');
    const make = (out: string) => ({
      ...PICK_RECIPE,
      recipeId: out,
      outputTemplate: out,
      slots: [{ slot: 'stock', count: 1, kind: 'item' }],
    });

    it('fires on a part no recipe makes and no census names', () => {
      const out = run(new Map([['/x/thing/haft', 'why']]));
      expect(out).toMatch(/\/x\/thing\/head: a bill part no shipped recipe makes/);
    });

    it('is quiet when every part is made or named', () => {
      expect(run(new Map([['/x/thing/haft', 'why']]), [PICK_RECIPE, make('/x/thing/head')])).toBe('');
    });

    it('⭐ the census only falls — a named part that gains a recipe must leave', () => {
      const out = run(
        new Map([['/x/thing/haft', 'why'], ['/x/thing/head', 'why']]),
        [PICK_RECIPE, make('/x/thing/head')],
      );
      expect(out).toMatch(/\/x\/thing\/head: on UNMADE_PARTS but a recipe now makes it/);
    });
  });
});
