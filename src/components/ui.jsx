import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// UI kit ported from the design reference (project/uploads/VAIRO_12 (1).html, core.js).
// Class names come from src/ref.css (the reference's compiled stylesheet).

// ───────────── brand
export function LogoMark({ size = 34 }) {
  // Brand mark: red V (heavy left stroke, hairline right stroke) on a near-black tile — from the supplied logo artwork.
  return (
    <svg width={size} height={size} viewBox="0 0 1080 1080" aria-hidden="true">
      <defs><radialGradient id="vlg" cx="50%" cy="42%" r="70%"><stop offset="0" stopColor="#1c1c1c" /><stop offset="1" stopColor="#0a0a0a" /></radialGradient></defs>
      <rect width="1080" height="1080" rx="230" fill="url(#vlg)" />
      <path d="M275 300H435L625 690L578 778H540L330 330Z" fill="#E6323E" />
      <path d="M805 300H835L685 605H655Z" fill="#E6323E" />
    </svg>
  );
}
// Full lockup: mark + "VAIRO" + "ڤايرو · Erbil" (V.logo in the reference).
export function Logo({ size = 34 }) {
  return (
    <span className="inline-flex items-center gap-2.5" dir="ltr">
      <LogoMark size={size} />
      <span className="leading-none">
        <span className="block text-[18px] font-bold tracking-[.16em] text-ink">VAIRO</span>
        <span className="block text-[10.5px] text-ink-500 mt-[3px]" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>ڤايرو · Erbil</span>
      </span>
    </span>
  );
}

