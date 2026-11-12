/**
 * MadeFromMixin — ⭐ **whose a made thing is, from what it was made of**:
 * the owner of the inputs (`StuffApi.clone`'s `madeFrom`), or the maker a
 * PROCESS declares (a pot's cake, a mould's cast — the communal-oven rule,
 * where `null` means nobody, never whoever happened to be looking). Read
 * once, on the good's first arrival, by the chattel logic's derived title;
 * the title it yields is what persists. These two slots are not persisted.
 *
 * ## ⭐ Why it is its own mixin (controllers-are-io D6)
 *
 * It shipped on `ChattelMixin`, which is the TITLE — the durable id, the
 * owner, custody. But composing it claimed *every chattel may be made*, and
 * a cow, a kept dog and a herd beast are chattels nobody made (ranching
 * writes SERVED, never made). So the title keeps its name, its file and
 * every `requires: [ChattelMixin]` / `FromMixin("ChattelMixin")`, and this
 * composes on the made things only — `Good` and `Vessel`. Readers narrow
 * on `MixinApi.isMadeFrom`.
 */

import { Mixins, type MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import { CallSecurity, Final, Unshadowable } from "../security/decorators";
import { SecurityPolicies } from "../security/SecurityPolicies";
import { StuffApi } from "../../api/stuff";
import { MixinApi } from "../../api/mixin";
import type { Containable } from "../spatial/Containable";
// eslint-disable-next-line no-restricted-imports -- the F1 object face (carved off Chattel.ts with its import): a made good's recordMadeFrom() forwards into the chattel logic singleton exactly as the api/chattel facade does (the Combustible/Energized precedent)
import { ChattelLogic } from "../../platform/idea/api/ChattelLogic";
import type { ChattelOwner } from "./ChattelRecord";

/** The chattel logic singleton (the minting authority) — lazily, by path. */
function chattelLogic(): ChattelLogic {
  return StuffApi.singletonSync(
    "/platform/idea/api/chattel",
    () => new ChattelLogic(),
  );
}

/** The public surface: what a made good says about what it was made from. */
export interface MadeFrom {
  /**
   * Note who owned what this good was made from (`StuffApi.clone`'s
   * `madeFrom`) — the title its first arrival derives. Not persisted: it
   * is read once, on arrival, and the title it yields is what persists.
   */
  recordMadeFrom(inputs: readonly Stuff[]): Promise<void>;
  /** The owner of what this was made from, when they all agree; else null. */
  getMadeFromOwner(): ChattelOwner | null;
  /**
   * ⭐ A PROCESS mint declares whose its output is — a pot's cake, a
   * mould's cast, a firing's lump — from what went into it (the
   * communal-oven rule), and `null` means NOBODY: never whoever happened to
   * be looking when it set. Read once, on arrival, like `recordMadeFrom`.
   */
  recordMadeBy(owner: ChattelOwner | null): void;
  /** Did a process declare this good's maker (even as nobody)? */
  isMadeByProcess(): boolean;
}

export function MadeFromMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  // Class *declaration* (not a returned expression) so the method
  // decorators are valid under legacy-decorator rules.
  class MadeFromMixin extends Base implements MadeFrom {
    static _mixinName = "MadeFromMixin";

    /** See {@link MadeFrom.recordMadeFrom}. */
    public _madeFromOwner: ChattelOwner | null = null;

    @Final
    @Unshadowable
    public async recordMadeFrom(inputs: readonly Stuff[]): Promise<void> {
      this._madeFromOwner = await chattelLogic().ownerOfInputs(this as unknown as Stuff, inputs);
    }

    public getMadeFromOwner(): ChattelOwner | null {
      return this._madeFromOwner;
    }

    /** See {@link MadeFrom.recordMadeBy}. */
    public _madeByProcess = false;

    // ⚠ A declared maker titles a fresh good, so only a process mint may
    // declare one — a mould setting its cast (a firing hands the mould
    // its owner through `castInto`), or a plumbed room standing up its own
    // pipe run, which is NOBODY's (controller-liquidity W15: the drive found
    // the bar's run titled to whoever ordered the drink that first read
    // the tap — rung 3, the acting person where they stand).
    // ⭐ And only of a thing not yet placed anywhere (controllers-are-io
    // D25): a class merely declaring the mould marker can name the maker
    // of what it just minted, never of a good already in the world.
    @CallSecurity(
      SecurityPolicies.AllOf(
        SecurityPolicies.AnyOf(SecurityPolicies.FromMixin(Mixins.Mould), SecurityPolicies.FromMixin(Mixins.Plumbed)),
        SecurityPolicies.Custom(
          (_caller, target) =>
            !MixinApi.isContainable(target as Stuff) ||
            (target as Stuff & Containable).getContainer() === null,
          'TheCastIsUnplaced',
        ),
      ),
    )
    public recordMadeBy(owner: ChattelOwner | null): void {
      this._madeFromOwner = owner;
      this._madeByProcess = true;
    }

    public isMadeByProcess(): boolean {
      return this._madeByProcess;
    }
  }
  return MadeFromMixin;
}
