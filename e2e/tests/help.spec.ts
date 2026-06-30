import { test, expect } from '@playwright/test';
import { openWorldAs, sendUntil } from './helpers';

/**
 * The in-game `help` rulebook (the help subsystem's command surface). A
 * bare `help` prints the index masthead; `help <verb>` falls through to a
 * specific command topic — its name, usage line, and prose. Single-avatar,
 * scrollback-only, so immune to lounge churn.
 */

test('bare `help` prints the rulebook masthead', async ({ browser }) => {
  const { page, close } = await openWorldAs(browser, 'help-index');
  try {
    await sendUntil(
      page,
      'help',
      page.getByText(/Help — the rulebook for how the world works/i).first()
    );
    // The masthead teaches the three lookup forms.
    await expect(
      page.getByText(/help <verb>.*help api.*help search/is).first()
    ).toBeVisible();
  } finally {
    await close();
  }
});

test('`help <verb>` shows that command\'s topic', async ({ browser }) => {
  const { page, close } = await openWorldAs(browser, 'help-verb');
  try {
    // `help look` resolves to the look command topic: heading + usage.
    await sendUntil(
      page,
      'help look',
      page.getByText(/LOOK: Examine your surroundings or an object/i).first()
    );
    await expect(page.getByText(/look \[at\] \[target\]/i).first()).toBeVisible();
  } finally {
    await close();
  }
});
