/**
 * ComposerView — the wizard, code-tier surface (creation act #3). Compose a
 * base class + an ordered mixin set, scaffold the TS SOURCE (never a data
 * form), edit it in Monaco, and commit. The base's implied mixins show as a
 * read-only "inherited from <Base>" segment at the bottom of the composition
 * stack; the author's added mixins sit above it as an ordered, drag-reorderable
 * list. A live one-line composition preview mirrors the prototype chain.
 *
 * A live matching-blueprints panel filters the catalogue against the current
 * composition: an EXACT match (same base + same effective mixin set) raises a
 * dedup callout "⚠ this is already <Name> — use it?"; SUPERSET matches list
 * "kinds that already include this". Clicking a match routes to its detail (the
 * round-trip from composing back to instantiating).
 *
 * The view owns ZERO authorization semantics: scaffolding is inert author-tier
 * text; the commit is re-gated server-side and surfaces a `disposition`
 * inline. The follow-on "create a template" step is blocked until a commit
 * returns `reloaded:true` (the class-then-template ordering rule).
 */

import React from "react";
import styled from "styled-components";
import type { BlueprintSummary, MixinPaletteEntry } from "@saxonberg/types";
import { useStore } from "../../../store/index";
import { MonacoLazy } from "../MonacoLazy";
import { WarningBanner } from "./WarningBanner";
import { signatureFromParts } from "../../../store/studioSlice";
import { tokens } from "../../ui";

const Screen = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
`;

const BackBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.md};
  padding: ${tokens.space.sm} ${tokens.space.md};
`;

const Columns = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
`;

const LeftColumn = styled.div`
  flex: none;
  width: 360px;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.sm};
  min-height: 0;
  border-right: 1px solid ${tokens.color.borderMuted};
  overflow: auto;
  padding: ${tokens.space.md};
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
`;

const SectionLabel = styled.div`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${tokens.color.sectionLabel};
`;

const NameInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};

  &:focus {
    outline: none;
    border-color: ${tokens.color.primary};
  }
`;

const Select = styled.select`
  width: 100%;
  box-sizing: border-box;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.space.xs};
  background: ${tokens.color.surface};
`;

const OrderedRow = styled.div<{ $dragging: boolean }>`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  padding: 2px ${tokens.space.xs};
  border-radius: ${tokens.radius.sm};
  background: ${(p) =>
    p.$dragging ? tokens.color.actionBg : tokens.color.surfaceSunken};
  border: 1px solid ${tokens.color.border};
  cursor: grab;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fg};
`;

const Grip = styled.span`
  color: ${tokens.color.fgMuted};
  cursor: grab;
`;

const OrderName = styled.span`
  flex: 1;
`;

const IconButton = styled.button`
  background: transparent;
  border: none;
  color: ${tokens.color.fgMuted};
  cursor: pointer;
  font-size: ${tokens.font.small};
  padding: 0 2px;

  &:hover:not(:disabled) {
    color: ${tokens.color.fg};
  }
  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
`;

const InheritedRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  padding: 2px ${tokens.space.xs};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
  font-style: italic;
`;

const InheritedLabel = styled.div`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
  padding: ${tokens.space.xs} 0 0;
`;

const EmptyStack = styled.div`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
  font-style: italic;
  padding: 2px ${tokens.space.xs};
`;

const PaletteList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.xs};
`;

const Chip = styled.button<{ $on: boolean }>`
  background: ${(p) =>
    p.$on ? tokens.color.primary : tokens.color.surfaceSunken};
  color: ${(p) => (p.$on ? tokens.color.fg : tokens.color.fgMuted)};
  border: 1px solid
    ${(p) => (p.$on ? tokens.color.primary : tokens.color.border)};
  border-radius: ${tokens.radius.md};
  padding: 2px ${tokens.space.sm};
  cursor: pointer;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};

  &:hover:not(:disabled) {
    border-color: ${tokens.color.primary};
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;


const BaseNote = styled.div`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
  font-style: italic;
`;

const Preview = styled.pre`
  margin: 0;
  padding: ${tokens.space.sm};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.md};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  white-space: pre-wrap;
  word-break: break-word;
