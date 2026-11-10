/**
 * FormCatalogue — the singleton that serves the `form` documents, the form words an instrument makes (`mug`, `jar`, `brick`), any pack's `content/forms/`, reached as `CraftingApi.forms()`.
 *
 * ⭐ Named by path and loaded on reach (documents D7): whatever cites one
 * returns or awaits `ensure(path)`, and `need(path)` reads a resident one
 * (a miss throws). Stood up on first reach, never at boot.
 */

import { DocumentCatalogue } from '../../lib/document/DocumentCatalogue';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import { FORM_CLASSES, FORM_PROPORTIONS, type FormClass, type FormProportion, type FormWord } from '../../lib/craft/FormSpec';

export default class FormCatalogue extends DocumentCatalogue<FormWord> {
  /** A reference catalogue everyone reads (the commons). */
  static boundaryRole: BoundaryRole = 'commons';

  protected readonly kind = 'form';

  /** Validate a `form` document at `path` (the installer's validator too); throws naming what is wrong. */
  public parse(data: Record<string, unknown>, path: string): FormWord {
    const formClass = (data.formClass ?? 'open') as FormClass;
    if (!FORM_CLASSES.includes(formClass)) {
      throw new RangeError(`form '${path}': formClass '${String(formClass)}' is not one of ${FORM_CLASSES.join(', ')}`);
    }
    const proportion = (data.proportion ?? null) as FormProportion | null;
    if (proportion !== null && !FORM_PROPORTIONS.includes(proportion)) {
      throw new RangeError(`form '${path}': proportion '${String(proportion)}' is not one of ${FORM_PROPORTIONS.join(', ')}`);
    }
    const word = typeof data.key === 'string' && data.key ? data.key : path.slice(path.lastIndexOf('/') + 1);
    const greenScale = typeof data.greenScale === 'number' && data.greenScale > 0 ? data.greenScale : 1;
    return {
      key: word,
      formClass,
      capacityL: typeof data.capacityL === 'number' ? data.capacityL : 0.5,
      proportion,
      product: typeof data.product === 'string' ? data.product : '',
      seats: Array.isArray(data.seats) ? data.seats.filter((x): x is string => typeof x === 'string') : [],
      greenScale,
      discipline: typeof data.discipline === 'string' && data.discipline ? data.discipline : 'pottery',
    };
    }
}
