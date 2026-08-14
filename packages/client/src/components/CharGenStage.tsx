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

const StageInner = styled.div`
  width: 100%;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xl};
`;

const StepHeading = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: ${tokens.color.fgEmphasis};
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

/* --- Option cards ------------------------------------------------- */

const OptionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: ${tokens.space.md};
`;

const OptionCard = styled.button<{ $selected?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
  text-align: left;
  padding: ${tokens.space.lg};
  background: ${(p) =>
    p.$selected ? tokens.color.surface : tokens.color.surfaceAlt};
  color: ${tokens.color.fg};
  border: 1px solid
    ${(p) => (p.$selected ? tokens.color.primary : tokens.color.border)};
  box-shadow: ${(p) =>
    p.$selected ? `inset 0 0 0 1px ${tokens.color.primary}` : "none"};
  border-radius: ${tokens.radius.md};
  font-family: ${tokens.font.family};
  cursor: pointer;

  &:hover {
    border-color: ${tokens.color.accent};
    background: ${tokens.color.surface};
  }
`;

const OptionLabel = styled.span`
  font-size: ${tokens.font.body};
  font-weight: 600;
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

/**
 * The seal row: what is still open on the left, the one committing
 * action on the right. Pinned outside the scrolling stage body so both
 * stay visible regardless of dossier height.
 */
const NavRow = styled.div`
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${tokens.space.md};
  padding: ${tokens.space.md} ${tokens.space.xl};
  border-top: 1px solid ${tokens.color.border};
  background: ${tokens.color.surfaceSunken};
`;

/* --- Illustrated step: cards + detail pane ------------------------ */

/**
 * Two-column band used on illustrated steps (species, aspiration):
 * the option grid on the left, an illustration-led detail pane on the
 * right. Stacks to a single column on narrow viewports.
 */
const IllustratedLayout = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${tokens.space.xl};

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const OptionColumn = styled.div`
  flex: 1;
  min-width: 0;
`;

/**
 * The detail pane — the illustration is the hero. Its width is fixed
 * so the 3:4 image slot has a stable footprint; the grid flexes
 * around it.
 */
const DetailPane = styled.aside`
  width: 260px;
  flex-shrink: 0;

  /* One column at phone width — a fixed 260px pane in a ~350px content
     box reads as a stray card rather than a detail pane. */
  @media (max-width: 640px) {
    width: auto;
    max-width: 100%;
  }
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.md};
  padding: ${tokens.space.lg};
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  /* The dossier can be long; keep it within the stage and scroll it in
     place so the option cards stay put. */
  max-height: calc(100vh - 13rem);
  overflow-y: auto;

  @media (max-width: 640px) {
    width: 100%;
    max-height: none;
  }
`;

/**
 * The 3:4 portrait slot. Holds the option's illustration when one
 * exists; otherwise a framed placeholder that keeps the exact
 * footprint so nothing reflows when real art lands. `aspect-ratio`
 * pins the shape independent of content.
 */
const DetailImage = styled.div`
  width: 100%;
  aspect-ratio: 3 / 4;
  /* Keep the 3:4 portrait box from being crushed by the scrolling
     (overflow-y) flex column when the dossier below it is long. */
  flex-shrink: 0;
  border-radius: ${tokens.radius.sm};
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${tokens.color.surfaceSunken};
  border: 1px dashed ${tokens.color.borderMuted};
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.small};
  text-transform: uppercase;
  letter-spacing: 0.08em;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

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
  flex-direction: column;
  gap: ${tokens.space.lg};
  padding: ${tokens.space.xl};
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  align-items: flex-start;
`;

const NameAccountRef = styled.div`
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};

  strong {
    color: ${tokens.color.fg};
    font-weight: 600;
  }
`;

const NameFieldRow = styled.div`
  display: flex;
  gap: ${tokens.space.lg};
  width: 100%;

  @media (max-width: 520px) {
    flex-direction: column;
  }
`;

const NameField = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
`;

const NameFieldLabel = styled.label`
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
`;

