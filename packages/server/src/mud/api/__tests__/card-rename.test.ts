/**
 * ⭐ **No `pane` identifier survives in code** (AC 18).
 *
 * The rename is ~2,000 occurrences across three packages, and the way a
 * rename half-lands is that one straggler is left, reads as
 * intentional, and grows a second vocabulary around itself. So it is a
 * guard, not a one-time sweep.
 *
 * ⚠ **Comments are stripped first, deliberately.** The criterion admits
 * comments *quoting history* — and they are the valuable part of it:
 * `CardBodies` records what `WhoPane` / `NewsTickerPane` / `WikiPane`
 * were and what was salvaged from them, `CardRegistry` cites
 * `inspection-pane.md`'s superseded argument by name. A guard that
 * matched prose would fail on the very comments recording the rename.
 *
 * ⚠⚠ **`panel` is never a violation.** The summoned-overlay tier —
 * `SettingsPanel`, `SocialNotificationsPanel`, `LivestreamPanels`,
 * `CmsDiagnosticsPanel`, `summonedPanel` — is not the card tier: those
 * dock beside the layout and close when you close them, with no
 * identity, no lifetime and no pin. Sweeping them into `*Card` would
 * have been a lie about what they are, so every pattern here excludes a
 * following lowercase letter.
 */

import '../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGES = join(HERE, '..', '..', '..', '..', '..');

const ROOTS = [
  join(PACKAGES, 'server', 'src'),
  join(PACKAGES, 'client', 'src'),
  join(PACKAGES, 'types', 'src'),
];

function sourceFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules' || entry === 'dist') continue;
        walk(full);
        continue;
      }
      if (/\.(ts|tsx)$/.test(entry)) out.push(full);
    }
  };
  walk(root);
  return out;
}

/** Block comments, line comments and string literals removed. */
function codeOnly(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

/**
 * `Pane` / `pane` / `PANE` as an identifier fragment, never `Panel`.
 * Every alternative excludes a following lowercase letter, which is
 * what makes `panel` structurally unmatchable rather than exempted.
 */
const PANE = /(?:\bPANE|Panes?(?![a-z])|\bpanes?(?![a-z]))/;

describe('the pane → card rename', () => {
  it('⭐ leaves no `pane` identifier in code, in any of the three packages', () => {
    const offenders: string[] = [];
    let scanned = 0;
    for (const root of ROOTS) {
      for (const file of sourceFiles(root)) {
        // This guard quotes the old names to explain itself.
        if (file.endsWith('card-rename.test.ts')) continue;
        scanned++;
        const code = codeOnly(readFileSync(file, 'utf8'));
        for (const [i, line] of code.split('\n').entries()) {
          if (PANE.test(line)) {
            offenders.push(`${relative(PACKAGES, file)}:${i + 1}: ${line.trim()}`);
          }
        }
      }
    }
    /*
     * ⚠ A guard that scanned nothing would pass identically — the same
     * failure the affordance-routing scan records. Assert it found the
     * tree.
     */
    expect(scanned, 'the scan found no source files').toBeGreaterThan(900);
    expect(offenders).toEqual([]);
  });

  it('⚠⚠ and does NOT touch `panel` — the summoned-overlay tier', () => {
    const clientSrc = join(PACKAGES, 'client', 'src');
    const names = [
      'SettingsPanel',
      'SocialNotificationsPanel',
      'LivestreamPanels',
      'CmsDiagnosticsPanel',
      'summonedPanel',
    ];
    const all = sourceFiles(clientSrc)
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    for (const name of names) {
      expect(all.includes(name), `${name} must survive the rename`).toBe(true);
      // …and its card-shaped twin must NOT exist.
      const wrong = name.replace(/Panels?$/, 'Card').replace(/Panel$/, 'Card');
      expect(
        new RegExp(`\\b${wrong}\\b`).test(all),
        `${wrong} would be a lie — a panel is not a card`,
      ).toBe(false);
    }
  });
});
