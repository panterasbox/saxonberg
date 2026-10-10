/**
 * ⭐⭐ **The `structure` channel, and the two rooms the trade's premise
 * actually lives in.**
 *
 * This file reads the SHIPPED rows rather than a fixture, because what
 * only a pack test can see is whether the citations resolve: a channel
 * row whose class does not extend `Reading` warms as nothing, and a trap
 * authored under the wrong room is a lesson the player never gets. Both
 * fail closed and silent.
 *
 * The claims:
 *
 *  1. ⭐⭐⭐ **The place the ground tells you about is not the place to
 *     dig.** The spring sits on the trap's RIM and the flat sits over
 *     its CREST, which is the whole pedagogy of the trade — and it is an
 *     arithmetic fact about two coordinates and one authored fold, so it
 *     is asserted rather than described.
 *  2. The channel row names a class that is a `Reading`, declares the
 *     `surveying` capability mining's instruments already afford, and
 *     claims a channel token nothing else claims.
 *  3. ⚠ **Nothing in the row or the reading mentions charge.**
 *  4. Both sites are in the claims register, so `stake` reaches them
 *     with no second mechanism.
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
import Deposit from '@saxonberg/content-ground/src/idea/Deposit';
import type { FluidBody } from '@saxonberg/content-ground/src/idea/Deposit';
import StructureReading from '../idea/reading/StructureReading';
import { DEPTH_FRACTION, SURVEYING } from '../lib/GroundChannel';

const PACK = fileURLToPath(new URL('../../', import.meta.url));
const REJECTION = fileURLToPath(
  new URL('../../../rejection/content/world/terminus/rejection/', import.meta.url),
);
const MINING = fileURLToPath(
  new URL('../../../trade-mining/content/trade/mining/', import.meta.url),
);

function row(abs: string): Record<string, unknown> {
  return YAML.parse(readFileSync(abs, 'utf8')) as Record<string, unknown>;
}
function data(abs: string): Record<string, unknown> {
  return (row(abs).data ?? {}) as Record<string, unknown>;
}

/** The SHIPPED Ferrow column, read off the file and never restated. */
function ferrow(): Deposit {
  const d = makeStuff(() => new Deposit());
  const authored = data(`${REJECTION}idea/deposit/ferrow.yaml`);
  d.setName(String(authored.name));
  d.setStratigraphy(authored.stratigraphy as never);
  d.setWaterTable(Number(authored.waterTable));
  d.setLode(authored.lode as never);
  d.setZones(authored.zones as never);
  d.setDepletion((authored.depletion ?? []) as never);
  d.setFeatures((authored.features ?? {}) as never);
  d.setFluids(authored.fluids as FluidBody[]);
  return d;
}

/** A shipped room's cell, in zone metres — the pithead's cells are 10 m. */
function metresOf(roomFile: string): [number, number] {
  const coords = data(`${REJECTION}location/${roomFile}`).coords as {
    x: number;
    y: number;
  };
  const cellSize = Number(data(`${REJECTION}location.yaml`).cellSize);
  return [coords.x * cellSize, coords.y * cellSize];
}

const SEED = Deposit.seedFor('terminus/rejection');

beforeEach(() => {
  installV1QuantityMarshallers();
  StuffApi.clearAll();
});

