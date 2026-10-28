/**
 * FormingMixin — ⭐ an instrument that shapes a PLASTIC MASS into a form a
 * word names (ceramics D14, D16; made general in review, 2026-10-28): the
 * potter's wheel and the brick table work clay, the blowpipe works a gather
 * of glass. One law for all of them — a form is a class × a capacity × a
 * proportion (`FormSpec`), and the familiar words are `Form` rows — so a new
 * pot, a new brick or a new blown vessel is a row, never code.
 *
 * The instrument PLANS `shape` (`ShapePlanner`, which each composer
 * implements — the throw, the day at the table and the blow are different
 * work). What this mixin owns is what they share:
 *
 *  - its words (`forms:` — `Form` rows loaded by path when asked; nothing
 *    scans) and the classes it makes (`formClasses`, a hook);
 *  - the mass it works (`formingMass`, a hook — each composer finds its own
 *    by its own class: clay in the hands or the room, the gather on the pipe);
 *  - the parse, the class check, the product (the word's, else this
 *    instrument's `formTemplates`, else the mass's material's), and the hand:
 *    a vessel larger than this maker can raise is refused in the mass's own
 *    words (`Formable.refuseBeyond`).
 *
 * Kernel, because its composers live in two packs with no common ancestor
 * (ceramics and glass).
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { FormClass, FormWord } from './FormSpec';
import { FormGrammar, ParsedForm } from './FormSpec';
import type { Formable, FormingHand, ShapeRefusal, ShapeRequest } from './Shapeable';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';
import Form from '../../platform/idea/Form';

/** What a forming instrument resolved for a shape. */
export interface FormingTarget {
  /** The plastic mass being worked. */
  mass: Stuff & Formable;
  form: ParsedForm;
  /** The row the piece is minted as. */
  product: string;
  /** This maker's hand at the form's discipline. */
  hand: FormingHand;
  discipline: string;
}

/** A class whose instances are a plastic mass an instrument forms. */
export type FormableClass = MixinConstructor<Stuff & Formable>;

/** The surface {@link FormingMixin} adds. */
export interface Forming {
  /** The Form rows this instrument makes, by path. */
  getForms(): readonly string[];
}

export function FormingMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  class FormingMixin extends Base implements Forming {
    static _mixinName = 'FormingMixin';

    static fieldMeta: FieldMeta = {
      forms: { persistent: true, authorable: true },
      formTemplates: { persistent: true, authorable: true },
    };

    /** The Form rows this instrument makes, by path. */
    public forms: string[] = [];
    /** Fallback products by form class, when a word names none. */
    public formTemplates: Partial<Record<FormClass, string>> = {};

    public getForms(): readonly string[] {
      return this.forms;
    }

    /** @hook The form classes this instrument makes. */
    protected formClasses(): readonly FormClass[] {
      return ['open', 'closed', 'flat', 'cone'];
    }

    /** @hook The discipline a word that names none is worked in. */
    protected formingDiscipline(): string {
      return 'pottery';
    }

    /** @hook The class of mass this instrument works (clay) — or `null`. */
    protected formingMassClass(): FormableClass | null {
      return null;
    }

    /**
     * @hook The plastic mass this shape would work, or `null` when there is
     * none — the shape is then not this instrument's business. By default:
     * the mass named, else one of {@link formingMassClass} in the maker's
     * hands, else one beside the instrument. A pipe overrides it (its mass is
     * the gather on it).
     */
    protected formingMass(req: ShapeRequest): (Stuff & Formable) | null {
      const K = this.formingMassClass();
      if (K === null) return null;
      const is = (s: Stuff | null): s is Stuff & Formable => s !== null && s instanceof K;
      if (is(req.material)) return req.material;
      if (MixinApi.isContainer(req.actor)) {
        for (const c of req.actor.getContents() as Stuff[]) if (is(c)) return c;
      }
      const self = this as unknown as Stuff;
      const room = MixinApi.isContainable(self) ? self.getContainer() : null;
      if (room !== null && MixinApi.isContainer(room)) {
        for (const c of room.getContents() as Stuff[]) if (is(c)) return c;
      }
      return null;
    }

    /**
     * The words it knows, loaded by path. ⚠ A listed row that will not load
     * is an authoring error and is NOT skipped quietly — an instrument that
     * silently forgot a word reads as a player's mistake.
     */
    protected async formWords(): Promise<FormWord[]> {
      const out: FormWord[] = [];
      for (const path of this.forms) {
        const row = await StuffApi.singleton<Stuff>(path);
        if (!(row instanceof Form)) {
          throw new TypeError(`FormingMixin: '${path}' is not a Form row`);
        }
        out.push(row.toWord());
      }
      return out;
    }

    /**
     * ⭐ Resolve what this instrument would make — or a refusal in words.
     * `null` when there is no mass to work (a blowpipe's gather is not the
     * wheel's business).
     */
    protected async resolveForming(req: ShapeRequest): Promise<FormingTarget | ShapeRefusal | null> {
      const mass = this.formingMass(req);
      if (mass === null) return null;
      const parsed = new FormGrammar(await this.formWords()).parse(req.formText);
      if (!(parsed instanceof ParsedForm)) {
        return { ok: false, reason: parsed.reason, line: Mml.compose`${parsed.line}` };
      }
      const self = this as unknown as Stuff;
      if (!this.formClasses().includes(parsed.formClass)) {
        return {
          ok: false,
          reason: 'wrong-instrument',
          line: Mml.compose`${Mml.thing(self)} will not make that shape.`,
        };
      }
      const material = MixinApi.isTangible(mass) ? mass.getMaterial() : null;
      const product =
        parsed.word?.product ||
        this.formTemplates[parsed.formClass] ||
        material?.getFormTemplates()[parsed.formClass] ||
        '';
      if (product === '') {
        return {
          ok: false,
          reason: 'no-product',
          line: Mml.compose`You could make that shape, but it would be nothing anybody has a name for.`,
        };
      }
      const discipline = parsed.word?.discipline || this.formingDiscipline();
      const hand = await mass.formingHand(req.actor, discipline);
      // A block or a flat piece is the mould's size, not the hand's.
      const raised = parsed.formClass !== 'block' && parsed.formClass !== 'flat';
      if (raised && parsed.capacityL > hand.maxL) return mass.refuseBeyond(hand);
      return { mass, form: parsed, product, hand, discipline };
    }
  }
  return FormingMixin;
}
