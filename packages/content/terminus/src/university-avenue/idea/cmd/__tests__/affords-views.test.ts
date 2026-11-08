/**
 * ⭐ The three views opted into `requires: [affords]` (controllers-are-io
 * D8d), through the binder's validator on the REAL views: what offers the
 * verb binds, and a thing that does not is refused in the verb's words.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeAll } from 'vitest';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import Watch from '../../../thing/Watch';
import Whistle from '../../../thing/Whistle';

class Rock extends Good {}

const ROOT = 'world/terminus/university-avenue/cmd';

async function check(verb: string, s: Stuff): Promise<unknown> {
  const view = CommandApi.getCommand(`${ROOT}/${verb}.yaml`);
  if (view === null) throw new Error(`no view for ${verb}`);
  await CommandApi.resolveValidators(view);
  const fn = view.args[0]!._resolvedValidators![0]! as (v: unknown, f: string) => unknown;
  return fn({ stuff: s, raw: 'it' }, 'target');
}

beforeAll(async () => {
  await CommandApi.preloadAll();
});

describe('wind, adjust and blow bind what offers them', () => {
  it('⭐ a watch winds and adjusts; a whistle blows', async () => {
    expect(await check('wind', makeStuff(() => new Watch()))).toBeUndefined();
    expect(await check('adjust', makeStuff(() => new Watch()))).toBeUndefined();
    expect(await check('blow', makeStuff(() => new Whistle()))).toBeUndefined();
  });

  it('a rock is refused in the verb’s words', async () => {
    expect(String(await check('wind', makeStuff(() => new Rock())))).toMatch(/^You can't wind /);
    expect(String(await check('blow', makeStuff(() => new Rock())))).toMatch(/^You can't blow /);
  });

  it('a whistle does not wind', async () => {
    expect(await check('wind', makeStuff(() => new Whistle()))).toBeDefined();
  });
});
