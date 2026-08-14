/**
 * CharGenStage — the dedicated character-creation layout (phase
 * `char-gen`).
 *
 * NOT a modal and NOT an inline panel: this is its own full-screen
 * stage. Three bands, top to bottom:
 *
 *   1. The stage (flex: 1) — the current step prompt, the closed-choice
 *      `options` as clickable cards, the name `suggestion` with
 *      Keep / Re-roll / Type-your-own on the name step, the accumulated
 *      `picks`, and any validation `error`.
 *   2. A slim terminal strip — the Login's narration frames
 *      (`session.identity` et al.) scroll here, secondary.
 *   3. The command bar — front-and-centre (CLI-as-backbone). Reuses the
 *      cockpit `CommandBar` so typed input still works and echoes; every
 *      stage affordance sends the literal `enroll <field> <value>`
 *      string through the same `sendCommand` path.
 *
 * Every affordance is a thin wrapper over `sendCommand`. Clicking the
 * "Elf" card sends `enroll species elf`; Keep → `enroll name keep`;
 * Re-roll → `enroll name reroll`; an aspiration card → `enroll
 * aspiration healer`; the confirm button → `enroll confirm`. The server
 * owns all option computation and validation; the client only renders
 * what the `session.identity` frame carries and forwards the
 * tokens back.
 *
 * Styling matches the cockpit's token-driven aesthetic. Weight and
 * position carry the hierarchy (the command bar is the visual anchor);
 * color is reserved (the project is color-conservative).
 */

import { Fragment, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import type { CharGenFieldState, DossierRow } from "@saxonberg/types";
import { useStore } from "../store/index";
import { signOut } from "../services/auth";
import { mediaUrl } from "../config";
import { tokens } from "./ui/tokens";
import { UnbuiltGround } from "./ui/UnbuiltGround";
import { Terminal } from "./Terminal";
import { CommandBar } from "./CommandBar";
import { StatusBar } from "./frame/StatusBar";
import { Seal } from "./frame/Seal";
import type { Frame } from "../store/index";

/* --- Layout primitives -------------------------------------------- */

const Stage = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.family};
`;

/** The main stage area — scrolls if the step is tall. */
const StageBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: ${tokens.space.xl};
  display: flex;
  flex-direction: column;
  align-items: center;
`;

/**
 * ⭐ The mock's three-column workspace: the FORM on the left, the
 * species plate + certificate in the middle, and "what you are typing"
 * as a full right column.
 *
 * ⚠ An earlier cut was a single narrow centred column with the command
 * log squeezed into a strip at the foot. That buried the teaching
 * surface — the log is not a footnote, it is half the point of the
 * screen.
 */
const StageInner = styled.div`
  width: 100%;
  max-width: 1240px;
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.space.xl};
  align-items: start;

  @media (min-width: 1080px) {
    grid-template-columns: minmax(0, 1fr) 300px 320px;
  }
`;

const FormColumn = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.lg};
`;

const PlateColumn = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.lg};
`;

/**
 * The log column. ⚠ It carries the still-missing line and the commit
 * action at its foot, as the mock has them — what is left to do and the
 * act that ends it belong with the record of what you have already
 * done.
 */
const LogColumn = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.lg};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
`;

/** Compact inline chips — the mock's field rows, not card grids. */
const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.sm};
`;

const Chip = styled.button<{ $selected?: boolean }>`
  padding: ${tokens.space.sm} ${tokens.space.md};
  min-height: 32px;
  background: ${(p) =>
    p.$selected ? tokens.color.surface : tokens.color.surfaceAlt};
  border: 1px solid
    ${(p) => (p.$selected ? tokens.color.seal : tokens.color.border)};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  cursor: pointer;

  &:hover {
    border-color: ${tokens.color.fgEmphasis};
  }
`;

/** The Articles header — a sealed panel, as the mock has it. */
const ArticlesPanel = styled.div`
  padding: ${tokens.space.lg};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
`;

const ArticlesTitle = styled.h1`
  display: flex;
  align-items: center;
  gap: ${tokens.space.md};
  margin: 0;
  font-family: ${tokens.font.engraved};
  font-size: 17px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.19em;
  color: ${tokens.color.fg};
`;