// ───────────── icons (the reference's stroke icon set)
const IC = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4.2-4.2"/>',
  heart: '<path d="M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5c-2.2 4.6-9.2 9-9.2 9Z"/>',
  compare: '<path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/>',
  map: '<path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',
  pin: '<path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
  bed: '<path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.6"/>',
  bath: '<path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3ZM6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2"/>',
  area: '<path d="M4 4h16v16H4z"/><path d="M4 9h3M4 14h2M9 4v3M14 4v2"/>',
  plot: '<path d="m3 8 9-5 9 5-9 5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'arrow-up': '<path d="M7 17 17 7M8 7h9v9"/>',
  chev: '<path d="m9 6 6 6-6 6"/>', 'chev-d': '<path d="m6 9 6 6 6-6"/>', 'chev-l': '<path d="m15 6-6 6 6 6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>', menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
  wa: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19l-4 1Z"/><path d="M9 9.5c0 2.5 2.5 5 5 5l1-1.5-1.6-.8-.8.8a3.5 3.5 0 0 1-1.6-1.6l.8-.8L11 9l-1.5 1"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="1"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>', sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  grid: '<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h1M4 12h1M4 18h1"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.5 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"/>',
  tower: '<path d="M7 21V5l6-2v18M13 8h4v13M4 21h16M9.5 7.5h1M9.5 11h1M9.5 14.5h1M15 12h.5M15 15.5h.5"/>',
  compound: '<path d="M3 21V11l5-3 5 3v10M13 21V7l4-3 4 3v14M2 21h20M6 14h4M6 17.5h4M16 10h2M16 13.5h2M16 17h2"/>',
  villa: '<path d="M3 11 12 4l9 7M5 9.5V20h14V9.5M10 20v-5h4v5"/><path d="M15 6V4h2v3.5"/>',
  home: '<path d="M4 10.5 12 4l8 6.5V20H4v-9.5Z"/><path d="M10 20v-6h4v6"/>',
  land: '<path d="M3 17 8 7l4 6 3-4 6 8H3Z"/><path d="M3 20h18"/>',
  shop: '<path d="M4 9h16l-1-5H5L4 9Zm0 0v11h16V9M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M10 20v-5h4v5"/>',
  crane: '<path d="M6 21V4h2v17M4 21h8M8 5h12l-2 3M8 5l4 4M18 8v4"/><rect x="16.5" y="12" width="3" height="3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M16 7l2 2M14 9l2 2"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  wallet: '<path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V7Zm0 0 11-3v3"/><circle cx="16" cy="13.5" r="1.2"/>',
  chart: '<path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6"/>', trend: '<path d="M3 17 9 11l4 4 8-8M15 7h6v6"/>',
  route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a5.5 5.5 0 0 1 3.5 6"/>',
  doc: '<path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z"/><path d="m9 12 2 2 4-4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 17.5 9 5 9-5" opacity=".5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
  play: '<path d="M7 4.5v15l12-7.5-12-7.5Z"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  car: '<path d="M5 16V11l2-5h10l2 5v5M3 16h18v3H3zM5 11h14"/><circle cx="7.5" cy="13.5" r=".8"/><circle cx="16.5" cy="13.5" r=".8"/>',
  tree: '<path d="M12 21v-6M7 15h10l-5-11-5 11Z"/>', school: '<path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  plane: '<path d="M10.5 13.5 3 11l1.5-1.5 7.5 1L17 5a2 2 0 0 1 3 3l-5.5 5 1 7.5L14 22l-2.5-7.5"/>',
  bag: '<path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  fork: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2-3 5s1 4 3 4v9"/>',
  vote: '<path d="M7 11V20H4v-9h3Zm0 0 4-7a2 2 0 0 1 2.5 2.5L12.5 10H18a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7"/>',
  note: '<path d="M5 4h14v11l-5 5H5V4Z"/><path d="M14 20v-5h5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="1"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  drag: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  elevator: '<rect x="5" y="3" width="14" height="18"/><path d="M12 3v18M8 9l1.5-2L11 9M13 15l1.5 2 1.5-2"/>',
  qr: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2M14 18h2v2M18 18h2v2"/>',
  sparkle: '<path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7Z"/><path d="M19 16c.2 1.4 1 2.2 2.4 2.4-1.4.2-2.2 1-2.4 2.4-.2-1.4-1-2.2-2.4-2.4 1.4-.2 2.2-1 2.4-2.4Z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  mail: '<rect x="3" y="5" width="18" height="14"/><path d="m3 6 9 7 9-7"/>',
  building: '<path d="M4 21V3h11v18M15 9h5v12M2 21h20M7.5 7h1M11 7h1M7.5 11h1M11 11h1M7.5 15h1M11 15h1M17.5 13h.5M17.5 17h.5"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  play2: '<circle cx="12" cy="12" r="9"/><path d="m10 8.5 5 3.5-5 3.5v-7Z"/>',
  cube: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  warehouse: '<path d="M3 21V9l9-5 9 5v12M3 21h18M7 21v-8h10v8M7 16h10"/>',
  sofa: '<path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M3 17v-4a2 2 0 0 1 4 0v1h10v-1a2 2 0 0 1 4 0v4H3ZM5 17v2M19 17v2"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
  percent: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  ruler: '<path d="m3 17 14-14 4 4L7 21l-4-4Z"/><path d="m7 13 2 2M10 10l2 2M13 7l2 2"/>',
  pool: '<path d="M3 18c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1M8 15V5a2 2 0 0 1 4 0M16 15V5a2 2 0 0 0-4 0M8 9h8M8 12h8"/>',
  door: '<path d="M5 21V3h11v18M3 21h18M13 12h.5"/>',
  bolt: '<path d="M13 3 5 13h6l-1 8 8-10h-6l1-8Z"/>',
  road: '<path d="M8 3 5 21M16 3l3 18M12 4v3M12 10v3M12 16v3"/>',
  hammer: '<path d="m14 6 4 4M3 21l9-9M12 4l6 6-3 3-6-6 3-3Z"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="1"/><path d="M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M3 12h18"/>',
  sun2: '<circle cx="12" cy="12" r="4"/>',
  print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>',
  logout: '<path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10"/>',
  edit: '<path d="M4 20h4l10-10-4-4L4 16v4Z"/><path d="m13 7 4 4"/>',
  trash: '<path d="M5 7h14M9 7V4h6v3M8 7l1 13h6l1-13"/>',
  upload: '<path d="M12 16V5M7 10l5-5 5 5M4 20h16"/>',
  image: '<rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="8.5" cy="10" r="1.5"/><path d="m21 16-5-5-8 8"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
};
export const ICON_NAMES = Object.keys(IC);
export function Icon({ name, size = 18, className = '', style, ...p }) {
  return <svg className={`${className} flex-none`} style={style} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: IC[name] || IC.info }} {...p} />;
}
// legacy named icons (older pages)
export const IconHeart = ({ filled, size = 20, color }) => <Icon name="heart" size={size} style={filled ? { fill: color || '#c8102e', color: color || '#c8102e' } : undefined} />;
export const IconSearch = ({ size = 19 }) => <Icon name="search" size={size} />;
export const IconMenu = () => <Icon name="menu" size={22} />;
export const IconGlobe = () => <Icon name="globe" size={17} />;
export const IconPhone = ({ size = 18 }) => <Icon name="phone" size={size} />;
export const IconPin = ({ size = 18 }) => <Icon name="pin" size={size} />;
export const IconHome = () => <Icon name="home" size={21} />;
export const IconTag = () => <Icon name="tag" size={21} />;
export const IconKey = ({ size = 21 }) => <Icon name="key" size={size} />;
export const IconMap = () => <Icon name="map" size={21} />;
export const IconClose = ({ size = 18 }) => <Icon name="close" size={size} />;

