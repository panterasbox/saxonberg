/**
 * SandboxCrossingExit — the concrete crossing exit a row names.
 *
 * `lib/sandbox/SandboxCrossingExit` is substrate: the crossing contract
 * and its two directions. This twin exists so the two platform rows
 * (`/platform/idea/exits/sandbox-crossing` and `…/sandbox-return`) have
 * a class outside `/lib/` to name — the seven-twins convention. Empty
 * body on purpose; the behaviour is the base's.
 *
 * See CLAUDE.md § Instanceable Lives in `platform/<branch>/`.
 */

import SandboxCrossingExitBase from '../../lib/sandbox/SandboxCrossingExit';

export default class SandboxCrossingExit extends SandboxCrossingExitBase {}
