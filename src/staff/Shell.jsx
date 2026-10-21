import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useViewport } from '../lib/hooks.js';
import { ROLE_AR } from '../lib/format.js';
import { IconSearch, LogoMark, Spinner } from '../components/ui.jsx';

// Requires a signed-in team member; otherwise sends to /login?next=…
export function StaffGate({ children }) {
  const A = useAuth();
  const loc = useLocation();
  if (A.loading) return <Spinner pad={160} />;
  if (!A.session || !A.me) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return children;
}

const navItem = { display: 'flex', alignItems: 'center', gap: 10, height: 40, padding: '0 12px', borderRadius: 10, border: 0, background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 600, textAlign: 'start', color: '#1d1e22', whiteSpace: 'nowrap' };
export const Dot6 = () => <span style={{ width: 6, height: 6, borderRadius: 999, background: '#c8102e', flex: 'none' }} />;

// Sidebar + top bar shared by the CMS and the CRM.
// items: [{ to, label, match?, badge?, count?, section? }]
export function Shell({ sub, items, switchTo, search, onSearch, searchPlaceholder, actions, children }) {
  const A = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const { w } = useViewport();
  const [menu, setMenu] = useState(false);
  const narrow = w < 900;
  const active = (it) => (it.match ? it.match(loc.pathname) : loc.pathname === it.to);
  const me = A.me;

  return (
    <div dir="rtl" style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '240px minmax(0,1fr)', minHeight: '100vh', background: '#f6f6f4' }}>
      <aside style={narrow
        ? { background: '#fff', borderBottom: '1px solid #e7e7e3', padding: '10px 12px', display: 'flex', gap: 4, alignItems: 'center', overflowX: 'auto', position: 'sticky', top: 0, zIndex: 40 }
        : { background: '#fff', borderInlineEnd: '1px solid #e7e7e3', padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: narrow ? '0 6px 0 10px' : '4px 10px 18px', flex: 'none' }} dir="ltr">
          <LogoMark size={30} /><div><div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.1 }}>VAIRO</div><div style={{ fontSize: 11, color: '#767a83' }}>{sub}</div></div>
        </div>
        {items.map((it, i) => it.section
          ? (!narrow && <div key={i} style={{ fontSize: 11, fontWeight: 600, color: '#9da0a7', padding: '14px 12px 4px', letterSpacing: '.04em' }}>{it.section}</div>)
          : (
            <button key={it.to} className="h-bg" style={{ ...navItem, flex: 'none', background: narrow && active(it) ? '#f6f6f4' : 'transparent' }} onClick={() => nav(it.to)} aria-current={active(it) ? 'page' : undefined}>
              {active(it) && <Dot6 />}{it.label}
              {it.count != null && <span style={{ marginInlineStart: 'auto', fontSize: 12, color: '#767a83', fontWeight: 500 }}>{it.count}</span>}
              {it.badge > 0 && <span style={{ marginInlineStart: 'auto', height: 20, minWidth: 20, padding: '0 6px', borderRadius: 999, background: '#c8102e', color: '#fff', fontSize: 11, fontWeight: 700, display: 'inline-grid', placeItems: 'center' }}>{it.badge}</span>}
            </button>
          ))}
        <div style={narrow ? { display: 'flex', gap: 4, marginInlineStart: 'auto', flex: 'none' } : { marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {switchTo && <button onClick={() => nav(switchTo.to)} style={{ ...navItem, border: '1px solid #e7e7e3', background: '#fff', fontSize: 13.5 }}>↗ {switchTo.label}</button>}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenu(!menu)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: narrow ? '4px 8px' : '10px 12px', border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'start', width: '100%', borderRadius: 10 }} className="h-bg">
              {me.img ? <img src={me.img} alt="" style={{ width: 32, height: 32, borderRadius: 999, objectFit: 'cover' }} /> : <span style={{ width: 32, height: 32, borderRadius: 999, background: '#1d1e22', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13 }}>{me.name[0]}</span>}
              {!narrow && <div style={{ fontSize: 13 }}><div style={{ fontWeight: 600 }}>{me.name}</div><div style={{ color: '#767a83', fontSize: 11.5 }}>{ROLE_AR[me.role]}</div></div>}
            </button>
            {menu && (
              <div style={{ position: 'absolute', bottom: narrow ? 'auto' : '100%', top: narrow ? '100%' : 'auto', insetInlineStart: 0, minWidth: 200, background: '#fff', border: '1px solid #e7e7e3', borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,.12)', padding: 6, zIndex: 50 }}>
                <div style={{ padding: '8px 10px', fontSize: 12, color: '#767a83' }} dir="ltr">{me.email}</div>
                <button className="h-bg" style={{ ...navItem, width: '100%', fontSize: 13.5 }} onClick={() => nav('/')}>عرض الموقع</button>
                <button className="h-bg" style={{ ...navItem, width: '100%', fontSize: 13.5, color: '#c8102e' }} onClick={async () => { await A.signOut(); nav('/login'); }}>تسجيل الخروج</button>
              </div>
            )}
          </div>
        </div>
      </aside>
      <div style={{ padding: narrow ? '16px 14px 60px' : '24px 32px 60px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {onSearch && (
            <form onSubmit={(e) => { e.preventDefault(); onSearch(new FormData(e.currentTarget).get('q')); }} style={{ flex: 1, maxWidth: 420, minWidth: 200, height: 40, border: '1px solid #e7e7e3', borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', color: '#9da0a7' }}>
              <IconSearch size={16} />
              <input name="q" key={search} defaultValue={search} placeholder={searchPlaceholder} aria-label="بحث" style={{ border: 0, outline: 0, flex: 1, fontSize: 13.5, background: 'transparent', color: '#1d1e22', minWidth: 0 }} />
            </form>
          )}
          <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>
        </div>
        {children}
      </div>
    </div>
  );
}

// Table helpers (CMS/CRM lists use CSS grid rows like the design).
export const TABLE = { background: '#fff', border: '1px solid #e7e7e3', borderRadius: 16, overflow: 'hidden' };
export const thead = (cols) => ({ display: 'grid', gridTemplateColumns: cols, gap: 12, padding: '10px 18px', borderBottom: '1px solid #e7e7e3', fontSize: 12, color: '#767a83', fontWeight: 600, background: '#fafaf8' });
export const trow = (cols) => ({ display: 'grid', gridTemplateColumns: cols, gap: 12, alignItems: 'center', padding: '10px 18px', borderBottom: '1px solid #f0f0ed', fontSize: 13.5 });
export const ScrollX = ({ children, min = 900 }) => <div style={{ overflowX: 'auto' }}><div style={{ minWidth: min }}>{children}</div></div>;
export const PageTitle = ({ children, sub, action }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
    <div><h1 style={{ fontSize: 26, fontWeight: 600, margin: 0 }}>{children}</h1>{sub && <div style={{ fontSize: 13, color: '#767a83', marginTop: 4 }}>{sub}</div>}</div>
    {action && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{action}</div>}
  </div>
);
export const editBtn = { height: 30, borderRadius: 8, border: '1px solid #d8d8d3', background: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', padding: '0 10px' };