/**
 * The species plate. ⚠ Paper ground, not the app's — an author's
 * illustration is the one warm surface in the frame, and it gets a
 * mount rather than sitting flush on the chrome.
 */
const Plate = styled.div`
  aspect-ratio: 3 / 4;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: ${tokens.color.paper};
  border: 1px solid ${tokens.color.paperLine};
  border-radius: ${tokens.radius.sm};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const PlateEmpty = styled.div`
  padding: ${tokens.space.lg};
  text-align: center;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  line-height: 1.7;
  color: ${tokens.color.paperInk};
  opacity: 0.65;
`;

/**
 * ⚠ The record line, from the art. It is not decoration: it states the
 * two facts that make enrolment feel like an act rather than a form —
 * whose record this enters, and that only they can strike it.
 */
const RecordLine = styled.div`
  margin-top: ${tokens.space.xs};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

const StepSub = styled.p`
  margin: 0;
  font-size: ${tokens.font.body};
  color: ${tokens.color.fgMuted};
  line-height: 1.6;
`;

/** Pinned top bar — carries the sign-out escape so a player mid-intake
 *  is never trapped (char-gen has no other way back to the start screen). */
const StageTopBar = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: ${tokens.space.sm} ${tokens.space.md};
  flex: none;
`;

const SignOutLink = styled.button`
  background: none;
  border: none;
  color: ${tokens.color.fgMuted};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  cursor: pointer;
  text-decoration: underline;

  &:hover {
    color: ${tokens.color.fg};
  }
`;

const OptionDesc = styled.span`
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
  line-height: 1.5;
`;

/**
 * One field on the form. Every group carries its server-supplied label
 * as a heading — on a single page there is no screen title to lean on,
 * and the label is the only thing that says what a card grid is FOR.
 */
const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.sm};
`;

const FieldGroupHeading = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${tokens.color.fgMuted};
`;

/* --- Illustrated step: cards + detail pane ------------------------ */

const DetailLabel = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${tokens.color.fgEmphasis};
`;

const DetailDesc = styled.p`
  margin: 0;
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
  line-height: 1.6;
`;

/**
 * The scientific (Latin) binomial, shown italic under the common label.
 */
const Binomial = styled.div`
  font-size: ${tokens.font.small};
  font-style: italic;
  color: ${tokens.color.fgMuted};
  margin-top: -2px;
`;

/**
 * The structured species dossier — the showcase of how deeply the
 * species is modeled. Each server-composed section (Classification,
 * Biology, Anatomy, Composition) renders as a labeled key/value grid.
 * Every row is real data; the client is purely presentational.
 */
/** The certificate's title block — see the ⭐ note at its use site. */
const CertificateTitle = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${tokens.space.sm};
  margin-bottom: ${tokens.space.sm};
  padding-bottom: ${tokens.space.xs};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.small};
  letter-spacing: 0.06em;
  color: ${tokens.color.fg};
`;

const CertificateNote = styled.span`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.label};
  letter-spacing: 0;
  color: ${tokens.color.fgMuted};
`;

const NameChoiceHint = styled.span`
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

const DossierBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.md};
  padding-top: ${tokens.space.sm};
  border-top: 1px solid ${tokens.color.borderMuted};
`;

const DossierHeading = styled.div`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${tokens.color.fgMuted};
  margin-bottom: ${tokens.space.xs};
`;

const DossierGrid = styled.dl`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px ${tokens.space.md};
  margin: 0;
  font-size: ${tokens.font.small};
`;

const DossierLabel = styled.dt`
  color: ${tokens.color.fgMuted};
`;

const DossierValue = styled.dd`
  margin: 0;
  color: ${tokens.color.fg};
`;

/* --- Name step ---------------------------------------------------- */

const NameForm = styled.form`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${tokens.space.sm};
`;

const NameInput = styled.input`
  padding: ${tokens.space.md};
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.body};

  &:focus {
    outline: none;
    border-color: ${tokens.color.primary};
  }
`;

/* --- Error -------------------------------------------------------- */

const ErrorBanner = styled.div`
  padding: ${tokens.space.md} ${tokens.space.xl};
  border: 1px solid ${tokens.color.danger};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.danger};
  font-size: ${tokens.font.small};
