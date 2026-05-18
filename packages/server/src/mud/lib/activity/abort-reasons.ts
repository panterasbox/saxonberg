/**
 * Framework-intrinsic AbortReasonRegistry augmentations.
 *
 * Each subsystem that can cause an engagement to abort augments
 * `AbortReasonRegistry` from its own `lib/<subsystem>/abort-reasons.ts`
 * module (Phase-7 shape). The activity framework owns the five
 * framework-intrinsic reasons stamped below; other subsystems add their
 * own keys from their own modules.
 *
 * The empty `AbortReasonRegistry` interface lives in `@saxonberg/types`
 * so the wire-side `EngagementCancelledNote.reason` typechecks across
 * the package boundary. This file is the Wave-1 activity-substrate
 * augmentation.
 *
 * Eager-import this module from any consumer that reads
 * `keyof AbortReasonRegistry` so the declaration merge has landed
 * before the type is consulted (see `api/scheduler.ts`).
 */

declare module '@saxonberg/types' {
  interface AbortReasonRegistry {
    cancelled: true;
    replaced: true;
    'preconditions-changed': true;
    'host-destroyed': true;
    thrown: true;
  }
}

export {};