// ───────────── images: the reference's placeholder box (.ph) with lazy fade-in and a graceful failure state.
export function Img({ src, className = '', label = '', alt = '', style, imgClass = '' }) {
  const [st, setSt] = useState(src ? 'ld' : 'fail');
  useEffect(() => { setSt(src ? 'ld' : 'fail'); }, [src]);
  return (
    <div className={`ph ${className} ${st === 'fail' ? 'fail' : ''}`} data-ph={label} style={style}>
      {src && <img src={src} alt={alt} loading="lazy" decoding="async" className={`${imgClass} ${st === 'ld' ? 'ld' : ''}`} onLoad={() => setSt('ok')} onError={() => setSt('fail')} />}
    </div>
  );
}

// ───────────── feedback
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [t, setT] = useState({ msg: '', kind: 'ok', open: false });
  const timer = useRef();
  const push = useCallback((msg, kind = 'ok') => {
    clearTimeout(timer.current);
    setT({ msg, kind, open: true });
    timer.current = setTimeout(() => setT((s) => ({ ...s, open: false })), kind === 'error' ? 6000 : 3400);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className={`toast ${t.open ? 'open' : ''}`} role="status" dir="rtl" style={t.kind === 'error' ? { background: '#c8102e' } : undefined}>
        <Icon name={t.kind === 'error' ? 'info' : 'check'} size={17} className={t.kind === 'error' ? 'text-white' : 'text-red-200'} /><span>{t.msg}</span>
      </div>
    </ToastCtx.Provider>
  );
}

export const Spinner = ({ pad = 60 }) => <div className="grid place-items-center" style={{ padding: pad }}><div className="spin-dark" /></div>;

