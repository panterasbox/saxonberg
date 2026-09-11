/**
 * The run's front door: find a world, or say exactly how to get one.
 *
 * ⚠⚠ **Attach mode never spawns and never kills.** The server package's
 * `dev` script begins with `dev-preflight.mjs 2010 server`, whose job is
 * to KILL any Saxonberg dev process holding that port. Playwright's
 * `webServer` learned this the hard way: whenever its reuse probe
 * missed, it started its own server, the preflight terminated the
 * operator's running world mid-drive, and every command afterwards
 * landed on a booting server and silently returned nothing —
 * `e2e/playwright.drive.config.ts`'s header is the write-up. So the
 * default here probes, and on a miss it STOPS with instructions.
 *
 * Owned mode (`WIRE_BOOT=1`, and always in CI) is the other half: it
 * boots on **2012** — its own port, where the same preflight is safe
 * because the only thing it can ever reap is a stale wire server. See
 * `boot.ts`, which carries that argument in full.
 */

import { rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { readRunReport } from '../harness/registry';
import { bootOwnedWorld, stopOwnedWorld, WIRE_PORT } from './boot';

const REPORT = join(tmpdir(), `saxonberg-wire-run-${process.pid}.json`);

/** Is a world answering the test-auth seam at this URL? */
async function probe(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/healthz`, {
      signal: AbortSignal.timeout(4_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** CI always owns its world; locally it is opt-in. */
const ownsTheWorld = (): boolean =>
  process.env.WIRE_BOOT === '1' || process.env.CI === 'true';

export async function setup(): Promise<void> {
  process.env.WIRE_RUN_REPORT = REPORT;
  rmSync(REPORT, { force: true });

  if (ownsTheWorld()) {
    console.log(
      `\nwire: booting a world of my own on ${WIRE_PORT}.\n` +
        `  ⚠ It uses the database packages/server/.env names — one\n` +
        `    database per worktree, so this is an ALTERNATIVE to your dev\n` +
        `    server, not a companion. Stop the one on 2010 first.\n`
    );
    const started = Date.now();
    process.env.WIRE_SERVER_URL = await bootOwnedWorld();
    console.log(
      `wire: world up in ${((Date.now() - started) / 1000).toFixed(1)}s\n`
    );
    return;
  }

  const url = process.env.WIRE_SERVER_URL ?? 'http://localhost:2010';
  process.env.WIRE_SERVER_URL = url;

  if (!(await probe(url))) {
    throw new Error(
      `\nwire: no world is answering at ${url}.\n\n` +
        `  The wire suite drives a RUNNING game — it does not boot one\n` +
        `  in attach mode, and it will never kill a server it did not\n` +
        `  start (see this file's header).\n\n` +
        `  Either:\n` +
        `    pnpm dev:server            # stand one up on 2010, then re-run\n` +
        `    WIRE_BOOT=1 pnpm wire      # let the suite own a world on 2012\n` +
        `    WIRE_SERVER_URL=http://localhost:PORT pnpm wire\n`
    );
  }
  console.log(`\nwire: attached to the world at ${url}\n`);
}

export async function teardown(): Promise<void> {
  await stopOwnedWorld();
  const files = readRunReport(REPORT);
  rmSync(REPORT, { force: true });
  if (files.length === 0) return;

  const prose = files.filter((f) => f.proseReads > 0);
  const dirty = files.filter((f) => f.dirtyReason);

  console.log('\n─── wire run report ───────────────────────────────────');

  /*
   * ⭐ The prose census (plan D1). Prose is the residue channel: a fact
   * whose only observable is a rendered line, because no
   * `subscribableFields` descriptor reaches it. Counting it is what
   * keeps the residue visible instead of letting regexes pile up
   * quietly. It is a MEASUREMENT, not a failure — no ceiling is
   * enforced in this build.
   */
  const total = files.reduce((n, f) => n + f.proseReads, 0);
  console.log(`prose reads: ${total} across ${files.length} file(s)`);
  for (const f of prose) {
    console.log(`  ${f.proseReads.toString().padStart(3)}  ${f.file}`);
  }

  /*
   * ⭐⭐ The dirty list is the PRODUCT, not a warning. A file that
   * cannot run twice is a world that does not restock: the cookhouse
   * ships one cut of meat and never produces another. Each line below
   * is a question for the trade that owns it, and most should turn out
   * to be a producer that should be producing.
   */
  if (dirty.length > 0) {
    console.log(
      `\ncontent findings — ${dirty.length} file(s) cannot run twice:`
    );
    for (const f of dirty) {
      console.log(`  ${f.file}\n      ${f.dirtyReason}`);
    }
    console.log(
      `\n  A reset is owed before the next full run:\n` +
        `    pnpm --filter @saxonberg/server reset:db && pnpm dev:server\n` +
        `  ('pnpm wire:clean' skips these and needs no reset.)`
    );
  }
  console.log('───────────────────────────────────────────────────────\n');
}