`;

const PrimaryButton = styled.button`
  background: ${tokens.color.primary};
  border: none;
  border-radius: ${tokens.radius.md};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  padding: ${tokens.space.xs} ${tokens.space.lg};
  cursor: pointer;
  align-self: flex-start;

  &:hover:not(:disabled) {
    background: ${tokens.color.primaryHover};
  }
  &:disabled {
    background: ${tokens.color.actionBg};
    color: ${tokens.color.fgMuted};
    cursor: default;
  }
`;

const GhostButton = styled(PrimaryButton)`
  background: transparent;
  border: 1px solid ${tokens.color.border};
  color: ${tokens.color.fgMuted};

  &:hover:not(:disabled) {
    color: ${tokens.color.fg};
    border-color: ${tokens.color.primary};
    background: transparent;
  }
`;

const MatchPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
`;

const DedupCallout = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
  padding: ${tokens.space.sm};
  border: 1px solid ${tokens.color.warning};
  border-radius: ${tokens.radius.md};
  background: ${tokens.color.surfaceAlt};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
`;

const MatchCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  background: ${tokens.color.surfaceSunken};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fg};
`;

const MatchName = styled.span`
  flex: 1;
  font-weight: 600;
`;

const UseLink = styled.button`
  background: transparent;
  border: none;
  color: ${tokens.color.accent};
  cursor: pointer;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  padding: 0;

  &:hover {
    color: ${tokens.color.accentHover};
  }
`;

// ---- right-column scaffold editor ----------------------------------------

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.md};
  padding: ${tokens.space.sm} ${tokens.space.md};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surface};
`;

const PathLabel = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fg};
`;

const Spacer = styled.div`
  flex: 1;
`;

const Disposition = styled.div<{ $denied: boolean }>`
  display: flex;
  align-items: center;
  gap: ${tokens.space.md};
  padding: ${tokens.space.sm} ${tokens.space.md};
  border-bottom: 1px solid
    ${(p) => (p.$denied ? tokens.color.danger : tokens.color.borderMuted)};
  color: ${(p) => (p.$denied ? tokens.color.danger : tokens.color.accent)};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
`;

const EditorBody = styled.div`
  flex: 1;
  min-height: 0;
`;

const Empty = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: ${tokens.color.fgMuted};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  font-style: italic;
  padding: ${tokens.space.md};
  text-align: center;
