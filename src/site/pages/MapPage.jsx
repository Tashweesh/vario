import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle, useLayout } from '../../lib/hooks.js';
import { Chip } from '../../components/ui.jsx';
import { stripes } from '../parts.jsx';

// Schematic map: areas are positioned by their CMS map coordinates (x/y %).
export default function MapPage() {
  useDocTitle('خريطة العقارات');
  const S = useSite();
  const L = useLayout();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const mode = sp.get('deal') === 'rent' ? 'rent' : sp.get('deal') === 'projects' ? 'projects' : 'sale';
  const area = sp.get('area') || '';
  const [zoom, setZoom] = useState(1);
  const set = (k, v) => { const n = new URLSearchParams(sp); if (!v) n.delete(k); else n.set(k, v); setSp(n, { replace: true }); };

  const listings = S.live.filter((l) => l.deal === mode && (!area || l.area_id === area));
  const projs = S.projs.filter((p) => !area || p.area_id === area);
  const countIn = (a) => (mode === 'projects' ? S.projs.filter((p) => p.area_id === a.id).length : S.live.filter((l) => l.deal === mode && l.area_id === a.id).length);
  const cur = S.areaById(area);
  const row = { textAlign: 'start', display: 'flex', gap: 12, padding: 8, border: '1px solid #e7e7e3', borderRadius: 14, background: '#fff', cursor: 'pointer' };

  return (
    <section style={{ paddingTop: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: L.filterCols, gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>خريطة العقارات</h1><span style={{ fontSize: 13, color: '#767a83' }}>{mode === 'projects' ? `${projs.length} مشروع` : `${listings.length} عقار`}</span></div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Chip on={mode === 'sale'} onClick={() => set('deal', '')}>للبيع</Chip>
            <Chip on={mode === 'rent'} onClick={() => set('deal', 'rent')}>للإيجار</Chip>
            <Chip on={mode === 'projects'} onClick={() => set('deal', 'projects')}>مشاريع</Chip>
            {cur && <Chip on onClick={() => set('area', '')} style={{ background: '#c8102e', borderColor: '#c8102e' }}>{cur.short} ✕</Chip>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: L.phone ? 'none' : 620, overflowY: 'auto', paddingInlineEnd: 4 }}>
            {mode === 'projects'
              ? projs.map((p) => (
                <button key={p.id} className="h-border" style={row} onClick={() => nav(p.href)}>
                  <img src={p.img} alt="" style={{ width: 84, height: 66, borderRadius: 10, objectFit: 'cover', flex: 'none' }} />
                  <div style={{ minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 15 }} dir="ltr">{p.fromText}</div><div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: 12, color: '#767a83' }}>{p.areaName}</div></div>
                </button>))
              : listings.map((l) => (
                <button key={l.id} className="h-border" style={row} onClick={() => nav(l.href)}>
                  <img src={l.img} alt="" style={{ width: 84, height: 66, borderRadius: 10, objectFit: 'cover', flex: 'none' }} />
                  <div style={{ minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 15 }} dir="ltr">{l.priceText}</div><div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</div><div style={{ fontSize: 12, color: '#767a83' }}>{l.areaName}</div></div>
                </button>))}
            {(mode === 'projects' ? projs : listings).length === 0 && <div style={{ color: '#767a83', fontSize: 14, padding: 16, textAlign: 'center' }}>لا توجد نتائج في هذه المنطقة</div>}
          </div>
        </div>
        <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', border: '1px solid #e7e7e3', minHeight: L.mapH, background: stripes('#f6f6f4', '#f0f0ed', 12) }}>
          <div style={{ position: 'absolute', inset: 0, transform: `scale(${zoom})`, transformOrigin: cur ? `${100 - cur.x}% ${cur.y}%` : 'center', transition: 'transform .3s' }}>
            {S.areas.map((a) => (
              <button key={a.id} onClick={() => set('area', a.id === area ? '' : a.id)} style={{ position: 'absolute', insetInlineStart: a.left, top: a.top, transform: `translate(50%,-50%) scale(${1 / zoom})`, height: 30, padding: '0 10px', borderRadius: 999, background: a.id === area ? '#c8102e' : '#1d1e22', color: '#fff', border: 0, boxShadow: '0 2px 8px rgba(0,0,0,.15)', fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                {a.short}<span style={{ opacity: 0.7, fontWeight: 500 }}>{countIn(a)}</span>
              </button>
            ))}
            <span style={{ position: 'absolute', top: '50%', insetInlineStart: '50%', width: 260, height: 260, borderRadius: 999, border: '1px dashed #c8102e', transform: 'translate(50%,-50%)', opacity: 0.5, pointerEvents: 'none' }} />
          </div>
          <div style={{ position: 'absolute', top: 16, insetInlineStart: 16, fontSize: 11, color: '#767a83', fontFamily: 'ui-monospace,monospace', background: '#fff', padding: '4px 8px', borderRadius: 6 }} dir="ltr">Erbil · schematic</div>
          <div style={{ position: 'absolute', top: 16, insetInlineEnd: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button aria-label="تكبير" onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))} style={zbtn}>+</button>
            <button aria-label="تصغير" onClick={() => setZoom((z) => Math.max(1, z - 0.25))} style={zbtn}>−</button>
          </div>
        </div>
      </div>
    </section>
  );
}
const zbtn = { width: 36, height: 36, borderRadius: 10, background: '#fff', border: '1px solid #d8d8d3', display: 'grid', placeItems: 'center', fontWeight: 600, cursor: 'pointer', fontSize: 16 };
