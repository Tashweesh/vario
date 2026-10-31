import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { ROLE_AR, STATUS } from '../lib/format.js';
import { Icon, Img, LogoMark, Spinner } from '../components/ui.jsx';

// Staff shell ported from the design reference (os/shell.js): workspace rail · section sidebar · top bar · body,
// plus the mobile bottom bar and menu drawer. UI kit classes come from src/ref.css (os-card, os-tbl, osb, os-tab …).

// Requires a signed-in team member; otherwise sends to /login?next=…
export function StaffGate({ children }) {
  const A = useAuth();
  const loc = useLocation();
  if (A.loading) return <Spinner pad={160} />;
  if (!A.session || !A.me) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return children;
}

export const Dot6 = () => <span style={{ width: 6, height: 6, borderRadius: 999, background: '#c8102e', flex: 'none' }} />;

// The app's two workspaces (the reference has four: me / company / website / people).
const WS = {
  cms: { to: '/cms', icon: 'globe', label: 'إدارة الموقع', sub: 'كل شي يشوفه الزبون بالموقع' },
  crm: { to: '/crm', icon: 'users', label: 'العملاء', sub: 'الطلبات والعملاء والمعاينات' },
};
const wsOf = (path) => (path.startsWith('/crm') ? 'crm' : 'cms');

// Layout helpers the reference builds with arbitrary Tailwind grid values that ref.css does not ship
// (lg:grid-cols-[minmax(0,1fr)_340px] etc.). `.os-cols` = main + sticky aside, `.os-cols.split` = 1.45fr/1fr, `.os-kpis` = KPI row.
const OS_LAYOUT_CSS = `
.os-cols{display:grid;gap:20px;align-items:start;min-width:0}
.os-cols>*{min-width:0}
.os-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:20px}
@media (min-width:1024px){.os-cols:not(.split){grid-template-columns:minmax(0,1fr) var(--side,340px)}.os-cols:not(.split)>.os-aside{position:sticky;top:84px}.os-kpis{grid-template-columns:repeat(var(--n,4),minmax(0,1fr))}}
@media (min-width:1280px){.os-cols.split{grid-template-columns:minmax(0,1.45fr) minmax(0,1fr)}}
.os-body .ph img{object-fit:cover}
`;

// Avatar: photo or initials (O.av in the reference).
export function Av({ src, name = '', size = 28, className = '' }) {
  if (src) return <img src={src} alt="" className={`rounded-full flex-none ${className}`} style={{ width: size, height: size, objectFit: 'cover' }} />;
  return <span className={`inline-flex items-center justify-center rounded-full flex-none text-white font-semibold ${className}`} style={{ width: size, height: size, background: '#1D1E22', fontSize: Math.round(size * 0.38) }} dir="ltr">{(name || '?').trim()[0]}</span>;
}

function UserMenu({ me, A, nav, children, className = '', up = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div className={`relative ${className}`} ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} className="w-full flex items-center gap-2.5 p-2 rounded-[12px] hover:bg-paper-2 text-start">{children}</button>
      {open && (
        <div role="menu" className="absolute end-0 min-w-[220px] bg-white border hair rounded-[14px] shadow-pop p-1.5 z-50" style={up ? { bottom: '100%', marginBottom: 6 } : { top: '100%', marginTop: 6 }}>
          <div className="px-3 pt-2 pb-2 border-b hair mb-1"><div className="text-[13.5px] font-semibold clamp-1">{me.name}</div><div className="text-[12px] text-ink-500 clamp-1" dir="ltr">{me.email}</div></div>
          <button type="button" role="menuitem" className="os-nav w-full" onClick={() => { setOpen(false); nav('/'); }}><Icon name="globe" size={17} /><span className="flex-1">عرض الموقع</span></button>
          <button type="button" role="menuitem" className="os-nav w-full text-red" onClick={async () => { setOpen(false); await A.signOut(); nav('/login'); }}><Icon name="door" size={17} /><span className="flex-1">تسجيل الخروج</span></button>
        </div>
      )}
    </div>
  );
}

