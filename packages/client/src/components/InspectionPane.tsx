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
 * - Single record → detail view (header name + long description via
 *   `MmlRenderer` + clickable contents list).
 * - Multi record → list view, one row per match.
 *
 * Admin extras (template path / stuff id / mixin composition / raw
 * data dump / quick-action buttons for `clone` / `reload` / `eval`)
 * render only when the local viewer is admin — derived from the
 * client store. Today the auth slice carries no admin marker; the
 * pane reads `useStore.getState().auth.player?.isAdmin` defensively
 * (returns `undefined` → hidden). When a real auth-side admin
 * marker lands, no UI change is required.
 */

import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import type {
  Envelope,
  MqlSubscriptionDeltaEnvelope,
  MqlSubscriptionResultEnvelope,
  StuffDetailRecord,
  StuffRefRecord,
} from '@saxonberg/types';
import { useStore } from '../store/index';
import { websocketClient } from '../services/websocket';
import { MmlRenderer } from './MmlRenderer';

const PaneContainer = styled.aside`
  display: flex;
  flex-direction: column;
  width: 360px;
  min-width: 360px;
  max-width: 360px;
  height: 100%;
  background: #252526;
  color: #d4d4d4;
  border-left: 1px solid #444;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  overflow: hidden;
`;

const Breadcrumbs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #333;
  background: #1f1f1f;
  font-size: 12px;
  color: #888;
`;

const BreadcrumbLink = styled.button`
  background: none;
  border: none;
  color: #4ec9b0;
  cursor: pointer;
  padding: 0;
  font: inherit;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 2px;

  &:hover {
    color: #7fdfc8;
    text-decoration-style: solid;
  }
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #333;
  background: #2d2d30;
`;

const HeaderTitle = styled.div`
  font-weight: 700;
  color: #d7ba7d;
  font-size: 14px;
  word-break: break-word;
`;

const RefreshButton = styled.button`
  background: #007acc;
  color: white;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.6rem;
  font-family: inherit;
  font-size: 12px;

  &:hover {
    background: #005a9e;
  }

  &:active {
    background: #004578;
  }
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  white-space: pre-wrap;
  line-height: 1.5;
`;

const Placeholder = styled.button`
  background: none;
  border: 1px dashed #555;
  color: #888;
  padding: 0.75rem;
  text-align: center;
  width: 100%;
  cursor: pointer;
  font: inherit;
  border-radius: 4px;

  &:hover {
    background: #2a2a2c;
    color: #d4d4d4;
    border-color: #777;
  }
`;

const SectionTitle = styled.div`
  color: #569cd6;
  margin-top: 0.75rem;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 11px;
`;

const ContentsList = styled.ul`
  margin: 0;
  padding-left: 1.25rem;
  list-style: none;
`;

const ContentsRow = styled.li`
  margin: 0.15rem 0;
`;

const ItemAffordance = styled.button`
  background: none;
  border: none;
  color: #4ec9b0;
  cursor: pointer;
  padding: 0;
  font: inherit;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 2px;

  &:hover {
    color: #7fdfc8;
    text-decoration-style: solid;
  }
`;

const AdminBlock = styled.section`
  margin-top: 1rem;
  padding-top: 0.5rem;
  border-top: 1px dashed #444;
  color: #888;
  font-size: 11px;
`;

const AdminRow = styled.div`
  margin: 0.15rem 0;
  word-break: break-all;
`;

const AdminButtonRow = styled.div`
  display: flex;
  gap: 0.4rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
`;

const AdminButton = styled.button`
  background: #3c3c3c;
  color: #d4d4d4;
  border: 1px solid #555;
  cursor: pointer;
  padding: 0.25rem 0.6rem;
  font: inherit;
  font-size: 11px;

  &:hover {
    background: #4a4a4a;
  }
`;

const RawDump = styled.pre`
  background: #1e1e1e;
  border: 1px solid #333;
  padding: 0.5rem;
  margin: 0.25rem 0;
  font-size: 11px;
  max-height: 200px;
  overflow: auto;
  white-space: pre;
