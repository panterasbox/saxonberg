/**
 * Owned boot — the runner stands up its own world on **2012**.
 *
 * ⚠⚠ **The port is the whole safety argument.** The server package's
 * `dev` script begins with `dev-preflight.mjs 2010 server`, whose job is
 * to KILL any Saxonberg dev process holding that port. Playwright's
 * `webServer` pointed at 2010 and learned what that means: whenever its
 * reuse probe missed, it started its own server, the preflight
 * terminated the operator's running world mid-drive, and every command
 * afterwards landed on a booting server and silently returned nothing
 * (`e2e/playwright.drive.config.ts`'s header is the write-up).
 *
 * Here the preflight is safe **because the port is wire's own**: 2010 is
 * the dev server, 2011 is the platform e2e config, 2012 is this. The
 * only process it can ever reap is a stale wire server.
 *
 * ⚠ **It does NOT get a database of its own.** One database per
 * worktree is the standing policy (a feature-scoped database is how you
 * reach the 500-collection cap), so owned boot uses whatever
 * `packages/server/.env` names — the same world your dev server would
 * use. Two servers on one database is not a supported arrangement, so
 * owned boot is an ALTERNATIVE to a dev server, not a companion; it says
 * so out loud when it starts. In CI the question does not arise: the
 * job's mongo service is a throwaway container.
 */

import { spawn, type ChildProcess } from 'child_process';
import { createWriteStream, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..', '..');
const SERVER_DIR = join(REPO_ROOT, 'packages', 'server');

/** Wire's own port. 2010 = dev, 2011 = platform e2e, 2012 = here. */
export const WIRE_PORT = Number(process.env.WIRE_PORT ?? 2012);

/** Where the booted server's stdout lands; the pack check reads it. */
export const WIRE_LOG = join(REPO_ROOT, 'packages', 'wire', '.wire', 'server.log');

let child: ChildProcess | null = null;

/**
 * The environment the spawned server gets — inherited, then SCRUBBED.
 *
 * ⚠⚠ **`VITEST` must not reach it, and this cost a boot to learn.**
 * `packages/server/src/preload.js` registers the call-security loader
 * hook only `if (!process.env.VITEST)`, because under Vitest the
 * security transform arrives through `callSecPlugin` instead. This
 * runner *is* a vitest process, so an inherited environment tells the
 * server it is under test, the loader never registers, no module gets a
 * provenance stamp — and the boot dies on the first `FromModule` policy
 * with `SecurityError: Policy AnyOf(FromModule(...)) denied
 * _registerMergeOnArrivalHook()`. Which reads like a call-security bug
 * and is a leaked environment variable.
 *
 * `NODE_OPTIONS` goes too: a debugger's `--require` bootloader rides in
 * it and has no business in a test world.
 */
function serverEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key === 'VITEST' || key.startsWith('VITEST_')) delete env[key];
  }
  delete env.NODE_OPTIONS;
  env.AUTH_MODE = 'test';
  env.PORT = String(WIRE_PORT);
  // The founder handle resolves through the SHIPPED deploy contract —
  // `OfficeRegistry` reads it at boot exactly as production does.
  env.FOUNDER_GOOGLE_EMAIL = env.FOUNDER_GOOGLE_EMAIL ?? 'founder@e2e.local';
  return env;
}

async function answering(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/healthz`, {
      signal: AbortSignal.timeout(3_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Boot a world on {@link WIRE_PORT} and resolve when it answers.
 *
 * The 240s budget is the platform e2e config's, and it is not generous:
 * a cold boot against a freshly dropped database measured 245–251s
 * (docs/testing.md § The boot cost), so CI — which always boots cold —
 * needs the larger budget below.
 */
export async function bootOwnedWorld(): Promise<string> {
  const url = `http://localhost:${WIRE_PORT}`;
  mkdirSync(dirname(WIRE_LOG), { recursive: true });

  // Reap a stale wire server on our own port. Never touches 2010/2011.
  await new Promise<void>((done) => {
    const pre = spawn(
      'node',
      [join(SERVER_DIR, 'scripts', 'dev-preflight.mjs'), String(WIRE_PORT), 'server'],
      { cwd: SERVER_DIR, stdio: 'ignore' }
    );
    pre.on('exit', () => done());
    pre.on('error', () => done());
  });

  const log = createWriteStream(WIRE_LOG, { flags: 'w' });
  child = spawn('pnpm', ['exec', 'tsx', 'src/preload.js'], {
    cwd: SERVER_DIR,
    env: serverEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.pipe(log);
  child.stderr?.pipe(log);
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`wire: the owned server exited with code ${code}`);
    }
  });

  // The pack check reads the installer's own boot lines out of this log,
  // which is the one place a TRUE reading of the installed packs exists.
  process.env.WIRE_SERVER_LOG = WIRE_LOG;

  const budget = Number(process.env.WIRE_BOOT_TIMEOUT ?? 420_000);
  const deadline = Date.now() + budget;
  for (;;) {
    if (await answering(url)) return url;
    if (child.exitCode !== null) {
      throw new Error(
        `wire: the owned server died during boot (code ${child.exitCode}). ` +
          `Its log is ${WIRE_LOG}`
      );
    }
    if (Date.now() > deadline) {
      throw new Error(
        `wire: the owned server did not answer on ${url} within ` +
          `${Math.round(budget / 1000)}s. Its log is ${WIRE_LOG}`
      );
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
}

/** Stop the world this runner started. A no-op if it started none. */
export async function stopOwnedWorld(): Promise<void> {
  if (!child || child.exitCode !== null) return;
  const dying = child;
  child = null;
  dying.kill('SIGTERM');
  await new Promise<void>((done) => {
    const hard = setTimeout(() => {
      dying.kill('SIGKILL');
      done();
    }, 15_000);
    dying.on('exit', () => {
      clearTimeout(hard);
      done();
    });
  });
}
