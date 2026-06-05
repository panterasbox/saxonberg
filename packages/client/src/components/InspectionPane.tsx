/**
 * InspectionPane — persistent right-column pane sourced from the
 * canonical `me.focus` MQL subscription.
 *
 * Subscribes on mount via the wire client's
 * `subscribeToCanonicalKind('me.focus')`; tears down on unmount via
 * `websocketClient.unsubscribe(id)`. The header is always-live (any
 * focus change updates it); the body is paint/clear gated per the
 * inspection-pane principle: *focus is a pointer; look is the verb
 * that paints what the pointer points at*.
 *
 * **Body = percept projection, not state dump.** Per the
 * inspection-pane reconciliation, the body renders ONLY what a
 * perception verb would reveal to *this viewer* — the focused
 * thing's description and its visible contents. Internal property
 * state (slot maps, mixin lists, raw fields) is NOT pulled into
 * the player body just because the subscription detail field-set
 * could carry it; raw state lives in the admin extras (role-gated)
 * exclusively. The detail subscription already projects only
 * percept-shaped fields server-side; this component preserves the
 * discipline on the render side.
 *
 * **Accumulate vs. latest — v1 ships latest-only.** Each
 * subscription result / delta replaces `paneLastResult` in place;
 * there is no per-fact union across multiple `look` / `examine` /
 * `measure` calls. The full revelation-condition spine (per-fact
 * provenance, accumulation across modalities) is parked per the
 * reconciliation handoff. Latest-only stays internally consistent
 * because the substrate re-projects the *currently-perceivable*
 * set on every re-resolve.
 *
 * Paint/clear policy (lives in the Zustand `inspection-pane` slice,
 * not in this component's state):
 *
 * - On mount: cleared.
 * - On any subscription delta where the focus fragment changed
 *   compared to the slice's stored fragment: clear + push to
 *   breadcrumbs.
 * - On an outgoing `look` command (bare or against the current
 *   focus): paint. The fragment-change-clears rule applies on
 *   focus-verb usage only (see `App.tsx`'s `sendCommand` for the
 *   client-side verb detection).
 * - While painted: subscription deltas update `paneLastResult` and
 *   the body re-renders in place.
 * - While cleared: deltas still update `paneLastResult` (cache stays
 *   warm) but the body shows the placeholder.
 *
 * Body branches on result cardinality:
 *
 * - Single record → detail view (header name + descriptions via
 *   `MmlRenderer` + clickable visible contents list).
 * - Multi record → list view, one row per match. The shape will
 *   eventually project a group via `GroupApi` (per grouping-slate);
 *   v1 just renders a list of styled names with `stuff-id` already
 *   threaded so the future bucket-selector lands without component
 *   changes.
 *
 * Admin extras (template path / stuff id / mixin composition / raw
 * data dump / quick-action buttons for `clone` / `reload` / `eval`)
 * render only when the local viewer is admin — derived from the
 * client store. Today the auth slice carries no admin marker; the
 * pane reads `useStore.getState().auth.player?.isAdmin` defensively
 * (returns `undefined` → hidden). When a real auth-side admin
 * marker lands, no UI change is required.
 *
 * Styling: every color / spacing / font value resolves through
 * `ui/tokens.ts`. The `data-stuff-id` attribute rides every
 * clickable name affordance (via `<EntityName>`) — one attribute,
 * double duty (interactivity + future social-graph bucket
 * coloring) per the message-rendering slate.
 */

import React, { useEffect, useMemo } from "react";
import styled from "styled-components";
import type {
  Envelope,
  MqlSubscriptionDeltaEnvelope,
  MqlSubscriptionResultEnvelope,
  StuffDetailRecord,
  StuffRefRecord,
} from "@saxonberg/types";
import { useStore } from "../store/index";
import { websocketClient } from "../services/websocket";
import { MmlRenderer } from "./MmlRenderer";
import {
  Button,
  EntityName,
  Field,
  FieldList,
  List,
  ListItem,
  tokens,
} from "./ui";

const PaneContainer = styled.aside`
  display: flex;
  flex-direction: column;
  width: 360px;
  min-width: 360px;
  max-width: 360px;
  height: 100%;
  background: ${tokens.color.surface};
  color: ${tokens.color.fg};
  border-left: 1px solid ${tokens.color.border};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.body};
  overflow: hidden;
`;

const Breadcrumbs = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.sm} ${tokens.space.md};
  padding: ${tokens.space.md} ${tokens.space.lg};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surfaceMuted};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${tokens.space.md} ${tokens.space.lg};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surfaceAlt};
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-weight: 700;
  color: ${tokens.color.fgEmphasis};
  font-size: ${tokens.font.title};
  word-break: break-word;
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${tokens.space.lg};
  white-space: pre-wrap;
  line-height: 1.5;