`;

/** The `extends` clause a base + ordered mixin set produces (prototype chain). */
export function extendsClause(base: string, mixins: readonly string[]): string {
  let composed = base || "Base";
  for (let i = mixins.length - 1; i >= 0; i--) {
    composed = `${mixins[i]}(${composed})`;
  }
  return composed;
}

/**
 * Strip a redundant leading self-name from a mixin summary so the composed
 * "<name> — <summary>" reads ONCE. Server summaries often begin with the
 * mixin's own name (`"NamedMixin — proper-name identity…"`); prepending the
 * name again doubles it. Conservative: only removes the name when it opens the
 * summary as a labelled prefix (name + separator/whitespace) or is the whole
 * summary. Returns the residual summary (`""` when the summary was just the
 * name).
 */
export function stripRedundantName(name: string, summary: string): string {
  const trimmed = summary.trimStart();
  if (trimmed === name) return "";
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // "<name>" opening the summary, followed by a separator (— – - : | ·).
  const sep = new RegExp(`^${esc}\\s*[—–:|·-]\\s*`);
  if (sep.test(trimmed)) return trimmed.replace(sep, "").trimStart();
  // "<name>" as a bare leading, space-delimited word.
  if (trimmed.startsWith(`${name} `)) {
    return trimmed.slice(name.length + 1).trimStart();
  }
  return summary;
}

/**
 * The one-line "<name> — <summary>" help label with the self-name doubling
 * removed. Degrades to the bare name when there is no summary. Used for both
 * the always-visible help strip and the `title` tooltips.
 */
export function mixinHelpText(
  name: string,
  summary: string | undefined,
): string {
  if (!summary) return name;
  const rest = stripRedundantName(name, summary);
  return rest ? `${name} — ${rest}` : name;
}

/** The ordered added-mixin list with native HTML5 drag reorder + a11y buttons. */
const OrderedMixins: React.FC<{
  summaryOf: (name: string) => string | undefined;
  onFocusMixin: (name: string | null) => void;
}> = ({ summaryOf, onFocusMixin }) => {
  const ordered = useStore((s) => s.studio.composer.orderedMixins);
  const remove = useStore((s) => s.studioComposerRemoveMixin);
  const reorder = useStore((s) => s.studioComposerReorder);
  const [dragging, setDragging] = React.useState<number | null>(null);

  if (ordered.length === 0) {
    return <EmptyStack>No added mixins — pick from the palette below.</EmptyStack>;
  }

  return (
    <>
      {ordered.map((name, i) => {
        const summary = summaryOf(name);
        return (
        <OrderedRow
          key={name}
          $dragging={dragging === i}
          draggable
          title={summary ? mixinHelpText(name, summary) : name}
          onMouseEnter={() => onFocusMixin(name)}
          onFocus={() => onFocusMixin(name)}
          onDragStart={() => setDragging(i)}
          onDragEnd={() => setDragging(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (dragging !== null) reorder(dragging, i);
            setDragging(null);
          }}
        >
          <Grip aria-hidden>⠿</Grip>
          <OrderName>{name}</OrderName>
          <IconButton
            type="button"
            disabled={i === 0}
            aria-label={`Move ${name} up`}
            title="Move up"
            onClick={() => reorder(i, i - 1)}
          >
            ↑
          </IconButton>
          <IconButton
            type="button"
            disabled={i === ordered.length - 1}
            aria-label={`Move ${name} down`}
            title="Move down"
            onClick={() => reorder(i, i + 1)}
          >
            ↓
          </IconButton>
          <IconButton
            type="button"
            aria-label={`Remove ${name}`}
            title="Remove"
            onClick={() => remove(name)}
          >
            ×
          </IconButton>
        </OrderedRow>
        );
      })}
    </>
  );
};

const ScaffoldEditor: React.FC<{
  effectiveMixins: string[];
  onRegenerate: () => void;
}> = ({ effectiveMixins, onRegenerate }) => {
  const source = useStore((s) => s.studio.scaffoldSource);
  const target = useStore((s) => s.studio.scaffoldTarget);
  const disposition = useStore((s) => s.studio.commitDisposition);
  const reloaded = useStore((s) => s.studio.commitReloaded);
  const message = useStore((s) => s.studio.commitMessage);
  const busy = useStore((s) => s.studio.busy);
  const csrf = useStore((s) => s.cms.csrf);
  const isWizard = useStore((s) => s.auth.isWizard === true);
  const composer = useStore((s) => s.studio.composer);
  const setSource = useStore((s) => s.studioSetScaffoldSource);
  const commit = useStore((s) => s.studioCommit);
  const reset = useStore((s) => s.studioResetScaffold);
  const beginTemplate = useStore((s) => s.studioBeginTemplate);

  // With no base picked there is nothing to generate — a hint, not a broken
  // call. (The default composition always carries a root base, so this is a
  // defensive floor rather than a state the UI reaches on its own.)
  if (!composer.base.name) {
    return <Empty>Pick a base class to start — its source appears here.</Empty>;
  }

  // The center is never a permanent placeholder: the composition live-scaffolds
  // (debounced) as it changes, so `source === null` is only the brief gap
  // before the first generation lands.
  if (source === null || target === null) {
    return <Empty>Generating source…</Empty>;
  }

  const denied = disposition === "denied";
  const livePath = target.replace(/\.ts$/, "");

  // The follow-on (enabled only on reloaded:true): make a template from the
  // now-live class. Synthesize a concrete blueprint for the committed class.
  const followOn = (): void => {
    const summary: BlueprintSummary = {
      blueprintId: "",
      name: composer.name,
      kind: "concrete",
      // The synthesized blueprint keys its signature on the fundamental ROOT
      // (a subclass shares its base's signature root), not the concrete base.
      baseClass: composer.base.rootBaseClass,
      mixinNames: effectiveMixins,
      classPath: livePath,
      blessed: false,
      signature: signatureFromParts(composer.base.rootBaseClass, effectiveMixins),
    };
    beginTemplate(summary);
  };

  return (
    <>
      <Toolbar>
        <PathLabel title={`source:${target}`}>source:{target}</PathLabel>
        <Spacer />
        <GhostButton
          type="button"
          disabled={busy || !csrf}
          title="Regenerate the source from the current composition (discards hand-edits)"
          onClick={onRegenerate}
        >
          Regenerate from composition
        </GhostButton>
        <GhostButton type="button" title="Discard this scaffold" onClick={() => reset()}>
          Discard
        </GhostButton>
        <PrimaryButton
          type="button"
          disabled={busy || !csrf}
          title={
            isWizard
              ? `Commit ${target} (publish the class to source)`
              : "Save — a non-wizard commit will be declined (server-gated)"
          }
          onClick={() => csrf && void commit(csrf)}
        >
          {busy ? "Committing…" : "Commit"}
        </PrimaryButton>
      </Toolbar>

      {disposition && (
        <Disposition $denied={denied} role="status">
          {denied ? (
            <span>Denied: {message ?? "only a wizard can publish a class"}</span>
          ) : reloaded ? (
            <>
              <span>Committed and live{message ? ` · ${message}` : ""}.</span>
              <GhostButton
                type="button"
                title={`Create a template instantiating ${livePath}`}
                onClick={followOn}
              >
                Create a template from this class →
              </GhostButton>
            </>
          ) : (
            <span>
              Committed but NOT live{message ? ` · ${message}` : ""}. Fix the
              source and re-commit before making a template.
            </span>
          )}
        </Disposition>
      )}

      <EditorBody>
        <MonacoLazy language="typescript" value={source} onChange={setSource} />
      </EditorBody>
    </>
  );
};

// ---- right-column mixin inspector pane -----------------------------------

const InspectorPane = styled.div<{ $height: number }>`
  height: ${(p) => p.$height}px;
  flex: none;
  min-height: 96px;
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${tokens.color.border};
  background: ${tokens.color.surface};
  overflow: hidden;
