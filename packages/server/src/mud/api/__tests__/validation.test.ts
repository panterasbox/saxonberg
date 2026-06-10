/**
 * Validator-resolution tests on CommandApi — path conventions,
 * dynamic-import wiring, and end-to-end boot preload.
 */

import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname, resolve as resolvePath } from 'path';
import { CommandApi } from '../command';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MUD_ROOT = resolvePath(__dirname, '../..');

describe('CommandApi.resolveValidator', () => {
  it('resolves an absolute /-rooted spec against src/mud/', async () => {
    const fn = await CommandApi.resolveValidator(
      '/lib/command/validators/mustBeVisible',
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
      '../validators/mustBeVisible',
      yamlPath
    );
    expect(typeof fn).toBe('function');
  });

  it('rejects bare names', async () => {
    await expect(
      CommandApi.resolveValidator(
        'mustBeVisible',
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
    const get = CommandApi.getCommand('inventory/get.yaml');
    const arg = get?.args[0];
    expect(arg?._resolvedValidators).toBeDefined();
    expect(arg?._resolvedValidators?.length).toBe(3);
    expect(typeof arg?._resolvedValidators?.[0]).toBe('function');
  });
});
