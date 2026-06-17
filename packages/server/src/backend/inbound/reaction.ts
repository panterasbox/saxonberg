/**
 * Reaction handlers — the act-scoped-emote substrate inbound surface.
 *
 * Only one inbound op in v1: `reaction-expand`, the pull for the full
 * reactor-set behind one act (the fixed-cadence delta ships only a
 * capped per-recipient sample). Reactions themselves arrive as ordinary
 * `command` messages (`react …`) — there is no parallel inbound path.
 */

import { ReactionApi } from '../../mud/api/reaction';
import type { ReactionExpandMessage } from '@saxonberg/types';
import type { InboundHandler } from './index';

export const handleReactionExpand: InboundHandler = (ctx, message) => {
  const payload = message.payload as ReactionExpandMessage | undefined;
  if (
    !payload ||
    typeof payload.requestId !== 'string' ||
    typeof payload.commandId !== 'string'
  ) {
    return;
  }
  ReactionApi.handleExpand({
    interactive: ctx.interactive,
    requestId: payload.requestId,
    commandId: payload.commandId,
  });
};