const NameOptional = styled.span`
  color: ${tokens.color.fgMuted};
  opacity: 0.7;
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

const StageButton = styled.button<{ $primary?: boolean }>`
  padding: ${tokens.space.sm} ${tokens.space.xl};
  background: ${(p) =>
    p.$primary ? tokens.color.primary : tokens.color.actionBg};
  color: ${(p) => (p.$primary ? tokens.color.onField : tokens.color.fg)};
  border: 1px solid
    ${(p) => (p.$primary ? tokens.color.primary : tokens.color.borderEmphasis)};
  border-radius: ${tokens.radius.sm};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.body};
  cursor: pointer;

  &:hover {
    background: ${(p) =>
      p.$primary ? tokens.color.primaryHover : tokens.color.actionBgHover};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
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
const TerminalStrip = styled.div`
  display: flex;
  flex-direction: column;
  height: 9rem;
  border-top: 1px solid ${tokens.color.border};
  min-height: 0;
`;


/** The server's own "still missing" list, rendered verbatim. */
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
  const [focusedValue, setFocusedValue] = useState<string | null>(null);
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

  const renderCards = (f: CharGenFieldState) => {
    const opts = f.options ?? [];
    const selected = f.value ?? null;
    // ⭐ Illustrated is DERIVED, not declared. A field is illustrated
    // when its options actually carry an image or a dossier — which
    // deletes the old `ILLUSTRATED_FIELDS` set rather than replacing it
    // with a wire field that says the same thing twice.
    const illustrated = opts.some((o) => o.image || o.dossier);
    const grid = (
      <OptionGrid>
        {opts.map((opt) => (
          <OptionCard
            key={opt.value}
            data-testid={`chargen-option-${opt.value}`}
            $selected={opt.value === selected || opt.label === selected}
            aria-pressed={opt.value === selected || opt.label === selected}
            onClick={() => setField(f.field, opt.value)}
            onMouseEnter={() => {
              if (illustrated) setFocusedValue(opt.value);
              onCommandPreview(`enroll ${f.field} ${opt.value}`);
            }}
            onMouseLeave={() => {
              if (illustrated) setFocusedValue(null);
              onCommandPreview(null);
            }}
          >
            <OptionLabel>{opt.label}</OptionLabel>
            {!illustrated && opt.description ? (
              <OptionDesc>{opt.description}</OptionDesc>
            ) : null}
          </OptionCard>
        ))}
      </OptionGrid>
    );
    if (!illustrated) return grid;
    const focused =
      opts.find(
        (o) => o.value === (focusedValue ?? selected) || o.label === selected,
      ) ??
      opts[0] ??
      null;
    return (
      <IllustratedLayout>
        <OptionColumn>{grid}</OptionColumn>
        <DetailPane data-testid="chargen-detail-pane">
          <DetailImage data-testid="chargen-detail-image">
            {focused?.image ? (
              <img src={mediaUrl(focused.image)} alt={focused.label} />
            ) : (
              <span>illustration</span>
            )}
          </DetailImage>
          {focused ? (
            <DetailLabel data-testid="chargen-detail-label">
              {focused.label}
            </DetailLabel>
          ) : null}
          {focused?.dossier?.binomial ? (
            <Binomial data-testid="chargen-detail-binomial">
              {focused.dossier.binomial}
            </Binomial>
          ) : null}
          {focused?.description ? (
            <DetailDesc>{focused.description}</DetailDesc>
          ) : null}
          {focused?.dossier?.sections.length ? (
            <DossierBox data-testid="chargen-detail-dossier">
              {focused.dossier.sections.map((section) => (
                <DossierSectionView
                  key={section.heading}
                  heading={section.heading}
                  rows={section.rows}
                />
              ))}
            </DossierBox>
          ) : null}
        </DetailPane>
      </IllustratedLayout>
    );
  };

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
        {accountName ? (
          <NameAccountRef>
            Signed in as <strong>{accountName}</strong>
          </NameAccountRef>
        ) : null}
        <NameFieldRow>
          <NameField>
            <NameFieldLabel htmlFor={`chargen-${f.field}-a`}>
              {two ? "Given name" : f.label}
            </NameFieldLabel>
            <NameInput
              id={`chargen-${f.field}-a`}
              data-testid="chargen-given-input"
              value={d.a}
              onChange={(e) => setDraft(f.field, { a: e.target.value })}
              onBlur={() => submitText(f)}
              placeholder={two ? "Given name" : f.label}
              autoComplete="off"
            />
          </NameField>
          {two ? (
            <NameField>
              <NameFieldLabel htmlFor={`chargen-${f.field}-b`}>
                Surname <NameOptional>(optional)</NameOptional>
              </NameFieldLabel>
              <NameInput
                id={`chargen-${f.field}-b`}
                data-testid="chargen-surname-input"
                value={d.b}
                onChange={(e) => setDraft(f.field, { b: e.target.value })}
                onBlur={() => submitText(f)}
                placeholder="Surname"
                autoComplete="off"
              />
            </NameField>
          ) : null}
        </NameFieldRow>
        {f.hint ? <NameAccountRef>{f.hint}</NameAccountRef> : null}
        {f.suggestion ? (
          <StageButton
            type="button"
            data-testid="chargen-reroll"
            onClick={() => onSendCommand(`enroll ${f.field} reroll`)}
          >
            ⟳ Suggest another
          </StageButton>
        ) : null}
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
          <div>
            <StepHeading data-testid="chargen-step">
              Articles of Enrolment
            </StepHeading>
            <StepSub>
              No classes, no levels, no stat points. You declare a body and a
              name; competence comes from doing the work.{" "}
              <strong>Fill the fields in any order</strong> — every entry reads
              the whole draft back to you, and whatever is still open is listed
              at the bottom.
            </StepSub>
          </div>

          {error ? (
            <ErrorBanner data-testid="chargen-error">
              {error.message}
            </ErrorBanner>
          ) : null}

          {/*
            ⭐ Every applicable field, in server order, on one page. A
            field this client has no opinion about still appears here —
            there is nowhere on a single page for one to hide, which is
            what makes a server-added field safe by construction rather
            than by a rule.
          */}
          {shown.map((f) => (
            <FieldGroup key={f.field}>
              <FieldGroupHeading>{f.label}</FieldGroupHeading>
              {renderField(f)}
            </FieldGroup>
          ))}
        </StageInner>
      </StageBody>

      {/*
        The seal row: what is still open, and the one committing action.
        Pinned below the scrolling body so both stay reachable however
        tall the dossier gets.
      */}
      <NavRow>
        {/*
          ⚠ The still-missing list is the SERVER's, rendered verbatim.
          The client never composes it — that is the whole reason it can
          be trusted to gate the button beside it.
        */}
        {missing.length > 0 ? (
          <MissingLine data-testid="chargen-missing">
            still missing: {missing.join(", ")}
          </MissingLine>
        ) : (
          <MissingLine data-testid="chargen-missing">
            nothing missing — you can enter the world
          </MissingLine>
        )}
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
      </NavRow>

      {/* Slim narration strip — secondary to the stage. */}
      <TerminalStrip>
        <Terminal
          frames={frames}
          onCommandClick={onCommandClick}
          onCommandPreview={onCommandPreview}
        />
      </TerminalStrip>

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

