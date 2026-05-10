/**
 * WorkspaceMixin — the avatar's working position in the content and
 * source stores, plus the settings keyspace that customises the
 * workspace verbs.
 *
 * The two trees are:
 *
 *   - **content** — the authored game world. Path-shaped templates
 *     persisted in the `domain` Mongo collection, cloned at runtime
 *     into Stuff. Identifiers like `/obj/Avatar/foo`.
 *   - **source** — the engine source code. The filesystem under
 *     the project's `packages/`. Identifiers like
 *     `/server/src/mud/api/stuff.ts` (rooted at the sandbox root).
 *
 * "Templates are code too" — the `template` / `code` split would be
 * lossy, so the substrate uses content / source instead. Any verb
 * that picks a tree per call accepts `-c` / `--content` and `-s` /
 * `--source`; the default comes from the `workspace.tree` setting
 * (`content` / `source` / `mirror`).
 *
 * Two cwds live as mixin-instance state because they are
 * *operational* — what the avatar is currently doing — not
 * configuration. The settings keyspace (`workspace.*`) carries the
 * customisation knobs (default tree, home path, page size). The
 * synthetic vars (`$PWD`, `$CPWD`, `$SPWD`, `$HOME`) are read-only
 * views of the same state, surfaced through `EnvironmentMixin`'s
 * shell-var pipeline.
 *
 * Mirror mode: when `workspace.tree === 'mirror'`, every `setCwd(...)`
 * with no explicit single-tree intent updates both cwds. Reads still
 * default to content (the path shape is the same in both trees, and
 * one of them has to be canonical). Players in mirror mode can
 * still cross over per-call with `-s` / `-c`.
 *
 * Composition: applied to `ShelledCharacter` after `EnvironmentMixin`
 * and `AliasMixin` (so the `workspace.*` settings register through
 * EnvironmentMixin's schema-on-mixin walk).
 */

import type { MixinConstructor } from '../mixin';
import type { CommandContributions } from '../../api/command';
import type { Environment, SettingsSchemaEntry } from './Environment';
import { SettingTypes } from './Environment';
import type { SyntheticVarEntry } from '../../api/shell';
import type { Stuff } from '../stuff/Stuff';

/**
 * Which of the two trees an operation acts on.
 *
 *   - `content` — the world / template tree
 *   - `source`  — the filesystem / engine source tree
 */
export type WorkspaceTree = 'content' | 'source';

/**
 * The three default-tree modes a player can pick via `workspace.tree`.
 * `mirror` is a sync mode rather than a third tree — see the
 * mixin's class-level comment.
 */
export type WorkspaceTreeMode = WorkspaceTree | 'mirror';

/**
 * Per-call flags shape that selects a tree explicitly. Pulled out of
 * the controller-side model interfaces so `pickTree` has a stable
 * contract independent of any one verb's option layout.
 */
export interface TreeFlags {
  content?: boolean;
  source?: boolean;
}

/**
 * Public shape provided by `WorkspaceMixin`. Methods only, per the
 * inter-stuff contract — `contentCwd` / `sourceCwd` are public
 * fields for the Hydrator's reflection but external callers go
 * through these accessors.
 *
 * Extends `Environment` because Workspace always co-composes with
 * `EnvironmentMixin` on `ShelledCharacter`. The interface extension
 * lets controllers narrow once via `MixinApi.isWorkspace(giver)`
 * and reach Environment's `getSetting` / `setSetting` surface
 * without a second narrow.
 */
export interface Workspace extends Environment {
  /**
   * Active tree's cwd, honoring the player's `workspace.tree`
   * setting. In `mirror` mode the two cwds are kept in sync so
   * either reads work; this returns the content cwd canonically.
   */
  getActiveCwd(): string;

  /**
   * Effective default tree for a verb that doesn't carry an
   * explicit `-c` / `-s` flag. Reads `workspace.tree`; mirror mode
   * collapses to `'content'` for read operations.
   */
  getDefaultTree(): WorkspaceTree;

  /**
   * Raw `workspace.tree` setting value (including `'mirror'`).
   * Verbs that *write* (cd, mkdir, rm, cp, mv) check this to
   * decide whether to mirror the operation across both trees.
   */
  getTreeMode(): WorkspaceTreeMode;

  /**
   * Resolve which tree a verb invocation acts on, given the parsed
   * tree flags. Encapsulates the precedence: explicit `-s` wins
   * over explicit `-c`, otherwise the `workspace.tree` setting's
   * default-tree resolution. Controllers thread this so the
   * priority lives in one place.
   */
  pickTree(flags: TreeFlags): WorkspaceTree;

