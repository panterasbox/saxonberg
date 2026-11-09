/**
 * FormSpec — ⭐ **a form is five classes × a capacity × a proportion**
 * (ceramics S4, D16).
 *
 * A potter does not choose from a menu of pots. A form is an open vessel,
 * a closed (necked) vessel, flatware, a solid block or a cone; it holds
 * so much; it is tall, squat, wide or narrow. Familiar WORDS are rows that
 * name those parameters (`mug` is an open vessel of about a pint with a
 * handle seat; `brick` is the statute block), and a player may say any
 * capacity and proportion the instrument allows — then `name` what they
 * made.
 *
 * `FormGrammar` parses what a player typed — `mug`, `tall jug holding 3
 * pints`, `open vessel holding 2 litres` — against the words an instrument
 * knows (resolved by the caller from the instrument's `forms:` list, loaded
 * on use; nothing scans). ⚠ A word it does not know REFUSES naming the five
 * classes — it never binds silently.
 *
 * Value objects with instance methods only — save `Form`, the document
 * reader, whose statics are `@internal`.
 */

import type { ActRefusal } from './ActPlan';
import { DocumentCache } from '../document/DocumentCache';

/** The five form classes. */
export type FormClass = 'open' | 'closed' | 'flat' | 'block' | 'cone';

/** The four proportion words. */
export type FormProportion = 'tall' | 'squat' | 'wide' | 'narrow';

/** What a form WORD row says — the `Form` row's shape. */
export interface FormWord {
  key: string;
  formClass: FormClass;
  capacityL: number;
  proportion: FormProportion | null;
  /** The row a piece of this form is minted as, when the word names one. */
  product: string;
  /** Seats the form offers (`handle` on a jug) — what `fit` reads. */
  seats: readonly string[];
  /** How much bigger the green piece is cut than the fired one (shrinkage). */
  greenScale: number;
  /** The Discipline shaping it credits (`pottery`, `brickmaking`). */
  discipline: string;
}

/** A parsed form: what a `shape` asks for. */
export class ParsedForm {
  constructor(
    public readonly formClass: FormClass,
    public readonly capacityL: number,
    public readonly proportion: FormProportion | null,
    /** The word row it came from, if any. */
    public readonly word: FormWord | null,
  ) {}

  /** The phrase a made piece is described by — *tall jug*, *open vessel holding 2 litres*. */
  public describe(): string {
    const base = this.word?.key ?? CLASS_NOUNS[this.formClass];
    const prop = this.proportion !== null && this.proportion !== this.word?.proportion
      ? `${this.proportion} ` : '';
    const nominal = this.word?.capacityL ?? 0;
    const holds =
      this.formClass === 'block' || this.formClass === 'flat'
        ? ''
        : this.word === null || Math.abs(this.capacityL - nominal) > nominal * 0.15
          ? ` holding ${formatLitres(this.capacityL)}`
          : '';
    return `${prop}${base}${holds}`;
  }

  /**
   * ⭐ The wall's nominal mass for this form at a PROFICIENT hand, kg —
   * a vessel's wall grows with its surface, `V^⅔`; tall and narrow forms
   * carry a little more wall; a block and a cone are their own.
   */
  public nominalMassKg(): number {
    const v = Math.max(0.01, this.capacityL);
    const surface = Math.pow(v, 2 / 3);
    const byClass: Record<FormClass, number> = { open: 0.75, closed: 0.85, flat: 0.9, block: 0, cone: 1.0 };
    const k = byClass[this.formClass];
    const shape = this.proportion === 'tall' || this.proportion === 'narrow' ? 1.1 : 1;
    return k * surface * shape;
  }
}

/**
 * ⭐ A form phrase that would not parse — a reason and the facts, never
 * words (controllers-are-io D4); the `shape` controller words it. `named`
 * is the words this instrument knows, for the reply that lists them.
 */
export type FormRefusal =
  | ActRefusal<'no-form', { named: readonly string[] }>
  | ActRefusal<'unknown-form', { form: string; named: readonly string[] }>
  /** No capacity said (or none in a unit): `noun` is the class named, if one was. */
  | ActRefusal<'bad-capacity', { noun: string | null }>;

/** The class words, and what each says in a refusal. */
const CLASS_WORDS: Readonly<Record<string, FormClass>> = {
  open: 'open',
  'open vessel': 'open',
  closed: 'closed',
  'closed vessel': 'closed',
  'necked vessel': 'closed',
  flat: 'flat',
  flatware: 'flat',
  block: 'block',
  'solid block': 'block',
  cone: 'cone',
};

const CLASS_NOUNS: Readonly<Record<FormClass, string>> = {
  open: 'open vessel',
  closed: 'closed vessel',
  flat: 'flat piece',
  block: 'block',
  cone: 'cone',
};

