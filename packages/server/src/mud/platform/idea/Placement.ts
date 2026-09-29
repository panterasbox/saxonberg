/**
 * Placement — ⭐⭐ **a way of sitting**, and the word a player types for
 * it.
 *
 * One `Placement` is one relation between a thing and the host it sits
 * on or in: `on` a shelf, `in` a compartment with its own air, `from` a
 * hook. It is the vocabulary behind `PlacingMixin` — a host's
 * `placements: [from]` names members from this roster, and `put`,
 * `look` and `dry` read the member to know what word to accept, what
 * sentence to print, and what to call the drill-in list.
 *
 * A member is a **row**:
 *
 * ```yaml
 * class: /platform/idea/Placement
 * hydratorClass: /platform/idea/persistence/PersistentHydrator
 * data:
 *   name: from
 *   prepositions: [from, on]
 *   encloses: false
 *   prose: "{{ actor }} hang{{ s }} {{ item }} from {{ host }}."
 *   heading: Hanging from it
 * ```
 *
 * ⭐ **A new way of sitting costs one row, plus one word on every verb
 * whose argument accepts a placement host** — today `put` and `dry`, and
 * `pnpm -C packages/server lint:placement-words --list` is what tells an
 * author which those are. No kernel change, no engineer. That claim is
 * what this class exists to make true, and it is the one the build is
 * judged on.
 *
 * ⚠ **`Placement` is also a type in `lib/combat/AimResolution.ts`** (the
 * aim × answer grid). Different modules, no runtime clash — the module
 * registry keys on class identity. Combat's stays untouched. The
 * persisted struct that records a placement is `ContentPlacement`, in
 * `lib/persistence/PersistenceSlice.ts`, renamed for the same reason.
 *
 * ## The fields, and who reads each
 *
 * | field | read by |
 * |---|---|
 * | `name` | the catalogue index; `PlacingMixin.getPlacements` |
 * | `prepositions` | `PlacingMixin.resolvePlacement`, `PutController`'s offers |
 * | `encloses` | `Containable.getEnclosingScope`, `PlacingMixin.canPlace` |
 * | `prose` | `PutController`, `DryController` |
 * | `heading` | `look` / `sense` drill-in |
 *
 * ⭐ **Primary word first.** `prepositions[0]` is the member's own word
 * and no two members may share one (`lint:placement-words` refuses it);
 * the rest are words the member also answers to, so `put ham on hook`
 * reaches a host that only offers `from`.
 */

import { Idea } from '../../lib/stuff/Idea';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import type { FieldMeta } from '../../lib/mixin';

const PlacementBase = SingletonMixin(Idea);

export default class Placement extends PlacementBase {
  /** The subtree every placement row lives under, at any root. */
  static readonly PATH_INFIX = '/idea/Placement/';

  /** The member's name — what a host's `placements:` list names. */
  public name: string = '';

  /** The words a player may type, primary first. Never empty in practice. */
  public prepositions: string[] = [];

  /**
   * ⭐ Whether sitting here puts the thing INSIDE something — for air,
   * sight and reach. `in` encloses; `on` and `from` do not.
   *
   * An enclosing member is the seam the whole build turns on: a thing
   * placed under one reads its host's air rather than the room's, and a
   * shut host refuses both the put and the reach.
   */
  public encloses: boolean = false;

  /**
   * One Liquid template, rendered per audience through `ProseApi.format`
   * with `actor` · `item` · `host` (Mml presentations) and the agreement
   * variables `{{ s }}` / `{{ es }}` that `EmoteGrammar` already binds —
   * so *"You put"* and *"Dave puts"* are one authored sentence, not two.
   */
  public prose: string = '';

  /** The drill-in label: `On it`, `In it`, `Hanging from it`. */
  public heading: string = '';

  static fieldMeta: FieldMeta = {
    name: { persistent: true, authorable: true },
    prepositions: { persistent: true, authorable: true },
    encloses: { persistent: true, authorable: true },
    prose: { persistent: true, authorable: true },
    heading: { persistent: true, authorable: true },
  };

  public getName(): string {
    return this.name;
  }

  /** The words this member answers to, primary first. */
  public getPrepositions(): readonly string[] {
    return [...this.prepositions];
  }

  /** The member's own word — what a refusal names and a listing prints. */
  public getPrimaryWord(): string {
    return this.prepositions[0] ?? this.name;
  }

  public getEncloses(): boolean {
    return this.encloses;
  }

  public getProse(): string {
    return this.prose;
  }

  public getHeading(): string {
    return this.heading;
  }
}
