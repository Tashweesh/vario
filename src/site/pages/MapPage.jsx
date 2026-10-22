import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle, useLayout } from '../../lib/hooks.js';
import { Chip } from '../../components/ui.jsx';
import { MapView, esc } from '../../components/MapView.jsx';

// Listings/projects with their own pin show as price pills; the rest are counted in their area's pill.
const popup = (i, projects) => `<div class="vpop" dir="rtl">${i.img ? `<img src="${esc(i.img)}" alt="">` : ''}<div class="vpop-b"><div class="vpop-p" dir="ltr">${esc(projects ? i.fromText : i.priceText)}</div><div class="vpop-t">${esc(projects ? i.name : i.title)}</div><div class="vpop-s">${esc(i.areaName)}</div><button type="button" class="vpop-btn" data-href="${esc(i.href)}">${projects ? 'عرض المشروع' : 'عرض العقار'}</button></div></div>`;

export default function MapPage() {
  useDocTitle('خريطة العقارات');
  const S = useSite();
  const L = useLayout();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const mode = sp.get('deal') === 'rent' ? 'rent' : sp.get('deal') === 'projects' ? 'projects' : 'sale';
  const area = sp.get('area') || '';
  const [hover, setHover] = useState(null);
  const set = (k, v) => { const n = new URLSearchParams(sp); if (!v) n.delete(k); else n.set(k, v); setSp(n, { replace: true }); };

  const projects = mode === 'projects';
  const items = projects ? S.projs.filter((p) => !area || p.area_id === area) : S.live.filter((l) => l.deal === mode && (!area || l.area_id === area));
  const countIn = (a) => (projects ? S.projs : S.live.filter((l) => l.deal === mode)).filter((i) => i.area_id === a.id).length;
  const cur = S.areaById(area);
  const pinned = items.filter((i) => i.hasPin);

  const markers = [
    ...S.areas.map((a) => ({ id: 'area:' + a.id, kind: 'area', lat: a.pos.lat, lng: a.pos.lng, html: `${esc(a.short)} <b>${countIn(a)}</b>`, active: a.id === area, onClick: () => set('area', a.id === area ? '' : a.id) })),
    ...pinned.map((i) => ({ id: i.id, lat: i.pos.lat, lng: i.pos.lng, html: esc(projects ? i.fromText : i.priceText), active: hover === i.id, popup: popup(i, projects), onHover: (m, on) => setHover(on ? i.id : null) })),
  ];
  const bounds = cur ? [cur.pos, ...pinned.map((i) => i.pos)] : S.areas.map((a) => a.pos);
  const row = (on) => ({ textAlign: 'start', display: 'flex', gap: 12, padding: 8, border: `1px solid ${on ? '#1d1e22' : '#e7e7e3'}`, borderRadius: 14, background: '#fff', cursor: 'pointer' });

  return (
    <section style={{ paddingTop: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: L.filterCols, gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, order: L.phone ? 2 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>خريطة العقارات</h1><span style={{ fontSize: 13, color: '#767a83' }}>{projects ? `${items.length} مشروع` : `${items.length} عقار`}</span></div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Chip on={mode === 'sale'} onClick={() => set('deal', '')}>للبيع</Chip>
            <Chip on={mode === 'rent'} onClick={() => set('deal', 'rent')}>للإيجار</Chip>
            <Chip on={mode === 'projects'} onClick={() => set('deal', 'projects')}>مشاريع</Chip>
            {cur && <Chip on onClick={() => set('area', '')} style={{ background: '#c8102e', borderColor: '#c8102e' }}>{cur.short} ✕</Chip>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: L.phone ? 'none' : 620, overflowY: 'auto', paddingInlineEnd: 4 }}>
            {items.map((i) => (
              <button key={i.id} style={row(hover === i.id)} onClick={() => nav(i.href)} onMouseEnter={() => setHover(i.id)} onMouseLeave={() => setHover(null)}>
                <img src={i.img} alt="" style={{ width: 84, height: 66, borderRadius: 10, objectFit: 'cover', flex: 'none', background: '#f6f6f4' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }} dir="ltr">{projects ? i.fromText : i.priceText}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{projects ? i.name : i.title}</div>
                  <div style={{ fontSize: 12, color: '#767a83' }}>{i.areaName}{!i.hasPin && ' · موقع تقريبي'}</div>
                </div>
              </button>
            ))}
            {items.length === 0 && <div style={{ color: '#767a83', fontSize: 14, padding: 16, textAlign: 'center' }}>لا توجد نتائج في هذه المنطقة</div>}
          </div>
        </div>
        <MapView height={L.mapH} style={{ borderRadius: 24, overflow: 'hidden', border: '1px solid #e7e7e3', order: L.phone ? 1 : 2 }} bounds={bounds} zoom={14} maxZoom={15} markers={markers} onNavigate={nav}>
          {cur && items.length > pinned.length && <div style={{ position: 'absolute', bottom: 16, insetInlineEnd: 16, zIndex: 900, fontSize: 12, color: '#5a5e68', background: 'rgba(255,255,255,.92)', padding: '6px 10px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.08)', maxWidth: 260 }}>{items.length - pinned.length} {projects ? 'مشروع' : 'عقار'} بدون موقع دقيق — ضمن {cur.short}</div>}
        </MapView>
      </div>
    </section>
  );
}