`;

const SectionHeading = styled.h3`
  margin: ${tokens.space.lg} 0 ${tokens.space.sm} 0;
  color: ${tokens.color.sectionLabel};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: ${tokens.font.micro};
  font-weight: 600;
`;

const BodyProse = styled.div`
  margin-bottom: ${tokens.space.lg};
`;

const ExitsBlock = styled.div`
  margin-bottom: ${tokens.space.lg};
  color: ${tokens.color.fgMuted};
`;

const ContentsBlock = styled.div`
  margin-bottom: ${tokens.space.lg};
`;

/**
 * Inline system label — matches `<sys>` in MmlRenderer so the pane
 * and the terminal scroll share the same visual treatment for
 * structural chrome ("Exits:", "Contents:"). Muted italic with a
 * decorative `── ` prefix carried via `::before` so screen readers
 * announce just the label text.
 */
const SystemLabel = styled.span`
  color: ${tokens.color.fgMuted};
  font-style: italic;

  &::before {
    content: '── ';
    color: ${tokens.color.borderMuted};
    font-style: normal;
  }
`;

const ContentsLabel = styled.div`
  margin-bottom: ${tokens.space.xs};
`;

const AdminBlock = styled.section`
  margin-top: ${tokens.space.xl};
  padding-top: ${tokens.space.md};
  border-top: 1px dashed ${tokens.color.border};
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.micro};
`;

const AdminActionRow = styled.div`
  display: flex;
  gap: ${tokens.space.md};
  margin-top: ${tokens.space.md};
  flex-wrap: wrap;
`;

const RawDump = styled.pre`
  background: ${tokens.color.surfaceSunken};
  border: 1px solid ${tokens.color.borderMuted};
  padding: ${tokens.space.md};
  margin: ${tokens.space.sm} 0;
  font-size: ${tokens.font.micro};
  max-height: 200px;
  overflow: auto;
  white-space: pre;
`;

const TagSuffix = styled.span`
  color: ${tokens.color.fgMuted};
  margin-left: ${tokens.space.md};
`;

export interface InspectionPaneProps {
  /**
   * Outbound command sink. Routes through the same path
   * `CommandBar.onSend` does, so breadcrumb clicks, the Refresh
   * button, contents-row clicks, and admin extras all ride the
   * command bus uniformly. Wired by `App.tsx` to its `sendCommand`.
   */
  onSendCommand: (text: string) => void;
  /**
   * Hover-preview channel. Mousing over any affordance in the pane
   * (breadcrumb, Refresh button, placeholder, exit, contents row,
   * MML tag inside the long description, admin action button)
   * fires `onCommandPreview(command)` with the command that
   * affordance would send; mouseleave fires `onCommandPreview(null)`.
   * Wired by `App.tsx` to the same handler the terminal scroll's
   * MmlRenderer uses, so the cockpit command bar mirrors what's
   * about to be sent uniformly across surfaces.
   */
  onCommandPreview?: (command: string | null) => void;
}

/**
 * Apply a wire `Change[]` batch to the pane's cached result snapshot.
 *
 * Keys are the substrate's per-record stable key — for flat-mode
 * subscriptions that's the `stuffId`. The four `op` shapes:
 *
 * - `add`: a record entered the result set. Append.
 * - `remove`: a record left the result set. Drop by key.
 * - `replace`: a record's full projection changed in place. Overwrite.
 * - `update`: a record's field-level partial. Merge fields-present.
 *
 * Records lacking a `stuffId` (theoretically possible for non-Stuff
 * projections; not used by `me.focus` today) are tolerated by keying
 * on the change's explicit `key`.
 */
function applyChanges(
  previous: ReadonlyArray<StuffRefRecord | StuffDetailRecord>,
  changes: ReadonlyArray<{
    op: "replace" | "update" | "add" | "remove";
    key: string;
    fields?: Partial<StuffRefRecord | StuffDetailRecord>;
  }>
): (StuffRefRecord | StuffDetailRecord)[] {
  const next = previous.slice();
  for (const change of changes) {
    const idx = next.findIndex((r) => r.stuffId === change.key);
    if (change.op === "remove") {
      if (idx >= 0) next.splice(idx, 1);
      continue;
    }
    if (change.op === "add") {
      if (change.fields) {
        next.push({
          ...(change.fields as StuffDetailRecord),
          stuffId: change.key,
          displayName:
            (change.fields as Partial<StuffDetailRecord>).displayName ?? "",
        });
      }
      continue;
    }
    if (change.op === "replace") {
      const replacement = {
        ...(change.fields as StuffDetailRecord),
        stuffId: change.key,
        displayName:
          (change.fields as Partial<StuffDetailRecord>).displayName ?? "",
      };
      if (idx >= 0) {
        next[idx] = replacement;
      } else {
        next.push(replacement);
      }
      continue;
    }
    // op === 'update' — field-level merge.
    if (idx >= 0 && change.fields) {
      next[idx] = {
        ...next[idx],
        ...change.fields,
      } as StuffRefRecord | StuffDetailRecord;
    }
  }
  return next;
}

/**
 * Cardinality-aware empty-body placeholder text per the
 * requirements: single → "focused — `look` to inspect"; multi →
 * "N <summary> focused — `look` to list".
 */
function placeholderText(
  result: (StuffRefRecord | StuffDetailRecord)[] | null,
  fragment: string
): string {
  if (!result || result.length === 0) {
    return fragment
      ? `${fragment || "nothing"} focused — \`look\` to inspect`
      : "nothing focused — `look` to inspect";
  }
  if (result.length === 1) {
    return "focused — `look` to inspect";
  }
  const summary = fragment || "matches";
  return `${result.length} ${summary} focused — \`look\` to list`;
}

