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

import { nanoid } from 'nanoid';
import type { EnvelopeTemplate } from '@saxonberg/types';
import { Avatar } from '../../mud/obj/Avatar';
import { PromptApi } from '../../mud/api/prompt';
import type { InboundClientMessage, InboundHandler } from './index';

export const handleCommand: InboundHandler = async (ctx, message) => {
  const { interactive, backend, application, socketId } = ctx;
  const holder = interactive.getHolder();
  if (!(holder instanceof Avatar)) {
    backend.sendMessageToSocket(socketId, {
      type: 'error',
      payload: { message: 'No active character' },
    });
    return;
  }

  const commandText = (message.payload as { text: string }).text?.trim();
  if (!commandText) {
    // Empty line → bare prompt-refresh envelope. No parser, no
    // controller, no side effects.
    const refresh = PromptApi.renderPromptRefresh(holder);
    const template: EnvelopeTemplate = {
      type: 'dispatch-response',
      dispatchId: nanoid(),
      outcome: { status: 'ok', notes: [refresh] },
    };
    application.sendEnvelopeToInteractive(interactive, template);
    return;
  }

  if (!holder.getContainer()) {
    backend.sendMessageToSocket(socketId, {
      type: 'error',
      payload: { message: 'Avatar has no location' },
    });
    return;
  }

  // executeCommand's outcome rides the dispatch-response envelope
  // (fired through the Sensor pipeline). No return value to read
  // here. If it throws, surface a user-visible error envelope —
  // command failures are exactly the case where the player needs
  // to see "something went wrong" rather than have the dispatcher
  // log silently.
  try {
    await holder.executeCommand(commandText, { interactive });
  } catch (error) {
    console.error(`Command error for socket ${socketId}:`, error);
    backend.sendMessageToSocket(socketId, {
      type: 'error',
      payload: { message: 'Command execution failed' },
    });
  }
};

export type { InboundClientMessage };
