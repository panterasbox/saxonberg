/**
 * Form — ⭐ a form WORD as a row (ceramics S4, D16): `mug` is an open
 * vessel of about a pint with a handle seat; `brick` is the statute block.
 * An author adds a word with a row; an instrument lists the words it makes
 * (`forms:` on the wheel's and the brick table's rows), and the words are
 * loaded by path when a `shape` asks — nothing scans for them.
 *
 * The value it answers is a `FormWord` (`lib/craft/FormSpec.ts`).
 */

import { Idea } from '../../lib/stuff/Idea';
import type { FieldMeta } from '../../lib/mixin';
import type { FormClass, FormProportion, FormWord } from '../../lib/craft/FormSpec';

const CLASSES: readonly FormClass[] = ['open', 'closed', 'flat', 'block', 'cone'];
const PROPORTIONS: readonly FormProportion[] = ['tall', 'squat', 'wide', 'narrow'];

export default class Form extends Idea {
  public key = '';
  public formClass: FormClass = 'open';
  public capacityL = 0.5;
  public proportion: FormProportion | null = null;
  public product = '';
  public seats: string[] = [];
  public greenScale = 1;
  public discipline = 'pottery';

  static fieldMeta: FieldMeta = {
    key: { persistent: true, authorable: true },
    formClass: { persistent: true, authorable: true },
    capacityL: { persistent: true, authorable: true },
    proportion: { persistent: true, authorable: true },
    product: { persistent: true, authorable: true },
    seats: { persistent: true, authorable: true },
    greenScale: { persistent: true, authorable: true },
    discipline: { persistent: true, authorable: true },
  };

  public setFormClass(value: FormClass): void {
    if (!CLASSES.includes(value)) {
      throw new RangeError(`Form.formClass: '${value}' is not one of ${CLASSES.join(', ')}`);
    }
    this.formClass = value;
  }

  public setProportion(value: FormProportion | null): void {
    if (value !== null && !PROPORTIONS.includes(value)) {
      throw new RangeError(`Form.proportion: '${value}' is not one of ${PROPORTIONS.join(', ')}`);
    }
    this.proportion = value;
  }

  /** The word as the grammar reads it. */
  public toWord(): FormWord {
    return {
      key: this.key,
      formClass: this.formClass,
      capacityL: this.capacityL,
      proportion: this.proportion,
      product: this.product,
      seats: [...this.seats],
      greenScale: this.greenScale > 0 ? this.greenScale : 1,
      discipline: this.discipline,
    };
  }
}
