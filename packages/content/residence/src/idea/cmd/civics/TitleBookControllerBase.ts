/**
 * TitleBookControllerBase — what the plat-book half of `title` shares:
 * bare `title` (`TitleHoldingsController`), `title list` and `title buy`.
 *
 * ⭐ These live in the residence pack because a plat book, a deed desk and
 * a plat warren are the pack's classes, and a kernel controller cannot name
 * a pack class (controllers-are-io W8). They used to sit in the kernel,
 * meeting the book over a hand-written `Shape` and finding the desk by
 * walking prototype constructor names. The rest of the noun — `publish`,
 * `offline`, `transfer`, `subdivide` — stays the kernel's
 * (`TitleControllerBase`).
 *
 * ⭐ The desk is an ARGUMENT (`desk`, `at <desk>`, defaulting to the one in
 * reach), bound by the view and never hunted for here —
 * {@link TitleBookControllerBase.deskOf} reads it and refuses. The venue is
 * the DESK, never a room constant (residences P6), so a second records
 * office is a populated row and no code.
 */

import {
  TitleControllerBase,
  type TitleModel,
} from '@saxonberg/server/mud/platform/idea/cmd/civics/TitleControllerBase';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import PlatBook from '../../PlatBook';
import DeedDesk from '../../../thing/DeedDesk';

export interface TitleBookModel extends TitleModel {
  /** The deed desk the act is done at — bound by the view (`at <desk>`). */
  desk?: MqlOneResult;
}

export abstract class TitleBookControllerBase extends TitleControllerBase<TitleBookModel> {
  /**
   * The bound desk, or the `not-at-registry` refusal. ⚠ The arg's
   * `requires:` carries only the refusal phrase — a desk composes nothing
   * that distinguishes it — so the kind is checked here.
   */
  protected deskOf(
    model: TitleBookModel,
    context: CommandContext,
    sub: string,
  ): DeedDesk | null {
    const desk = model.desk?.stuff ?? null;
    if (desk instanceof DeedDesk) return desk;
    this.reject(
      context,
      Mml.compose`Land changes hands at the city Registry, over the counter, in the book. Not out here.`,
      'not-at-registry',
      `title ${sub} requires standing at a deed desk`,
    );
    return null;
  }

  /**
   * ⭐ The books THIS desk fronts (the scan sweep, 2026-10-14): the desk
   * names them in `books:`, each stood up here — a relation resolved at
   * the act. It used to ask a pack catalogue that found every plat book by
   * a scan of the template table and answered only for the BOOTED ones.
   */
  protected async booksAt(desk: DeedDesk): Promise<PlatBook[]> {
    const out: PlatBook[] = [];
    for (const path of desk.getBooks()) {
      const book = await StuffApi.singleton<Stuff>(path).catch(() => null);
      if (book instanceof PlatBook) out.push(book);
    }
    return out;
  }

  /**
   * The plat book an extent belongs to — attached to it in the location
   * graph's record (from the book's own `parentExtent`), stood up here.
   */
  protected async bookCovering(extent: string): Promise<PlatBook | null> {
    for (const p of await NavigationApi.attachedTo(extent, 'institution')) {
      const s = await StuffApi.singleton<Stuff>(p).catch(() => null);
      if (s instanceof PlatBook && extent.startsWith(`${s.getParentExtent()}/`)) return s;
    }
    return null;
  }
}
