/**
 * StudioPanel — the composition surface: the "compose a new class" assembly
 * (P4) plus the existing class picker / describe form (P1–P3).
 *
 * Left column: the {@link WarningBanner} (non-wizard publish warning), the
 * {@link MixinPalette} (compose + scaffold a NEW backing class), and the
 * {@link ClassPicker} (browse the blueprint catalogue → describe an existing
 * class). Right column: the active scaffold's source editor + commit + the
 * class-then-template ordering follow-on when a scaffold is active; otherwise
 * the {@link StudioForm} inspecting a described class.
 *
 * The panel owns ZERO authorization semantics. Scaffolding is inert text
 * (author-tier, open to all); the commit is re-gated server-side and returns a
 * `disposition` (`committed`/`denied`) surfaced inline — never a bare boolean.
 * The follow-on template step is blocked client-side until a commit returns
 * `reloaded:true` (the ordering rule; the server enforces the trust gate).
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../../../store/index";
import { MonacoLazy } from "../MonacoLazy";
import { WarningBanner } from "./WarningBanner";
import { MixinPalette } from "./MixinPalette";
import { ClassPicker } from "./ClassPicker";
import { StudioForm } from "./StudioForm";
import { tokens } from "../../ui";

const Screen = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
`;

const BannerRow = styled.div`
  padding: ${tokens.space.sm} ${tokens.space.md};
`;

const Columns = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
`;

const LeftColumn = styled.div`
  flex: none;
  width: 340px;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid ${tokens.color.borderMuted};
  overflow: auto;
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
`;

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

const Button = styled.button`
  background: ${tokens.color.primary};
  border: none;
  border-radius: ${tokens.radius.md};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  padding: ${tokens.space.xs} ${tokens.space.lg};
  cursor: pointer;

  &:disabled {
    background: ${tokens.color.actionBg};
    color: ${tokens.color.fgMuted};
    cursor: default;
  }
`;

const GhostButton = styled(Button)`
  background: transparent;
  border: 1px solid ${tokens.color.border};
  color: ${tokens.color.fgMuted};

  &:hover:not(:disabled) {
    color: ${tokens.color.fg};
    border-color: ${tokens.color.primary};
  }
`;

const Disposition = styled.div<{ $denied: boolean }>`
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

const ScaffoldEditor: React.FC = () => {
  const source = useStore((s) => s.studio.scaffoldSource);
  const target = useStore((s) => s.studio.scaffoldTarget);
  const draftPath = useStore((s) => s.studio.scaffoldDraftPath);
  const disposition = useStore((s) => s.studio.commitDisposition);
  const reloaded = useStore((s) => s.studio.commitReloaded);
  const message = useStore((s) => s.studio.commitMessage);
  const busy = useStore((s) => s.studio.busy);
  const csrf = useStore((s) => s.cms.csrf);
  const isWizard = useStore((s) => s.auth.isWizard === true);
  const setScaffoldSource = useStore((s) => s.studioSetScaffoldSource);
  const commit = useStore((s) => s.studioCommit);
  const reset = useStore((s) => s.studioResetScaffold);

  if (source === null || target === null) return null;

  const denied = disposition === "denied";

  return (
    <>
      <Toolbar>
        <PathLabel title={`source:${target}`}>source:{target}</PathLabel>
        <Spacer />
        <GhostButton
          type="button"
          title="Discard this scaffold"
          onClick={() => reset()}
        >
          Discard
        </GhostButton>
        <Button
          type="button"
          disabled={busy || !csrf}
          title={
            isWizard
              ? `Commit ${target} (publish the class to source)`
              : "Save — a non-wizard commit will be declined (server-gated)"
          }
          onClick={() => csrf && void commit(csrf)}
        >
          {busy ? "Committing…" : "Save (commit)"}
        </Button>
      </Toolbar>

      {disposition && (
        <Disposition $denied={denied} role="status">
          {denied
            ? `Denied: ${message ?? "only a wizard can publish a class"}`
            : reloaded
              ? `Committed and live${message ? ` · ${message}` : ""}. You can now reference ${target.replace(/\.ts$/, "")} in a template.`
              : `Committed but NOT live${message ? ` · ${message}` : ""}. Fix the source and re-commit before referencing it in a template.`}
        </Disposition>
      )}

      {!isWizard && draftPath && (
        <Disposition $denied={false} role="status">
          Draft path (not yet persisted): {draftPath}
        </Disposition>
      )}

      <EditorBody>
        <MonacoLazy
          language="typescript"
          value={source}
          onChange={setScaffoldSource}
        />
      </EditorBody>

      <Toolbar>
        <Spacer />
        <GhostButton
          type="button"
          disabled={!reloaded}
          title={
            reloaded
              ? "Class is live — open the content explorer to create a template referencing it"
              : "Blocked until the class commits AND reloads (class-then-template ordering)"
          }
          onClick={() => {
            /* Ordering gate only: template creation lives in the content
               explorer (Files mode); enabled once the class is live. */
          }}
        >
          Reference in a template →
        </GhostButton>
      </Toolbar>
    </>
  );
};

export const StudioPanel: React.FC = () => {
  const description = useStore((s) => s.studio.description);
  const scaffoldSource = useStore((s) => s.studio.scaffoldSource);

  return (
    <Screen>
      <BannerRow>
        <WarningBanner />
      </BannerRow>
      <Columns>
        <LeftColumn>
          <MixinPalette />
          <ClassPicker />
        </LeftColumn>
        <RightColumn>
          {scaffoldSource !== null ? (
            <ScaffoldEditor />
          ) : description ? (
            <StudioForm />
          ) : (
            <Empty>
              Compose a new class on the left, or pick an existing blueprint to
              inspect its authorable fields.
            </Empty>
          )}
        </RightColumn>
      </Columns>
    </Screen>
  );
};
