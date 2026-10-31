import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle } from '../../lib/hooks.js';
import { TYPE_AR, TYPE_GROUPS, count, starSplit } from '../../lib/format.js';
import { Icon, Img, Seg } from '../../components/ui.jsx';
import { ListingCard, SectionHead } from '../parts.jsx';
import { MapExplorer } from './MapPage.jsx';

// Homepage ported from the design reference (pages/home.js): hero + unified search, categories, featured rail,
// neighbourhoods + map, tools, owners. Sections are gated by S.settings.sections exactly as before.

const HS_STYLE = `.hs-f{display:flex;flex-direction:column;justify-content:center;padding:10px 18px;min-height:64px;border-bottom:1px solid var(--line)}@media(min-width:768px){.hs-f{border-bottom:0}}.hs-l{font-size:12px;font-weight:600;color:#767A83}.hs-i{width:100%;background:transparent;outline:none;font-size:15px;font-weight:500;appearance:none;cursor:pointer;padding:2px 0}.hs-i::placeholder{color:#9DA0A7;font-weight:400}.hs-dd{position:absolute;top:100%;inset-inline:0;margin-top:4px;z-index:40;max-height:300px;overflow-y:auto}.hs-opt{width:100%;display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;font-size:14.5px;text-align:start}.hs-opt:hover,.hs-opt.on{background:#F6F6F4}.hs-opt.on{font-weight:600}.hs-x:hover{background:#F6F6F4}`;

// "وين" field: a touch-friendly picker instead of the reference's <datalist> (mobile browsers don't open datalists).
// Tapping opens every area (with listing counts for the current deal); typing filters areas and projects; picking an
// area sets a real area filter (?area=), picking a project sets the text query. Free text still works as before.
function WhereField({ S, deal, q, area, onChange }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', h);
    return () => document.removeEventListener('pointerdown', h);
  }, [open]);
  const sel = area ? S.areaById(area) : null;
  const text = sel && !q ? sel.name : q;
  const norm = (x) => (x || '').toString().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').trim();
  const needle = norm(q);
  const hit = (...xs) => !needle || xs.some((x) => norm(x).includes(needle));
  const areas = S.areas.filter((a) => hit(a.name, a.short, a.name_en, a.id));
  const projs = needle ? S.projs.filter((p) => hit(p.name, p.name_en, p.id)).slice(0, 6) : [];
  const cntOf = (a) => (deal === 'rent' ? a.rentCount : a.saleCount);
  const pick = (next) => { onChange(next); setOpen(false); };
  return (
    <div ref={box} className="hs-f md:border-e hair relative">
      <label className="hs-l" htmlFor="hs-q">وين</label>
      <div className="flex items-center gap-2">
        <input id="hs-q" className="hs-i" value={text} onFocus={() => setOpen(true)} onClick={() => setOpen(true)}
          onChange={(e) => { onChange({ q: e.target.value, area: '' }); setOpen(true); }}
          placeholder={deal === 'rent' ? 'منطقة، مجمع أو معلم' : 'منطقة، مشروع، مطوّر أو رقم'} autoComplete="off" role="combobox" aria-expanded={open} aria-controls="hs-where" />
        {(text || open) ? (
          <button type="button" className="hs-x w-7 h-7 flex-none inline-flex items-center justify-center rounded-full text-ink-400" aria-label={text ? 'مسح' : 'إغلاق'}
            onPointerDown={(e) => e.preventDefault()} onClick={() => { if (text) onChange({ q: '', area: '' }); else setOpen(false); }}><Icon name={text ? 'close' : 'chev-u'} size={15} /></button>
        ) : <Icon name="chev-d" size={16} className="text-ink-400 flex-none" />}
      </div>
      {open && (
        <div id="hs-where" role="listbox" className="hs-dd bg-white rounded-[16px] shadow-pop border hair p-1.5 text-start">
          {!needle && (
            <button type="button" role="option" aria-selected={!area} className={`hs-opt ${!area ? 'on' : ''}`} onClick={() => pick({ q: '', area: '' })}>
              <Icon name="compass" size={17} className="text-ink-400" /><span className="flex-1">كل أربيل</span><span className="lbl num">{S.live.filter((l) => l.deal === deal).length}</span>
            </button>
          )}
          {areas.length > 0 && <div className="lbl px-3 pt-2 pb-1">المناطق</div>}
          {areas.map((a) => (
            <button key={a.id} type="button" role="option" aria-selected={area === a.id} className={`hs-opt ${area === a.id ? 'on' : ''}`} onClick={() => pick({ q: '', area: a.id })}>
              <Icon name="pin" size={17} className="text-ink-400" /><span className="flex-1 truncate">{a.name}</span><span className="lbl num">{cntOf(a) ? `${cntOf(a)} عقار` : 'لا يوجد حالياً'}</span>
            </button>
          ))}
          {projs.length > 0 && <div className="lbl px-3 pt-2 pb-1">المشاريع</div>}
          {projs.map((p) => (
            <button key={p.id} type="button" role="option" className="hs-opt" onClick={() => pick({ q: p.name, area: '' })}>
              <Icon name="compound" size={17} className="text-ink-400" /><span className="flex-1 truncate">{p.name}</span><span className="lbl truncate">{S.areaById(p.area_id)?.short || ''}</span>
            </button>
          ))}
          {!areas.length && !projs.length && <div className="px-3 py-4 text-[13.5px] text-ink-500">ماكو منطقة أو مشروع بهذا الاسم — اضغط ابحث للبحث بالنص.</div>}
        </div>
      )}
    </div>
  );
}

