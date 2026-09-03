/**
 * check-thin-forwarder — the shapes the lint must FIRE on, driven off
 * a fixture (the shipped-broken-gate clause: a gate proven only by
 * staying green is a gate that may have silently stopped matching;
 * assert it FIRES).
 *
 * The load-bearing addition is the VOID-GUARD shape
 * (`if (!isX) return; p.m(...)`) — the pre-hardening lint missed it,
 * which is how `ThermalLogic.depositHeat` shipped.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { scanSource } from '../check-thin-forwarder';

const FIXTURE = fileURLToPath(
  new URL('../__fixtures__/thin-forwarder-shapes.ts.txt', import.meta.url),
);

function findings(): Map<string, string> {
  const src = readFileSync(FIXTURE, 'utf8');
  const out = new Map<string, string>();
  for (const f of scanSource('fixture/FixtureApi.ts', src)) {
    out.set(`${f.cls}.${f.method}`, f.target);
  }
  return out;
}

describe('check-thin-forwarder fixture shapes', () => {
  it('⭐ FIRES on the void-guard shape (the hardened addition)', () => {
    expect(findings().get('FixtureApi.guardedVoid')).toBe('stuff');
  });

  it('fires on the bare return / bare void / guarded return shapes', () => {
    const f = findings();
    expect(f.get('FixtureApi.bareReturn')).toBe('stuff');
    expect(f.get('FixtureApi.bareVoid')).toBe('stuff');
    expect(f.get('FixtureApi.guardedReturn')).toBe('stuff');
  });

  it('does NOT flag the facade forward, transforms, substantive guards, or non-Api classes', () => {
    const f = findings();
    expect(f.has('FixtureApi.facade')).toBe(false);
    expect(f.has('FixtureApi.transforms')).toBe(false);
    expect(f.has('FixtureApi.substantiveGuard')).toBe(false);
    expect(f.has('FixturePlain.bareReturn')).toBe(false);
  });
});
