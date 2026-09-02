/**
 * ⭐⭐⭐ **Every residence reaches a sandbox door.**
 *
 * A circle is granted at character creation (`selfHomeOwnerOf`), and its
 * DOOR is a `SandboxCrossing` standing in a space you hold — the
 * `linkForEnterer` *owned* case, where a guest in your hall cannot
 * re-point your wardrobe at their own space. So a home that reaches no
 * crossing is a home whose tenant cannot get to the sandbox they already
 * own, and nothing anywhere would say so.
 *
 * ⚠⚠ **This is exactly the mistake it was written after.** Moving the
 * door out of a commons and into homes, three residence programmes ship
 * and only two got it: Hinkley's house (the generic bedroom archetype)
 * and the Seznick unit (its own bedroom). **The Duncan Hall dorm — the
 * FIRST home on the ladder, the one a new player actually gets — was
 * missed**, and every test still passed. A rule remembered by a person
 * across three packs is a rule that breaks on the fourth.
 *
 * ⚠ It reads the SHIPPED rows and names no locality, so it stays a
 * kernel test (`lint:test-content`): the programmes are discovered by
 * walking every pack for a `floorplan:`, never by a list here.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(HERE, '..', '..', '..', '..', '..', '..', 'content');

/** The one class a circle is entered through. */
const CROSSING = '/platform/thing/sandbox/SandboxCrossing';

interface Row {
  template: string;
  cls: string;
  data: Record<string, unknown>;
}

/** Every shipped row, keyed by template path. */
function shippedRows(): Map<string, Row> {
  const out = new Map<string, Row>();
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules') continue;
        walk(full, `${prefix}/${entry}`);
        continue;
      }
      if (!entry.endsWith('.yaml')) continue;
      try {
        const doc = YAML.parse(readFileSync(full, 'utf8')) as Record<string, unknown>;
        if (!doc || typeof doc !== 'object' || typeof doc.class !== 'string') continue;
        out.set(`${prefix}/${entry.replace(/\.yaml$/, '')}`, {
          template: `${prefix}/${entry.replace(/\.yaml$/, '')}`,
          cls: doc.class,
          data: (doc.data as Record<string, unknown>) ?? {},
        });
      } catch {
        // Unparseable rows are another gate's problem.
      }
    }
  };
  for (const pack of readdirSync(CONTENT)) {
    const content = join(CONTENT, pack, 'content');
    try {
      if (statSync(content).isDirectory()) walk(content, '');
    } catch {
      // A capability pack that ships only `src/`.
    }
  }
  return out;
}

/** The template paths a row's `props:` names. */
function propsOf(row: Row | undefined): string[] {
  const raw = row?.data.props;
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const p of raw) {
    if (typeof p === 'string') out.push(p);
    else if (p && typeof p === 'object') {
      const t = (p as Record<string, unknown>).template;
      if (typeof t === 'string') out.push(t);
    }
  }
  return out;
}

describe('every residence reaches its tenant’s sandbox door', () => {
  const rows = shippedRows();

  /** Programmes = any row declaring a floorplan. Discovered, never listed. */
  const programmes = [...rows.values()].filter(
    (r) => Array.isArray(r.data.floorplan),
  );

  it('⚠ the walk finds the shipped programmes — a scan that found none would pass', () => {
    expect(programmes.length).toBeGreaterThanOrEqual(3);
  });

  it('⭐ every floorplan includes a room carrying a SandboxCrossing', () => {
    const without: string[] = [];
    for (const prog of programmes) {
      const plan = prog.data.floorplan as Array<Record<string, unknown>>;
      const hasDoor = plan.some((leaf) => {
        const roomPath = leaf.room;
        if (typeof roomPath !== 'string') return false;
        return propsOf(rows.get(roomPath)).some(
          (p) => rows.get(p)?.cls === CROSSING,
        );
      });
      if (!hasDoor) without.push(prog.template);
    }
    expect(
      without,
      `residence programmes whose tenant can never reach their circle:\n  ${without.join('\n  ')}`,
    ).toEqual([]);
  });
});
