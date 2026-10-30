/**
 * `harvest.yaml`'s arg gates, tested against the classes — the
 * `verb-gates.test.ts` shape (a controller test cannot see the binder).
 *
 * The forestry build added a `tool` arg: DECLARED (`default:` on the
 * `[capability.cutting]` atom, never hunted for — `lint:instrument-args`)
 * and gated on `ToolMixin`, which every shipped instrument composes
 * through `Tool`. A plant that names no `harvestTool` ignores it; a
 * coppice stool refuses without it. The `target` gate is unchanged.
 *
 * Field population W3 added `at <patch>` to `harvest` and `plant`/`sow`
 * (D5): an optional, greedy object bounded by every later arg's
 * preposition, gated on `SoilMixin`. The views must still LOAD — the
 * greedy-then-prepositional ordering is a load-time invariant.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import { MixinApi } from '../../../../../api/mixin';
import { Mixins } from '../../../../../lib/mixin';
import Tool from '../../../../thing/Tool';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';

const VIEW = join(
  __dirname,
  '..', '..', '..', '..', '..', '..', '..', '..',
  'content', 'platform', 'content', 'platform', 'cmd', 'inventory', 'harvest.yaml',
);

interface ArgSpec {
  name: string;
  type?: string;
  required?: boolean;
  requires?: string | string[];
  default?: string;
  prepositions?: string[];
}

const PLANT_VIEW = join(VIEW, '..', 'plant.yaml');

function args(view = VIEW): ArgSpec[] {
  const doc = YAML.parse(readFileSync(view, 'utf8')) as { args?: ArgSpec[] };
  return doc.args ?? [];
}

interface PatchSpec extends ArgSpec {
  greedy?: boolean;
  scope?: string[];
}

describe('harvest.yaml — the tool is an ARGUMENT', () => {
  it('declares an optional `tool` arg found by capability, gated on ToolMixin', () => {
    const tool = args().find((a) => a.name === 'tool');
    expect(tool).toBeDefined();
    expect(tool!.type).toBe('object');
    expect(tool!.required).toBe(false);
    expect(tool!.default).toBe(
      'reachable:[capability.reaping],reachable:[capability.cutting]',
    );
    expect(tool!.prepositions).toEqual(['with', 'using']);
    expect([tool!.requires].flat()).toEqual(['ToolMixin']);
  });

  it('…and the instrument every trade ships composes that mixin', () => {
    expect(MixinApi.hasMixin(Tool, Mixins.Tool)).toBe(true);
  });

  it('the target gate is untouched — the plant or the ground it grows in', () => {
    const target = args().find((a) => a.name === 'target');
    expect(target!.required).toBe(true);
    expect([target!.requires].flat()).toEqual([
      'VisibleMixin',
      'GrowingMixin|CultivableMixin',
    ]);
  });
});

describe('`at <patch>` — which part of a divided field (field population D5)', () => {
  for (const [verb, view] of [
    ['harvest', VIEW],
    ['plant', PLANT_VIEW],
  ] as const) {
    it(`${verb}.yaml declares an optional greedy \`patch\` object gated on SoilMixin`, () => {
      const all = args(view) as PatchSpec[];
      const patch = all.find((a) => a.name === 'patch');
      expect(patch).toBeDefined();
      expect(patch!.type).toBe('object');
      expect(patch!.required).toBe(false);
      expect(patch!.greedy).toBe(true);
      expect(patch!.prepositions).toEqual(['at']);
      expect(patch!.scope).toEqual(['reachable']);
      expect([patch!.requires].flat()).toEqual(['SoilMixin']);
      // Every arg after it stops it with a preposition of its own.
      const after = all.slice(all.indexOf(patch!) + 1);
      expect(after.every((a) => (a.prepositions ?? []).length > 0)).toBe(true);
    });

    it(`${verb}.yaml still loads`, () => {
      expect(() =>
        CommandDefinition.fromYaml(readFileSync(view, 'utf8'), view),
      ).not.toThrow();
    });
  }
});