/**
 * Pick the display name for the live-header position. For a single
 * record: the record's display name. For multi: the raw focus
 * fragment string (the MQL expression the player typed) — the
 * substrate's display-name projection is per-record, so there's no
 * single name to show.
 */
function deriveHeaderName(
  result: (StuffRefRecord | StuffDetailRecord)[] | null,
  fragment: string
): string | null {
  if (!result || result.length === 0) {
    return fragment || null;
  }
  if (result.length === 1) {
    return result[0]?.displayName ?? fragment ?? null;
  }
  return fragment || null;
}

/**
 * Resolve the click-target command for a contents/match row. Mirrors
 * the MmlRenderer's registry-then-label fallback shape (Wave 9):
 * prefer the row's `primaryKeyword` (substrate ships it in
 * `REF_FIELDS`), fall back to `displayName`.
 */
function commandForRow(row: StuffRefRecord): string {
  return `look ${row.primaryKeyword ?? row.displayName}`;
}

export function InspectionPane({
  onSendCommand,
  onCommandPreview,
}: InspectionPaneProps) {
  // Stable no-op fallback so child affordances always receive a
  // function — the preview API stays uniform whether the parent
  // wired it or not, and `EntityName` / `Button` gate on
  // `command + onPreview` together so a no-op handler with no
  // `command` still disables the mouseenter/leave hookup cleanly.
  const previewSink = onCommandPreview ?? (() => undefined);
  const paneFocusName = useStore((s) => s.paneFocusName);
  const paneFocusFragment = useStore((s) => s.paneFocusFragment);
  const paneBodyPainted = useStore((s) => s.paneBodyPainted);
  const paneLastResult = useStore((s) => s.paneLastResult);
  const paneBreadcrumbs = useStore((s) => s.paneBreadcrumbs);
  const authPlayer = useStore((s) => s.auth.player);

  // The auth slice doesn't yet carry an explicit admin marker. Read
  // defensively from the player record so the pane is forward-compatible
  // with a future `isAdmin` flag and stays hidden today.
  const isAdmin = useMemo<boolean>(() => {
    if (!authPlayer) return false;
    const candidate = (authPlayer as unknown as { isAdmin?: unknown })
      .isAdmin;
    return candidate === true;
  }, [authPlayer]);

  useEffect(() => {
    const id = websocketClient.subscribeToCanonicalKind("me.focus");

    const handleResult = (envelope: Envelope) => {
      const env = envelope as MqlSubscriptionResultEnvelope;
      if (env.subscriptionId !== id) return;
      const records = env.result as (StuffRefRecord | StuffDetailRecord)[];
      const store = useStore.getState();
      store.setPaneResult(records);
      store.setPaneFocusName(
        deriveHeaderName(records, store.paneFocusFragment)
      );
    };
    const handleDelta = (envelope: Envelope) => {
      const env = envelope as MqlSubscriptionDeltaEnvelope;
      if (env.subscriptionId !== id) return;
      const store = useStore.getState();
      const previous = store.paneLastResult ?? [];
      const patched = applyChanges(previous, env.changes);
      store.setPaneResult(patched);
      store.setPaneFocusName(
        deriveHeaderName(patched, store.paneFocusFragment)
      );
    };

    websocketClient.onEnvelope("mql-subscription-result", handleResult);
    websocketClient.onEnvelope("mql-subscription-delta", handleDelta);

    return () => {
      websocketClient.offEnvelope(
        "mql-subscription-result",
        handleResult
      );
      websocketClient.offEnvelope("mql-subscription-delta", handleDelta);
      websocketClient.unsubscribe(id);
    };
  }, []);

  // Header text: pane slice's live name when present, else derived
  // from the latest cached result + fragment.
  const headerName =
    paneFocusName ?? deriveHeaderName(paneLastResult, paneFocusFragment);

  const placeholder = placeholderText(paneLastResult, paneFocusFragment);

  const handleRefresh = () => {
    onSendCommand("look");
  };

  const handlePlaceholderClick = () => {
    onSendCommand("look");
  };

  const handleBreadcrumbClick = (fragment: string) => {
    onSendCommand(`look ${fragment}`);
  };

  const handleRowClick = (row: StuffRefRecord) => {
    onSendCommand(commandForRow(row));
  };

  const renderBody = () => {
    if (!paneBodyPainted) {
      return (
        <Button
          variant="ghost"
          aria-label="paint pane body"
          command="look"
          onPreview={previewSink}
          onClick={handlePlaceholderClick}
        >
          {placeholder}
        </Button>
      );
    }
    const result = paneLastResult ?? [];
    if (result.length === 0) {
      // Painted-but-empty edge case (look fired against a fragment
      // that resolves to nothing). Show a terse note rather than the
      // pre-look placeholder so the player sees the painted state
      // took effect.
      return <div>(no matches)</div>;
    }
    if (result.length === 1) {
      return renderSingle(
        result[0] as StuffRefRecord | StuffDetailRecord,
        onSendCommand,
        previewSink,
        handleRowClick,
        isAdmin
      );
    }
    return renderMulti(result, previewSink, handleRowClick, isAdmin);
  };

  return (
    <PaneContainer>
      {paneBreadcrumbs.length > 0 && (
        <Breadcrumbs aria-label="focus breadcrumbs">
          {paneBreadcrumbs.map((frag) => (
            <EntityName
              key={frag}
              label={frag}
              title={`Click to send: look ${frag}`}
              command={`look ${frag}`}
              onPreview={previewSink}
              onClick={() => handleBreadcrumbClick(frag)}
            />
          ))}
        </Breadcrumbs>
      )}
      <Header>
        <HeaderTitle>{headerName ?? "nothing focused"}</HeaderTitle>
        <Button
          variant="primary"
          aria-label="refresh pane"
          command="look"
          onPreview={previewSink}
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </Header>
      <Body>{renderBody()}</Body>
    </PaneContainer>
  );
}

