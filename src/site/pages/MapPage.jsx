import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle } from '../../lib/hooks.js';
import { Icon, Img, useToast } from '../../components/ui.jsx';
import { DealTag, Facts, LeadModal, Price, SaveBtn } from '../parts.jsx';
import { MapView, esc, hasPos } from '../../components/MapView.jsx';

// Property map explorer — ported 1:1 from the design reference (pages/map.js): toolbar (Buy | Rent, categories with
// counts, "compounds & towers" overlay, budget, area, part of the city, map/list switch), results panel with active
// filters and paging, zoom-level pins (district bubbles → listings) with "+N" declutter badges, floating preview,
// "search this area", legend, hint and the mobile peek sheet. The map canvas itself stays the app's Leaflet MapView.
// Used by /map (filters in the URL) and embedded on the home page (filters in local state).

const CATS = [
  ['all', 'layers', 'الكل', () => true],
  ['apt', 'tower', 'شقق', (l) => l.type === 'apartment' || l.type === 'penthouse'],
  ['house', 'home', 'بيوت', (l) => l.type === 'house'],
  ['villa', 'villa', 'فلل', (l) => l.type === 'villa' || l.type === 'townhouse'],
  ['land', 'land', 'أراضي', (l) => l.type === 'land'],
  ['com', 'shop', 'تجاري', (l) => l.type === 'office' || l.type === 'shop'],
];
const BANDS = (deal) => (deal === 'rent' ? [[0, 500], [500, 1000], [1000, 2000], [2000, 5000], [5000, 0]] : [[0, 100000], [100000, 200000], [200000, 400000], [400000, 800000], [800000, 0]]);
const ZONES = [['c', 'المركز'], ['ne', 'الشمال الشرقي'], ['nw', 'الشمال الغربي'], ['se', 'الجنوب الشرقي'], ['sw', 'الجنوب الغربي']];
// Part of the city, derived from the area's coordinates relative to the citadel: within ~3 km = centre, else the quadrant.
const CITADEL = { lat: 36.1911, lng: 44.0092 };
const zoneOf = (a) => {
  if (a.lat == null && a.x != null) { const x = +a.x - 50, y = +a.y - 50; return Math.hypot(x, y) < 14 ? 'c' : (y < 0 ? 'n' : 's') + (x < 0 ? 'w' : 'e'); } // until the geo migration is applied
  const p = a.pos || a; const dx = (+p.lng - CITADEL.lng) * 89.6, dy = (+p.lat - CITADEL.lat) * 111; return Math.hypot(dx, dy) < 3 ? 'c' : (dy > 0 ? 'n' : 's') + (dx > 0 ? 'e' : 'w');
};
const ISO = (s) => '⁦' + s + '⁩';
const PAGE = 40;
const FAR_ZOOM = 13; // below this: district bubbles; from here: listing pins

export default function MapPage() {
  useDocTitle('خريطة العقارات');
  return <MapExplorer />;
}

