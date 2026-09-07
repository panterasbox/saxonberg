/**
 * The wire harness — everything a wire file imports.
 *
 * A wire file imports from here and from `vitest`, and from NOTHING
 * ELSE in the repo. In particular it never imports server source: the
 * moment a flow test wants a `StuffApi` call it has stopped being a
 * flow test, and the thing it wants to prove belongs in the server's
 * own unit suite where it is a thousand times cheaper.
 */

export { Session, uniqueHandle, plain, SERVER_URL } from './session';
export type { CommandResult, QueryRecord } from './session';
export {
  expectOk,
  expectRefused,
  expectNote,
  expectNoNote,
  engagementIdOf,
  describe,
} from './assertions';
export { declareFile } from './registry';
export type { FileRecord } from './registry';
export { installedPacks } from './world';
