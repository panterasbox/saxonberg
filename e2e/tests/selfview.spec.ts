import { test, expect } from '@playwright/test';
import { openWorldAs, sendUntil } from './helpers';

/**
 * The character self-view verbs — the read surfaces over the standing /
 * chronicle / trait substrates. A fresh avatar has done nothing yet, so
 * every readout renders its empty-but-well-formed baseline. These are
 * single-avatar self-views (no co-location, no room navigation), so they
 * are immune to lounge-population churn.
 *
 * We assert on each verb's stable section heading / baseline copy, not on
 * any number — the bands are deliberately wordy ("dormant", "not yet
 * shown up") and the framework never surfaces a raw score.
 */

test('`score` summarizes the three influence stocks at their baseline', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'view-score');
  try {
    await sendUntil(
      page,
      'score',
      page.getByText(/Play:.*Make:.*Renown:/i).first()
    );
  } finally {
    await close();
  }
});

test('`standing` reports the never-shown-up baseline for a fresh avatar', async ({
  browser,
}) => {
  const { page, close } = await openWorldAs(browser, 'view-standing');
  try {
    await sendUntil(
      page,
      'standing',
      page.getByText(/have not yet shown up/i).first()
    );
  } finally {
    await close();
  }
});

test('`chronicle` renders the identity ledger view', async ({ browser }) => {
  const { page, close } = await openWorldAs(browser, 'view-chronicle');
  try {
    // The chronicle self-view partitions into bio / prologue / deeds; the
    // "Deeds" heading is always present.
    await sendUntil(page, 'chronicle', page.getByText(/\bDeeds\b/).first());
  } finally {
    await close();
  }
});

test('`traits` renders the personality view', async ({ browser }) => {
  const { page, close } = await openWorldAs(browser, 'view-traits');
  try {
    await sendUntil(page, 'traits', page.getByText(/\bTraits\b/).first());
  } finally {
    await close();
  }
});
