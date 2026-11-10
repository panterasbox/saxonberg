/**
 * ⭐ Several views of one verb, against the **real shipped YAML** — which
 * view a typed line lands on (controller-liquidity W7a). The dispatcher
 * tries the views in the order their host contributes them; a SHAPE error
 * moves on, and so does an unknown subcommand word when a later view
 * exists. This walks `assemble` the same way, so a view edited into
 * swallowing another's line fails here.
 */

import '../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { CommandApi } from '../command';
import { CommandLineApi } from '../command-line';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import { Idea } from '../../lib/stuff/Idea';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { CommandGiverMixin } from '../../lib/command/CommandGiver';
import { FocusedMixin } from '../../lib/command/Focused';
import { NamedMixin } from '../../lib/description/Named';
import { PerceptibleMixin } from '../../lib/description/Perceptible';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { CommandGiver } from '../../lib/command/CommandGiver';

class TestGiver extends ContainerMixin(
  ContainableMixin(FocusedMixin(CommandGiverMixin(NamedMixin(PerceptibleMixin(Idea))))),
) {}

function view(rel: string): CommandDefinition {
  const path = fileURLToPath(
    new URL(`../../../../../content/platform/content/platform/cmd/${rel}`, import.meta.url),
  );
  return CommandDefinition.fromYaml(readFileSync(path, 'utf8'), `platform/cmd/${rel}`);
}

/** The file the line lands on, or `null` when every view refuses it. */
function landsOn(files: string[], line: string): string | null {
  const giver = makeStuff(() => new TestGiver()) as unknown as Stuff & CommandGiver;
  const parsed = CommandLineApi.parsePipeline(line).commands[0]!;
  const views = files.map(view);
  for (let i = 0; i < views.length; i++) {
    const built = CommandApi.assemble(parsed, views[i]!, { commandGiver: giver, location: null });
    if (!('error' in built)) return files[i]!;
    if (built.error === 'shape') continue;
    if (built.error === 'unknown-subcommand' && i < views.length - 1) continue;
    return null;
  }
  return null;
}

describe('tune — a list with subcommands, and two shapes', () => {
  const TUNE = ['stream/tune.yaml', 'stream/tune-follow.yaml', 'stream/tune-post.yaml'];
  it.each([
    ['tune', 'stream/tune.yaml'],
    ['tune list', 'stream/tune.yaml'],
    ['tune off shroud', 'stream/tune.yaml'],
    ['tune who shroud --twitch', 'stream/tune.yaml'],
    ['tune shroud --twitch', 'stream/tune-follow.yaml'],
    ['tune shroud --twitch hello there', 'stream/tune-post.yaml'],
  ])('%s → %s', (line, file) => {
    expect(landsOn(TUNE, line)).toBe(file);
  });
});

describe('watch — horizon and off, and two shapes by `on`', () => {
  const WATCH = ['stream/watch.yaml', 'stream/watch-stream.yaml', 'stream/watch-on.yaml'];
  it.each([
    ['watch horizon', 'stream/watch.yaml'],
    ['watch off', 'stream/watch.yaml'],
    ['watch off on tv', 'stream/watch.yaml'],
    ['watch shroud --twitch', 'stream/watch-stream.yaml'],
    ['watch shroud --twitch on tv', 'stream/watch-on.yaml'],
  ])('%s → %s', (line, file) => {
    expect(landsOn(WATCH, line)).toBe(file);
  });
  it('an unknown second word is refused by every view', () => {
    expect(landsOn(WATCH, 'watch shroud tv')).toBeNull();
  });
});
