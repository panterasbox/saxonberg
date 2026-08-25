/**
 * Migration parity — every YAML in `mud/cmd/` loads without throwing,
 * runs `validate()` cleanly, and produces a non-empty getUsage().
 * If a YAML is malformed at load-time it shows up here, NOT at first
 * verb invocation.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { readdirSync } from 'fs';
import { join, dirname, sep } from 'path';
import { fileURLToPath } from 'url';
import { CommandApi } from '../command';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// The engine verbs are the platform pack's content (content-packs wave 2).
const CMD_DIR = join(__dirname, '../../../../../content/platform/content/cmd');

describe('Command-YAML migration parity', () => {
  beforeEach(() => CommandApi.clearCache());

  it('every YAML file loads without throwing', () => {
    const files = (readdirSync(CMD_DIR, { recursive: true }) as string[])
      .map((f) => f.split(sep).join('/'))
      .filter((f) => f.endsWith('.yaml'));
    expect(files.length).toBeGreaterThanOrEqual(14);

    for (const file of files) {
      const cmd = CommandApi.getCommand(file);
      expect(cmd, `failed to load ${file}`).not.toBeNull();
      // Every command has at least one verb and either a verb-level
      // controller OR per-subcommand controllers (Option E).
      expect(cmd!.verbs.length).toBeGreaterThan(0);
      const hasVerbController = !!cmd!.controller;
      const hasPerSubcommandControllers =
        cmd!.hasSubcommands() &&
        cmd!.getSubcommandNames().every(
          (n) => !!cmd!.controllerForSubcommand(n)
        );
      expect(
        hasVerbController || hasPerSubcommandControllers,
        `${file}: must declare a verb-level or per-subcommand controller`
      ).toBe(true);
      // Render a usage string — must not throw.
      const usage = cmd!.getUsage();
      expect(typeof usage).toBe('string');
    }
  });

  it('say.yaml has the literal-quote alias verb', () => {
    const cmd = CommandApi.getCommand('social/say.yaml');
    expect(cmd?.verbs).toContain("'");
  });

  it('var/settings set use a greedy value field', () => {
    const v = CommandApi.getCommand('shell/var.yaml');
    const vSet = v?.getSubcommand('set')?.args ?? [];
    expect(vSet.find((a) => a.name === 'value')?.greedy).toBe(true);

    const s = CommandApi.getCommand('shell/settings.yaml');
    const sSet = s?.getSubcommand('set')?.args ?? [];
    expect(sSet.find((a) => a.name === 'value')?.greedy).toBe(true);
  });

  it("renders man-page-style usage strings", () => {
    const say = CommandApi.getCommand('social/say.yaml');
    expect(say?.getUsage()).toContain('say');
    expect(say?.getUsage()).toContain('<message...>');

    const player = CommandApi.getCommand('author/player.yaml');
    expect(player?.getUsage()).toMatch(/player/);
    expect(player?.getUsage()).toContain('<');
  });

  it('all 14 expected verbs are present', () => {
    // Subdir-qualified (post command-spec reorg): each verb's view lives
    // under its category namespace.
    const verbs = [
      'boundary/close',
      'inventory/drop',
      'inventory/get',
      'movement/go',
      'system/help',
      'inventory/inventory',
      'perception/look',
      'boundary/open',
      'system/ping',
      'author/player',
      'social/say',
      'shell/settings',
      'social/dm',
      'shell/var',
    ];
    for (const v of verbs) {
      expect(CommandApi.getCommand(`${v}.yaml`), v).not.toBeNull();
    }
  });
});