`;

/* --- Terminal strip ----------------------------------------------- */

/**
 * A slim, fixed-height band hosting the Login's narration scrollback.
 * Secondary to the stage — present so the player still sees the
 * server's prose, but not the focal element.
 */
/**
 * ⭐ The log's title bar, from the art.
 *
 * The strip always showed the commands; what it lacked was the sentence
 * that makes them mean something. "What you are typing" plus the count
 * turns a scrollback into the teaching surface the design intends —
 * every card you click IS a command, and this is where you watch that
 * happen.
 */
const LogHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.xs} ${tokens.space.xl};
  border-top: 1px solid ${tokens.color.border};
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${tokens.color.sectionLabel};
`;

const LogCount = styled.span`
  font-family: ${tokens.font.mono};
  letter-spacing: 0;
  color: ${tokens.color.fgDim};
`;

const LogNote = styled.span`
  margin-left: auto;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  letter-spacing: 0;
  text-transform: none;
  color: ${tokens.color.fgMuted};
`;

const TerminalStrip = styled.div`
  display: flex;
  flex-direction: column;
  height: 9rem;
  border-top: 1px solid ${tokens.color.border};
  min-height: 0;
`;


/** The server's own "still missing" list, rendered verbatim. */
/** The commit action. `$primary` carries the seal red. */
const StageButton = styled.button<{ $primary?: boolean }>`
  padding: ${tokens.space.md} ${tokens.space.lg};
  min-height: 40px;
  border-radius: ${tokens.radius.md};
  border: 1px solid
    ${(p) => (p.$primary ? tokens.color.sealInk : tokens.color.border)};
  background: ${(p) =>
    p.$primary ? tokens.color.seal : tokens.color.actionBg};
  color: ${(p) => (p.$primary ? tokens.color.sealInk : tokens.color.fg)};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.body};
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const MissingLine = styled.div`
  flex: 1;
  min-width: 0;
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
  font-family: ${tokens.font.mono};
`;

/** A reveal-level disclosure inside a dossier section. */
const SpoilerDetails = styled.details`
  margin-top: ${tokens.space.sm};

  summary {
    cursor: pointer;
    font-size: ${tokens.font.micro};
    color: ${tokens.color.fgMuted};
    list-style: none;
  }

  summary::before {
    content: "▸ ";
  }

  &[open] summary::before {
    content: "▾ ";
  }

  summary::-webkit-details-marker {
    display: none;
  }
