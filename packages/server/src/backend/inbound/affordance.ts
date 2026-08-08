/**
 * Affordance handler — the inbound surface behind the client's radial
 * menu: "what can I do with this object, right now?"
 *
 * One inbound op: `affordance-resolve`. The answer is computed fresh
 * per request and is never cached — a menu's whole value is that it
 * reflects the world at the instant it opened.
 *
 * ⚠ This is a **read**, not a dispatch. Resolution evaluates the
 * existing validator chain without running anything; a verb reported
 * `enabled` still faces the full chain when the player actually picks
 * it. Nothing downstream may treat this answer as authorization.
 */

import { CommandApi } from '../../mud/api/command';
import { MessageApi } from '../../mud/api/message';
import { MixinApi } from '../../mud/api/mixin';
import { StuffApi } from '../../mud/api/stuff';
import type { Stuff } from '../../mud/lib/stuff/Stuff';
import type { Sensor } from '../../mud/lib/message/Sensor';
import type {
  AffordanceResolveMessage,
  AffordanceResultEnvelope,
  AffordanceErrorEnvelope,
} from '@saxonberg/types';
import type { InboundHandler } from './index';

export const handleAffordanceResolve: InboundHandler = async (ctx, message) => {
  const payload = message.payload as AffordanceResolveMessage | undefined;
  if (
    !payload ||
    typeof payload.requestId !== 'string' ||
    typeof payload.stuffId !== 'string'
  ) {
    return;
  }

  const holder = ctx.interactive.getHolder();
  if (!holder || !MixinApi.isSensor(holder)) return;
  const viewer = holder as Stuff & Sensor;
  if (!MixinApi.isCommandGiver(viewer)) return;

  const target = StuffApi.findById(payload.stuffId);
  const resolution = target
    ? await CommandApi.resolveAffordances(target, viewer)
    : null;

  // ⚠ **One reason code, deliberately.** "No such object" and "you may
  // not see that object" are the same answer, because distinguishing
  // them would answer precisely the question the perception gate
  // exists to refuse — a probe for unknown ids becomes a map of what
  // is hidden nearby.
  if (!resolution) {
    const error: Omit<AffordanceErrorEnvelope, 'frameId'> = {
      type: 'affordance-error',
      requestId: payload.requestId,
      stuffId: payload.stuffId,
      reason: 'unresolvable',
    };
    MessageApi.sendEnvelope(viewer, error);
    return;
  }

  const template: Omit<AffordanceResultEnvelope, 'frameId'> = {
    type: 'affordance-result',
    requestId: payload.requestId,
    stuffId: payload.stuffId,
    verbs: resolution.verbs,
    composition: resolution.composition,
  };
  MessageApi.sendEnvelope(viewer, template);
};
