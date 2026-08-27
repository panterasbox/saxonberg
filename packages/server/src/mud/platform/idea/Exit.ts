/**
 * Exit — the generic concrete exit.
 *
 * `lib/boundary/Exit` is substrate: the passage contract, with
 * `DeferredDestinationExit` and `SandboxCrossingExit` specializing it.
 * Two templates clone it plain — the archway and the stair — where the
 * exit is just a way through.
 *
 * Those templates name this class. The constructor contract
 * (`ExitOptions`) is inherited unchanged, so `new Exit({...})` and the
 * templated form stay the same shape.
 *
 * See CLAUDE.md § Instanceable Lives in `obj/`.
 */

import ExitBase from '../../lib/boundary/Exit';

export default class Exit extends ExitBase {}