  /**
   * Resolved `workspace.home` setting. Schema-defaulted; the
   * accessor exists so controllers don't reach for raw setting
   * keys.
   */
  getHome(): string;

  /**
   * Resolved `workspace.pageSize` setting. Same accessor-pattern
   * rationale as `getHome()`.
   */
  getPageSize(): number;

  /**
   * Read the cwd for one tree.
   */
  getCwd(tree: WorkspaceTree): string;

  /**
   * Set the cwd for one tree. Plain assignment — validation
   * (does the path actually exist?) is the caller's job (the `cd`
   * controller validates against `TemplateApi` / `SourceTreeApi`
   * before invoking this).
   */
  setCwd(tree: WorkspaceTree, path: string): void;

  /**
   * Set the cwd in the way the active tree mode dictates: in
   * `mirror` mode this updates both cwds; otherwise it updates
   * only the named tree. Verb controllers prefer this over raw
   * `setCwd` so the mirror invariant fires automatically.
   */
  setCwdAuto(tree: WorkspaceTree, path: string): void;

  /**
   * Copy the active tree's cwd to the other tree. v1 carry-over
   * for `cd --mirror` as a one-shot operation, distinct from the
   * persistent `workspace.tree = 'mirror'` mode.
   */
  mirrorCwd(): void;
}

/**
 * Default cwd when the avatar hasn't been to either tree yet.
 * Mirrors the `workspace.home` setting's default so a fresh avatar's
 * `$PWD` and `$HOME` agree out of the gate.
 */
const DEFAULT_HOME = '/';

export function WorkspaceMixin<
  TBase extends MixinConstructor<Stuff & Environment>,
