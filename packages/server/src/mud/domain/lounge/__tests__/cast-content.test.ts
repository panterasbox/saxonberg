/**
 * Content-integrity tests for Dave's Bar cast seeds. Validates that the
 * authored NPC templates reference the thin NPC class and that every
 * `behaviors[].brain` path resolves to a real brain module — the same
 * `StuffApi.resolveExport` check the CMS save-gate runs, so a typo'd
 * brain path in content is caught here rather than silently at spawn.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { StuffApi } from '../../../api/stuff';

const NPC_DIR = fileURLToPath(
  new URL('../../../seeds/domain/lounge/npc/', import.meta.url)
);
const BAR_YAML = fileURLToPath(
  new URL('../../../seeds/domain/lounge/bar.yaml', import.meta.url)
);

interface Spec {
  brain: string;
  trigger: string;
  config?: Record<string, unknown>;
}
interface CastDoc {
  class: string;
  data: { name?: string; behaviors?: Spec[] };
}

function castFiles(): string[] {
  return readdirSync(NPC_DIR).filter((f) => f.endsWith('.yaml'));
}
function load(file: string): CastDoc {
  return YAML.parse(readFileSync(`${NPC_DIR}${file}`, 'utf8')) as CastDoc;
}

describe("Dave's Bar cast seeds", () => {
  it('authors the full cast', () => {
    const names = castFiles()
      .map((f) => load(f).data.name)
      .sort();
    expect(names).toEqual(['Augie', 'Dave', 'Mara', 'Remy', 'Sloane']);
  });

  it('every cast member is the thin NPC class', () => {
    for (const f of castFiles()) {
      expect(load(f).class).toBe('/lib/character/NPC');
    }
  });

  it('every behavior brain path resolves to a real brain', async () => {
    for (const f of castFiles()) {
      const specs = load(f).data.behaviors ?? [];
      expect(specs.length).toBeGreaterThan(0);
      for (const spec of specs) {
        const resolved = await StuffApi.resolveExport(spec.brain, 'brain');
        expect(resolved, `${f}: ${spec.brain}`).not.toBeNull();
      }
    }
  });

  it('the bar populates exactly the five cast templates', () => {
    const bar = YAML.parse(readFileSync(BAR_YAML, 'utf8')) as {
      data: { populates?: string[] };
    };
    expect(bar.data.populates?.sort()).toEqual([
      '/domain/lounge/npc/augie',
      '/domain/lounge/npc/dave',
      '/domain/lounge/npc/mara',
      '/domain/lounge/npc/remy',
      '/domain/lounge/npc/sloane',
    ]);
  });
});
