import Link from "next/link";
import { Topbar } from "@/components/shell/Topbar";
import { Icon } from "@/components/ui/Icon";
import { TypeChip } from "@/components/ui/Chip";
import { Avatar, initialsOf } from "@/components/ui/Avatar";
import { CopyValue } from "@/components/overview/CopyValue";
import { AssistantPrompt } from "@/components/overview/AssistantPrompt";
import { GuaranteeBand } from "@/components/overview/GuaranteeBand";
import { getConnector, getOverview, listScopes, listUsers } from "@/lib/api";
import { ENTRY_TYPE_ORDER, type ScopeView } from "@/lib/api/types";
import { absTime, relTime } from "@/lib/time";
import { getTheme } from "@/lib/theme";

function MiniBar({ scope, byType }: Readonly<{ scope: ScopeView; byType: Record<string, number> }>) {
  if (scope.entryCount === 0) return <div className="mini-bar"><i className="empty" /></div>;
  return (
    <div className="mini-bar">
      {ENTRY_TYPE_ORDER.map((t) => {
        const c = byType[t] ?? 0;
        if (!c) return null;
        return (
          <i
            key={t}
            style={{ flex: c, background: `var(--type-${t})` }}
            title={`${t}: ${c}`}
          />
        );
      })}
    </div>
  );
}

