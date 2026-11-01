import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Real maps on OpenStreetMap tiles (no API key). Swap the provider with VITE_MAP_TILE_URL / VITE_MAP_TILE_ATTR.
export const ERBIL = { lat: 36.1911, lng: 44.0092 };
const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = import.meta.env.VITE_MAP_TILE_ATTR || '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

export const hasPos = (o) => !!o && o.lat != null && o.lng != null && o.lat !== '' && o.lng !== '' && Number.isFinite(+o.lat) && Number.isFinite(+o.lng);
export const toPos = (o) => ({ lat: +o.lat, lng: +o.lng });
export const kmBetween = (a, b) => {
  const d = Math.PI / 180, dLat = (b.lat - a.lat) * d, dLng = (b.lng - a.lng) * d;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * d) * Math.cos(b.lat * d) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};
export const directionsUrl = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Marker kinds: 'pill' (default, dark price pill), 'area' (white area pill), 'num' (numbered red circle), 'dot' (location dot; approx = grey).
const sig = (m) => [m.kind, m.html, !!m.active, !!m.approx].join('|');
const icon = (m) => L.divIcon({
  className: 'vmk', iconSize: null,
  html: m.kind === 'dot' ? `<span class="vdot${m.approx ? ' approx' : ''}"></span>` : `<span class="vpill ${m.kind || ''}${m.active ? ' on' : ''}" dir="rtl">${m.html}</span>`,
});

/**
 * props: center {lat,lng}, zoom, bounds [{lat,lng}] (wins over center), markers [{id, lat, lng, kind, html, active, approx,
 * interactive, popup (html), onClick(m), onHover(m, on)}], lines [{id, points:[{lat,lng}], color, weight, dash}],
 * interactive, scrollZoom, zoomControl, onClick({lat,lng}), onNavigate(href) for [data-href] elements inside popups,
 * apiRef -> { map, flyTo(pos, zoom), openPopup(id) }. Children are overlays: give them position:absolute and zIndex 900.
 */
export function MapView({ center = ERBIL, zoom = 12, bounds, maxZoom = 16, minZoom, maxBounds, markers = [], lines = [], interactive = true, scrollZoom = true, zoomControl = true, onClick, onNavigate, apiRef, style, height = 400, children }) {
  const el = useRef(null);
  const mapRef = useRef(null);
  const mk = useRef(new Map());
  const lineLayer = useRef(null);
  const cb = useRef({});
  cb.current = { onClick, onNavigate };

  useEffect(() => {
    const node = el.current;
    const mb = (maxBounds || []).filter(hasPos);
    const map = L.map(node, {
      zoomControl: false, attributionControl: false, boxZoom: false,
      dragging: interactive, scrollWheelZoom: interactive && scrollZoom, doubleClickZoom: interactive, touchZoom: interactive, keyboard: interactive,
      center: [center.lat, center.lng], zoom,
      ...(minZoom != null ? { minZoom } : {}),
      ...(mb.length ? { maxBounds: L.latLngBounds(mb.map((pt) => [+pt.lat, +pt.lng])).pad(0.02), maxBoundsViscosity: 1 } : {}),
    });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);
    L.control.attribution({ prefix: false, position: 'bottomleft' }).addTo(map);
    if (interactive && zoomControl) L.control.zoom({ position: 'topleft', zoomInTitle: 'تكبير', zoomOutTitle: 'تصغير' }).addTo(map);
    lineLayer.current = L.layerGroup().addTo(map);
    map.on('click', (e) => cb.current.onClick?.({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }));
    const onDom = (e) => {
      const t = e.target.closest?.('[data-href]');
      if (t && cb.current.onNavigate) { e.preventDefault(); e.stopPropagation(); cb.current.onNavigate(t.getAttribute('data-href')); }
    };
    node.addEventListener('click', onDom);
    const ro = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    ro.observe(node);
    mapRef.current = map;
    if (apiRef) apiRef.current = { map, flyTo: (p, z) => map.flyTo([p.lat, p.lng], z ?? map.getZoom(), { duration: 0.6 }), openPopup: (id) => mk.current.get(id)?.openPopup() };
    return () => { ro.disconnect(); node.removeEventListener('click', onDom); map.remove(); mapRef.current = null; mk.current.clear(); if (apiRef) apiRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // View: refit only when the requested view actually changes, so user panning survives re-renders.
  const viewKey = JSON.stringify([bounds, center, zoom]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const pts = (bounds || []).filter(hasPos);
    if (pts.length === 1) map.setView([+pts[0].lat, +pts[0].lng], zoom);
    else if (pts.length > 1) map.fitBounds(L.latLngBounds(pts.map((p) => [+p.lat, +p.lng])), { padding: [40, 40], maxZoom });
    else map.setView([center.lat, center.lng], zoom);
  }, [viewKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set();
    markers.forEach((m) => {
      if (!hasPos(m)) return;
      seen.add(m.id);
      const ll = [+m.lat, +m.lng];
      let mr = mk.current.get(m.id);
      if (!mr) {
        mr = L.marker(ll, { icon: icon(m), interactive: m.interactive !== false, keyboard: false, riseOnHover: true, zIndexOffset: m.active ? 1000 : 0 });
        mr.on('click', () => mr._vm.onClick?.(mr._vm));
        mr.on('mouseover', () => mr._vm.onHover?.(mr._vm, true));
        mr.on('mouseout', () => mr._vm.onHover?.(mr._vm, false));
        mr.addTo(map);
        mk.current.set(m.id, mr);
      } else {
        const cur = mr.getLatLng();
        if (cur.lat !== ll[0] || cur.lng !== ll[1]) mr.setLatLng(ll);
        if (mr._vsig !== sig(m)) mr.setIcon(icon(m));
        mr.setZIndexOffset(m.active ? 1000 : 0);
      }
      mr._vsig = sig(m);
      mr._vm = m;
      if (m.popup) {
        if (!mr.getPopup()) mr.bindPopup(m.popup, { closeButton: false, offset: [0, -14], maxWidth: 260, autoPanPadding: [30, 30] });
        else if (mr.getPopup().getContent() !== m.popup) mr.setPopupContent(m.popup);
      } else if (mr.getPopup()) mr.unbindPopup();
    });
    mk.current.forEach((mr, id) => { if (!seen.has(id)) { mr.remove(); mk.current.delete(id); } });
  }, [markers]);

  const lineKey = JSON.stringify(lines);
  useEffect(() => {
    const lg = lineLayer.current;
    if (!lg) return;
    lg.clearLayers();
    lines.forEach((ln) => L.polyline(ln.points.filter(hasPos).map((p) => [+p.lat, +p.lng]), { color: ln.color || '#1d1e22', weight: ln.weight || 3, dashArray: ln.dash, opacity: 0.9 }).addTo(lg));
  }, [lineKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'relative', height, ...style }}>
      <div ref={el} dir="ltr" style={{ position: 'absolute', inset: 0 }} />
      {children}
    </div>
  );
}

