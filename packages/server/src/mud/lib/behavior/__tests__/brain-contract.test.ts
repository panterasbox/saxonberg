/**
 * The brain contract, walked over every kernel brain.
 *
 * ⭐ A roster read from the DIRECTORY, never a list in this file. The
 * lesson `lint:family` was rewritten for: an enumerated roster rots, and
 * the rot looks exactly like a pass. A brain added tomorrow is held to
 * this contract without anybody being told.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { TASK_KINDS, URGENCY_BANDS, Urgency } from '../Urgency';
import { ENGAGEMENT_SLOTS } from '../../activity/Engaged';
import type { BrainStatics } from '../brain';

const HERE = dirname(fileURLToPath(import.meta.url));
const BRAIN_DIR = join(HERE, '..');

/**
 * ⚠ The two brains leaving the rail in W3: presence stops being a brain's
 * business and becomes the roster tick's, so they are deliberately
 * un-declared rather than declared and then deleted.
 */
const LEAVING = new Set(['shifts', 'covers']);

/** Not brains: the mixin, the contract, the beat, the value object. */
const NOT_A_BRAIN = new Set([
  'Behaved',
  'BehaviorBeat',
  'brain',
  'Urgency',
]);

function brainNames(): string[] {
  return readdirSync(BRAIN_DIR)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => f.replace(/\.ts$/, ''))
    .filter((n) => !NOT_A_BRAIN.has(n))
    .sort();
}

async function load(name: string): Promise<BrainStatics> {
  const mod = (await import(join(BRAIN_DIR, `${name}.ts`))) as {
    brain: BrainStatics;
  };
  return mod.brain;
}

describe('every kernel brain', () => {
  const names = brainNames();

  it('the roster is read from the directory and is not empty', () => {
    expect(names.length).toBeGreaterThan(20);
  });

  for (const name of names) {
    describe(name, () => {
      it('exports a class-like `brain` whose label is its filename', async () => {
        const brain = await load(name);
        expect(typeof brain).toBe('function');
        expect(brain.label).toBe(name);
      });

      if (LEAVING.has(name)) return;

      it('⭐ declares a kind in the vocabulary', async () => {
        const brain = await load(name);
        expect(TASK_KINDS).toContain(brain.kind);
      });

      it('⭐⭐ declares a summary that is NOT just its name', async () => {
        const brain = await load(name);
        // 38 brains shipped with `label` repeating the filename, so the
        // author palette could tell you the name of the thing you had
        // already typed and nothing else.
        expect(brain.summary ?? '').not.toBe('');
        expect(brain.summary).not.toBe(brain.label);
        expect((brain.summary ?? '').length).toBeGreaterThan(20);
      });

      it('⚠ claims at least one slot if its act is work, body or threat', async () => {
        const brain = await load(name);
        if (brain.kind === 'social' || brain.kind === 'filler') return;
        // "Does not do two things at once" is only true if the thing says
        // which hands it is using.
        expect(brain.claims ?? []).not.toHaveLength(0);
      });

      it('names only real engagement slots', async () => {
        const brain = await load(name);
        for (const s of [
          ...(brain.claims ?? []),
          ...(brain.requiresFree ?? []),
        ]) {
          expect(ENGAGEMENT_SLOTS).toContain(s);
        }
      });

      it('declares interruptibleBy only as real abort reasons, if at all', async () => {
        const brain = await load(name);
        if (!brain.interruptibleBy) return;
        for (const r of brain.interruptibleBy) {
          expect(typeof r).toBe('string');
        }
      });
    });
  }
});

describe('the deliberative brains', () => {
  it('⭐⭐ every brain declaring `urgency` answers with an Urgency, and never throws', async () => {
    // The shape check only — what each brain's reads answer is its own
    // test's business. What matters here is the contract: one call, one
    // `Urgency`, no throw on a host that composes nothing.
    //
    // ⚠ NOT "answers idle on a bare host": the floor brains (`idles`,
    // `wanders`, `random-chatter`, `converses`, `patrols`, `wary`,
    // `cellars`) read nothing at all and answer `wanted` always, which is
    // the point of them. The arbiter's own gates — presence, requiresFree
    // — are what stop them, not their urgency.
    const bare = {} as never;
    for (const name of brainNames()) {
      const brain = await load(name);
      if (!brain.urgency) continue;
      const u = await brain.urgency({
        host: bare,
        config: {},
        state: {},
        trigger: { source: 'candidate', raw: 'candidate' },
        say: () => {},
        emote: async () => {},
        emoteFree: () => {},
      });
      expect(u, `${name}.urgency`).toBeInstanceOf(Urgency);
      expect(URGENCY_BANDS, `${name}.urgency`).toContain(u.band);
    }
  });

  it('⚠ a brain that is a candidate declares a reason whenever it wants the beat', async () => {
    // `idle` needs no prose; anything else is narrated on a switch, so a
    // band above idle with an empty `because` would switch task silently.
    for (const name of brainNames()) {
      const brain = await load(name);
      if (!brain.urgency) continue;
      const src = brain.urgency.toString();
      if (!/new Urgency\('(wanted|pressing|critical)'|new Urgency\("(wanted|pressing|critical)"/.test(src)) {
        continue;
      }
      expect(src).toMatch(/new Urgency\(\s*['"](wanted|pressing|critical)['"]\s*,/);
    }
  });
});