export default async function OverviewPage() {
  const [overview, scopes, users, connector, theme] = await Promise.all([
    getOverview(),
    listScopes(),
    listUsers(),
    getConnector(),
    getTheme(),
  ]);

  const memberMap = new Map(users.map((u) => [u.subject, u.displayName]));
  const live = scopes.filter((s) => !s.archived);
  const invited = users.filter((u) => u.status === "invited").length;
  const admins = users.filter((u) => u.role === "admin").length;

  const weekAgo = Date.now() - 7 * 24 * 3_600_000;
  const writesWeek = overview.recent.filter((r) => new Date(r.updatedAt).getTime() >= weekAgo).length;

  return (
    <>
      <Topbar title="Overview" meta="dashboard" theme={theme} />
      <div className="page-scroll">
        <div className="page-pad">
          <div className="stat-strip">
            <div className="stat">
              <div className="s-label"><Icon name="ok" />Shared memories</div>
              <div className="s-num">{overview.entriesTotal}</div>
              <div className="s-sub"><b>+{writesWeek}</b> this week</div>
            </div>
            <div className="stat">
              <div className="s-label"><Icon name="layers" />Active scopes</div>
              <div className="s-num">
                {overview.scopesTotal}
                <span className="unit">/ {overview.scopesTotal + overview.scopesArchived}</span>
              </div>
              <div className="s-sub">1 global · {Math.max(0, overview.scopesTotal - 1)} project</div>
            </div>
            <div className="stat">
              <div className="s-label"><Icon name="users" />Members</div>
              <div className="s-num">{users.filter((u) => u.status === "active").length}</div>
              <div className="s-sub">{invited > 0 ? `${invited} invite pending` : "all enrolled"}</div>
            </div>
            <div className="stat">
              <div className="s-label"><Icon name="edit" />Last write</div>
              <div className="s-num" style={{ fontSize: 28, paddingTop: 8 }}>
                {overview.recent[0] ? relTime(overview.recent[0].updatedAt) : "—"}
              </div>
              <div className="s-sub">{overview.recent[0]?.scopeSlug ?? "no activity"}</div>
            </div>
          </div>

          <div className="connector">
            <div className="conn-main">
              <span className="eyebrow">{"// "}connector</span>
              <h3>Connect your AI client</h3>
              <p className="conn-lead">
                Paste these into the assistant&apos;s MCP configuration. The client reads and writes
                shared memory through this endpoint, authenticated as the team.
              </p>
              <div className="conn-field">
                <label>Endpoint URL</label>
                <CopyValue value={connector.mcpUrl} />
              </div>
              <div className="conn-field">
                <label>Client ID</label>
                <CopyValue value={connector.clientId} />
              </div>
              <div className="conn-field">
                <label>Client secret</label>
                {connector.clientSecretMasked ? (
                  <CopyValue value={connector.clientSecretMasked} masked />
                ) : (
                  <span className="conn-nosecret">None — public client (PKCE). Leave the secret field empty.</span>
                )}
              </div>
            </div>
            <div className="vr" />
            <div className="conn-side">
              <div className="cs-title"><Icon name="ok" />What it can reach</div>
              <p>
                Only the <b>shared</b> scopes you see here —{" "}
                <span className="mono" style={{ color: "var(--c-ink-panel-text)" }}>global</span> and
                the project scopes. Each member&apos;s <b>private</b> memory is never exposed
                through this connector.
              </p>
              <ol className="cs-steps">
                <li>Add the endpoint to your client&apos;s MCP servers.</li>
                <li>
                  {connector.clientSecretMasked
                    ? "Authenticate with the client ID and secret."
                    : "Enter the client ID; leave the secret empty (public client, PKCE)."}
                </li>
                <li>
                  The assistant reads{" "}
                  <span className="mono" style={{ color: "var(--c-ink-panel-text)" }}>global</span>{" "}
                  first, then the active project scope.
                </li>
              </ol>
            </div>
          </div>

          <AssistantPrompt />

          <div className="ov-split">
            <div>
              <div className="section-label">
                <span className="eyebrow">{"// "}recent activity · shared scopes</span>
                <span className="ln" />
                <Link className="more" href="/scopes">Open browser →</Link>
              </div>
              <div className="feed">
                {overview.recent.map((e) => (
                  <Link href={`/scopes/${e.scopeSlug}`} className="feed-item" key={e.entryId}>
                    <div className="feed-left">
                      <span className="feed-scope">
                        <Icon name={e.scopeSlug === "global" ? "globe" : "folder"} />
                        {e.scopeSlug}
                      </span>
                      <TypeChip type={e.type} />
                    </div>
                    <div className="feed-content">
                      {e.key ? <span className="fk">{e.key}</span> : null}
                    </div>
                    <div className="feed-meta">
                      <span className="t" title={absTime(e.updatedAt)}>
                        {relTime(e.updatedAt)}
                      </span>
                      <span className="who">
                        <Avatar
                          size="xs"
                          isAgent={e.source === "mcp"}
                          initials={initialsOf(memberMap.get(e.authorSubject))}
                        />
                        {e.source === "mcp"
                          ? "via assistant"
                          : memberMap.get(e.authorSubject) ?? e.authorSubject}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div className="section-label">
                <span className="eyebrow">{"// "}scopes at a glance</span>
                <span className="ln" />
              </div>
              <div className="mini">
                {live.map((s) => {
                  const byType = overview.recent
                    .filter((r) => r.scopeSlug === s.slug)
                    .reduce<Record<string, number>>((acc, r) => {
                      acc[r.type] = (acc[r.type] ?? 0) + 1;
                      return acc;
                    }, {});
                  return (
                    <Link className="mini-row" href={`/scopes/${s.slug}`} key={s.slug}>
                      <div className="mini-name">
                        <Icon name={s.kind === "global" ? "globe" : "folder"} />
                        <span className="nm">{s.slug}</span>
                        {s.fixed ? <span className="scope-flag">fixed</span> : null}
                      </div>
                      <div className="mini-count">{s.entryCount}</div>
                      <MiniBar scope={s} byType={byType} />
                    </Link>
                  );
                })}
              </div>

              <div className="section-label" style={{ marginTop: 28 }}>
                <span className="eyebrow">{"// "}team</span>
                <span className="ln" />
                <Link className="more" href="/team">Manage →</Link>
              </div>
              <div className="mem-summary">
                <div className="mem-avs">
                  {users.slice(0, 6).map((u) => (
                    <Avatar key={u.id} initials={initialsOf(u.displayName)} />
                  ))}
                </div>
                <div className="mem-txt">
                  <b>{users.length} members</b> · {admins} admins
                  {invited > 0 ? ` · ${invited} pending` : ""}
                </div>
              </div>
            </div>
          </div>

          <GuaranteeBand />
        </div>
      </div>
    </>
  );
}
