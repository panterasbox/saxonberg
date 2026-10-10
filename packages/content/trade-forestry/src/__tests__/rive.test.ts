/**
 * `rive` — the froe's verb, and the rows and statics it rides on.
 *
 *  1. through the BINDER: the target, the `into` word and the froe, the
 *     froe defaulted by CAPABILITY (a froe is a `Tool` row, never a class);
 *  2. the affordances: the bole affords riving as it affords felling, and
 *     a billet affords riving — while still offering the kernel's `fit`
 *     (base-class statics SHADOW, so `Timber`'s peers are carried);
 *  3. the billet row weighs what the arithmetic divides by: one length off
 *     a bole is eight billets.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import { CommandLineApi } from '@saxonberg/server/mud/api/command-line';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type Location from '@saxonberg/server/mud/lib/stuff/Location';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import Timber from '@saxonberg/server/mud/platform/thing/Timber';
import Bole, { TIMBER_MASS_KG } from '../thing/Bole';
import Billet from '../thing/Billet';
import { BILLET_KG } from '../idea/cmd/forestry/RiveController';

const VIEW = fileURLToPath(
  new URL('../../content/trade/forestry/cmd/forestry/rive.yaml', import.meta.url),
);
const BILLET_ROW = fileURLToPath(
  new URL('../../content/trade/forestry/thing/billet.yaml', import.meta.url),
);
const RIVE = 'trade/forestry/cmd/forestry/rive.yaml';

const ctx = {
  commandGiver: {} as Stuff & CommandGiver,
  location: {} as Location,
};

function bind(text: string): Record<string, unknown> {
  const def = CommandDefinition.fromYaml(readFileSync(VIEW, 'utf8'), RIVE);
  const parsed = CommandLineApi.parsePipeline(text).commands[0]!;
  const r = CommandApi.assemble(parsed, def, ctx);
  if (!('model' in r)) throw new Error(`"${text}" did not bind: ${JSON.stringify(r)}`);
  return r.model as Record<string, unknown>;
}

const FROE = 'reachable:[capability.riving]';

describe('rive — through the binder', () => {
  it('`rive bole` binds the target and defaults the froe by CAPABILITY', () => {
    const m = bind('rive bole');
    expect(m.target).toBe('bole');
    expect(m.froe).toBe(FROE);
    expect(m.into).toBeUndefined();
  });

  it('⭐ `rive the oak billet into blank` — article, two words, and the choice', () => {
    const m = bind('rive the oak billet into blank');
    expect(m.target).toBe('the oak billet');
    expect(m.into).toBe('blank');
    expect(m.froe).toBe(FROE);
  });

  it('`rive billet with the froe` names the froe', () => {
    const m = bind('rive billet with the froe');
    expect(m.target).toBe('billet');
    expect(m.froe).toBe('the froe');
  });

  it('⚠ `split` is NOT an alias — a ground protocol owns that word', () => {
    const view = YAML.parse(readFileSync(VIEW, 'utf8')) as { verbs: string[] };
    expect(view.verbs).toEqual(['rive']);
  });
});

describe('rive — who affords it', () => {
  it('⭐ the bole affords riving as it affords felling', () => {
    expect(Bole.commandContributions.self).toContain('trade/forestry/cmd/forestry/fell.yaml');
    expect(Bole.commandContributions.self).toContain(RIVE);
  });

  it('⭐ a billet affords riving — and still offers the kernel `fit`', () => {
    expect(Billet.commandContributions.self).toContain(RIVE);
    const peers = Billet.commandContributions.peers ?? [];
    expect(peers).toContain(RIVE);
    for (const v of Timber.commandContributions.peers ?? []) expect(peers).toContain(v);
  });
});

describe('the billet row', () => {
  it('is riven, green Timber, and weighs what the arithmetic divides by', () => {
    const row = YAML.parse(readFileSync(BILLET_ROW, 'utf8')) as {
      class: string;
      data: Record<string, unknown>;
    };
    expect(row.class).toBe('/trade/forestry/thing/Billet');
    expect(row.data.constructionForm).toBe('riven');
    expect(row.data.seasonedFraction).toBe(0);
    expect(row.data.mass).toBe(BILLET_KG);
    // One length off a bole is eight billets.
    expect(Math.floor(TIMBER_MASS_KG / BILLET_KG)).toBe(8);
  });
});