>(Base: TBase) {
  // No `implements Workspace` here: TypeScript's mixin-class
  // typing doesn't merge Base's inherited methods into the
  // `implements` check, even though the constraint above
  // guarantees the runtime shape. The test file's
  // `const w: Workspace = host` assignment is the structural
  // check; runtime ducktyping covers the rest.
  class WorkspaceMixin extends Base {
    static _mixinName = 'WorkspaceMixin';

    /**
     * Hydrator round-trips both cwds. They are operational state
     * but persist across logins so the avatar's session resumes
     * where it left off.
     */
    static persistentFields = ['contentCwd', 'sourceCwd'];

    /**
     * Workspace-tier settings. `workspace.editor` and
     * `workspace.pageSize` are declared in v1 even though only
     * `pageSize` is consumed (by the `cat` controller's soft cap);
     * `editor` ships as a stub so future external-editor handoff
     * can read the player's preference without a schema migration.
     *
     * `workspace.tree` is the default-tree selector — `content`,
     * `source`, or `mirror`. Per-command `-c` / `-s` flags
     * override the default for that invocation.
     */
    static settings: SettingsSchemaEntry[] = [
      {
        key: 'workspace.tree',
        type: SettingTypes.Enum,
        enumValues: ['content', 'source', 'mirror'],
        default: 'content',
        description:
          'Which tree workspace verbs operate on by default. ' +
          '`content` (the authored world / template tree), ' +
          '`source` (the filesystem under packages/), or ' +
          '`mirror` (cd updates both cwds; reads default to ' +
          'content). Per-call `-c` / `-s` flags override.',
      },
      {
        key: 'workspace.home',
        type: SettingTypes.String,
        default: DEFAULT_HOME,
        description:
          'Canonical home path. Resolves through the active tree — ' +
          'the content tree and source tree are expected to share ' +
          'this layout at the home anchor.',
      },
      {
        key: 'workspace.editor',
        type: SettingTypes.String,
        default: '',
        description:
          'Preferred external-editor handoff target. Declared in v1 ' +
          'but not yet consumed; the `edit` verb that reads this is ' +
          'a future landing.',
      },
      {
        key: 'workspace.pageSize',
        type: SettingTypes.Number,
        default: 25,
        description:
          'Soft line-count cap honored by `cat` (and `ls -l` row ' +
          'cap, when paging output). 0 disables the cap.',
      },
    ];

    /**
     * Synthetic shell vars. Read-only — `var set PWD foo` is rejected
     * by `EnvironmentMixin.setVar` because the ShellApi resolution
     * order picks synthetic vars first.
     */
    static syntheticVars: SyntheticVarEntry[] = [
      {
        name: 'PWD',
        description:
          "Active tree's cwd (per the workspace.tree setting).",
        read: (giver) =>
          (giver as Stuff & Workspace).getActiveCwd(),
      },
      {
        name: 'CPWD',
        description: "Content tree's cwd.",
        read: (giver) =>
          (giver as Stuff & Workspace).getCwd('content'),
      },
      {
        name: 'SPWD',
        description: "Source tree's cwd.",
        read: (giver) => (giver as Stuff & Workspace).getCwd('source'),
      },
      {
        name: 'HOME',
        description:
          "Avatar's `workspace.home` setting; one value across trees.",
        read: (giver) => (giver as Stuff & Workspace).getHome(),
      },
    ];

    /**
     * Player-facing commands contributed via the `self` slot.
     */
    static commandContributions: CommandContributions = {
      self: [
        'pwd.yaml',
        'cd.yaml',
        'ls.yaml',
        'cat.yaml',
        'grep.yaml',
        'write.yaml',
        'mkdir.yaml',
        'rm.yaml',
        'cp.yaml',
        'mv.yaml',
      ],
      environment: [],
      inventory: [],
      peers: [],
    };

    /**
     * Persistent cwd in the content tree. Defaults to `/` rather
     * than reading `workspace.home` at construction time — the
     * Hydrator hasn't loaded settings yet at the moment fields
     * default-initialise.
     */
    public contentCwd: string = DEFAULT_HOME;

    /**
     * Persistent cwd in the source tree. Same defaulting story as
     * `contentCwd`.
     */
    public sourceCwd: string = DEFAULT_HOME;

    /**
     * Bridge `this` to the `Environment` surface that `TBase` is
     * constrained to compose. TypeScript's mixin-inheritance of a
     * generic-constrained `Base` doesn't expose Environment methods
     * on `this` directly — the constraint guarantees the runtime
     * shape, this getter is the mechanical type bridge.
     */
    private get _env(): Environment {
      return this as unknown as Environment;
    }

    getTreeMode(): WorkspaceTreeMode {
      const raw = this._env.getSetting<string>('workspace.tree') ?? 'content';
      if (raw === 'content' || raw === 'source' || raw === 'mirror') {
        return raw;
      }
      return 'content';
    }

    getDefaultTree(): WorkspaceTree {
      const mode = this.getTreeMode();
      // Mirror mode collapses to content for read ops — the path
      // shape is the same in both trees and content is canonical.
      return mode === 'source' ? 'source' : 'content';
    }

    pickTree(flags: TreeFlags): WorkspaceTree {
      // `-s` wins over `-c` if both are somehow set — explicit
      // source is the louder signal. Otherwise the setting decides.
      if (flags.source) return 'source';
      if (flags.content) return 'content';
      return this.getDefaultTree();
    }

    getHome(): string {
      return this._env.getSetting<string>('workspace.home') ?? DEFAULT_HOME;
    }

    getPageSize(): number {
      return this._env.getSetting<number>('workspace.pageSize') ?? 25;
    }

    getActiveCwd(): string {
      return this.getCwd(this.getDefaultTree());
    }

    getCwd(tree: WorkspaceTree): string {
      return tree === 'content' ? this.contentCwd : this.sourceCwd;
    }

    setCwd(tree: WorkspaceTree, path: string): void {
      const normalised = path.length === 0 ? DEFAULT_HOME : path;
      if (tree === 'content') {
        this.contentCwd = normalised;
      } else {
        this.sourceCwd = normalised;
      }
    }

    setCwdAuto(tree: WorkspaceTree, path: string): void {
      this.setCwd(tree, path);
      if (this.getTreeMode() === 'mirror') {
        // Sync the other tree to the same path. Validation of the
        // path against the *other* tree is the caller's job;
        // setCwdAuto is the mechanical mirror.
        const other: WorkspaceTree =
          tree === 'content' ? 'source' : 'content';
        this.setCwd(other, path);
      }
    }

    mirrorCwd(): void {
      // One-shot mirror — copies the active tree's cwd to the other.
      // Distinct from the `workspace.tree = 'mirror'` persistent
      // mode, kept as a per-call escape hatch.
      const active = this.getDefaultTree();
      const other: WorkspaceTree =
        active === 'content' ? 'source' : 'content';
      this.setCwd(other, this.getCwd(active));
    }
  }
  return WorkspaceMixin;
}
