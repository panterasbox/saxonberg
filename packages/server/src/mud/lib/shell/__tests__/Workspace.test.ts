/**
 * WorkspaceMixin tests — cwd round-trip, mirror semantics, synthetic
 * var resolution, the `workspace.tree` setting, and the
 * `pickTree` / `getHome` / `getPageSize` accessors that controllers
 * call instead of importing helpers.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Idea } from '../../stuff/Idea';
import {
  WorkspaceMixin,
  type Workspace,
} from '../Workspace';
import { EnvironmentMixin } from '../Environment';
import { ShellApi } from '../../../api/shell';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';
import { StuffApi } from '../../../api/stuff';

class TestHost extends WorkspaceMixin(EnvironmentMixin(Idea)) {
  constructor() {
    super();
  }
}

describe('WorkspaceMixin', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  describe('cwd state', () => {
    it('defaults both cwds to "/"', () => {
      const host = makeStuff(() => new TestHost());
      expect(host.getCwd('content')).toBe('/');
      expect(host.getCwd('source')).toBe('/');
      expect(host.getActiveCwd()).toBe('/');
    });

    it('round-trips set / get per tree independently', () => {
      const host = makeStuff(() => new TestHost());
      host.setCwd('content', '/obj');
      host.setCwd('source', '/server/src');
      expect(host.getCwd('content')).toBe('/obj');
      expect(host.getCwd('source')).toBe('/server/src');
    });

    it('empty-string assignment normalises to the default home', () => {
      const host = makeStuff(() => new TestHost());
      host.setCwd('content', '');
      expect(host.getCwd('content')).toBe('/');
    });

    it('mirrorCwd copies the active tree cwd to the other tree', () => {
      const host = makeStuff(() => new TestHost());
      host.setCwd('content', '/lib/spatial');
      host.setCwd('source', '/elsewhere');
      host.mirrorCwd();
      expect(host.getCwd('source')).toBe('/lib/spatial');
      expect(host.getCwd('content')).toBe('/lib/spatial');
    });
  });

  describe('workspace.tree setting', () => {
    it('defaults to "content"', () => {
      const host = makeStuff(() => new TestHost());
      expect(host.getTreeMode()).toBe('content');
      expect(host.getDefaultTree()).toBe('content');
    });

    it('mode "source" makes the source tree active', () => {
      const host = makeStuff(() => new TestHost());
      host.setSetting('workspace.tree', 'source', host);
      host.setCwd('source', '/server/src');
      expect(host.getDefaultTree()).toBe('source');
      expect(host.getActiveCwd()).toBe('/server/src');
    });

    it('mode "mirror" reads default to content but writes fan out', () => {
      const host = makeStuff(() => new TestHost());
      host.setSetting('workspace.tree', 'mirror', host);
      expect(host.getTreeMode()).toBe('mirror');
      // Reads default to content (canonical when both cwds match).
      expect(host.getDefaultTree()).toBe('content');
      // Writes through setCwdAuto sync both cwds.
      host.setCwdAuto('content', '/synced');
      expect(host.getCwd('content')).toBe('/synced');
      expect(host.getCwd('source')).toBe('/synced');
    });

    it('non-mirror mode: setCwdAuto only touches the named tree', () => {
      const host = makeStuff(() => new TestHost());
      // Default is content, not mirror.
      host.setCwdAuto('content', '/just-content');
      expect(host.getCwd('content')).toBe('/just-content');
      expect(host.getCwd('source')).toBe('/');
    });
  });

  describe('host.pickTree(flags)', () => {
    it('explicit --source flag wins', () => {
      const host = makeStuff(() => new TestHost());
      expect(host.pickTree({ source: true })).toBe('source');
    });

    it('explicit --content flag wins over default', () => {
      const host = makeStuff(() => new TestHost());
      host.setSetting('workspace.tree', 'source', host);
      expect(host.pickTree({ content: true })).toBe('content');
    });

    it('--source beats --content when both somehow set', () => {
      const host = makeStuff(() => new TestHost());
      expect(host.pickTree({ content: true, source: true })).toBe(
        'source',
      );
    });

    it('falls back to host.getDefaultTree when no flag', () => {
      const host = makeStuff(() => new TestHost());
      host.setSetting('workspace.tree', 'source', host);
      expect(host.pickTree({})).toBe('source');
    });

    it('mirror mode resolves to content for read ops', () => {
      const host = makeStuff(() => new TestHost());
      host.setSetting('workspace.tree', 'mirror', host);
      expect(host.pickTree({})).toBe('content');
    });
  });

  describe('host.getHome() / host.getPageSize()', () => {
    it('getHome reads workspace.home with the schema default', () => {
      const host = makeStuff(() => new TestHost());
      expect(host.getHome()).toBe('/');
      host.setSetting('workspace.home', '/home/me', host);
      expect(host.getHome()).toBe('/home/me');
    });

    it('getPageSize reads workspace.pageSize with the schema default', () => {
      const host = makeStuff(() => new TestHost());
      expect(host.getPageSize()).toBe(25);
      host.setSetting('workspace.pageSize', 100, host);
      expect(host.getPageSize()).toBe(100);
    });
  });

  describe('synthetic vars', () => {
    it('$PWD reads the active tree cwd', () => {
      const host = makeStuff(() => new TestHost());
      host.setCwd('content', '/obj');
      const expanded = ShellApi.expandVariables('cd $PWD/Avatar', host);
      expect(expanded).toBe('cd /obj/Avatar');
    });

    it('$CPWD and $SPWD address each tree explicitly', () => {
      const host = makeStuff(() => new TestHost());
      host.setCwd('content', '/world');
      host.setCwd('source', '/server');
      expect(ShellApi.expandVariables('$CPWD', host)).toBe('/world');
      expect(ShellApi.expandVariables('$SPWD', host)).toBe('/server');
    });

    it('$HOME pulls from workspace.home setting', () => {
      const host = makeStuff(() => new TestHost());
      expect(ShellApi.expandVariables('$HOME', host)).toBe('/');
      host.setSetting('workspace.home', '/home/me', host);
      expect(ShellApi.expandVariables('$HOME', host)).toBe('/home/me');
    });

    it('synthetic-var precedence: $PWD wins over a stored var of the same name', () => {
      const host = makeStuff(() => new TestHost());
      host.setCwd('content', '/active');
      host.sessionStore.PWD = '/from-stored-var';
      expect(ShellApi.expandVariables('$PWD', host)).toBe('/active');
    });
  });

  describe('schema discovery', () => {
    it('exposes workspace.* settings through EnvironmentMixin', () => {
      const host = makeStuff(() => new TestHost());
      const keys = host.listSettings().map((row) => row.schema.key).sort();
      expect(keys).toContain('workspace.tree');
      expect(keys).toContain('workspace.home');
      expect(keys).toContain('workspace.editor');
      expect(keys).toContain('workspace.pageSize');
    });

    it('workspace.pageSize default is 25', () => {
      const host = makeStuff(() => new TestHost());
      expect(host.getSetting<number>('workspace.pageSize')).toBe(25);
    });

    it('workspace.tree rejects unrecognised values', () => {
      const host = makeStuff(() => new TestHost());
      expect(() =>
        host.setSetting('workspace.tree', 'not-a-tree', host),
      ).toThrow();
    });
  });

  describe('mixin predicate', () => {
    it('MixinApi.isWorkspace narrows the host', () => {
      const host = makeStuff(() => new TestHost());
      expect(MixinApi.isWorkspace(host)).toBe(true);
      if (MixinApi.isWorkspace(host)) {
        const w: Workspace = host;
        expect(w.getActiveCwd()).toBe('/');
      }
    });
  });
});
