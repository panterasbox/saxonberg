/**
 * requiresProgram — verb-level precondition for `rodney` (stream arrival
 * D12): the giver's stream runs a program, and the giver still holds that
 * program's pen. It replaces the retired streamer axis — the gate stopped
 * being a ROLE and became the pen (whoever may run this program).
 *
 * The async preload asks `StreamApi.programGate` (one followed reference
 * and the shipped title gate); the dispatcher threads its answer back to
 * the sync body via `preloaded`.
 */

import type { CommandValidator } from '../../../api/command';
import { StreamApi, type ProgramGate } from '../../../api/stream';
import type { Stuff } from '../../stuff/Stuff';

/** What each answer says to the would-be broadcaster. */
const SAYS: Readonly<Record<Exclude<ProgramGate, 'ok'>, string>> = {
  'no-program':
    'Your stream runs no program. `program create <name>` files one; `program run <name>` puts you in its chair.',
  'not-your-program':
    'You no longer hold the pen of the program your stream runs — `program run <name>` one that is yours.',
};

// Split declaration (module scope declares): the annotated body const
// gives the arrow its contextual typing; `Object.assign` keeps the whole
// thing a pure declaration.
const body: CommandValidator<ProgramGate> = (_context, gate) =>
  gate === 'ok' ? undefined : SAYS[gate];
const preload: NonNullable<CommandValidator<ProgramGate>['preload']> = (context) =>
  StreamApi.programGate(context.commandGiver as Stuff);
const validator: CommandValidator<ProgramGate> = Object.assign(body, {
  preload,
});

export default validator;
