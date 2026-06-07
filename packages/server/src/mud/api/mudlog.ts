/**
 * MudlogApi — in-game messaging facility for log-style content.
 *
 * Every call delivers to a Sensor. Topic is `system.log.<level>` (no
 * category) or `system.log.<category>.<level>`. Recipient resolution:
 *
 *   1. `opts.to` (Sensor or Sensor[]) → deliver to those.
 *   2. Else `ExecutionContextApi.getCurrentCommandContext()?.commandGiver`
 *      → deliver to the command giver.
 *   3. Else throw — no stdout fallback. MudlogApi is purely an in-game
 *      messaging facility; stdout/file logging is a separate concern.
 *
 * Frame construction is internal — MudlogApi knows its recipients
 * explicitly and doesn't need Scene's per-audience plumbing. It does
 * stamp `meta.commandId` and `meta.causingCommandId` from
 * ExecutionContext, same as Scene.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Sensor } from '../lib/message/Sensor';
import type { LogLevel, MessageFrame } from '@saxonberg/types';
import { nanoid } from 'nanoid';
import { ExecutionContextApi } from './execution-context';
import { SecurityApi } from './security';
import { MessageApi } from './message';
import { MixinApi } from './mixin';
import { Mml } from './mml';

type SensorStuff = Stuff & Sensor;

export interface MudlogOptions {
  to?: SensorStuff | SensorStuff[];
  payload?: unknown;
}

const LEVELS: ReadonlyArray<LogLevel> = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
];

/**
 * Build the topic string for a (category?, level) pair.
 *   no category → `system.log.<level>`
 *   with category → `system.log.<category>.<level>`
 */
function topicFor(category: string | undefined, level: LogLevel): string {
  return category
    ? `system.log.${category}.${level}`
    : `system.log.${level}`;
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
 * resolved recipients. Internal — call sites use the level methods
 * (info/warn/etc.) and let TypeScript pick the overload.
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
      id: nanoid(),
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
 * Resolve which overload was invoked. Body-only:
 *   info(body, opts?)
 * Categorized:
 *   info(category, body, opts?)
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

export class MudlogApi {
  private constructor() {}

  static trace(body: Mml, opts?: MudlogOptions): void;
  static trace(category: string, body: Mml, opts?: MudlogOptions): void;
  static trace(
    a: string | Mml,
    b?: Mml | MudlogOptions,
    c?: MudlogOptions
  ): void {
    dispatch('trace', a, b, c);
  }

  static debug(body: Mml, opts?: MudlogOptions): void;
  static debug(category: string, body: Mml, opts?: MudlogOptions): void;
  static debug(
    a: string | Mml,
    b?: Mml | MudlogOptions,
    c?: MudlogOptions
  ): void {
    dispatch('debug', a, b, c);
  }

  static info(body: Mml, opts?: MudlogOptions): void;
  static info(category: string, body: Mml, opts?: MudlogOptions): void;
  static info(
    a: string | Mml,
    b?: Mml | MudlogOptions,
    c?: MudlogOptions
  ): void {
    dispatch('info', a, b, c);
  }

  static warn(body: Mml, opts?: MudlogOptions): void;
  static warn(category: string, body: Mml, opts?: MudlogOptions): void;
  static warn(
    a: string | Mml,
    b?: Mml | MudlogOptions,
    c?: MudlogOptions
  ): void {
    dispatch('warn', a, b, c);
  }

  static error(body: Mml, opts?: MudlogOptions): void;
  static error(category: string, body: Mml, opts?: MudlogOptions): void;
  static error(
    a: string | Mml,
    b?: Mml | MudlogOptions,
    c?: MudlogOptions
  ): void {
    dispatch('error', a, b, c);
  }

  static fatal(body: Mml, opts?: MudlogOptions): void;
  static fatal(category: string, body: Mml, opts?: MudlogOptions): void;
  static fatal(
    a: string | Mml,
    b?: Mml | MudlogOptions,
    c?: MudlogOptions
  ): void {
    dispatch('fatal', a, b, c);
  }

  /**
   * Hook for log4j-style "skip composition when disabled" guards. v1
   * always returns true; future enhancements (per-category levels,
   * dynamic config) plug in here.
   */
  static isEnabled(_category: string | undefined, _level: LogLevel): boolean {
    return true;
  }
}

// Re-export the level constant list for diagnostic UIs that want to
// render every level.
export const MUDLOG_LEVELS = LEVELS;

SecurityApi.decorateApiClass(MudlogApi);
