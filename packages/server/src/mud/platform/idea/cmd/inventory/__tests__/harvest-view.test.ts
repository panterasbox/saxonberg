/**
 * `harvest.yaml`'s arg gates, tested against the classes — the
 * `verb-gates.test.ts` shape (a controller test cannot see the binder).
 *
 * The forestry build added a `tool` arg: DECLARED (`default:` on the
 * `[capability.cutting]` atom, never hunted for — `lint:instrument-args`)
 * and gated on `ToolMixin`, which every shipped instrument composes
 * through `ToolItem`. A plant that names no `harvestTool` ignores it; a
 * coppice stool refuses without it. The `target` gate is unchanged.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import { MixinApi } from '../../../../../api/mixin';
import { Mixins } from '../../../../../lib/mixin';
import ToolItem from '../../../../thing/ToolItem';

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

function args(): ArgSpec[] {
  const doc = YAML.parse(readFileSync(VIEW, 'utf8')) as { args?: ArgSpec[] };
  return doc.args ?? [];
}

describe('harvest.yaml — the tool is an ARGUMENT', () => {
  it('declares an optional `tool` arg found by capability, gated on ToolMixin', () => {
    const tool = args().find((a) => a.name === 'tool');
    expect(tool).toBeDefined();
    expect(tool!.type).toBe('object');
    expect(tool!.required).toBe(false);
    expect(tool!.default).toBe('reachable:[capability.cutting]');
    expect(tool!.prepositions).toEqual(['with', 'using']);
    expect([tool!.requires].flat()).toEqual(['ToolMixin']);
  });

  it('…and the instrument every trade ships composes that mixin', () => {
    expect(MixinApi.hasMixin(ToolItem, Mixins.Tool)).toBe(true);
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
