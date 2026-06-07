/* ============================================================
   kumbuka.ai · shared UI primitives
   ============================================================ */
const { useState, useEffect, useRef, useLayoutEffect, useCallback } = React;

/* ---- Icons (Lucide-style, 1.5 stroke, currentColor) ---- */
const ICONS = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M20 20l-3.5-3.5',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  chevDown: 'M6 9l6 6 6-6',
  chevUp: 'M6 15l6-6 6 6',
  chevRight: 'M9 6l6 6-6 6',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5zM12 15v2',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  pencil: 'M4 20h4L19 9a2 2 0 0 0-3-3L5 17zM14 7l3 3',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  sort: 'M8 4v16M8 20l-3-3M8 4l3 3M16 20V4M16 4l3 3M16 20l-3-3',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowDown: 'M12 5v14M5 12l7 7 7-7',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  key: 'M14 7a4 4 0 1 1-5.5 5.5L4 17v3h3l1-1h2v-2h2l1.5-1.5A4 4 0 0 1 14 7M16 9h.01',
  users: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 19v-1a4 4 0 0 0-3-3.8M16 4.2a4 4 0 0 1 0 7.6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  rows: 'M3 5h18v6H3zM3 13h18v6H3z',
  alert: 'M12 3L2 20h20zM12 9v5M12 17h.01',
  inbox: 'M3 12h5l1.5 3h5L21 12M3 12l3.5-7h11L21 12v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  refresh: 'M3 11a8 8 0 0 1 14-4l3 1M21 13a8 8 0 0 1-14 4l-3-1M17 4l.5 4-4-.5M7 20l-.5-4 4 .5',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
  shieldOff: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM4 4l16 16',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  userPlus: 'M14 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M19 8v6M22 11h-6',
  userX: 'M14 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M17 8l5 5M22 8l-5 5',
  reset: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M3 12h18M12 3c2.5 2.5 3.5 5.6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.6-3.5-9S9.5 5.5 12 3',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  archive: 'M3 4h18v4H3zM5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M9 12h6',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 11v5M12 8h.01',
  link: 'M9 15l6-6M10 7l1-1a4 4 0 0 1 6 6l-1 1M14 17l-1 1a4 4 0 0 1-6-6l1-1',
  edit: 'M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6M18.5 3.5a2 2 0 0 1 3 3L12 16l-4 1 1-4z',
  filter: 'M3 5h18l-7 8v6l-4-2v-4z',
  panelLeft: 'M3 4h18v16H3zM9 4v16',
  swap: 'M16 3l4 4-4 4M20 7H8M8 21l-4-4 4-4M4 17h12',
  circleDot: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
  building: 'M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 21V9h4a1 1 0 0 1 1 1v11M8 8h.01M11 8h.01M8 12h.01M11 12h.01M8 16h.01M11 16h.01M2 21h20',
  eyeOff: 'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.2A9 9 0 0 1 21 12a14 14 0 0 1-2.3 3M6.1 6.1A14 14 0 0 0 3 12a9 9 0 0 0 12 5',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  atSign: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1',
  monitor: 'M3 4h18v12H3zM8 20h8M12 16v4',
  smartphone: 'M7 3h10v18H7zM11 18h2',
  fingerprint: 'M12 11a2 2 0 0 0-2 2c0 2 .5 3.5 1 4.5M8 7.5A6 6 0 0 1 18 12v1a14 14 0 0 0 .5 4M5 12a7 7 0 0 1 2-5M12 13c0 2.5.5 4.5 1.5 6M15.5 12.5a3.5 3.5 0 0 0-7 .5',
  logOut: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l3 2',
};
function Icon({ name, className }) {
  const d = ICONS[name] || '';
  return (
    <svg className={'ico ' + (className||'')} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d.split('M').filter(Boolean).map((seg, i) => <path key={i} d={'M' + seg} />)}
    </svg>
  );
}

