/**
 * The per-file type-check: `typecheck`, and `reload`'s three modes.
 *
 * tsx strips types and never checks them, so a module can reload cleanly
 * and no longer type-check. The world answers that with ONE file checked
 * out of process (`docs/subsystems/diagnostics.md` § Producer 3):
 *
 *   - `typecheck X` checks and swaps nothing;
 *   - `reload X` swaps, then tells the verdict when the check lands — a
 *     frame that arrives AFTER the command has answered, which is why this
 *     file listens for it rather than reading `said()`;
 *   - `reload --no-check X` swaps and says nothing more;
 *   - `reload --strict X` checks first and refuses to swap a type error in.
 *
 * The probe is a real source file the founder's verbs resolve by class
 * path. This file writes it, breaks it, and removes it; a probe left
 * behind by a crashed run is removed before the next one starts, and the
 * name is ignored by git.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  expectNote,
} from '../src/harness';

declareFile({
  file: 'typecheck.wire.test.ts',
  packs: ['platform'],
});

const PROBE_CLASS = '/platform/thing/WireTypecheckProbe';
const PROBE_FILE = fileURLToPath(
  new URL(
    '../../server/src/mud/platform/thing/WireTypecheckProbe.ts',
    import.meta.url
  )
);
const CLEAN = 'export class WireTypecheckProbe {\n  n: number = 7;\n}\n';
const BROKEN = 'export class WireTypecheckProbe {\n  n: number = "seven";\n}\n';

/** How long a background verdict may take to land (a check is ~1–3 s). */
const VERDICT_MS = 8_000;

let founder: Session;
let player: Session;

beforeAll(async () => {
  rmSync(PROBE_FILE, { force: true });
  writeFileSync(PROBE_FILE, CLEAN);
  founder = await Session.open('founder');
  player = await Session.open(uniqueHandle('tc'));
}, 120_000);

afterAll(() => {
  founder?.close();
  player?.close();
  rmSync(PROBE_FILE, { force: true });
});

suite('a clean file', () => {
  it('typecheck says it is clean, and swaps nothing', async () => {
    const result = await founder.cmd(`typecheck ${PROBE_CLASS}`);
    expectOk(result);
    expect(await result.said()).toMatch(/type-check: .*WireTypecheckProbe\.ts is clean/);
  });

  it('reload swaps it, then the verdict lands after the command answered', async () => {
    const result = await founder.cmd(`reload ${PROBE_CLASS}`);
    expectOk(result);
    expect(await result.said()).toMatch(/reloaded .*WireTypecheckProbe\.ts/);
    expect(await founder.listen(VERDICT_MS)).toMatch(/is clean/);
  });

  it('reload --no-check swaps and says nothing more', async () => {
    const result = await founder.cmd(`reload --no-check ${PROBE_CLASS}`);
    expectOk(result);
    expect(await founder.listen(VERDICT_MS)).not.toMatch(/type-check/);
  });
});

suite('a file with a type error', () => {
  beforeAll(() => writeFileSync(PROBE_FILE, BROKEN));

  it('typecheck names the error by line and code', async () => {
    const result = await founder.cmd(`typecheck ${PROBE_CLASS}`);
    expectOk(result);
    expect(await result.said()).toMatch(/1 error\(s\)[\s\S]*2:3 TS2322/);
  });

  it('reload --strict refuses to swap it in', async () => {
    const result = await founder.cmd(`reload --strict ${PROBE_CLASS}`);
    expectNote(result, 'controller-rejected', { reason: 'type-errors' });
    expect(await result.said()).toMatch(/not reloaded \(--strict\)/);
  });

  it('reload swaps it anyway, then reports the error', async () => {
    const result = await founder.cmd(`reload ${PROBE_CLASS}`);
    expectOk(result);
    expect(await founder.listen(VERDICT_MS)).toMatch(/TS2322/);
  });

  it('fixing it and checking again clears the verdict', async () => {
    writeFileSync(PROBE_FILE, CLEAN);
    const result = await founder.cmd(`typecheck ${PROBE_CLASS}`);
    expectOk(result);
    expect(await result.said()).toMatch(/is clean/);
  });
});

suite('who may check what', () => {
  it('a path with no source file is declined, by note', async () => {
    const result = await founder.cmd('typecheck /platform/thing/NoSuchProbe');
    expectNote(result, 'controller-rejected');
    expect(existsSync(PROBE_FILE)).toBe(true);
  });

  it('a non-wizard cannot typecheck', async () => {
    const result = await player.cmd(`typecheck ${PROBE_CLASS}`);
    expect(result.status).not.toBe('ok');
  });
});
