/**
 * Errors raised by the call-security framework.
 *
 * Centralised so consumers can catch them without depending on the file that
 * raised them. All extend `Error` and carry small structured payloads beyond
 * the message string.
 */

export class SecurityError extends Error {
  public readonly stuffId?: string;
  public readonly methodName?: string;
  public readonly policyName?: string;

  constructor(
    message: string,
    info: {
      stuffId?: string;
      methodName?: string;
      policyName?: string;
    } = {}
  ) {
    super(message);
    this.name = 'SecurityError';
    this.stuffId = info.stuffId;
    this.methodName = info.methodName;
    this.policyName = info.policyName;
  }
}

export class DestroyedObjectError extends Error {
  public readonly stuffId: string;
  public readonly methodName: string;

  constructor(stuffId: string, methodName: string) {
    super(
      `Cannot call ${methodName}() on destroyed Stuff ${stuffId}`
    );
    this.name = 'DestroyedObjectError';
    this.stuffId = stuffId;
    this.methodName = methodName;
  }
}

export class ShadowError extends Error {
  public readonly shadowId?: string;
  public readonly hostId?: string;
  public readonly methodName?: string;

  constructor(
    message: string,
    info: {
      shadowId?: string;
      hostId?: string;
      methodName?: string;
    } = {}
  ) {
    super(message);
    this.name = 'ShadowError';
    this.shadowId = info.shadowId;
    this.hostId = info.hostId;
    this.methodName = info.methodName;
  }
}

export class FinalViolationError extends Error {
  public readonly className: string;
  public readonly qualifiedMethod: string;

  constructor(className: string, qualifiedMethod: string) {
    super(`${className} overrides final method ${qualifiedMethod}`);
    this.name = 'FinalViolationError';
    this.className = className;
    this.qualifiedMethod = qualifiedMethod;
  }
}

/**
 * ⭐ **A walk wrote** (crowded-rooms D9). The room's own reading — the light
 * walk, the sound gather, the smell fold, a live card's projection — holds
 * the world still (`ExecutionContextApi.holdWorldStill`): what the room reads for
 * everyone may not change the world, or the world comes to depend on who
 * looked. A write inside the window is an ENGINE DEFECT; a test world throws
 * this, any other world records a diagnostic and lets the write proceed.
 */
export class WalkWriteError extends Error {
  constructor(
    readonly walk: string,
    readonly write: string,
  ) {
    super(`the ${walk} wrote while the world was held still: ${write}`);
    this.name = 'WalkWriteError';
  }
}