// CMS: click the map (or type coordinates) to place a pin. value {lat,lng} | null; fallback is shown as a grey dot when there is no pin.
export function LocationPicker({ value, onChange, fallback, clearable = false, height = 240, hint }) {
  const pos = hasPos(value) ? toPos(value) : null;
  const fb = hasPos(fallback) ? toPos(fallback) : ERBIL;
  const [txt, setTxt] = useState({ lat: pos ? String(pos.lat) : '', lng: pos ? String(pos.lng) : '' });
  useEffect(() => {
    setTxt((t) => ((pos && parseFloat(t.lat) === pos.lat && parseFloat(t.lng) === pos.lng) || (!pos && t.lat === '' && t.lng === '')) ? t : { lat: pos ? String(pos.lat) : '', lng: pos ? String(pos.lng) : '' });
  }, [pos?.lat, pos?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  const [view, setView] = useState(() => ({ center: pos || fb, zoom: pos ? 15 : 13 }));
  useEffect(() => { if (!pos) setView({ center: fb, zoom: 13 }); }, [fb.lat, fb.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  const commit = (lat, lng) => {
    const a = parseFloat(lat), b = parseFloat(lng);
    if (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180) onChange({ lat: +a.toFixed(6), lng: +b.toFixed(6) });
  };
  const p = pos || fb;
  return (
    <div>
      <MapView height={height} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #d8d8d3' }} center={view.center} zoom={view.zoom} scrollZoom={false} onClick={onChange} markers={[{ id: 'pin', kind: 'dot', approx: !pos, lat: p.lat, lng: p.lng, interactive: false }]}>
        <div style={{ position: 'absolute', top: 10, insetInlineStart: 10, zIndex: 900, fontSize: 12, fontWeight: 600, background: '#fff', padding: '4px 8px', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,.08)', pointerEvents: 'none' }}>{pos ? 'اضغط على الخريطة لتغيير الموقع' : 'اضغط على الخريطة لتحديد الموقع'}</div>
      </MapView>
      <div style={{ display: 'grid', gridTemplateColumns: clearable && pos ? '1fr 1fr auto' : '1fr 1fr', gap: 8, marginTop: 8, alignItems: 'center' }}>
        <input className="inp-sm" dir="ltr" inputMode="decimal" aria-label="خط العرض" placeholder="lat 36.19…" value={txt.lat} onChange={(e) => { const v = e.target.value; setTxt((t) => ({ ...t, lat: v })); commit(v, txt.lng); }} />
        <input className="inp-sm" dir="ltr" inputMode="decimal" aria-label="خط الطول" placeholder="lng 44.00…" value={txt.lng} onChange={(e) => { const v = e.target.value; setTxt((t) => ({ ...t, lng: v })); commit(txt.lat, v); }} />
        {clearable && pos && <button type="button" onClick={() => onChange(null)} style={{ height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid #d8d8d3', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>مركز المنطقة</button>}
      </div>
      {hint && <div style={{ fontSize: 12, color: '#767a83', marginTop: 6 }}>{hint}</div>}
    </div>
  );
}