`;

/* --- The form (client-owned layout) ------------------------------- */

/**
 * ⭐⭐ **One screen, every field, filled in any order.**
 *
 * The predecessor paginated this into five screens with Back/Continue,
 * and that was wrong twice over. It carried forward the OLD client's
 * shape rather than the design's — the reference art lists every field
 * group in a single panel under the copy *"Fill the fields in any
 * order"*, with `still missing:` and `enroll confirm` standing at the
 * bottom throughout.
 *
 * And more than a layout preference: **the server is deliberately
 * step-less.** It holds an unordered draft and reports what is still
 * `missing`; there is no `currentStep`, no cursor, no order. Pagination
 * re-imposed a sequence the substrate does not have, and made the
 * player walk it to reach a field they could have set first.
 *
 * ⚠ This also makes the extensibility rule trivial rather than clever.
 * The paginated version needed a "field no screen config names still
 * renders somewhere" rule to avoid silently dropping a server-added
 * field; on one page **every applicable field renders, in server
 * order**, and there is nowhere for one to hide.
 *
 * Layout stays client-owned — `char-gen.md` always named the
 * single-page form as a pure client change, and this is it.
 */

/** Every renderer kind this client knows how to draw. */
const KNOWN_KINDS = new Set<string>(["choose-one", "text"]);

/** Two text inputs, or one — see {@link isTwoPart}. */
interface TextDraft {
  a: string;
  b: string;
}

/**
 * Whether a `text` field draws two inputs.
 *
 * ⚠ The **presence of a surname on the suggestion** is the signal, and
 * there is deliberately no second mechanism for it. A `parts` array or
 * a per-component value would be the same duplication the projected
 * payload removed — two sources of truth for one fact.
 */
function isTwoPart(f: CharGenFieldState): boolean {
  return f.suggestion?.surname !== undefined;
}

/* --- Component ---------------------------------------------------- */

interface CharGenStageProps {
  /** The real command channel — every affordance routes through it. */
  onSendCommand: (text: string, barId?: string) => void;
  /** Frames feeding the slim narration strip. */
  frames: Frame[];
  onSendPromptResponse: (promptId: string, response: string) => void;
  onCancelPrompt: (promptId: string) => void;
  /** Terminal click-routing wiring, forwarded from App unchanged. */
  onCommandClick: (command: string) => void;
  onCommandPreview: (command: string | null) => void;
}

export function CharGenStage({
  onSendCommand,
  frames,
  onSendPromptResponse,
  onCancelPrompt,
  onCommandClick,
  onCommandPreview,
}: CharGenStageProps) {
  const charGenState = useStore((s) => s.charGenState);
  // Which screen the client is showing — flow/layout is entirely
  // client-side; the server is a field state machine that doesn't care.
  // The detail pane previews this option on card hover; null falls
  // through to the chosen card, then the first option.
  /**
   * What the plate column is showing. ⚠ Keyed by FIELD as well as
   * value: the plate follows whichever illustrated field you are
   * touching, and two fields could offer the same option token.
   */
  const [focused, setFocused] = useState<{
    field: string;
    value: string;
  } | null>(null);
  // Editable text fields, keyed by field name, pre-filled from the
  // existing value (else the suggestion); refilled only when that
  // source changes (e.g. a reroll), not on every keystroke.
  const [drafts, setDrafts] = useState<Record<string, TextDraft>>({});
  // A text field flushes from both the input `onBlur` and the Continue
  // button. Clicking Continue blurs the input first, so both fire in the
  // same tick with identical content. Dedupe by last-sent command so an
  // unchanged value is never re-fired.
  const lastSent = useRef<Record<string, string>>({});

  const textFields = (charGenState?.fields ?? []).filter(
    (f) => f.kind === "text",
  );
  // A fingerprint of every text field's SOURCE, so the refill effect
  // fires on a reroll or a server-side change but not on a keystroke.
  const draftSource = textFields
    .map(
      (f) =>
        `${f.field}:${f.value ?? ""}|${f.suggestion?.name ?? ""}|${f.suggestion?.surname ?? ""}`,
    )
    .join("~");

  useEffect(() => {
    if (!charGenState) return;
    const next: Record<string, TextDraft> = {};
    for (const f of charGenState.fields) {
      if (f.kind !== "text") continue;
      if (f.value) {
        // The server hands back a joined display value; split only when
        // the field is two-part, and only on the FIRST space so a
        // multi-word surname survives.
        const at = isTwoPart(f) ? f.value.indexOf(" ") : -1;
        next[f.field] =
          at >= 0
            ? { a: f.value.slice(0, at), b: f.value.slice(at + 1) }
            : { a: f.value, b: "" };
      } else if (f.suggestion) {
        next[f.field] = {
          a: f.suggestion.name ?? "",
          b: f.suggestion.surname ?? "",
        };
      } else {
        next[f.field] = { a: "", b: "" };
      }
    }
    setDrafts(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftSource]);

  // No state yet (frame in flight) — show a quiet placeholder rather
  // than an empty screen.
  if (!charGenState) {
    return (
      <Stage>
        <StageTopBar>
          <SignOutLink onClick={() => void signOut()}>Sign out</SignOutLink>
        </StageTopBar>
        <StageBody>
          <StageInner>
            <StepSub>Preparing character creation…</StepSub>
          </StageInner>
        </StageBody>
      </Stage>
    );
  }

  const { fields, accountName, missing, error } = charGenState;

  // Command echoes carry a `sigil`; narration does not. So this counts
  // what the PLAYER sent, which is what the log claims to be showing.
  const sentCount = frames.filter((f) => f.sigil !== undefined).length;

  // ⭐ Every applicable field, in SERVER order. No chunking, no cursor —
  // the form is the whole draft, and the server decides what is on it.
  const shown = fields.filter((f) => f.applicable);

  const draftOf = (name: string): TextDraft =>
    drafts[name] ?? { a: "", b: "" };

  const submitText = (f: CharGenFieldState) => {
    const d = draftOf(f.field);
    const a = d.a.trim();
    if (!a) return;
    const b = isTwoPart(f) ? d.b.trim() : "";
    const cmd = `enroll ${f.field} ${[a, b].filter(Boolean).join(" ")}`;
    if (cmd === lastSent.current[f.field]) return;
    lastSent.current[f.field] = cmd;
    onSendCommand(cmd);
  };

  const setDraft = (name: string, patch: Partial<TextDraft>) =>
    setDrafts((prev) => ({
      ...prev,
      [name]: { ...draftOf(name), ...patch },
    }));

  // Setting a field is a LIVE command (fires + echoes immediately).
  const setField = (name: string, value: string) =>
    onSendCommand(`enroll ${name} ${value}`);

  /**
   * ⚠ The confirm gate reads the server's `missing` and NOTHING else —
   * never a client-side list of required fields, which would re-encode
   * which fields exist and in what order they are required.
   *
   * ⭐ A text field reaches the server on blur, so the sequence is
   * self-correcting: type → blur → `enroll name …` → the server drops
   * `name` from `missing` → confirm enables. There is no way to click
   * confirm before the value has actually landed.
   */
  const canConfirm = missing.length === 0;

  /**
   * ⚠ Compact chips, not a card grid. The mock puts every closed choice
   * on one wrapping row so the whole form fits a screen — a grid of
   * 180px cards made five fields into five screenfuls, which is what
   * pushed the predecessor into paginating in the first place.
   *
   * The illustration and dossier are NOT here: they belong to the plate
   * column, driven by whatever the player is hovering or has picked.
   */
  const renderCards = (f: CharGenFieldState) => {
    const opts = f.options ?? [];
    const selected = f.value ?? null;
    return (
      <ChipRow>
        {opts.map((opt) => {
          const isOn = opt.value === selected || opt.label === selected;
          return (
            <Chip
              key={opt.value}
              data-testid={`chargen-option-${opt.value}`}
              $selected={isOn}
              aria-pressed={isOn}
              title={opt.description}
              onClick={() => setField(f.field, opt.value)}
              onMouseEnter={() => {
                setFocused({ field: f.field, value: opt.value });
                onCommandPreview(`enroll ${f.field} ${opt.value}`);
              }}
              onMouseLeave={() => {
                setFocused(null);
                onCommandPreview(null);
              }}
            >
              {opt.label}
            </Chip>
          );
        })}
      </ChipRow>
    );
  };

  /**
   * The plate column's subject: whatever is hovered, else whatever is
   * chosen, else the first illustrated option on the form. ⚠ Returns
   * null when nothing illustrated exists, so the column can say "no
   * species yet" instead of drawing an empty frame.
   */
  const plateOption = (() => {
    const illustrated = shown.filter((f) =>
      (f.options ?? []).some((o) => o.image || o.dossier),
    );
    for (const f of illustrated) {
      const opts = f.options ?? [];
      if (focused?.field === f.field) {
        const hit = opts.find((o) => o.value === focused.value);
        if (hit) return hit;
      }
    }
    for (const f of illustrated) {
      const opts = f.options ?? [];
      const hit = opts.find(
        (o) => o.value === f.value || o.label === f.value,
      );
      if (hit) return hit;
    }
    return null;
  })();

  /**
   * ⚠ A compact inline row, not a bordered form block. The mock puts the
   * value and its three choices on ONE line beside the label; a panel
   * made the name field twice the height of every other field and broke
   * the rhythm of the form.
   */
  const renderTextField = (f: CharGenFieldState) => {
    const two = isTwoPart(f);
    const d = draftOf(f.field);
    return (
      <NameForm
        onSubmit={(e) => {
          e.preventDefault();
          submitText(f);
        }}
      >
        <NameInput
          id={`chargen-${f.field}-a`}
          data-testid="chargen-given-input"
          value={d.a}
          onChange={(e) => setDraft(f.field, { a: e.target.value })}
          onBlur={() => submitText(f)}
          placeholder={two ? "Given name" : f.label}
          autoComplete="off"
        />
        {two ? (
          <NameInput
            id={`chargen-${f.field}-b`}
            data-testid="chargen-surname-input"
            value={d.b}
            onChange={(e) => setDraft(f.field, { b: e.target.value })}
            onBlur={() => submitText(f)}
            placeholder="Surname (optional)"
            autoComplete="off"
          />
        ) : null}
        {/*
          ⭐ keep · re-roll · type your own — three NAMED choices, as the
          mock has them. "keep" is why it matters: with only a re-roll
          control there was no way to SAY you accepted the suggestion,
          so the player had to guess that leaving it alone counted.
        */}
        {f.suggestion ? (
          <>
            <Chip type="button" data-testid="chargen-keep" onClick={() => submitText(f)}>
              keep
            </Chip>
            <Chip
              type="button"
              data-testid="chargen-reroll"
              onClick={() => onSendCommand(`enroll ${f.field} reroll`)}
            >
              re-roll
            </Chip>
          </>
        ) : null}
        {f.hint ? <NameChoiceHint>{f.hint}</NameChoiceHint> : null}
        {/* Hidden submit so Enter in a field commits the value. */}
        <button type="submit" hidden aria-hidden="true" />
      </NameForm>
    );
  };

  /**
   * ⚠ A field whose `kind` this client does not know renders HATCHED
   * with its reason — never nothing. An omitted field would still gate
   * `enroll confirm` through `missing`, stranding the player on a
   * Continue button that never enables and giving them no way to see
   * why.
   */
  const renderUnknownKind = (f: CharGenFieldState) => (
    <UnbuiltGround
      data-testid={`chargen-unknown-kind-${f.field}`}
      style={{ padding: tokens.space.lg }}
    >
      <FieldGroupHeading>{f.label}</FieldGroupHeading>
      <OptionDesc>
        This client does not know how to show a “{f.kind}” field yet. You can
        still set it from the command line: <code>enroll {f.field} …</code>
      </OptionDesc>
    </UnbuiltGround>
  );

  const renderField = (f: CharGenFieldState) => {
    if (!KNOWN_KINDS.has(f.kind)) return renderUnknownKind(f);
    return f.kind === "text" ? renderTextField(f) : renderCards(f);
  };

  return (
    <Stage data-testid="chargen-stage">
      <StageTopBar>
        <SignOutLink onClick={() => void signOut()}>Sign out</SignOutLink>
      </StageTopBar>
      <StageBody>
        <StageInner>
          <FormColumn>
            <ArticlesPanel>
              <ArticlesTitle>
                <Seal size={26} id="sx-seal-intake" />
                <span>Articles of Enrolment</span>
              </ArticlesTitle>
              {accountName ? (
                <RecordLine data-testid="chargen-record-line">
                  Entered on the record for <strong>{accountName}</strong> ·
                  struck from it only by your own hand
                </RecordLine>
              ) : null}
              <StepSub>
                No classes, no levels, no stat points. You declare a body and
                a name; competence comes from doing the work.{" "}
                <strong>Fill the fields in any order</strong> — every entry
                reads the whole draft back to you, and whatever is still open
                is listed beside the seal.
              </StepSub>
            </ArticlesPanel>

            {error ? (
              <ErrorBanner data-testid="chargen-error">
                {error.message}
              </ErrorBanner>
            ) : null}

            {/*
              ⭐ Every applicable field, in server order. A field this
              client has no opinion about still appears — on one page
              there is nowhere for one to hide.
            */}
            {shown.map((f) => (
              <FieldGroup key={f.field}>
                <FieldGroupHeading>{f.label}</FieldGroupHeading>
                {renderField(f)}
              </FieldGroup>
            ))}
          </FormColumn>

          <PlateColumn>
            <Plate data-testid="chargen-detail-image">
              {plateOption?.image ? (
                <img src={mediaUrl(plateOption.image)} alt={plateOption.label} />
              ) : (
                <PlateEmpty>
                  portrait · author-supplied
                  <br />
                  {plateOption ? "no plate for this one" : "no species yet"}
                </PlateEmpty>
              )}
            </Plate>
            <DossierBox data-testid="chargen-detail-dossier">
              <CertificateTitle>
                Certificate of species
                <CertificateNote>read off the model</CertificateNote>
              </CertificateTitle>
              {plateOption ? (
                <>
                  {plateOption.dossier?.binomial ? (
                    <Binomial data-testid="chargen-detail-binomial">
                      {plateOption.dossier.binomial}
                    </Binomial>
                  ) : null}
                  <DetailLabel data-testid="chargen-detail-label">
                    {plateOption.label}
                  </DetailLabel>
                  {plateOption.description ? (
                    <DetailDesc>{plateOption.description}</DetailDesc>
                  ) : null}
                  {plateOption.dossier?.sections.map((section) => (
                    <DossierSectionView
                      key={section.heading}
                      heading={section.heading}
                      rows={section.rows}
                    />
                  ))}
                </>
              ) : (
                <DetailDesc>—</DetailDesc>
              )}
            </DossierBox>
          </PlateColumn>

          <LogColumn>
            <LogHeader>
              what you are typing
              <LogCount data-testid="chargen-log-count">{sentCount}</LogCount>
            </LogHeader>
            <LogNote>
              Every card you click sends a real command. They appear here as
              you go — the same ones you could type in a bare text client,
              and the same interface you will use all night.
            </LogNote>
            <TerminalStrip>
              <Terminal
                frames={frames}
                onCommandClick={onCommandClick}
                onCommandPreview={onCommandPreview}
              />
            </TerminalStrip>
            {/*
              ⚠ The still-missing list is the SERVER's, verbatim. The
              client never composes it — that is why it can be trusted to
              gate the button beside it.
            */}
            <MissingLine data-testid="chargen-missing">
              {missing.length > 0
                ? `still missing: ${missing.join(", ")}`
                : "nothing missing — you can enter the world"}
            </MissingLine>
            <StageButton
              $primary
              data-testid="chargen-confirm"
              disabled={!canConfirm}
              onClick={() => onSendCommand("enroll confirm")}
              onMouseEnter={() => onCommandPreview("enroll confirm")}
              onMouseLeave={() => onCommandPreview(null)}
            >
              enroll confirm ⏎
            </StageButton>
          </LogColumn>
        </StageInner>
      </StageBody>

      {/* The one preview surface — previews the `enroll …` an affordance
          runs. Intake keeps it because intake renders command-sending
          affordances, and the axiom does not switch off during it. This
          site and App's are mutually exclusive phases, so exactly one
          bar is mounted at any instant. */}
      <StatusBar />
      {/* The command bar is the backbone — typed `enroll …` always works. */}
      <CommandBar
        barId="chargen"
        onSendCommand={onSendCommand}
        onSendPromptResponse={onSendPromptResponse}
        onCancelPrompt={onCancelPrompt}
      />
    </Stage>
  );
}

/**
 * One dossier section. Rows at reveal level >= 1 collapse behind a
 * disclosure.
 *
 * ⭐ The level rides the row from `fieldMeta` — it is declared on the
 * field precisely so it travels wherever the field surfaces, and
 * char-gen used to drop it and render expanded what the wiki renders
 * collapsed.
 *
 * ⚠ Collapsed is not withheld. Level 1 means "one click", not "locked":
 * this is an APPETITE axis (does this reader want to be spoiled), not an
 * epistemic one (does this character know it). A collapse toggle is not
 * a lock.
 */
function DossierSectionView({
  heading,
  rows,
}: {
  heading: string;
  rows: DossierRow[];
}) {
  const open = rows.filter((r) => !r.spoiler);
  const veiled = rows.filter((r) => r.spoiler);
  return (
    <div>
      <DossierHeading>{heading}</DossierHeading>
      {open.length ? (
        <DossierGrid>
          {open.map((row) => (
            <Fragment key={row.label}>
              <DossierLabel>{row.label}</DossierLabel>
              <DossierValue>{row.value}</DossierValue>
            </Fragment>
          ))}
        </DossierGrid>
      ) : null}
      {veiled.length ? (
        <SpoilerDetails data-testid={`dossier-spoiler-${heading}`}>
          <summary>{veiled.length} measured {veiled.length === 1 ? "property" : "properties"}</summary>
          <DossierGrid>
            {veiled.map((row) => (
              <Fragment key={row.label}>
                <DossierLabel>{row.label}</DossierLabel>
                <DossierValue>{row.value}</DossierValue>
              </Fragment>
            ))}
          </DossierGrid>
        </SpoilerDetails>
      ) : null}
    </div>
  );
}

