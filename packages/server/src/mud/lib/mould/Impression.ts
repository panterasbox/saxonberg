/**
 * Impression — ⭐ a SHAPE copied from a thing, never its identity
 * (ceramics M9, D21).
 *
 * Pressed into a soft medium, a pattern leaves its form: what KIND of thing
 * it was, how big, what it looked like, what parts it showed, and whose it
 * was and when the impression was taken. A cast from it is a fresh thing of
 * that kind — no name, no mark, no grade, no history carries — except where
 * the thing's FUNCTION is its shape (a key's wards: `carried.keys`) or its
 * mark is the point (a seal's device: `carried.seal`).
 *
 * The potter's mark rides one too: a stamp's impression is the potter's
 * identity (`takenFromIdentity`), pressed into a leather-hard base.
 */

/** A copied shape, as a plain value. */
export interface ImpressionData {
  /** The template path of the thing the shape came from. */
  kindPath: string;
  /** Its volume, L (a cast's mass is this × the poured density). */
  volumeL: number;
  /** How the form reads (`a short sword`). */
  formDescription: string;
  /** The parts the shape shows (`a cross-guard, a ridged grip`). */
  partsDescription: string;
  /** Whose thing it was — the identity path, or `''`. */
  takenFromIdentity: string;
  /** Game-second the impression was taken. */
  takenAtS: number;
  /** What the shape carries because the shape IS the function. */
  carried: { keys?: { keyway: string; technology: string }[]; seal?: string };
  /**
   * ⭐ The pattern-maker's allowance (ceramics D23): a pattern carved
   * OVERSIZE by the linear shrinkage of the metal it was cut for, so the
   * cast shrinks back to true. `0` (absent) — an impression of the thing
   * itself, which casts a shade small.
   */
  allowance?: number;
  /**
   * The shape will not draw out of a one-piece rigid mould — something
   * stands out of its body (a guard, a handle). Only a mould broken to
   * release (sand, wax) or one of two pieces takes it.
   */
  undercut?: boolean;
  /**
   * ⭐ Its length, m, when the shape is long (a blade, a rod) — what makes
   * a cast's modulus a prism's and not a cube's (Chvorinov). Absent ⇒ the
   * shape is read as compact.
   */
  lengthM?: number;
  /** How the thing it was taken from was called, at the time (`look` names it when the identity is not in the world). */
  takenFromName?: string;
}

/** A copied shape. Immutable; `toData()` is what persists. */
export class Impression {
  private readonly data: ImpressionData;

  constructor(data: ImpressionData) {
    if (typeof data?.kindPath !== 'string') {
      throw new RangeError("Impression: 'kindPath' must be a template path");
    }
    this.data = {
      ...data,
      volumeL: Number.isFinite(data.volumeL) && data.volumeL > 0 ? data.volumeL : 0,
      carried: { ...(data.carried ?? {}) },
      allowance:
        Number.isFinite(data.allowance) && (data.allowance as number) > 0 ? (data.allowance as number) : 0,
      undercut: data.undercut === true,
      lengthM: Number.isFinite(data.lengthM) && (data.lengthM as number) > 0 ? (data.lengthM as number) : 0,
    };
  }

  public getKindPath(): string {
    return this.data.kindPath;
  }

  public getVolumeL(): number {
    return this.data.volumeL;
  }

  public getFormDescription(): string {
    return this.data.formDescription;
  }

  public getPartsDescription(): string {
    return this.data.partsDescription;
  }

  public getTakenFromIdentity(): string {
    return this.data.takenFromIdentity;
  }

  public getTakenAtS(): number {
    return this.data.takenAtS;
  }

  public getCarried(): Readonly<ImpressionData['carried']> {
    return this.data.carried;
  }

  /** The linear oversize the pattern was cut to, `0` for the thing itself. */
  public getAllowance(): number {
    return this.data.allowance ?? 0;
  }

  /** Does something stand out of the shape that a one-piece rigid mould cannot draw? */
  public hasUndercut(): boolean {
    return this.data.undercut === true;
  }

  /** The shape's length, m — `0` when it is compact (read as a cube). */
  public getLengthM(): number {
    return this.data.lengthM ?? 0;
  }

  /** The name the source went by when the impression was taken, or `''`. */
  public getTakenFromName(): string {
    return this.data.takenFromName ?? '';
  }

  public toData(): ImpressionData {
    return { ...this.data, carried: { ...this.data.carried } };
  }
}