// Sheet-style dialog (scrim + .sheet.modal). `width` > 600 renders the wide variant.
export function Modal({ title, sub, onClose, children, width = 560, footer, bodyClass = 'p-6' }) {
  const [open, setOpen] = useState(false);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const r = requestAnimationFrame(() => setOpen(true));
    const k = (e) => e.key === 'Escape' && close.current();
    window.addEventListener('keydown', k);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { cancelAnimationFrame(r); window.removeEventListener('keydown', k); document.documentElement.style.overflow = prev; };
  }, []);
  const wide = width > 600;
  return (
    <>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={() => close.current()} />
      <div className={`sheet modal ${wide ? 'wide' : ''} ${open ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label={title} dir="rtl" style={wide ? { width: `min(${width}px, calc(100vw - 32px))` } : undefined}>
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b hair flex-none">
          <div className="min-w-0"><div className="text-[19px] font-semibold t-h3">{title}</div>{sub && <div className="lbl mt-0.5">{sub}</div>}</div>
          <button type="button" className="icon-btn -me-2" onClick={() => close.current()} aria-label="إغلاق"><Icon name="close" size={20} /></button>
        </div>
        <div className={`${bodyClass} overflow-y-auto`}>{children}</div>
        {footer && <div className="flex gap-2 justify-end px-6 py-4 border-t hair bg-paper-2 flex-none">{footer}</div>}
      </div>
    </>
  );
}

// ───────────── controls
const KIND = { red: 'btn-red', dark: 'btn-ink', ink: 'btn-ink', line: 'btn-line', ghost: 'btn-ghost', green: 'btn-green', soft: 'btn-soft', white: 'btn-white' };
// kind: red | dark | line | ghost | green | soft | white · size: sm | lg (or legacy h ≤ 40 → sm, ≥ 52 → lg)
export function Btn({ kind = 'line', size, h, r, px, fs, className = '', style, children, ...p }) {
  const sz = size || (h != null ? (h <= 40 ? 'sm' : h >= 52 ? 'lg' : '') : '');
  return <button type="button" className={`btn ${KIND[kind] || 'btn-line'} ${sz ? 'btn-' + sz : ''} ${className}`} style={style} {...p}>{children}</button>;
}

// Pill filter chip: dark when active, outlined otherwise.
export function Chip({ on, small, h, px, fs, className = '', style, children, ...p }) {
  const sm = small || (h != null && h <= 32);
  return <button type="button" aria-pressed={!!on} className={`chip ${sm ? 'chip-sm' : ''} ${className}`} style={style} {...p}>{children}</button>;
}

// Big option tile (owners form, match quiz): 2px dark border when selected.
export function Tile({ on, h = 48, children, className = '', style, ...p }) {
  return <button type="button" aria-pressed={!!on} className={`flex items-center justify-center font-semibold text-[14px] bg-white transition-colors ${on ? 'border-2 border-ink' : 'border hair hover:border-ink-300'} ${className}`} style={{ height: h, borderRadius: h > 50 ? 14 : 12, ...style }} {...p}>{children}</button>;
}

export function Toggle({ on, onChange, small, label, disabled }) {
  const w = small ? 40 : 44, hh = small ? 24 : 26, k = small ? 18 : 20;
  return (
    <button type="button" role="switch" aria-checked={!!on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} style={{ width: w, height: hh, borderRadius: 999, border: 0, padding: 0, position: 'relative', flex: 'none', cursor: 'pointer', background: on ? '#c8102e' : '#d8d8d3', transition: 'background .2s' }}>
      <span style={{ position: 'absolute', top: 3, insetInlineStart: on ? w - k - 3 : 3, width: k, height: k, borderRadius: 999, background: '#fff', transition: 'inset-inline-start .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
    </button>
  );
}

// Segmented control (sale / rent etc.) — the reference's .seg
export function Seg({ value, options, onChange, large, full, className = '', style, h, fs }) {
  return (
    <div className={`seg ${large || (h && h >= 44) ? 'seg-lg' : ''} ${full ? 'w-full grid' : ''} ${className}`} style={{ ...(full ? { gridTemplateColumns: `repeat(${options.length},1fr)` } : null), ...style }}>
      {options.map(([v, label, icon]) => (
        <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v}>{icon && <Icon name={icon} size={15} />}{label}</button>
      ))}
    </div>
  );
}

// Labelled form field (.flabel + any .field/.inp control).
export function Field({ label, children, style, className = '', hint }) {
  return (
    <label className={`block min-w-0 ${className}`} style={style}>
      {label && <span className="flabel">{label}</span>}
      {children}
      {hint && <span className="block lbl mt-1.5">{hint}</span>}
    </label>
  );
}

export const Kicker = ({ children, style, className = '', noLine }) => <div className={`eyebrow ${noLine ? 'no-line' : ''} ${className}`} style={style}>{children}</div>;
export const StatusPill = ({ label, color, bg, h = 22, fs = 11.5, className = '' }) => <span className={`osb ${className}`} style={{ background: bg, color, height: h, fontSize: fs }}>{label}</span>;
export const Empty = ({ children, icon, title, style, className = '' }) => (
  <div className={`rounded-[18px] border border-dashed hair p-10 text-center ${className}`} style={style}>
    {icon && <div className="w-12 h-12 mx-auto rounded-full bg-paper-2 inline-flex items-center justify-center text-ink-400"><Icon name={icon} size={22} /></div>}
    {title && <div className="font-semibold mt-3">{title}</div>}
    <div className="text-[14px] text-ink-500 mt-1">{children}</div>
  </div>
);
export const Card = ({ children, style, pad = 22, className = '' }) => <div className={`panel ${className}`} style={{ padding: pad, ...style }}>{children}</div>;
