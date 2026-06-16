import type { ReactNode } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/shell/Topbar";
import { Icon } from "@/components/ui/Icon";
import { TypeChip } from "@/components/ui/Chip";
import { Avatar, initialsOf } from "@/components/ui/Avatar";
import { CopyValue } from "@/components/overview/CopyValue";
import { AssistantPrompt } from "@/components/overview/AssistantPrompt";
import { GuaranteeBand } from "@/components/overview/GuaranteeBand";
import { getConnector, getOverview, listScopes, listUsers, listDirectory } from "@/lib/api";
import { ENTRY_TYPE_ORDER, type ScopeView } from "@/lib/api/types";
import { absTime, relTime } from "@/lib/time";
import { getTheme } from "@/lib/theme";

// Rich-text tag renderers for next-intl's t.rich. Defined at module scope (not
// inside the page component) so they aren't treated as components-defined-in-render.
const richB = (chunks: ReactNode) => <b>{chunks}</b>;
const richMono = (chunks: ReactNode) => (
  <span className="mono" style={{ color: "var(--c-ink-panel-text)" }}>{chunks}</span>
);

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
  const [overview, scopes, directory, roster, connector, theme] = await Promise.all([
    getOverview(),
    listScopes(),
    listDirectory(),                 // member-safe: names + count + avatars
    listUsers().catch(() => null),   // roster (role/status) is admin-only → null for members (403)
    getConnector(),
    getTheme(),
  ]);

  // Author/avatar resolution comes from the member-safe directory; the
  // role/status breakdown comes from the admin-only roster (null for members,
  // so those stats degrade gracefully rather than 403-ing the page).
  const memberMap = new Map(directory.map((u) => [u.subject, u.displayName ?? u.subject]));
  const memberCount = directory.length;
  const live = scopes.filter((s) => !s.archived);
  const invited = roster ? roster.filter((u) => u.status === "invited").length : 0;
  const admins = roster ? roster.filter((u) => u.role === "admin").length : 0;
  const activeCount = roster ? roster.filter((u) => u.status === "active").length : memberCount;

  const weekAgo = Date.now() - 7 * 24 * 3_600_000;
  const writesWeek = overview.recent.filter((r) => new Date(r.updatedAt).getTime() >= weekAgo).length;

  const t = await getTranslations("header");
  const to = await getTranslations("overview");

  return (
    <>
      <Topbar title={t("overview_title")} meta={t("overview_meta")} theme={theme} />
      <div className="page-scroll">
        <div className="page-pad">
          <div className="stat-strip">
            <div className="stat">
              <div className="s-label"><Icon name="ok" />{to("stat.shared")}</div>
              <div className="s-num">{overview.entriesTotal}</div>
              <div className="s-sub">{to.rich("stat.sharedSub", { count: writesWeek, b: richB })}</div>
            </div>
            <div className="stat">
              <div className="s-label"><Icon name="layers" />{to("stat.scopes")}</div>
              <div className="s-num">
                {overview.scopesTotal}
                <span className="unit">/ {overview.scopesTotal + overview.scopesArchived}</span>
              </div>
              <div className="s-sub">{to("stat.scopesSub", { count: Math.max(0, overview.scopesTotal - 1) })}</div>
            </div>
            <div className="stat">
              <div className="s-label"><Icon name="users" />{to("stat.members")}</div>
              <div className="s-num">{activeCount}</div>
              <div className="s-sub">{invited > 0 ? to("stat.membersInvited", { count: invited }) : to("stat.membersAllEnrolled")}</div>
            </div>
            <div className="stat">
              <div className="s-label"><Icon name="edit" />{to("stat.lastWrite")}</div>
              <div className="s-num" style={{ fontSize: 28, paddingTop: 8 }}>
                {overview.recent[0] ? relTime(overview.recent[0].updatedAt) : "—"}
              </div>
              <div className="s-sub">{overview.recent[0]?.scopeSlug ?? to("stat.noActivity")}</div>
            </div>
          </div>

          <div className="connector">
            <div className="conn-main">
              <span className="eyebrow">{"// "}{to("connector.eyebrow")}</span>
              <h3>{to("connector.title")}</h3>
              <p className="conn-lead">{to("connector.lead")}</p>
              <div className="conn-field">
                <label>{to("connector.endpoint")}</label>
                <CopyValue value={connector.mcpUrl} />
              </div>
              <div className="conn-field">
                <label>{to("connector.clientId")}</label>
                <CopyValue value={connector.clientId} />
              </div>
              <div className="conn-field">
                <label>{to("connector.clientSecret")}</label>
                {connector.clientSecretMasked ? (
                  <CopyValue value={connector.clientSecretMasked} masked />
                ) : (
                  <span className="conn-nosecret">{to("connector.noSecret")}</span>
                )}
              </div>
            </div>
            <div className="vr" />
            <div className="conn-side">
              <div className="cs-title"><Icon name="ok" />{to("connector.reachTitle")}</div>
              <p>{to.rich("connector.reachBody", { b: richB, code: richMono })}</p>
              <ol className="cs-steps">
                <li>{to("connector.step1")}</li>
                <li>
                  {connector.clientSecretMasked
                    ? to("connector.step2Secret")
                    : to("connector.step2Public")}
                </li>
                <li>{to.rich("connector.step3", { code: richMono })}</li>
              </ol>
            </div>
          </div>

          <AssistantPrompt />

          <div className="ov-split">
            <div>
              <div className="section-label">
                <span className="eyebrow">{"// "}{to("recent.eyebrow")}</span>
                <span className="ln" />
                <Link className="more" href="/scopes">{to("recent.open")}</Link>
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
                          ? to("recent.viaAssistant")
                          : memberMap.get(e.authorSubject) ?? e.authorSubject}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div className="section-label">
                <span className="eyebrow">{"// "}{to("glance.eyebrow")}</span>
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
                        {s.fixed ? <span className="scope-flag">{to("glance.fixed")}</span> : null}
                      </div>
                      <div className="mini-count">{s.entryCount}</div>
                      <MiniBar scope={s} byType={byType} />
                    </Link>
                  );
                })}
              </div>

              <div className="section-label" style={{ marginTop: 28 }}>
                <span className="eyebrow">{"// "}{to("teamSection.eyebrow")}</span>
                <span className="ln" />
                <Link className="more" href="/team">{to("teamSection.manage")}</Link>
              </div>
              <div className="mem-summary">
                <div className="mem-avs">
                  {directory.slice(0, 6).map((u) => (
                    <Avatar key={u.subject} initials={initialsOf(u.displayName ?? u.subject)} />
                  ))}
                </div>
                <div className="mem-txt">
                  {to.rich("teamSection.summary", { count: memberCount, admins, b: richB })}
                  {invited > 0 ? to("teamSection.pendingSuffix", { count: invited }) : ""}
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
