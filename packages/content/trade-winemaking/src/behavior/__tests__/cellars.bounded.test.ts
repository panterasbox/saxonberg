/**
 * The cellars brain stays bounded and verb-driven — the farms.bounded
 * shape: a source test asserting the brain's contract facts (literal
 * player verbs only, batch bounds, state reads never act, home in
 * `finally`) so a refactor that breaks the doctrine fails loudly.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC = readFileSync(
  fileURLToPath(new URL('../cellars.ts', import.meta.url)),
  'utf8',
);

describe('the cellars brain — bounded, literal, home in finally', () => {
  it('acts only through literal player verbs', () => {
    for (const verb of [
      "'get bottle'",
      "'fill bottle from vat'",
      "'close bottle'",
      "'wallet use house'",
      '`consign bottle --ask ${ask}`',
      '`order ${which}`',
      '`pour bucket into vat`',
      "'buy grapes'",
    ]) {
      expect(SRC).toContain(verb);
    }
    // No template-literal command smuggles an object getter into a verb.
    expect(SRC).not.toMatch(/forceCommand\([^)]*`get /);
  });

  it('every leg is bounded', () => {
    expect(SRC).toContain('.slice(0, batch)');
    expect(SRC).toContain('i < CRUSHES_PER_BEAT');
    expect(SRC).toContain('i < buyCount');
    expect(SRC).toContain('if (!held) break;');
    expect(SRC).toContain('if (grapesInReach(home) < 6) break;');
  });

  it('the hand comes home in finally, from both away legs', () => {
    const matches = SRC.match(/finally \{\s*\n\s*hand\.teleport\(home/g);
    expect(matches?.length).toBe(2);
  });

  it('home is the authored floor, never wherever the hand is', () => {
    expect(SRC).toContain('StuffApi.findByTemplatePath(homePath)');
    expect(SRC).toContain(
      'if (hand.getContainer() !== home) hand.teleport(home',
    );
  });
});