`;

// The draggable divider between the source editor (above) and the inspector
// (below). Pointer-drag resizes the inspector; the source is never hidden.
const InspectorDivider = styled.div`
  flex: none;
  height: 6px;
  cursor: row-resize;
  background: ${tokens.color.surfaceSunken};
  border-top: 1px solid ${tokens.color.borderMuted};

  &:hover {
    background: ${tokens.color.actionBg};
  }
`;

const InspectorHeader = styled.div`
  flex: none;
  display: flex;
  align-items: baseline;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.sm} ${tokens.space.md};
  border-bottom: 1px solid ${tokens.color.borderMuted};
`;

const InspectorTitle = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.body};
  color: ${tokens.color.fg};
`;

const InspectorSubtitle = styled.span`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

const InspectorBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: ${tokens.space.md};
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.md};
`;

const InspectorSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
`;

// The concept comment, rendered whitespace-pre so paragraph breaks and
// numbered/bulleted list structure survive without a markdown dependency.
const DescriptionText = styled.div`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fg};
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
`;

const FieldRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${tokens.space.sm};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fg};
`;

const FieldType = styled.span`
  color: ${tokens.color.accent};
`;

const FieldKind = styled.span`
  color: ${tokens.color.fgMuted};
  font-style: italic;
`;

const RuntimeNote = styled.div`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

const RelationRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${tokens.space.sm};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fg};
`;

const RelationKind = styled.span`
  flex: none;
  min-width: 84px;
  color: ${tokens.color.fgMuted};
  font-family: ${tokens.font.mono};
`;

const MethodPill = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fg};
  background: ${tokens.color.surfaceSunken};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  padding: 0 ${tokens.space.xs};
  margin: 0 ${tokens.space.xs} ${tokens.space.xs} 0;
  display: inline-block;
`;

const DocRefLink = styled.code`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.accent};
`;

const InspectorEmpty = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${tokens.space.md};
  text-align: center;
  color: ${tokens.color.fgMuted};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  font-style: italic;
`;

/**
 * The dedicated, scrollable mixin inspector pane. Sticky: it renders whatever
 * mixin was last inspected (hovered/focused) so the author can read it while
 * composing. Fetches lazily on the first inspect and reads the per-mixin cache
 * — a hover never refetches. Content degrades gracefully: the description +
 * fields are always available; relations + methods appear only when the help
 * artifact is present.
 */
