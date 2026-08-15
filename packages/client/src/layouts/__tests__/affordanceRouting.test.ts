/**
 * ⭐⭐ **Every affordance dispatches through the ONE handler the command
 * sheet intercepts.**
 *
 * The sheet's whole design is that `App.handleCommandClick` is a single
 * interception point for the entire tree, so a phone's confirm step
 * needs no `isCompact` prop threaded into every renderer. That claim is
 * only true if affordance-bearing components are actually WIRED to it —
 * and one family was not.
 *
 * The right-column panes (`InspectionPane`, `WhoPane`, `NewsTickerPane`,
 * `WikiPane`) took `onSendCommand`, the RAW send. Every call they make
 * is a click on a control — a breadcrumb, a refresh, a content row, an
 * exit — so on a phone, tapping `north` in the transcript opened a
 * sheet naming the command while tapping the identical `north` in the
 * pane six inches away sent it instantly. **Two rules on one screen is
 * worse than either rule alone**, and it is exactly the
 * unpredictability the no-exceptions sheet policy exists to prevent.
 *
 * ⚠ Found by DRIVING. Every unit and e2e assertion about the sheet
 * happened to pick a transcript or menu affordance, so the gap was
 * invisible to a fully green suite. A guard, not a fixed test, because
 * the failure mode is *a new pane wired to the wrong prop* — which is
 * one careless copy-paste away and would silently reintroduce the split.
 *
 * ⚠ `CommandBar` is deliberately NOT covered: it carries TYPED input,
 * which is not an affordance and must never be confirmed.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const layoutsDir = resolve(here, '..');

/**
 * The panes whose every dispatch is a click on a control.
 *
 * ⚠ `InspectionPane` left this list when the pane FEED replaced the
 * single focus slot: the layout no longer renders it, `PaneFeed` does.
 * Its wiring is still checked — one level down, by the second case
 * below — because "the layout stopped rendering it" is precisely the
 * kind of refactor that would otherwise drop a pane out of the guard
 * silently, which is the failure the inspected-count assertion exists
 * to catch.
 */
const AFFORDANCE_PANES = [
  'PaneFeed',
  'WhoPane',
  'NewsTickerPane',
  'WikiPane',
];

function layoutSources(): Array<{ file: string; text: string }> {
  return readdirSync(layoutsDir)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => ({ file: f, text: readFileSync(join(layoutsDir, f), 'utf8') }));
}

describe('affordance routing', () => {
  it('⭐⭐ every affordance pane is wired to onCommandClick, not the raw send', () => {
    const offenders: string[] = [];
    let inspected = 0;
    for (const { file, text } of layoutSources()) {
      for (const pane of AFFORDANCE_PANES) {
        // The JSX element and the props up to its self-closing tag.
        const re = new RegExp(`<${pane}\\b[^>]*?/>`, gFlags());
        for (const match of text.match(re) ?? []) {
          inspected++;
          if (/onSendCommand=\{onCommandClick\}/.test(match)) continue;
          offenders.push(`${file}: <${pane}> — ${match.replace(/\s+/g, ' ')}`);
        }
      }
    }
    expect(offenders).toEqual([]);
    /*
     * ⚠⚠ **A guard that matched nothing would pass identically.** The
     * scan is a regex over JSX; a refactor that renamed a pane, moved
     * the render site, or split a self-closing tag would silently
     * reduce this test to `expect([]).toEqual([])` — a verification
     * sharing the blind spot it exists to cover. So it asserts it
     * actually FOUND the render sites it claims to be checking.
     */
    expect(inspected, 'the scan matched no pane render sites').toBe(
      AFFORDANCE_PANES.length,
    );
  });

  /*
   * ⭐ The feed forwards its sink UNCHANGED to the cards inside it.
   *
   * `PaneFeed` is wired to `onCommandClick` at the layout (above), so
   * every card and every control on one inherits the sheet's
   * interception — but only if the feed passes its own prop straight
   * through rather than reaching for something else.
   *
   * ⚠ It used to also assert the hosted `InspectionPane`. The feed no
   * longer renders one: there is a single card kind now, and what the
   * player is looking at is one of those cards like anything else.
   */
  it('⭐ the pane feed forwards its sink to the cards it hosts', () => {
    const feed = readFileSync(
      resolve(layoutsDir, '..', 'components', 'panes', 'PaneFeed.tsx'),
      'utf8',
    );
    const card = /<PaneCard\b[\s\S]*?>/.exec(feed)?.[0] ?? '';
    expect(card, 'PaneFeed no longer renders PaneCard').toContain('PaneCard');
    expect(card).toContain('onSendCommand={onSendCommand}');

    const body = /<PaneBody\b[\s\S]*?\/>/.exec(feed)?.[0] ?? '';
    expect(body, 'PaneFeed no longer renders PaneBody').toContain('PaneBody');
    expect(body).toContain('onSendCommand={onSendCommand}');
  });

  /*
   * ⚠ And the raw send is still reaching the command bar — a fix that
   * routed EVERYTHING through the sheet would make typing a command
   * require confirming it, which is its own absurdity.
   */
  it('⚠ but the command bar keeps the raw send', () => {
    const world = readFileSync(join(layoutsDir, 'WorldLayout.tsx'), 'utf8');
    const bar = /<CommandBar\b[\s\S]*?\/>/.exec(world)?.[0] ?? '';
    expect(bar).toContain('onSendCommand={onSendCommand}');
  });
});

/** `g` as a value so the regex literal above stays readable. */
function gFlags(): string {
  return 'g';
}
