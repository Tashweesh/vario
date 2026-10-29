import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle } from '../../lib/hooks.js';
import { Icon, Img } from '../../components/ui.jsx';
import { CardGrid, Crumbs, ProjCard } from '../parts.jsx';
import { MapView, esc, kmBetween } from '../../components/MapView.jsx';
import NotFound from './NotFound.jsx';

// Ported from the design reference: pages/areas.js (/areas explorer + /area/:id Area DNA).

const DNA_ICON = { 'للعوائل': 'users', 'قرب الخدمات': 'bag', 'مساحات خضراء': 'tree', 'مطاعم ومقاهي': 'fork', 'نمو': 'trend', 'هدوء': 'sun', 'المكانة': 'star' };

// Area card (X.areaCard): image + tags, name, vibe, price boxes with the ppm bar, counts.
export function AreaCard({ a, onHover }) {
  return (
    <article className="card zoom group" dir="rtl" onMouseEnter={() => onHover?.(a.id)} onMouseLeave={() => onHover?.(null)}>
      <Link to={a.href} className="relative block"><Img src={a.img} className="aspect-[16/10]" label={a.short} /><div className="absolute bottom-3 start-3 flex flex-wrap gap-1.5">{(a.tags || []).slice(0, 2).map((t) => <span key={t} className="tag tag-w">{t}</span>)}</div></Link>
      <div className="pt-3 px-0.5">
        <Link to={a.href} className="card-title block text-[18px] font-semibold transition-colors">{a.name}</Link>
        <div className="lbl clamp-1">{a.vibe}</div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="p-3 rounded-[12px] bg-paper-2"><div className="lbl">متوسط سعر المتر</div><div className="font-semibold num text-[15px]" dir="ltr">{a.ppmText}</div><div className="h-1 rounded-full bg-paper-3 mt-2 overflow-hidden"><div className="h-full rounded-full bg-ink" style={{ width: a.barW }} /></div></div>
          <div className="p-3 rounded-[12px] bg-paper-2"><div className="lbl">متوسط الإيجار</div><div className="font-semibold num text-[15px] clamp-1">{a.rentText}</div></div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-[13px]">
          <span className="flex gap-3">
            <Link to={`/buy?area=${a.id}`} className="hover:text-red"><b className="num">{a.saleCount}</b> <span className="text-ink-500">للبيع</span></Link>
            <Link to={`/rent?area=${a.id}`} className="hover:text-red"><b className="num">{a.rentCount}</b> <span className="text-ink-500">للإيجار</span></Link>
          </span>
          <span className="lbl"><Icon name="pin" size={12} className="inline -mt-0.5 me-0.5" />{a.short}</span>
        </div>
      </div>
    </article>
  );
}