const MixinInspector: React.FC<{
  height: number;
  onResizeStart: (e: React.PointerEvent) => void;
  summaryOf: (name: string) => string | undefined;
}> = ({ height, onResizeStart, summaryOf }) => {
  const inspected = useStore((s) => s.studio.inspectedMixin);
  const details = useStore((s) => s.studio.mixinDetails);
  const inspectError = useStore((s) => s.studio.inspectError);

  const detail = inspected ? details[inspected] : undefined;

  return (
    <>
      <InspectorDivider
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize the inspector"
        onPointerDown={onResizeStart}
      />
      <InspectorPane $height={height} data-testid="mixin-inspector">
        {inspected === null ? (
          <InspectorEmpty>Hover or focus a mixin to inspect it.</InspectorEmpty>
        ) : (
          <>
            <InspectorHeader>
              <InspectorTitle>{inspected}</InspectorTitle>
              {detail === undefined && summaryOf(inspected) && (
                <InspectorSubtitle>{summaryOf(inspected)}</InspectorSubtitle>
              )}
            </InspectorHeader>
            <InspectorBody>
              {detail === undefined ? (
                <InspectorSubtitle>
                  {inspectError
                    ? `Could not load: ${inspectError}`
                    : "Loading…"}
                </InspectorSubtitle>
              ) : (
                <>
                  <InspectorSection>
                    <SectionLabel>Description</SectionLabel>
                    {detail.description ? (
                      <DescriptionText>{detail.description}</DescriptionText>
                    ) : (
                      <InspectorSubtitle>
                        No description on this mixin.
                      </InspectorSubtitle>
                    )}
                  </InspectorSection>

                  {(detail.authorableFields.length > 0 ||
                    detail.runtimeState.length > 0) && (
                    <InspectorSection>
                      <SectionLabel>Contributes</SectionLabel>
                      {detail.authorableFields.length === 0 && (
                        <InspectorSubtitle>
                          No authorable fields.
                        </InspectorSubtitle>
                      )}
                      {detail.authorableFields.map((f) => (
                        <FieldRow key={f.name}>
                          <span>{f.name}</span>
                          <FieldType>({f.typeShape})</FieldType>
                          {f.kind === "instruction" && (
                            <FieldKind>instruction</FieldKind>
                          )}
                        </FieldRow>
                      ))}
                      {detail.runtimeState.length > 0 && (
                        <RuntimeNote>
                          runtime state: {detail.runtimeState.join(", ")}
                        </RuntimeNote>
                      )}
                    </InspectorSection>
                  )}

                  {(detail.methods.length > 0 ||
                    detail.relations.length > 0) && (
                    <InspectorSection>
                      <SectionLabel>Relations &amp; methods</SectionLabel>
                      {detail.methods.length > 0 && (
                        <div>
                          {detail.methods.map((m) => (
                            <MethodPill key={m}>{m}()</MethodPill>
                          ))}
                        </div>
                      )}
                      {detail.relations
                        .filter((r) => r.kind !== "confers")
                        .map((r, i) => (
                          <RelationRow key={`${r.kind}:${r.targetId}:${i}`}>
                            <RelationKind>{r.kind}</RelationKind>
                            <span>{r.targetTitle}</span>
                          </RelationRow>
                        ))}
                    </InspectorSection>
                  )}

                  {detail.docRef && (
                    <InspectorSection>
                      <SectionLabel>Learn more</SectionLabel>
                      <DocRefLink>{detail.docRef}</DocRefLink>
                    </InspectorSection>
                  )}
                </>
              )}
            </InspectorBody>
          </>
        )}
      </InspectorPane>
    </>
  );
};

