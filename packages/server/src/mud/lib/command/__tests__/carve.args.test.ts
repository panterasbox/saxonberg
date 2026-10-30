/**
 * `carve pattern of sword from board for pewter` — the documented order —
 * binds the metal to `for`. With `for` declared before `stock`, the greedy
 * `stock` took "board for pewter" and the pattern was cut for steel (the
 * ceramics drive, run 23).
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { CommandApi } from '../../../api/command';
import { CommandLineApi } from '../../../api/command-line';
import { CommandDefinition } from '../CommandDefinition';
import type { Stuff } from '../../stuff/Stuff';
import type Place from '../../stuff/Place';
import type { CommandGiver } from '../CommandGiver';

const here = dirname(fileURLToPath(import.meta.url));
const CARVE = join(here, '..', '..', '..', '..', '..', '..', 'content', 'platform', 'content', 'platform', 'cmd', 'crafting', 'carve.yaml');

describe('carve — the documented pattern line', () => {
  it('⭐ `… from board for pewter` binds the stock AND the metal', () => {
    const def = CommandDefinition.fromYaml(readFileSync(CARVE, 'utf-8'), CARVE);
    const parsed = CommandLineApi.parsePipeline('carve pattern of sword from board for pewter').commands[0]!;
    const built = CommandApi.assemble(parsed, def, {
      commandGiver: {} as Stuff & CommandGiver,
      location: {} as Place,
    });
    expect('error' in built, JSON.stringify(built)).toBe(false);
    if ('error' in built) return;
    const raw = (k: string): string =>
      String((built.model as Record<string, { raw?: string } | string | undefined>)[k] && typeof (built.model as Record<string, unknown>)[k] === 'object'
        ? ((built.model as Record<string, { raw?: string }>)[k]!.raw ?? '')
        : (built.model as Record<string, unknown>)[k] ?? '');
    expect(raw('stock')).toMatch(/^board$/);
    expect(raw('for')).toMatch(/^pewter$/);
  });
});
