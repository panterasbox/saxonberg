/**
 * check-drive-scripts — a drive is BORN a wire file.
 *
 * A build's exit criterion is the DRIVE: run the requirements doc's
 * script against the running game before the MR opens. For nine builds
 * that script was a one-off `scripts/drive-<feature>.ts` — written,
 * run once, and then left where nothing would ever run it again. Five
 * of them accumulated (1,854 lines), each carrying its own copy of the
 * same login / socket / roster / command-pump code, and every one of
 * them was dead the day after its MR merged.
 *
 * The wire suite (`packages/wire`) is where a drive lives now: the same
 * flow, the same seam, a shared harness, and a CI job that runs it on
 * every MR. So the drive is not *graduated* into the suite afterwards —
 * it is written there in the first place, and this gate is what makes
 * that mechanical rather than a thing the skills merely ask for.
 *
 * ⭐ A ratchet at zero, not a census: the five that existed were ported
 * in the same build that added this, so there is no backlog to burn
 * down and the ceiling starts where it ends. (See docs/lint-family.md
 * § census-then-ratchet for the pattern when a backlog does exist.)
 *
 * Self-enrolls: `lint:family` derives its roster from package.json.
 */

import { readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const EXIT_ON_FINDINGS = true; // CI-gating

const SCRIPTS_DIR = fileURLToPath(new URL('.', import.meta.url));

const offenders = existsSync(SCRIPTS_DIR)
  ? readdirSync(SCRIPTS_DIR)
      .filter((f) => /^drive-.*\.ts$/.test(f))
      .sort()
  : [];

if (offenders.length === 0) {
  console.log('check-drive-scripts: 0 drive scripts (ceiling 0) ✔');
  process.exit(0);
}

console.error(
  `check-drive-scripts: ${offenders.length} drive script(s) in ` +
    `packages/server/scripts/ — the ceiling is 0.\n`
);
for (const f of offenders) console.error(`  scripts/${f}`);
console.error(
  `\nA drive belongs in the wire suite, where it keeps running:\n` +
    `  packages/wire/tests/<feature>.wire.test.ts\n` +
    `  packages/wire/tests/<feature>.dirty.wire.test.ts  (if it cannot run twice)\n\n` +
    `Import the harness (Session, expectOk, expectNote, query) rather than\n` +
    `re-deriving login/socket/roster, and declare the packs the flow needs.\n` +
    `See docs/testing.md § The two tiers.`
);
process.exit(EXIT_ON_FINDINGS ? 1 : 0);
