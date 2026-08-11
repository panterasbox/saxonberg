/**
 * Parser-indirection tests.
 *
 * Covers the dispatcher's parametric-over-parser contract:
 *   - default `msh` parser resolves and parses a normal command
 *   - parser specs reject malformed inputs (missing module, bare
 *     name with `/`, etc.)
 *   - the dispatcher dispatches on `parsed`, `bound`, and `error`
 *     result kinds
 */

import "../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname, resolve as resolvePath } from 'path';
import { CommandApi } from '../command';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MUD_ROOT = resolvePath(__dirname, '../..');

describe('CommandApi.resolveParser', () => {
  it('resolves the default `msh` parser by bare name', async () => {
    const parser = await CommandApi.resolveParser('msh');
    expect(parser.name).toBe('msh');
    expect(typeof parser.parse).toBe('function');
  });

  it('resolves an absolute /-rooted spec', async () => {
    const parser = await CommandApi.resolveParser('/lib/command/parsers/msh');
    expect(parser.name).toBe('msh');
  });

  it('rejects a relative-path spec', async () => {
    await expect(
      CommandApi.resolveParser('./parsers/msh')
    ).rejects.toThrow(/bare name or start with/);
  });

  it('throws when the file does not exist', async () => {
    await expect(CommandApi.resolveParser('nonexistent')).rejects.toThrow(
      /could not be loaded/
    );
  });

  it('throws when the module default-export is not a Parser', async () => {
    // Use a non-parser module path. We point at a known TS file that
    // doesn't default-export a parser shape.
    await expect(
      CommandApi.resolveParser('/lib/command/validators/mustBeInLocation')
    ).rejects.toThrow(/must default-export an object with \{ name, parse \}/);
    void MUD_ROOT;
  });
});

describe('msh parser', () => {
  it('produces a `parsed` result for normal input', async () => {
    const msh = await CommandApi.resolveParser('msh');
    const r = await msh.parse('look sword', {} as never);
    expect(r.parsed).toBeDefined();
    expect(r.parsed?.verb).toBe('look');
  });

  it('produces an `error` result for empty input', async () => {
    const msh = await CommandApi.resolveParser('msh');
    const r = await msh.parse('', {} as never);
    expect(r.error).toMatch(/No command entered/);
  });

  it('produces an `error` result on the pipe-NYI break', async () => {
    const msh = await CommandApi.resolveParser('msh');
    const r = await msh.parse('look | look', {} as never);
    expect(r.error).toMatch(/piping is not yet implemented/);
  });
});