const CAT_ICON = { apartment: 'tower', house: 'home', villa: 'villa', land: 'land', commercial: 'shop', compound: 'compound', installments: 'percent', ready: 'key' };
const TOOLS = [
  ['/tools/match', 'sparkle', 'ڤايرو ماتش', 'شراء أو إيجار أو استثمار — ونرتبلك الأنسب', 'ابدأ'],
  ['/tools/budget', 'wallet', 'مستكشف الميزانية', 'شنو أگدر أشتري أو أأجر؟', 'استكشف'],
  ['/tools/rent', 'key', 'مختبر الإيجار', 'قدرتك على الإيجار وتكلفة السكن', 'احسب'],
  ['/tools/payment', 'chart', 'مختبر الدفع', 'خطط شراءك بالتقسيط', 'خطّط'],
  ['/compare', 'compare', 'المقارنة', 'جنب بعض، نفس النوع ويا نفس النوع', 'قارن'],
  ['/tools/tour', 'route', 'الجولة الذكية', 'نظّم يوم المعاينات', 'نظّم'],
  ['/tools/tower', 'elevator', 'مستكشف البرج', 'اختار الطابق والوحدة بالشكل', 'استكشف'],
  ['/tools/atlas', 'trend', 'أطلس العقار', 'أسعار المتر حسب المنطقة', 'افتح'],
];