/**
 * Single-focus body — percept projection for the focused thing.
 *
 * Renders only the prose the substrate's detail field-set ships
 * as look-revealable percepts: the long description (the body),
 * the obvious exits, and the visible contents. The header already
 * carries the short description (or the display name when the
 * focused thing has a proper Name); the body does NOT repeat it.
 * No "SHORT"/"DESCRIPTION" label headings — the implicit structure
 * (header → prose → exits → contents) tells the reader what's
 * what, and the slate's flatten-linear-labeled discipline applies
 * inside each list (exits, contents) where labels are load-bearing.
 *
 * Internal property state (slot maps, mixin lists, raw fields)
 * lives in the admin extras when the viewer is admin — never the
 * player body.
 */
function renderSingle(
  record: StuffRefRecord | StuffDetailRecord,
  onSendCommand: (text: string) => void,
  onPreview: (command: string | null) => void,
  onRowClick: (row: StuffRefRecord) => void,
  isAdmin: boolean
): React.ReactElement {
  const detail = record as StuffDetailRecord;
  const long = detail.longDescription ?? "";
  const exits = detail.exits ?? [];
  const contents = detail.contents ?? [];

  return (
    <div data-stuff-id={record.stuffId}>
      {long && (
        <BodyProse>
          <MmlRenderer
            text={long}
            onCommandClick={onSendCommand}
            onCommandPreview={onPreview}
          />
        </BodyProse>
      )}
      {exits.length > 0 && (
        <ExitsBlock>
          <SystemLabel>Obvious exits:</SystemLabel>{" "}
          {exits.map((exit, i) => (
            <React.Fragment key={exit.direction}>
              {i > 0 && ", "}
              <EntityName
                label={exit.direction}
                title={`Click to send: go ${exit.direction}`}
                command={`go ${exit.direction}`}
                onPreview={onPreview}
                onClick={() => onSendCommand(`go ${exit.direction}`)}
              />
            </React.Fragment>
          ))}
        </ExitsBlock>
      )}
      {contents.length > 0 && (
        <ContentsBlock>
          <ContentsLabel>
            <SystemLabel>Contents:</SystemLabel>
          </ContentsLabel>
          <List aria-label="contents">
            {contents.map((row) => (
              <ListItem key={row.stuffId}>
                <EntityName
                  stuffId={row.stuffId}
                  label={row.displayName}
                  title={`Click to send: ${commandForRow(row)}`}
                  command={commandForRow(row)}
                  onPreview={onPreview}
                  onClick={() => onRowClick(row)}
                />
              </ListItem>
            ))}
          </List>
        </ContentsBlock>
      )}
      {isAdmin && renderAdminExtras(record, onSendCommand, onPreview)}
    </div>
  );
}

