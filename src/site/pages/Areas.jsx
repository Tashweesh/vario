import { useNavigate, useParams } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle, useLayout } from '../../lib/hooks.js';
import { Btn } from '../../components/ui.jsx';
import { CardGrid, Crumbs, H2, PageHead } from '../parts.jsx';
import { MapView } from '../../components/MapView.jsx';
import NotFound from './NotFound.jsx';

export function Areas() {
  useDocTitle('مناطق أربيل');
  const S = useSite();
  const L = useLayout();
  const nav = useNavigate();
  return (
    <section style={{ paddingTop: 28 }}>
      <PageHead kicker="اكتشف أربيل" title="مناطق أربيل" h1Fs={L.h1Fs} sub="كل منطقة بشخصيتها وأسعارها. اختار المنطقة اللي تناسب حياتك قبل ما تختار العقار." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 20, marginTop: 24 }}>
        {S.areas.map((a) => (
          <button key={a.id} className="h-shadow-lg" onClick={() => nav(a.href)} style={{ textAlign: 'start', border: '1px solid #e7e7e3', borderRadius: 20, overflow: 'hidden', background: '#fff', cursor: 'pointer', padding: 0 }}>
            <div style={{ aspectRatio: '16/9', background: '#f6f6f4' }}>{a.img && <img src={a.img} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}</div>
            <div style={{ padding: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 17 }}>{a.name}</div><div style={{ fontSize: 13, color: '#767a83', marginTop: 2 }}>{a.vibe}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid #e7e7e3', fontSize: 13 }}>
                <div><div style={{ color: '#767a83', fontSize: 11.5 }}>متوسط سعر المتر</div><div style={{ fontWeight: 600 }} dir="ltr">{a.ppmText}</div></div>
                <div style={{ textAlign: 'end' }}><div style={{ color: '#767a83', fontSize: 11.5 }}>عقارات</div><div style={{ fontWeight: 600 }}>{a.saleCount} للبيع · {a.rentCount} للإيجار</div></div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export function Area() {
  const { id } = useParams();
  const S = useSite();
  const L = useLayout();
  const nav = useNavigate();
  const a = S.areaById(id);
  useDocTitle(a?.name);
  if (!a) return <NotFound what="المنطقة" />;
  return (
    <section style={{ paddingTop: 28 }}>
      <Crumbs items={[['الرئيسية', '/'], ['المناطق', '/areas'], [a.name]]} />
      <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', height: L.heroImgH, marginTop: 14, background: '#f6f6f4' }}>
        {a.img && <img src={a.img} alt={a.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.6),transparent 55%)' }} />
        <div style={{ position: 'absolute', bottom: 24, insetInline: 24, color: '#fff' }}>
          <div style={{ fontSize: 13, opacity: 0.85 }}>{a.vibe}</div>
          <h1 style={{ fontSize: L.h1Fs, fontWeight: 600, margin: '6px 0 0' }}>{a.name}</h1>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>{(a.tags || []).map((t) => <span key={t} style={{ height: 26, padding: '0 10px', borderRadius: 999, background: 'rgba(255,255,255,.2)', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{t}</span>)}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: L.sideCols, gap: 40, marginTop: 28, alignItems: 'start' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ color: '#3f424a', lineHeight: 1.85, margin: 0, fontSize: 16 }}>{a.desc}</p>
          <H2 m="36px 0 14px">هوية المنطقة</H2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '10px 28px' }}>
            {a.dnaRows.map((r) => (
              <div key={r.lab}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}><span>{r.lab}</span><span style={{ color: '#767a83' }}>{r.v}/10</span></div>
                <div style={{ marginTop: 6, height: 6, borderRadius: 999, background: '#eeeeeb', overflow: 'hidden' }}><div style={{ height: '100%', width: r.w, background: '#1d1e22' }} /></div>
              </div>
            ))}
          </div>
          <H2 m="36px 0 14px">عقارات في {a.short}</H2>
          <CardGrid list={a.listings} min={230} gap={16} empty="لا توجد عقارات معروضة في هذه المنطقة حالياً" />
          {a.projs.length > 0 && (
            <>
              <H2 m="36px 0 14px">مشاريع في {a.short}</H2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {a.projs.map((p) => (
                  <button key={p.id} onClick={() => nav(p.href)} style={{ textAlign: 'start', display: 'flex', alignItems: 'center', gap: 14, padding: 10, border: '1px solid #e7e7e3', borderRadius: 16, background: '#fff', cursor: 'pointer' }}>
                    {p.img && <img src={p.img} alt="" style={{ width: 72, height: 56, borderRadius: 10, objectFit: 'cover' }} />}
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: 12.5, color: '#767a83' }}>{p.typeAr} · {p.statusLabel} · التسليم {p.handover}</div></div>
                    <div style={{ fontWeight: 600 }} dir="ltr">{p.fromText}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12, position: L.asidePos, top: 92 }}>
          <div style={{ border: '1px solid #e7e7e3', borderRadius: 18, padding: 20 }}>
            <div style={{ fontSize: 12, color: '#767a83' }}>متوسط سعر المتر للبيع</div><div style={{ fontSize: 28, fontWeight: 700, marginTop: 2 }} dir="ltr">{a.ppmText}</div>
            <div style={{ fontSize: 12, color: '#767a83', marginTop: 14 }}>متوسط الإيجار</div><div style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>{a.rentText}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
              <Btn kind="dark" h={42} onClick={() => nav(`/buy?area=${a.id}`)}>{a.saleCount} للبيع</Btn>
              <Btn h={42} onClick={() => nav(`/rent?area=${a.id}`)}>{a.rentCount} للإيجار</Btn>
            </div>
          </div>
          <MapView height={160} style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid #e7e7e3' }} interactive={false} center={a.pos} zoom={13} markers={[{ id: a.id, kind: 'dot', lat: a.pos.lat, lng: a.pos.lng, interactive: false }]}>
            <button onClick={() => nav(`/map?area=${a.id}`)} aria-label="افتح الخريطة" style={{ position: 'absolute', inset: 0, zIndex: 900, background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }} />
            <span style={{ position: 'absolute', bottom: 10, insetInlineStart: 10, zIndex: 901, pointerEvents: 'none', fontSize: 12, fontWeight: 600, background: '#fff', padding: '4px 8px', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>افتح الخريطة</span>
          </MapView>
        </aside>
      </div>
    </section>
  );
}
