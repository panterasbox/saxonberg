import { test, expect } from '@playwright/test';
import { openWorldAs, runCommand, commandInput } from './helpers';

/**
 * Cockpit command-bar behaviors that live entirely in the client (the
 * Zustand store + CommandBar), independent of any server round-trip:
 * the input clears on submit and ArrowUp/ArrowDown walk command history.
 */

test('the input clears after submitting a command', async ({ browser }) => {
  const { page, close } = await openWorldAs(browser, 'cockpit-clear');
  try {
    const input = commandInput(page);
    await runCommand(page, 'look');
    await expect(input).toHaveValue('');
  } finally {
    await close();
  }
});

test('ArrowUp recalls the previous command, ArrowDown clears it', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'cockpit-history');
  try {
    const input = commandInput(page);
    // Two submissions so history has order to walk.
    await runCommand(page, 'look');
    await runCommand(page, 'smile');
    await expect(input).toHaveValue('');

    await input.click();
    // Most-recent-first: first ArrowUp recalls `smile`, the next `look`.
    await input.press('ArrowUp');
    await expect(input).toHaveValue('smile');
    await input.press('ArrowUp');
    await expect(input).toHaveValue('look');

    // ArrowDown walks back toward the present and lands on empty.
    await input.press('ArrowDown');
    await expect(input).toHaveValue('smile');
    await input.press('ArrowDown');
    await expect(input).toHaveValue('');
  } finally {
    await close();
  }
});
