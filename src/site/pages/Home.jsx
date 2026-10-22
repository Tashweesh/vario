import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle, useLayout } from '../../lib/hooks.js';
import { TYPE_GROUPS, count, starSplit } from '../../lib/format.js';
import { Btn, IconSearch } from '../../components/ui.jsx';
import { CardGrid, SectionHead } from '../parts.jsx';
import { MapView, esc } from '../../components/MapView.jsx';

const CAT_ICONS = {
  apartment: 'M6 21V5l6-2 6 2v16M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1',
  house: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  villa: 'M2 20h20M4 20V10l5-4 5 4v10M14 20v-7h6v7M7 13h2',
  land: 'M3 17l6-3 6 3 6-3v4l-6 3-6-3-6 3zM3 10l6-3 6 3 6-3',
  commercial: 'M4 10h16v10H4zM4 10l2-5h12l2 5M10 20v-5h4v5',
  compound: 'M3 21V9l5-3v15M8 21V12l5-3v12M13 21V13l8-4v12M3 21h18',
};
const searchLabel = { display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px 18px', minHeight: 64, borderInlineEnd: '1px solid #e7e7e3' };
const searchCap = { fontSize: 12, fontWeight: 600, color: '#767a83' };
const searchSel = { border: 0, outline: 0, fontSize: 15, fontWeight: 500, padding: '2px 0', background: 'transparent', width: '100%' };
const catBtn = { textAlign: 'start', padding: 18, borderRadius: 18, border: '1px solid #e7e7e3', background: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 14 };
const toolBtn = { textAlign: 'start', padding: 20, borderRadius: 18, border: '1px solid #e7e7e3', background: '#fff', cursor: 'pointer' };
const popChip = { height: 32, padding: '0 12px', borderRadius: 999, border: '1px solid #d8d8d3', background: '#fff', fontSize: 13, cursor: 'pointer', flex: 'none', whiteSpace: 'nowrap' };

export default function Home() {
  useDocTitle('');
  const S = useSite();
  const L = useLayout();
  const nav = useNavigate();
  const [deal, setDeal] = useState('sale');
  const [f, setF] = useState({ q: '', type: '', max: '', pay: '' });
  const sec = { types: true, featured: true, areas: true, tools: true, owners: true, ...(S.settings.sections || {}) };

  const search = () => {
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => v && !(deal === 'rent' && k === 'pay') && p.set(k, v));
    nav(`/${deal === 'rent' ? 'rent' : 'buy'}${p.toString() ? '?' + p : ''}`);
  };
  const maxOpts = deal === 'rent' ? [500, 1000, 1500, 2500, 4000] : [75000, 100000, 150000, 250000, 400000, 600000];

  const cnt = (types) => S.live.filter((l) => types.includes(l.type)).length;
  const cats = [
    ...TYPE_GROUPS.map(([k, label, types]) => ({ k, label, n: count(cnt(types), 'listing'), to: k === 'commercial' ? '/rent?type=commercial' : `/buy?type=${k}` })),
    { k: 'compound', label: 'مجمعات', n: count(S.projs.filter((p) => p.type === 'compound').length, 'project'), to: '/projects?type=compound' },
    { k: 'installments', label: 'تقسيط', n: count(S.live.filter((l) => l.isInstall).length, 'listing'), to: '/buy?pay=installments' },
    { k: 'ready', label: 'جاهز للسكن', n: count(S.live.filter((l) => l.type !== 'land' && (!l.project || l.project.status === 'ready')).length, 'listing'), to: '/buy?pay=ready' },
  ];

  return (
    <section style={{ paddingTop: 48 }}>
      <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', color: '#767a83', display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 18, height: 1, background: '#c8102e' }} />{S.settings.hero_kicker}<span style={{ width: 18, height: 1, background: '#c8102e' }} /></div>
        <h1 style={{ fontSize: L.heroFs, fontWeight: 700, lineHeight: 1.15, margin: '16px 0 0', letterSpacing: '-.01em' }}>
          {starSplit(S.settings.hero_title).map((s, i) => (s.hl ? <span key={i} style={{ color: '#c8102e' }}>{s.t}</span> : <span key={i}>{s.t}</span>))}
        </h1>
        <p style={{ fontSize: 17, color: '#5a5e68', margin: '16px auto 0', maxWidth: 640, lineHeight: 1.75 }}>بيوت وأراضي ومساحات تجارية بكل أربيل، للبيع وللإيجار، ويا كل المعلومات واضحة، ومستشار ڤايرو قريب منك بضغطة.</p>
      </div>

      <div style={{ maxWidth: 1080, margin: '32px auto 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', background: '#f6f6f4', borderRadius: 14, padding: 4, gap: 2 }}>
            {[['sale', 'شراء'], ['rent', 'إيجار']].map(([v, t]) => (
              <button key={v} onClick={() => { setDeal(v); setF({ ...f, max: '' }); }} aria-pressed={deal === v} style={{ height: 44, padding: '0 22px', borderRadius: 11, border: 0, background: deal === v ? '#1d1e22' : 'transparent', color: deal === v ? '#fff' : '#1d1e22', fontWeight: 600, fontSize: 15, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, fontSize: 13.5, fontWeight: 600 }}>
            <Btn kind="ghost" r={999} px={12} className="h-bg" onClick={() => nav('/sell?mode=sale')}>بيع</Btn>
            <Btn kind="ghost" r={999} px={12} className="h-bg" onClick={() => nav('/sell?mode=rent')}>أجّر عقارك</Btn>
            <Btn kind="ghost" r={999} px={12} className="h-bg" onClick={() => nav('/invest')}>استثمر</Btn>
          </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); search(); }} style={{ marginTop: 12, background: '#fff', borderRadius: 22, border: '1px solid #e7e7e3', boxShadow: '0 12px 40px rgba(0,0,0,.08)', padding: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', alignItems: 'stretch' }}>
          <label style={searchLabel}><span style={searchCap}>وين</span><input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="منطقة، مشروع، مطوّر أو رقم" style={{ ...searchSel, width: '100%' }} /></label>
          <label style={searchLabel}><span style={searchCap}>النوع</span>
            <select className="sel" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} style={{ ...searchSel, backgroundPosition: 'left 0 center' }}>
              <option value="">أي عقار</option>{TYPE_GROUPS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select></label>
          <label style={searchLabel}><span style={searchCap}>أعلى سعر</span>
            <select className="sel" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} style={{ ...searchSel, backgroundPosition: 'left 0 center' }}>
              <option value="">أي</option>{maxOpts.map((v) => <option key={v} value={v}>{S.money(v)}{deal === 'rent' ? ' / شهر' : ''}</option>)}
            </select></label>
          <label style={{ ...searchLabel, borderInlineEnd: 0 }}><span style={searchCap}>{deal === 'rent' ? 'الفرش' : 'الدفع'}</span>
            {deal === 'rent' ? (
              <select className="sel" value={f.furn || ''} onChange={(e) => setF({ ...f, furn: e.target.value })} style={{ ...searchSel, backgroundPosition: 'left 0 center' }}>
                <option value="">مفروش أو غير مفروش</option><option value="furnished">مفروش</option><option value="unfurnished">غير مفروش</option>
              </select>
            ) : (
              <select className="sel" value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value })} style={{ ...searchSel, backgroundPosition: 'left 0 center' }}>
                <option value="">كاش أو تقسيط</option><option value="cash">كاش</option><option value="installments">تقسيط</option>
              </select>
            )}</label>
          <button type="submit" style={{ minHeight: 58, margin: 4, borderRadius: 16, border: 0, background: '#c8102e', color: '#fff', fontWeight: 600, fontSize: 16, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap' }}><IconSearch />ابحث</button>
        </form>
        <div className="no-scrollbar" style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', overflowX: 'auto', fontSize: 13, paddingBottom: 4 }}>
          <span style={{ color: '#9da0a7', flex: 'none' }}>شائع</span>
          {[['تقسيط', '/buy?pay=installments'], ['فلل جاهزة', '/buy?type=villa&pay=ready'], ['أراضي', '/buy?type=land'], ['أقل من 150 ألف', '/buy?max=150000'], ['بيوت ببختياري', '/buy?type=house&area=bakhtiari']].map(([t, to]) => (
            <button key={t} style={popChip} onClick={() => nav(to)}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 40, position: 'relative', borderRadius: 24, overflow: 'hidden', height: L.bannerH, background: '#f6f6f4' }}>
        <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=2000&q=70" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.45),transparent 60%)' }} />
        <div style={{ position: 'absolute', bottom: 18, insetInline: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, color: '#fff', flexWrap: 'wrap' }}>
          <div><div style={{ fontSize: 13, opacity: 0.85 }}>أربيل، إقليم كوردستان</div><div style={{ fontSize: 22, fontWeight: 600, marginTop: 2 }}>سكن وأراضي ومساحات تجارية — للبيع وللإيجار</div></div>
          <span style={{ fontSize: 11, opacity: 0.75, fontFamily: 'ui-monospace,monospace' }} dir="ltr">36.19°N · 44.01°E</span>
        </div>
      </div>

      {sec.types && (
        <div style={{ marginTop: 56 }}>
          <SectionHead kicker="ابدأ من النوع" title="شنو تدوّر عليه؟" h2Fs={L.h2Fs} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
            {cats.map((c) => (
              <button key={c.k} className="h-shadow" style={catBtn} onClick={() => nav(c.to)}>
                <CatIcon k={c.k} />
                <div><div style={{ fontWeight: 600, fontSize: 15 }}>{c.label}</div><div style={{ fontSize: 12.5, color: '#767a83' }}>{c.n}</div></div>
              </button>
            ))}
          </div>
        </div>
      )}

      {sec.featured && S.featured.length > 0 && (
        <div style={{ marginTop: 56 }}>
          <SectionHead kicker="مختارات" title="عقارات مميزة هذا الأسبوع" h2Fs={L.h2Fs} action={<Btn onClick={() => nav('/buy')}>كل العقارات ←</Btn>} />
          <CardGrid list={S.featured} min={260} />
        </div>
      )}

      {sec.areas && (
        <div style={{ marginTop: 56, display: 'grid', gridTemplateColumns: L.cols2, gap: 24, alignItems: 'stretch' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', color: '#767a83' }}>اكتشف أربيل</div>
            <h2 style={{ fontSize: L.h2Fs, fontWeight: 600, margin: '6px 0 20px' }}>وين تريد تسكن؟</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
              {S.homeAreas.map((a) => (
                <button key={a.id} onClick={() => nav(a.href)} style={{ position: 'relative', aspectRatio: '1', borderRadius: 18, overflow: 'hidden', border: 0, padding: 0, cursor: 'pointer', textAlign: 'start', background: '#f6f6f4' }}>
                  {a.img && <img src={a.img} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.6),transparent 55%)' }} />
                  <div style={{ position: 'absolute', bottom: 12, insetInline: 14, color: '#fff' }}><div style={{ fontWeight: 600, fontSize: 16 }}>{a.short}</div><div style={{ fontSize: 12, opacity: 0.85 }}>{a.total} عقار · {a.ppmText}/م²</div></div>
                </button>
              ))}
            </div>
            <Btn style={{ marginTop: 14 }} onClick={() => nav('/areas')}>كل المناطق ←</Btn>
          </div>
          <MapView height="100%" style={{ minHeight: 360, borderRadius: 24, overflow: 'hidden', border: '1px solid #e7e7e3' }} interactive={false} bounds={S.areas.map((a) => a.pos)} zoom={12} markers={S.areas.map((a) => ({ id: a.id, kind: 'area', lat: a.pos.lat, lng: a.pos.lng, html: `${esc(a.short)} <b>${a.total}</b>`, interactive: false }))}>
            <button onClick={() => nav('/map')} aria-label="افتح الخريطة" style={{ position: 'absolute', inset: 0, zIndex: 900, background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }} />
            <span style={{ position: 'absolute', bottom: 16, insetInlineEnd: 16, zIndex: 901, pointerEvents: 'none', height: 40, padding: '0 16px', borderRadius: 12, background: '#1d1e22', color: '#fff', fontWeight: 600, fontSize: 13.5, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>افتح الخريطة</span>
          </MapView>
        </div>
      )}

      {sec.tools && (
        <div style={{ marginTop: 56 }}>
          <SectionHead kicker="الأدوات" title="قرّر وأنت فاهم" h2Fs={L.h2Fs} action={<Btn onClick={() => nav('/tools')}>كل الأدوات ←</Btn>} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 12 }}>
            {[['/tools/match', 'ڤايرو ماتش', 'شراء أو إيجار أو استثمار — ونرتبلك الأنسب'], ['/tools/budget', 'مستكشف الميزانية', 'شنو أگدر أشتري أو أأجر؟'], ['/tools/rent', 'مختبر الإيجار', 'قدرتك على الإيجار وتكلفة السكن'], ['/tools/payment', 'مختبر الدفع', 'خطط شراءك بالتقسيط'], ['/compare', 'المقارنة', 'جنب بعض، نفس النوع ويا نفس النوع'], ['/tools/tour', 'الجولة الذكية', 'نظّم يوم المعاينات'], ['/tools/tower', 'مستكشف البرج', 'اختار الطابق والوحدة بالشكل'], ['/tools/atlas', 'أطلس العقار', 'أسعار المتر حسب المنطقة']].map(([to, t, d]) => (
              <button key={to} className="h-shadow" style={toolBtn} onClick={() => nav(to)}><div style={{ fontWeight: 600, fontSize: 16 }}>{t}</div><div style={{ fontSize: 13, color: '#767a83', marginTop: 4 }}>{d}</div></button>
            ))}
          </div>
        </div>
      )}

      {sec.owners && (
        <div style={{ marginTop: 56, display: 'grid', gridTemplateColumns: L.cols2, gap: 16 }}>
          <CtaCard bg="#1d1e22" kicker="لأصحاب العقارات" title="بيع عقارك أو أجّره ويا فريق يعرف السوق" btn="استشارة مجانية" fs={L.ctaFs} onClick={() => nav('/sell')} op={0.7} />
          <CtaCard bg="#c8102e" kicker="ڤايرو للاستثمار" title="سيناريوهات، مو وعود." btn="حاسبة العائد" fs={L.ctaFs} onClick={() => nav('/invest')} op={0.8} />
        </div>
      )}
    </section>
  );
}

function CatIcon({ k }) {
  if (k === 'installments') return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1d1e22" strokeWidth="1.6" strokeLinecap="round"><path d="M19 5L5 19" /><circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="17" r="2.5" /></svg>;
  if (k === 'ready') return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1d1e22" strokeWidth="1.6" strokeLinejoin="round"><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 4l3 3M13 7l3 3" /></svg>;
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1d1e22" strokeWidth="1.6" strokeLinejoin="round"><path d={CAT_ICONS[k]} /></svg>;
}

function CtaCard({ bg, kicker, title, btn, fs, onClick, op }) {
  return (
    <button onClick={onClick} style={{ textAlign: 'start', padding: 32, borderRadius: 24, border: 0, background: bg, color: '#fff', cursor: 'pointer', minHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
      <div><div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', opacity: op }}>{kicker}</div><div style={{ fontSize: fs, fontWeight: 600, marginTop: 8, lineHeight: 1.3 }}>{title}</div></div>
      <span style={{ height: 44, padding: '0 18px', borderRadius: 12, background: '#fff', color: '#1d1e22', fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start' }}>{btn}</span>
    </button>
  );
}