export const ComposerView: React.FC = () => {
  const composer = useStore((s) => s.studio.composer);
  const palette = useStore((s) => s.studio.palette);
  const blueprints = useStore((s) => s.studio.blueprints);
  const csrf = useStore((s) => s.cms.csrf);
  const listPalette = useStore((s) => s.studioListPalette);
  const listBlueprints = useStore((s) => s.studioListBlueprints);
  const setName = useStore((s) => s.studioComposerSetName);
  const setBase = useStore((s) => s.studioComposerSetBase);
  const addMixin = useStore((s) => s.studioComposerAddMixin);
  const scaffold = useStore((s) => s.studioScaffold);
  const goCatalogue = useStore((s) => s.studioGoCatalogue);
  const selectBlueprint = useStore((s) => s.studioSelectBlueprint);
  const effectiveMixins = useStore((s) => s.studioEffectiveMixins);
  const matching = useStore((s) => s.studioMatchingBlueprints);
  const inspect = useStore((s) => s.studioInspectMixin);

  React.useEffect(() => {
    if (palette === null) void listPalette();
    if (blueprints === null) void listBlueprints();
  }, [palette, blueprints, listPalette, listBlueprints]);

  // The resizable inspector pane's height (center column, docked below the
  // source editor). A pointer-drag on the divider adjusts it; the source stays
  // visible above at all times.
  const [inspectorHeight, setInspectorHeight] = React.useState(300);
  const onResizeStart = React.useCallback((e: React.PointerEvent): void => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = inspectorHeightRef.current;
    const onMove = (ev: PointerEvent): void => {
      // Dragging up (smaller clientY) grows the pane.
      const next = startH + (startY - ev.clientY);
      setInspectorHeight(Math.max(96, Math.min(720, next)));
    };
    const onUp = (): void => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);
  // Keep the latest height reachable from the drag closure without re-binding.
  const inspectorHeightRef = React.useRef(inspectorHeight);
  inspectorHeightRef.current = inspectorHeight;

  const validName = /^[A-Z][A-Za-z0-9_]*$/.test(composer.name);

  // Live source: (re)scaffold from the current composition. A placeholder class
  // name keeps the source non-blank until the author names it; the real name
  // substitutes once it is a valid PascalCase identifier. No base / no csrf →
  // a no-op (the ScaffoldEditor shows a hint instead of firing a broken call).
  const runScaffold = React.useCallback((): void => {
    if (!composer.base.name || !csrf) return;
    void scaffold(
      {
        name: validName ? composer.name : "MyKind",
        baseClass: composer.base.name,
        mixinNames: composer.orderedMixins,
      },
      csrf,
    );
  }, [
    composer.base.name,
    composer.name,
    composer.orderedMixins,
    validName,
    csrf,
    scaffold,
  ]);

  // Auto-scaffold, debounced ~300ms. `runScaffold`'s identity changes whenever
  // the composition changes, so this effect re-arms the timer on every edit and
  // only fires once the author pauses — the stale-response race is dropped in
  // the slice. Cleanup clears any pending (not-yet-fired) timer.
  React.useEffect(() => {
    const handle = setTimeout(runScaffold, 300);
    return () => clearTimeout(handle);
  }, [runScaffold]);

  const bases = palette?.bases ?? [];
  const mixinEntries = (palette?.mixins ?? []).filter(
    (m: MixinPaletteEntry) => m.kind === "mixin",
  );
  // name → one-line summary, for the inline palette help (tooltips + detail).
  const summaryMap = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const e of palette?.mixins ?? []) if (e.summary) m.set(e.name, e.summary);
    return m;
  }, [palette]);
  const summaryOf = React.useCallback(
    (name: string): string | undefined => summaryMap.get(name),
    [summaryMap],
  );

  const effective = effectiveMixins();
  const effectiveSet = new Set(effective);
  const clause = extendsClause(composer.base.name, composer.orderedMixins);
  const { exact, superset } = matching();
  const isArbitraryBase = !bases.some((b) => b.name === composer.base.name);

  return (
    <Screen>
      <BackBar>
        <GhostButton
          type="button"
          title="Back to the kinds catalogue"
          onClick={() => goCatalogue()}
        >
          ← Back to catalogue
        </GhostButton>
        <Spacer />
        <WarningBanner />
      </BackBar>

      <Columns>
        <LeftColumn>
          <SectionLabel>Name</SectionLabel>
          <NameInput
            value={composer.name}
            placeholder="PascalCaseName"
            spellCheck={false}
            title="The new backing class name (PascalCase)"
            onChange={(e) => setName(e.target.value)}
          />

          <SectionLabel>Base class</SectionLabel>
          <Select
            value={composer.base.name}
            title="The base class the mixins are applied over"
            onChange={(e) => setBase(e.target.value)}
          >
            {isArbitraryBase && (
              <option value={composer.base.name}>
                {composer.base.name} (from blueprint)
              </option>
            )}
            {bases.length === 0 && !isArbitraryBase && (
              <option value={composer.base.name}>{composer.base.name}</option>
            )}
            {bases.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </Select>
          {isArbitraryBase && (
            <BaseNote>
              extends <strong>{composer.base.name}</strong> (from blueprint) —
              pick a root above to switch back.
            </BaseNote>
          )}

          <SectionLabel>Composition (outermost first)</SectionLabel>
          <Stack>
            <OrderedMixins summaryOf={summaryOf} onFocusMixin={inspect} />
            {composer.base.impliedMixins.length > 0 && (
              <>
                <InheritedLabel>
                  inherited from {composer.base.name}
                </InheritedLabel>
                {composer.base.impliedMixins.map((m) => {
                  const summary = summaryOf(m);
                  return (
                    <InheritedRow
                      key={m}
                      title={
                        summary
                          ? mixinHelpText(m, summary)
                          : `${m} is composed by ${composer.base.name}`
                      }
                      tabIndex={0}
                      onMouseEnter={() => inspect(m)}
                      onFocus={() => inspect(m)}
                    >
                      {m}
                    </InheritedRow>
                  );
                })}
              </>
            )}
          </Stack>

          <SectionLabel>Add a mixin</SectionLabel>
          <PaletteList>
            {mixinEntries.map((m) => {
              const on = effectiveSet.has(m.name);
              const implied = composer.base.impliedMixins.includes(m.name);
              const summary = m.summary;
              const title = implied
                ? `${m.name} is already inherited from ${composer.base.name}`
                : summary
                  ? mixinHelpText(m.name, summary)
                  : on
                    ? `${m.name} is already in the composition`
                    : `Add ${m.name}`;
              return (
                <Chip
                  key={m.name}
                  type="button"
                  $on={on}
                  disabled={implied}
                  title={title}
                  onMouseEnter={() => inspect(m.name)}
                  onFocus={() => inspect(m.name)}
                  onClick={() => addMixin(m.name)}
                >
                  {m.name}
                </Chip>
              );
            })}
          </PaletteList>

          <SectionLabel>Preview</SectionLabel>
          <Preview>{`class ${composer.name || "MyKind"} extends ${clause} {}`}</Preview>
          <BaseNote>
            The source regenerates live on the right as you compose. Edit it
            there, or use “Regenerate from composition”.
          </BaseNote>

          {(exact.length > 0 || superset.length > 0) && (
            <MatchPanel>
              {exact.length > 0 && (
                <DedupCallout role="status">
                  <span>
                    ⚠ this is already <strong>{exact[0]?.name}</strong> — use it?
                  </span>
                  {exact.map((bp) => (
                    <MatchCard key={bp.blueprintId}>
                      <MatchName>{bp.name}</MatchName>
                      <UseLink
                        type="button"
                        title={`Open ${bp.name}`}
                        onClick={() => selectBlueprint(bp)}
                      >
                        Use this blueprint →
                      </UseLink>
                    </MatchCard>
                  ))}
                </DedupCallout>
              )}
              {superset.length > 0 && (
                <>
                  <SectionLabel>Kinds that already include this</SectionLabel>
                  {superset.map((bp) => (
                    <MatchCard key={bp.blueprintId}>
                      <MatchName>{bp.name}</MatchName>
                      <UseLink
                        type="button"
                        title={`Open ${bp.name}`}
                        onClick={() => selectBlueprint(bp)}
                      >
                        Use this blueprint →
                      </UseLink>
                    </MatchCard>
                  ))}
                </>
              )}
            </MatchPanel>
          )}
        </LeftColumn>

        <RightColumn>
          <ScaffoldEditor
            effectiveMixins={effective}
            onRegenerate={runScaffold}
          />
          <MixinInspector
            height={inspectorHeight}
            onResizeStart={onResizeStart}
            summaryOf={summaryOf}
          />
        </RightColumn>
      </Columns>
    </Screen>
  );
};
