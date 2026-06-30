/**
 * PersonaMixin — the *claimed self-narrative* identity layer.
 *
 * Carries two fields:
 *   - `bio` — free-form authored prose about who you are across time.
 *     Editable forever (player edits land in Wave 2 via the registrar/
 *     `records` service). Char-gen seeds it from the chosen aspiration.
 *   - `aspiration` — a closed-choice of who you want to *become* (the
 *     char-gen origin pick: `something-better`, `healer`, `teacher`,
 *     `guardian`, `founder`, `seeker`). Drives the seeded bio + the
 *     themed starting outfit.
 *
 * Composed on `Character`, so PCs and any future *storied* NPC carry
 * it. Bundling the two related fields in one mixin (rather than two)
 * is deliberate — they're the same "claimed" layer.
 *
 * What `Persona` is NOT for:
 *   - *witnessed* deeds → breadcrumbs (own substrate, deferred).
 *   - *perceived* body description → `Visible.getLong` (sense/light-
 *     gated, viewer-relative).
 *   - *proper-name* identity → `Named` (name/surname/nickname).
 * Persona is the self you author and claim, not what others witness or
 * perceive.
 */

import type { MixinConstructor } from '../mixin';
import type { CommandContributions } from '../../api/command';
import { SettingTypes, type SettingsSchemaEntry } from '../shell/Environment';

/** Public shape provided by PersonaMixin. */
export interface Persona {
  getBio(): string;
  setBio(value: string): void;
  getAspiration(): string | null;
  setAspiration(value: string | null): void;
}

export function PersonaMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class PersonaMixin extends Base {
    static _mixinName = 'PersonaMixin';
    static persistentFields = ['bio', 'aspiration'];

    /**
     * Self-only verbs Persona affords. `chronicle` is a zero-arg
     * read-only self-view over the Persona-owned identity (bio +
     * aspiration-seeded prologue + the character's deeds) — so Persona,
     * which already owns bio/aspiration, is its conceptual home. The
     * mixin-level static is collected by the command affordance walk
     * (`collectBucketDefs` → `MixinApi.queryMixins`), exactly like
     * `PerceiverMixin`'s self verbs.
     */
    static commandContributions: CommandContributions = {
      self: [
        'charactergen/chronicle.yaml',
        'charactergen/traits.yaml',
        'social/standing.yaml',
        'social/who.yaml',
        'social/profile.yaml',
        'social/score.yaml',
      ],
      environment: [],
      inventory: [],
      peers: [],
    };

    /**
     * Per-character portrait override. Schema-on-owner: the portrait is
     * part of claimed identity, so its declaration lives on Persona.
     * Unset (`''`) by default — the effective portrait resolves on read
     * (`HasInteractive.getPortraitUrl`): this setting → the account's
     * Google photo → a client-generated placeholder. The default is
     * NEVER the account photo (that would freeze it stale); leaving it
     * unset keeps "default" legible and always reflects the current
     * account photo until the player explicitly overrides via `settings`.
     */
    static settings: SettingsSchemaEntry[] = [
      {
        key: 'identity.portrait',
        type: SettingTypes.String,
        default: '',
        description:
          'Your character portrait image URL. Leave unset to use your ' +
          'account photo; set a URL here to override it for this ' +
          'character.',
      },
    ];

    /** Claimed narrative prose. Seeded at char-gen; editable later. */
    public bio: string = '';

    /** Closed-choice origin/aspiration key (or null if unset). */
    public aspiration: string | null = null;

    public getBio(): string {
      return this.bio;
    }

    public setBio(value: string): void {
      this.bio = (value ?? '').trim();
    }

    public getAspiration(): string | null {
      return this.aspiration;
    }

    public setAspiration(value: string | null): void {
      this.aspiration = value === null ? null : value.trim();
    }
  };
}
