/* ============================================================
   kumbuka.ai · Settings
   ============================================================ */

function RadioOpt({ on, onClick, title, tag, tagAccent, desc }) {
  return (
    <div className={'radio-opt' + (on ? ' on' : '')} role="radio" aria-checked={on} tabIndex="0"
      onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}>
      <span className="radio-dot"></span>
      <div>
        <div className="ro-title">{title}{tag && <span className={'tag' + (tagAccent ? ' accent' : '')}>{tag}</span>}</div>
        <div className="ro-desc">{desc}</div>
      </div>
    </div>
  );
}

function Settings({ scopes }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(null);
  const projectScopes = scopes.filter(s => s.kind === 'project' && !s.archived);

  const INITIAL = { writePolicy: 'ask', defaultScope: 'global', createScopes: 'admins', secret: 'sk_live_9d2f••••••••••••••••a71b' };
  const [cfg, setCfg] = useState(INITIAL);
  const [saved, setSaved] = useState(INITIAL);
  const dirty = JSON.stringify(cfg) !== JSON.stringify(saved);
  const set = (patch) => setCfg(c => ({ ...c, ...patch }));

  const save = () => { setSaved(cfg); toast('Settings saved', { icon: 'check' }); };
  const regen = () => setConfirm({
    eyebrow: 'rotate secret', title: 'Rotate the client secret?', danger: true,
    body: 'The current secret stops working immediately. Any AI client using it must be reconfigured with the new value before it can read or write memory.',
    target: 'client secret · ' + CLIENT_ID, confirmLabel: 'Rotate secret', confirmIcon: 'reset',
    onConfirm: () => { const ns = 'sk_live_' + Math.random().toString(36).slice(2, 6) + '••••••••••••••••' + Math.random().toString(36).slice(2, 6); setCfg(c => ({ ...c, secret: ns })); setSaved(s => ({ ...s, secret: ns })); toast('Secret rotated — copy the new value', { icon: 'key' }); },
  });
  const copy = (v) => { navigator.clipboard && navigator.clipboard.writeText(v); toast('Copied to clipboard', { icon: 'copy' }); };

  return (
    <div className="page-scroll">
      <div className="page-pad settings-wrap">

        {/* write-scope policy */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">// policy</span>
            <h3>Default write scope</h3>
            <p>Where the assistant writes a new memory when it isn’t told which scope to use.</p>
          </div>
          <div className="set-body">
            <div className="radio-set" role="radiogroup" aria-label="Default write scope">
              <RadioOpt on={cfg.writePolicy === 'ask'} onClick={() => set({ writePolicy: 'ask' })}
                title="Ask each time" tag="recommended" tagAccent
                desc="The assistant proposes a scope and the member confirms before anything is written. Safest default for mixed teams." />
              <RadioOpt on={cfg.writePolicy === 'project'} onClick={() => set({ writePolicy: 'project' })}
                title="Active project scope"
                desc="Writes land in whichever project the member is currently working in. Org-wide facts must be promoted manually." />
              <RadioOpt on={cfg.writePolicy === 'global'} onClick={() => set({ writePolicy: 'global' })}
                title="Organization-wide" tag="broad"
                desc="Everything defaults to the global scope. Simple, but the shared baseline grows quickly — review regularly." />
            </div>
            {cfg.writePolicy === 'project' && (
              <div className="field" style={{ marginTop: 16 }}>
                <label>Fallback scope when no project is active</label>
                <Select value={cfg.defaultScope} onChange={(e) => set({ defaultScope: e.target.value })}>
                  <option value="global">global — organization-wide</option>
                  {projectScopes.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* scope creation */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">// permissions</span>
            <h3>Who may create scopes</h3>
            <p>Project scopes carve the shared memory into spaces. The <span className="mono">global</span> scope is fixed and can’t be created or removed.</p>
          </div>
          <div className="set-body">
            <div className="radio-set" role="radiogroup" aria-label="Scope creation">
              <RadioOpt on={cfg.createScopes === 'admins'} onClick={() => set({ createScopes: 'admins' })}
                title="Admins only" tag="recommended" tagAccent
                desc="Only admins create, rename, and archive project scopes. Members read and write within them." />
              <RadioOpt on={cfg.createScopes === 'members'} onClick={() => set({ createScopes: 'members' })}
                title="Admins & members"
                desc="Any member can spin up a project scope. Faster for autonomous teams; expect more scopes to curate." />
            </div>
          </div>
        </div>

        {/* connector */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">// connector</span>
            <h3>Connector details</h3>
            <p>The endpoint and credentials AI clients use to reach shared memory. Rotate the secret if it may have leaked.</p>
          </div>
          <div className="set-body">
            <div className="conn-light">
              <div className="cl-row">
                <span className="cl-label">Endpoint</span>
                <span className="cl-val">{CONNECTOR_URL}</span>
                <button className="iconbtn" onClick={() => copy(CONNECTOR_URL)} aria-label="Copy endpoint"><Icon name="copy" /></button>
              </div>
              <div className="cl-row">
                <span className="cl-label">Client ID</span>
                <span className="cl-val">{CLIENT_ID}</span>
                <button className="iconbtn" onClick={() => copy(CLIENT_ID)} aria-label="Copy client id"><Icon name="copy" /></button>
              </div>
              <div className="cl-row">
                <span className="cl-label">Client secret</span>
                <span className="cl-val mask">{cfg.secret}</span>
                <button className="btn sm danger" onClick={regen}><Icon name="reset" /><span className="txt">Rotate</span></button>
              </div>
            </div>
            <div className="idp-banner" style={{ border: '1px solid var(--c-border)', padding: '13px 15px', marginTop: 14 }}>
              <Icon name="info" />
              <span>Identity is delegated to <span className="idp-name">{IDP_NAME}</span>. Member accounts and passwords are managed under <b>Team</b>, not here.</span>
            </div>
          </div>
        </div>

        {/* private memory — locked */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">// guarantee</span>
            <h3>Private memory</h3>
            <p>The one setting you can’t change — and that’s the point.</p>
          </div>
          <div className="set-body">
            <div className="set-locked">
              <div className="sl-icon"><Icon name="lock" /></div>
              <div>
                <div className="sl-title">Private scopes are always private</div>
                <p>Each member’s private memory is owned by them and is never exposed to admins, this console, or the connector. There is no switch to turn this off — it is enforced by the backend, not by configuration.</p>
              </div>
              <span className="sl-state"><Icon name="lock" /> enforced</span>
            </div>
          </div>
        </div>

        <div className="set-savebar">
          <span className="sb-note">{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
          <span className="spacer"></span>
          <button className="btn" disabled={!dirty} onClick={() => setCfg(saved)}>Discard</button>
          <button className="btn primary" disabled={!dirty} onClick={save}><Icon name="check" /><span className="txt">Save settings</span></button>
        </div>

      </div>
      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}

Object.assign(window, { Settings });