export default function Home() {
  useDocTitle('');
  const S = useSite();
  const nav = useNavigate();
  const [deal, setDeal] = useState('sale');
  const [f, setF] = useState({ q: '', area: '', type: '', max: '', pay: '' });
  const [bm, setBm] = useState('sale'); // explore-by-budget mode (reference: budget())

  // short money for the budget bands: $100K / $1.2M
  const short = (v) => '$' + (v >= 1e6 ? (v / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M' : v >= 1e4 ? Math.round(v / 1000) + 'K' : v);
  const rentShort = (v) => `${short(v)}/شهر`;
  const BANDS = bm === 'rent' ? [[0, 500], [500, 1000], [1000, 2000], [2000, Infinity]] : [[0, 100000], [100000, 200000], [200000, 400000], [400000, Infinity]];
  const bands = BANDS.map(([a, b], i) => {
    const list = S.live.filter((l) => l.deal === bm && l.amount >= a && l.amount < b);
    const types = [...new Set(list.map((l) => TYPE_AR[l.type]))].filter(Boolean).slice(0, 3).join(' · ');
    const fmt = bm === 'rent' ? rentShort : short;
    const label = i === 0 ? <>أقل من <bdi>{fmt(b)}</bdi></> : b === Infinity ? <><bdi>{fmt(a)}</bdi>+</> : <><bdi>{short(a)}</bdi>–<bdi>{fmt(b)}</bdi></>;
    const to = `/${bm === 'rent' ? 'rent' : 'buy'}?${a ? `min=${a}` : ''}${a && b !== Infinity ? '&' : ''}${b !== Infinity ? `max=${b}` : ''}`;
    return { i, label, types, n: list.length, to };
  });
  const sec = { types: true, featured: true, areas: true, tools: true, owners: true, ...(S.settings.sections || {}) };

  const search = () => {
    const p = new URLSearchParams();
    const g = { ...f };
    if (!g.area && g.q) { const n = g.q.trim().toLowerCase(); const a = S.areas.find((x) => [x.name, x.short, x.name_en].filter(Boolean).some((t) => t.toLowerCase() === n)); if (a) { g.area = a.id; g.q = ''; } }
    Object.entries(g).forEach(([k, v]) => v && !(deal === 'rent' && k === 'pay') && p.set(k, v));
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

  const area0 = S.homeAreas[0] || S.areas[0];
  const tries = deal === 'rent'
    ? [['مفروش', '/rent?furn=furnished'], ['متاح هسه', '/rent?furn=now'], ['بيوت عوائل', '/rent?type=house'], ['مكاتب ومحلات', '/rent?type=commercial'], ...(area0 ? [[`شقق ب${area0.short}`, `/rent?type=apartment&area=${area0.id}`]] : [])]
    : [['تقسيط', '/buy?pay=installments'], ['فلل جاهزة', '/buy?type=villa&pay=ready'], ['أراضي', '/buy?type=land'], ['أقل من 150 ألف', '/buy?max=150000'], ...(area0 ? [[`بيوت ب${area0.short}`, `/buy?type=house&area=${area0.id}`]] : [])];

  // featured rails: listings flagged "featured" first, then the newest verified ones with type variety (max 2 per type), 8 each
  const pickVar = (arr, n) => { const seen = {}; return arr.filter((l) => { seen[l.type] = (seen[l.type] || 0) + 1; return seen[l.type] <= 2; }).slice(0, n); };
  const withFeat = (deal, rest) => { const f = S.featured.filter((l) => l.deal === deal).slice(0, 8); const ids = new Set(f.map((l) => l.id)); return [...f, ...pickVar(rest.filter((l) => !ids.has(l.id)), 8)].slice(0, 8); };
  const featSale = withFeat('sale', S.live.filter((l) => l.deal === 'sale' && l.verified));
  const featRent = withFeat('rent', S.live.filter((l) => l.deal === 'rent'));
  const ownerImg = (t) => S.live.find((l) => l.type === t && l.img)?.img || S.live.find((l) => l.img)?.img || S.areas[1]?.img || S.areas[0]?.img;

  return (
    <>
      <style>{HS_STYLE}</style>

      {/* ---------- hero with unified Buy | Rent search */}
      <section className="pt-8 lg:pt-14">
        <div className="wrap">
          <div className="max-w-[880px] mx-auto text-center">
            <div className="eyebrow justify-center">{S.settings.hero_kicker}</div>
            <h1 className="t-hero text-[40px] sm:text-[58px] lg:text-[72px] mt-4">
              {starSplit(S.settings.hero_title).map((s, i) => (s.hl ? <span key={i} className="accent">{s.t}</span> : <span key={i}>{s.t}</span>))}
            </h1>
            <p className="text-[17px] text-ink-600 mt-4 max-w-2xl mx-auto">بيوت وأراضي ومساحات تجارية بكل أربيل، للبيع وللإيجار، ويا كل المعلومات واضحة، ومستشار ڤايرو قريب منك بضغطة.</p>
          </div>

          <div className="max-w-[1080px] mx-auto mt-8">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <Seg large value={deal} options={[['sale', 'شراء', 'tag'], ['rent', 'إيجار', 'key']]} onChange={(v) => { setDeal(v); setF({ ...f, max: '' }); }} />
              <div className="flex items-center gap-1 text-[13.5px]">
                <Link to="/sell?mode=sale" className="px-3 h-10 inline-flex items-center gap-1.5 rounded-full hover:bg-paper-2 font-semibold"><Icon name="tag" size={15} className="text-ink-400" />بيع</Link>
                <Link to="/sell?mode=rent" className="px-3 h-10 inline-flex items-center gap-1.5 rounded-full hover:bg-paper-2 font-semibold"><Icon name="key" size={15} className="text-ink-400" />أجّر عقارك</Link>
                <Link to="/invest" className="px-3 h-10 inline-flex items-center gap-1.5 rounded-full hover:bg-paper-2 font-semibold"><Icon name="trend" size={15} className="text-ink-400" />استثمر</Link>
              </div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); search(); }} className="mt-3 bg-white rounded-[22px] shadow-pop border hair p-2 grid md:grid-cols-[1.5fr_1fr_1fr_1fr_auto] items-stretch">
              <WhereField S={S} deal={deal} q={f.q} area={f.area} onChange={(w) => setF({ ...f, ...w })} />
              <label className="hs-f md:border-e hair"><span className="hs-l">النوع</span>
                <select className="hs-i" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
                  <option value="">{deal === 'rent' ? 'أي سكن أو مساحة' : 'أي عقار'}</option>{TYPE_GROUPS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                </select></label>
              <label className="hs-f md:border-e hair"><span className="hs-l">{deal === 'rent' ? 'الميزانية الشهرية' : 'أعلى سعر'}</span>
                <select className="hs-i" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })}>
                  <option value="">أي</option>{maxOpts.map((v) => <option key={v} value={v}>لحد {S.money(v)}{deal === 'rent' ? ' / شهر' : ''}</option>)}
                </select></label>
              <label className="hs-f"><span className="hs-l">{deal === 'rent' ? 'الفرش' : 'الدفع'}</span>
                {deal === 'rent' ? (
                  <select className="hs-i" value={f.furn || ''} onChange={(e) => setF({ ...f, furn: e.target.value })}>
                    <option value="">مفروش أو غير مفروش</option><option value="furnished">مفروش</option><option value="unfurnished">غير مفروش</option>
                  </select>
                ) : (
                  <select className="hs-i" value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value })}>
                    <option value="">كاش أو تقسيط</option><option value="cash">كاش</option><option value="installments">تقسيط</option>
                  </select>
                )}</label>
              <button type="submit" className="btn btn-red btn-lg !h-auto min-h-[58px] md:!rounded-[16px] m-1"><Icon name="search" size={19} /><span>ابحث</span></button>
            </form>
            <div className="mt-3 flex items-center gap-2 overflow-x-auto no-sb text-[13px] pb-1">
              {tries.map(([l, to]) => <Link key={to} to={to} className="chip chip-sm flex-none">{l}</Link>)}
            </div>
          </div>
        </div>
        <div className="wrap mt-10">
          <div className="relative rounded-[24px] overflow-hidden h-[220px] sm:h-[320px] lg:h-[380px]">
            <Img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=2000&q=70" className="absolute inset-0 w-full h-full !rounded-none" imgClass="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
            <div className="absolute bottom-4 start-4 end-4 flex flex-wrap items-end justify-between gap-3 text-white">
              <div><div className="text-[13px] opacity-85">أربيل، إقليم كوردستان</div><div className="text-[20px] sm:text-[24px] font-semibold t-h3">سكن وأراضي ومساحات تجارية — للبيع وللإيجار</div></div>
              <span className="mono text-[11px] opacity-75 hidden sm:inline" dir="ltr">36.19°N · 44.01°E</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- category shortcuts */}
      {sec.types && (
        <section className="sec !pb-10"><div className="wrap">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-7"><div><div className="eyebrow mb-3">ابدأ من النوع</div><h2 className="t-h2 text-[28px] sm:text-[36px]">شنو تدوّر عليه؟</h2></div></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {cats.map((c) => (
              <Link key={c.k} to={c.to} className="group flex flex-col items-start gap-6 p-4 rounded-[18px] border hair hover:border-ink-300 hover:shadow-card transition-all bg-white min-w-0">
                <span className="mi-ic group-hover:bg-red-50 group-hover:text-red transition-colors"><Icon name={CAT_ICON[c.k]} size={20} /></span>
                <span><span className="block font-semibold text-[15px]">{c.label}</span><span className="lbl num">{c.n}</span></span>
              </Link>
            ))}
          </div>
        </div></section>
      )}

      {/* ---------- explore by budget (reference: budget()) */}
      <section className="sec !pt-6"><div className="wrap"><div className="panel-s p-5 sm:p-8 lg:p-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-7">
          <div><div className="eyebrow mb-3">حسب ميزانيتك</div><h2 className="t-h2 text-[26px] sm:text-[34px]">{bm === 'rent' ? 'شنو أگدر أستأجر بـ 700 دولار بالشهر؟' : 'شنو تشتري بـ 100 ألف دولار؟'}</h2></div>
          <Seg className="!bg-white" value={bm} options={[['sale', 'ميزانية الشراء'], ['rent', 'إيجار شهري']]} onChange={setBm} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {bands.map((b) => (
            <Link key={b.i} to={b.to} className="group p-5 rounded-[18px] bg-white border hair hover:border-ink-300 hover:shadow-card transition-all flex flex-col min-h-[170px]">
              <span className="lbl">{['01', '02', '03', '04'][b.i]}</span>
              <span className="text-[22px] font-semibold num mt-1">{b.label}</span>
              <span className="text-[13px] text-ink-600 mt-1 clamp-2">{b.types || '—'}</span>
              <span className="mt-auto pt-4 flex items-center justify-between text-[13.5px] font-semibold"><span className="num">{b.n} {bm === 'rent' ? 'إيجار' : 'عقار'}</span><Icon name="arrow" size={16} className="flip-rtl text-ink-400 group-hover:text-red" /></span>
            </Link>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {bm === 'rent'
            ? <><Link to="/tools/rent" className="btn btn-ink btn-sm"><Icon name="key" size={16} />افتح مختبر الإيجار</Link><Link to="/tools/budget" className="btn btn-line btn-sm"><Icon name="wallet" size={16} />مستكشف ميزانية الإيجار</Link></>
            : <><Link to="/tools/budget" className="btn btn-ink btn-sm"><Icon name="wallet" size={16} />افتح مستكشف الميزانية</Link><Link to="/tools/payment" className="btn btn-line btn-sm"><Icon name="chart" size={16} />مختبر الدفع</Link></>}
        </div>
      </div></div></section>

      {/* ---------- featured sale & rent rails (reference: featured()) */}
      {sec.featured && (
        <section className="sec border-t hair"><div className="wrap">
          <Rail title="مختارات للبيع" sub="شقق وبيوت وفلل وأراضي ومحلات، ڤايرو متحقق منها." list={featSale} link="/buy" linkLabel="كل العقارات للبيع" empty="ماكو عقارات للبيع منشورة هسه — أول ما تنشر، تظهر هنا." />
          <Rail title="مختارات للإيجار" sub="موعد السكن والفرش والتأمين واضحين من البداية." list={featRent} link="/rent" linkLabel="كل الإيجارات" empty="ماكو إيجارات منشورة هسه — أول ما تنشر، تظهر هنا." />
        </div></section>
      )}

      {/* ---------- neighbourhoods + map */}
      {sec.areas && (
        <section className="sec surface"><div className="wrap">
          <SectionHead kicker="اكتشف أربيل" title="اختار المنطقة أول." sub="كل منطقة تبيّن شگد يكلف الشراء والإيجار بيها، وشلون العيشة، وشنو قريب منها." link={{ to: '/areas', label: 'كل المناطق' }} />
          <div className="grid lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 flex flex-col gap-2 overflow-y-auto no-sb pe-1" style={{ maxHeight: 640 }}>
              {[...S.homeAreas, ...S.areas.filter((a) => !S.homeAreas.includes(a))].map((a) => (
                <Link key={a.id} to={a.href} className="group flex items-center gap-4 p-3 rounded-[16px] bg-white border hair hover:border-ink-300 transition-colors">
                  <Img src={a.img} className="w-16 h-16 rounded-[12px] flex-none" imgClass="absolute inset-0 w-full h-full object-cover" />
                  <div className="min-w-0 flex-1"><div className="font-semibold group-hover:text-red transition-colors">{a.name}</div><div className="lbl clamp-1">{a.vibe || `${a.ppmText}/م²`}</div></div>
                  <div className="text-end text-[12.5px] leading-tight flex-none"><div><span className="text-ink-400">شراء</span> <b className="num">{a.saleCount}</b></div><div className="mt-1"><span className="text-ink-400">إيجار</span> <b className="num">{a.rentCount}</b></div></div>
                </Link>
              ))}
            </div>
            <div className="lg:col-span-7">
              <MapExplorer embedded height={520} />
              <div className="flex flex-wrap gap-2 mt-3"><Link to="/map" className="btn btn-ink btn-sm"><Icon name="map" size={16} />افتح خريطة العقارات</Link><Link to="/areas" className="btn btn-line btn-sm"><Icon name="compare" size={16} />قارن المناطق</Link></div>
            </div>
          </div>
        </div></section>
      )}

      {/* ---------- decision tools */}
      {sec.tools && (
        <section className="sec surface"><div className="wrap">
          <SectionHead kicker="الأدوات" title="قرّر وأنت فاهم" sub="أدوات للمشتري والمستأجر والمستثمر." link={{ to: '/tools', label: 'كل الأدوات' }} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TOOLS.map(([to, ic, t, d, c]) => (
              <Link key={to} to={to} className="group p-5 rounded-[18px] bg-white border hair hover:shadow-card transition-shadow flex flex-col min-h-[200px]">
                <span className="mi-ic group-hover:bg-red-50 group-hover:text-red transition-colors"><Icon name={ic} size={20} /></span>
                <span className="font-semibold text-[16px] mt-5">{t}</span>
                <span className="text-[13.5px] text-ink-600 mt-1">{d}</span>
                <span className="mt-auto pt-4 link text-[13.5px]">{c}<Icon name="arrow" size={14} className="flip-rtl" /></span>
              </Link>
            ))}
          </div>
        </div></section>
      )}

      {/* ---------- owners: sell & rent out */}
      {sec.owners && (
        <section className="sec"><div className="wrap">
          <SectionHead kicker="لأصحاب العقارات" title="بيع عقارك أو أجّره ويا فريق يعرف السوق" sub="سجّل عقارك ببضع دقايق. مستشار ڤايرو يراجعه ويزوره ويسوّقه للمشترين أو المستأجرين الجادّين." />
          <div className="grid md:grid-cols-2 gap-4">
            {[
              ['tag', 'بيع عقارك', 'شقق، بيوت، فلل، أراضي وعقارات تجارية.', ['گلّنا عن العقار', 'ڤايرو يراجع ويزور', 'نصيحة بالسعر وتسويق', 'مشترين جادّين وتفاوض'], 'house',
                <><Link to="/sell?mode=sale" className="btn btn-red">بيع عقارك<Icon name="arrow" size={16} className="flip-rtl" /></Link><Link to="/sell" className="btn btn-line"><Icon name="users" size={16} />استشارة مجانية</Link></>],
              ['key', 'أجّر عقارك', 'بيوت، شقق مفروشة، مكاتب، محلات ومخازن.', ['التفاصيل والإيجار وموعد التوفر', 'ڤايرو يفحص العقار', 'العرض والصور والمعاينات', 'تدقيق المستأجر والتسليم'], 'apartment',
                <><Link to="/sell?mode=rent" className="btn btn-red">أجّر عقارك<Icon name="arrow" size={16} className="flip-rtl" /></Link><Link to="/invest" className="btn btn-line" title="ڤايرو للاستثمار"><Icon name="trend" size={16} />ڤايرو للاستثمار · قريباً</Link></>],
            ].map(([ic, t, s, steps, imgType, ctas]) => (
              <div key={t} className="panel overflow-hidden grid sm:grid-cols-[1fr_200px] lg:grid-cols-[1fr_240px]">
                <div className="p-6 sm:p-8 flex flex-col">
                  <span className="mi-ic"><Icon name={ic} size={20} /></span>
                  <h3 className="t-h2 text-[26px] mt-5">{t}</h3>
                  <p className="text-ink-600 mt-1">{s}</p>
                  <ol className="mt-5 space-y-2.5">{steps.map((x, i) => <li key={i} className="flex items-center gap-3 text-[14px]"><span className="w-6 h-6 rounded-full bg-paper-2 text-[12px] font-semibold inline-flex items-center justify-center num flex-none">{i + 1}</span>{x}</li>)}</ol>
                  <div className="mt-7 flex flex-wrap gap-2">{ctas}</div>
                </div>
                <Img src={ownerImg(imgType)} className="hidden sm:block h-full !rounded-none" imgClass="absolute inset-0 w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div></section>
      )}
    </>
  );
}

// Horizontal card rail with prev/next buttons (reference: rail()).
function Rail({ title, sub, list, link, linkLabel, empty }) {
  const box = useRef(null);
  const scroll = (dir) => { const el = box.current; if (el) el.scrollBy({ left: dir * -1 * el.clientWidth * 0.8, behavior: 'smooth' }); };
  return (
    <div className="mb-14 last:mb-0">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div><h3 className="t-h2 text-[24px] sm:text-[30px]">{title}</h3><p className="text-ink-600 mt-1">{sub}</p></div>
        <div className="flex items-center gap-2">
          <Link to={link} className="link text-[14px] hidden sm:inline-flex">{linkLabel}<Icon name="arrow" size={15} className="flip-rtl" /></Link>
          <button type="button" className="icon-btn border hair hidden md:inline-flex" aria-label="السابق" onClick={() => scroll(-1)}><Icon name="chev-l" size={18} className="flip-rtl" /></button>
          <button type="button" className="icon-btn border hair hidden md:inline-flex" aria-label="التالي" onClick={() => scroll(1)}><Icon name="chev" size={18} className="flip-rtl" /></button>
        </div>
      </div>
      <div ref={box} className="flex gap-5 overflow-x-auto no-sb snap-x-m -mx-4 px-4 md:mx-0 md:px-0 pb-2">
        {list.map((l) => <div key={l.id} className="w-[78%] sm:w-[44%] lg:w-[calc(25%-15px)] flex-none"><ListingCard l={l} /></div>)}
        {list.length === 0 && (
          <div className="w-full panel-s p-8 sm:p-12 text-center flex-none">
            <div className="w-12 h-12 mx-auto rounded-full bg-white inline-flex items-center justify-center text-ink-400"><Icon name="search" size={22} /></div>
            <div className="font-semibold mt-3">{empty}</div>
          </div>
        )}
      </div>
      <Link to={link} className="link text-[14px] sm:hidden mt-3">{linkLabel}<Icon name="arrow" size={15} className="flip-rtl" /></Link>
    </div>
  );
}