/* ---- time formatting ---- */
const NOW = new Date('2026-06-05T11:00:00');
function relTime(iso) {
  const d = new Date(iso);
  const mins = Math.round((NOW - d) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.round(hrs / 24);
  if (days < 7) return days + 'd ago';
  const wks = Math.round(days / 7);
  if (wks < 5) return wks + 'w ago';
  return d.toLocaleDateString('en-CA');
}
function fullDate(iso) {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ---- Avatar ---- */
function Avatar({ person, size }) {
  const p = person || {};
  return <div className={'avatar' + (size ? ' ' + size : '')} aria-hidden="true"
    style={p.agent ? { background: 'var(--c-inset)', color: 'var(--c-accent)', borderColor: 'var(--c-border)' } : null}>{p.initials || '?'}</div>;
}

/* ---- Type chip ---- */
function TypeChip({ type, boxed }) {
  const t = ENTRY_TYPES[type];
  if (!t) return null;
  return (
    <span className={'tchip' + (boxed ? ' boxed' : '')} style={{ '--tc': `var(--type-${type})` }}>
      <span className="sw"></span>{t.label}
    </span>
  );
}

/* ---- Role badge ---- */
function RoleBadge({ role }) {
  return <span className={'rolebadge ' + role}><span className="dot"></span>{role}</span>;
}

/* ---- Author cell ---- */
function AuthorCell({ id }) {
  const p = PEOPLE[id] || { name: id, initials: '?' };
  return (
    <span className={'cell-author' + (p.agent ? ' agent' : '')}>
      <Avatar person={p} size="xs" />
      <span className="a-name">{p.name}</span>
    </span>
  );
}

/* ============================================================
   Popover menu — positioned at an anchor rect
   ============================================================ */
function Menu({ anchor, onClose, items }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    if (!anchor || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    let left = anchor.right - r.width;
    let top = anchor.bottom + 6;
    if (top + r.height > window.innerHeight - 12) top = anchor.top - r.height - 6;
    if (left < 12) left = 12;
    setPos({ left, top });
  }, [anchor]);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', h);
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('mousedown', h); window.removeEventListener('keydown', k); };
  }, [onClose]);
  return (
    <div className="menu" ref={ref} style={pos ? { left: pos.left, top: pos.top, visibility: 'visible' } : { visibility: 'hidden' }} role="menu">
      {items.map((it, i) => it.sep
        ? <div className="sep" key={i}></div>
        : <button key={i} className={it.danger ? 'danger' : ''} role="menuitem"
            onClick={() => { onClose(); it.onClick && it.onClick(); }} disabled={it.disabled}>
            <Icon name={it.icon} />{it.label}
          </button>
      )}
    </div>
  );
}

/* ---- hook: anchored menu state ---- */
function useMenu() {
  const [state, setState] = useState(null); // { anchor, items }
  const open = (e, items) => { e.stopPropagation(); setState({ anchor: e.currentTarget.getBoundingClientRect(), items }); };
  const node = state ? <Menu anchor={state.anchor} items={state.items} onClose={() => setState(null)} /> : null;
  return { open, node };
}

/* ============================================================
   Toasts
   ============================================================ */
const ToastCtx = React.createContext(() => {});
function ToastHost({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, ...opts }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), opts.duration || 3600);
  }, []);
  const dismiss = (id) => setToasts(t => t.filter(x => x.id !== id));
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {toasts.map(t => (
          <div className="toast" key={t.id} role="status">
            <Icon name={t.icon || 'check'} />
            <span className="t-msg">{t.msg}</span>
            {t.undo && <button className="t-undo" onClick={() => { dismiss(t.id); t.undo(); }}>Undo</button>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
const useToast = () => React.useContext(ToastCtx);

/* ---- Modal shell ---- */
function ModalShell({ onClose, children }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <React.Fragment>
      <div className="scrim" onClick={onClose}></div>
      {children}
    </React.Fragment>
  );
}

/* ---- Field helpers ---- */
function Field({ label, req, hint, children }) {
  return (
    <div className="field">
      <label>{label}{req && <span className="req">*</span>}</label>
      {hint && <span className="hint">{hint}</span>}
      {children}
    </div>
  );
}
function Select({ value, onChange, children }) {
  return (
    <div className="select-wrap">
      <select className="select" value={value} onChange={onChange}>{children}</select>
      <Icon name="chevDown" />
    </div>
  );
}

Object.assign(window, {
  Icon, Avatar, TypeChip, RoleBadge, AuthorCell, Menu, useMenu,
  ToastHost, useToast, ModalShell, Field, Select, relTime, fullDate,
  useState, useEffect, useRef, useCallback,
});
