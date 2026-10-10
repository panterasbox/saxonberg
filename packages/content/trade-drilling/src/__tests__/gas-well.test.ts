/**
 * ⭐⭐ **Stage B: the well that comes up by itself, and the gauge that is
 * the only thing that will ever tell you it is stopping.**
 *
 * The claims:
 *
 *  1. ⭐⭐⭐ **Nothing announces the decline.** There is no notice, no
 *     warning and no *played out* message anywhere in this trade — the
 *     head falls, the gauge reports it, and the owner decides. Asserted
 *     by searching the pack's own source for the words a hint would be
 *     made of.
 *  2. ⚠⚠ **`head` is not `pressure`.** The shipped `pressure` channel is
 *     atmospheric and Container-scoped; a reservoir's drive is a
 *     different quantity about a different thing, and a channel token is
 *     unique, so taking `pressure` would have collided.
 *  3. The eye rung answers in WORDS with **no digit in it** — a driller
 *     can tell flowing from slackened from dead by standing there and
 *     cannot tell 2.4 atm from 1.9.
 *  4. ⭐ The gas country is a ROW: a fourth site, a second body, and the
 *     same hazard the mine already authored read from the other side.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import HeadReading from '../idea/reading/HeadReading';

const PACK = fileURLToPath(new URL('../../', import.meta.url));
const CONTENT = fileURLToPath(new URL('../../../', import.meta.url));
const REJECTION = `${CONTENT}rejection/content/world/terminus/rejection/`;
const PLATFORM = `${CONTENT}platform/content/platform/`;

function row(abs: string): Record<string, unknown> {
  return YAML.parse(readFileSync(abs, 'utf8')) as Record<string, unknown>;
}
function data(abs: string): Record<string, unknown> {
  return (row(abs).data ?? {}) as Record<string, unknown>;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  StuffApi.clearAll();
});

describe('⚠⚠ `head` is not `pressure`, and the distinction is real', () => {
  const head = data(`${PACK}content/trade/drilling/idea/reading/head.yaml`);
  const pressure = data(`${PLATFORM}idea/reading/pressure.yaml`);

  it('two different channel tokens, because they are two different quantities', () => {
    expect(head.channel).toBe('head');
    expect(pressure.channel).toBe('pressure');
    // ⚠ A token is unique in the catalogue: taking `pressure` would have
    // collided, and WANTING to take it would have been the tell that the
    // design was confused about which pressure it meant.
    expect(head.channel).not.toBe(pressure.channel);
  });

  it('⭐ the shipped one is scoped to WHERE YOU ARE; this one to a THING', () => {
    // A barometer reads the room. A gauge is screwed into one hole's
    // collar, and two holes on one body read differently from each
    // other even standing in the same place.
    expect(pressure.scope).toEqual(['here']);
    expect(head.scope).toEqual(['subject']);
  });

  it('is banded by physics, and wants a gauge this trade actually ships', () => {
    expect(head.discipline).toBe('physics');
    expect(head.instrument).toBe('gauging');
    const gauge = data(`${PACK}content/trade/drilling/thing/pressure-gauge.yaml`);
    expect((gauge.capabilities ?? []) as string[]).toContain('gauging');
  });

  it('the class IS a Reading — the silent-warm failure', () => {
    expect(row(`${PACK}content/trade/drilling/idea/reading/head.yaml`).class).toBe(
      '/trade/drilling/idea/reading/HeadReading',
    );
    expect(makeStuff(() => new HeadReading()) instanceof Reading).toBe(true);
  });

  it('⚠ the eye rung goes all the way down, because the words are honest at every band', () => {
    // Anybody at a wellhead can tell flowing from slackened from dead.
    // What the gauge buys is the FIGURE, which is what lets you do the
    // arithmetic a week ahead instead of a day.
    expect(head.eyeCeiling).toBe('untrained');
  });
});

describe('⭐⭐⭐ nothing announces the decline', () => {
  const src = readFileSync(
    `${PACK}src/idea/reading/HeadReading.ts`,
    'utf8',
  );

  it('⚠ the eye rung\'s words contain NO DIGIT', () => {
    // A sentence with a number in it would be the gauge this game does
    // not have. The three words are pulled out of the source and
    // checked, because a later edit is exactly how a digit would get in.
    const wordsFn = src.slice(src.indexOf('function words('));
    const quoted = [...wordsFn.matchAll(/'([^']{20,})'/g)].map((m) => m[1]!);
    expect(quoted.length).toBeGreaterThan(2);
    for (const line of quoted) {
      expect(line, `the eye rung said: ${line}`).not.toMatch(/\d/);
    }
  });

  it('⚠⚠ no scheduled notice, no warning, no "played out" anywhere in the pack', () => {
    // The player reads the gauge and decides when to stop paying. If
    // anything in this trade ever told them, the decision — which IS
    // the content — would be gone.
    const files = [
      'src/idea/reading/HeadReading.ts',
      'src/thing/Wellhead.ts',
      'src/idea/DrillingOutfit.ts',
      // ⚠ `DismissController` used to be listed here and is no longer
      // the pack's: letting a worker go is the EMPLOYMENT subsystem's
      // act, not drilling's, and the verb moved to the kernel. The rule
      // it was checked for still holds there — the kernel's help text
      // says *nothing will tell you when to* — and the three files left
      // are the ones this pack actually owns.
    ];
    for (const f of files) {
      // ⚠ COMMENTS STRIPPED FIRST, and the test failed without it: the
      // doc comments say at length that none of this happens, and
      // saying so is the opposite of doing it. A scan that cannot tell
      // prose-about-the-code from the code's own prose would have made
      // every explanation of this rule a violation of it.
      const text = readFileSync(`${PACK}${f}`, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      const literals = [...text.matchAll(/`([^`]{15,})`/g)].map((m) => m[1]!);
      for (const line of literals) {
        expect(line, `${f} said: ${line}`).not.toMatch(
          /played out|running dry|you should stop|no longer worth|warning/i,
        );
      }
    }
  });
});

describe('⭐ the gas country is a ROW', () => {
  const fluids = data(`${REJECTION}idea/deposit/ferrow.yaml`).fluids as Array<
    Record<string, unknown>
  >;

  it('a second body on the same column, with DRIVE behind it', () => {
    const cap = fluids.find((f) => f.key === 'gas-cap')!;
    expect(cap).toBeDefined();
    expect(cap.fluid).toBe('/stuff/idea/material/gas/firedamp');
    // ⭐ The whole difference between Stage A and Stage B in one field.
    expect(Number(cap.headAtm0)).toBeGreaterThan(0);
    const salt = fluids.find((f) => f.key === 'salt-leg')!;
    expect(Number(salt.headAtm0 ?? 0)).toBe(0);
  });

  it('⚠ the cap is SMALL — pressure feels generous and volume is what ends', () => {
    const cap = fluids.find((f) => f.key === 'gas-cap')!;
    const salt = fluids.find((f) => f.key === 'salt-leg')!;
    expect(Number(cap.capacityL)).toBeLessThan(Number(salt.capacityL));
  });

  it('⭐⭐ it is the SAME claim the mine already made, from the other side', () => {
    // `gas:` says the measures give off firedamp into a heading you cut.
    // The cap says there is a closed structure holding some of it that a
    // bore can tap. Both are *there is coal in this hill under the iron*
    // — and if they ever name different gases, one of them is lying.
    const column = data(`${REJECTION}idea/deposit/ferrow.yaml`);
    const hazard = column.gas as { material: string };
    const cap = fluids.find((f) => f.key === 'gas-cap')!;
    expect(cap.fluid).toBe(hazard.material);
  });

  it('the burnt ground is a site, a showing and a register entry — zero code', () => {
    const flat = data(`${REJECTION}location/gas-flat.yaml`);
    expect((flat.props ?? []) as string[]).toContain(
      '/world/terminus/rejection/thing/gas-blow',
    );
    const blow = data(`${REJECTION}thing/gas-blow.yaml`);
    const details = blow.details as Record<string, { description: string }>;
    expect(details.showing?.description).toBeTruthy();
    const counter = data(`${REJECTION}thing/claims-counter.yaml`);
    const paths = (counter.surfaceWorkings as Array<{ path: string }>).map(
      (w) => w.path,
    );
    expect(paths).toContain('/world/terminus/rejection/location/gas-flat');
    // ⭐ Four sites now, and `rejection` still ships no TypeScript.
    expect(paths.length).toBeGreaterThanOrEqual(4);
  });

  it('⭐⭐ the hearth will take a vessel on it, which is the one key Stage B needed', () => {
    const hearth = data(
      `${CONTENT}trade-quarrying/content/trade/quarrying/thing/brine-hearth.yaml`,
    );
    expect((hearth.placements ?? []) as string[]).toContain('on');
  });
});
