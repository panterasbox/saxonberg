/**
 * EnrollController — the char-gen verb (`enroll`), the real command
 * handler for character creation.
 *
 * Char-gen is a DRAFT STATE MACHINE, not a step flow. Each
 * `enroll <field> <value>` (species / sex / name / pronouns / aspiration)
 * validates + sets that field on the Login's `EnrollmentDraft` and
 * re-emits the FULL state (`session.identity`) — every field's
 * options + the current picks + what's missing. There is no server-side
 * "current step"; layout/flow is entirely the client's (so single-page
 * vs multi-step is a pure client change). `enroll confirm` gates on
 * nothing-missing, then runs the atomic commit: fork the per-character
 * template, register ownership, clone + dress the Avatar, hand off.
 *
 * The rosters (species / pronouns / aspirations) are CONTENT
 * (`config/char-gen.yaml`), loaded + cached here — not a switch. The
 * name suggester lives on `Species` (reads the `NameBank` Documents).
 * No new Api: this is a controller calling the security-threaded Apis.
 */

import { SecurityApi } from "../../../../api/security";
import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { StuffApi } from "../../../../api/stuff";
import { AppApi } from "../../../../api/app";
import { AppSettingKeys } from "../../../../lib/config/AppSettings";
import { Currency, BankingApi, Money } from "../../../../api/banking";
import { ConnectionApi } from "../../../../api/connection";
import { ContainmentApi } from "../../../../api/containment";
import { MixinApi } from "../../../../api/mixin";
import { Template } from "../../../../lib/stuff/Template";
import Avatar from "../../../agent/Avatar";
import Login from "../../Login";
import type { EnrollmentDraft } from "../../Login";
import type Species from "../../species/Species";
import type {
  CharGenOption,
  CharGenFieldKind,
  CharGenFieldState,
  CharGenStatePayload,
  SpeciesDossier,
} from "@saxonberg/types";
import { Pronouns, PRONOUN_LABELS } from "@saxonberg/types";

/**
 * The settable char-gen field keys.
 *
 * ⭐ **Server-internal, deliberately.** This used to be an exported
 * closed union on the wire, which meant the payload named every field
 * twice — once here and again as a `<field>Options` array — and made a
 * new concept a `types` change plus a client change. The wire now
 * carries `CharGenFieldState[]` with a plain-string key, so this union
 * is only the local `FIELDS` table's index type and widening it costs
 * nobody outside this file.
 */
type CharGenField = "species" | "sex" | "name" | "pronouns" | "aspiration";
import { SpeciesApi } from "../../../../api/species";
import { SourceTreeApi } from "../../../../api/source-tree";

/**
 * Pronoun options for a PLAYER CHARACTER.
 *
 * Derived from the `Pronouns` enum (the single source of truth for the
 * values); the display labels are colocated with the enum.
 *
 * ⚠⚠ **`it/its` is excluded here and MUST stay in the enum.** The two
 * are different questions. The enum is the world's pronoun vocabulary —
 * the command parser resolves "take it", and objects, animals and
 * constructs are referred to that way all the time. Removing it there
 * would break referring to a chair.
 *
 * What this list governs is narrower: what a person may choose for
 * *themselves* at intake. ⭐ Because `pronouns.validate` checks against
 * this same array, the roster and the gate cannot drift — dropping an
 * option here also refuses `enroll pronouns it` from the command line,
 * with no second list to keep in step.
 */
const PLAYER_PRONOUNS: readonly Pronouns[] = [
  Pronouns.He,
  Pronouns.She,
  Pronouns.They,
];

const PRONOUN_OPTIONS: CharGenOption[] = PLAYER_PRONOUNS.map((v) => ({
  value: v,
  label: PRONOUN_LABELS[v] ?? v,
}));

interface EnrollModel extends CommandModel {
  /** The raw `<field> <value...>` tail; split inside execute. */
  rest?: string;
}

// ---- Content config (rosters) -------------------------------------

interface SpeciesRosterEntry {
  key: string;
  path: string;
  label: string;
  description: string;
  /** Optional illustration URL; absent until image assets ship. */
  image?: string;
}
interface AspirationRosterEntry {
  key: string;
  label: string;
  description: string;
  bioSeed: string;
  /** Author-trusted prologue lines the chronicle mints as `claim`s at
   * enroll — distinct from `bioSeed`. */
  claimSeeds?: { text: string; order: number }[];
  outfit: string[];
  /** Optional illustration URL; absent until image assets ship. */
  image?: string;
}
interface CharGenConfig {
  species: SpeciesRosterEntry[];
  aspirations: AspirationRosterEntry[];
}

