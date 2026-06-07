/**
 * `<sys>` retirement grep guard. The `<sys>` MML tag (and its
 * `Mml.sys` compose helper) was retired in the message-rendering
 * Wave 1 build per `docs/requirements/message-rendering-requirements.md`.
 *
 * This test scans the server source tree for any surviving:
 *  - `Mml.sys(` call sites (would indicate a missed migration);
 *  - `<sys` markup emit sites in server prose (would indicate a
 *    template / scene composer that still produces the tag);
 *
 * Test files are excluded from the scan — they may still reference
 * `sys` for the retirement test itself or for historical examples.
 *
 * Acceptance criteria #8 and #26 ride this gate.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';

const SRC_ROOT = join(__dirname, '..', '..', '..');

/**
 * Walk `dir` and yield .ts files (excluding `__tests__/` siblings,
 * `*.d.ts`, `node_modules`, and `dist`).
 */
function* walkTsFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '__tests__') {
      continue;
    }
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      yield* walkTsFiles(full);
    } else if (
      entry.endsWith('.ts') &&
      !entry.endsWith('.d.ts') &&
      basename(entry) !== 'mml.test.ts'
    ) {
      yield full;
    }
  }
}

describe('<sys> retirement (acceptance #8, #26)', () => {
  it('no production code calls Mml.sys(', () => {
    const offenders: string[] = [];
    for (const file of walkTsFiles(SRC_ROOT)) {
      const text = readFileSync(file, 'utf8');
      if (/Mml\.sys\(/.test(text)) offenders.push(file);
    }
    expect(offenders, `Mml.sys still called by:\n${offenders.join('\n')}`).toEqual(
      [],
    );
  });

  it('no production code emits a literal <sys tag', () => {
    const offenders: string[] = [];
    for (const file of walkTsFiles(SRC_ROOT)) {
      const text = readFileSync(file, 'utf8');
      // Match both opening `<sys>` / `<sys ...>` and self-closing.
      // We don't worry about `</sys>` alone — finding it without an
      // opener would be a parse curiosity, not a regression.
      if (/<sys[\s>]/.test(text)) offenders.push(file);
    }
    expect(offenders, `<sys> tag emitted by:\n${offenders.join('\n')}`).toEqual(
      [],
    );
  });
});
