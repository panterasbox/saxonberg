/**
 * ⭐⭐ **The soak harness's blocking drive** — the staging tools and the
 * refusal, driven over the wire (soak-harness requirements, steps 2 and
 * 8–10; steps 1, 3–7 and 11 are the runner's and the census's, recorded
 * in the plan's drive record).
 *
 *   2  a jump past a game day, in a blocking file, is refused in words
 *      that name the rule and the `.soak.` fix; twenty hours passes
 *   8  a test runner granted title stages with `eval --parcel` — a consumer
 *      Api eval could not reach before, with a real effect; a parcel it
 *      does not hold refuses; the server stays up
 *   9  `eval` with a runaway loop answers `timed out`; a huge result is
 *      cut at the cap; a clone the boundary refuses comes back as an
 *      error, not a dead server
 *  10  `testharness clock` / `weather`: the clock moves two hours and is
 *      refused three days in the span rule's words; rain is pinned and
 *      released; eval reaching the clock or the pin is pointed at the verb
 *
 * No span step: every jump here is a day or less (this build follows its
 * own rule; its soak drive is `canary.soak.wire.test.ts`).
 */

import { readFileSync } from 'fs';
import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  isOwnedTestWorld,
  advanceWorldClock,
  worldClockNow,
  unpinWeather,
} from '../src/harness';
import type { CommandResult } from '../src/harness';

/**
 * ⚠ Why this file cannot run twice: it TRANSFERS the title of
 * `/trade/distribution` to a test runner (a sold parcel to the pack that
 * claimed it) and scalds the runner's hand.
 */
export const DIRTY_REASON =
  'transfers the title of /trade/distribution to a test runner and scalds ' +
  'a patient — the world puts neither back';

declareFile({
  file: 'soak-harness.dirty.wire.test.ts',
  packs: ['platform', 'terminus', 'distribution'],
  dirtyReason: DIRTY_REASON,
});

const SQUARE = '/world/terminus/market/square';
const TERMINUS = '/world/terminus';
const UNHELD = '/trade/distribution';

let runner: Session;
let handle = '';

async function say(s: Session, text: string): Promise<string> {
  const r = await s.cmd(text);
  return (await r.said()).replace(/\s+/g, ' ').trim();
}

function rejected(r: CommandResult): { reason?: string; detail?: string } | undefined {
  return (r.notes as Array<{ kind?: string; reason?: string; detail?: string }>).find(
    (n) => n.kind === 'controller-rejected',
  );
}

async function alive(s: Session): Promise<void> {
  const r = await s.cmd('ping');
  expect(
    r.status,
    `the server answers after the eval: ${await r.said()} ${JSON.stringify(r.notes)}`,
  ).toBe('ok');
}

beforeAll(async () => {
  handle = uniqueHandle('runner');
  runner = await Session.open(handle, {
    startLocation: SQUARE,
    wizard: true,
    parcels: [TERMINUS],
  });
}, 300_000);

afterAll(async () => {
  await unpinWeather(SQUARE).catch(() => undefined);
  runner?.close();
});

suite.skipIf(!isOwnedTestWorld())('2 · the refusal, in a blocking file', () => {
  it('two game days is refused, naming the rule and the .soak. fix; the clock unmoved', async () => {
    const before = await worldClockNow();
    const err = await advanceWorldClock('2 days').then(
      () => null,
      (e: unknown) => String(e),
    );
    expect(err, 'a two-day jump in a blocking file').toMatch(/span step/i);
    expect(err).toMatch(/\.soak\./);
    expect(err).toMatch(/No merge waits on the clock/);
    expect((await worldClockNow()) - before).toBeLessThan(600);
  });

  it('twenty hours is inside the line', async () => {
    const j = await advanceWorldClock('20 hours');
    expect(j.after - j.before).toBeGreaterThan(20 * 3600 - 60);
  }, 300_000);
});

suite.skipIf(!isOwnedTestWorld())('8 · a test runner stages in a parcel it holds', () => {
  it('a consumer Api eval could not reach before, with a real effect', async () => {
    // ⚠ A PATIENT, not the runner: a scalded runner's dying window ran
    // out across the next clock jumps, it died mid-command, and the reply
    // went to the destroyed body (the drive's first runs).
    const patientHandle = uniqueHandle('patient');
    // A wizard holding Terminus, so it stages on itself — its own eval's
    // `self` (a handle is not the character's name, so `--on` cannot find it).
    const patient = await Session.open(patientHandle, {
      startLocation: SQUARE,
      wizard: true,
      parcels: [TERMINUS],
    });
    try {
      const said = await say(
        patient,
        `eval --parcel ${TERMINUS} ConditionApi.inflict(self, { mechanism: 'heat', site: 'body.hand', energy: 1500 }) && 'scalded'`,
      );
      console.log(`  [drive] eval ConditionApi.inflict → ${said}`);
      expect(said, `eval ConditionApi: ${said}`).toMatch(/scalded/);
      // The condition reads where a body's conditions read: `assess`.
      const assessed = await say(patient, 'assess');
      expect(assessed, `the scald, on the patient: ${assessed}`).toMatch(/burn|scald|blister/i);
    } finally {
      patient.close();
    }
    await alive(runner);
  }, 120_000);

  it('a parcel it does not hold refuses; granted at login, it runs', async () => {
    const refused = await say(runner, `eval --parcel ${UNHELD} 1 + 1`);
    expect(refused, `unheld: ${refused}`).toMatch(/no authority|not.*hold|permission/i);
    runner.close();
    runner = await Session.open(handle, {
      startLocation: SQUARE,
      wizard: true,
      parcels: [TERMINUS, UNHELD],
    });
    const ran = await say(runner, `eval --parcel ${UNHELD} 1 + 1`);
    expect(ran, `granted: ${ran}`).toMatch(/: 2\b/);
    await alive(runner);
  }, 300_000);

  it('a path that is not a parcel fails the login, naming the covering one', async () => {
    const err = await Session.open(uniqueHandle('runner'), {
      wizard: true,
      parcels: [`${SQUARE}/nowhere`],
    }).then(
      (s) => {
        s.close();
        return '';
      },
      (e: unknown) => String(e),
    );
    expect(err).toMatch(/is not a parcel; the covering parcel is '\/world\/terminus\/market'/);
  }, 120_000);
});

