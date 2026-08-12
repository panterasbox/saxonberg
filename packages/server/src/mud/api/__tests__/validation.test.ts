/**
 * Validator-resolution tests on CommandApi — path conventions,
 * dynamic-import wiring, and end-to-end boot preload.
 */

import "../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname, resolve as resolvePath } from 'path';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
  type CommandValidator,
} from '../command';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import Location from '../../lib/stuff/Location';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MUD_ROOT = resolvePath(__dirname, '../..');

describe('CommandApi.resolveValidator', () => {
  it('resolves an absolute /-rooted spec against src/mud/', async () => {
    const fn = await CommandApi.resolveValidator(
      '/lib/command/validators/mustBeInLocation',
      // YAML path is irrelevant for absolute specs.
      resolvePath(MUD_ROOT, 'cmd/look.yaml')
    );
    expect(typeof fn).toBe('function');
    const err = fn('not-a-stuff', 'target', {} as never);
    expect(err).toMatch(/must be an object/);
  });

  it('resolves a relative spec against the YAML directory', async () => {
    const yamlPath = resolvePath(
      MUD_ROOT,
      'lib/command/__tests__/synthetic.yaml'
    );
    const fn = await CommandApi.resolveValidator(
      '../validators/mustBeInLocation',
      yamlPath
    );
    expect(typeof fn).toBe('function');
  });

  it('rejects bare names', async () => {
    await expect(
      CommandApi.resolveValidator(
        'mustBeInLocation',
        resolvePath(MUD_ROOT, 'cmd/x.yaml')
      )
    ).rejects.toThrow(/must start with '\/' .* or '\.\/'/);
  });

  it('rejects package-style specs', async () => {
    await expect(
      CommandApi.resolveValidator(
        '@saxonberg/validators/foo',
        resolvePath(MUD_ROOT, 'cmd/x.yaml')
      )
    ).rejects.toThrow(/must start with/);
  });

  it('throws when the file does not exist', async () => {
    await expect(
      CommandApi.resolveValidator(
        '/lib/command/validators/doesNotExist',
        resolvePath(MUD_ROOT, 'cmd/x.yaml')
      )
    ).rejects.toThrow(/could not be loaded/);
  });
});

describe('CommandApi.preloadAll', () => {
  it('loads every YAML and resolves validators', async () => {
    CommandApi.clearCache();
    const result = await CommandApi.preloadAll();
    expect(result.failed).toEqual([]);
    expect(result.loaded).toBeGreaterThan(0);

    // get.yaml's `targets` arg should now have resolved validators.
    // ⭐ TWO, from two sources: the slot's `requires:` declaration is
    // synthesised into a validator and PREPENDED, then its one authored
    // `validators:` entry follows. A count that only matched the
    // authored list would pass while the declaration did nothing.
    const get = CommandApi.getCommand('inventory/get.yaml');
    const arg = get?.args[0];
    expect(arg?.requires).toEqual(['VisibleMixin', 'ContainableMixin']);
    expect(arg?.validators).toEqual([
      '/lib/command/validators/mustBeInLocation',
    ]);
    expect(arg?._resolvedValidators).toBeDefined();
    expect(arg?._resolvedValidators?.length).toBe(2);
    expect(typeof arg?._resolvedValidators?.[0]).toBe('function');
  });
});

describe('subcommand-level validators', () => {
  it('preloadAll resolves them (office assign/vacate carry one; the public list none)', async () => {
    CommandApi.clearCache();
    const result = await CommandApi.preloadAll();
    expect(result.failed).toEqual([]);
    const office = CommandApi.getCommand('governance/office.yaml');
    expect(office?.getSubcommand('assign')?._resolvedValidators?.length).toBe(
      1,
    );
    expect(office?.getSubcommand('vacate')?._resolvedValidators?.length).toBe(
      1,
    );
    expect(typeof office?.getSubcommand('assign')?._resolvedValidators?.[0]).toBe(
      'function',
    );
    // The public roster subcommand is ungated.
    expect(
      office?.getSubcommand('list')?._resolvedValidators,
    ).toBeUndefined();
  });

  it('runValidators fires the INVOKED subcommand validator and skips it for other subcommands', () => {
    const cmd = CommandDefinition.fromYaml(
      'verbs: [gov-test]\n' +
        'controller: NoopController\n' +
        'description: stub\n' +
        'subcommands:\n' +
        '  gated:\n' +
        '    description: gated\n' +
        '  open:\n' +
        '    description: open\n',
      '<test>',
    );
    // A deterministic validator: deny unless the preloaded boolean is true.
    const gate: CommandValidator<boolean> = (_ctx, allowed) =>
      allowed ? undefined : 'subcommand-denied';
    // `_resolvedValidators` is the type-erased `CommandValidator[]` (the
    // resolver erases the preload's `<boolean>` exactly as here).
    cmd.getSubcommand('gated')!._resolvedValidators = [
      gate as unknown as CommandValidator,
    ];

    const loc = makeStuff(() => new Location());
    const mkCtx = (): CommandContext =>
      CommandApi.createCommandContext({
        commandGiver: loc as never,
        location: loc as never,
        commandText: 'gov-test',
        executionId: 'test',
        commandId: 'test',
        verb: 'gov-test',
        command: cmd,
      });

    // Invoked + preload false → denied, with a subcommand-scoped note.
    const denyCtx = mkCtx();
    expect(
      CommandApi.runValidators(
        { subcommand: 'gated' } as CommandModel,
        denyCtx,
        new Map([[gate as never, false]]),
      ),
    ).toEqual({ result: 'failed' });
    expect(denyCtx.getNotes()).toContainEqual(
      expect.objectContaining({
        kind: 'validator-failed',
        validator: 'subcommand:gated',
        detail: 'subcommand-denied',
      }),
    );

    // Invoked + preload true → allowed.
    expect(
      CommandApi.runValidators(
        { subcommand: 'gated' } as CommandModel,
        mkCtx(),
        new Map([[gate as never, true]]),
      ),
    ).toEqual({ ok: true });

    // A DIFFERENT subcommand never fires the gated validator.
    expect(
      CommandApi.runValidators(
        { subcommand: 'open' } as CommandModel,
        mkCtx(),
        new Map([[gate as never, false]]),
      ),
    ).toEqual({ ok: true });
  });
});