export function Areas() {
  useDocTitle('مناطق أربيل');
  const S = useSite();
  const nav = useNavigate();
  const [hot, setHot] = useState(null);
  const sale = S.live.filter((l) => l.deal === 'sale').length, rent = S.live.filter((l) => l.deal === 'rent').length;
  const markers = S.areas.map((a) => ({ id: a.id, kind: 'area', lat: a.pos.lat, lng: a.pos.lng, html: `${esc(a.short)} <b>${a.total}</b>`, active: hot === a.id, onClick: () => nav(a.href), onHover: (m, on) => setHot(on ? a.id : null) }));
  return (
    <>
      <style>{`
        .aq .nm{display:none}
        .map-wrap[data-z=near] .aq .nm,.map-pin.hot .aq .nm,.map-pin:hover .aq .nm{display:inline-flex}
        .map-pin.hot .aq .dot,.map-pin:hover .aq .dot{background:var(--red);transform:scale(1.35)}
        .map-pin.hot .aq .nm{background:var(--ink);color:#fff}
        .ar-row.hl{background:var(--paper2)}
      `}</style>
      <section className="wrap pt-6 lg:pt-8">
        <Crumbs items={[['الرئيسية', '/'], ['اكتشف أربيل', '/areas']]} />
        <div className="grid lg:grid-cols-12 gap-8 mt-5 items-end">
          <div className="lg:col-span-7">
            <div className="eyebrow mb-3">مستكشف المناطق</div>
            <h1 className="t-hero text-[38px] sm:text-[52px] lg:text-[60px]">لگى المنطقة بأربيل <span className="accent">اللي تناسب حياتك.</span></h1>
            <p className="text-[16.5px] text-ink-600 mt-4 max-w-xl">كل منطقة بشخصيتها وأسعارها. اختار المنطقة اللي تناسب حياتك قبل ما تختار العقار — شگد يكلف الشراء والإيجار بكل وحدة، وشنو متوفر عند ڤايرو هسه.</p>
          </div>
          <div className="lg:col-span-5 grid grid-cols-3 gap-2">
            {[[S.areas.length, 'منطقة'], [sale, 'للبيع'], [rent, 'للإيجار']].map(([v, l]) => <div key={l} className="panel-s p-4"><div className="text-[26px] font-semibold num">{v}</div><div className="lbl">{l}</div></div>)}
          </div>
        </div>
      </section>
      <section className="wrap mt-8 pb-16 lg:pb-24">
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
          <div className="lg:col-span-8 order-2 lg:order-1 min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-5"><div><div className="eyebrow mb-2">كل الأحياء</div><h2 className="t-h2 text-[24px] sm:text-[30px]">كل المناطق</h2></div><span className="lbl num">{S.areas.length} منطقة</span></div>
            {S.areas.length ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-x-5 gap-y-8">{S.areas.map((a) => <AreaCard key={a.id} a={a} onHover={setHot} />)}</div>
            ) : (
              <div className="panel-s p-10 text-center"><div className="t-h3 text-[20px]">ماكو مناطق منشورة حالياً</div><p className="text-ink-600 mt-2">اسأل مستشار ڤايرو يساعدك تختار منطقة.</p></div>
            )}
          </div>
          <aside className="lg:col-span-4 order-1 lg:order-2">
            <div className="lg:sticky lg:top-[92px]">
              <div className="relative h-[280px] sm:h-[360px] lg:h-[480px] rounded-[18px] overflow-hidden border hair">
                <MapView height="100%" bounds={S.areas.map((a) => a.pos)} zoom={12} maxZoom={13} markers={markers} scrollZoom={false} />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[12px] text-ink-500"><span className="inline-flex items-center gap-1.5"><span className="pin-price !h-5 !px-2 !text-[10.5px]">الاسم <b className="text-ink-400 font-medium">0</b></span>المنطقة وعدد العروض</span><span className="inline-flex items-center gap-1.5"><Icon name="pin" size={13} />اضغط على منطقة حتى تفتحها</span></div>
              <div className="panel-s p-4 mt-3 hidden lg:block"><div className="font-semibold text-[14px]">محتار من وين تبدي؟</div><p className="text-[13.5px] text-ink-600 mt-1">گول لمستشار ڤايرو شلون تعيش، الدوام والمدارس والميزانية، ونقترحلك منطقتين أو ثلاث.</p><Link to="/contact" className="btn btn-ink btn-sm mt-3"><Icon name="users" size={15} />احچي ويا مستشار محلي</Link></div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

// Radar chart of the Area DNA scores (X.radar)
function Radar({ rows, size = 300 }) {
  const n = rows.length, W = size + 130, cx = W / 2, c = size / 2 - 2, R = size / 2 - 34;
  const pt = (i, v) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; return [cx + Math.cos(a) * R * (v / 10), c + 10 + Math.sin(a) * R * (v / 10)]; };
  return (
    <svg viewBox={`0 0 ${W} ${size + 14}`} className="w-full h-auto mx-auto overflow-visible" style={{ maxWidth: W }} role="img" aria-label="مخطط هوية المنطقة">
      {[2.5, 5, 7.5, 10].map((v) => <polygon key={v} points={rows.map((_, i) => pt(i, v).join(',')).join(' ')} fill="none" stroke="#E7E7E3" strokeWidth="1" />)}
      {rows.map((_, i) => { const [x, y] = pt(i, 10); return <line key={i} x1={cx} y1={c + 10} x2={x} y2={y} stroke="#E7E7E3" />; })}
      <polygon points={rows.map((r, i) => pt(i, r.v).join(',')).join(' ')} fill="#C8102E" fillOpacity=".12" stroke="#C8102E" strokeWidth="2" strokeLinejoin="round" />
      {rows.map((r, i) => { const [x, y] = pt(i, r.v); return <circle key={i} cx={x} cy={y} r="3.5" fill="#C8102E" stroke="#fff" strokeWidth="1.5" />; })}
      {rows.map((r, i) => { const [x, y] = pt(i, 11.4); const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end'; const dy = y < c ? -2 : y > c + 30 ? 10 : 4; return <text key={i} x={x} y={y + dy} textAnchor={anchor} fontSize="12" fontWeight="600" fill="#5A5E66" style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>{r.lab}</text>; })}
    </svg>
  );
}

const SecHead = ({ id, eyebrow, title, extra }) => (
  <div id={id} className="scroll-mt-[140px] flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6"><div><div className="eyebrow mb-2">{eyebrow}</div><h2 className="t-h2 text-[26px] sm:text-[32px]">{title}</h2></div>{extra}</div>
);
const Stat = ({ k, v, sub }) => <div className="p-4 rounded-[16px] bg-white border hair"><div className="lbl">{k}</div><div className="text-[20px] sm:text-[22px] font-semibold num mt-0.5">{v}</div>{sub && <div className="lbl mt-0.5">{sub}</div>}</div>;

export function Area() {
  const { id } = useParams();
  const S = useSite();
  const nav = useNavigate();
  const a = S.areaById(id);
  useDocTitle(a?.name);
  if (!a) return <NotFound what="المنطقة" />;
  const jump = (k) => { const el = document.getElementById(k); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 130, behavior: 'smooth' }); };
  const near = S.areas.filter((b) => b.id !== a.id).map((b) => [b, kmBetween(a.pos, b.pos)]).sort((x, y) => x[1] - y[1]).slice(0, 6).map((x) => x[0]);
  const similar = S.areas.filter((b) => b.id !== a.id).map((b) => [b, a.dnaRows.reduce((s, r, i) => s + (r.v - (b.dnaRows[i]?.v ?? 0)) ** 2, 0)]).sort((x, y) => x[1] - y[1]).slice(0, 3).map((x) => x[0]);
  const strengths = a.dnaRows.filter((r) => r.v >= 8).map((r) => r.lab);
  const weaker = a.dnaRows.filter((r) => r.v <= 4).map((r) => r.lab);
  const NAV = [['ov', 'نظرة عامة'], ['dna', 'هوية المنطقة'], ['props', 'العقارات'], ...(a.projs.length ? [['projs', 'المشاريع']] : []), ...(similar.length ? [['similar', 'مناطق مشابهة']] : [])];
  const propMarkers = [
    { id: 'area:' + a.id, kind: 'dot', lat: a.pos.lat, lng: a.pos.lng, interactive: false },
    ...a.listings.filter((l) => l.hasPin).map((l) => ({ id: l.id, lat: l.pos.lat, lng: l.pos.lng, kind: l.deal === 'rent' ? 'pill rent' : 'pill', html: esc(l.priceText), interactive: false })),
  ];

  return (
    <>
      <section className="wrap pt-6 lg:pt-8" id="ov">
        <Crumbs items={[['الرئيسية', '/'], ['المناطق', '/areas'], [a.name]]} />
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-10 mt-5">
          <div className="lg:col-span-6 flex flex-col">
            <div className="eyebrow mb-3">هوية المنطقة من ڤايرو</div>
            <h1 className="t-hero text-[40px] sm:text-[56px]">{a.name}</h1>
            <p className="text-[17px] font-medium mt-2">{a.vibe}</p>
            <p className="text-ink-600 mt-3 max-w-xl">{a.desc}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-4"><span className="tag tag-red"><Icon name="star" size={12} />منطقة بأربيل</span>{(a.tags || []).map((t) => <span key={t} className="tag tag-g">{t}</span>)}</div>
            {near.length > 0 && <div className="mt-4"><div className="lbl mb-1.5">المناطق المجاورة</div><div className="flex gap-1.5 overflow-x-auto no-sb -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">{near.map((b) => <Link key={b.id} to={b.href} className="chip chip-sm flex-none">{b.short}</Link>)}</div></div>}
            <div className="grid grid-cols-2 gap-2 mt-6">
              <Stat k="متوسط سعر المتر للبيع" v={a.ppmText} sub={`${a.saleCount} عرض للبيع عند ڤايرو`} />
              <Stat k="متوسط الإيجار" v={a.rentText} sub={`${a.rentCount} عرض للإيجار عند ڤايرو`} />
            </div>
            <div className="flex-wrap gap-2 mt-5 hidden lg:flex">
              <Link to={`/buy?area=${a.id}`} className="btn btn-ink"><Icon name="tag" size={16} />اشتري بـ{a.short} <span className="opacity-60 num">{a.saleCount}</span></Link>
              <Link to={`/rent?area=${a.id}`} className="btn btn-line"><Icon name="key" size={16} />استأجر بـ{a.short} <span className="text-ink-400 num">{a.rentCount}</span></Link>
              <Link to="/contact" className="btn btn-ghost"><Icon name="users" size={16} />احچي ويا مستشار محلي</Link>
            </div>
          </div>
          <div className="lg:col-span-6"><Img src={a.img} className="aspect-[16/9] sm:aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[260px] !rounded-[20px]" label={a.short} alt={a.name} /></div>
        </div>
      </section>
      <div className="sticky top-[72px] z-40 bg-white/95 backdrop-blur border-b hair mt-8"><div className="wrap flex gap-1 overflow-x-auto no-sb py-2">{NAV.map(([k, l]) => <button key={k} type="button" onClick={() => jump(k)} className="flex-none h-9 px-3.5 inline-flex items-center rounded-full text-[13.5px] font-semibold text-ink-600 hover:bg-paper-2">{l}</button>)}</div></div>

      <section className="wrap sec" style={{ paddingTop: 48 }}>
        <SecHead id="dna" eyebrow="هوية المنطقة" title="شلون العيشة هنا" extra={<span className="lbl max-w-xs">الدرجات من 10 تقييمات تحريرية من فريق ڤايرو، مو بيانات رسمية.</span>} />
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 panel p-5 sm:p-6 flex items-center justify-center"><Radar rows={a.dnaRows} size={340} /></div>
          <div className="lg:col-span-4 panel p-5 sm:p-6">
            <div className="space-y-3">
              {a.dnaRows.map((r) => (
                <div key={r.lab}>
                  <div className="flex items-center justify-between text-[13.5px]"><span className="inline-flex items-center gap-2 font-medium"><Icon name={DNA_ICON[r.lab] || 'check'} size={15} className="text-ink-400" />{r.lab}</span><span className="num font-semibold">{r.v}<span className="text-ink-400 font-normal">/10</span></span></div>
                  <div className="h-1.5 rounded-full bg-paper-3 mt-1.5 overflow-hidden"><div className={`h-full rounded-full ${r.v >= 8 ? 'bg-red' : 'bg-ink'}`} style={{ width: r.w }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-3 flex flex-col gap-3">
            <div className="panel-s p-5"><div className="font-semibold text-[14px] flex items-center gap-2"><Icon name="check" size={16} className="text-ok" />أقوى نقاطها</div><p className="text-[14px] text-ink-600 mt-1.5">{strengths.join(' · ') || 'متوازنة بكل شي'}</p></div>
            <div className="panel-s p-5"><div className="font-semibold text-[14px] flex items-center gap-2"><Icon name="info" size={16} className="text-ink-400" />شنو تتنازل عنه</div><p className="text-[14px] text-ink-600 mt-1.5">{weaker.join(' · ') || 'ماكو نقاط ضعف كبيرة بتقييمنا'}</p></div>
            <div className="panel p-5"><div className="font-semibold text-[14px] flex items-center gap-2"><Icon name="users" size={16} className="text-ink-400" />اسأل مستشار محلي</div><p className="text-[14px] text-ink-600 mt-1.5">مستشار ڤايرو اللي يشتغل بهالمنطقة يگلّك شنو ما ينكتب بالإعلانات.</p><Link to="/contact" className="link text-[13.5px] mt-2">تواصل ويّانا<Icon name="arrow" size={14} className="flip-rtl" /></Link></div>
          </div>
        </div>
      </section>

      <section className="surface"><div className="wrap sec">
        <SecHead id="props" eyebrow="متوفر عند ڤايرو" title={`عقارات بـ${a.short}`} extra={<div className="flex gap-2 flex-wrap"><Link to={`/buy?area=${a.id}`} className="chip !bg-white"><Icon name="tag" size={15} />للبيع <span className="num text-ink-400">{a.saleCount}</span></Link><Link to={`/rent?area=${a.id}`} className="chip !bg-white"><Icon name="key" size={15} />للإيجار <span className="num text-ink-400">{a.rentCount}</span></Link></div>} />
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8"><CardGrid list={a.listings} min={230} empty="لا توجد عقارات معروضة في هذه المنطقة حالياً" /></div>
          <div className="lg:col-span-4"><div className="lg:sticky lg:top-[140px]">
            <div className="relative h-[300px] lg:h-[480px] rounded-[18px] overflow-hidden border hair bg-white">
              <MapView height="100%" interactive={false} center={a.pos} zoom={13} markers={propMarkers}>
                <button type="button" onClick={() => nav(`/map?area=${a.id}`)} aria-label="افتح الخريطة" style={{ position: 'absolute', inset: 0, zIndex: 900, background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }} />
                <span className="absolute bottom-3 start-3 btn btn-ink btn-sm pointer-events-none" style={{ zIndex: 901 }}><Icon name="map" size={15} />افتح الخريطة</span>
              </MapView>
            </div>
            <p className="lbl mt-3">الدبابيس تبيّن العقارات اللي إلها موقع دقيق. موقع المنطقة تقريبي، مو عنوان دقيق.</p>
          </div></div>
        </div>
      </div></section>

      {a.projs.length > 0 && (
        <section className="wrap sec">
          <SecHead id="projs" eyebrow="مجمعات وأبراج وفلل" title="المشاريع بهالمنطقة" extra={<Link to="/projects" className="link text-[14px]">كل المشاريع<Icon name="arrow" size={15} className="flip-rtl" /></Link>} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-9">{a.projs.map((p) => <ProjCard key={p.id} p={p} />)}</div>
        </section>
      )}

      {similar.length > 0 && (
        <section className="surface"><div className="wrap sec">
          <SecHead id="similar" eyebrow="مناطق مشابهة" title="إذا عجبتك هالمنطقة، شوف هم…" extra={<Link to="/areas" className="link text-[14px]">كل المناطق<Icon name="arrow" size={15} className="flip-rtl" /></Link>} />
          <div className="flex gap-4 overflow-x-auto no-sb snap-x-m -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-3 sm:gap-x-5 sm:gap-y-8 sm:overflow-visible">{similar.map((b) => <div key={b.id} className="w-[80%] flex-none sm:w-auto"><AreaCard a={b} /></div>)}</div>
        </div></section>
      )}

      <section className="wrap sec"><div className="panel p-6 sm:p-10 grid lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-7"><div className="eyebrow mb-3">خبرة محلية</div><h2 className="t-h1 text-[28px] sm:text-[38px]">تفكر بـ{a.short}؟</h2><p className="text-ink-600 mt-3">مستشار ڤايرو اللي يشتغل بهالمنطقة يگلّك أي شوارع تغرق بالشتا، وأي مجمعات كهرباءها مستقرة، وشنو جاي بالمستقبل.</p></div>
        <div className="lg:col-span-5 grid sm:grid-cols-2 gap-2">
          <Link to="/contact" className="btn btn-red sm:col-span-2"><Icon name="users" size={17} />احچي ويا مستشار محلي</Link>
          <Link to={`/buy?area=${a.id}`} className="btn btn-line"><Icon name="tag" size={16} />دوّر للشراء</Link>
          <Link to={`/rent?area=${a.id}`} className="btn btn-line"><Icon name="key" size={16} />دوّر للإيجار</Link>
        </div>
      </div></section>

      <div className="h-[64px] lg:hidden" />
      <div className="fixed inset-x-0 bottom-[60px] z-50 lg:hidden bg-white/95 backdrop-blur border-t hair"><div className="wrap py-2.5 grid grid-cols-[1fr_1fr_auto] gap-2">
        <Link to={`/buy?area=${a.id}`} className="btn btn-ink btn-sm"><Icon name="tag" size={15} />شراء <span className="opacity-60 num">{a.saleCount}</span></Link>
        <Link to={`/rent?area=${a.id}`} className="btn btn-line btn-sm"><Icon name="key" size={15} />إيجار <span className="text-ink-400 num">{a.rentCount}</span></Link>
        <Link to="/contact" className="btn btn-red btn-sm !px-3" aria-label="احچي ويا مستشار"><Icon name="phone" size={16} /></Link>
      </div></div>
    </>
  );
}
