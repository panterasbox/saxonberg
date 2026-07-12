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

export const handleCommand: InboundHandler = async (ctx, message) => {
  const { interactive, backend, application, socketId } = ctx;
  const holder = interactive.getHolder() as Stuff | null;
  // Identity is by capability + template-path, never instanceof:
  // anything that's a CommandGiver dispatches through the real pipeline
  // (Avatar in-world; Login in the pre-world char-gen/roster phase).
  // The Avatar-only branches below narrow with `PlayerApi.isAvatarStuff`,
  // which reads the durable `/obj/Avatar/` template-path prefix rather
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
    () => giver.executeCommand(commandText, { interactive, bodyFields, barId }),
    'absorb'
  );
};

export type { InboundClientMessage };