// Sidebar + top bar shared by the CMS and the CRM.
// items: [{ to, label, icon?, match?, badge?, count?, section? }]
export function Shell({ sub, items, switchTo, search, onSearch, searchPlaceholder, actions, children }) {
  const A = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [menu, setMenu] = useState(false);
  const [drawerIn, setDrawerIn] = useState(false);
  const active = (it) => (it.match ? it.match(loc.pathname) : loc.pathname === it.to);
  const me = A.me;
  const ws = wsOf(loc.pathname);
  const cur = items.find((it) => !it.section && active(it));

  useEffect(() => { setMenu(false); }, [loc.pathname]);
  useEffect(() => {
    if (!menu) { setDrawerIn(false); return; }
    const r = requestAnimationFrame(() => setDrawerIn(true));
    const k = (e) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', k);
    return () => { cancelAnimationFrame(r); window.removeEventListener('keydown', k); };
  }, [menu]);

  // grouped nav: [{ section, items }]
  const groups = [];
  items.forEach((it) => {
    if (it.section) groups.push({ section: it.section, items: [] });
    else { if (!groups.length) groups.push({ section: null, items: [] }); groups[groups.length - 1].items.push(it); }
  });

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-4 border-b hair flex-none">
        <div className="text-[11px] font-semibold text-ink-400 uppercase tracking-wide">VAIRO OS</div>
        <div className="text-[18px] font-semibold t-h3 mt-0.5">{WS[ws].label}</div>
        <div className="text-[12px] text-ink-500 mt-0.5">{sub || WS[ws].sub}</div>
      </div>
      <nav className="flex-1 overflow-y-auto no-sb px-3 py-3">
        {groups.map((g, i) => (
          <div key={i} className="mb-3">
            {g.section && <div className="px-3 pt-2 pb-1.5 text-[11px] font-semibold text-ink-400 uppercase tracking-wide">{g.section}</div>}
            {g.items.map((it) => (
              <Link key={it.to} to={it.to} className={`os-nav ${active(it) ? 'on' : ''}`} aria-current={active(it) ? 'page' : undefined}>
                {it.icon ? <Icon name={it.icon} size={17} /> : <span className="flex-none inline-flex items-center justify-center" style={{ width: 17 }}>{active(it) ? <Dot6 /> : null}</span>}
                <span className="flex-1 clamp-1">{it.label}</span>
                {it.badge > 0 ? <span className="os-cnt red">{it.badge}</span> : it.count != null ? <span className="os-cnt">{it.count}</span> : null}
              </Link>
            ))}
          </div>
        ))}
        {switchTo && (
          <div className="mb-3">
            <div className="px-3 pt-2 pb-1.5 text-[11px] font-semibold text-ink-400 uppercase tracking-wide">المساحات</div>
            <Link to={switchTo.to} className="os-nav"><Icon name="arrow-up" size={17} /><span className="flex-1 clamp-1">{switchTo.label}</span></Link>
          </div>
        )}
      </nav>
      <div className="p-3 border-t hair flex-none">
        <UserMenu me={me} A={A} nav={nav} up>
          <Av src={me.img} name={me.name} size={34} />
          <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold clamp-1">{me.name}</span><span className="block text-[11.5px] text-ink-500 clamp-1">{ROLE_AR[me.role]}</span></span>
          <Icon name="chev-d" size={15} className="text-ink-400" />
        </UserMenu>
      </div>
    </div>
  );

  return (
    <div className="os-app" dir="rtl">
      <style>{OS_LAYOUT_CSS}</style>
      <nav className="os-rail hidden lg:flex" aria-label="المساحات">
        <Link to={WS[ws].to} className="os-rail-logo" title="VAIRO OS"><LogoMark size={34} /></Link>
        {Object.entries(WS).map(([k, w]) => (
          <Link key={k} to={w.to} className={`os-ws ${k === ws ? 'on' : ''}`} title={w.label}><Icon name={w.icon} size={21} /><span>{w.label}</span></Link>
        ))}
        <div className="flex-1" />
        <Link to="/" className="os-ws" title="عرض الموقع"><Icon name="arrow-up" size={19} /><span>عرض الموقع</span></Link>
      </nav>
      <aside className="os-side hidden lg:block">{sidebar}</aside>
      <div className="os-main">
        <header className="os-top">
          <button type="button" className="icon-btn lg:hidden -ms-2" onClick={() => setMenu(true)} aria-label="القائمة"><Icon name="menu" size={21} /></button>
          <div className="hidden md:flex items-center gap-1.5 text-[13px] min-w-0">
            <Link to={WS[ws].to} className="text-ink-500 hover:text-ink font-medium whitespace-nowrap">{WS[ws].label}</Link>
            {cur && cur.to !== WS[ws].to && <><Icon name="chev" size={13} className="flip-rtl text-ink-300" /><Link to={cur.to} className="font-semibold text-ink clamp-1">{cur.label}</Link></>}
          </div>
          {onSearch && (
            <form onSubmit={(e) => { e.preventDefault(); onSearch(new FormData(e.currentTarget).get('q')); }} className="flex-1 max-w-[440px] h-10 px-3.5 rounded-[12px] bg-paper-2 border hair text-ink-500 text-[13.5px] flex items-center gap-2.5 focus-within:border-ink md:ms-4 min-w-0" role="search">
              <Icon name="search" size={17} />
              <input name="q" key={search} defaultValue={search} placeholder={searchPlaceholder} aria-label="بحث" className="flex-1 min-w-0 bg-transparent outline-none text-ink text-[13.5px]" />
              <span className="ms-auto mono text-[11px] hidden md:inline">↵</span>
            </form>
          )}
          <div className="ms-auto flex items-center gap-1">
            {actions}
            <UserMenu me={me} A={A} nav={nav} className="lg:hidden">
              <Av src={me.img} name={me.name} size={32} />
            </UserMenu>
          </div>
        </header>
        <div className="os-body">{children}</div>
      </div>
      <nav className="os-bottom lg:hidden">
        {Object.entries(WS).map(([k, w]) => <Link key={k} to={w.to} className={k === ws ? 'on' : ''}><Icon name={w.icon} size={20} /><span>{w.label}</span></Link>)}
        <button type="button" onClick={() => setMenu(true)}><Icon name="menu" size={20} /><span>القائمة</span></button>
      </nav>
      {menu && (
        <>
          <div className={`scrim ${drawerIn ? 'open' : ''}`} onClick={() => setMenu(false)} />
          <div className={`sheet side os-drawer !w-[310px] ${drawerIn ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="القائمة" dir="rtl" style={{ transform: drawerIn ? 'none' : 'translateX(-100%)' }}>
            <div className="h-full flex flex-col">
              <div className="flex gap-1 p-3 border-b hair flex-none overflow-x-auto no-sb">
                {Object.entries(WS).map(([k, w]) => <Link key={k} to={w.to} className={`chip chip-sm flex-none ${k === ws ? 'on' : ''}`}><Icon name={w.icon} size={15} />{w.label}</Link>)}
                <button type="button" className="icon-btn ms-auto -me-1" onClick={() => setMenu(false)} aria-label="إغلاق"><Icon name="close" size={18} /></button>
              </div>
              <div className="flex-1 min-h-0">{sidebar}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ───────────── UI kit (O.* in the reference)
const TONES = ['gray', 'ink', 'red', 'green', 'amber'];
// O.badge(text, tone)
export const Osb = ({ tone = 'gray', children, className = '', style, ...p }) => <span className={`osb osb-${TONES.includes(tone) ? tone : 'gray'} ${className}`} style={style} {...p}>{children}</span>;
export const STATUS_TONE = { live: 'green', draft: 'gray', reserved: 'amber', sold: 'ink' };
export const StatusBadge = ({ status, label }) => <Osb tone={STATUS_TONE[status] || 'gray'}>{label || (STATUS[status] ? STATUS[status][0] : status)}</Osb>;

// O.page({ title, sub, actions, crumbs })
export const PageTitle = ({ children, sub, action, crumbs }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
    <div className="min-w-0">
      {crumbs && <div className="mb-2 flex items-center gap-1.5 text-[13px] text-ink-500 min-w-0">{crumbs.map(([label, to], i) => <span key={i} className="inline-flex items-center gap-1.5 min-w-0">{i > 0 && <Icon name="chev" size={13} className="flip-rtl text-ink-300" />}{to ? <Link to={to} className="hover:text-ink font-medium whitespace-nowrap">{label}</Link> : <span className="font-semibold text-ink clamp-1">{label}</span>}</span>)}</div>}
      <h1 className="t-h2 text-[24px] sm:text-[28px]">{children}</h1>
      {sub && <p className="text-ink-500 text-[14px] mt-1">{sub}</p>}
    </div>
    {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
  </div>
);

// O.kpi({ label, value, sub, icon, tone, href })
export const Kpi = ({ label, value, sub, icon, tone, onClick, to }) => {
  const cls = `os-card p-4 flex flex-col gap-2 text-start ${onClick || to ? 'hover:border-ink-300 transition-colors cursor-pointer' : ''}`;
  const body = <>
    <div className="flex items-center justify-between gap-2"><span className="text-[12.5px] text-ink-500 font-medium clamp-1">{label}</span>{icon && <span className={tone === 'red' ? 'text-red' : 'text-ink-300'}><Icon name={icon} size={17} /></span>}</div>
    <div className={`text-[24px] font-semibold num leading-none ${tone === 'red' ? 'text-red' : ''}`}>{value}</div>
    {sub && <div className="text-[12px] text-ink-500 flex items-center gap-2">{sub}</div>}
  </>;
  if (to) return <Link to={to} className={cls}>{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{body}</button>;
  return <div className={cls}>{body}</div>;
};

// Section card (W.card / H.card in the reference)
export const OsCard = ({ title, sub, extra, children, className = '', pad = 'p-4 sm:p-5', id, style }) => (
  <section id={id} className={`os-card ${pad} min-w-0 ${className}`} style={style}>
    {(title || extra) && <div className="flex items-start justify-between gap-3 mb-3 min-w-0"><div className="min-w-0">{title && <h2 className="font-semibold text-[15px] min-w-0">{title}</h2>}{sub && <p className="lbl mt-0.5">{sub}</p>}</div>{extra && <div className="flex-none">{extra}</div>}</div>}
    {children}
  </section>
);

// O.tabs([[key, label, count]], active)
export const OsTabs = ({ items, active, onChange, className = '' }) => (
  <div className={`flex gap-1 overflow-x-auto no-sb border-b hair mb-5 ${className}`} role="tablist">
    {items.map(([k, label, c]) => <button type="button" role="tab" aria-selected={k === active} key={k} onClick={() => onChange(k)} className={`os-tab ${k === active ? 'on' : ''}`}>{label}{c != null && <span className="os-cnt">{c}</span>}</button>)}
  </div>
);

// O.empty(icon, title, text, action)
export const OsEmpty = ({ icon = 'search', title, children, action, className = '' }) => (
  <div className={`os-card p-10 text-center ${className}`}>
    <div className="w-12 h-12 mx-auto rounded-full bg-paper-2 inline-flex items-center justify-center text-ink-400"><Icon name={icon} size={22} /></div>
    {title && <div className="font-semibold mt-3">{title}</div>}
    {children && <p className="text-[13.5px] text-ink-500 mt-1 max-w-md mx-auto">{children}</p>}
    {action && <div className="mt-4 flex justify-center gap-2">{action}</div>}
  </div>
);

// O.table: os-card > overflow-x-auto > table.os-tbl
export const OsTable = ({ head, children, dense = true, min, className = '', inCard = false }) => (
  <div className={inCard ? `overflow-hidden -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 border-t hair ${className}` : `os-card overflow-hidden ${className}`}>
    <div className="overflow-x-auto">
      <table className={`os-tbl ${dense ? 'dense' : ''}`} style={min ? { minWidth: min } : undefined}>
        <thead><tr>{head.map((h, i) => (typeof h === 'string' || h == null ? <th key={i}>{h}</th> : <th key={i} className={h.cls || ''} style={h.w ? { width: h.w } : undefined}>{h.label}</th>))}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  </div>
);

// O.lmini: thumbnail + title + mono id · sub
export const Lmini = ({ img, title, id, sub, to, onClick, className = '' }) => {
  const inner = <>
    <Img src={img} className="w-10 h-8 rounded-[8px] flex-none" />
    <span className="min-w-0"><span className="block text-[13px] font-semibold clamp-1">{title}</span><span className="block text-[11.5px] text-ink-500 clamp-1">{id && <span className="mono">{id}</span>}{id && sub ? ' · ' : ''}{sub}</span></span>
  </>;
  const cls = `inline-flex items-center gap-2.5 min-w-0 text-start ${className}`;
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
  return <span className={cls}>{inner}</span>;
};

// Stat tile (inventory `stat`)
export const Stat = ({ label, value, sub, className = '' }) => (
  <div className={`p-3 rounded-[12px] bg-paper-2 min-w-0 ${className}`}><div className="text-[11.5px] text-ink-500 clamp-1">{label}</div><div className="text-[19px] font-semibold num mt-0.5">{value}</div>{sub && <div className="text-[11.5px] text-ink-500 mt-0.5 clamp-2">{sub}</div>}</div>
);

// Toggle row (F.sw)
export const SwRow = ({ label, sub, children, className = '' }) => (
  <div className={`flex items-center justify-between gap-4 py-2.5 ${className}`}><span className="min-w-0"><span className="block text-[13.5px] font-semibold">{label}</span>{sub && <span className="block text-[12px] text-ink-500 mt-0.5">{sub}</span>}</span><span className="flex-none">{children}</span></div>
);

// Notice strip (K.note)
export const Note = ({ tone = '', icon = 'info', children, className = '' }) => (
  <div className={`flex items-start gap-2.5 p-3.5 rounded-[12px] border text-[13px] ${tone === 'amber' ? 'border-[#EAD9B5] bg-[#FBF3E2] text-[#6B4708]' : tone === 'red' ? 'border-red-100 bg-red-50 text-red-700' : tone === 'green' ? 'bg-[#EAF4EE] text-[#1F7A4D]' : 'hair bg-white text-ink-600'} ${className}`} style={tone === 'green' ? { borderColor: '#D5E8DB' } : undefined}><Icon name={icon} size={16} className="flex-none mt-0.5 opacity-70" /><span className="min-w-0">{children}</span></div>
);

// Legacy table helpers kept for the CRM pages (CSS grid rows) — values now follow .os-tbl / .os-card metrics.
export const TABLE = { background: '#fff', border: '1px solid #e7e7e3', borderRadius: 16, overflow: 'hidden' };
export const thead = (cols) => ({ display: 'grid', gridTemplateColumns: cols, gap: 12, padding: '10px 14px', borderBottom: '1px solid #e7e7e3', fontSize: 11.5, color: '#767a83', fontWeight: 600, background: '#fafaf8', whiteSpace: 'nowrap' });
export const trow = (cols) => ({ display: 'grid', gridTemplateColumns: cols, gap: 12, alignItems: 'center', padding: '11px 14px', borderBottom: '1px solid #e7e7e3', fontSize: 13.5 });
export const ScrollX = ({ children, min = 900 }) => <div style={{ overflowX: 'auto' }}><div style={{ minWidth: min }}>{children}</div></div>;
export const editBtn = { height: 32, borderRadius: 10, border: '1px solid #d8d8d3', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', padding: '0 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#1d1e22' };
