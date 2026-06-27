/**
 * Content-integrity tests for Dave's Bar cast seeds. Validates that the
 * authored NPC templates reference a shared archetype class (the thin
 * `NPC`, or its `Crafter` maker-subclass for the bar staff — the
 * crafting lane made the bartenders order-fulfillers) and that every
 * `behaviors[].brain` path resolves to a real brain module — the same
 * `StuffApi.resolveExport` check the CMS save-gate runs, so a typo'd
 * brain path in content is caught here rather than silently at spawn.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { StuffApi } from '../../../api/stuff';
import { DialogueTreeSchema } from '../../../lib/npc/tree';

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
  data: { name?: string; _speciesPath?: string; behaviors?: Spec[] };
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

  it('every cast member uses a shared archetype class (no bespoke per-NPC subclass)', () => {
    // The cast composes behavior as data over a shared class — the thin
    // `NPC`, or `Crafter` (`MakerMixin(NPC)`) for the bar staff, whom the
    // crafting lane made order-fulfillers. Never a per-NPC subclass.
    const allowed = ['/lib/npc/NPC', '/lib/character/Crafter'];
    for (const f of castFiles()) {
      expect(allowed, f).toContain(load(f).class);
    }
  });

  it('the cast spans multiple species (not all human)', () => {
    const species = new Set(
      castFiles().map((f) => load(f).data._speciesPath)
    );
    expect(species.size).toBeGreaterThanOrEqual(3);
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

  it('every authored dialogue tree is structurally valid (save-gate parity)', () => {
    let trees = 0;
    for (const f of castFiles()) {
      for (const spec of load(f).data.behaviors ?? []) {
        if (spec.trigger !== 'engage') continue;
        trees++;
        expect(DialogueTreeSchema.validate(spec.config), f).toEqual([]);
      }
    }
    // At least one cast member is conversational (Mara).
    expect(trees).toBeGreaterThan(0);
  });

  it('the bar populates the five cast templates (alongside the crafting fixtures)', () => {
    const bar = YAML.parse(readFileSync(BAR_YAML, 'utf8')) as {
      data: { populates?: (string | { template: string })[] };
    };
    // populates now carries the crafting fixtures (back-bar + bottles/
    // tools `onto` it + the menu) as well as the cast; assert the cast is
    // wired in, not that it's the whole list.
    const paths = (bar.data.populates ?? []).map((e) =>
      typeof e === 'string' ? e : e.template
    );
    for (const npc of [
      '/domain/lounge/npc/augie',
      '/domain/lounge/npc/dave',
      '/domain/lounge/npc/mara',
      '/domain/lounge/npc/remy',
      '/domain/lounge/npc/sloane',
    ]) {
      expect(paths, npc).toContain(npc);
    }
  });
});
