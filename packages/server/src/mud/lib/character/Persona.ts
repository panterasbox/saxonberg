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

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { CommandContributions } from '../../api/command';
import type { Stuff } from '../stuff/Stuff';
import { SettingTypes, type SettingsSchemaEntry } from '../shell/Environment';
import ChronicleEntry from '../chronicle/ChronicleEntry';
import type {
  ChronicleEntryFields,
  ChronicleClaimSeed,
} from '../chronicle/ChronicleEntry';
import { ProseApi } from '../../api/prose';
import { WorldClockApi } from '../../api/worldclock';
import { PersistApi } from '../../api/persist';
import { Final, Unshadowable } from '../security/decorators';

/** Public shape provided by PersonaMixin. */
export interface Persona {
  getBio(): string;
  setBio(value: string): void;
  getAspiration(): string | null;
  setAspiration(value: string | null): void;
  recordClaim(fields: ChronicleEntryFields): Promise<void>;
  recordDeed(fields: ChronicleEntryFields): Promise<void>;
  recordChronicleOnce(
    key: string,
    fields: ChronicleEntryFields,
  ): Promise<void>;
  chronicleEntries(): Promise<ChronicleEntry[]>;
  seedChronicleClaims(seeds: ChronicleClaimSeed[]): Promise<void>;
}

/* ────────── the chronicle mint path (module-private) ──────────
 * Moved in whole from the retired ChronicleLogic (the ledger owner
 * face of the Api OO sweep): the single build seam and its helpers.
 */

/** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
function chronicleActive(): boolean {
  return PersistApi.isConnected();
}

/** The durable owner key, or `null` for a session-ephemeral owner. */
function ownerKey(owner: Stuff): string | null {
  return owner.getIdentityPath();
}

/**
 * The single build seam: resolve fields into one persisted
 * {@link ChronicleEntry}. Renders prose when a `template` is given (the
 * one "deed text via ProseApi" point), and stamps the game-time witness
 * onto a deed when `when` is omitted (the one "timestamp is the
 * witness" point). A claim forces `when = null` and keeps `order`; a
 * deed forces `order = null`.
 */
async function buildAndSave(
  ownerId: string,
  fields: ChronicleEntryFields,
): Promise<void> {
  const entry = new ChronicleEntry();
  entry.owner = ownerId;
  entry.kind = fields.kind ?? 'deed';
  entry.text =
    fields.template !== undefined
      ? ProseApi.format(fields.template, fields.vars ?? {}).toString()
      : (fields.text ?? '');
  entry.when =
    entry.kind === 'deed'
      ? (fields.when ?? WorldClockApi.getNow().rawValue())
      : null;
  entry.order = entry.kind === 'claim' ? (fields.order ?? null) : null;
  entry.where = fields.where ?? null;
  entry.who = fields.who ?? [];
  entry.tags = fields.tags ?? [];
  entry.key = fields.key ?? null;
  await entry.save();
}

/** Shared mint path — no-ops without a durable owner key / connection. */
async function recordImpl(
  owner: Stuff,
  fields: ChronicleEntryFields,
): Promise<void> {
  if (!chronicleActive()) return;
  const ownerId = ownerKey(owner);
  if (!ownerId) return;
  await buildAndSave(ownerId, fields);
}