/**
 * Multi-focus body — one row per match.
 *
 * Each row is a styled name (`<EntityName>`) carrying the row's
 * `stuff-id` for future social-graph bucket selectors. Per the
 * grouping slate the multi-cardinality focus will eventually
 * project a group via `GroupApi`; the v1 surface is shape-correct
 * (list of styled names) and ready for that wiring without
 * component changes.
 */
function renderMulti(
  records: ReadonlyArray<StuffRefRecord | StuffDetailRecord>,
  onPreview: (command: string | null) => void,
  onRowClick: (row: StuffRefRecord) => void,
  isAdmin: boolean
): React.ReactElement {
  return (
    <List aria-label="matches">
      {records.map((row) => {
        const detail = row as StuffDetailRecord;
        const tpath = (row as unknown as { templatePath?: string })
          .templatePath;
        return (
          <ListItem key={row.stuffId}>
            <EntityName
              stuffId={row.stuffId}
              label={row.displayName}
              title={`Click to send: ${commandForRow(row)}`}
              command={commandForRow(row)}
              onPreview={onPreview}
              onClick={() => onRowClick(row)}
            />
            {isAdmin && tpath && <TagSuffix>({tpath})</TagSuffix>}
            {detail.shortDescription && (
              <TagSuffix>— {detail.shortDescription}</TagSuffix>
            )}
          </ListItem>
        );
      })}
    </List>
  );
}

/**
 * Admin extras — role-gated raw state.
 *
 * This is where the property-bag-shaped content lives: template
 * path, stuff id, mixin composition, container path, and the raw
 * JSON dump. Per the inspection-pane reconciliation, raw internal
 * state belongs HERE exclusively, never in the player body.
 *
 * Rendered as a semantic `<dl>` (via `<FieldList>` / `<Field>`)
 * so screen readers announce each label/value as a definition
 * pair — the "linear-labeled flatten" the message-rendering slate
 * mandates.
 */
function renderAdminExtras(
  record: StuffRefRecord | StuffDetailRecord,
  onSendCommand: (text: string) => void,
  onPreview: (command: string | null) => void
): React.ReactElement {
  const r = record as unknown as Record<string, unknown>;
  const templatePath =
    typeof r.templatePath === "string" ? r.templatePath : undefined;
  const stuffId = record.stuffId;
  const mixins = Array.isArray(r.mixins) ? r.mixins : undefined;
  const containerPath =
    typeof r.containerPath === "string" ? r.containerPath : undefined;

  const cloneCommand = templatePath ? `clone ${templatePath}` : "clone";
  const reloadCommand = templatePath ? `reload ${templatePath}` : "reload";

  return (
    <AdminBlock aria-label="admin extras">
      <SectionHeading>Admin</SectionHeading>
      <FieldList>
        {templatePath && <Field label="Template">{templatePath}</Field>}
        <Field label="Stuff id">{stuffId}</Field>
        {mixins && mixins.length > 0 && (
          <Field label="Mixins">{mixins.join(", ")}</Field>
        )}
        {containerPath && (
          <Field label="Container">{containerPath}</Field>
        )}
      </FieldList>
      <SectionHeading>Raw</SectionHeading>
      <RawDump>{JSON.stringify(record, null, 2)}</RawDump>
      <AdminActionRow>
        <Button
          variant="action"
          command={cloneCommand}
          onPreview={onPreview}
          onClick={() => onSendCommand(cloneCommand)}
        >
          clone
        </Button>
        <Button
          variant="action"
          command={reloadCommand}
          onPreview={onPreview}
          onClick={() => onSendCommand(reloadCommand)}
        >
          reload
        </Button>
        <Button
          variant="action"
          command="eval"
          onPreview={onPreview}
          onClick={() => onSendCommand("eval")}
        >
          eval
        </Button>
      </AdminActionRow>
    </AdminBlock>
  );
}
