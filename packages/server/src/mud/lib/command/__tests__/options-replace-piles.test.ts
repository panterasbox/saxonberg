/**
 * ⭐ Options replace preposition piles, with no old form kept
 * (controllers-are-io D9): the shape each verb's line binds, against the shipped
 * view. A controller test is handed a model and cannot see any of this.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { CommandApi } from '../../../api/command';
import { CommandLineApi } from '../../../api/command-line';
import { CommandDefinition } from '../CommandDefinition';
import type { CommandGiver } from '../CommandGiver';
import type { Stuff } from '../../stuff/Stuff';
import type Place from '../../stuff/Place';

const CMD = join(
  dirname(fileURLToPath(import.meta.url)),
  '..', '..', '..', '..', '..', '..',
  'content', 'platform', 'content', 'platform', 'cmd',
);

function bind(view: string, line: string): Record<string, unknown> | { error: string } {
  const file = join(CMD, view);
  const def = CommandDefinition.fromYaml(readFileSync(file, 'utf-8'), file);
  const parsed = CommandLineApi.parsePipeline(line).commands[0]!;
  const built = CommandApi.assemble(parsed, def, {
    commandGiver: {} as Stuff & CommandGiver,
    location: {} as Place,
  });
  if ('error' in built) return { error: String(built.error) };
  return built.model as unknown as Record<string, unknown>;
}

describe('harvest', () => {
  it('--with and --at land on their fields', () => {
    expect(bind('inventory/harvest.yaml', 'harvest wheat --at "the gate end" --with sickle')).toMatchObject({
      target: 'wheat',
      part: 'the gate end',
      tool: 'sickle',
    });
  });
  it('the tool still has its default', () => {
    expect(bind('inventory/harvest.yaml', 'harvest wheat')).toMatchObject({
      tool: 'reachable:[capability.reaping],reachable:[capability.cutting]',
    });
  });
  it('⛔ the old form binds nothing', () => {
    expect(bind('inventory/harvest.yaml', 'harvest wheat with sickle')).toHaveProperty('error');
  });
});

describe('plant', () => {
  it('in <pot> stays a preposition; --at and --with are options', () => {
    expect(bind('inventory/plant.yaml', 'plant seed in pot')).toMatchObject({ seed: 'seed', pot: 'pot' });
    expect(bind('inventory/plant.yaml', 'plant wheat --at "the gate end" --with drill')).toMatchObject({
      part: 'the gate end',
      drill: 'drill',
    });
  });
});

describe('treat', () => {
  it('--with and --for', () => {
    expect(bind('medical/treat.yaml', 'treat ann --with bandage --for salmonellosis')).toMatchObject({
      target: 'ann',
      with: 'bandage',
      for: 'salmonellosis',
    });
  });
  it('⛔ the old form binds nothing', () => {
    expect(bind('medical/treat.yaml', 'treat ann with bandage')).toHaveProperty('error');
  });
});

describe('carve', () => {
  it('from <stock> stays; --with, --of and --for are options', () => {
    expect(bind('crafting/carve.yaml', 'carve pattern from board --of sword --for bronze --with billhook')).toMatchObject({
      thing: 'pattern',
      stock: 'board',
      of: 'sword',
      for: 'bronze',
      knife: 'billhook',
    });
  });
});

describe('order', () => {
  it('the subject is a view arg', () => {
    expect(bind('retail/order.yaml', 'order repair for sword')).toMatchObject({
      cocktail: 'repair',
      subject: 'sword',
    });
    expect(bind('retail/order.yaml', 'order "old fashioned" with bombay')).toMatchObject({
      cocktail: 'old fashioned',
      brand: 'bombay',
    });
  });
});