// `embedded` = the home-page version: filters kept in local state, map/list switch at every width, fixed height.
export function MapExplorer({ embedded = false, height = 560 }) {
  const S = useSite();
  const nav = useNavigate();
  const toast = useToast();
  const [urlSp, setSp] = useSearchParams();
  const [local, setLocal] = useState(() => new URLSearchParams());
  const sp = embedded ? local : urlSp;

  // filter state (deal, cat, band, area, zone, proj, pj) — `deal=projects` from older links means sale + projects overlay
  const deal = sp.get('deal') === 'rent' ? 'rent' : 'sale';
  const cat = CATS.some((c) => c[0] === sp.get('cat')) && !(deal === 'rent' && sp.get('cat') === 'land') ? sp.get('cat') : 'all';
  const band = sp.get('band') !== null && BANDS(deal)[+sp.get('band')] ? +sp.get('band') : '';
  const area = S.areaById(sp.get('area') || '') ? sp.get('area') : '';
  const zone = ZONES.some((z) => z[0] === sp.get('zone')) ? sp.get('zone') : '';
  const projects = sp.get('proj') === '1' || sp.get('deal') === 'projects';
  const pj = S.projById(sp.get('pj') || '') ? sp.get('pj') : ''; // "show its listings" of one project
  const avail = sp.get('avail') === '1'; // available only (hides reserved and sold / rented)
  const pool = avail ? S.available : S.visible;
  const setQ = (patch) => { const n = new URLSearchParams(sp); Object.entries(patch).forEach(([k, v]) => (v === '' || v == null || v === false ? n.delete(k) : n.set(k, String(v)))); if (n.get('deal') === 'projects') n.delete('deal'); if (embedded) setLocal(n); else setSp(n, { replace: true }); };
  const mapHref = `/map${sp.toString() ? '?' + sp.toString() : ''}`;

  // local UI state
  const [view, setView] = useState('map');
  const [sel, setSel] = useState(null);
  const [hover, setHover] = useState(null);
  const [bounds, setBounds] = useState(null);
  const [moved, setMoved] = useState(false);
  const [zoom, setZoom] = useState(13);
  const [tick, setTick] = useState(0); // bumps on every map move so the pin declutter re-runs
  const [shown, setShown] = useState(PAGE);
  const [booking, setBooking] = useState(null);
  const [ask, setAsk] = useState(false); // "Ask VAIRO" from the empty state → consultation / rental-help request
  const [mh, setMh] = useState(height);
  const api = useRef(null);
  const tool = useRef(null);
  const base = useRef(null);

  const short = (v) => '$' + (v >= 1e6 ? (v / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M' : v >= 1e4 ? Math.round(v / 1000) + 'K' : v);
  const bandLabel = ([a, b]) => ISO(!a ? `أقل من ${short(b)}` : !b ? `${short(a)}+` : `${short(a)}–${short(b)}`) + (deal === 'rent' ? '/شهر' : '');
  const zoneName = (z) => (ZONES.find((x) => x[0] === z) || [])[1] || '';
  const areaZone = (id) => { const a = S.areaById(id); return a ? zoneOf(a) : ''; };
  const cur = S.areaById(area);
  const curProj = S.projById(pj);

  const catFn = CATS.find((c) => c[0] === cat)[3];
  const inBand = (l) => { if (band === '') return true; const [a, b] = BANDS(deal)[band]; return l.amount >= a && (!b || l.amount < b); };
  const inBounds = (p) => !bounds || bounds.contains([p.pos.lat, p.pos.lng]);
  const filtered = (useBounds = true) => pool.filter((l) => l.deal === deal && catFn(l) && inBand(l) && (!area || l.area_id === area) && (!zone || areaZone(l.area_id) === zone) && (!pj || l.project_id === pj) && (!useBounds || inBounds(l)));
  const items = useMemo(() => filtered().sort((a, b) => a.amount - b.amount), [pool, deal, cat, band, area, zone, pj, bounds]); // eslint-disable-line react-hooks/exhaustive-deps
  const projList = projects ? S.projs.filter((p) => (!area || p.area_id === area) && (!zone || areaZone(p.area_id) === zone)) : [];
  const countCat = (fn) => pool.filter((l) => l.deal === deal && fn(l)).length;
  const countZone = (z) => pool.filter((l) => l.deal === deal && (!z || areaZone(l.area_id) === z)).length;
  const countIn = (a) => filtered(false).filter((l) => l.area_id === a.id).length;
  const cl = deal === 'rent' ? 'إيجار' : 'للبيع';

  // toolbar height → map/list height (reference: --mh)
  useEffect(() => {
    if (embedded) { setMh(height); return undefined; }
    const calc = () => { const t = tool.current; if (!t) return; const top = t.getBoundingClientRect().bottom + window.scrollY; const mob = window.innerWidth < 1024; setMh(Math.max(mob ? 440 : 520, window.innerHeight - top - (mob ? 60 : 0))); };
    calc(); window.addEventListener('resize', calc); return () => window.removeEventListener('resize', calc);
  }, [embedded, height]);
  // map events: "search this area" appears once the map was moved; hint + pin level follow the zoom; declutter re-runs on every move
  useEffect(() => {
    const map = api.current?.map; if (!map) return undefined;
    const snap = () => ({ z: map.getZoom(), c: map.getCenter() });
    const setBase = () => { base.current = snap(); setMoved(false); };
    const onMove = () => { setTick((t) => t + 1); if (!base.current) return setBase(); const s = snap(); setMoved(s.z !== base.current.z || map.distance(s.c, base.current.c) > 60); };
    const onZoom = () => { setZoom(map.getZoom()); setTick((t) => t + 1); };
    map.on('moveend', onMove); map.on('zoomend', onZoom); setZoom(map.getZoom());
    const t = setTimeout(setBase, 700);
    api.current.setBase = setBase;
    return () => { clearTimeout(t); map.off('moveend', onMove); map.off('zoomend', onZoom); };
  }, []);
  useEffect(() => { setShown(PAGE); }, [deal, cat, band, area, zone, pj, avail, bounds]);

  const closePrev = () => setSel(null);
  const flyTo = (pos, z = 16) => api.current?.flyTo(pos, z);
  const rebase = () => setTimeout(() => api.current?.setBase?.(), 700);
  const fitAll = () => { const m = api.current?.map; if (!m) return; const pts = S.areas.map((a) => [a.pos.lat, a.pos.lng]); if (pts.length) m.flyToBounds(pts, { padding: [40, 40], maxZoom: 15, duration: 0.6 }); rebase(); };
  const zoneFocus = (z) => { if (!z) return fitAll(); const as = S.areas.filter((a) => zoneOf(a) === z); if (!as.length) return; flyTo({ lat: as.reduce((s, a) => s + a.pos.lat, 0) / as.length, lng: as.reduce((s, a) => s + a.pos.lng, 0) / as.length }, 13); rebase(); };
  const focus = (l) => { if (view === 'list') setView('map'); setTimeout(() => { flyTo(l.pos, 16); setSel(l.id); rebase(); }, view === 'list' ? 120 : 0); };
  const clearBounds = () => { setBounds(null); api.current?.setBase?.(); };
  // Keep the map within the Erbil governorate: a padded box around every area, so it can't pan to other provinces or zoom out past Erbil.
  const erbilBounds = useMemo(() => { const pts = S.areas.map((a) => a.pos).filter(hasPos); if (!pts.length) return null; const la = pts.map((p) => p.lat), ln = pts.map((p) => p.lng), pad = 0.12; return [{ lat: Math.min(...la) - pad, lng: Math.min(...ln) - pad }, { lat: Math.max(...la) + pad, lng: Math.max(...ln) + pad }]; }, [S.areas]);


  // pins by zoom level (reference: far → main districts + "quarters of …" cluster per part of the city · mid → every
  // neighbourhood · list → listing pins + project pins). "Main" districts = the areas chosen for the home page in the CMS.
  const lvl = 'list'; // overview district/zone bubbles removed — map shows listing pins only; navigate via search + 'ابحث بهالمنطقة'
  const pinned = items.filter((i) => i.hasPin);
  const mainIds = new Set(S.homeAreas.map((a) => a.id));
  let markers;
  if (lvl !== 'list') {
    const inZone = S.areas.filter((a) => (!zone || zoneOf(a) === zone));
    const withCount = inZone.map((a) => [a, countIn(a)]);
    const any = withCount.some(([, n]) => n);
    const bubble = (a, n, small) => ({ id: 'A:' + a.id, kind: 'area' + (small ? ' sm' : ''), lat: a.pos.lat, lng: a.pos.lng, html: `${esc(a.short)} <b>${n}</b>`, onClick: () => { flyTo(a.pos, 14); rebase(); } });
    if (lvl === 'far') {
      markers = withCount.filter(([a, n]) => mainIds.has(a.id) && (n || !any)).map(([a, n]) => bubble(a, n));
    } else {
      markers = withCount.filter(([, n]) => n || !any).sort(([a], [b]) => (mainIds.has(b.id) ? 1 : 0) - (mainIds.has(a.id) ? 1 : 0)).map(([a, n]) => bubble(a, n, !mainIds.has(a.id)));
    }
  } else {
    markers = [
      ...pinned.map((i) => ({ id: i.id, kind: deal === 'rent' ? 'rent' : '', lat: i.pos.lat, lng: i.pos.lng, html: esc(i.priceText), active: sel === i.id || hover === i.id, onClick: () => setSel(i.id), onHover: (m, on) => setHover(on ? i.id : null) })),
      ...projList.map((p) => ({ id: 'P:' + p.id, kind: 'area', lat: p.pos.lat, lng: p.pos.lng, html: `<b>▣</b> ${esc(p.name)}`, active: sel === 'P:' + p.id, onClick: () => setSel('P:' + p.id) })),
    ];
  }
  // declutter: pins that would collide on screen are grouped behind one pin with a "+N" badge; tapping it zooms in
  const map = api.current?.map;
  if (map && markers.length > 1) {
    const pts = markers.map((m) => ({ m, p: map.latLngToContainerPoint([m.lat, m.lng]) })).sort((a, b) => (b.m.active ? 1 : 0) - (a.m.active ? 1 : 0));
    const reps = [];
    pts.forEach((it) => { const r = reps.find((r) => Math.abs(r.p.x - it.p.x) < 48 && Math.abs(r.p.y - it.p.y) < 28); if (r) r.n.push(it.m); else reps.push({ ...it, n: [] }); });
    markers = reps.map((r) => (r.n.length ? { ...r.m, html: `${r.m.html}<span class="vclu" title="كبّر حتى تشوف الكل">+${r.n.length}</span>`, onClick: () => { map.flyTo([r.m.lat, r.m.lng], Math.min(18, map.getZoom() + 2), { duration: 0.5 }); rebase(); } } : r.m));
  }
  void tick;
  const viewBounds = cur ? [cur.pos, ...pinned.map((i) => i.pos)] : S.areas.map((a) => a.pos);
  const selItem = sel && !sel.startsWith('P:') ? S.byId(sel) : null;
  const selProj = sel && sel.startsWith('P:') ? S.projById(sel.slice(2)) : null;
  const hint = lvl === 'far' ? 'المناطق — كبّر أو اضغط وحدة حتى تشوف العروض' : lvl === 'mid' ? 'كبّر أو اضغط منطقة حتى تشوف العروض' : '';

  const activeChips = (small) => {
    const c = `chip chip-sm !bg-paper-2 !border-transparent ${small ? '!h-[30px] !px-2.5 flex-none' : ''}`;
    return (
      <>
        {bounds && <button type="button" className={c} onClick={clearBounds}><Icon name="map" size={13} />منطقة الخريطة<Icon name="close" size={12} /></button>}
        {cur && <button type="button" className={c} onClick={() => { setQ({ area: '' }); if (zone) zoneFocus(zone); else fitAll(); }}>{cur.short}<Icon name="close" size={12} /></button>}
        {curProj && <button type="button" className={c} onClick={() => setQ({ pj: '' })}>{curProj.name}<Icon name="close" size={12} /></button>}
      </>
    );
  };

  const row = (l) => (
    <div key={l.id} className={`group flex gap-3 p-2 rounded-[14px] hover:bg-paper-2 transition-colors ${sel === l.id ? 'bg-paper-2' : ''}`} onMouseEnter={() => setHover(l.id)} onMouseLeave={() => setHover(null)}>
      <Link to={l.href} className="flex-none"><Img src={l.img} className="w-[104px] h-[84px] !rounded-[12px]" /></Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2"><div className="text-[15px] leading-tight"><Price l={l} size="sm" /></div><button type="button" className="icon-btn !w-8 !h-8 -mt-1 text-ink-400 hover:text-red" title="وريني بالخريطة" onClick={() => focus(l)}><Icon name="pin" size={16} /></button></div>
        <Link to={l.href} className="block text-[13.5px] font-semibold clamp-1 group-hover:text-red">{l.title}</Link>
        <div className="lbl clamp-1">{l.projName ? `${l.projName} · ` : ''}{l.areaShort}{!l.hasPin && ' · موقع تقريبي'}</div>
        <div className="mt-1"><Facts l={l} className="!text-[12px] !gap-x-3" /></div>
      </div>
    </div>
  );
  const peekCard = (l) => (
    <button key={l.id} type="button" className="flex-none w-[250px] snap-start flex gap-2.5 items-center p-2 rounded-[14px] border hair text-start bg-white" onClick={() => focus(l)}>
      <Img src={l.img} className="w-[68px] h-[58px] flex-none !rounded-[10px]" />
      <span className="min-w-0"><span className="block text-[14px]"><Price l={l} size="sm" /></span><span className="block text-[12.5px] font-semibold clamp-1">{l.title}</span><span className="block lbl clamp-1">{l.areaShort}</span></span>
    </button>
  );
  const empty = (
    <div className="p-6 text-center"><div className="font-semibold">ماكو شي هنا هسه</div><p className="text-[13px] text-ink-600 mt-1">صغّر الخريطة، غيّر الميزانية، أو خلّي ڤايرو يدوّرلك.</p><button type="button" className="btn btn-ink btn-sm mt-4" onClick={() => setAsk(true)}><Icon name="users" size={15} />اسأل ڤايرو</button></div>
  );
  const viewSeg = (cls) => (
    <div className={`seg !p-1 flex-none ${cls}`}>
      <button type="button" aria-pressed={view === 'map'} className="!h-[32px] !px-3" onClick={() => { setView('map'); if (!embedded) window.scrollTo(0, 0); }}><Icon name="map" size={15} /></button>
      <button type="button" aria-pressed={view === 'list'} className="!h-[32px] !px-3" onClick={() => { setView('list'); if (!embedded) window.scrollTo(0, 0); }}><Icon name="list" size={15} /></button>
    </div>
  );
  const listPanel = (
    <>
      <div className="px-4 lg:px-5 py-3 border-b hair flex items-center justify-between gap-2 flex-none">
        <div className="text-[14px] min-w-0"><b className="num">{items.length}</b> <span className="text-ink-600">{cl}{bounds ? ' · بهالمنطقة' : ''}</span></div>
        <div className="flex flex-wrap justify-end gap-1.5">{activeChips(false)}</div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 lg:px-4 py-3 pb-24 lg:pb-3">
        {items.length ? items.slice(0, shown).map(row) : empty}
        {items.length > shown && <div className="text-center py-3"><button type="button" className="btn btn-line btn-sm" onClick={() => setShown(shown + PAGE)}>عرض المزيد <span className="lbl num">{shown}/{items.length}</span></button></div>}
      </div>
    </>
  );

  return (
    <div data-mapx={embedded ? 'home' : 'page'} className={`flex flex-col ${embedded ? 'rounded-[20px] overflow-hidden border hair bg-white' : ''}`} style={{ '--mh': `${mh}px` }}>
      {/* ---------- toolbar */}
      <section ref={tool} className="border-b hair bg-white">
        <div className={`${embedded ? 'px-3 py-2.5' : 'px-4 lg:px-6 py-3'} flex flex-wrap items-center gap-2 lg:gap-3`}>
          <div className="seg flex-none order-1 lg:order-none">
            <button type="button" aria-pressed={deal === 'sale'} onClick={() => { if (deal !== 'sale') { setQ({ deal: '', band: '', pj: '' }); closePrev(); } }}><Icon name="tag" size={15} />شراء</button>
            <button type="button" aria-pressed={deal === 'rent'} onClick={() => { if (deal !== 'rent') { setQ({ deal: 'rent', band: '', pj: '', cat: cat === 'land' || cat === 'all' ? '' : cat }); closePrev(); } }}><Icon name="key" size={15} />إيجار</button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-sb flex-1 min-w-0 order-3 lg:order-none basis-full lg:basis-0 -mx-4 px-4 lg:mx-0 lg:px-0">
            {CATS.filter((c) => !(deal === 'rent' && c[0] === 'land')).map(([k, ic, t, fn]) => (
              <button key={k} type="button" className="chip chip-sm flex-none" aria-pressed={cat === k} onClick={() => { setQ({ cat: k === 'all' ? '' : k }); closePrev(); }}><Icon name={ic} size={14} />{t} <span className="text-ink-400 num">{countCat(fn)}</span></button>
            ))}
            <span className="w-px h-6 bg-[var(--line)] flex-none self-center mx-1" />
            <button type="button" className="chip chip-sm flex-none" aria-pressed={projects} onClick={() => setQ({ proj: projects ? '' : '1' })}><Icon name="compound" size={14} />مجمعات وأبراج</button>
            <button type="button" className="chip chip-sm flex-none" aria-pressed={avail} title="تخفي المحجوز والمباع / المؤجّر" onClick={() => { setQ({ avail: avail ? '' : '1' }); closePrev(); }}><Icon name="check" size={14} />المتاحة فقط</button>
          </div>
          <select className="field !h-[40px] !text-[13.5px] !w-auto !rounded-[10px] flex-1 lg:flex-none lg:w-[170px] min-w-0 order-4 lg:order-none" value={band} onChange={(e) => { setQ({ band: e.target.value }); closePrev(); }} aria-label="الميزانية">
            <option value="">{deal === 'rent' ? 'أي إيجار شهري' : 'أي سعر'}</option>
            {BANDS(deal).map((b, i) => <option key={i} value={i}>{bandLabel(b)}</option>)}
          </select>
          <select className="field !h-[40px] !text-[13.5px] !w-auto !rounded-[10px] flex-1 lg:flex-none lg:w-[190px] min-w-0 order-4 lg:order-none" value={area} onChange={(e) => { const id = e.target.value; setQ({ area: id, zone: id && zone && areaZone(id) !== zone ? '' : zone, pj: pj && id && S.projById(pj)?.area_id !== id ? '' : pj }); clearBounds(); closePrev(); if (id) { const a = S.areaById(id); if (a) { flyTo(a.pos, 14); rebase(); } } else if (zone) zoneFocus(zone); else fitAll(); }} aria-label="المنطقة">
            <option value="">كل أربيل</option>
            {S.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {embedded
            ? <div className="flex items-center gap-2 flex-none order-2 ms-auto"><span className="text-[13px] hidden sm:inline"><b className="num">{items.length}</b> <span className="text-ink-600">{cl}</span></span>{viewSeg('')}</div>
            : viewSeg('lg:hidden order-2 ms-auto')}
        </div>
      </section>

      {/* ---------- body: results panel + map */}
      <section className={`${embedded ? '' : 'lg:grid lg:grid-cols-[minmax(380px,440px)_1fr]'} relative`}>
        {embedded
          ? view === 'list' && <aside className="flex flex-col bg-white" style={{ height: 'var(--mh)' }}>{listPanel}</aside>
          : <aside className={`${view === 'list' ? 'flex' : 'hidden lg:flex'} flex-col border-e hair bg-white lg:sticky lg:top-[72px]`} style={{ height: 'var(--mh)' }}>{listPanel}</aside>}

        <div className={`relative ${view === 'list' ? (embedded ? 'hidden' : 'hidden lg:block') : ''}`} style={{ height: 'var(--mh)', isolation: 'isolate' }}>
          <MapView height="auto" style={{ position: 'absolute', inset: 0 }} bounds={viewBounds} zoom={14} maxZoom={15} minZoom={9} maxBounds={erbilBounds} pageScroll={embedded} markers={markers} apiRef={api}>
            {moved && (
              <button type="button" className="absolute top-4 left-1/2 -translate-x-1/2 btn btn-ink btn-sm shadow-pop transition-all" style={{ zIndex: 1100 }} onClick={() => { const m = api.current?.map; if (!m) return; setBounds(m.getBounds()); setQ({ area: '' }); api.current.setBase(); toast('نعرضلك العقارات بهالجزء من الخريطة'); }}><Icon name="search" size={15} />ابحث بهالمنطقة</button>
            )}
            <div className="absolute top-4 start-4 hidden sm:flex items-center gap-3 bg-white/95 backdrop-blur rounded-[12px] border hair shadow-soft px-3 py-2 text-[12px]" style={{ zIndex: 1000 }}>
              <span className="inline-flex items-center gap-1.5"><span className={`pin-price !h-[22px] !px-2 !text-[11px] num ${deal === 'rent' ? 'rent' : ''}`}>{deal === 'rent' ? '$/شهر' : '$'}</span>{deal === 'rent' ? 'الإيجار الشهري' : 'سعر البيع'}</span>
              {projects && <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-[4px] bg-white border-2 border-ink" />مشروع</span>}
              <span className="text-ink-400">OpenStreetMap</span>
            </div>
            {hint && (
              <div className="absolute top-4 pointer-events-none hidden md:block max-w-[46%]" style={{ zIndex: 1000, insetInlineEnd: 68 }}><span className="inline-flex items-center gap-1.5 bg-white/95 backdrop-blur rounded-[12px] border hair shadow-soft px-3 py-2 text-[12px] font-medium text-ink-600">{hint}</span></div>
            )}

            {/* floating preview */}
            {(selItem || selProj) && (
              <div className="absolute lg:bottom-5 lg:start-5 lg:w-[360px] bottom-[176px] inset-x-3 lg:inset-x-auto" style={{ zIndex: 1200 }}>
                {selProj ? (
                  <div className="bg-white rounded-[18px] shadow-pop border hair overflow-hidden fade-in">
                    <div className="relative"><Img src={selProj.img} className="h-[120px] !rounded-none" label={selProj.typeAr} /><button type="button" className="absolute top-2 end-2 icon-btn !w-8 !h-8 bg-white shadow-soft" aria-label="إغلاق" onClick={closePrev}><Icon name="close" size={15} /></button></div>
                    <div className="p-4">
                      <div className="lbl">{selProj.typeAr} · {selProj.areaShort} · {selProj.status === 'construction' ? `التسليم ${selProj.handover}` : 'جاهز'}</div>
                      <div className="font-semibold text-[17px]">{selProj.name}</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[13px]">{selProj.price_from > 0 && <span><span className="lbl">شراء من</span> <b className="num" dir="ltr">{selProj.fromText}</b> <span className="lbl num">· {selProj.unitList.length}</span></span>}</div>
                      <div className="flex gap-2 mt-3"><button type="button" className="btn btn-ink btn-sm flex-1" onClick={() => { setQ({ pj: selProj.id, cat: '', area: area && area !== selProj.area_id ? '' : area }); clearBounds(); closePrev(); }}>وريني عروضه</button><Link to={selProj.href} className="btn btn-line btn-sm">المشروع<Icon name="arrow" size={14} className="flip-rtl" /></Link></div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-[18px] shadow-pop border hair overflow-hidden fade-in">
                    <div className="flex gap-3 p-3">
                      <Link to={selItem.href} className="relative flex-none"><Img src={selItem.img} className="w-[112px] h-[104px] !rounded-[12px]" /></Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2"><DealTag l={selItem} /><button type="button" className="icon-btn !w-8 !h-8 -mt-1 -me-1" aria-label="إغلاق" onClick={closePrev}><Icon name="close" size={15} /></button></div>
                        <div className="mt-1"><Price l={selItem} /></div>
                        <Link to={selItem.href} className="block text-[14px] font-semibold clamp-1 hover:text-red">{selItem.title}</Link>
                        <div className="lbl clamp-1">{selItem.projName ? `${selItem.projName} · ` : ''}{selItem.areaShort}</div>
                      </div>
                    </div>
                    <div className="px-3"><Facts l={selItem} className="!text-[12.5px]" /></div>
                    <div className="text-[12.5px] text-ink-600 px-3 mt-1.5 clamp-1">{selItem.deal === 'rent' ? [selItem.furnishing, selItem.available, selItem.deposit ? `التأمين ${S.money(selItem.deposit)}` : 'التأمين غير محدد'].filter(Boolean).join(' · ') : [selItem.project ? (selItem.project.status === 'construction' ? `قيد الإنشاء · ${selItem.project.handover}` : 'جاهز') : 'جاهز', selItem.isInstall ? 'تقسيط' : 'كاش'].join(' · ')}</div>
                    <div className="flex gap-2 p-3"><Link to={selItem.href} className="btn btn-ink btn-sm flex-1">شوف العقار</Link><SaveBtn id={selItem.id} className="!w-10 !h-10 !shadow-none border hair" /><button type="button" className="btn btn-line btn-sm" onClick={() => setBooking(selItem)}>{selItem.deal === 'rent' ? 'التوفر' : 'معاينة'}</button></div>
                  </div>
                )}
              </div>
            )}

            {/* mobile peek sheet */}
            <div className="lg:hidden absolute bottom-0 inset-x-0 bg-white rounded-t-[22px] shadow-pop border-t hair pt-2 pb-3" style={{ zIndex: 1150 }}>
              <div className="w-10 h-1 rounded-full bg-ink-200 mx-auto" />
              <div className="flex items-center justify-between gap-2 px-4 mt-2">
                <div className="text-[14px] min-w-0 clamp-1"><b className="num">{items.length}</b> <span className="text-ink-600">{cl}</span></div>
                <div className="flex gap-1 ms-auto overflow-x-auto no-sb">{activeChips(true)}</div>
                <button type="button" className="link text-[13px]" onClick={() => { setView('list'); if (!embedded) window.scrollTo(0, 0); }}><Icon name="list" size={15} />القائمة</button>
              </div>
              <div className="flex gap-3 overflow-x-auto no-sb snap-x-m px-4 mt-2">
                {items.length ? items.slice(0, 20).map(peekCard) : <div className="text-[13px] text-ink-600 py-3">ماكو عقارات بهالعرض. جرّب تصغّر الخريطة.</div>}
              </div>
            </div>
          </MapView>
        </div>
      </section>
      {!embedded && <div className="lg:hidden px-4 py-3 text-[11.5px] text-ink-500 bg-paper-2 border-t hair">العقارات بدون موقع دقيق تظهر ضمن منطقتها. مواقع الدبابيس للعرض، وڤايرو يأكد العنوان وقت المعاينة.</div>}

      {ask && (
        <LeadModal title={deal === 'rent' ? 'اطلب مساعدة بالإيجار' : 'اطلب استشارة'} sub={deal === 'rent' ? 'گلّنا شنو تحتاج، ونختارلك إيجارات مناسبة.' : 'احچي ويا مستشار ڤايرو عن خياراتك.'} kind={deal === 'rent' ? 'rental-help' : 'consult'} deal={deal} onClose={() => setAsk(false)} icon={deal === 'rent' ? 'key' : 'users'} />
      )}
      {booking && (
        <LeadModal title={booking.deal === 'rent' ? 'اسأل عن التوفر' : 'احجز معاينة'} sub={`${booking.title} · ${booking.id}`} kind="viewing" listingIds={[booking.id]} listing={booking} deal={booking.deal} onClose={() => setBooking(null)} submitLabel={booking.deal === 'rent' ? 'أرسل لڤايرو' : 'أرسل طلب المعاينة'} icon={booking.deal === 'rent' ? 'key' : 'cal'} />
      )}
    </div>
  );
}