describe('⭐⭐⭐ the spring is the rim; the flat is the crest', () => {
  it('the salt leg is charged, and pinned rather than rolled', () => {
    const d = ferrow();
    const leg = d.fluidBody('salt-leg')!;
    expect(leg).toBeDefined();
    expect(leg.charge).toBe(true);
    // ⚠ Pinned on purpose: the FIRST bore in a new country must not be a
    // coin toss. The dry structure is Stage C's, on ground that reads
    // just as well.
    expect(d.isCharged(leg, SEED)).toBe(true);
    // Recharge is zero everywhere, so the capacity IS the well's life.
    expect(leg.capacityL).toBeGreaterThan(0);
  });

  it('⭐⭐⭐ the spring sits out on the RIM — a bore there finds almost nothing', () => {
    const d = ferrow();
    const leg = d.fluidBody('salt-leg')!;
    const [x, y] = metresOf('salt-spring.yaml');
    const here = d.legAt(leg, x, y);
    expect(here).not.toBeNull();
    // Inside the trap, and with next to no closure left under it.
    expect(here!.thicknessM).toBeLessThan(leg.trap.closureM * 0.1);
  });

  it('⭐⭐⭐ the flat sits over the CREST — the full closure', () => {
    const d = ferrow();
    const leg = d.fluidBody('salt-leg')!;
    const [x, y] = metresOf('salt-flat.yaml');
    const here = d.legAt(leg, x, y)!;
    expect(here.thicknessM).toBeCloseTo(leg.trap.closureM, 6);
    // And the brine is actually there, at the depth the survey reports.
    const mid = (here.topZ + here.spillZ) / 2;
    expect(d.fluidAt([x, y, mid], SEED)!.bodyKey).toBe('salt-leg');
    expect(d.fluidAt([x, y, mid], SEED)!.materialPath).toBe(
      '/stuff/idea/material/bulk/salt-water',
    );
  });

  it('⭐⭐ the survey AT THE SPRING points at the flat, before a penny is spent', () => {
    // This is the sentence that makes the cheap bore a decision rather
    // than a trap: standing at the free evidence, the instrument already
    // says the top is somewhere else and how far.
    const d = ferrow();
    const [sx, sy] = metresOf('salt-spring.yaml');
    const [fx, fy] = metresOf('salt-flat.yaml');
    const reading = d.structureReadingAt(sx, sy, DEPTH_FRACTION.competent, SEED)[0]!;
    expect(reading.key).toBe('salt-leg');
    const trueDistance = Math.hypot(fx - sx, fy - sy);
    expect(reading.distanceM).toBeCloseTo(trueDistance, 6);
    expect(reading.thicknessHereM).toBeLessThan(reading.closureM * 0.1);
  });

  it('the axis runs with the lode: one episode of folding made both', () => {
    const d = ferrow();
    const leg = d.fluidBody('salt-leg')!;
    expect(leg.trap.strike).toBe(d.getLode()!.strike);
  });

  it('⚠ the leg is BELOW the water table, so an unlined hole fills with water', () => {
    // The reason `line` exists, authored rather than asserted in prose.
    const d = ferrow();
    const leg = d.fluidBody('salt-leg')!;
    expect(leg.trap.crest[2]).toBeLessThan(d.getWaterTable());
  });
});

describe('the channel row is actually wired', () => {
  const channel = data(`${PACK}content/trade/drilling/idea/reading/structure.yaml`);

  it('names a class that IS a Reading — the silent-warm failure', () => {
    // A `Reading` row whose class does not extend `Reading` warms as
    // nothing: the catalogue keeps it and no verb finds it.
    expect(row(`${PACK}content/trade/drilling/idea/reading/structure.yaml`).class)
      .toBe('/trade/drilling/idea/reading/StructureReading');
    const reading = makeStuff(() => new StructureReading());
    expect(reading instanceof Reading).toBe(true);
  });

  it('claims the `structure` token, and the catalogue keys on the token', () => {
    // ⚠ Two rows claiming one channel token collide, so a pack's channel
    // must be a NEW word.
    expect(channel.channel).toBe('structure');
  });

  it('⭐ asks for the capability mining\'s instruments already afford', () => {
    // The whole of *a second reading is a row*: this trade ships no
    // instrument for its structural read, and the miner's dial works.
    expect(channel.instrument).toBe(SURVEYING);
    const strike = data(`${MINING}idea/reading/strike.yaml`);
    expect(channel.instrument).toBe(strike.instrument);
  });

  it('is banded by geology, and scoped to where you are standing', () => {
    expect(channel.discipline).toBe('geology');
    expect(channel.scope).toEqual(['here']);
    // The eye rung is real — everybody may try, and what they get back
    // depends on what they know.
    expect(channel.eyeCeiling).toBe('untrained');
  });

  it('⚠⚠ NOTHING in the row mentions charge, or whether there is anything in it', () => {
    const text = readFileSync(
      `${PACK}content/trade/drilling/idea/reading/structure.yaml`,
      'utf8',
    );
    // The row's own prose is allowed to say that it does NOT report it
    // (and does, at length); what must not exist is a field.
    expect(Object.keys(channel).join(' ')).not.toMatch(/charge|wet|dry|holds/i);
    expect(text).toMatch(/reports no charge/);
  });

  it('⭐ the depth bracket narrows with the band, and is a FRACTION', () => {
    const bands = ['untrained', 'novice', 'competent', 'proficient', 'expert'] as const;
    for (let i = 1; i < bands.length; i++) {
      expect(DEPTH_FRACTION[bands[i]!]).toBeLessThan(DEPTH_FRACTION[bands[i - 1]!]);
    }
    // ⚠ Clamped at a half by the column: past that the solved reading
    // runs away and the eye rung should be answering instead.
    expect(DEPTH_FRACTION.untrained).toBeLessThanOrEqual(0.5);
  });
});