// ---- Name validation (inline; real moderation deferred) -----------

const NAME_DENYLIST = ["admin", "system", "moderator", "null", "root"];
const NAME_RE = /^\p{L}+(?:[-'\p{L}]*\p{L})?$/u;

/**
 * Reserved against a real character. The denylist plus the guest
 * reserved word — referenced from `Login` (the guest-mint site) so the
 * impersonation guard stays in lock-step with the guest name generator
 * (no drift). Exact word only; fuzzy/homoglyph near-misses are out of
 * scope.
 */
function isReservedName(lower: string): boolean {
  return (
    NAME_DENYLIST.includes(lower) ||
    lower === Login.GUEST_RESERVED_WORD.toLowerCase()
  );
}

/** Inclusive name-length bounds — operator-tunable via app-settings, with
 * a fallback to the historical 2–24 when read before the cache is warmed. */
function nameLengthBounds(): { min: number; max: number } {
  const read = (key: string, fallback: number): number => {
    try {
      const n = Number(AppApi.setting(key));
      return Number.isFinite(n) && n > 0 ? n : fallback;
    } catch {
      return fallback;
    }
  };
  return {
    min: read(AppSettingKeys.chargenNameMinLength, 2),
    max: read(AppSettingKeys.chargenNameMaxLength, 24),
  };
}

function validateNameToken(token: string, label: string): string | undefined {
  const t = token.trim();
  const { min, max } = nameLengthBounds();
  if (t.length < min || t.length > max) {
    return `${label} must be ${min}–${max} characters.`;
  }
  if (!NAME_RE.test(t)) {
    return `${label} may use letters with a single internal hyphen or apostrophe only.`;
  }
  if (isReservedName(t.toLowerCase())) {
    return `'${t}' isn't allowed as a ${label.toLowerCase()}.`;
  }
  return undefined;
}

// ---- Field handlers (a set, not an ordered flow) ------------------

/**
 * ⭐⭐ **This table is the single definition of a char-gen field**, and
 * the wire payload is projected from it by {@link projectFields}.
 *
 * It used to be the single definition of a field's *behaviour* while
 * `emitState` separately hand-assembled the field's *description* — so
 * every new concept was a table entry plus a payload edit plus a client
 * edit, and the client grew an `optionsFor(field)` switch to adapt the
 * mismatch. Adding `kind`/`label` here and projecting closed that gap:
 * **a new field is now one entry in this table and nothing else.**
 *
 * `enroll-projection.test.ts` asserts exactly that, by adding a field
 * and checking it reaches the wire with no other edit.
 */
interface FieldHandler {
  /** Which client renderer this field dispatches to. */
  kind: CharGenFieldKind;
  /** Human-facing heading, server-owned so the client holds no copy. */
  label: string;
  /** Whether this field currently applies (e.g. sex only for sexed species). */
  applicable(draft: EnrollmentDraft, cfg: CharGenConfig): boolean;
  /** Whether the draft has a value for this field. */
  isSet(draft: EnrollmentDraft): boolean;
  options(draft: EnrollmentDraft, cfg: CharGenConfig): CharGenOption[];
  /** The current value as a display string, when set. */
  display(draft: EnrollmentDraft): string | undefined;
  /** Optional one-line note rendered under the field. */
  hint?(draft: EnrollmentDraft, cfg: CharGenConfig): string | undefined;
  validate(
    value: string,
    draft: EnrollmentDraft,
    cfg: CharGenConfig,
  ): Promise<string | undefined> | string | undefined;
  apply(
    value: string,
    draft: EnrollmentDraft,
    cfg: CharGenConfig,
    ctrl: EnrollController,
  ): Promise<void> | void;
}

/**
 * @internal Exported as a **white-box test seam only**, so
 * `EnrollController.test.ts` can add a field and prove it reaches the
 * wire with no edit to {@link projectFields}. That property is the
 * entire justification for the projected payload, and a test that
 * cannot add a field cannot assert it.
 *
 * ⚠ No production consumer outside this module. A caller that reads
 * this table instead of the emitted payload is reintroducing the
 * duplication the projection removed.
 *
 * ⚠ The key type stays the narrow union rather than `string`: under
 * `noUncheckedIndexedAccess` a `Record<string, …>` makes every lookup
 * in `projectFields` and `computeMissing` possibly-undefined, which
 * would cost production code seven null-guards to buy a test one cast.
 * The test casts.
 */
export const FIELDS: Record<CharGenField, FieldHandler> = {
  species: {
    kind: "choose-one",
    label: "species",
    applicable: () => true,
    isSet: (d) => !!d.speciesPath,
    display: (d) => d.speciesCommonName ?? d.speciesKey,
    options: (_d, cfg) =>
      cfg.species.map((s) => {
        // Presentation (dossier + illustration) for this species, warmed
        // by ensureSpeciesCards (dossier built by SpeciesApi). `image` is
        // the bucket-relative key off the Species (Visible.illustration),
        // config roster as fallback; the client prepends MEDIA_BASE_URL.
        const card = EnrollController.getSpeciesCard(s.path);
        return {
          value: s.key,
          label: s.label,
          description: s.description,
          image: card?.illustration ?? s.image ?? null,
          dossier: card?.dossier,
        };
      }),
    validate: (v, _d, cfg) =>
      cfg.species.some((s) => s.key === v.toLowerCase())
        ? undefined
        : `Unknown species '${v}'. Pick one of the offered options.`,
    apply: async (v, d, cfg, ctrl) => {
      const entry = cfg.species.find((s) => s.key === v.toLowerCase())!;
      // Idempotent: re-submitting the same species must NOT wipe the
      // downstream picks (only a genuine change cascades).
      const changed = entry.path !== d.speciesPath;
      d.speciesKey = entry.key;
      d.speciesPath = entry.path;
      // Materialize the Species singleton (not a sync registry lookup —
      // the instance may not be cloned yet). Cache the common name + sex
      // system so the sync option builders don't re-resolve.
      const species = await StuffApi.singleton<Species>(entry.path);
      d.speciesCommonName =
        species.getCommonNames()[0] ?? entry.label.toLowerCase();
      d.sexSystem = species.getSexDeterminationSystem();
      if (changed) {
        // New species → its sex set / name themes differ; clear and
        // re-suggest. (Unchanged → keep what the player already chose.)
        d.name = undefined;
        d.surname = undefined;
        d.sex = undefined;
        await ctrl.refreshSuggestion(d);
      }
    },
  },
  sex: {
    kind: "choose-one",
    label: "sex",
    // Reads the cached sex-determination system the species pick
    // resolved — reliable + sync (no re-materialization here).
    applicable: (d) =>
      !!d.speciesPath && !!d.sexSystem && d.sexSystem !== "none",
    hint: (d) =>
      !d.speciesPath
        ? "Pick a species first."
        : d.sexSystem === "none"
          ? "This species has no sexes."
          : undefined,
    isSet: (d) => !!d.sex,
    display: (d) => (d.sex ? cap(d.sex) : undefined),
    options: (d) =>
      validSexSet(d.sexSystem ?? "").map((s) => ({ value: s, label: cap(s) })),
    validate: (v, d) => {
      const set = validSexSet(d.sexSystem ?? "");
      return set.includes(v.toLowerCase())
        ? undefined
        : `Pick one of: ${set.join(", ")}.`;
    },
    apply: (v, d) => {
      d.sex = v.toLowerCase();
    },
  },
  name: {
    kind: "text",
    label: "name",
    /**
     * ⭐ A REAL dependency, not a sequencing preference. The suggester
     * draws from the species' own name banks — `refreshSuggestion`
     * returns early without a `speciesPath` — and changing species
     * deliberately wipes the name. Offering the field first would hand
     * the player an empty box whose contents a later pick discards.
     *
     * ⚠ Sex is deliberately NOT part of this. `Species.suggestName`
     * takes only the account name; gating on sex would encode a
     * dependency the model does not have, and the server is the wrong
     * place to invent one.
     */
    applicable: (d) => !!d.speciesPath,
    isSet: (d) => !!d.name,
    // The joined display name. ⚠ The client does NOT parse this back
    // apart — it composes `enroll name <given> <surname>` from its own
    // two inputs, which the `suggestion` shape tells it to show.
    display: (d) =>
      [d.name, d.surname].filter(Boolean).join(" ") || undefined,
    /**
     * Doubles as the INAPPLICABLE reason. A field that cannot be filled
     * yet says why, in the server's words — the client renders the hint
     * either way and never composes a reason of its own.
     */
    hint: (d) =>
      !d.speciesPath
        ? "Pick a species first — names come from its name banks."
        : d.suggestion
          ? "Suggested from your account name and the species' name banks."
          : undefined,
    // No card options — the client renders editable given/surname fields
    // + a reroll button. `reroll` regenerates the suggestion; any other
    // value is the typed `<given> [surname]`.
    options: () => [],
    validate: (v, _d) => {
      const trimmed = v.trim();
      if (trimmed === "" || trimmed.toLowerCase() === "reroll")
        return undefined;
      const parts = trimmed.split(/\s+/);
      const givenErr = validateNameToken(parts[0]!, "Given name");
      if (givenErr) return givenErr;
      if (parts.length > 1) {
        const surErr = validateNameToken(parts.slice(1).join(" "), "Surname");
        if (surErr) return surErr;
      }
      return undefined;
    },
    apply: async (v, d, _cfg, ctrl) => {
      const trimmed = v.trim();
      if (trimmed.toLowerCase() === "reroll") {
        // Regenerate the themed suggestion and drop the prior pick, so the
        // client refills the boxes from the fresh suggestion.
        await ctrl.refreshSuggestion(d, true);
        d.name = undefined;
        d.surname = undefined;
        return;
      }
      if (!trimmed) return; // empty submit — ignored.
      const parts = trimmed.split(/\s+/);
      d.name = parts[0];
      d.surname = parts.length > 1 ? parts.slice(1).join(" ") : undefined;
    },
  },
  pronouns: {
    kind: "choose-one",
    label: "pronouns",
    applicable: () => true,
    isSet: (d) => !!d.pronouns,
    display: (d) =>
      PRONOUN_OPTIONS.find((p) => p.value === d.pronouns)?.label ?? d.pronouns,
    options: () => PRONOUN_OPTIONS,
    validate: (v) =>
      PRONOUN_OPTIONS.some((p) => p.value === v.toLowerCase())
        ? undefined
        : `Pick one of: ${PRONOUN_OPTIONS.map((p) => p.value).join(", ")}.`,
    apply: (v, d) => {
      d.pronouns = v.toLowerCase();
    },
  },
  aspiration: {
    kind: "choose-one",
    label: "aspiration",
    applicable: () => true,
    isSet: (d) => !!d.aspiration,
    display: (d) => d.aspiration,
    options: (_d, cfg) =>
      cfg.aspirations.map((a) => ({
        value: a.key,
        label: a.label,
        description: a.description,
        image: a.image ?? null,
      })),
    validate: (v, _d, cfg) =>
      cfg.aspirations.some((a) => a.key === v.toLowerCase())
        ? undefined
        : `Unknown aspiration '${v}'.`,
    apply: (v, d) => {
      d.aspiration = v.toLowerCase();
    },
  },
};

/**
 * Settable fields in canonical order (drives `missing` + iteration).
 *
 * @internal Exported alongside {@link FIELDS} as the same test seam.
 */
export const FIELD_ORDER: CharGenField[] = [
  "species",
  "sex",
  // ⭐ Pronouns sit WITH sex, not after the name. They answer the same
  // question — how this body is referred to — and separating them put
  // an unrelated text field between two halves of one thought.
  "pronouns",
  "name",
  "aspiration",
];

/** Required fields still unset for the current draft (sex only if applicable). */
function computeMissing(
  draft: EnrollmentDraft,
  cfg: CharGenConfig,
): CharGenField[] {
  return FIELD_ORDER.filter(
    (f) => FIELDS[f].applicable(draft, cfg) && !FIELDS[f].isSet(draft),
  );
}

/**
 * Project the {@link FIELDS} table onto the wire.
 *
 * ⭐ The whole point of the generalized payload: this is the ONLY place
 * a field's description is built, and it reads the same handler that
 * owns the field's behaviour. Adding a field to `FIELDS` + `FIELD_ORDER`
 * puts it on the wire with no edit here — which is what
 * `enroll-projection.test.ts` asserts.
 *
 * ⚠ Inapplicable fields are still emitted, carrying `applicable: false`.
 * The predecessor signalled inapplicability by sending an EMPTY option
 * array, which conflated *this species has no sexes* with *this species
 * has no sexes authored yet* — a distinction the client needs and could
 * not make. Emitting the field lets the client say why it is absent.
 */
function projectFields(
  draft: EnrollmentDraft,
  cfg: CharGenConfig,
): CharGenFieldState[] {
  return FIELD_ORDER.map((key) => {
    const h = FIELDS[key];
    const applicable = h.applicable(draft, cfg);
    const state: CharGenFieldState = {
      field: key,
      kind: h.kind,
      label: h.label,
      applicable,
    };
    // Options only when the field applies — a non-sexed species has no
    // sexes to offer, and shipping a stale set would invite a click that
    // the validator would then reject.
    if (applicable) {
      const options = h.options(draft, cfg);
      if (options.length) state.options = options;
    }
    const value = h.display(draft);
    if (value) state.value = value;
    const hint = h.hint?.(draft, cfg);
    if (hint) state.hint = hint;
    // The name field's suggestion rides the field it belongs to as well
    // as the payload root, so a renderer never has to reach outward for
    // the thing that tells it how many inputs to draw.
    if (h.kind === "text" && draft.suggestion) {
      state.suggestion = draft.suggestion;
    }
    return state;
  });
}

/**
 * The biological-sex options a sex-determination system admits. Shared
 * with `Login`'s guest minter (which filters out `intersex`), so the
 * char-gen and guest paths agree on what each species can be.
 */
export function validSexSet(system: string): string[] {
  switch (system) {
    case "xy":
    case "zw":
      return ["male", "female", "intersex"];
    case "dioecious":
    case "environmental":
    case "haplodiploid":
      return ["male", "female"];
    default:
      return [];
  }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default class EnrollController extends CommandController<EnrollModel> {
  static #config: CharGenConfig | null = null;
  /**
   * Per-species presentation (dossier + illustration key), keyed by
   * template path. Pre-warmed once because the sync `options()` can't await
   * the async Species resolution / dossier build. The dossier itself is
   * built by `SpeciesApi.buildDossier`; this map is just the controller
   * holding the results it needs to assemble its own sync payload.
   */
  static #speciesCards: Map<
    string,
    { dossier?: SpeciesDossier; illustration?: string }
  > | null = null;

  /** The active CommandContext for the in-flight execute (commit needs it). */
  private ctx!: CommandContext;

  async execute(model: EnrollModel, context: CommandContext): Promise<void> {
    this.ctx = context;
    const login = context.commandGiver as unknown as Login;
    let draft = login.getEnrollmentDraft();
    if (!draft) {
      draft = {};
      login.setEnrollmentDraft(draft);
    }
    const cfg = EnrollController.loadConfig();
    // Pre-warm the species presentation cache so the sync `options()`
    // builder can read it. Cheap after the first call.
    await EnrollController.ensureSpeciesCards(cfg);

    // Split the raw tail into `<field> <value...>`.
    const rest = (model.rest ?? "").trim();
    const sp = rest.indexOf(" ");
    const field = (sp === -1 ? rest : rest.slice(0, sp)).trim().toLowerCase();
    const value = (sp === -1 ? "" : rest.slice(sp + 1)).trim();

    if (!field) {
      // Bare `enroll` → emit the current draft state.
      this.emitState(login, draft, cfg);
      return;
    }

    if (field === "confirm") {
      const missing = computeMissing(draft, cfg);
      if (missing.length) {
        this.emitState(login, draft, cfg, {
          field: missing[0]!,
          message: `Still to choose: ${missing.join(", ")}.`,
        });
        context.note({
          kind: "controller-rejected",
          reason: "enroll-incomplete",
          detail: missing.join(","),
        });
        return;
      }
      // Atomic commit + hand off; commit fires its own final frames, so
      // no state frame here.
      await this.commit(draft, cfg);
      return;
    }

    const handler = (FIELDS as Record<string, FieldHandler | undefined>)[field];
    if (!handler) {
      this.emitState(login, draft, cfg);
      context.note({
        kind: "controller-rejected",
        reason: "unknown-enroll-field",
        detail: field,
      });
      return;
    }

    if (!handler.applicable(draft, cfg)) {
      // Field doesn't apply (e.g. sex on a sexless species) — ignore.
      this.emitState(login, draft, cfg);
      return;
    }

    const err = await handler.validate(value, draft, cfg);
    if (err) {
      this.emitState(login, draft, cfg, {
        field: field as CharGenField,
        message: err,
      });
      context.note({
        kind: "controller-rejected",
        reason: "enroll-validation-failed",
        detail: err,
      });
      return;
    }

    // Live-fire: set the field and re-emit the full state. Advancing /
    // committing is the client's call (a later `enroll confirm`).
    await handler.apply(value, draft, cfg, this);
    this.emitState(login, draft, cfg);
  }

  /** (Re)generate the species-themed name suggestion onto the draft. */
  public async refreshSuggestion(
    draft: EnrollmentDraft,
    reroll = false,
  ): Promise<void> {
    if (!draft.speciesPath) return;
    const species = await StuffApi.singleton<Species>(draft.speciesPath);
    draft.suggestion = reroll
      ? await species.rerollName()
      : await species.suggestName(draft.realName);
  }

  /** Emit the full char-gen draft state (the whole picture, every time). */
  private emitState(
    login: Login,
    draft: EnrollmentDraft,
    cfg: CharGenConfig,
    error?: { field: CharGenField; message: string },
  ): void {
    const payload: CharGenStatePayload = {
      fields: projectFields(draft, cfg),
      missing: computeMissing(draft, cfg),
    };
    if (draft.suggestion) payload.suggestion = draft.suggestion;
    if (draft.accountName) payload.accountName = draft.accountName;
    if (error) payload.error = error;

    // No prose — the structured payload drives the UI, and the command
    // echo (`> enroll species dwarf`) already gives terminal feedback.
    MessageApi.scene(login)
      .topic("session.identity")
      .toSelf(Mml.compose``)
      .payload(payload)
      .send();
  }

  /**
   * Atomic commit: fork the per-character template, register ownership
   * (the boundary), clone + dress the Avatar, hand off, destruct Login.
   */
  public async commit(
    draft: EnrollmentDraft,
    cfg: CharGenConfig,
  ): Promise<void> {
    const context = this.ctx;
    const login = context.commandGiver as unknown as Login;
    const interactive = context.interactive!;
    const user = interactive.getUser();
    const species = draft.speciesPath
      ? await StuffApi.singleton<Species>(draft.speciesPath)
      : null;
    const aspiration = cfg.aspirations.find((a) => a.key === draft.aspiration);

    // 1. Build the per-character overlay (picks over the shared seed).
    //    NO per-player template row is forked (the identity doctrine —
    //    ref-shapes.md: a `domain` row is a hydration source for
    //    authored content only; a character's durable state is its
    //    persistence-spine snapshot, captured in `postRegister` right
    //    after this clone).
    const seed = await Template.findByPath(Avatar.SEED_TEMPLATE_PATH);
    if (!seed) {
      throw new Error(`EnrollController.commit: no Avatar seed template.`);
    }
    const playerId = SecurityApi.uuid();
    const path = Avatar.getTemplatePath(playerId);
    const overlay: Record<string, unknown> = {
      // Initial spawn/recall home — sourced from app config (no longer a
      // seed-YAML literal), so an operator can move the new-player spawn
      // in-game without a deploy.
      startLocation: AppApi.setting(AppSettingKeys.defaultStartLocation),
      name: draft.name,
      _speciesPath: draft.speciesPath,
      pronouns: draft.pronouns,
      aspiration: draft.aspiration,
      bio: aspiration?.bioSeed ?? "",
      // The species' generic appearance is the avatar's look — its
      // `longDescription` (what another player sees on `look`). Species
      // now speaks the standard Visible interface, so this is a plain
      // `getLongDescription()` rather than the old bespoke accessor.
      longDescription:
        species?.getLongDescription() ||
        (seed.data as Record<string, unknown>).longDescription,
    };
    if (draft.surname) overlay.surname = draft.surname;

    // 2. Register ownership — THE atomicity boundary. Nothing before
    //    this persisted into the user's roster.
    user.playerIds.push(playerId);
    await user.save();

    // 3. Clone the runtime Avatar from the SHARED seed, overlaying the
    //    picks and minting the identity path (postRegister stamps +
    //    installs the baseline implant + captures the first snapshot).
    const avatar = await StuffApi.clone<Avatar>(
      Avatar.SEED_TEMPLATE_PATH,
      { user, playerId },
      { dataOverlay: overlay, asIdentityPath: path },
    );

    // 4. Sex is species-constrained, so set it on the live avatar after
    //    species is in place (avoids hydration-order coupling).
    if (draft.sex) {
      try {
        avatar.setSex(draft.sex);
      } catch {
        /* species rejected the value — leave unset */
      }
    }

    // 5. Dress in the aspiration's themed outfit (tolerant of missing
    //    garments / slot mismatches — content may lag). Narrow the
    //    freshly-cloned garment with the mixin predicates rather than
    //    casting: a garment that isn't Containable/Wearable is skipped.
    //    The avatar is always a Container + Slotted (it's an `Avatar`).
    if (aspiration && species) {
      const bodyPlanPath = species.getBodyPlanPath();
      for (const garmentPath of aspiration.outfit) {
        try {
          const garment = await StuffApi.clone(garmentPath);
          if (!MixinApi.isContainable(garment)) continue;
          ContainmentApi.move(garment, avatar);
          if (bodyPlanPath && MixinApi.isWearable(garment)) {
            const slots = garment.getSlotClaim(bodyPlanPath);
            if (slots.length) avatar.occupyAll(garment, slots);
          }
        } catch {
          /* skip this garment */
        }
      }
    }

    // 5b. Seed the chronicle from the chosen aspiration — the prologue
    //     (author-trusted `claim`s) plus a founding `deed`. Kept strictly
    //     separate from the `bio` seed above; both read the same
    //     aspiration, neither touches the other. The avatar is cloned +
    //     registered (step 3), so `getTemplatePath()` resolves. The
    //     founding deed is event-singular by trigger (enroll fires once
    //     per character by construction), so it needs no dedup `key`.
    await avatar.seedChronicleClaims(aspiration?.claimSeeds ?? []);
    await avatar.recordDeed({
      template: "Enrolled as {{ name }}, {{ aspirationLabel }}.",
      vars: {
        name: draft.name,
        aspirationLabel: aspiration?.label ?? "a newcomer",
      },
      tags: ["founding", "enroll"],
    });

    // 5c. Onboarding coin (D11): a committed non-guest gets a small hard-coin
    //     grant — physical `Coin` minted via `issueCash` (the CB cash faucet,
    //     the only conserved way money enters, logged). Drink-sized + anti-farm;
    //     NO account is opened (that's a later onboarding beat). Guests are
    //     minted via `Login.mintRandomGuestAvatar` and never reach char-gen
    //     commit — the `!isGuest` guard makes that explicit. `0` disables it.
    if (!avatar.getIsGuest()) {
      const stipend =
        Number(AppApi.setting(AppSettingKeys.bankingOnboardingStipend)) || 0;
      if (stipend > 0) {
        await BankingApi.issueCash(avatar, Money.of(stipend, Currency.compact()), "onboarding");
      }
    }

    // 6. Hand off to the avatar's session, then destruct Login.
    interactive.transferTo(avatar);
    await avatar.enter(interactive, { firstArrival: true });
    StuffApi.destruct(login);
  }

  static loadConfig(): CharGenConfig {
    if (EnrollController.#config) return EnrollController.#config;
    const parsed = SourceTreeApi.readYamlResource<CharGenConfig>(
      import.meta.url,
      "../../../../config/char-gen.yaml"
    );
    EnrollController.#config = {
      species: parsed.species ?? [],
      aspirations: parsed.aspirations ?? [],
    };
    return EnrollController.#config;
  }

  /** Test seam: drop the cached config + derived dossier cache. */
  /**
   * Pre-warm the per-species cards (dossier via `SpeciesApi`, illustration
   * off the Species). Idempotent. Tolerant — an unresolved species just
   * gets no card.
   */
  static async ensureSpeciesCards(cfg: CharGenConfig): Promise<void> {
    if (EnrollController.#speciesCards) return;
    const cards = new Map<
      string,
      { dossier?: SpeciesDossier; illustration?: string }
    >();
    for (const s of cfg.species) {
      try {
        const species = await StuffApi.singleton<Species>(s.path);
        if (!species) continue;
        cards.set(s.path, {
          dossier: await SpeciesApi.buildDossier(species, s.path),
          illustration: species.getIllustration() ?? undefined,
        });
      } catch {
        /* unresolved species → no card (graceful) */
      }
    }
    EnrollController.#speciesCards = cards;
  }

  /** The cached card (dossier + illustration) for a species path. */
  static getSpeciesCard(
    path: string,
  ): { dossier?: SpeciesDossier; illustration?: string } | undefined {
    return EnrollController.#speciesCards?.get(path);
  }

  static resetConfigCache(): void {
    EnrollController.#config = null;
    EnrollController.#speciesCards = null;
  }
}
