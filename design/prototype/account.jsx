/* ============================================================
   kumbuka.ai · Account (personal settings)
   Identity is delegated to Keycloak — email & password changes
   write through to the IdP; MFA and sessions are surfaced here.
   ============================================================ */

const SEED_SESSIONS = [
  { id: 's1', dev: 'MacBook Pro · Chrome', where: 'Berlin, DE', ip: '91.64.xx.xx', last: 'Active now', icon: 'monitor', current: true },
  { id: 's2', dev: 'iPhone 15 · Safari', where: 'Berlin, DE', ip: '91.64.xx.xx', last: '2 hours ago', icon: 'smartphone' },
  { id: 's3', dev: 'Linux · Firefox', where: 'Amsterdam, NL', ip: '145.21.xx.xx', last: 'Yesterday, 18:40', icon: 'monitor' },
];

function pwScore(s) {
  let n = 0;
  if (s.length >= 8) n++;
  if (s.length >= 12) n++;
  if (/[0-9]/.test(s) && /[a-z]/.test(s) && /[A-Z]/.test(s)) n++;
  if (/[^A-Za-z0-9]/.test(s)) n++;
  return Math.min(n, 4);
}
const PW_LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];

function PwField({ label, value, onChange, placeholder, autoFocus, refEl }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label}>
      <div style={{ position: 'relative' }}>
        <input ref={refEl} className="input mono" type={show ? 'text' : 'password'} value={value} autoFocus={autoFocus}
          spellCheck="false" placeholder={placeholder} style={{ paddingRight: 42 }}
          onChange={e => onChange(e.target.value)} />
        <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide' : 'Show'}
          style={{ position: 'absolute', right: 6, top: 6, width: 30, height: 30, display: 'grid', placeItems: 'center', border: 0, background: 'transparent', color: 'var(--c-muted)', cursor: 'pointer' }}>
          <Icon name={show ? 'eyeOff' : 'eye'} />
        </button>
      </div>
    </Field>
  );
}

