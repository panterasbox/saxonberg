// MudlogLogic — the hot-reloadable logic singleton behind MudlogApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Sensor } from '../../lib/message/Sensor';
import type { LogLevel, MessageFrame } from '@saxonberg/types';
import { SecurityApi } from '../../api/security';
import { ExecutionContextApi } from '../../api/execution-context';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';
import type { MudlogOptions } from '../../api/mudlog';

type SensorStuff = Stuff & Sensor;

const MudlogApiCallers = SecurityPolicies.FromModule('/api/mudlog#MudlogApi'
);

/**
 * Build the topic string for a (category?, level) pair.
 *   no category → `system.log.<level>`
 *   with category → `system.log.<category>.<level>`
 */
function topicFor(category: string | undefined, level: LogLevel): string {
  return category ? `system.log.${category}.${level}` : `system.log.${level}`;
}

function resolveRecipients(opts: MudlogOptions | undefined): SensorStuff[] {
  if (opts?.to) {
    return Array.isArray(opts.to) ? opts.to : [opts.to];
  }
  const ctx = ExecutionContextApi.getCurrentCommandContext();
  const giver = ctx?.commandGiver;
  if (giver && MixinApi.isSensor(giver)) return [giver];
  throw new Error(
    'MudlogApi: no recipient — pass opts.to, or call inside a command ' +
      'execution where the command giver is a Sensor'
  );
}

/**
 * Compose and dispatch one frame at the given level/category to the
 * resolved recipients.
 */
function emit(
  level: LogLevel,
  category: string | undefined,
  body: Mml,
  opts: MudlogOptions | undefined
): void {
  const recipients = resolveRecipients(opts);
  const cmdCtx = ExecutionContextApi.getCurrentCommandContext();
  const meta: MessageFrame['meta'] = { timestamp: Date.now() };
  if (cmdCtx?.commandId) meta.commandId = cmdCtx.commandId;
  const causing = ExecutionContextApi.getCurrentCausingCommandId();
  if (causing) meta.causingCommandId = causing;

  for (const recipient of recipients) {
    const frame: MessageFrame = {
      id: SecurityApi.uuid(),
      topic: topicFor(category, level),
      tags: [`level:${level}`, ...(category ? [`category:${category}`] : [])],
      body: body.toString(),
      meta: { ...meta },
    };
    if (opts?.payload !== undefined) frame.payload = opts.payload;
    MessageApi.sendMessage(recipient, frame);
  }
}

/**
 * Resolve which overload was invoked. Body-only: `info(body, opts?)`.
 * Categorized: `info(category, body, opts?)`.
 */
function dispatch(
  level: LogLevel,
  a: string | Mml,
  b?: Mml | MudlogOptions,
  c?: MudlogOptions
): void {
  if (typeof a === 'string') {
    emit(level, a, b as Mml, c);
  } else {
    emit(level, undefined, a, b as MudlogOptions | undefined);
  }
}

/**
 * MudlogLogic — the hot-reloadable logic singleton behind
 * {@link MudlogApi}.
 *
 * Lives at `/obj/api/mudlog` (a stateless `Stuff` singleton, no backing
 * `Template`); `MudlogApi`'s public statics forward here via
 * `StuffApi.singletonSync`. The author-facing overload pairs live on
 * the Api face; the logic methods take the resolved implementation
 * signature and route through the module-private `dispatch`/`emit`
 * free functions (no intra-singleton self-calls to trip the gate).
 *
 * Each method carries the `FromModule` gate **per method** (a
 * class-level default would also deny inherited framework methods).
 *
 * @internal
 */
@Unshadowable
export class MudlogLogic extends Idea {
  /** See {@link MudlogApi.trace}. */
  @CallSecurity(MudlogApiCallers)
  public trace(
    a: string | Mml,
    b?: Mml | MudlogOptions,
    c?: MudlogOptions
  ): void {
    dispatch('trace', a, b, c);
  }

  /** See {@link MudlogApi.debug}. */
  @CallSecurity(MudlogApiCallers)
  public debug(
    a: string | Mml,
    b?: Mml | MudlogOptions,
    c?: MudlogOptions
  ): void {
    dispatch('debug', a, b, c);
  }

  /** See {@link MudlogApi.info}. */
  @CallSecurity(MudlogApiCallers)
  public info(
    a: string | Mml,
    b?: Mml | MudlogOptions,
    c?: MudlogOptions
  ): void {
    dispatch('info', a, b, c);
  }

  /** See {@link MudlogApi.warn}. */
  @CallSecurity(MudlogApiCallers)
  public warn(
    a: string | Mml,
    b?: Mml | MudlogOptions,
    c?: MudlogOptions
  ): void {
    dispatch('warn', a, b, c);
  }

  /** See {@link MudlogApi.error}. */
  @CallSecurity(MudlogApiCallers)
  public error(
    a: string | Mml,
    b?: Mml | MudlogOptions,
    c?: MudlogOptions
  ): void {
    dispatch('error', a, b, c);
  }

  /** See {@link MudlogApi.fatal}. */
  @CallSecurity(MudlogApiCallers)
  public fatal(
    a: string | Mml,
    b?: Mml | MudlogOptions,
    c?: MudlogOptions
  ): void {
    dispatch('fatal', a, b, c);
  }

  /** See {@link MudlogApi.isEnabled}. */
  @CallSecurity(MudlogApiCallers)
  public isEnabled(
    _category: string | undefined,
    _level: LogLevel
  ): boolean {
    return true;
  }
}
