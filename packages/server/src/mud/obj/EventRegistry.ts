/**
 * EventRegistry — singleton Idea that owns the well-known event
 * declarations.
 *
 * Each `Events.*` entry becomes a transient property on this Idea.
 * The property's `checkAccess` (built via `emittableBy(...)` in
 * `event-policies.ts`) gates emit and subscribe through `EventApi`.
 *
 * NOT Persistable. Every event prop is `transient: true` and the
 * `checkAccess` closures don't survive serialization, so there's
 * nothing meaningful to round-trip. Composition stops at
 * `PropertiedMixin(Idea)` plus `PostRegistrationMixin` for the
 * one-shot setup.
 *
 * No emit/subscribe surface lives on this class — EventApi is the
 * only legitimate caller. Direct callers are rejected by the
 * per-property access check.
 */

import { Idea } from '../lib/stuff/Idea';
import {
  PropertiedMixin,
  Property,
  type PropValue,
  type PropOperation,
} from '../lib/stuff/Propertied';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { Events } from '../lib/events';
import { defaultPolicyFor } from '../lib/events';

const EventRegistryBase = PostRegistrationMixin(PropertiedMixin(Idea));

export class EventRegistry extends EventRegistryBase {
  /**
   * Iterate the well-known events and call `initProp` for each with
   * the per-event policy. Runs once after registration; safe against
   * re-entry (initProp returns false on already-existing props).
   *
   * Custom events that no one frontloads here get auto-declared on
   * first `EventApi.emit` / `EventApi.on` with the default
   * `emittableBy()` policy. Everything is treated the same — the
   * frontloading just lets the well-known set carry tighter
   * per-event allowlists from the start.
   */
  public override async postRegister(_context?: unknown): Promise<void> {
    for (const eventName of Object.values(Events)) {
      this.initProp(Property.of<PropValue>(eventName), {
        transient: true,
        checkAccess: defaultPolicyFor(eventName),
      });
    }
  }

  /**
   * Deny everything by default. Closes the bypass path where a
   * caller obtains the registry instance and runs
   * `reg.setProp('forged.event', ...)` directly: PropertiedMixin's
   * `setProp` auto-initialises unknown props by calling
   * `initProp(prop)` with no options, which falls back here. With
   * deny-all defaults, the auto-init produces an inaccessible prop
   * and the setProp returns `false`.
   *
   * The legitimate path is `EventApi.emit/on`, which calls
   * `initProp` with a real `emittableBy()` policy BEFORE setProp
   * fires — so the auto-init never runs for EventApi-mediated
   * traffic.
   */
  public override defaultPropAccess(
    _property: Property<PropValue>,
    _op: PropOperation,
    _special: unknown,
  ): boolean {
    return false;
  }
}
