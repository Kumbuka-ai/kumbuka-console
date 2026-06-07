/* ============================================================
   kumbuka.ai · Scope browser + Memory entries
   ============================================================ */

function ScopeIcon({ scope }) {
  if (scope.kind === 'global') return <Icon name="globe" />;
  if (scope.archived) return <Icon name="archive" />;
  return <Icon name="folder" />;
}

/* ---- left pane ---- */
function ScopesPane({ scopes, activeId, onSelect, onAddScope, onScopeMenu }) {
  const projects = scopes.filter(s => s.kind === 'project' && !s.archived);
  const archived = scopes.filter(s => s.archived);
  const globalScope = scopes.find(s => s.kind === 'global');
  const item = (s) => (
    <button key={s.id} className={'scope-item' + (s.id === activeId ? ' active' : '') + (s.archived ? ' archived' : '')}
      onClick={() => onSelect(s.id)}>
      <ScopeIcon scope={s} />
      <span style={{ minWidth: 0 }}>
        <span className="scope-id">{s.id}</span>
        <span className="sub">{s.name}</span>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {s.fixed && <span className="scope-flag">fixed</span>}
        {s.syncError && <span className="scope-flag" style={{ color: 'var(--type-constraint)', borderColor: 'var(--type-constraint)' }}>sync</span>}
        <span className="scope-count">{s.entries.length}</span>
        {!s.fixed && (
          <span role="button" tabIndex="0" className="row-menu-btn" style={{ opacity: 1, width: 22, height: 22 }}
            onClick={(e) => { e.stopPropagation(); onScopeMenu(e, s); }} aria-label="Scope actions"><Icon name="dots" /></span>
        )}
      </span>
    </button>
  );
  return (
    <aside className="scopes-pane">
      <div className="pane-head">
        <span className="eyebrow">// scopes</span>
        <button className="addscope" onClick={onAddScope} aria-label="New scope" title="New scope"><Icon name="plus" /></button>
      </div>

      <div className="scope-list">
        {globalScope && item(globalScope)}
      </div>

      <div className="scope-group-label"><span>Project scopes</span><span>{projects.length}</span></div>
      <div className="scope-list">
        {projects.map(item)}
      </div>

      {/* The private-scope guarantee — persistent, never enterable */}
      <div className="private-panel" title="Private memories are owned by each user and are not accessible from this console.">
        <div className="pp-head">
          <div className="pp-lock"><Icon name="lock" /></div>
          <div>
            <div className="pp-title">Private</div>
            <div className="pp-tag">per-user · not shown here</div>
          </div>
        </div>
        <div className="pp-body">
          Every member has a <b style={{ color: 'var(--c-text-2)', fontWeight: 600 }}>private</b> memory scope. It is owned by them and is never exposed to this console — not to admins, and not through the API surface you manage.
        </div>
        <div className="pp-foot"><Icon name="shield" />guaranteed by design</div>
      </div>

      {archived.length > 0 && (
        <React.Fragment>
          <div className="scope-group-label"><span>Archived</span><span>{archived.length}</span></div>
          <div className="scope-list" style={{ paddingBottom: 24 }}>{archived.map(item)}</div>
        </React.Fragment>
      )}
    </aside>
  );
}

