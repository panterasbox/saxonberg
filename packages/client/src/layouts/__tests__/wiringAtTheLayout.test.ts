/**
 * ⚠⚠ **Subscription wiring lives ABOVE the mode registry, never at a
 * form-factor-specific component and never at one layout.**
 *
 * This has been the same defect three times:
 *
 *  1. `useCardFeed()` hung off `CardFeed` — the DESKTOP right column —
 *     so on a phone nothing registered the envelope handlers. The whole
 *     mobile card surface was dead.
 *  2. Fixed, and then `useInspectionSubscriptions()` was put in exactly
 *     the same place. That one was the attention signal every card was
 *     minted from, so a phone never opened a card at all — the feed was
 *     not broken, it was never fed.
 *  3. Fixed by moving both to `WorldLayout`, which renders at both form
 *     factors — and is still only ONE of five layouts. `build`, `chat`
 *     and `watch` are different components entirely, and Wave 7 puts
 *     the authoring cards in `build`.
 *
 * ⭐ So the wiring is in **`App`**, above the mode registry: the one
 * place that renders for every mode at every width. There is no fourth
 * position.
 *
 * Every time, every unit test passed: they render a card from a
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

/** Hooks that register envelope handlers or open subscriptions. */
const WIRING_HOOKS = ['useCardFeed'];

/**
 * Components that render at ONE form factor, or in ONE mode. Wiring
 * called from any of these is dead everywhere else.
 */
const FORM_FACTOR_SPECIFIC = [
  'components/cards/CardFeed.tsx',
  'components/cards/MobilePlaySurface.tsx',
  'layouts/WorldLayout.tsx',
  'layouts/BuilderLayout.tsx',
  'layouts/ForumLayout.tsx',
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

/**
 * Wave 6's surfaces and the hook each one needs alive, keyed by the
 * layout that must call it.
 *
 * ⭐ The pattern generalises: a surface is dead unless something that
 * actually renders calls its subscription. `SubjectRail` opens the
 * `subjects` scope in its own `useSubjectRail`, so the guard is that the
 * rail is REACHED — asserted by the shell rendering it and the layout
 * rendering the shell.
 */
const SURFACE_MOUNTS: Array<{ file: string; renders: string }> = [
  // The forum app is nothing without its rail: the rail holds the
  // `subjects` subscription, so a shell that stopped rendering it would
  // leave the header describing a subject nobody could pick.
  { file: 'components/social/SubjectShell.tsx', renders: 'SubjectRail' },
  { file: 'layouts/ForumLayout.tsx', renders: 'SubjectShell' },
  // The tuned rail reads `cockpit.tuned`; if the cards stop rendering
  // it, the livestream side loses its only view of what it follows.
  { file: 'layouts/LivestreamPanels.tsx', renders: 'TunedRail' },
  // The right column IS the card feed now — the switcher is gone, so
  // a layout that stopped rendering it would leave a player with no
  // cards at all and no tab to notice were missing.
  { file: 'layouts/WorldLayout.tsx', renders: 'CardFeed' },
  // The reaction picker and its touch sheet both hang off the
  // transcript, which is the one component both form factors share.
  { file: 'components/Terminal.tsx', renders: 'EmoteSheet' },
  { file: 'components/ReactionBar.tsx', renders: 'EmotePicker' },
];

describe('⭐ every social surface is actually mounted', () => {
  it.each(SURFACE_MOUNTS)('$file renders <$renders>', ({ file, renders }) => {
    /*
     * ⚠ A component test would pass over any of these while the thing
     * was unreachable in the running app — which is exactly how the
     * mobile card surface shipped dead with every mobile test green.
     */
    const text = readFileSync(resolve(src, file), 'utf8');
    const code = text
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(new RegExp(`<${renders}[\\s/>]`).test(code)).toBe(true);
  });
});

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

  it('⭐ is called from App, which renders above the mode registry', () => {
    /*
     * ⚠⚠ The half that stops this being a guard that passes by
     * matching nothing. "Not called in the wrong place" is satisfied
     * just as well by "not called anywhere", which is the actual bug.
     */
    const app = readFileSync(resolve(src, 'App.tsx'), 'utf8');
    for (const hook of WIRING_HOOKS) {
      expect(callsHook(app, hook), `App does not call ${hook}()`).toBe(true);
    }
  });
});
