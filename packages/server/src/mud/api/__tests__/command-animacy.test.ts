import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import requiresAnimate from '../../lib/command/validators/requiresAnimate';
import type { CommandContext } from '../command';
import { StuffApi } from '../stuff';
import { Species } from '../../lib/species/Species';
import { Clade } from '../../lib/species/Clade';
import { Character } from '../../lib/character/Character';
import { Idea } from '../../lib/stuff/Idea';
import { Location } from '../../lib/stuff/Location';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

class TestCharacter extends Character {}

function withTemplatePath<T extends { templatePath: string | null }>(
  obj: T,
  path: string
): T {
  obj.templatePath = path;
  StuffApi.unregister(obj as never);
  StuffApi.register(obj as never);
  return obj;
}

function makeContext(
  giver: import('../../lib/stuff/Stuff').Stuff
): CommandContext {
  // Minimal context — the requiresAnimate validator only reads
  // `commandGiver`. Other fields are set to plausible-but-unused values
  // so the type checks.
  const location = makeStuff(() => new Location());
  return {
    commandGiver: giver as CommandContext['commandGiver'],
    location: location as CommandContext['location'],
    commandText: '',
    executionId: 'test-exec',
    commandId: 'test-cmd',
    verb: 'test',
    command: undefined as unknown as CommandContext['command'],
  };
}

function setupAnimaliaCharacter(): TestCharacter {
  const animalia = withTemplatePath(
    makeStuff(() => new Clade()),
    '/lib/species/animalia'
  );
  animalia.setName('Animalia');
  animalia.setRank('kingdom');

  const sapiens = withTemplatePath(
    makeStuff(() => new Species()),
    '/lib/species/animalia/.../sapiens'
  );
  const character = makeStuff(() => new TestCharacter());
  character.setSpecies(sapiens);
  character.setLifecycleState('alive');
  return character;
}

describe('requiresAnimate validator', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  it('passes for an alive Animalia organism', () => {
    const character = setupAnimaliaCharacter();
    expect(requiresAnimate(makeContext(character))).toBeUndefined();
  });

  it('rejects a dead Animalia organism with a state-aware message', () => {
    const character = setupAnimaliaCharacter();
    character.setLifecycleState('dead');
    const err = requiresAnimate(makeContext(character));
    expect(err).toBeDefined();
    expect(err).toMatch(/dead/);
    expect(err).toMatch(/not currently animate/);
  });

  it('rejects an undead Animalia? actually undead is animate', () => {
    const character = setupAnimaliaCharacter();
    character.setLifecycleState('undead');
    expect(requiresAnimate(makeContext(character))).toBeUndefined();
  });

  it('rejects a non-Organism giver entirely', () => {
    const idea = makeStuff(() => new Idea());
    const err = requiresAnimate(makeContext(idea));
    expect(err).toBeDefined();
  });

  it('rejects an Organism with no species set', () => {
    const character = makeStuff(() => new TestCharacter());
    character.setLifecycleState('alive');
    // No species set — getKingdom returns null → isAnimate false.
    const err = requiresAnimate(makeContext(character));
    expect(err).toBeDefined();
  });
});