/* ---- sortable header cell ---- */
function Th({ id, label, sort, setSort, className, sortable = true }) {
  const active = sort.col === id;
  const click = () => { if (!sortable) return; setSort(active ? { col: id, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { col: id, dir: 'asc' }); };
  return (
    <th className={(className||'') + (sortable ? ' sortable' : '')} onClick={click} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <span className="th-in">{label}{sortable && (active ? <Icon name={sort.dir === 'asc' ? 'arrowUp' : 'arrowDown'} /> : <Icon name="sort" />)}</span>
    </th>
  );
}

/* ---- entries table (direction A) ---- */
function EntriesTable({ rows, compact, sort, setSort, onEdit, onRowMenu }) {
  return (
    <table className={'etable' + (compact ? ' compact' : '')}>
      <thead>
        <tr>
          <Th id="type" label="Type" sort={sort} setSort={setSort} className="col-type" />
          <Th id="key" label="Key" sort={sort} setSort={setSort} className="col-key" />
          <th>Content</th>
          <Th id="author" label="Author" sort={sort} setSort={setSort} className="col-author" />
          <Th id="updated" label="Updated" sort={sort} setSort={setSort} className="col-updated" />
          <th className="col-actions" aria-label="Actions"></th>
        </tr>
      </thead>
      <tbody>
        {rows.map(e => (
          <tr key={e.id} onClick={() => onEdit(e)}>
            <td className="col-type"><TypeChip type={e.type} /></td>
            <td className="col-key">{e.key ? <span className="cell-key">{e.key}</span> : <span className="cell-key empty">—</span>}</td>
            <td><div className="cell-content">{e.content}</div></td>
            <td className="col-author"><AuthorCell id={e.author} /></td>
            <td className="col-updated"><span className="cell-updated" title={fullDate(e.updated)}>{relTime(e.updated)}</span></td>
            <td className="col-actions">
              <button className="row-menu-btn" aria-label="Entry actions" onClick={(ev) => { ev.stopPropagation(); onRowMenu(ev, e); }}><Icon name="dots" /></button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---- entries cards (direction B) ---- */
function EntriesCards({ rows, onEdit, onRowMenu }) {
  return (
    <div className="ecards">
      {rows.map(e => (
        <div className="ecard" key={e.id} onClick={() => onEdit(e)}>
          <div className="ecard-top">
            <TypeChip type={e.type} />
            {e.key ? <span className="key-pill">{e.key}</span> : <span className="key-pill empty">no key</span>}
            <span className="spacer"></span>
            <span className="updated" title={fullDate(e.updated)}>{relTime(e.updated)}</span>
          </div>
          <div className="ecard-content">{e.content}</div>
          <div className="ecard-foot">
            <Avatar person={PEOPLE[e.author]} size="xs" />
            <span>{PEOPLE[e.author] ? PEOPLE[e.author].name : e.author}</span>
          </div>
          <button className="row-menu-btn" aria-label="Entry actions" onClick={(ev) => { ev.stopPropagation(); onRowMenu(ev, e); }}><Icon name="dots" /></button>
        </div>
      ))}
    </div>
  );
}

function LoadingState({ layout }) {
  return (
    <div aria-busy="true">
      {layout === 'table' && (
        <div className="skel-row" style={{ background: 'var(--c-inset)', borderBottom: '1px solid var(--c-border)' }}>
          {['','','','',''].map((_, i) => <div key={i} className="skel" style={{ height: 9, opacity: .5 }}></div>)}
        </div>
      )}
      {Array.from({ length: 7 }).map((_, i) => (
        <div className="skel-row" key={i} style={{ padding: layout === 'table' ? '14px 16px' : '20px 26px' }}>
          <div className="skel" style={{ width: '70%' }}></div>
          <div className="skel" style={{ width: '85%' }}></div>
          <div className="skel" style={{ width: '95%' }}></div>
          <div className="skel" style={{ width: '60%' }}></div>
          <div className="skel" style={{ width: '50%' }}></div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Scope browser screen
   ============================================================ */
function ScopeBrowser({ scopes, setScopes, activeId, setActiveId, layout, setLayout, density, setDensity }) {
  const toast = useToast();
  const menu = useMenu();
  const [query, setQuery] = useState('');
  const [types, setTypes] = useState(new Set());
  const [sort, setSort] = useState({ col: 'updated', dir: 'desc' });
  const [phase, setPhase] = useState('ready');
  const [retried, setRetried] = useState(new Set());
  const [editor, setEditor] = useState(null);   // {entry|null}
  const [confirm, setConfirm] = useState(null);

  const scope = scopes.find(s => s.id === activeId) || scopes[0];

  // simulate load on scope change
  useEffect(() => {
    let alive = true;
    setPhase('loading');
    const t = setTimeout(() => {
      if (!alive) return;
      if (scope.syncError && !retried.has(scope.id)) setPhase('error');
      else setPhase('ready');
    }, 360);
    return () => { alive = false; clearTimeout(t); };
  }, [activeId, retried, scope.syncError, scope.id]);

  // derive rows
  const counts = {};
  TYPE_ORDER.forEach(t => counts[t] = scope.entries.filter(e => e.type === t).length);
  let rows = scope.entries.slice();
  if (types.size) rows = rows.filter(e => types.has(e.type));
  if (query.trim()) {
    const q = query.toLowerCase();
    rows = rows.filter(e => (e.key||'').toLowerCase().includes(q) || e.content.toLowerCase().includes(q) ||
      ((PEOPLE[e.author]||{}).name||'').toLowerCase().includes(q));
  }
  rows.sort((a, b) => {
    let av, bv;
    if (sort.col === 'type') { av = a.type; bv = b.type; }
    else if (sort.col === 'key') { av = a.key || '~'; bv = b.key || '~'; }
    else if (sort.col === 'author') { av = (PEOPLE[a.author]||{}).name||''; bv = (PEOPLE[b.author]||{}).name||''; }
    else { av = a.updated; bv = b.updated; }
    const r = av < bv ? -1 : av > bv ? 1 : 0;
    return sort.dir === 'asc' ? r : -r;
  });

  const toggleType = (t) => setTypes(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });
  const mutate = (fn) => setScopes(prev => prev.map(s => s.id === scope.id ? fn(s) : s));

  const saveEntry = (data) => {
    if (data.id) {
      mutate(s => ({ ...s, entries: s.entries.map(e => e.id === data.id ? { ...data, updated: new Date('2026-06-05T11:00:00').toISOString() } : e) }));
      toast('Entry updated', { icon: 'check' });
    } else {
      const ne = { ...data, id: 'e-' + Math.random().toString(36).slice(2), author: 'u-jba', updated: new Date('2026-06-05T11:00:00').toISOString() };
      mutate(s => ({ ...s, entries: [ne, ...s.entries] }));
      toast('Entry created in ' + scope.id, { icon: 'plus' });
    }
    setEditor(null);
  };
  const deleteEntry = (e) => {
    const snapshot = scope.entries;
    mutate(s => ({ ...s, entries: s.entries.filter(x => x.id !== e.id) }));
    toast('Entry deleted', { icon: 'trash', undo: () => mutate(s => ({ ...s, entries: snapshot })) });
  };

  const rowMenu = (ev, e) => menu.open(ev, [
    { icon: 'pencil', label: 'Edit', onClick: () => setEditor({ entry: e }) },
    { icon: 'copy', label: 'Copy key', disabled: !e.key, onClick: () => { navigator.clipboard && navigator.clipboard.writeText(e.key); toast('Key copied', { icon: 'copy' }); } },
    { sep: true },
    { icon: 'trash', label: 'Delete', danger: true, onClick: () => setConfirm({
        eyebrow: 'delete entry', title: 'Delete this memory?', danger: true,
        body: 'The assistant will immediately stop recalling it. This can be undone from the toast.',
        target: e.key || e.content.slice(0, 60) + '…', confirmLabel: 'Delete', confirmIcon: 'trash',
        onConfirm: () => deleteEntry(e) }) },
  ]);

  const scopeMenu = (ev, s) => menu.open(ev, [
    { icon: 'edit', label: 'Rename', onClick: () => setEditor({ scope: s }) },
    { icon: 'link', label: 'Copy scope id', onClick: () => { navigator.clipboard && navigator.clipboard.writeText(s.id); toast('Scope id copied', { icon: 'copy' }); } },
    { sep: true },
    s.archived
      ? { icon: 'refresh', label: 'Restore', onClick: () => { setScopes(p => p.map(x => x.id === s.id ? { ...x, archived: false } : x)); toast('Scope restored', { icon: 'check' }); } }
      : { icon: 'archive', label: 'Archive', danger: true, onClick: () => setConfirm({
          eyebrow: 'archive scope', title: 'Archive ' + s.id + '?', danger: true,
          body: 'The scope and its ' + s.entries.length + ' entries become read-only. The assistant stops writing to it. You can restore it later.',
          target: s.id, confirmLabel: 'Archive', confirmIcon: 'archive',
          onConfirm: () => { setScopes(p => p.map(x => x.id === s.id ? { ...x, archived: true } : x)); toast('Scope archived', { icon: 'archive' }); } }) },
  ]);

  const addScope = () => setEditor({ scope: null, isNew: true });
  const saveScope = (data) => {
    if (editor.scope) {
      setScopes(p => p.map(s => s.id === editor.scope.id ? { ...s, name: data.name } : s));
      toast('Scope renamed', { icon: 'check' });
    } else {
      const ns = { id: data.id, name: data.name, kind: 'project', desc: 'Created just now.', entries: [], empty: true };
      setScopes(p => { const gi = p.findIndex(s => s.archived); const arr = p.slice(); arr.splice(gi < 0 ? arr.length : gi, 0, ns); return arr; });
      setActiveId(data.id);
      toast('Scope ' + data.id + ' created', { icon: 'plus' });
    }
    setEditor(null);
  };

  const retry = () => setRetried(prev => new Set(prev).add(scope.id));
  const activeFilters = types.size > 0 || query.trim().length > 0;

  return (
    <div className="scope-screen">
      <ScopesPane scopes={scopes} activeId={activeId} onSelect={setActiveId} onAddScope={addScope} onScopeMenu={scopeMenu} />

      <section className="entries-pane">
        <div className="entries-head">
          <div className="eh-top">
            <div className="eh-title">
              <h2>
                {scope.id}
                <span className={'scope-kind' + (scope.kind === 'global' ? ' global' : '')}>{scope.kind === 'global' ? 'global · fixed' : scope.archived ? 'archived' : 'project'}</span>
              </h2>
              <div className="desc">{scope.desc}</div>
            </div>
            <div className="eh-actions">
              <button className="btn primary" disabled={scope.archived} onClick={() => setEditor({ entry: null })}>
                <Icon name="plus" /><span className="txt">New entry</span>
              </button>
            </div>
          </div>
          <div className="write-note">
            <Icon name="edit" />
            {scope.kind === 'global'
              ? <span>Default write target for memories the assistant marks <b>org-wide</b>.</span>
              : scope.archived
                ? <span>Read-only — archived scopes can’t be written to.</span>
                : <span>Writable by <b>admins</b> and members assigned to this project.</span>}
          </div>
        </div>

        <div className="etoolbar">
          <div className="search">
            <Icon name="search" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search keys & content…" aria-label="Search entries" />
          </div>
          <div className="typefilters">
            {TYPE_ORDER.map(t => (
              <button key={t} className={'tf' + (types.has(t) ? ' on' : '')} style={{ '--tc': `var(--type-${t})` }}
                onClick={() => toggleType(t)} aria-pressed={types.has(t)}>
                <span className="sw"></span>{ENTRY_TYPES[t].label}<span className="cnt">{counts[t]}</span>
              </button>
            ))}
          </div>
          <div className="toolbar-right">
            <span className="result-count">{rows.length} {rows.length === 1 ? 'entry' : 'entries'}</span>
            <div className="seg" role="group" aria-label="Layout">
              <button className={layout === 'table' ? 'on' : ''} onClick={() => setLayout('table')} title="Table — dense"><Icon name="rows" /></button>
              <button className={layout === 'cards' ? 'on' : ''} onClick={() => setLayout('cards')} title="Cards — roomy"><Icon name="list" /></button>
            </div>
            {layout === 'table' && (
              <div className="seg" role="group" aria-label="Density">
                <button className={!density ? 'on' : ''} onClick={() => setDensity(false)} title="Comfortable">Comfort</button>
                <button className={density ? 'on' : ''} onClick={() => setDensity(true)} title="Compact">Compact</button>
              </div>
            )}
          </div>
        </div>

        <div className="entries-body">
          {phase === 'loading' && <LoadingState layout={layout} />}
          {phase === 'error' && (
            <div className="state err">
              <div className="state-mark"><Icon name="alert" /></div>
              <h3>Couldn’t reach this scope</h3>
              <p>The backend returned a sync error while loading <span className="mono">{scope.id}</span>. The assistant’s last-known copy may be stale.</p>
              <div className="err-code">503 · upstream_sync_failed · scope/{scope.id}</div>
              <div className="state-actions">
                <button className="btn primary" onClick={retry}><Icon name="refresh" />Retry</button>
              </div>
            </div>
          )}
          {phase === 'ready' && rows.length === 0 && !activeFilters && (
            <div className="state">
              <div className="state-mark"><Icon name="inbox" /></div>
              <h3>No memories yet</h3>
              <p>This scope is empty. Add the first decision, convention, or constraint — or let the assistant write one as the team works.</p>
              <div className="state-actions">
                <button className="btn primary" disabled={scope.archived} onClick={() => setEditor({ entry: null })}><Icon name="plus" />New entry</button>
              </div>
            </div>
          )}
          {phase === 'ready' && rows.length === 0 && activeFilters && (
            <div className="state">
              <div className="state-mark"><Icon name="search" /></div>
              <h3>Nothing matches</h3>
              <p>No entries in <span className="mono">{scope.id}</span> match your filter. Clear it to see all {scope.entries.length}.</p>
              <div className="state-actions">
                <button className="btn" onClick={() => { setTypes(new Set()); setQuery(''); }}><Icon name="x" />Clear filters</button>
              </div>
            </div>
          )}
          {phase === 'ready' && rows.length > 0 && (
            layout === 'table'
              ? <EntriesTable rows={rows} compact={density} sort={sort} setSort={setSort} onEdit={(e) => setEditor({ entry: e })} onRowMenu={rowMenu} />
              : <EntriesCards rows={rows} onEdit={(e) => setEditor({ entry: e })} onRowMenu={rowMenu} />
          )}
        </div>
      </section>

      {editor && editor.entry !== undefined && <EntryEditor entry={editor.entry} scope={scope} onClose={() => setEditor(null)} onSave={saveEntry} />}
      {editor && (editor.scope !== undefined) && editor.entry === undefined && <ScopeEditor scope={editor.scope} onClose={() => setEditor(null)} onSave={saveScope} />}
      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
      {menu.node}
    </div>
  );
}

Object.assign(window, { ScopeBrowser });
