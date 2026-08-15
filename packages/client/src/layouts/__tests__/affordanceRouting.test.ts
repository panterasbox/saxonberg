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
 * The right column's four hand-written pane surfaces took
 * `onSendCommand`, the RAW send. Every call they made was a click on a
 * control — a breadcrumb, a refresh, a content row, an exit — so on a
 * phone, tapping `north` in the transcript opened a sheet naming the
 * command while tapping the identical `north` in the pane six inches
 * away sent it instantly. **Two rules on one screen is worse than
 * either rule alone**, and it is exactly the unpredictability the
 * no-exceptions sheet policy exists to prevent.
 *
 * ⭐ Those four are now ONE: the right column renders `CardFeed` and
 * nothing else, and every card body inside it inherits the feed's sink.
 * That is a smaller surface for this guard to cover, not a reason to
 * retire it — the failure mode is *a new render site wired to the wrong
 * prop*, which is one careless copy-paste away.
 *
 * ⚠ Found by DRIVING. Every unit and e2e assertion about the sheet
 * happened to pick a transcript or menu affordance, so the gap was
 * invisible to a fully green suite. A guard, not a fixed test, because
 * the failure mode is *a new card wired to the wrong prop* — which is
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
 * The card surfaces a layout renders, whose every dispatch is a click
 * on a control.
 *
 * ⚠ `WhoCard`, `NewsTickerCard` and `WikiCard` left this list when the
 * switcher died: they are catalogue rows in the feed now, and their
 * bodies inherit `CardFeed`'s sink (checked one level down, by the
 * second case below). `InlineCard` is the phone's inline renderer and
 * is checked for the same reason it exists — it is a second render site
 * for the same cards.
 */
const AFFORDANCE_CARDS = ['CardFeed', 'InlineCard'];

function layoutSources(): Array<{ file: string; text: string }> {
  return readdirSync(layoutsDir)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => ({ file: f, text: readFileSync(join(layoutsDir, f), 'utf8') }));
}

describe('affordance routing', () => {
  it('⭐⭐ every affordance card is wired to onCommandClick, not the raw send', () => {
    const offenders: string[] = [];
    let inspected = 0;
    for (const { file, text } of layoutSources()) {
      for (const card of AFFORDANCE_CARDS) {
        // The JSX element and the props up to its self-closing tag.
        const re = new RegExp(`<${card}\\b[^>]*?/>`, gFlags());
        for (const match of text.match(re) ?? []) {
          inspected++;
          if (/onSendCommand=\{onCommandClick\}/.test(match)) continue;
          offenders.push(`${file}: <${card}> — ${match.replace(/\s+/g, ' ')}`);
        }
      }
    }
    expect(offenders).toEqual([]);
    /*
     * ⚠⚠ **A guard that matched nothing would pass identically.** The
     * scan is a regex over JSX; a refactor that renamed a card, moved
     * the render site, or split a self-closing tag would silently
     * reduce this test to `expect([]).toEqual([])` — a verification
     * sharing the blind spot it exists to cover. So it asserts it
     * actually FOUND the render sites it claims to be checking.
     */
    expect(inspected, 'the scan matched no card render sites').toBe(
      AFFORDANCE_CARDS.length,
    );
  });

  /*
   * ⭐ The feed forwards its sink UNCHANGED to the cards inside it.
   *
   * `CardFeed` is wired to `onCommandClick` at the layout (above), so
   * every card and every control on one inherits the sheet's
   * interception — but only if the feed passes its own prop straight
   * through rather than reaching for something else.
   *
   * ⚠ It used to also assert the hosted `InspectionCard`. The feed no
   * longer renders one: there is a single card kind now, and what the
   * player is looking at is one of those cards like anything else.
   */
  it('⭐ the card feed forwards its sink to the cards it hosts', () => {
    const feed = readFileSync(
      resolve(layoutsDir, '..', 'components', 'cards', 'CardFeed.tsx'),
      'utf8',
    );
    const card = /<Card\b[\s\S]*?>/.exec(feed)?.[0] ?? '';
    expect(card, 'CardFeed no longer renders Card').toContain('Card');
    expect(card).toContain('onSendCommand={onSendCommand}');

    const body = /<CardBody\b[\s\S]*?\/>/.exec(feed)?.[0] ?? '';
    expect(body, 'CardFeed no longer renders CardBody').toContain('CardBody');
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
