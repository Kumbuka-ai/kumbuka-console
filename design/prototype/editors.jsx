/* ============================================================
   kumbuka.ai · editors & confirm modal
   ============================================================ */

/* ---- Entry editor side panel ---- */
function EntryEditor({ entry, scope, onClose, onSave }) {
  const editing = !!entry;
  const [type, setType] = useState(entry ? entry.type : 'decision');
  const [key, setKey] = useState(entry ? (entry.key || '') : '');
  const [content, setContent] = useState(entry ? entry.content : '');
  const firstRef = useRef(null);
  useEffect(() => { firstRef.current && firstRef.current.focus(); }, []);

  const canSave = content.trim().length > 0;
  const submit = () => {
    if (!canSave) return;
    onSave({ ...(entry || {}), type, key: key.trim(), content: content.trim() });
  };

  return (
    <ModalShell onClose={onClose}>
      <div className="sidepanel" role="dialog" aria-label={editing ? 'Edit entry' : 'New entry'}>
        <div className="sp-head">
          <div>
            <span className="eyebrow">// {scope.id} {editing ? '· edit' : '· new entry'}</span>
            <h3>{editing ? 'Edit memory' : 'New memory'}</h3>
          </div>
          <button className="iconbtn x" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>

        <div className="sp-body">
          <Field label="Type" req>
            <div className="type-grid">
              {TYPE_ORDER.map(t => (
                <button key={t} type="button"
                  className={'type-opt' + (type === t ? ' on' : '')}
                  style={{ '--tc': `var(--type-${t})` }}
                  onClick={() => setType(t)}>
                  <span className="sw"></span>{ENTRY_TYPES[t].label}
                </button>
              ))}
            </div>
            <span className="hint">{ENTRY_TYPES[type].desc}</span>
          </Field>

          <Field label="Key" hint="Optional stable identifier. Lowercase, dot-namespaced — the assistant looks entries up by this.">
            <input ref={firstRef} className="input mono" value={key} spellCheck="false"
              placeholder="e.g. db.system-of-record"
              onChange={e => setKey(e.target.value.replace(/\s+/g, '-').toLowerCase())} />
          </Field>

          <Field label="Content" req>
            <textarea className="textarea" value={content} rows="6"
              placeholder="State it plainly, the way you'd want the assistant to recall it."
              onChange={e => setContent(e.target.value)} />
          </Field>

          <Field label="Scope">
            <div className="input" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'default' }}>
              <Icon name={scope.kind === 'global' ? 'globe' : 'folder'} />
              <span className="mono" style={{ fontSize: '13px' }}>{scope.id}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--c-muted)', fontSize: '12px' }}>{scope.kind === 'global' ? 'organization-wide' : 'project'}</span>
            </div>
          </Field>
        </div>

        <div className="sp-foot">
          {editing && <span className="mono" style={{ fontSize: '10.5px', color: 'var(--c-muted)', letterSpacing: '.04em' }}>edited {relTime(entry.updated)}</span>}
          <span className="spacer"></span>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!canSave} onClick={submit}>
            <Icon name="check" /><span className="txt">{editing ? 'Save changes' : 'Create entry'}</span>
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ---- User editor (create / invite) ---- */
function UserEditor({ onClose, onSave }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('member');
  const firstRef = useRef(null);
  useEffect(() => { firstRef.current && firstRef.current.focus(); }, []);
  const valid = /.+@.+\..+/.test(email);
  const submit = () => { if (valid) onSave({ email: email.trim(), name: name.trim(), role }); };

  return (
    <ModalShell onClose={onClose}>
      <div className="sidepanel" role="dialog" aria-label="Invite user">
        <div className="sp-head">
          <div>
            <span className="eyebrow">// team · provision</span>
            <h3>Invite a member</h3>
          </div>
          <button className="iconbtn x" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="sp-body">
          <div className="idp-banner" style={{ border: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)', padding: '13px 15px' }}>
            <Icon name="shield" />
            <span>This creates the account in <span className="idp-name">{IDP_NAME}</span> and emails an enrolment link. No password is set here.</span>
          </div>
          <Field label="Email" req hint="Must match the identity provider's directory domain.">
            <input ref={firstRef} className="input mono" type="email" value={email} spellCheck="false"
              placeholder="name@kumbuka.ai" onChange={e => setEmail(e.target.value)} />
          </Field>
          <Field label="Display name">
            <input className="input" value={name} placeholder="Optional — pulled from the IdP if blank"
              onChange={e => setName(e.target.value)} />
          </Field>
          <Field label="Role" req>
            <div className="type-grid">
              <button type="button" className={'type-opt' + (role === 'member' ? ' on' : '')} onClick={() => setRole('member')} style={{ '--tc': 'var(--c-muted)' }}>
                <span className="sw"></span>Member
              </button>
              <button type="button" className={'type-opt' + (role === 'admin' ? ' on' : '')} onClick={() => setRole('admin')} style={{ '--tc': 'var(--accent)' }}>
                <span className="sw"></span>Admin
              </button>
            </div>
            <span className="hint">{role === 'admin'
              ? 'Admins manage scopes, members, and settings. They never see anyone’s private memory.'
              : 'Members read and write shared scopes per the write-scope policy.'}</span>
          </Field>
        </div>
        <div className="sp-foot">
          <span className="spacer"></span>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!valid} onClick={submit}>
            <Icon name="userPlus" /><span className="txt">Send invite</span>
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ---- Scope create / rename panel ---- */
function ScopeEditor({ scope, onClose, onSave }) {
  const editing = !!scope;
  const [name, setName] = useState(scope ? scope.name : '');
  const [id, setId] = useState(scope ? scope.id : '');
  const [touchedId, setTouchedId] = useState(editing);
  const firstRef = useRef(null);
  useEffect(() => { firstRef.current && firstRef.current.focus(); }, []);
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const valid = name.trim() && id.trim();
  const submit = () => { if (valid) onSave({ name: name.trim(), id: id.trim() }); };

  return (
    <ModalShell onClose={onClose}>
      <div className="sidepanel" role="dialog" aria-label={editing ? 'Rename scope' : 'New scope'} style={{ width: '440px' }}>
        <div className="sp-head">
          <div>
            <span className="eyebrow">// {editing ? 'rename scope' : 'new project scope'}</span>
            <h3>{editing ? 'Rename scope' : 'Create scope'}</h3>
          </div>
          <button className="iconbtn x" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="sp-body">
          <Field label="Display name" req>
            <input ref={firstRef} className="input" value={name}
              placeholder="e.g. Billing Platform"
              onChange={e => { setName(e.target.value); if (!touchedId) setId(slug(e.target.value)); }} />
          </Field>
          <Field label="Scope id" req hint="Stable, kebab-case. The assistant addresses the scope by this.">
            <input className="input mono" value={id} spellCheck="false" disabled={editing}
              placeholder="billing-platform"
              onChange={e => { setTouchedId(true); setId(slug(e.target.value)); }} />
          </Field>
          {!editing && (
            <div className="idp-banner" style={{ border: '1px solid var(--c-border)', padding: '13px 15px' }}>
              <Icon name="info" />
              <span>New scopes start empty and writable by admins. Adjust who may write in <b>Settings → write-scope policy</b>.</span>
            </div>
          )}
        </div>
        <div className="sp-foot">
          <span className="spacer"></span>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!valid} onClick={submit}>
            <Icon name="check" /><span className="txt">{editing ? 'Save' : 'Create scope'}</span>
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ---- Confirm modal ---- */
function ConfirmModal({ eyebrow, title, body, target, confirmLabel, confirmIcon, danger, onClose, onConfirm }) {
  return (
    <ModalShell onClose={onClose}>
      <div className="modal" role="alertdialog" aria-label={title}>
        <div className="modal-body">
          <span className="eyebrow" style={danger ? null : { color: 'var(--c-accent)' }}>// {eyebrow}</span>
          <h3>{title}</h3>
          <p>{body}</p>
          {target && <div className="target">{target}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className={'btn ' + (danger ? 'danger' : 'primary')} onClick={() => { onClose(); onConfirm(); }}>
            {confirmIcon && <Icon name={confirmIcon} />}<span className="txt">{confirmLabel}</span>
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

Object.assign(window, { EntryEditor, UserEditor, ScopeEditor, ConfirmModal });
