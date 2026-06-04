/**
 * ShadowChangedEvent — declared for use by subscribable-field
 * descriptors that want re-resolution on shadow attach / detach /
 * mutate.
 *
 * Ships in Wave 1 declared but unfired. The firing site lights up
 * with the shadow lifecycle hooks in a later subsystem build.
 * Subscribable-field descriptors that participate in shadowed
 * projection (Name / Visible / Detail) declare this event in their
 * `changes` array so the meta-bus index is wired end-to-end; until
 * the firing site exists, the listener is silent.
 */

import { StuffEvent } from './StuffEvent';

export interface ShadowChangedPayload {
  target: string;                              // host StuffId
  shadow: string;                              // shadow class name (or shadow id when stable)
  cause: 'attach' | 'detach' | 'mutate';
}

export class ShadowChangedEvent extends StuffEvent<ShadowChangedPayload> {
  static readonly KIND = 'stuff.shadowChanged';
  readonly kind = ShadowChangedEvent.KIND;
  constructor(public readonly payload: ShadowChangedPayload) {
    super();
  }
}
