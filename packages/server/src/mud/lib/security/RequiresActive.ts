/**
 * @RequiresActive(mixinName) — method decorator that gates a call on
 * `MixinApi.isActive(this, mixinName)`. Throws
 * `InactiveCapabilityError` when the mixin isn't active.
 *
 * Wave-1 backstop for augment-gated capabilities. The verb-level
 * `requires<Modality>` validator catches command-dispatched calls
 * early; this decorator closes the gap for any direct caller (test
 * fixtures, internal subsystems, NPCs invoking methods via Aether
 * conversation, etc.).
 *
 * Convention: every public method on a `_augmentGated: true` mixin
 * MUST carry this decorator. Skipping it leaves an inactive-mixin
 * gap that bypasses the gating substrate. Code review enforces.
 *
 * Lives next to `@CallSecurity` / `@Final` / `@Unshadowable` — same
 * role of method-level enforcement.
 */

import { MixinApi } from '../../api/mixin';
import type { Stuff } from '../stuff/Stuff';

export class InactiveCapabilityError extends Error {
  public readonly mixinName: string;
  public readonly methodName: string;

  constructor(mixinName: string, methodName: string) {
    super(
      `${mixinName}.${methodName} is inactive — no installed augment ` +
        `confers ${mixinName}`,
    );
    this.name = 'InactiveCapabilityError';
    this.mixinName = mixinName;
    this.methodName = methodName;
  }
}

export function RequiresActive(mixinName: string): MethodDecorator {
  return function (
    _target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const original = descriptor.value as
      | ((this: unknown, ...args: unknown[]) => unknown)
      | undefined;
    if (typeof original !== 'function') {
      throw new TypeError(
        `@RequiresActive: target ${String(propertyKey)} is not a method`,
      );
    }
    descriptor.value = function (this: Stuff, ...args: unknown[]) {
      if (!MixinApi.isActive(this, mixinName)) {
        throw new InactiveCapabilityError(mixinName, String(propertyKey));
      }
      return original.apply(this, args);
    };
    return descriptor;
  };
}
