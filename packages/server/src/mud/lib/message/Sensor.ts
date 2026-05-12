/**
 * SensorMixin — message receiving with a shadowable filter hook.
 *
 * `onMessage` is the framework-side template method:
 *   1. Run the (possibly shadowed) `filterMessage` extension hook.
 *   2. If it returned `null` the frame is dropped — recipient sees
 *      nothing. Otherwise call `handleMessage` with the (possibly
 *      transformed) frame.
 *
 * Game content (spells, deafness shadows, audit observers) intercepts
 * by shadowing `filterMessage` rather than registering with a parallel
 * hook system. Lifecycle binding, ordering, and call-security
 * mediation are inherited from ShadowApi.
 *
 * `handleMessage` is the subclass-override extension point — Avatar
 * multiplexes to its connected Interactives, NPCs run AI, etc.
 *
 * Frame typing stays `unknown` until Stage 11; producers in Stages
 * 4–10 emit a mix of legacy envelopes and new MessageFrames during
 * the transition.
 */

import type { MixinConstructor } from '../mixin';
import type { EnvelopeTemplate, MessageFrame } from '@saxonberg/types';

/**
 * Public shape provided by SensorMixin.
 */
export interface Sensor {
  onMessage(frame: MessageFrame): void;
  onEnvelope(envelope: EnvelopeTemplate): void;
}

export function SensorMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SensorMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'SensorMixin';

    /**
     * Template method — DO NOT override in subclasses. Override
     * `handleMessage` instead, or shadow `filterMessage` for content-
     * driven interception.
     */
    onMessage(frame: MessageFrame): void {
      const transformed = this.filterMessage(frame);
      if (transformed === null) return;
      this.handleMessage(transformed);
    }

    /**
     * Shadowable extension point. Default returns the frame unchanged.
     * Game content shadows this to drop frames (return null) or
     * transform them (return a modified copy — treat the input as
     * immutable). Per-recipient interception, lifecycle bound to the
     * shadow's host.
     */
    protected filterMessage(frame: MessageFrame): MessageFrame | null {
      return frame;
    }

    /**
     * Subclass-override delivery hook. Avatar overrides to multiplex
     * to its connected Interactives; NPCs override for AI processing;
     * default is a no-op.
     */
    protected handleMessage(_frame: MessageFrame): void {
      // Default: no-op.
    }

    /**
     * Envelope template method — DO NOT override. Override
     * `handleEnvelope` instead, or shadow `filterEnvelope` for
     * content-driven interception. Parallels {@link onMessage}.
     */
    onEnvelope(envelope: EnvelopeTemplate): void {
      const transformed = this.filterEnvelope(envelope);
      if (transformed === null) return;
      this.handleEnvelope(transformed);
    }

    /**
     * Shadowable extension point for envelope frames. Default
     * returns the envelope unchanged. Treat the input as
     * immutable; return a fresh copy when transforming.
     */
    protected filterEnvelope(
      envelope: EnvelopeTemplate
    ): EnvelopeTemplate | null {
      return envelope;
    }

    /**
     * Subclass-override delivery hook for envelope frames. Avatar
     * overrides to multiplex to its connected Interactives; NPCs and
     * other Sensors default to no-op.
     */
    protected handleEnvelope(_envelope: EnvelopeTemplate): void {
      // Default: no-op.
    }
  };
}

