"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { AgentMark } from "./AgentMark";
import { AgentNotice } from "./AgentNotice";
import { CellView } from "./CellView";
import { AccessPanel } from "./AccessPanel";
import { ConnectorCard } from "./ConnectorCard";
import { ConnectorReference } from "./ConnectorReference";
import {
  CONNECT_APPARATUS,
  type ConnectAgent,
  type ConnectApparatus,
} from "@/connect/manifest";
import type { ConnectorView, ScopeView } from "@/lib/api/types";
import type { RenderableCell, TokenValues } from "./types";

/**
 * Block 1 — "Verbindung herstellen", collapsible.
 *
 * With at least one verified cell: agent picker (data-driven tiles),
 * apparatus switcher (only surfaces that have a visible cell for the
 * picked agent — one visible cell renders a quiet label instead of a
 * lone tab), and the cell's guide. With none: the agent-agnostic
 * connector card — today's surface, not a placeholder.
 *
 * The access-guarantee panel travels INSIDE this block (it collapses
 * with it, it never leaves the code) — one of the five private-guarantee
 * surfaces.
 *
 * The collapsed state is currently session-local only. The server-side
 * per-user persistence this is specified to use does not exist yet: the
 * setup guide's path (`user_account.onboarding_*`) is column-bound to
 * the wizard and carries no reusable flag — extending it is a backend
 * change outside this repo. Deliberately NOT localStorage (rejected in
 * this console); the state resets per visit until the server field
 * exists.
 */
/** Apparatus switcher — a quiet label for one surface, tabs for more. */
function ApparatusBar({
  tabs,
  apparatus,
  onSelect,
}: Readonly<{
  tabs: ConnectApparatus[];
  apparatus: ConnectApparatus | undefined;
  onSelect: (ap: ConnectApparatus) => void;
}>) {
  const t = useTranslations("connect.block1");
  const ta = useTranslations("connect.apparatus");
  if (tabs.length <= 1 && apparatus) {
    return (
      <div className="appbar solo">
        <span className="app-solo">
          <Icon name={CONNECT_APPARATUS[apparatus].icon} />
          {ta(`${apparatus}.label`)}
          <span className="app-solo-note">· {ta(`${apparatus}.note`)}</span>
        </span>
      </div>
    );
  }
  return (
    <div className="appbar" role="tablist" aria-label={t("apparatusGroup")}>
      {tabs.map((ap) => (
        <button
          key={ap}
          role="tab"
          aria-selected={apparatus === ap}
          className={`app-tab${apparatus === ap ? " on" : ""}`}
          onClick={() => onSelect(ap)}
          type="button"
        >
          <Icon name={CONNECT_APPARATUS[ap].icon} />
          {ta(`${ap}.label`)}
        </button>
      ))}
    </div>
  );
}

/** The cell shell's content: a notice agent shows its verified refusal,
 *  everyone else the apparatus bar plus the selected cell's guide. */
function CellShell({
  agent,
  tabs,
  apparatus,
  onSelect,
  cell,
  values,
}: Readonly<{
  agent: ConnectAgent;
  tabs: ConnectApparatus[];
  apparatus: ConnectApparatus | undefined;
  onSelect: (ap: ConnectApparatus) => void;
  cell: RenderableCell | undefined;
  values: TokenValues;
}>) {
  if (agent.notice) {
    return <AgentNotice notice={agent.notice} />;
  }
  return (
    <>
      <ApparatusBar tabs={tabs} apparatus={apparatus} onSelect={onSelect} />
      {cell ? <CellView cell={cell} values={values} /> : null}
    </>
  );
}

export function ConnectBlock1({
  agents,
  tabsByAgent,
  cells,
  values,
  connector,
  scopes,
}: Readonly<{
  agents: ConnectAgent[];
  tabsByAgent: Record<string, ConnectApparatus[]>;
  cells: Record<string, RenderableCell>;
  values: TokenValues;
  connector: ConnectorView;
  scopes: ScopeView[];
}>) {
  const t = useTranslations("connect.block1");
  const [collapsed, setCollapsed] = useState(false);
  const [agentId, setAgentId] = useState<string>(agents[0]?.slug ?? "");
  const agent = agents.find((a) => a.slug === agentId) ?? agents[0];
  const tabs = agent ? (tabsByAgent[agent.slug] ?? []) : [];
  const [apparatusChoice, setApparatusChoice] = useState<ConnectApparatus | null>(null);
  const apparatus = apparatusChoice && tabs.includes(apparatusChoice) ? apparatusChoice : tabs[0];
  const cell = agent && apparatus ? cells[`${agent.slug}/${apparatus}`] : undefined;
  const hasPicker = agents.length > 0;

  return (
    <div className={`cw-box${collapsed ? " is-collapsed" : ""}`}>
      <button className="cw-box-head" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed} type="button">
        <span className="cw-box-title">
          <span className="cw-box-step">1</span>
          {t("title")}
        </span>
        <span className="cw-box-toggle">
          <span className="txt">{collapsed ? t("expand") : t("collapse")}</span>
          <Icon name={collapsed ? "chevDown" : "chevUp"} />
        </span>
      </button>
      {!collapsed && (
        <div className="cw-box-body">
          {hasPicker ? (
            <>
              <div className="agent-grid" role="radiogroup" aria-label={t("agentGroup")}>
                {agents.map((a) => (
                  <button
                    key={a.slug}
                    role="radio"
                    aria-checked={a.slug === agent?.slug}
                    className={`agent-tile${a.slug === agent?.slug ? " active" : ""}`}
                    onClick={() => setAgentId(a.slug)}
                    type="button"
                  >
                    <span className="at-mark">
                      <AgentMark id={a.slug} />
                    </span>
                    <span className="at-text">
                      <span className="at-name">{a.name}</span>
                      <span className="at-vendor">{a.vendor}</span>
                    </span>
                  </button>
                ))}
              </div>

              {agent ? (
                <div className="cell-shell">
                  <CellShell
                    agent={agent}
                    tabs={tabs}
                    apparatus={apparatus}
                    onSelect={setApparatusChoice}
                    cell={cell}
                    values={values}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <ConnectorCard connector={connector} />
          )}

          <AccessPanel scopes={scopes} />
          {hasPicker ? <ConnectorReference connector={connector} /> : null}
        </div>
      )}
    </div>
  );
}
