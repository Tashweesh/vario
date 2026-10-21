import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// ───────────── brand
export function LogoMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <rect width="34" height="34" rx="10" fill="#C8102E" />
      <path d="M9 10l8 15 8-15" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ───────────── icons (stroke icons from the design)
const I = ({ d, size = 20, sw = 1.7, children, fill = 'none', ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...p}>{d ? <path d={d} /> : children}</svg>
);
export const IconHeart = ({ filled, size = 20, color }) => <I size={size} fill={filled ? color || '#c8102e' : 'none'} stroke={filled ? color || '#c8102e' : 'currentColor'} d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z" />;
export const IconSearch = ({ size = 19, sw = 2 }) => <I size={size} sw={sw}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></I>;
export const IconMenu = () => <I size={22} d="M4 7h16M4 12h16M4 17h16" />;
export const IconGlobe = () => <I size={16}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></I>;
export const IconPhone = ({ size = 18 }) => <I size={size} d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />;
export const IconPin = ({ size = 18 }) => <I size={size}><path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></I>;
export const IconHome = () => <I size={21} d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />;
export const IconTag = () => <I size={21}><path d="M20 12l-8 8-9-9V4h7z" /><circle cx="7.5" cy="7.5" r="1.2" /></I>;
export const IconKey = ({ size = 21 }) => <I size={size}><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 4l3 3M13 7l3 3" /></I>;
export const IconMap = () => <I size={21} d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14" />;
export const IconClose = ({ size = 18 }) => <I size={size} sw={2} d="M6 6l12 12M18 6L6 18" />;

// ───────────── feedback
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, kind = 'ok') => {
    const id = Math.random();
    setItems((s) => [...s, { id, msg, kind }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div dir="rtl" style={{ position: 'fixed', bottom: 20, insetInlineStart: 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 'calc(100vw - 40px)' }}>
        {items.map((t) => (
          <div key={t.id} className="toast" role="status" style={{ background: t.kind === 'error' ? '#c8102e' : '#1d1e22', color: '#fff', borderRadius: 12, padding: '12px 16px', fontSize: 14, fontWeight: 600, boxShadow: '0 12px 40px rgba(0,0,0,.18)' }}>{t.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const Spinner = ({ pad = 60 }) => <div style={{ display: 'grid', placeItems: 'center', padding: pad }}><div className="spin" /></div>;

export function Modal({ title, onClose, children, width = 520, footer }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div dir="rtl" onMouseDown={(e) => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(29,30,34,.45)', display: 'grid', placeItems: 'center', padding: 16, overflowY: 'auto' }}>
      <div role="dialog" aria-label={title} style={{ width: '100%', maxWidth: width, background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,.2)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e7e7e3' }}>
          <div style={{ fontWeight: 600, fontSize: 17 }}>{title}</div>
          <button onClick={onClose} aria-label="إغلاق" style={{ width: 34, height: 34, borderRadius: 10, border: 0, background: '#f6f6f4', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><IconClose size={16} /></button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
        {footer && <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '14px 20px', borderTop: '1px solid #e7e7e3', background: '#fafaf8' }}>{footer}</div>}
      </div>
    </div>
  );
}

// ───────────── controls
const BTN = {
  red: { border: 0, background: '#c8102e', color: '#fff' },
  dark: { border: 0, background: '#1d1e22', color: '#fff' },
  line: { border: '1px solid #d8d8d3', background: '#fff', color: '#1d1e22' },
  ghost: { border: 0, background: 'transparent', color: '#1d1e22' },
  green: { border: 0, background: '#0f8a4f', color: '#fff' },
};
export function Btn({ kind = 'line', h = 40, r = 12, px = 16, fs = 13.5, style, children, ...p }) {
  return <button type="button" style={{ height: h, padding: `0 ${px}px`, borderRadius: r, fontWeight: 600, fontSize: fs, cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, ...BTN[kind], ...style }} {...p}>{children}</button>;
}

// Pill filter chip: dark when active, outlined otherwise.
export function Chip({ on, h = 34, px = 12, fs = 13, style, children, ...p }) {
  return (
    <button type="button" aria-pressed={!!on} style={{ height: h, padding: `0 ${px}px`, borderRadius: 999, border: `1px solid ${on ? '#1d1e22' : '#d8d8d3'}`, background: on ? '#1d1e22' : '#fff', color: on ? '#fff' : '#1d1e22', fontSize: fs, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', cursor: 'pointer', flex: 'none', fontWeight: 500, ...style }} {...p}>{children}</button>
  );
}

// Big option tile (owners form, match quiz): 2px dark border when selected.
export function Tile({ on, h = 48, children, style, ...p }) {
  return <button type="button" aria-pressed={!!on} style={{ height: h, borderRadius: h > 50 ? 14 : 12, border: on ? '2px solid #1d1e22' : '1px solid #d8d8d3', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, cursor: 'pointer', ...style }} {...p}>{children}</button>;
}

export function Toggle({ on, onChange, small, label, disabled }) {
  const w = small ? 40 : 44, hh = small ? 24 : 26, k = small ? 18 : 20;
  return (
    <button type="button" role="switch" aria-checked={!!on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} style={{ width: w, height: hh, borderRadius: 999, border: 0, padding: 0, position: 'relative', flex: 'none', cursor: 'pointer', background: on ? '#c8102e' : '#d8d8d3' }}>
      <span style={{ position: 'absolute', top: 3, insetInlineStart: on ? w - k - 3 : 3, width: k, height: k, borderRadius: 999, background: '#fff', transition: 'inset-inline-start .2s' }} />
    </button>
  );
}

// Segmented control (sale / rent etc.)
export function Seg({ value, options, onChange, h = 36, fs = 13.5, style, full }) {
  return (
    <div style={{ display: 'inline-flex', background: '#f6f6f4', borderRadius: 12, padding: 4, gap: 2, ...style }}>
      {options.map(([v, label]) => (
        <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v} style={{ flex: full ? 1 : 'none', height: h, padding: '0 18px', borderRadius: 9, border: 0, background: value === v ? '#1d1e22' : 'transparent', color: value === v ? '#fff' : '#1d1e22', fontWeight: 600, fontSize: fs, cursor: 'pointer', whiteSpace: 'nowrap' }}>{label}</button>
      ))}
    </div>
  );
}

// CMS-style labelled field.
export function Field({ label, children, style, hint }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#5a5e68', minWidth: 0, ...style }}>
      {label}
      {children}
      {hint && <span style={{ fontWeight: 400, color: '#767a83', fontSize: 12 }}>{hint}</span>}
    </label>
  );
}

export const Kicker = ({ children, style }) => <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', color: '#767a83', ...style }}>{children}</div>;
export const StatusPill = ({ label, color, bg, h = 24, fs = 11.5 }) => <span style={{ height: h, padding: '0 10px', borderRadius: 999, fontSize: fs, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: bg, color, width: 'fit-content', whiteSpace: 'nowrap' }}>{label}</span>;
export const Empty = ({ children, style }) => <div style={{ padding: '36px 16px', textAlign: 'center', color: '#767a83', fontSize: 14, border: '1px dashed #d8d8d3', borderRadius: 16, ...style }}>{children}</div>;
export const Card = ({ children, style, pad = 22 }) => <div style={{ background: '#fff', border: '1px solid #e7e7e3', borderRadius: 16, padding: pad, ...style }}>{children}</div>;