const PROPORTIONS: readonly FormProportion[] = ['tall', 'squat', 'wide', 'narrow'];

/** Litres per unit, the old measures a potter is asked for in. */
const UNITS: Readonly<Record<string, number>> = {
  l: 1, litre: 1, litres: 1, liter: 1, liters: 1,
  ml: 0.001,
  pint: 0.568, pints: 0.568, pt: 0.568,
  quart: 1.136, quarts: 1.136,
  gallon: 4.546, gallons: 4.546, gal: 4.546,
  cup: 0.25, cups: 0.25,
};

function formatLitres(l: number): string {
  if (l >= 4.5) return `${Math.round((l / 4.546) * 10) / 10} gallons`;
  if (l >= 0.5) return `${Math.round((l / 0.568) * 10) / 10} pints`;
  return `${Math.round(l * 1000)} millilitres`;
}

/**
 * Parses a form phrase against the words an instrument knows.
 * `[proportion] <word|class> [holding <n> <unit>]`.
 */
export class FormGrammar {
  constructor(private readonly words: readonly FormWord[]) {}

  public parse(text: string): ParsedForm | FormRefusal {
    let rest = (text ?? '').trim().toLowerCase().replace(/^(a|an|the)\s+/, '');
    // A trailing instrument phrase the binder left in the form is not the form.
    rest = rest.replace(/\s+(on|at|with|using)\s+.*$/, '').trim();
    if (rest === '') {
      return { ok: false, reason: 'no-form', facts: { named: this.named() } };
    }
    let capacityL: number | null = null;
    const holding = /\s+holding\s+(\d+(?:\.\d+)?)\s*([a-z]+)\s*$/.exec(rest);
    if (holding) {
      const unit = UNITS[holding[2] ?? ''];
      const n = Number(holding[1]);
      if (unit === undefined || !(n > 0)) {
        return { ok: false, reason: 'bad-capacity', facts: { noun: null } };
      }
      capacityL = n * unit;
      rest = rest.slice(0, holding.index).trim();
    }
    let proportion: FormProportion | null = null;
    const first = rest.split(/\s+/)[0] ?? '';
    if ((PROPORTIONS as readonly string[]).includes(first)) {
      proportion = first as FormProportion;
      rest = rest.slice(first.length).trim();
    }
    const word = this.words.find((w) => w.key === rest) ?? null;
    if (word !== null) {
      return new ParsedForm(word.formClass, capacityL ?? word.capacityL, proportion ?? word.proportion, word);
    }
    const cls = CLASS_WORDS[rest];
    if (cls !== undefined) {
      if (capacityL === null && cls !== 'block' && cls !== 'flat') {
        return { ok: false, reason: 'bad-capacity', facts: { noun: CLASS_NOUNS[cls] } };
      }
      return new ParsedForm(cls, capacityL ?? 0.5, proportion, null);
    }
    return { ok: false, reason: 'unknown-form', facts: { form: rest, named: this.named() } };
  }

  /** The words this instrument knows, for a refusal that lists them. */
  private named(): string[] {
    return this.words.map((w) => w.key);
  }
}

const FORM_CLASSES: readonly FormClass[] = ['open', 'closed', 'flat', 'block', 'cone'];
const FORM_PROPORTIONS: readonly FormProportion[] = ['tall', 'squat', 'wide', 'narrow'];

/**
 * Form — ⭐ a form WORD as a `form` document (ceramics S4, D16; a document
 * since the path-identity build): `mug` is an open vessel of about a pint
 * with a handle seat. An author adds a word with a file under a pack's
 * `content/forms/`; an instrument lists the words it makes by PATH
 * (`forms:` on the wheel's and the brick table's rows), and the instrument's
 * `forms` setter loads them — so an instrument is live only when its words
 * are, and `shape` reads them synchronously. Nothing scans the kind.
 *
 * @internal the forming substrate's; an author names a path on a row.
 */
export class Form {
  private static readonly cache = new DocumentCache<FormWord>('form', (doc) =>
    Form.fromData(doc.getData(), doc.getPath()),
  );

  /** Validate a form document at `path` (the installer's validator too). */
  public static fromData(data: Record<string, unknown>, path: string): FormWord {
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

  /** The form at `path`, read if it is not resident; throws naming a path with none. */
  public static ensure(path: string): Promise<FormWord> {
    return Form.cache.ensure(path);
  }

  /** The resident form at `path`; `DocumentNotResidentError` if its instrument never loaded it. */
  public static need(path: string): FormWord {
    return Form.cache.need(path);
  }

  /** Keep a form (a unit fixture with no store behind it). */
  public static remember(path: string, word: FormWord): FormWord {
    return Form.cache.remember(path, word);
  }
}
