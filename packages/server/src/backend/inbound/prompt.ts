/**
 * Prompt handlers — server-pushed prompt substrate inbound surface.
 *
 * `prompt-response` carries the player's answer to a pushed prompt
 * (text / choice / confirm / mql-object / mql-many). `prompt-cancel`
 * is the X-button affordance on a single prompt slot — wholesale
 * cancel rides the command bus separately via the
 * `prompt cancel` verb, not this channel.
 */

import type {
  PromptResponseMessage,
  PromptCancelMessage,
} from '@saxonberg/types';
import type { InboundHandler } from './index';

export const handlePromptResponse: InboundHandler = (ctx, message) => {
  const payload = message.payload as
    | PromptResponseMessage['payload']
    | undefined;
  if (
    !payload ||
    typeof payload.promptId !== 'string' ||
    typeof payload.response !== 'string'
  ) {
    return;
  }
  ctx.interactive.handlePromptResponse(payload);
};

export const handlePromptCancel: InboundHandler = (ctx, message) => {
  const payload = message.payload as
    | PromptCancelMessage['payload']
    | undefined;
  if (!payload || typeof payload.promptId !== 'string') return;
  ctx.interactive.handlePromptCancel(payload);
};
