/* ============================================================
   kumbuka.ai · app shell + routing
   ============================================================ */

const NAV = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'scopes',   label: 'Scopes',   icon: 'layers' },
  { id: 'team',     label: 'Team',     icon: 'users' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

function Rail({ route, setRoute, scopes, users, theme }) {
  const me = users.find(u => u.self) || users[0];
  const totalEntries = scopes.reduce((n, s) => n + s.entries.length, 0);
  return (
    <nav className="rail" aria-label="Primary">
      <div className="brand">
        <img className="brand-mark" src="assets/kumbuka-mark.svg" alt="" />
        <div>
          <div className="brand-name">kumbuka<span className="dot">.ai</span></div>
          <span className="brand-sub">memory console</span>
        </div>
      </div>

      <div className="nav">
        <div className="nav-label">Workspace</div>
        {NAV.map(n => (
          <button key={n.id} className={'nav-item' + (route === n.id ? ' active' : '')}
            disabled={n.soon} onClick={() => !n.soon && setRoute(n.id)} aria-current={route === n.id ? 'page' : undefined}>
            <Icon name={n.icon} className="" />
            <span className="txt">{n.label}</span>
            {n.soon ? <span className="soon">soon</span>
              : n.id === 'scopes' ? <span className="nav-count">{totalEntries}</span>
              : n.id === 'team' ? <span className="nav-count">{users.length}</span> : null}
          </button>
        ))}
      </div>

      <div className="rail-foot">
        <button className={'user-chip' + (route === 'account' ? ' active' : '')} onClick={() => setRoute('account')}
          aria-current={route === 'account' ? 'page' : undefined} title="Account settings">
          <Avatar person={me} />
          <div className="u-meta">
            <div className="u-name">{me.name.split(' ')[0]} {me.name.split(' ')[1] ? me.name.split(' ')[1][0] + '.' : ''}<span className="acct-link">(account)</span></div>
            <div className="u-role">{me.role} · signed in</div>
          </div>
          <span className="u-chev"><Icon name="chevRight" /></span>
        </button>
      </div>
    </nav>
  );
}

function ThemeToggle({ theme, setTheme }) {
  return (
    <div className="seg" role="group" aria-label="Theme">
      <button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')} title="Light" aria-pressed={theme === 'light'}><Icon name="sun" /></button>
      <button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')} title="Dark" aria-pressed={theme === 'dark'}><Icon name="moon" /></button>
    </div>
  );
}

function SoonScreen({ id }) {
  const copy = {
    overview: {
      eyebrow: 'overview', title: 'Team at a glance',
      body: 'The dashboard — scope counts, recent shared-scope activity, member totals, and the connector URL to paste into your AI client — lands in the next pass.',
      items: [
        { icon: 'layers', label: 'Scope counts & recent writes', tag: 'next' },
        { icon: 'link', label: 'Connector URL / client-id', tag: 'next' },
        { icon: 'users', label: 'Member summary', tag: 'next' },
      ],
    },
    settings: {
      eyebrow: 'settings', title: 'Console settings',
      body: 'Default write-scope policy, who may create project scopes, and the connector details for the AI client — coming in the next pass.',
      items: [
        { icon: 'edit', label: 'Default write-scope policy', tag: 'next' },
        { icon: 'folder', label: 'Who may create scopes', tag: 'next' },
        { icon: 'link', label: 'Connector details', tag: 'next' },
      ],
    },
  }[id];
  return (
    <div className="soon-screen">
      <div className="soon-card">
        <span className="eyebrow">// {copy.eyebrow}</span>
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
        <div className="roadmap">
          {copy.items.map((it, i) => (
            <div className="ri" key={i}><Icon name={it.icon} />{it.label}<span className="tag">{it.tag}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('rai-theme') || 'light');
  const [route, setRoute] = useState(() => localStorage.getItem('rai-route') || 'scopes');
  const [scopes, setScopes] = useState(() => SCOPES.map(s => ({ ...s, entries: s.entries.slice() })));
  const [users, setUsers] = useState(() => USERS.map(u => ({ ...u })));
  const [activeScope, setActiveScope] = useState('global');
  const [layout, setLayout] = useState(() => localStorage.getItem('rai-layout') || 'table');
  const [density, setDensity] = useState(() => localStorage.getItem('rai-density') === '1');

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('rai-theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('rai-route', route); }, [route]);
  useEffect(() => { localStorage.setItem('rai-layout', layout); }, [layout]);
  useEffect(() => { localStorage.setItem('rai-density', density ? '1' : '0'); }, [density]);

  const titles = {
    scopes: { h: 'Shared memory', meta: 'scope browser' },
    team: { h: 'Team & users', meta: 'directory' },
    overview: { h: 'Overview', meta: 'dashboard' },
    settings: { h: 'Settings', meta: 'configuration' },
    account: { h: 'Account', meta: 'your settings' },
  };
  const t = titles[route];

  const me = users.find(u => u.self) || users[0];
  const updateMe = (patch) => setUsers(prev => prev.map(u => u.self ? { ...u, ...patch, initials: patch.name ? patch.name.split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0].toUpperCase()).join('') : u.initials } : u));

  return (
    <div className="app">
      <Rail route={route} setRoute={setRoute} scopes={scopes} users={users} theme={theme} />
      <main className="main">
        <header className="topbar">
          <div className="crumb">
            <h1>{t.h}</h1>
            <span className="crumb-meta">// {t.meta}</span>
          </div>
          <span className="topbar-spacer"></span>
          {route === 'scopes' && <span className="result-count" style={{ marginRight: 4 }}>{scopes.filter(s => !s.archived).length} active scopes</span>}
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </header>

        {route === 'scopes' && (
          <ScopeBrowser scopes={scopes} setScopes={setScopes} activeId={activeScope} setActiveId={setActiveScope}
            layout={layout} setLayout={setLayout} density={density} setDensity={setDensity} />
        )}
        {route === 'team' && <TeamUsers users={users} setUsers={setUsers} />}
        {route === 'overview' && <Overview scopes={scopes} users={users} goScope={(id) => { setActiveScope(id); setRoute('scopes'); }} setRoute={setRoute} />}
        {route === 'settings' && <Settings scopes={scopes} />}
        {route === 'account' && <Account me={me} onUpdateMe={updateMe} theme={theme} setTheme={setTheme} />}
      </main>
    </div>
  );
}

function Root() {
  return <ToastHost><App /></ToastHost>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