`;

export interface InspectionPaneProps {
  /**
   * Outbound command sink. Routes through the same path
   * `CommandBar.onSend` does, so breadcrumb clicks, the Refresh
   * button, contents-row clicks, and admin extras all ride the
   * command bus uniformly. Wired by `App.tsx` to its `sendCommand`.
   */
  onSendCommand: (text: string) => void;
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
    op: 'replace' | 'update' | 'add' | 'remove';
    key: string;
    fields?: Partial<StuffRefRecord | StuffDetailRecord>;
  }>
): (StuffRefRecord | StuffDetailRecord)[] {
  const next = previous.slice();
  for (const change of changes) {
    const idx = next.findIndex((r) => r.stuffId === change.key);
    if (change.op === 'remove') {
      if (idx >= 0) next.splice(idx, 1);
      continue;
    }
    if (change.op === 'add') {
      if (change.fields) {
        next.push({
          ...(change.fields as StuffDetailRecord),
          stuffId: change.key,
          displayName:
            (change.fields as Partial<StuffDetailRecord>).displayName ?? '',
        });
      }
      continue;
    }
    if (change.op === 'replace') {
      const replacement = {
        ...(change.fields as StuffDetailRecord),
        stuffId: change.key,
        displayName:
          (change.fields as Partial<StuffDetailRecord>).displayName ?? '',
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
      ? `${fragment || 'nothing'} focused — \`look\` to inspect`
      : 'nothing focused — `look` to inspect';
  }
  if (result.length === 1) {
    return 'focused — `look` to inspect';
  }
  const summary = fragment || 'matches';
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
 * Resolve the click-target command for a contents row. Mirrors the
 * MmlRenderer's registry-then-label fallback shape (Wave 9) for the
 * pre-Wave-9 path: prefer the row's `primaryKeyword` (substrate
 * shipped it as part of `REF_FIELDS`), fall back to `displayName`.
 */
function commandForRow(row: StuffRefRecord): string {
  return `look ${row.primaryKeyword ?? row.displayName}`;
}

export function InspectionPane({ onSendCommand }: InspectionPaneProps) {
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
    const id = websocketClient.subscribeToCanonicalKind('me.focus');

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

    websocketClient.onEnvelope('mql-subscription-result', handleResult);
    websocketClient.onEnvelope('mql-subscription-delta', handleDelta);

    return () => {
      websocketClient.offEnvelope(
        'mql-subscription-result',
        handleResult
      );
      websocketClient.offEnvelope('mql-subscription-delta', handleDelta);
      websocketClient.unsubscribe(id);
    };
  }, []);

  // Header text: pane slice's live name when present, else derived
  // from the latest cached result + fragment.
  const headerName =
    paneFocusName ?? deriveHeaderName(paneLastResult, paneFocusFragment);

  const placeholder = placeholderText(paneLastResult, paneFocusFragment);

  const handleRefresh = () => {
    onSendCommand('look');
  };

  const handlePlaceholderClick = () => {
    onSendCommand('look');
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
        <Placeholder
          aria-label="paint pane body"
          onClick={handlePlaceholderClick}
        >
          {placeholder}
        </Placeholder>
      );
    }
    const result = paneLastResult ?? [];
    if (result.length === 0) {
      // Painted-but-empty: edge case (look fired against a fragment
      // that resolves to nothing). Show a terse note rather than the
      // pre-look placeholder so the player sees the painted state
      // took effect.
      return <div>(no matches)</div>;
    }
    if (result.length === 1) {
      return renderSingle(
        result[0] as StuffRefRecord | StuffDetailRecord,
        onSendCommand,
        handleRowClick,
        isAdmin
      );
    }
    return renderMulti(result, handleRowClick, isAdmin);
  };

  return (
    <PaneContainer>
      {paneBreadcrumbs.length > 0 && (
        <Breadcrumbs aria-label="focus breadcrumbs">
          {paneBreadcrumbs.map((frag) => (
            <BreadcrumbLink
              key={frag}
              onClick={() => handleBreadcrumbClick(frag)}
              title={`Click to send: look ${frag}`}
            >
              {frag}
            </BreadcrumbLink>
          ))}
        </Breadcrumbs>
      )}
      <Header>
        <HeaderTitle>{headerName ?? 'nothing focused'}</HeaderTitle>
        <RefreshButton onClick={handleRefresh} aria-label="refresh pane">
          Refresh
        </RefreshButton>
      </Header>
      <Body>{renderBody()}</Body>
    </PaneContainer>
  );
}

/**
 * Single-focus body — header name (already in the pane header) + long
 * description via `MmlRenderer` + clickable contents list. Hover
 * preview routes through the same `onCommandPreview` channel `App.tsx`
 * wires for the terminal renderer; here we route clicks directly
 * through the `onSendCommand` sink and ignore the hover preview
 * (the pane has no input field to mirror into). A future revision
 * could surface hover previews in the terminal's command bar.
 */
