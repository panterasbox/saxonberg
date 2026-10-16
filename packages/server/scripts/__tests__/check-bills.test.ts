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
  describe('arm 7 — a bill iff the class composes AssembledMixin', () => {
    const assembled = (c: string): boolean => c === '/platform/thing/AssembledTool';
    const withPickClass = (cls: string): [string, TemplateRow][] =>
      SOUND.map(([p, r]) =>
        p === '/x/thing/pick' ? row(p, { ...r.raw, class: cls }) : ([p, r] as [string, TemplateRow]),
      );
    const run = (rows: [string, TemplateRow][]): string =>
      checkBills(new Map(rows), [PICK_RECIPE], assembled)
        .map((f) => f.detail)
        .join('\n');

    it('is quiet when the billed row names the assembled subclass', () => {
      expect(run(withPickClass('/platform/thing/AssembledTool'))).toBe('');
    });

    it('⭐ fires on a bill on the broad family (the parts record is never read)', () => {
      expect(run(withPickClass('/platform/thing/Tool'))).toMatch(
        /a bill on a \/platform\/thing\/Tool, which does not compose AssembledMixin/,
      );
    });

    it('⭐ fires on the assembled subclass with no bill (no parts is no assembly)', () => {
      const rows = [
        ...withPickClass('/platform/thing/AssembledTool'),
        row('/x/thing/knife', { class: '/platform/thing/AssembledTool', data: { mass: 0.2 } }),
      ];
      expect(run(rows)).toMatch(/composes AssembledMixin but this row has no bill/);
    });
  });
});
