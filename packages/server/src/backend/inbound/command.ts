/**
 * Command handler — primary game input channel.
 *
 * Free-form text → `Avatar.executeCommand`. Bails to a
 * user-visible error envelope when there's no Avatar holder or
 * the avatar is placeless. Empty command line short-circuits to
 * an envelope carrying a `prompt-refresh` Note (MUD-style "press
 * Enter for a fresh prompt") without invoking the parser or
 * dispatcher.
 */

import type { EnvelopeTemplate } from '@saxonberg/types';
import { PlayerApi } from '../../mud/api/player';
import { ExecutionContextApi } from '../../mud/api/execution-context';
import { SecurityApi } from '../../mud/api/security';
import { MixinApi } from '../../mud/api/mixin';
import { PromptApi } from '../../mud/api/prompt';
import type { Stuff } from '../../mud/lib/stuff/Stuff';
import type { CommandGiver } from '../../mud/lib/command/CommandGiver';
import type { InboundClientMessage, InboundHandler } from './index';
import { CommandLineApi } from '../../mud/api/command-line';
import { BroadcastFeed } from '../BroadcastFeed';

export const handleCommand: InboundHandler = async (ctx, message) => {
  const { interactive, backend, application, socketId } = ctx;
  const holder = interactive.getHolder() as Stuff | null;
  // Identity is by capability + template-path, never instanceof:
  // anything that's a CommandGiver dispatches through the real pipeline
  // (Avatar in-world; Login in the pre-world char-gen/roster phase).
  // The Avatar-only branches below narrow with `PlayerApi.isAvatarStuff`,
  // which reads the durable `/platform/agent/Avatar/` template-path prefix rather
  // than the backing class (which can change across HMR cycles).
  if (!holder || !MixinApi.isCommandGiver(holder)) {
    backend.sendMessageToSocket(socketId, {
      type: 'error',
      payload: { message: 'No active character' },
    });
    return;
  }

  const rawPayload = message.payload as {
    text: string;
    fields?: Record<string, unknown>;
    barId?: string;
  };
  const commandText = rawPayload.text?.trim();
  const bodyFields =
    rawPayload.fields && typeof rawPayload.fields === 'object'
      ? rawPayload.fields
      : undefined;
  // Which command bar this came from — drives the per-bar input-mode
  // prepend. Affordance clicks (and legacy / programmatic submissions)
  // omit it; an absent barId means "un-moded — never prepend" (preview
  // equals send), distinct from a real bar like `'main'`.
  const barId =
    typeof rawPayload.barId === 'string' ? rawPayload.barId : undefined;
  if (!commandText) {
    // Empty line: Avatar gets a bare prompt-refresh envelope (MUD-style
    // "press Enter"). For a Login (char-gen/roster) there's nothing to
    // refresh — ignore.
    if (PlayerApi.isAvatarStuff(holder)) {
      const refresh = PromptApi.renderPromptRefresh(holder);
      const template: EnvelopeTemplate = {
        type: 'dispatch-response',
        dispatchId: SecurityApi.uuid(),
        outcome: { status: 'ok', notes: [refresh] },
      };
      application.sendEnvelopeToInteractive(interactive, template);
    }
    return;
  }

  // The placeless guard is Avatar-only — a Login is intentionally
  // locationless.
  if (PlayerApi.isAvatarStuff(holder) && !holder.getContainer()) {
    backend.sendMessageToSocket(socketId, {
      type: 'error',
      payload: { message: 'Avatar has no location' },
    });
    return;
  }

  const giver = holder as Stuff & CommandGiver;

  // executeCommand's outcome rides the dispatch-response envelope (fired
  // through the Sensor pipeline). Authored-content controller throws are
  // absorbed *inside* executeCommand into `controller-error` notes (the
  // giver's real-error surface) + a diagnostics row; anything that still
  // escapes to here is a residual framework error. The guard records it
  // and absorbs (policy 'absorb') — retiring the old generic
  // "Command execution failed" socket frame; the note is the feedback.
  await ExecutionContextApi.runRootGuarded(
    giver,
    'executeCommand',
    () => {
      // Sandbox taint: the command root is planted before the giver is
      // known, so the holder's stamped circle scope is established here
      // (set-once) — a wire body's commands run circle-scoped, a field
      // avatar's stay unscoped, with one stamped-field read either way.
      const circleScope = giver.getCircleScope();
      if (circleScope !== null) {
        ExecutionContextApi.establishCircleScope(circleScope);
      }
      return giver.executeCommand(commandText, {
        interactive,
        bodyFields,
        barId,
      });
    },
    'absorb'
  );
};

export type { InboundClientMessage };

/**
 * ⚠⚠ **The control principal's one verb** (broadcast-ready D11).
 *
 * A `?control=<token>` socket (pblive's Stream Deck) has no Interactive;
 * it may run `stream …` as the player its token names and NOTHING else —
 * the deliberate second writer the slate named, bounded to one verb. The
 * gate is literal and runs before any parse the dispatcher would do:
 *
 * - the message must be a `command`;
 * - the line must parse to ONE command whose verb is literally `stream`
 *   (no `verb@source` scope, no emote sigil);
 * - `stream token` is refused — a control token must not mint tokens;
 * - a streamer alias named `stream` is refused (no alias expansion may
 *   turn the one verb into another);
 * - the streamer must be ONLINE (their body resident); the command then
 *   runs as them through the ordinary dispatcher, so `requiresStreamer`
 *   still gates.
 *
 * Every answer goes back as `control-result` so the deck lights ✓ or ⚠.
 */
export async function handleControlCommand(
  socketId: string,
  playerId: string,
  message: InboundClientMessage,
): Promise<void> {
  const feed = BroadcastFeed.get();
  const payload = (message.payload ?? {}) as { command?: unknown; text?: unknown };
  const raw = typeof payload.command === 'string' ? payload.command : payload.text;
  const text = typeof raw === 'string' ? raw.trim() : '';
  const refuse = (reason: string): void => feed.sendControlResult(socketId, text, false, reason);
  if (message.type !== 'command') return refuse('commands-only');
  if (text === '') return refuse('empty');
  let verb: string;
  let sub: string | null = null;
  try {
    const pipeline = CommandLineApi.parsePipeline(text);
    const only = pipeline.commands.length === 1 ? pipeline.commands[0] : undefined;
    if (!only || only.emotePrefixed || only.scope) return refuse('stream-only');
    verb = only.verb;
    const second = only.rawTokens[1];
    sub = second && second.kind === 'word' ? second.value.toLowerCase() : null;
  } catch {
    return refuse('unparseable');
  }
  if (verb !== 'stream') return refuse('stream-only');
  if (sub === 'token') return refuse('no-token-minting');
  const avatar = PlayerApi.findAvatarByPlayerId(playerId);
  if (!avatar) return refuse('streamer-offline');
  if (MixinApi.isAlias(avatar) && avatar.getAlias('stream')) return refuse('alias-shadows-stream');
  let status: string | null = null;
  await avatar.executeCommand(text, {
    onOutcome: (s) => {
      status = s;
    },
  });
  if (status === null) return refuse('no-outcome');
  feed.sendControlResult(socketId, text, status === 'ok', status === 'ok' ? undefined : status);
}