function renderSingle(
  record: StuffRefRecord | StuffDetailRecord,
  onSendCommand: (text: string) => void,
  onRowClick: (row: StuffRefRecord) => void,
  isAdmin: boolean
): React.ReactElement {
  const detail = record as StuffDetailRecord;
  const long = detail.longDescription ?? '';
  const short = detail.shortDescription ?? '';
  const contents = detail.contents ?? [];

  return (
    <div>
      <div>{record.displayName}</div>
      {short && (
        <>
          <SectionTitle>Short</SectionTitle>
          <div>
            <MmlRenderer
              text={short}
              onCommandClick={onSendCommand}
              onCommandPreview={() => undefined}
            />
          </div>
        </>
      )}
      {long && (
        <>
          <SectionTitle>Description</SectionTitle>
          <div>
            <MmlRenderer
              text={long}
              onCommandClick={onSendCommand}
              onCommandPreview={() => undefined}
            />
          </div>
        </>
      )}
      {contents.length > 0 && (
        <>
          <SectionTitle>Contents</SectionTitle>
          <ContentsList aria-label="contents">
            {contents.map((row) => (
              <ContentsRow key={row.stuffId}>
                <ItemAffordance
                  onClick={() => onRowClick(row)}
                  title={`Click to send: ${commandForRow(row)}`}
                >
                  {row.displayName}
                </ItemAffordance>
              </ContentsRow>
            ))}
          </ContentsList>
        </>
      )}
      {isAdmin && renderAdminExtras(record, onSendCommand)}
    </div>
  );
}

/**
 * Multi-focus body — one row per match. Each row sends `look <X>`
 * where `X` is the row's primary keyword (registry-fed via the
 * subscription substrate) or display-name fallback.
 */
function renderMulti(
  records: ReadonlyArray<StuffRefRecord | StuffDetailRecord>,
  onRowClick: (row: StuffRefRecord) => void,
  isAdmin: boolean
): React.ReactElement {
  return (
    <ContentsList aria-label="matches">
      {records.map((row) => {
        const detail = row as StuffDetailRecord;
        const tpath = (
          row as unknown as { templatePath?: string }
        ).templatePath;
        return (
          <ContentsRow key={row.stuffId}>
            <ItemAffordance
              onClick={() => onRowClick(row)}
              title={`Click to send: ${commandForRow(row)}`}
            >
              {row.displayName}
            </ItemAffordance>
            {isAdmin && tpath && (
              <span style={{ color: '#888', marginLeft: '0.5em' }}>
                ({tpath})
              </span>
            )}
            {detail.shortDescription && (
              <span style={{ color: '#888', marginLeft: '0.5em' }}>
                — {detail.shortDescription}
              </span>
            )}
          </ContentsRow>
        );
      })}
    </ContentsList>
  );
}

/**
 * Admin extras — visible only when the viewer is admin. Renders
 * template path, stuff id, mixin composition (when the projection
 * carries it), container path (ditto), raw data dump as
 * pretty-printed JSON, and quick-action buttons that route ordinary
 * admin verbs through the command bus.
 */
function renderAdminExtras(
  record: StuffRefRecord | StuffDetailRecord,
  onSendCommand: (text: string) => void
): React.ReactElement {
  const r = record as unknown as Record<string, unknown>;
  const templatePath =
    typeof r.templatePath === 'string' ? r.templatePath : undefined;
  const stuffId = record.stuffId;
  const mixins = Array.isArray(r.mixins) ? r.mixins : undefined;
  const containerPath =
    typeof r.containerPath === 'string' ? r.containerPath : undefined;

  return (
    <AdminBlock aria-label="admin extras">
      <SectionTitle>Admin</SectionTitle>
      {templatePath && <AdminRow>template: {templatePath}</AdminRow>}
      <AdminRow>stuff id: {stuffId}</AdminRow>
      {mixins && mixins.length > 0 && (
        <AdminRow>mixins: {mixins.join(', ')}</AdminRow>
      )}
      {containerPath && <AdminRow>container: {containerPath}</AdminRow>}
      <SectionTitle>Raw</SectionTitle>
      <RawDump>{JSON.stringify(record, null, 2)}</RawDump>
      <AdminButtonRow>
        <AdminButton
          onClick={() =>
            onSendCommand(
              templatePath ? `clone ${templatePath}` : 'clone'
            )
          }
        >
          clone
        </AdminButton>
        <AdminButton
          onClick={() =>
            onSendCommand(
              templatePath ? `reload ${templatePath}` : 'reload'
            )
          }
        >
          reload
        </AdminButton>
        <AdminButton onClick={() => onSendCommand('eval')}>eval</AdminButton>
      </AdminButtonRow>
    </AdminBlock>
  );
}