describe('`stake` reaches both sites with no second mechanism', () => {
  const counter = data(`${REJECTION}thing/claims-counter.yaml`);
  const workings = counter.surfaceWorkings as Array<{
    path: string;
    keywords: string[];
  }>;

  it('both bore sites are entries in the register that already existed', () => {
    const paths = workings.map((w) => w.path);
    expect(paths).toContain('/world/terminus/rejection/location/salt-spring');
    expect(paths).toContain('/world/terminus/rejection/location/salt-flat');
    // ⭐ And the quarry's entry is untouched: a bore site is one MORE
    // entry, which is the falsifiable line.
    expect(paths).toContain('/world/terminus/rejection/quarry/pit');
  });

  it('every entry\'s keywords are distinct, so `stake <word>` is unambiguous', () => {
    const seen = new Set<string>();
    for (const w of workings) {
      for (const k of w.keywords) {
        expect(seen.has(k)).toBe(false);
        seen.add(k);
      }
    }
  });

  it('the two rooms exist, are outdoors, and are reachable from the hillside', () => {
    for (const file of ['salt-spring.yaml', 'salt-flat.yaml']) {
      const d = data(`${REJECTION}location/${file}`);
      expect(d._biomePath).toBe('/stuff/idea/biome/outdoor/baseline');
      expect(d.coords).toBeDefined();
    }
    const hillside = data(`${REJECTION}location/hillside.yaml`);
    const exits = hillside.exits as Record<string, { destination: string }>;
    expect(exits.east?.destination).toBe(
      '/world/terminus/rejection/location/salt-spring',
    );
  });

  it('⭐ the free evidence is a PROP with a `showing` detail, and the channel reads that', () => {
    // The channel knows nothing about springs: it asks the room what is
    // showing. A third kind of surface showing is a row.
    const spring = data(`${REJECTION}location/salt-spring.yaml`);
    expect(spring.props).toContain(
      '/world/terminus/rejection/thing/salt-spring',
    );
    const prop = data(`${REJECTION}thing/salt-spring.yaml`);
    const details = prop.details as Record<string, { description: string }>;
    expect(details.showing?.description).toBeTruthy();
    // ⚠ And the FLAT has no SHOWING at all — that is the point of it.
    // (It does have props now: the saltern stands there, because brine
    // is mostly water and salt is light. None of them shows anything.)
    const flatProps = (data(`${REJECTION}location/salt-flat.yaml`).props ??
      []) as string[];
    expect(flatProps).not.toContain(
      '/world/terminus/rejection/thing/salt-spring',
    );
    for (const propPath of flatProps) {
      expect(propPath.startsWith('/trade/quarrying/thing/')).toBe(true);
    }
  });
});
