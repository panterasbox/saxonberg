/**
 * SourceTreeSandboxError — thrown when a source-tree operation's
 * resolved path escapes the configured sandbox root.
 *
 * Lives in `lib/shell/` next to the rest of the on-server shell's
 * source-tree code (`Workspace`); `SourceTreeApi` value-re-exports it so
 * existing `import { SourceTreeSandboxError } from '.../api/source-tree'`
 * sites keep working, and `instanceof` checks in the shell controllers
 * resolve to this single class.
 */
export class SourceTreeSandboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceTreeSandboxError';
  }
}
