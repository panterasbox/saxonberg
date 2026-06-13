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
 *      (`system.charactergen.welcome` et al.) scroll here, secondary.
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
 * what the `system.charactergen.state` frame carries and forwards the
 * tokens back.
 *
 * Styling matches the cockpit's token-driven aesthetic. Weight and
 * position carry the hierarchy (the command bar is the visual anchor);
 * color is reserved (the project is color-conservative).
 */

import { Fragment, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import type {
  CharGenField,
  CharGenOption,
  CharGenPicks,
} from "@saxonberg/types";
import { useStore } from "../store/index";
import { signOut } from "../services/auth";
import { mediaUrl } from "../config";
import { tokens } from "./ui/tokens";
import { Terminal } from "./Terminal";
import { CommandBar } from "./CommandBar";
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

/* --- Picks summary ------------------------------------------------ */

const Picks = styled.dl`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: ${tokens.space.sm} ${tokens.space.xl};
  margin: 0;
  padding: ${tokens.space.md} ${tokens.space.xl};
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.md};
  font-size: ${tokens.font.small};
`;

const PickKey = styled.dt`
  color: ${tokens.color.fgMuted};
  text-transform: lowercase;
`;

const PickVal = styled.dd`
  margin: 0;
  color: ${tokens.color.fg};
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
 * A field group within a screen. When a screen holds more than one
 * field (e.g. sex + pronouns), each gets a small heading; a single-field
 * screen relies on the screen heading and shows no group heading.
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
 * Navigation footer: Back on the left, the forward action (Continue /
 * Step into the world) on the right. Pinned outside the scrolling stage
 * body so it stays visible regardless of dossier height.
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
  color: ${(p) => (p.$primary ? "white" : tokens.color.fg)};
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
  border: 1px solid #e06c75;
  border-radius: ${tokens.radius.sm};
  color: #e06c75;
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

/* --- Screen layout (client-owned) --------------------------------- */

interface ScreenDef {
  id: string;
  heading: string;
  sub: string;
  fields: CharGenField[];
}

/**
 * The char-gen layout lives ENTIRELY here on the client — the server is
 * a field state machine that doesn't care how fields are grouped. This
 * default chunks fields across screens (sex + pronouns share one). A
 * single-page A/B variant is just a one-entry config listing every
 * field; no server change.
 */
const SCREENS: ScreenDef[] = [
  {
    id: "species",
    heading: "Choose your species",
    sub: "Pick the kind of being you are stepping into.",
    fields: ["species"],
  },
  {
    id: "identity",
    heading: "Sex & pronouns",
    sub: "Your biological sex, and how others will refer to you.",
    fields: ["sex", "pronouns"],
  },
  {
    id: "name",
    heading: "Choose a name",
    sub: "Edit the suggested name, or write your own.",
    fields: ["name"],
  },
  {
    id: "aspiration",
    heading: "Choose an aspiration",
    sub: "Who you are becoming — this seeds your story and your attire.",
    fields: ["aspiration"],
  },
];

const REVIEW_SCREEN: ScreenDef = {
  id: "review",
  heading: "Review your character",
  sub: "Check everything over, then step into the world.",
  fields: [],
};

/** Fields rendered with the illustrated cards-plus-dossier layout. */
const ILLUSTRATED_FIELDS = new Set<CharGenField>(["species"]);

/** Per-field heading, shown when a screen groups more than one field. */
const FIELD_HEADING: Record<CharGenField, string> = {
  species: "Species",
  sex: "Sex",
  name: "Name",
  pronouns: "Pronouns",
  aspiration: "Aspiration",
};

/** The currently-selected option value for a closed-choice field. */
function pickValueForField(
  field: CharGenField,
  picks: CharGenPicks,
): string | null {
  switch (field) {
    case "species":
      return picks.species?.key ?? null;
    case "sex":
      return picks.sex ?? null;
    case "pronouns":
      return picks.pronouns ?? null;
    case "aspiration":
      return picks.aspiration ?? null;
    default:
      return null;
  }
}

/** The accumulated picks, for the review summary. */
function reviewRows(picks: CharGenPicks): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (picks.species) {
    rows.push({ label: "Species", value: picks.species.commonName });
  }
  if (picks.sex) rows.push({ label: "Sex", value: picks.sex });
  if (picks.pronouns) rows.push({ label: "Pronouns", value: picks.pronouns });
  const fullName = [picks.name, picks.surname].filter(Boolean).join(" ");
  if (fullName) rows.push({ label: "Name", value: fullName });
  if (picks.aspiration)
    rows.push({ label: "Aspiration", value: picks.aspiration });
  return rows;
}

/* --- Component ---------------------------------------------------- */

interface CharGenStageProps {
  /** The real command channel — every affordance routes through it. */
  onSendCommand: (text: string) => void;
  /** Frames feeding the slim narration strip. */
  frames: Frame[];
  /** CommandBar wiring, forwarded from App unchanged. */
  baseValue: string;
  onBaseChange: (value: string) => void;
  onSendPromptResponse: (promptId: string, response: string) => void;
  onCancelPrompt: (promptId: string) => void;
  flashing?: boolean;
  /** Terminal click-routing wiring, forwarded from App unchanged. */
  onCommandClick: (command: string) => void;
  onCommandPreview: (command: string | null) => void;
}

export function CharGenStage({
  onSendCommand,
  frames,
  baseValue,
  onBaseChange,
  onSendPromptResponse,
  onCancelPrompt,
  flashing,
  onCommandClick,
  onCommandPreview,
}: CharGenStageProps) {
  const charGenState = useStore((s) => s.charGenState);
  // Which screen the client is showing — flow/layout is entirely
  // client-side; the server is a field state machine that doesn't care.
  const [screenIndex, setScreenIndex] = useState(0);
  // The detail pane previews this option on card hover; null falls
  // through to the chosen card, then the first option.
  const [focusedValue, setFocusedValue] = useState<string | null>(null);
  // Editable name fields, pre-filled from the existing pick (else the
  // suggestion); refilled only when that source changes (e.g. reroll),
  // not on every keystroke.
  const [givenName, setGivenName] = useState("");
  const [surnameVal, setSurnameVal] = useState("");
  // The name field flushes from both the input `onBlur` and the Continue
  // button. Clicking Continue blurs the input first, so both fire in the
  // same tick with identical content. Dedupe by last-sent value so an
  // unchanged name is never re-fired (a redundant `enroll name`).
  const lastSentName = useRef<string | null>(null);
  const nameSource = charGenState?.picks?.name
    ? `pick:${charGenState.picks.name}|${charGenState.picks.surname ?? ""}`
    : `sug:${charGenState?.suggestion?.name ?? ""}|${charGenState?.suggestion?.surname ?? ""}`;
  useEffect(() => {
    if (!charGenState) return;
    if (charGenState.picks.name) {
      setGivenName(charGenState.picks.name);
      setSurnameVal(charGenState.picks.surname ?? "");
    } else if (charGenState.suggestion) {
      setGivenName(charGenState.suggestion.name ?? "");
      setSurnameVal(charGenState.suggestion.surname ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameSource]);

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

  const {
    picks,
    speciesOptions,
    sexOptions,
    pronounOptions,
    aspirationOptions,
    accountName,
    missing,
    error,
  } = charGenState;

  const optionsFor = (field: CharGenField): CharGenOption[] => {
    switch (field) {
      case "species":
        return speciesOptions;
      case "sex":
        return sexOptions;
      case "pronouns":
        return pronounOptions;
      case "aspiration":
        return aspirationOptions;
      default:
        return [];
    }
  };

  // Sex drops off a screen entirely when it doesn't apply (no options).
  const fieldApplies = (field: CharGenField): boolean =>
    field === "sex" ? sexOptions.length > 0 : true;

  const screens = [...SCREENS, REVIEW_SCREEN];
  const clampedIndex = Math.min(screenIndex, screens.length - 1);
  const screen = screens[clampedIndex]!;
  const isReview = clampedIndex >= SCREENS.length;
  const screenFields = screen.fields.filter(fieldApplies);

  const submitName = () => {
    const given = givenName.trim();
    if (!given) return;
    const surname = surnameVal.trim();
    const cmd = `enroll name ${[given, surname].filter(Boolean).join(" ")}`;
    if (cmd === lastSentName.current) return;
    lastSentName.current = cmd;
    onSendCommand(cmd);
  };

  // Setting a field is a LIVE command (fires + echoes immediately).
  const setField = (field: CharGenField, value: string) =>
    onSendCommand(`enroll ${field} ${value}`);

  // Nav: a field is satisfied via the local box (name, which fires on
  // blur / Next) or the server's `missing` (everything else).
  const fieldSatisfied = (field: CharGenField): boolean =>
    field === "name" ? givenName.trim() !== "" : !missing.includes(field);
  const canAdvance = screenFields.every(fieldSatisfied);

  const goNext = () => {
    if (screenFields.includes("name")) submitName();
    setScreenIndex((i) => Math.min(i + 1, screens.length - 1));
  };
  const goBack = () => setScreenIndex((i) => Math.max(0, i - 1));

  const renderCards = (field: CharGenField) => {
    const opts = optionsFor(field);
    const selected = pickValueForField(field, picks);
    const illustrated = ILLUSTRATED_FIELDS.has(field);
    const grid = (
      <OptionGrid>
        {opts.map((opt) => (
          <OptionCard
            key={opt.value}
            data-testid={`chargen-option-${opt.value}`}
            $selected={opt.value === selected}
            aria-pressed={opt.value === selected}
            onClick={() => setField(field, opt.value)}
            onMouseEnter={() => {
              if (illustrated) setFocusedValue(opt.value);
              onCommandPreview(`enroll ${field} ${opt.value}`);
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
      opts.find((o) => o.value === (focusedValue ?? selected)) ??
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
                <div key={section.heading}>
                  <DossierHeading>{section.heading}</DossierHeading>
                  <DossierGrid>
                    {section.rows.map((row) => (
                      <Fragment key={row.label}>
                        <DossierLabel>{row.label}</DossierLabel>
                        <DossierValue>{row.value}</DossierValue>
                      </Fragment>
                    ))}
                  </DossierGrid>
                </div>
              ))}
            </DossierBox>
          ) : null}
        </DetailPane>
      </IllustratedLayout>
    );
  };

  const renderNameField = () => (
    <NameForm
      onSubmit={(e) => {
        e.preventDefault();
        submitName();
      }}
    >
      {accountName ? (
        <NameAccountRef>
          Signed in as <strong>{accountName}</strong>
        </NameAccountRef>
      ) : null}
      <NameFieldRow>
        <NameField>
          <NameFieldLabel htmlFor="chargen-given">Given name</NameFieldLabel>
          <NameInput
            id="chargen-given"
            data-testid="chargen-given-input"
            value={givenName}
            onChange={(e) => setGivenName(e.target.value)}
            onBlur={submitName}
            placeholder="Given name"
            autoComplete="off"
          />
        </NameField>
        <NameField>
          <NameFieldLabel htmlFor="chargen-surname">
            Surname <NameOptional>(optional)</NameOptional>
          </NameFieldLabel>
          <NameInput
            id="chargen-surname"
            data-testid="chargen-surname-input"
            value={surnameVal}
            onChange={(e) => setSurnameVal(e.target.value)}
            onBlur={submitName}
            placeholder="Surname"
            autoComplete="off"
          />
        </NameField>
      </NameFieldRow>
      <StageButton
        type="button"
        data-testid="chargen-reroll"
        onClick={() => onSendCommand("enroll name reroll")}
      >
        ⟳ Suggest another
      </StageButton>
      {/* Hidden submit so Enter in a field commits the name. */}
      <button type="submit" hidden aria-hidden="true" />
    </NameForm>
  );

  const renderField = (field: CharGenField) =>
    field === "name" ? renderNameField() : renderCards(field);

  return (
    <Stage data-testid="chargen-stage">
      <StageTopBar>
        <SignOutLink onClick={() => void signOut()}>Sign out</SignOutLink>
      </StageTopBar>
      <StageBody>
        <StageInner>
          <div>
            <StepHeading data-testid="chargen-step">
              {screen.heading}
            </StepHeading>
            <StepSub>{screen.sub}</StepSub>
          </div>

          {error ? (
            <ErrorBanner data-testid="chargen-error">
              {error.message}
            </ErrorBanner>
          ) : null}

          {isReview ? (
            <Picks data-testid="chargen-review">
              {reviewRows(picks).map((r) => (
                <PickRow key={r.label} label={r.label} value={r.value} />
              ))}
            </Picks>
          ) : (
            screenFields.map((field) => (
              <FieldGroup key={field}>
                {screenFields.length > 1 ? (
                  <FieldGroupHeading>{FIELD_HEADING[field]}</FieldGroupHeading>
                ) : null}
                {renderField(field)}
              </FieldGroup>
            ))
          )}
        </StageInner>
      </StageBody>

      {/* Client-side screen nav, pinned below the scrolling stage so it
          stays reachable regardless of dossier height. Back/Next just
          change which screen shows; the field commands already fired. */}
      <NavRow>
        {clampedIndex > 0 ? (
          <StageButton data-testid="chargen-back" onClick={goBack}>
            ← Back
          </StageButton>
        ) : (
          <span />
        )}
        {isReview ? (
          <StageButton
            $primary
            data-testid="chargen-confirm"
            disabled={missing.length > 0}
            onClick={() => onSendCommand("enroll confirm")}
            onMouseEnter={() => onCommandPreview("enroll confirm")}
            onMouseLeave={() => onCommandPreview(null)}
          >
            Step into the world
          </StageButton>
        ) : (
          <StageButton
            $primary
            data-testid="chargen-next"
            disabled={!canAdvance}
            onClick={goNext}
          >
            Continue →
          </StageButton>
        )}
      </NavRow>

      {/* Slim narration strip — secondary to the stage. */}
      <TerminalStrip>
        <Terminal
          frames={frames}
          onCommandClick={onCommandClick}
          onCommandPreview={onCommandPreview}
        />
      </TerminalStrip>

      {/* The command bar is the backbone — typed `enroll …` always works. */}
      <CommandBar
        baseValue={baseValue}
        onBaseChange={onBaseChange}
        onSendCommand={onSendCommand}
        onSendPromptResponse={onSendPromptResponse}
        onCancelPrompt={onCancelPrompt}
        flashing={flashing}
      />
    </Stage>
  );
}

function PickRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <PickKey>{label}</PickKey>
      <PickVal>{value}</PickVal>
    </>
  );
}
