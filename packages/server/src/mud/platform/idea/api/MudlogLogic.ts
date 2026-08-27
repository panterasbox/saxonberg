// MudlogLogic — the hot-reloadable logic singleton behind MudlogApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Sensor } from '../../../lib/message/Sensor';
import type { LogLevel, MessageFrame } from '@saxonberg/types';
import { SecurityApi } from '../../../api/security';
import { ExecutionContextApi } from '../../../api/execution-context';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import type { MudlogOptions } from '../../../api/mudlog';

type SensorStuff = Stuff & Sensor;

const MudlogApiCallers = SecurityPolicies.FromModule('/api/mudlog#MudlogApi'
);

/**
 * ⭐ **Log lines are one topic, not a composed family.**
 *
 * This used to build `system.log.<category>.<level>` at runtime, which
 * is the pathology the taxonomy exists to remove: **`level` IS the
 * `weight` facet** (`info`/`warn`/`error` are `activity`/`chatter`/
 * `consequence` by another name), and `category` is the emitting
 * subsystem — the thing the tree stopped encoding when facets landed.
 * A composed family also cannot be enumerated by `lint:topics`, so
 * every key it minted resolved through the derived-default tier
 * unseen.
 *
 * Level and category are still carried — on the frame's own payload,
 * where a reader can filter on them — rather than smuggled into the
 * topic path.
 */
const LOG_TOPIC = 'shell.diagnostic';

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
      topic: LOG_TOPIC,
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
 * Lives at `/platform/idea/api/mudlog` (a stateless `Stuff` singleton, no backing
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
export class MudlogLogic extends ApiLogic {
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
