/**
 * SourceTreeApi tests.
 *
 * The Api wraps `node:fs/promises` with a single sandbox root (the
 * `packages/` directory). Tests:
 *
 *   - getSandboxRoot points at a directory named `packages`.
 *   - resolvePath enforces the sandbox boundary, expands `~`,
 *     normalises `..`, treats leading-`/` as sandbox-rooted.
 *   - joinLogical is sandbox-free path arithmetic for the template
 *     tree.
 *   - toDisplayPath inverts resolvePath cleanly.
 *   - exists / isFile / isDir / read / list / write / mkdir / rm /
 *     cp / mv all work against a temp dir under the sandbox root.
 *
 * Mutating ops write into `packages/server/.tmp-source-tree-test/`
 * which is inside the sandbox; the directory is created in the
 * `beforeEach` and torn down in the `afterEach`.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SourceTreeApi,
  SourceTreeSandboxError,
} from '../source-tree';
import { SourceTreeLogic } from '../../platform/idea/api/SourceTreeLogic';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// The Api computes its own sandbox root by walking up to a `packages`
// directory; this test file is itself under that root, so the same walk
// from HERE reaches the same answer.
const SANDBOX_ROOT = findPackagesRoot(HERE);

function findPackagesRoot(start: string): string {
  let dir = start;
  while (path.basename(dir) !== 'packages') {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('test setup: no packages ancestor');
    dir = parent;
  }
  return dir;
}

describe('SourceTreeApi.getSandboxRoot', () => {
  it('returns a directory named "packages"', () => {
    const root = SourceTreeApi.getSandboxRoot();
    expect(path.basename(root)).toBe('packages');
  });

  it('matches the test file\'s own ancestor', () => {
    expect(SourceTreeApi.getSandboxRoot()).toBe(SANDBOX_ROOT);
  });

  it('is memoised — repeated calls return the same value', () => {
    const a = SourceTreeApi.getSandboxRoot();
    const b = SourceTreeApi.getSandboxRoot();
    expect(a).toBe(b);
  });
});

describe('SourceTreeApi.resolvePath', () => {
  it('resolves an absolute (sandbox-rooted) path to its OS-absolute form', () => {
    const out = SourceTreeApi.resolvePath('/', '/server/src');
    expect(out).toBe(path.join(SANDBOX_ROOT, 'server', 'src'));
  });

  it('resolves a relative path against cwd', () => {
    const out = SourceTreeApi.resolvePath('/server', 'src');
    expect(out).toBe(path.join(SANDBOX_ROOT, 'server', 'src'));
  });

  it('expands "~" alone to home', () => {
    const out = SourceTreeApi.resolvePath('/x', '~', { home: '/server' });
    expect(out).toBe(path.join(SANDBOX_ROOT, 'server'));
  });

  it('expands "~/sub" to home/sub', () => {
    const out = SourceTreeApi.resolvePath('/x', '~/src', { home: '/server' });
    expect(out).toBe(path.join(SANDBOX_ROOT, 'server', 'src'));
  });

  it('default home is sandbox root', () => {
    // No `home` option → home defaults to '/'.
    const out = SourceTreeApi.resolvePath('/x', '~');
    expect(out).toBe(SANDBOX_ROOT);
  });

  it('normalises ".." segments relative to cwd', () => {
    // cwd /server/src + ../sub → /server/sub (".." from src lands at server).
    const out = SourceTreeApi.resolvePath('/server/src', '../sub');
    expect(out).toBe(path.join(SANDBOX_ROOT, 'server', 'sub'));
  });

  it('walks ".." up to a sibling at the sandbox root', () => {
    // From /server, "../client" walks to the sandbox root and into client.
    const out = SourceTreeApi.resolvePath('/server', '../client');
    expect(out).toBe(path.join(SANDBOX_ROOT, 'client'));
  });

  it('allows resolving to the sandbox root itself', () => {
    const out = SourceTreeApi.resolvePath('/server', '..');
    expect(out).toBe(SANDBOX_ROOT);
  });

  it('rejects paths that escape the sandbox via ".."', () => {
    expect(() =>
      SourceTreeApi.resolvePath('/server', '../../etc/passwd'),
    ).toThrow(SourceTreeSandboxError);
  });

  it('rejects paths that escape the sandbox from a deep cwd', () => {
    expect(() =>
      SourceTreeApi.resolvePath('/server/src', '../../../../tmp'),
    ).toThrow(/outside the sandbox/);
  });
});

describe('SourceTreeApi.joinLogical', () => {
  it('joins relative paths against cwd', () => {
    expect(SourceTreeApi.joinLogical('/obj', 'Room')).toBe('/obj/Room');
  });

  it('treats input starting with "/" as absolute (logical root)', () => {
    expect(SourceTreeApi.joinLogical('/obj', '/lib/Thing')).toBe(
      '/lib/Thing',
    );
  });

  it('expands "~" with the supplied home', () => {
    expect(
      SourceTreeApi.joinLogical('/x', '~/Thing', { home: '/obj' }),
    ).toBe('/obj/Thing');
  });

  it('expands bare "~" to home', () => {
    expect(SourceTreeApi.joinLogical('/x', '~', { home: '/obj' })).toBe(
      '/obj',
    );
  });

  it('default home is "/"', () => {
    expect(SourceTreeApi.joinLogical('/x', '~')).toBe('/');
  });

  it('normalises ".." segments past the cwd', () => {
    expect(SourceTreeApi.joinLogical('/obj/sub', '../..')).toBe('/');
  });

  it('honours ".." escape even past the logical root — sandbox-free', () => {
    // joinLogical is for virtual paths and DOES NOT enforce a root.
    // Walking up past `/` just lands at `/`.
    expect(SourceTreeApi.joinLogical('/', '..')).toBe('/');
  });

  it('treats cwd "" as "/"', () => {
    expect(SourceTreeApi.joinLogical('', 'x')).toBe('/x');
  });

  it('preserves a non-trivial cwd', () => {
    expect(SourceTreeApi.joinLogical('/a/b', 'c')).toBe('/a/b/c');
  });
});

describe('SourceTreeApi.toDisplayPath', () => {
  it('returns "/" for the sandbox root', () => {
    expect(SourceTreeApi.toDisplayPath(SANDBOX_ROOT)).toBe('/');
  });

  it('returns "/sub/.../" for a path inside the sandbox', () => {
    const inside = path.join(SANDBOX_ROOT, 'server', 'src');
    expect(SourceTreeApi.toDisplayPath(inside)).toBe('/server/src');
  });

  it('rejects a path outside the sandbox', () => {
    expect(() => SourceTreeApi.toDisplayPath('/etc/passwd')).toThrow(
      SourceTreeSandboxError,
    );
  });

  it('round-trips with resolvePath', () => {
    const original = '/server/src/index.ts';
    const resolved = SourceTreeApi.resolvePath('/', original);
    expect(SourceTreeApi.toDisplayPath(resolved)).toBe(original);
  });
});

describe('SourceTreeApi filesystem ops', () => {
  let tempDir: string;
  let tempLogical: string;

  beforeEach(async () => {
    // Inside the sandbox so resolvePath would accept paths here too.
    tempDir = path.join(SANDBOX_ROOT, 'server', `.tmp-st-${Date.now()}`);
    tempLogical = SourceTreeApi.toDisplayPath(tempDir);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('exists / isFile / isDir', () => {
    it('exists returns true for an existing file', async () => {
      const f = path.join(tempDir, 'a.txt');
      await fs.writeFile(f, 'hi');
      expect(await SourceTreeApi.exists(f)).toBe(true);
    });

    it('exists returns false for a missing path', async () => {
      expect(
        await SourceTreeApi.exists(path.join(tempDir, 'nope')),
      ).toBe(false);
    });

    it('isFile returns true only for files', async () => {
      const f = path.join(tempDir, 'a.txt');
      await fs.writeFile(f, 'hi');
      expect(await SourceTreeApi.isFile(f)).toBe(true);
      expect(await SourceTreeApi.isFile(tempDir)).toBe(false);
    });

    it('isFile is false for a missing path', async () => {
      expect(
        await SourceTreeApi.isFile(path.join(tempDir, 'nope')),
      ).toBe(false);
    });

    it('isDir returns true only for directories', async () => {
      const f = path.join(tempDir, 'a.txt');
      await fs.writeFile(f, 'hi');
      expect(await SourceTreeApi.isDir(tempDir)).toBe(true);
      expect(await SourceTreeApi.isDir(f)).toBe(false);
    });

    it('isDir is false for a missing path', async () => {
      expect(
        await SourceTreeApi.isDir(path.join(tempDir, 'nope')),
      ).toBe(false);
    });
  });

  describe('read / list', () => {
    it('read returns the utf-8 file contents', async () => {
      const f = path.join(tempDir, 'a.txt');
      await fs.writeFile(f, 'hello world');
      expect(await SourceTreeApi.read(f)).toBe('hello world');
    });

    it('list enumerates files and directories', async () => {
      await fs.writeFile(path.join(tempDir, 'a.txt'), 'a');
      await fs.writeFile(path.join(tempDir, 'b.txt'), 'b');
      await fs.mkdir(path.join(tempDir, 'sub'));

      const entries = await SourceTreeApi.list(tempDir);
      const byName = new Map(entries.map((e) => [e.name, e]));
      expect(byName.get('a.txt')?.isFile).toBe(true);
      expect(byName.get('b.txt')?.isFile).toBe(true);
      expect(byName.get('sub')?.isDir).toBe(true);
      expect(byName.get('a.txt')?.absolutePath).toBe(
        path.join(tempDir, 'a.txt'),
      );
    });
  });

  describe('write / mkdir / rm / cp / mv', () => {
    it('write creates the file and any missing parent dirs', async () => {
      const target = path.join(tempDir, 'deep', 'nested', 'file.txt');
      await SourceTreeApi.write(target, 'payload');
      expect(await fs.readFile(target, 'utf8')).toBe('payload');
    });

    it('write overwrites an existing file', async () => {
      const f = path.join(tempDir, 'a.txt');
      await SourceTreeApi.write(f, 'first');
      await SourceTreeApi.write(f, 'second');
      expect(await fs.readFile(f, 'utf8')).toBe('second');
    });

    it('mkdir creates a directory (recursive)', async () => {
      const d = path.join(tempDir, 'a', 'b', 'c');
      await SourceTreeApi.mkdir(d);
      expect((await fs.stat(d)).isDirectory()).toBe(true);
    });

    it('mkdir is idempotent on an existing directory', async () => {
      const d = path.join(tempDir, 'dir');
      await SourceTreeApi.mkdir(d);
      await expect(SourceTreeApi.mkdir(d)).resolves.toBeUndefined();
    });

    it('rm deletes a single file', async () => {
      const f = path.join(tempDir, 'a.txt');
      await fs.writeFile(f, 'x');
      await SourceTreeApi.rm(f);
      expect(await SourceTreeApi.exists(f)).toBe(false);
    });

    it('rm with recursive removes a directory tree', async () => {
      const d = path.join(tempDir, 'dir');
      await fs.mkdir(d, { recursive: true });
      await fs.writeFile(path.join(d, 'a.txt'), 'x');
      await SourceTreeApi.rm(d, { recursive: true });
      expect(await SourceTreeApi.exists(d)).toBe(false);
    });

    it('rm with force is silent on missing paths', async () => {
      await expect(
        SourceTreeApi.rm(path.join(tempDir, 'never-existed')),
      ).resolves.toBeUndefined();
    });

    it('cp recursively copies a directory tree', async () => {
      const src = path.join(tempDir, 'src');
      const dst = path.join(tempDir, 'dst');
      await fs.mkdir(src);
      await fs.writeFile(path.join(src, 'a.txt'), 'A');
      await fs.mkdir(path.join(src, 'sub'));
      await fs.writeFile(path.join(src, 'sub', 'b.txt'), 'B');

      await SourceTreeApi.cp(src, dst);

      expect(await fs.readFile(path.join(dst, 'a.txt'), 'utf8')).toBe('A');
      expect(await fs.readFile(path.join(dst, 'sub', 'b.txt'), 'utf8')).toBe(
        'B',
      );
    });

    it('mv renames a file', async () => {
      const src = path.join(tempDir, 'a.txt');
      const dst = path.join(tempDir, 'b.txt');
      await fs.writeFile(src, 'x');
      await SourceTreeApi.mv(src, dst);
      expect(await SourceTreeApi.exists(src)).toBe(false);
      expect(await fs.readFile(dst, 'utf8')).toBe('x');
    });
  });

  describe('integration: resolvePath threaded through ops', () => {
    it('resolvePath → read works for a sandbox-relative file', async () => {
      const f = path.join(tempDir, 'a.txt');
      await fs.writeFile(f, 'payload');
      const resolved = SourceTreeApi.resolvePath(
        tempLogical,
        'a.txt',
      );
      expect(await SourceTreeApi.read(resolved)).toBe('payload');
    });

    it('resolvePath → write creates a file inside the sandbox', async () => {
      const resolved = SourceTreeApi.resolvePath(
        tempLogical,
        'created.txt',
      );
      await SourceTreeApi.write(resolved, 'made');
      expect(await fs.readFile(resolved, 'utf8')).toBe('made');
    });
  });
});

describe('SourceTreeLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('lives at /platform/idea/api/source-tree once the facade has materialized it', () => {
    // A facade call lazily creates the logic singleton.
    SourceTreeApi.getSandboxRoot();
    const logic = StuffApi.findByTemplatePath('/platform/idea/api/source-tree');
    expect(logic).toBeDefined();
    expect(StuffApi.findByPathGlob('/platform/idea/api/*')).toContain(logic);
  });

  it('denies a direct logic-method call from a non-SourceTreeApi caller', () => {
    SourceTreeApi.getSandboxRoot();
    const logic = StuffApi.findByTemplatePath<SourceTreeLogic>(
      '/platform/idea/api/source-tree'
    );
    expect(logic).toBeDefined();
    // The test module is not `mud/api/source-tree#SourceTreeApi`, so the
    // FromModule gate on the logic's own methods denies the call.
    expect(() => logic!.getSandboxRoot()).toThrow(SecurityError);
  });
});
