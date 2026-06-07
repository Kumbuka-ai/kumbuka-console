/* ============================================================
   kumbuka.ai · Overview / dashboard
   ============================================================ */

function CopyVal({ value, masked, ink }) {
  const toast = useToast();
  const copy = () => { navigator.clipboard && navigator.clipboard.writeText(value); toast('Copied to clipboard', { icon: 'copy' }); };
  return (
    <div className="row">
      <span className={'val' + (masked ? ' mask' : '')}>{value}</span>
      <button className="conn-copy" onClick={copy} aria-label="Copy"><Icon name="copy" /></button>
    </div>
  );
}

function Overview({ scopes, users, goScope, setRoute }) {
  const live = scopes.filter(s => !s.archived);
  const totalMem = live.reduce((n, s) => n + s.entries.length, 0);
  const activeMembers = users.filter(u => u.status === 'active').length;
  const invited = users.filter(u => u.status === 'invited').length;

  // recent activity across shared scopes
  const recent = [];
  live.forEach(s => s.entries.forEach(e => recent.push({ ...e, scopeId: s.id, scopeKind: s.kind })));
  recent.sort((a, b) => a.updated < b.updated ? 1 : -1);
  const weekAgo = new Date('2026-06-05T11:00:00'); weekAgo.setDate(weekAgo.getDate() - 7);
  const writesWeek = recent.filter(e => new Date(e.updated) >= weekAgo).length;
  const feed = recent.slice(0, 7);

  const typeDist = (s) => {
    const total = s.entries.length;
    if (!total) return <i className="empty"></i>;
    return TYPE_ORDER.map(t => {
      const c = s.entries.filter(e => e.type === t).length;
      if (!c) return null;
      return <i key={t} style={{ flex: c, background: `var(--type-${t})` }} title={`${ENTRY_TYPES[t].label}: ${c}`}></i>;
    });
  };

  return (
    <div className="page-scroll">
      <div className="page-pad">

        {/* stat strip */}
        <div className="stat-strip">
          <div className="stat">
            <div className="s-label"><Icon name="circleDot" />Shared memories</div>
            <div className="s-num">{totalMem}</div>
            <div className="s-sub"><b>+{writesWeek}</b> this week</div>
          </div>
          <div className="stat">
            <div className="s-label"><Icon name="layers" />Active scopes</div>
            <div className="s-num">{live.length}<span className="unit">/ {scopes.length}</span></div>
            <div className="s-sub">1 global · {live.length - 1} project</div>
          </div>
          <div className="stat">
            <div className="s-label"><Icon name="users" />Members</div>
            <div className="s-num">{activeMembers}</div>
            <div className="s-sub">{invited > 0 ? `${invited} invite pending` : 'all enrolled'}</div>
          </div>
          <div className="stat">
            <div className="s-label"><Icon name="edit" />Last write</div>
            <div className="s-num" style={{ fontSize: 28, paddingTop: 8 }}>{feed.length ? relTime(feed[0].updated) : '—'}</div>
            <div className="s-sub">{feed.length ? `${feed[0].scopeId}` : 'no activity'}</div>
          </div>
        </div>

        {/* connector */}
        <div className="connector">
          <div className="conn-main">
            <span className="eyebrow">// connector</span>
            <h3>Connect your AI client</h3>
            <p className="conn-lead">Paste these into the assistant’s MCP configuration. The client reads and writes shared memory through this endpoint, authenticated as the team.</p>
            <div className="conn-field">
              <label>Endpoint URL</label>
              <CopyVal value={CONNECTOR_URL} ink />
            </div>
            <div className="conn-field">
              <label>Client ID</label>
              <CopyVal value={CLIENT_ID} ink />
            </div>
            <div className="conn-field">
              <label>Client secret</label>
              <CopyVal value={CLIENT_SECRET} masked ink />
            </div>
          </div>
          <div className="vr"></div>
          <div className="conn-side">
            <div className="cs-title"><Icon name="shield" />What it can reach</div>
            <p>Only the <b>shared</b> scopes you see here — <span className="mono" style={{ color: 'var(--c-ink-panel-text)' }}>global</span> and the project scopes. Each member’s <b>private</b> memory is never exposed through this connector.</p>
            <ol className="cs-steps">
              <li>Add the endpoint to your client’s MCP servers.</li>
              <li>Authenticate with the client ID and secret.</li>
              <li>The assistant reads <span className="mono" style={{ color: 'var(--c-ink-panel-text)' }}>global</span> first, then the active project scope.</li>
            </ol>
          </div>
        </div>

        {/* split: activity + scopes/members */}
        <div className="ov-split">
          <div>
            <div className="section-label">
              <span className="eyebrow">// recent activity · shared scopes</span>
              <span className="ln"></span>
              <button className="more" onClick={() => setRoute('scopes')}>Open browser →</button>
            </div>
            <div className="feed">
              {feed.map(e => (
                <div className="feed-item" key={e.id} onClick={() => goScope(e.scopeId)}>
                  <div className="feed-left">
                    <span className="feed-scope"><Icon name={e.scopeKind === 'global' ? 'globe' : 'folder'} />{e.scopeId}</span>
                    <TypeChip type={e.type} />
                  </div>
                  <div className="feed-content">
                    {e.key && <span className="fk">{e.key}</span>}{e.content}
                  </div>
                  <div className="feed-meta">
                    <span className="t" title={fullDate(e.updated)}>{relTime(e.updated)}</span>
                    <span className="who"><Avatar person={PEOPLE[e.author]} size="xs" />{(PEOPLE[e.author]||{}).name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="section-label">
              <span className="eyebrow">// scopes at a glance</span>
              <span className="ln"></span>
            </div>
            <div className="mini">
              {live.map(s => (
                <div className="mini-row" key={s.id} onClick={() => goScope(s.id)}>
                  <div className="mini-name"><Icon name={s.kind === 'global' ? 'globe' : 'folder'} /><span className="nm">{s.id}</span>{s.fixed && <span className="scope-flag">fixed</span>}</div>
                  <div className="mini-count">{s.entries.length}</div>
                  <div className="mini-bar">{typeDist(s)}</div>
                </div>
              ))}
            </div>

            <div className="section-label" style={{ marginTop: 28 }}>
              <span className="eyebrow">// team</span>
              <span className="ln"></span>
              <button className="more" onClick={() => setRoute('team')}>Manage →</button>
            </div>
            <div className="mem-summary">
              <div className="mem-avs">
                {users.slice(0, 6).map(u => <Avatar key={u.id} person={u} />)}
              </div>
              <div className="mem-txt"><b>{users.length} members</b> · {users.filter(u => u.role === 'admin').length} admins{invited > 0 ? ` · ${invited} pending` : ''}</div>
            </div>
          </div>
        </div>

        {/* private guarantee band */}
        <div className="guarantee-band">
          <div className="gb-lock"><Icon name="lock" /></div>
          <div>
            <h4>Private memory stays private</h4>
            <p>Every member has a private scope the assistant uses for them alone. It is owned by the member and is never surfaced on this dashboard, in the scope browser, or through the connector above.</p>
          </div>
          <span className="gb-tag"><Icon name="shield" />guaranteed by design</span>
        </div>

      </div>
    </div>
  );
}

Object.assign(window, { Overview });
