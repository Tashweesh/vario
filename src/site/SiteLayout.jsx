import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSite } from './SiteData.jsx';
import { useLayout } from '../lib/hooks.js';
import { IconGlobe, IconHeart, IconHome, IconKey, IconMap, IconMenu, IconTag, LogoMark, Spinner, Btn } from '../components/ui.jsx';

const navBtn = { height: 40, padding: '0 12px', borderRadius: 999, border: 0, background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: 14.5, whiteSpace: 'nowrap' };
const menuRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', border: 0, borderBottom: '1px solid #e7e7e3', background: 'transparent', fontSize: 19, fontWeight: 600, cursor: 'pointer', textAlign: 'start', width: '100%' };

export default function SiteLayout() {
  const S = useSite();
  const L = useLayout();
  const nav = useNavigate();
  const loc = useLocation();
  const [menu, setMenu] = useState(false);

  useEffect(() => { setMenu(false); window.scrollTo(0, 0); }, [loc.pathname]);
  const go = (p) => () => nav(p);

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#fff', position: 'relative' }}>
      {S.ready && S.settings.announcement && (
        <div style={{ background: '#c8102e', color: '#fff', textAlign: 'center', fontSize: 13.5, fontWeight: 600, padding: '9px 16px' }}>{S.settings.announcement}</div>
      )}
      <header style={{ position: 'sticky', top: 0, zIndex: 60, height: 72, background: 'rgba(255,255,255,.96)', backdropFilter: 'blur(14px)', borderBottom: '1px solid #e7e7e3' }}>
        <div style={{ maxWidth: 1360, margin: '0 auto', padding: `0 ${L.padX}px`, height: '100%', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginInlineEnd: 20, color: '#1d1e22' }} dir="ltr" aria-label="VAIRO">
            <LogoMark /><span style={{ fontWeight: 700, fontSize: 19, letterSpacing: '.02em' }}>VAIRO</span>
          </Link>
          {L.wide && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button className="h-bg" style={navBtn} onClick={go('/buy')}>شراء</button>
              <button className="h-bg" style={navBtn} onClick={go('/rent')}>إيجار</button>
              <button className="h-bg" style={navBtn} onClick={go('/projects')}>مشاريع جديدة</button>
              <button className="h-bg" style={navBtn} onClick={go('/areas')}>اكتشف أربيل</button>
              <button className="h-bg" style={navBtn} onClick={go('/invest')}>استثمار</button>
              <button className="h-bg" style={navBtn} onClick={go('/sell')}>بيع / أجّر عقارك</button>
              <button className="h-bg" style={{ ...navBtn, color: '#767a83' }} onClick={go('/tools')}>الأدوات</button>
            </nav>
          )}
          <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
            <button className="h-bg" onClick={go('/saved')} aria-label="المحفوظات" style={{ width: 40, height: 40, borderRadius: 999, border: 0, background: 'transparent', cursor: 'pointer', position: 'relative', display: 'grid', placeItems: 'center' }}>
              <IconHeart />
              <span style={{ position: 'absolute', top: 4, insetInlineEnd: 4, minWidth: 16, height: 16, borderRadius: 999, background: '#c8102e', color: '#fff', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center', padding: '0 4px' }}>{S.saved.length}</span>
            </button>
            {!L.phone && (
              <>
                <button className="h-bg" onClick={S.toggleCurrency} title="تغيير العملة" style={{ ...navBtn, fontSize: 13 }}>{S.currency === 'USD' ? 'دينار' : 'دولار'}</button>
                <button className="h-bg" title="النسخة الإنجليزية قريباً" style={{ ...navBtn, fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 6, color: '#9da0a7', cursor: 'default' }}><IconGlobe />English</button>
                <button onClick={go('/contact')} style={{ height: 40, padding: '0 16px', borderRadius: 12, border: 0, background: '#1d1e22', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13.5, marginInlineStart: 8, whiteSpace: 'nowrap' }}>تواصل ويّا ڤايرو</button>
              </>
            )}
            {!L.wide && (
              <button onClick={() => setMenu((m) => !m)} aria-label="القائمة" aria-expanded={menu} style={{ width: 40, height: 40, borderRadius: 999, border: 0, background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><IconMenu /></button>
            )}
          </div>
        </div>
      </header>

      {menu && (
        <div style={{ position: 'fixed', top: 72, insetInline: 0, bottom: 0, zIndex: 70, background: '#fff', padding: 16, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Btn kind="dark" h={46} fs={14.5} onClick={go('/buy')}>شراء</Btn>
            <Btn kind="dark" h={46} fs={14.5} onClick={go('/rent')}>إيجار</Btn>
            <Btn h={46} fs={14.5} onClick={() => nav('/sell?mode=sale')}>بيع عقاري</Btn>
            <Btn h={46} fs={14.5} onClick={() => nav('/sell?mode=rent')}>أجّر عقاري</Btn>
          </div>
          {[['/projects', 'مشاريع جديدة'], ['/areas', 'اكتشف أربيل'], ['/invest', 'استثمار'], ['/tools', 'الأدوات'], ['/contact', 'تواصل ويّا ڤايرو']].map(([p, t]) => (
            <button key={p} style={menuRow} onClick={go(p)}>{t}<span style={{ color: '#9da0a7' }}>›</span></button>
          ))}
          {L.phone && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Btn onClick={S.toggleCurrency}>{S.currency === 'USD' ? 'الأسعار بالدينار' : 'الأسعار بالدولار'}</Btn>
            </div>
          )}
        </div>
      )}

      <main style={{ maxWidth: 1360, margin: '0 auto', padding: `0 ${L.padX}px 80px` }}>
        {S.error ? (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 18 }}>تعذّر تحميل البيانات</div>
            <div style={{ color: '#767a83', marginTop: 6, fontSize: 14 }}>{S.error}</div>
            <Btn kind="dark" style={{ marginTop: 16 }} onClick={S.reload}>إعادة المحاولة</Btn>
          </div>
        ) : S.ready ? <Outlet /> : <Spinner pad={140} />}
      </main>

      <Footer padX={L.padX} />

      {L.phone && <BottomNav path={loc.pathname} go={go} />}
    </div>
  );
}

function Footer({ padX }) {
  const S = useSite();
  const col = (title, links) => (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#5a5e68' }}>
        {links.map(([t, to]) => <Link key={t} to={to} style={{ color: '#5a5e68' }}>{t}</Link>)}
      </div>
    </div>
  );
  const wa = S.ready ? `https://wa.me/${(S.settings.office_whatsapp || '').replace(/\D/g, '')}` : '#';
  return (
    <footer style={{ background: '#f6f6f4', borderTop: '1px solid #e7e7e3' }}>
      <div style={{ maxWidth: 1360, margin: '0 auto', padding: `48px ${padX}px 32px` }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 32 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }} dir="ltr"><LogoMark /><span style={{ fontWeight: 700, fontSize: 19 }}>VAIRO</span></div>
            <p style={{ color: '#5a5e68', margin: '18px 0 0', maxWidth: 360, fontSize: 14.5, lineHeight: 1.7 }}>ڤايرو شركة وساطة عقارية بأربيل. نساعد الناس يشترون ويأجرون ويبيعون ويأجّرون عقاراتهم ويستثمرون، وكل طلب يتابعه فريقنا مباشرة.</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
              <Link to="/contact"><Btn kind="dark" h={38} r={10} px={14} fs={13}>تواصل ويّا ڤايرو</Btn></Link>
              <a href={wa} target="_blank" rel="noreferrer"><Btn h={38} r={10} px={14} fs={13}>WhatsApp</Btn></a>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 24, fontSize: 14, gridColumn: 'span 2' }}>
            {col('شراء', [['شقق', '/buy?type=apartment'], ['بيوت', '/buy?type=house'], ['فلل وتاون هاوس', '/buy?type=villa'], ['أراضي', '/buy?type=land'], ['تجاري', '/buy?type=commercial'], ['عقارات بالتقسيط', '/buy?pay=installments']])}
            {col('إيجار', [['شقق', '/rent?type=apartment'], ['بيوت', '/rent?type=house'], ['مفروشة', '/rent?furn=furnished'], ['مكاتب', '/rent?type=commercial'], ['محلات ومعارض', '/rent?type=commercial']])}
            {col('مشاريع جديدة', [['مجمعات سكنية', '/projects?type=compound'], ['أبراج سكنية', '/projects?type=tower'], ['مجمعات فلل', '/projects?type=villas'], ['المطوّرون', '/developers'], ['مستكشف البرج', '/tools/tower']])}
            {col('اكتشف أربيل', [['كل المناطق', '/areas'], ['خريطة العقارات', '/map'], ['الأدلة', '/guides'], ['أطلس العقار', '/tools/atlas']])}
            {col('للملاك', [['بيع عقارك', '/sell?mode=sale'], ['أجّر عقارك', '/sell?mode=rent'], ['استثمار', '/invest'], ['تواصل', '/contact']])}
          </div>
        </div>
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #e7e7e3', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 12, color: '#767a83' }}>
          <div>© {new Date().getFullYear()} VAIRO Real Estate · أربيل، إقليم كوردستان العراق</div>
          <Link to="/login" style={{ color: '#767a83' }}>دخول الفريق</Link>
        </div>
      </div>
    </footer>
  );
}

function BottomNav({ path, go }) {
  const items = [['/', 'الرئيسية', <IconHome key="h" />], ['/buy', 'شراء', <IconTag key="t" />], ['/rent', 'إيجار', <IconKey key="k" />], ['/map', 'الخريطة', <IconMap key="m" />], ['/saved', 'المحفوظ', <IconHeart key="s" size={21} />]];
  return (
    <nav style={{ position: 'sticky', bottom: 0, zIndex: 55, background: 'rgba(255,255,255,.97)', borderTop: '1px solid #e7e7e3', display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', height: 60, fontSize: 10.5, fontWeight: 600 }}>
      {items.map(([p, t, icon]) => (
        <button key={p} onClick={go(p)} style={{ border: 0, background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer', color: path === p ? '#1d1e22' : '#767a83', whiteSpace: 'nowrap' }}>{icon}{t}</button>
      ))}
    </nav>
  );
}
