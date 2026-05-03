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
