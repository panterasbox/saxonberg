/**
 * The db-performance walk (review question B3): what a person can see of
 * this build is their own standing — participation keyed on THEM, not on
 * the row every player body is cloned from, and continuous across death.
 *
 * A person shows up and takes part; `standing` says so (before the build it
 * said "You have not yet shown up" to everyone, because the figure was filed
 * under the shared row). They die, act as a shade, and `standing` still
 * says so — one standing across bodies. The rest of the build (round trips,
 * the pool, the shutdown save) has no surface a browser can see; the wire
 * drive `db-performance.dirty` measures it.
 */

import { test, expect } from '@playwright/test';
import { openWorldAs, runCommand, sendUntil } from './helpers';

const START = '/world/lounge/place/bar';
const PARCEL = '/world/lounge';
const DENIED = /sandbox boundary denied|hold no authority|no targets matched/i;

test.describe('db-performance — your standing is yours, across death', () => {
  // Two scoring passes (60 s each) and a dying window.
  test.setTimeout(420_000);

  test('take part; read your standing; die; act as a shade; it is still yours', async ({ browser }) => {
    const { page, close } = await openWorldAs(browser, 'dbp-walker', {
      startLocation: START,
      wizard: true,
      committees: [PARCEL],
    });
    try {
      await sendUntil(page, 'look', page.getByText(/bar/i).first());
      await runCommand(page, 'say good evening, all');
      await runCommand(page, 'say anyone for a drink');
      // The participation pass runs every minute; the standing reads it.
      await expect(async () => {
        await runCommand(page, 'standing');
        await expect(page.getByText(/You show up and take part/).last()).toBeVisible({ timeout: 3_000 });
      }).toPass({ timeout: 150_000, intervals: [10_000] });

      // Die — the body's own method through the eval receiver
      // (mortality.spec.ts); the scheduler performs the death.
      await runCommand(page, `eval --parcel ${PARCEL} this.beginDying("exsanguination", 1)`);
      await expect(page.getByText(DENIED)).toHaveCount(0);
      await expect(async () => {
        await runCommand(page, 'get all');
        await expect(page.getByText(/passes through/i).first()).toBeVisible({ timeout: 3_000 });
      }).toPass({ timeout: 90_000 });

      // As a shade: take part, and the standing is the same person's.
      await sendUntil(page, 'say still here', page.getByText(/still here/i).first());
      const before = await page.getByText(/You show up and take part/).count();
      await expect(async () => {
        await runCommand(page, 'standing');
        expect(await page.getByText(/You show up and take part/).count()).toBeGreaterThan(before);
      }).toPass({ timeout: 30_000 });
      // (Not "no 'not yet shown up' anywhere": the polls before the first
      // scoring pass said so, truly, and the scrollback keeps them.)
    } finally {
      await close();
    }
  });
});
