/**
 * The two menders (repair W5, D15, D16) — the cobbler's shop and the
 * tinker's round, as rows. The mechanism is the kernel's (the paid mend,
 * the round as roster slots); what is proven here is that the rows say
 * what the drive relies on, so a typo is a red test and not a dead stop.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';

const TERMINUS = fileURLToPath(new URL('../../content/', import.meta.url));
const PACKS = fileURLToPath(new URL('../../../', import.meta.url));

type Row = { class?: string; data?: Record<string, unknown> };
const row = (base: string, rel: string): Row =>
  parse(readFileSync(`${base}${rel}`, 'utf8')) as Row;

describe('the cobbler (D16)', () => {
  const outfit = row(TERMINUS, 'world/terminus/mayfield-row/cobbler/idea/outfit.yaml').data!;
  const seat = (outfit.positions as Record<string, unknown>[])[0]!;

  it('⭐ a piece-rate seat a player can hold — two places, a novice leatherworker\'s bar', () => {
    expect(seat.compensation).toEqual({ basis: 'per-settlement', rate: 4 });
    expect(seat.headcount).toBe(2);
    expect(seat.requires).toEqual({ discipline: 'leatherwork', band: 'novice' });
    expect(seat.fulfills).toEqual(['leatherwork', 'tailoring']);
    expect(outfit.call).toBe('rota');
  });

  it('the slate is in the house it attributes to, and the shop is a door off the row', () => {
    expect(outfit.operatingLocations).toContain('/world/terminus/mayfield-row/cobbler/thing/slate');
    const street = row(TERMINUS, 'world/terminus/mayfield-row/street.yaml').data!;
    expect((street.exits as Record<string, { destination: string }>).cobbler!.destination).toBe(
      '/world/terminus/mayfield-row/cobbler/location/shop',
    );
    const shop = row(TERMINUS, 'world/terminus/mayfield-row/cobbler/location/shop.yaml').data!;
    expect(JSON.stringify(shop.props)).toMatch(/needle-case/);
    expect(JSON.stringify(shop.props)).toMatch(/thing\/sole/);
  });
});

describe('the tinker\'s round (D15)', () => {
  const round = row(TERMINUS, 'world/terminus/wharfside/tinker/idea/round.yaml').data!;
  const slots = round.rosterSlots as { station: string; schedule: { hours: [number, number] }[] }[];
  const operating = round.operatingLocations as string[];

  it('⭐⭐ five stops, in order, never two at once — a round is roster slots', () => {
    expect(slots.map((s) => s.station.split('/').pop())).toEqual([
      'yard', 'crossroads', 'valley-gate', 'crossroads', 'smelter',
    ]);
    const hours = slots.map((s) => s.schedule[0]!.hours);
    for (let i = 1; i < hours.length; i++) expect(hours[i]![0]).toBe(hours[i - 1]![1]);
  });

  it('⭐ every stop and every slate is somewhere the house operates — or it attaches to nothing', () => {
    for (const s of slots) expect(operating).toContain(s.station);
    for (const slate of [
      '/world/terminus/wharfside/tinker/thing/slate',
      '/world/terminus/delight-road/thing/tinkers-slate',
      '/world/terminus/hearts-delight/thing/tinkers-slate',
      '/world/terminus/rejection/thing/mending-slate',
    ]) {
      expect(operating).toContain(slate);
    }
  });

  it('the notice at the crossroads reads the round', () => {
    const notice = row(TERMINUS, 'world/terminus/delight-road/thing/tinkers-notice.yaml');
    expect(notice.class).toBe('/platform/thing/Signpost');
    expect(String(notice.data!.markText)).toMatch(/six.*eight.*ten.*noon.*two/s);
    const props = JSON.stringify(row(TERMINUS, 'world/terminus/delight-road/crossroads.yaml').data!.props);
    expect(props).toMatch(/tinkers-notice/);
    expect(props).toMatch(/tinkers-slate/);
  });

  it('he is born holding his kit — a hook, a stone, a sewing kit, and the iron he mends with (D14)', () => {
    const tinker = row(TERMINUS, 'world/terminus/wharfside/tinker/agent/tinker.yaml');
    expect(tinker.class).toBe('/world/terminus/wharfside/agent/Tinker');
    expect(tinker.data!.props).toEqual([
      '/trade/forestry/thing/billhook',
      '/world/terminus/general-store/thing/whetstone',
      '/world/terminus/general-store/thing/sewing-kit',
      // A mend draws on the hand's own pockets, and a pig is too much
      // metal for a head (the whole-need bound) — the browser walk.
      '/trade/smithing/thing/iron-offcuts',
    ]);
  });

  it('⭐ the Rejection stop is the SMELTER — a fire for iron (D15, D19)', () => {
    const smelter = row(`${PACKS}rejection/content/`, 'world/terminus/rejection/location/smelter.yaml');
    expect(JSON.stringify(smelter.data!.props)).toMatch(/mending-slate/);
    const shed = row(`${PACKS}rejection/content/`, 'world/terminus/rejection/location/provisioning.yaml');
    expect(JSON.stringify(shed.data!.props)).not.toMatch(/mending-slate/);
  });
});

describe('the infirmary no longer mends (D19, AC 7)', () => {
  it('its tariff prices treatment only', () => {
    const t = row(TERMINUS, 'world/terminus/infirmary/thing/tariff.yaml').data!;
    expect(Object.keys(t.prices as object)).toEqual(['treatment']);
    expect(Object.keys(t.services as object)).toEqual(['treatment']);
  });
});
