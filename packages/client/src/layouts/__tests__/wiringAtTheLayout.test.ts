/**
 * ⚠⚠ **Subscription wiring lives at the LAYOUT, never at a
 * form-factor-specific component.**
 *
 * This has been the same defect twice in one build:
 *
 *  1. `usePaneFeed()` hung off `PaneFeed` — the DESKTOP right column —
 *     so on a phone nothing opened the `place` subscription and nothing
 *     registered the envelope handlers. The whole mobile pane surface
 *     was dead.
 *  2. Fixed, and then `useInspectionSubscriptions()` was put in exactly
 *     the same place. That one is the ATTENTION SIGNAL every card is
 *     minted from, so a phone never opened a card at all — the feed was
 *     not broken, it was never fed.
 *
 * Both times every unit test passed: they render a card from a
 * hand-built state object and never touch the wiring. **A component
 * test proves rendering, never wiring.** So this is a guard over the
 * source, which is the only thing that can see it.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '..', '..');

/** Hooks that open subscriptions or register envelope handlers. */
const WIRING_HOOKS = ['usePaneFeed', 'useInspectionSubscriptions'];

/**
 * Components that render at ONE form factor only. Wiring called from
 * any of these is dead on the other.
 */
const FORM_FACTOR_SPECIFIC = [
  'components/panes/PaneFeed.tsx',
  'components/panes/MobilePlaySurface.tsx',
];

/**
 * A real CALL — not an import, and not a mention in a comment.
 *
 * ⚠ Comments are stripped first. The file this guard exists to police
 * carries a doc block explaining why it does NOT call the hook, and a
 * scan that matched prose would fail on the very comment recording the
 * fix.
 */
function callsHook(text: string, hook: string): boolean {
  const code = text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/^import[\s\S]*?from\s+["'][^"']+["'];$/gm, '');
  return new RegExp(`(^|[^.\\w])${hook}\\s*\\(`, 'm').test(code);
}

describe('⚠⚠ subscription wiring', () => {
  it('is never called from a form-factor-specific component', () => {
    const offenders: string[] = [];
    for (const file of FORM_FACTOR_SPECIFIC) {
      const text = readFileSync(resolve(src, file), 'utf8');
      for (const hook of WIRING_HOOKS) {
        if (callsHook(text, hook)) offenders.push(`${file} calls ${hook}()`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('⭐ is called from the layout, which renders at both', () => {
    /*
     * ⚠⚠ The half that stops this being a guard that passes by
     * matching nothing. "Not called in the wrong place" is satisfied
     * just as well by "not called anywhere", which is the actual bug.
     */
    const layout = readFileSync(
      resolve(src, 'layouts', 'WorldLayout.tsx'),
      'utf8',
    );
    for (const hook of WIRING_HOOKS) {
      expect(callsHook(layout, hook), `WorldLayout does not call ${hook}()`).toBe(
        true,
      );
    }
  });
});
