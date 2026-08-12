import { test, expect } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * > AC: *theme switching is verified by **driving a browser** — all
 * > three themes, chrome and transcript — not by the suite alone.
 * > Controller tests skip the binder, so `cockpit style theme` is
 * > exercised as a typed command against a running server.*
 *
 * ⭐ This spec exists because the unit suite **structurally cannot**
 * check the thing that matters. jsdom does not substitute `var()`:
 * `getComputedStyle(el).color` on a `var(--sx-fg)` element returns the
 * literal string, so every jsdom assertion about a themed colour is an
 * assertion about a reference, not a colour. A real browser resolves the
 * custom property, so this is the only place the cascade is observed
 * end to end — server verb → overlay → push → store → `useGround` →
 * `:root` → a painted pixel.
 *
 * It also covers the other half of the criterion: `cockpit style theme`
 * as a **typed command against a running server**. The controller tests
 * call `execute()` directly and skip the command binder entirely, so
 * they cannot catch a YAML view whose slots don't match the controller.
 */

/** Each theme's `--sx-ground`, as its module declares it. */
const GROUNDS = {
  ink: '#071224',
  marble: '#eceae4',
  'high-contrast': '#000000',
} as const;

/** Each theme's `--sx-fg`, resolved to the rgb() a browser reports. */
const FOREGROUNDS = {
  ink: 'rgb(242, 245, 250)',
  marble: 'rgb(11, 24, 48)',
  'high-contrast': 'rgb(255, 255, 255)',
} as const;

function customProperty(page: import('@playwright/test').Page, name: string) {
  return page.evaluate(
    (prop) =>
      getComputedStyle(document.documentElement)
        .getPropertyValue(prop)
        .trim(),
    name,
  );
}

test('all three themes repaint chrome and transcript, with no reconnect', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'theme');
  try {
    const transcript = page.getByTestId('terminal');
    await expect(transcript).toBeVisible({ timeout: 20_000 });

    for (const name of ['ink', 'marble', 'high-contrast'] as const) {
      await runCommand(page, `cockpit style theme ${name}`);

      // 1. Chrome repainted — the custom property really landed on
      //    :root, resolved by a real cascade rather than a jsdom stub.
      await expect
        .poll(() => customProperty(page, '--sx-ground'), {
          timeout: 10_000,
          message: `--sx-ground did not become ${name}'s value`,
        })
        .toBe(GROUNDS[name]);

      // 2. Every role is present, not just the one we asked about. A
      //    partial apply would leave the page half-repainted and mostly
      //    look fine.
      const missing = await page.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        const names = Array.from(document.documentElement.style).filter(
          (n) => n.startsWith('--sx-'),
        );
        return names.filter((n) => !style.getPropertyValue(n).trim());
      });
      expect(missing, `${name}: empty custom properties`).toEqual([]);

      // 3. Transcript repainted through the SAME theme object. This is
      //    the divergence check: chrome and transcript resolve their
      //    theme through one `pickTheme`, so a body row's colour must
      //    track the ground.
      await expect(transcript).toHaveCSS('color', FOREGROUNDS[name]);
    }

    // 4. No reconnect anywhere in the sequence — a theme swap is an
    //    overlay push, not a session event.
    await expect(page.getByText(/reconnect/i)).toHaveCount(0);
  } finally {
    await close();
  }
});

test('high-contrast: no chrome control is unreadable against its own field', async ({
  browser,
}) => {
  // ⭐ This assertion is here because the drive found a live defect the
  // whole unit suite could not: NOTHING set a root `color`, so every
  // `color: inherit` in the tree resolved to the browser default BLACK.
  // The right-rail pane tabs measured 1.21:1 in high-contrast — the
  // theme whose entire purpose is legibility — and 1.6:1 in Ink.
  //
  // `contrast.test.ts` could never have caught it: it checks the values
  // a theme DECLARES, and this was about a value no theme declared at
  // all. Only a real cascade over real DOM can see an inherited default.
  //
  // Scoped to high-contrast because that is the theme with a stated
  // legibility contract, and to short-labelled controls because chrome
  // is what this build owns — world prose carries author colour.
  const { page, close } = await openWorldAs(browser, 'theme-contrast');
  try {
    await runCommand(page, 'cockpit style theme high-contrast');
    await expect
      .poll(() => customProperty(page, '--sx-ground'), { timeout: 10_000 })
      .toBe(GROUNDS['high-contrast']);

    const failures = await page.evaluate(() => {
      const lum = (c: string) => {
        const [r, g, b] = c
          .match(/\d+/g)!
          .slice(0, 3)
          .map(Number)
          .map((v) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          });
        return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
      };
      const effectiveBg = (el: Element): string => {
        let n: Element | null = el;
        while (n) {
          const bg = getComputedStyle(n).backgroundColor;
          if (bg && bg !== 'rgba(0, 0, 0, 0)') return bg;
          n = n.parentElement;
        }
        return 'rgb(0, 0, 0)';
      };
      const out: Array<{ label: string; ratio: number }> = [];
      for (const el of document.querySelectorAll('button, a[href]')) {
        const label = (el.textContent ?? '').trim();
        if (!label || label.length > 24) continue;
        if (!(el as HTMLElement).offsetParent) continue;
        const fg = getComputedStyle(el).color;
        const la = lum(fg);
        const lb = lum(effectiveBg(el));
        const ratio =
          (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
        if (ratio < 4.5) out.push({ label, ratio: Number(ratio.toFixed(2)) });
      }
      return out;
    });

    expect(
      failures,
      'high-contrast controls below 4.5:1 against their own field',
    ).toEqual([]);
  } finally {
    await close();
  }
});

test('`cockpit style theme default` refuses, naming the three known themes', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'theme-refuse');
  try {
    await runCommand(page, 'cockpit style theme marble');
    await expect
      .poll(() => customProperty(page, '--sx-ground'), { timeout: 10_000 })
      .toBe(GROUNDS.marble);

    await runCommand(page, 'cockpit style theme default');

    // The refusal reaches the player in the machine voice and says what
    // WOULD have worked — "commands refuse honestly" is a convention,
    // and a refusal that names no alternative is a dead end.
    const refusal = page.getByText(/unknown theme/i).last();
    await expect(refusal).toBeVisible({ timeout: 10_000 });
    await expect(refusal).toContainText('ink');
    await expect(refusal).toContainText('marble');
    await expect(refusal).toContainText('high-contrast');

    // ⭐ And the ground did NOT move. A refusal that still mutated the
    // overlay would be the worst of both — the word rejected, the effect
    // applied.
    expect(await customProperty(page, '--sx-ground')).toBe(GROUNDS.marble);
  } finally {
    await close();
  }
});