suite('9 · eval cannot hang, flood or kill the world', () => {
  it('a runaway loop answers `timed out` and the next command answers', async () => {
    // ⚠ No `;` and no braces: the command line splits on `;` and binds
    // `{…}` as structure, so the loop is the one form that is neither.
    const r = await runner.cmd('eval while (true) 0');
    const said = (await r.said()).replace(/\s+/g, ' ').trim();
    console.log(`  [drive] eval while(true) 0 → status ${r.status} said '${said}' notes ${JSON.stringify(r.notes)}`);
    expect(said).toMatch(/timed out after \d+ ms \(eval\.timeoutMs\)/);
    await alive(runner);
  }, 120_000);

  it('a huge result is cut at the cap, its length named', async () => {
    const said = await say(runner, "eval 'x'.repeat(1000000)");
    expect(said).toMatch(/cut at 16,384 of 1,0\d\d,\d{3} chars — eval output cap/);
    await alive(runner);
  }, 120_000);

  it('a clone the boundary refuses is an error on the line — the world stays up', async () => {
    // The dairy drive's crash shape: a clone in the runner's own circle,
    // written as a statement, not returned.
    const said = await say(
      runner,
      "eval StuffApi.clone('/trade/sugar/thing/pan'); return 'went on'",
    );
    expect(said, `the dropped clone: ${said}`).toMatch(/went on|late: StuffApi\.clone|error:/);
    await alive(runner);
    const log = process.env.WIRE_SERVER_LOG;
    if (log) {
      expect(readFileSync(log, 'utf8')).not.toMatch(/Unhandled rejection/i);
    }
  }, 120_000);
});

suite.skipIf(!isOwnedTestWorld())('10 · testharness — the clock and the weather', () => {
  it('`testharness clock` reads', async () => {
    expect(await say(runner, 'testharness clock')).toMatch(/Game time \d+s — day \d+, \d\d:\d\d/);
  });

  it('`clock advance 2h` moves it; `clock advance 3d` is the span rule, unmoved', async () => {
    const before = await worldClockNow();
    expect(await say(runner, 'testharness clock advance 2h')).toMatch(/The clock moved 2 hours/);
    const mid = await worldClockNow();
    expect(mid - before).toBeGreaterThanOrEqual(7_200);
    const r = await runner.cmd('testharness clock advance 3d');
    expect(rejected(r)?.detail).toMatch(/SPAN step.*\.soak\./s);
    expect((await worldClockNow()) - mid).toBeLessThan(600);
  }, 300_000);

  it('`weather pin rain` holds rain here until `unpin`', async () => {
    expect(await say(runner, 'testharness weather pin rain')).toMatch(/held at rain/);
    const pinned = await say(runner, 'analyze weather');
    expect(pinned, `pinned: ${pinned}`).toMatch(/type:\s*rain/i);
    expect(await say(runner, 'testharness weather')).toMatch(/pinned rain \(frozen\)/);
    // ⭐ Applied at once, as a boundary applies it: what does a body out
    // in it read? (Recorded — clothes take rain first.)
    console.log(`  [drive] the runner under a pinned rain: ${(await say(runner, 'look me')).slice(-200)}`);
    expect(await say(runner, 'testharness weather unpin')).toMatch(/runs free again/);
    expect(await say(runner, 'testharness weather')).toMatch(/no pin/);
  }, 300_000);

  it('a kind that is not a weather is refused naming the model\'s kinds', async () => {
    const r = await runner.cmd('testharness weather pin sideways');
    expect(rejected(r)?.detail).toMatch(/not a weather kind .*clear.*snow/);
  });

  it('eval reaching the clock or the pin is pointed at the verb', async () => {
    expect(await say(runner, "eval WorldClockApi.advance('1 hour')")).toMatch(
      /test seam.*testharness clock advance/,
    );
    const pin = await say(
      runner,
      `eval --parcel ${TERMINUS} (await AddressApi.resolveLocalityFor(self)).setWeatherPin({ type: 'snow', mode: 'frozen' })`,
    );
    expect(pin, `eval setWeatherPin: ${pin}`).toMatch(/testharness weather pin|denied|not callable/);
  }, 120_000);
});
