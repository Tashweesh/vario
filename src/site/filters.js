import { groupTypes } from '../lib/format.js';

// Search/filter state lives in the URL (?type=&area=&min=&max=&beds=&pay=&furn=&q=&sort=).
export function readFilters(sp) {
  const g = (k) => sp.get(k) || '';
  return { q: g('q'), type: g('type'), area: g('area'), min: g('min'), max: g('max'), beds: g('beds'), pay: g('pay'), furn: g('furn'), sort: g('sort') || 'new', avail: g('avail') };
}

export function applyFilters(list, f, deal) {
  const types = f.type ? groupTypes(f.type) : null;
  const words = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let out = list.filter((l) => {
    if (deal && l.deal !== deal) return false;
    if (f.avail && l.status !== 'live') return false; // available only: not reserved, not sold / rented
    if (types && !types.includes(l.type)) return false;
    if (f.area && l.area_id !== f.area) return false;
    if (f.min && l.amount < +f.min) return false;
    if (f.max && l.amount > +f.max) return false;
    if (f.beds) { const b = +f.beds; if (b >= 4 ? (l.beds || 0) < 4 : l.beds !== b) return false; }
    if (f.pay === 'cash' && !(l.payment === 'cash' || l.payment === 'both')) return false;
    if (f.pay === 'installments' && !l.isInstall) return false;
    if (f.pay === 'ready' && (l.type === 'land' || (l.project && l.project.status !== 'ready'))) return false;
    if (f.pay === 'construction' && !(l.project && l.project.status === 'construction')) return false;
    if (f.furn === 'furnished' && !(l.furnishing && l.furnishing !== 'غير مفروش')) return false;
    if (f.furn === 'unfurnished' && l.furnishing !== 'غير مفروش') return false;
    if (f.furn === 'now' && l.available !== 'متاح الآن') return false;
    if (words.length) {
      const hay = [l.id, l.title, l.typeAr, l.areaName, l.area?.short, l.projName, l.project?.name_en, l.view_text].join(' ').toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  if (f.sort === 'low') out = [...out].sort((a, b) => a.amount - b.amount);
  else if (f.sort === 'high') out = [...out].sort((a, b) => b.amount - a.amount);
  return out;
}

export const activeCount = (f) => ['type', 'area', 'min', 'max', 'beds', 'pay', 'furn', 'q', 'avail'].filter((k) => f[k]).length;
