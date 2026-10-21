/**
 * FormingMixin — ⭐ an instrument that shapes clay into forms (ceramics D14,
 * D16): the wheel, the brick table. The instrument PLANS (`ShapePlanner`):
 * it knows its words (its row's `forms:` list, Form rows loaded by path on
 * use — nothing scans), which form classes it makes, and what it takes; the
 * CLAY yields the piece (`Clay.yieldPieces`), and the potter's hand
 * (competence) decides its wall, its largest size and its grade.
 *
 * Pack `lib/`: substrate only ever inherited, composed by `Wheel` and
 * `BrickTable`.
 */

import type { MixinConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { FormClass, FormWord } from '@saxonberg/server/mud/lib/craft/FormSpec';
import { FormGrammar, ParsedForm } from '@saxonberg/server/mud/lib/craft/FormSpec';
import type { ShapeRefusal, ShapeRequest } from '@saxonberg/server/mud/lib/craft/Shapeable';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type Form from '@saxonberg/server/mud/platform/idea/Form';
import type Clay from '@saxonberg/content-trade-quarrying/src/thing/Clay';

/** What a forming instrument resolved for a shape. */
export interface FormingTarget {
  clay: Clay;
  form: ParsedForm;
  product: string;
}

export function FormingMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  class FormingMixin extends Base {
    static fieldMeta: FieldMeta = {
      forms: { persistent: true, authorable: true },
      formTemplates: { persistent: true, authorable: true },
    };

    /** The Form rows this instrument makes, by path. */
    public forms: string[] = [];
    /** Fallback products by form class, when a word names none. */
    public formTemplates: Partial<Record<FormClass, string>> = {};

    /** @hook The form classes this instrument makes. */
    protected formClasses(): readonly FormClass[] {
      return ['open', 'closed', 'flat', 'cone'];
    }

    /** The words it knows, loaded by path. */
    protected async formWords(): Promise<FormWord[]> {
      const out: FormWord[] = [];
      for (const path of this.forms) {
        try {
          const row = await StuffApi.singleton<Form>(path);
          if (row && typeof (row as Partial<Form>).toWord === 'function') out.push(row.toWord());
        } catch {
          // a word whose row is gone is a word it no longer knows
        }
      }
      return out;
    }

    /** Find the clay this shape works: the one named, else one in the hands. */
    protected clayFor(req: ShapeRequest): Clay | null {
      const isClay = (s: Stuff | null): s is Stuff =>
        s !== null && typeof (s as unknown as Partial<Clay>).yieldPieces === 'function';
      if (isClay(req.material)) return req.material as unknown as Clay;
      if (MixinApi.isContainer(req.actor)) {
        for (const c of req.actor.getContents()) if (isClay(c)) return c as unknown as Clay;
      }
      const self = this as unknown as Stuff;
      const room = MixinApi.isContainable(self) ? self.getContainer() : null;
      if (room !== null) {
        for (const c of room.getContents()) if (isClay(c)) return c as unknown as Clay;
      }
      return null;
    }

    /**
     * ⭐ Resolve what this instrument would make — or a refusal in words.
     * `null` when the shape is not this instrument's business at all (no
     * clay to work: a blowpipe's gather is somebody else's).
     */
    protected async resolveForming(req: ShapeRequest): Promise<FormingTarget | ShapeRefusal | null> {
      const clay = this.clayFor(req);
      if (clay === null) return null;
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
      const product =
        parsed.word?.product ||
        this.formTemplates[parsed.formClass] ||
        clay.getMaterial()?.getFormTemplates()[parsed.formClass] ||
        '';
      if (product === '') {
        return {
          ok: false,
          reason: 'no-product',
          line: Mml.compose`You could make that shape, but it would be nothing anybody has a name for.`,
        };
      }
      return { clay, form: parsed, product };
    }
  }
  return FormingMixin;
}
