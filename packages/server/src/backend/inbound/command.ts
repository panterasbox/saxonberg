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
import Avatar from '../../mud/obj/Avatar';
import Login from '../../mud/obj/Login';
import { PromptApi } from '../../mud/api/prompt';
import type { Stuff } from '../../mud/lib/stuff/Stuff';
import type { CommandGiver } from '../../mud/lib/command/CommandGiver';
import type { InboundClientMessage, InboundHandler } from './index';

export const handleCommand: InboundHandler = async (ctx, message) => {
  const { interactive, backend, application, socketId } = ctx;
  const holder = interactive.getHolder();
  const isAvatar = holder instanceof Avatar;
  const isLogin = holder instanceof Login;
  // Any CommandGiver holder dispatches through the real pipeline. Avatar
  // is the in-world giver; Login is the pre-world (char-gen / roster)
  // giver — both run the genuine command path.
  if (!isAvatar && !isLogin) {
    backend.sendMessageToSocket(socketId, {
      type: 'error',
      payload: { message: 'No active character' },
    });
    return;
  }

  const commandText = (message.payload as { text: string }).text?.trim();
  if (!commandText) {
    // Empty line: Avatar gets a bare prompt-refresh envelope (MUD-style
    // "press Enter"). For a Login (char-gen/roster) there's nothing to
    // refresh — ignore.
    if (isAvatar) {
      const refresh = PromptApi.renderPromptRefresh(holder);
      const template: EnvelopeTemplate = {
        type: 'dispatch-response',
        dispatchId: nanoid(),
        outcome: { status: 'ok', notes: [refresh] },
      };
      application.sendEnvelopeToInteractive(interactive, template);
    }
    return;
  }

  // The placeless guard is Avatar-only — a Login is intentionally
  // locationless.
  if (isAvatar && !holder.getContainer()) {
    backend.sendMessageToSocket(socketId, {
      type: 'error',
      payload: { message: 'Avatar has no location' },
    });
    return;
  }

  const giver = holder as unknown as Stuff & CommandGiver;

  // executeCommand's outcome rides the dispatch-response envelope
  // (fired through the Sensor pipeline). No return value to read
  // here. If it throws, surface a user-visible error envelope —
  // command failures are exactly the case where the player needs
  // to see "something went wrong" rather than have the dispatcher
  // log silently.
  try {
    await giver.executeCommand(commandText, { interactive });
  } catch (error) {
    console.error(`Command error for socket ${socketId}:`, error);
    backend.sendMessageToSocket(socketId, {
      type: 'error',
      payload: { message: 'Command execution failed' },
    });
  }
};

export type { InboundClientMessage };