function Account({ me, onUpdateMe, theme, setTheme }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(null);

  /* ---- profile ---- */
  const [name, setName] = useState(me.name);
  const [email, setEmail] = useState(me.email);
  const profileDirty = name.trim() !== me.name || email.trim() !== me.email;
  const emailChanged = email.trim() !== me.email;
  const saveProfile = () => {
    onUpdateMe({ name: name.trim() });
    if (emailChanged) {
      toast('Verification sent to ' + email.trim(), { icon: 'mail' });
      setEmail(me.email); // pending until verified
    } else {
      toast('Profile updated', { icon: 'check' });
    }
  };

  /* ---- password ---- */
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [cf, setCf] = useState('');
  const score = pwScore(nw);
  const pwValid = cur.length > 0 && score >= 2 && nw === cf;
  const pwMismatch = cf.length > 0 && nw !== cf;
  const changePw = () => {
    if (!pwValid) return;
    setCur(''); setNw(''); setCf('');
    toast('Password updated via ' + IDP_NAME, { icon: 'key' });
  };

  /* ---- 2FA ---- */
  const [authApp, setAuthApp] = useState(true);
  const [passkey, setPasskey] = useState(false);
  const [setupOpen, setSetupOpen] = useState(null); // 'app' | 'passkey' | null
  const [code, setCode] = useState('');
  const mfaOn = authApp || passkey;

  const enrollApp = () => { setAuthApp(true); setSetupOpen(null); setCode(''); toast('Authenticator app enrolled', { icon: 'shield' }); };
  const enrollPasskey = () => { setPasskey(true); setSetupOpen(null); toast('Passkey registered', { icon: 'fingerprint' }); };
  const disableApp = () => setConfirm({
    eyebrow: 'disable method', title: 'Remove authenticator app?', danger: true,
    body: 'You’ll no longer be prompted for a code from your authenticator. Keep at least one second factor enabled to protect the account.',
    target: 'TOTP authenticator', confirmLabel: 'Remove', confirmIcon: 'trash',
    onConfirm: () => { setAuthApp(false); toast('Authenticator removed', { icon: 'shield' }); },
  });

  /* ---- sessions ---- */
  const [sessions, setSessions] = useState(SEED_SESSIONS);
  const revoke = (s) => { setSessions(p => p.filter(x => x.id !== s.id)); toast('Signed out ' + s.dev.split(' · ')[0], { icon: 'logOut' }); };
  const revokeOthers = () => setConfirm({
    eyebrow: 'end sessions', title: 'Sign out everywhere else?', danger: true,
    body: 'Every session except this one is ended immediately. Those devices will need to sign in again through ' + IDP_NAME + '.',
    target: (sessions.length - 1) + ' other session' + (sessions.length - 1 === 1 ? '' : 's'), confirmLabel: 'Sign out others', confirmIcon: 'logOut',
    onConfirm: () => { setSessions(p => p.filter(x => x.current)); toast('Other sessions ended', { icon: 'logOut' }); },
  });

  return (
    <div className="page-scroll">
      <div className="page-pad account-wrap">

        {/* identity header */}
        <div className="acct-identity">
          <Avatar person={me} size="lg" />
          <div style={{ minWidth: 0 }}>
            <div className="ai-name">{me.name}</div>
            <div className="ai-email"><Icon name="atSign" />{me.email}</div>
            <div className="ai-meta">
              <RoleBadge role={me.role} />
              <span className="verified"><Icon name="check" />Email verified</span>
            </div>
          </div>
          <button className="btn" onClick={() => setConfirm({
            eyebrow: 'sign out', title: 'Sign out of this device?',
            body: 'You’ll be returned to the ' + IDP_NAME + ' sign-in screen. Other sessions stay active.',
            confirmLabel: 'Sign out', confirmIcon: 'logOut',
            onConfirm: () => toast('Signing out…', { icon: 'logOut' }),
          })}>
            <Icon name="logOut" /><span className="txt">Sign out</span>
          </button>
        </div>

        {/* delegated-identity banner */}
        <div className="idp-banner" style={{ border: '1px solid var(--c-border)', marginBottom: 8 }}>
          <Icon name="shield" />
          <span>Your sign-in is managed by <span className="idp-name">{IDP_NAME}</span>. Email and password changes are verified and stored there — this console never sees your password.</span>
        </div>

        {/* profile */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">// profile</span>
            <h3>Profile</h3>
            <p>How you appear to the rest of the team across scopes and entries.</p>
          </div>
          <div className="set-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Field label="Display name">
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </Field>
            <Field label="Email" hint={emailChanged ? 'Changing this sends a verification link to the new address before it takes effect.' : 'Used for sign-in and notifications.'}>
              <input className="input mono" type="email" value={email} spellCheck="false" onChange={e => setEmail(e.target.value)} placeholder="name@kumbuka.ai" />
            </Field>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn" disabled={!profileDirty} onClick={() => { setName(me.name); setEmail(me.email); }}>Discard</button>
              <button className="btn primary" disabled={!profileDirty} onClick={saveProfile}>
                <Icon name="check" /><span className="txt">{emailChanged ? 'Save & verify email' : 'Save profile'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* password */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">// password</span>
            <h3>Password</h3>
            <p>Update the password used to sign in through {IDP_NAME}.</p>
          </div>
          <div className="set-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <PwField label="Current password" value={cur} onChange={setCur} placeholder="••••••••" />
            <div>
              <PwField label="New password" value={nw} onChange={setNw} placeholder="At least 8 characters" />
              {nw.length > 0 && (
                <React.Fragment>
                  <div className="pw-meter">
                    {[0,1,2,3].map(i => <i key={i} className={i < score ? 'f' + (score - 1) : ''}></i>)}
                  </div>
                  <div className="pw-strength">Strength: <b>{PW_LABELS[score]}</b></div>
                </React.Fragment>
              )}
            </div>
            <div>
              <PwField label="Confirm new password" value={cf} onChange={setCf} placeholder="Re-enter new password" />
              {pwMismatch && <div className="pw-strength" style={{ color: 'var(--type-constraint)' }}>Passwords don’t match</div>}
            </div>
            <div>
              <button className="btn primary" disabled={!pwValid} onClick={changePw}>
                <Icon name="key" /><span className="txt">Update password</span>
              </button>
            </div>
          </div>
        </div>

        {/* two-factor */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">// security</span>
            <h3>Two-factor authentication</h3>
            <p>A second factor protects the account even if your password leaks. {mfaOn ? 'At least one factor is active.' : 'No second factor is active.'}</p>
          </div>
          <div className="set-body">
            <div className="methods">
              {/* authenticator app */}
              <div className={'method' + (authApp ? ' enrolled' : '')}>
                <div className="m-icon"><Icon name="smartphone" /></div>
                <div>
                  <div className="m-name">Authenticator app</div>
                  <div className="m-sub">Time-based codes (TOTP) from an app like 1Password or Authy.</div>
                </div>
                {authApp
                  ? <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><span className="m-status"><span className="dot"></span>Enrolled</span><button className="btn sm" onClick={disableApp}>Remove</button></div>
                  : <button className="btn sm primary" onClick={() => setSetupOpen(setupOpen === 'app' ? null : 'app')}><Icon name="plus" />Set up</button>}
              </div>
              {setupOpen === 'app' && !authApp && (
                <div className="mfa-setup">
                  <div className="qr-ph" aria-hidden="true"></div>
                  <div className="ms-body">
                    <h4>Scan with your authenticator app</h4>
                    <p>Or enter this setup key manually, then type the 6-digit code to confirm.</p>
                    <div className="ms-secret">JBSWY3DPEHPK3PXP</div>
                    <div className="code-input">
                      <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" inputMode="numeric" aria-label="6-digit code" />
                      <button className="btn primary" disabled={code.length !== 6} onClick={enrollApp}><Icon name="check" />Verify</button>
                      <button className="btn ghost" onClick={() => { setSetupOpen(null); setCode(''); }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* passkey */}
              <div className={'method' + (passkey ? ' enrolled' : '')}>
                <div className="m-icon"><Icon name="fingerprint" /></div>
                <div>
                  <div className="m-name">Passkey / security key</div>
                  <div className="m-sub">Face ID, Touch ID, Windows Hello, or a hardware key.</div>
                </div>
                {passkey
                  ? <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><span className="m-status"><span className="dot"></span>Active</span><button className="btn sm" onClick={() => { setPasskey(false); toast('Passkey removed', { icon: 'fingerprint' }); }}>Remove</button></div>
                  : <button className="btn sm primary" onClick={enrollPasskey}><Icon name="plus" />Add passkey</button>}
              </div>
            </div>
            <div className="ctl-row" style={{ marginTop: 14 }}>
              <div>
                <div className="ctl-title"><Icon name="key" />Recovery codes</div>
                <div className="ctl-desc">One-time codes to get back in if you lose your devices. Store them somewhere safe.</div>
              </div>
              <button className="btn sm" disabled={!mfaOn} onClick={() => toast('Recovery codes generated', { icon: 'key' })}>Generate</button>
            </div>
          </div>
        </div>

        {/* sessions */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">// sessions</span>
            <h3>Active sessions</h3>
            <p>Devices currently signed in to your account. Revoke anything you don’t recognise.</p>
          </div>
          <div className="set-body">
            <div className="sessions">
              {sessions.map(s => (
                <div className={'session' + (s.current ? ' cur' : '')} key={s.id}>
                  <div className="s-icon"><Icon name={s.icon} /></div>
                  <div>
                    <div className="s-dev">{s.dev}{s.current && <span className="s-cur">this device</span>}</div>
                    <div className="s-meta">{s.where} · {s.ip} · {s.last}</div>
                  </div>
                  {s.current
                    ? <span className="s-meta" style={{ paddingRight: 4 }}>—</span>
                    : <button className="s-revoke" onClick={() => revoke(s)}>Sign out</button>}
                </div>
              ))}
            </div>
            {sessions.length > 1 && (
              <div style={{ marginTop: 14 }}>
                <button className="btn sm danger" onClick={revokeOthers}><Icon name="logOut" /><span className="txt">Sign out all other sessions</span></button>
              </div>
            )}
          </div>
        </div>

        {/* preferences */}
        <div className="set-block">
          <div className="set-intro">
            <span className="eyebrow">// preferences</span>
            <h3>Preferences</h3>
            <p>Personal to you on this device.</p>
          </div>
          <div className="set-body">
            <div className="ctl-row">
              <div>
                <div className="ctl-title"><Icon name={theme === 'dark' ? 'moon' : 'sun'} />Appearance</div>
                <div className="ctl-desc">Switch between the paper-light and deep-ink themes.</div>
              </div>
              <div className="seg" role="group" aria-label="Theme">
                <button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')}>Light</button>
                <button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')}>Dark</button>
              </div>
            </div>
          </div>
        </div>

        {/* private-memory ownership — personal framing of the guarantee */}
        <div className="guarantee-band" style={{ marginTop: 8 }}>
          <div className="gb-lock"><Icon name="lock" /></div>
          <div>
            <h4>Your private memory is yours</h4>
            <p>The assistant keeps a private memory scope just for you. It’s tied to this account and is never visible to admins or anyone else — not in the console, not through the connector.</p>
          </div>
          <span className="gb-tag"><Icon name="shield" />only you</span>
        </div>

      </div>
      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}

Object.assign(window, { Account });