export function PersonaMixin<TBase extends MixinConstructor>(Base: TBase) {
  // Declared-then-returned (the Meltable shape) so method decorators
  // are legal — a class EXPRESSION cannot carry them.
  class PersonaMixin extends Base {
    static _mixinName = 'PersonaMixin';
    static fieldMeta: FieldMeta = {
      bio: { persistent: true, authorable: true },
      aspiration: { persistent: true, authorable: true },
    };

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
        'platform/cmd/charactergen/chronicle.yaml',
        'platform/cmd/charactergen/traits.yaml',
        'platform/cmd/social/standing.yaml',
        'platform/cmd/social/who.yaml',
        'platform/cmd/social/profile.yaml',
        'platform/cmd/social/score.yaml',
        // The `office`/`offices` verb is afforded universally here — NOT
        // on AuthorMixin — because its roster is public (governance is
        // transparent by constitutional design, Art. VII): every player
        // can see who holds which office. The privileged `assign`/`vacate`
        // subcommands carry the `requiresFoundingAuthority` subcommand-level
        // validator (the governance-root gate), leaving the bare/`list`
        // roster ungated. Homing it on AuthorMixin would wrongly hide the
        // public roster from non-authors.
        'platform/cmd/governance/office.yaml',
        // The `government`/`gov` verb (civics — the FICTION's governments,
        // a different category than the Compact's `governance`) is likewise
        // universal: the jurisdiction chain over where you stand and your
        // residency are public reads.
        'platform/cmd/civics/government.yaml',
        // The `committee` verb (system — META administration: the group
        // holding title over a subdivision) — a public read like the two
        // above; the one mutation (channel ensure) is idempotent.
        'platform/cmd/system/committee.yaml',
        // The `appoint` verb (employment) — fill a position on an
        // organization's chart. Universal for the same reason `office` is:
        // the gate is the authority, not the affordance. The
        // `mustHoldAppointingAuthority` FIELD validator on the
        // organization argument does the refusing — a verb-level one
        // cannot, because the authority belongs to the organization the
        // argument names and `CommandContext` carries no bound model.
        'platform/cmd/employment/appoint.yaml',
        // The `quit` verb (employment) — leave a position you hold. Universal
        // for the same reason: it is your own seat, and the controller
        // refuses when you hold none.
        'platform/cmd/employment/quit.yaml',
        // The `title` verb (civics) — what ground you hold and what is
        // for sale. Universal for the same reason `government` is: your
        // own holdings are a self-read, and a plat book is public. The
        // one act that changes anything (`title buy`) gates itself on
        // standing at the Registry counter.
        'platform/cmd/civics/title.yaml',
      ],
      peers: [],
      environment: [],
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

    /**
     * Claimed narrative prose. Seeded at char-gen; editable later.
     */
    public bio: string = '';

    /**
     * Closed-choice origin/aspiration key (or null if unset).
     */
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

    /* ────────── the chronicle owner face (the OO sweep) ──────────
     *
     * ⚠ Gate note, recorded: the plan called for a witness-gated
     * `recordDeed` (a closed FromController/FromClass arm list) and a
     * self-callable `recordClaim`. Grounding found the writer set OPEN
     * BY DESIGN: content packs mint claims and deeds as a normal
     * authoring act (arcana's StudyController, the retail menu, the
     * script interpreter's can-make deed), and a kernel gate cannot
     * enumerate optional packs without coupling the kernel to them —
     * the exact anti-pattern the pack system forbids. So the mutators
     * are UNGATED (P5 parity with the retired Public statics) and
     * SEALED — the append-only invariant and the single build seam are
     * the enforced properties; who may witness what remains a review
     * concern, as it was.
     */

    /**
     * Mint a **claim** — the self-authored, contestable narrative kind
     * (`when = null`; `order` kept).
     */
    @Final
    @Unshadowable
    public async recordClaim(fields: ChronicleEntryFields): Promise<void> {
      return recordImpl(this as unknown as Stuff, {
        ...fields,
        kind: 'claim',
      });
    }

    /**
     * Mint a **deed** — the witnessed kind; the game-time witness is
     * stamped when `when` is omitted. `recordDeed` unqualified belongs
     * to the chronicle — the subsystem whose doc owns the word (P4).
     */
    @Final
    @Unshadowable
    public async recordDeed(fields: ChronicleEntryFields): Promise<void> {
      return recordImpl(this as unknown as Stuff, { ...fields, kind: 'deed' });
    }

    /**
     * Category-first idempotent mint: the first entry under `key` (for
     * this owner) wins; later calls no-op. The find-then-save is on the
     * WRITE path only (the belief upsert's argument).
     */
    @Final
    @Unshadowable
    public async recordChronicleOnce(
      key: string,
      fields: ChronicleEntryFields,
    ): Promise<void> {
      if (!chronicleActive()) return;
      const ownerId = ownerKey(this as unknown as Stuff);
      if (!ownerId) return;
      const [existing] = await ChronicleEntry.find({ owner: ownerId, key });
      if (existing) return;
      await buildAndSave(ownerId, { ...fields, key });
    }

    /** The owner's full ledger — the public, contestable record (ungated read). */
    public async chronicleEntries(): Promise<ChronicleEntry[]> {
      if (!chronicleActive()) return [];
      const ownerId = ownerKey(this as unknown as Stuff);
      if (!ownerId) return [];
      return ChronicleEntry.find({ owner: ownerId });
    }

    /** Seed the char-gen claim prologue (each `kind: 'claim'`, ordered). */
    @Final
    @Unshadowable
    public async seedChronicleClaims(
      seeds: ChronicleClaimSeed[],
    ): Promise<void> {
      if (!chronicleActive()) return;
      const ownerId = ownerKey(this as unknown as Stuff);
      if (!ownerId) return;
      for (const seed of seeds) {
        await buildAndSave(ownerId, {
          kind: 'claim',
          text: seed.text,
          order: seed.order,
        });
      }
    }
  }
  return PersonaMixin;
}
