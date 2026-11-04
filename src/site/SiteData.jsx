import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { AMEN, PROJECT_TYPES, STATUS, TYPE_AR, listingFacts, listingPlan, listingTitle, usd, handoverText } from '../lib/format.js';
import { ERBIL, hasPos, toPos } from '../components/MapView.jsx';

// Map position: the row's own pin, else its area's centre, else Erbil.
const posOf = (row, area) => (hasPos(row) ? toPos(row) : hasPos(area) ? toPos(area) : ERBIL);

const Ctx = createContext(null);
export const useSite = () => useContext(Ctx);

const SAVED_KEY = 'vairo:saved';
const readLS = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

export function SiteDataProvider({ children }) {
  const [raw, setRaw] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(() => readLS(SAVED_KEY, []));

  const load = useCallback(async () => {
    try {
      const res = await Promise.all([
        supabase.from('areas').select('*').order('sort'),
        supabase.from('developers').select('*').order('name'),
        supabase.from('projects').select('*').eq('published', true).order('sort'),
        supabase.from('listings').select('*, listing_media(url, kind, sort)').neq('status', 'draft').order('listed_at', { ascending: false }),
        supabase.from('agents').select('id, name, title, img, phone'),
        supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
      ]);
      const bad = res.find((r) => r.error);
      if (bad) throw bad.error;
      const [areas, devs, projects, listings, agents, settings] = res.map((r) => r.data);
      setRaw({ areas, devs, projects, listings, agents, settings: settings || {} });
      setError(null);
    } catch (e) {
      setError(e.message || String(e));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const on = (e) => { if (e.key === SAVED_KEY) setSaved(readLS(SAVED_KEY, [])); };
    window.addEventListener('storage', on);
    return () => window.removeEventListener('storage', on);
  }, []);

  const toggleSave = useCallback((id) => setSaved((s) => { const n = s.includes(id) ? s.filter((x) => x !== id) : [...s, id]; writeLS(SAVED_KEY, n); return n; }), []);

  const value = useMemo(() => {
    const base = { ready: !!raw, error, reload: load, saved, toggleSave };
    if (!raw) return base;
    const S = raw.settings;
    const money = (n) => usd(n); // USD is the only currency on the site
    const A = Object.fromEntries(raw.areas.map((a) => [a.id, a]));
    const DV = Object.fromEntries(raw.devs.map((d) => [d.id, d]));
    const PR = Object.fromEntries(raw.projects.map((p) => [p.id, p]));
    const G = Object.fromEntries(raw.agents.map((a) => [a.id, a]));

    const card = (l) => {
      const a = A[l.area_id] || { name: '', short: '' };
      const pr = l.project_id ? PR[l.project_id] : null;
      const media = [...(l.listing_media || [])].sort((x, y) => x.sort - y.sort);
      const imgs = media.filter((m) => m.kind === 'photo').map((m) => m.url);
      const plans = media.filter((m) => m.kind === 'plan').map((m) => m.url);
      const amount = l.deal === 'rent' ? l.rent : l.price;
      const st = STATUS[l.status];
      return {
        ...l, raw: l, area: a, project: pr, agent: G[l.agent_id] || null,
        typeAr: TYPE_AR[l.type], title: listingTitle(l, pr), facts: listingFacts(l), areaName: a.name, areaShort: a.short,
        projName: pr ? pr.name : '', hasProj: !!pr, imgs, plans, img: imgs[0] || '', photoCount: imgs.length,
        amount: amount || 0, priceText: l.hide_price ? 'اتصل للسعر' : money(amount), per: l.deal === 'rent' && !l.hide_price ? '/ شهر' : '',
        dealLabel: l.deal === 'rent' ? 'للإيجار' : 'للبيع',
        ppm: l.price && !l.hide_price && l.size ? money(Math.round(l.price / l.size)) + ' / م²' : '',
        payLabel: l.payment === 'installments' ? 'تقسيط' : l.payment === 'both' ? 'كاش أو تقسيط' : l.payment === 'cash' ? 'كاش' : l.furnishing || '',
        isInstall: l.payment === 'installments' || l.payment === 'both',
        statusLabel: l.status === 'sold' && l.deal === 'rent' ? 'مؤجّر' : st[0], statusColor: st[1], statusBg: st[2],
        plan: listingPlan(l, pr), href: `/property/${l.id}`, pos: posOf(l, a), hasPin: hasPos(l),
      };
    };
    const all = raw.listings.map(card);
    const live = all.filter((l) => l.status === 'live' || l.status === 'reserved');
    const visible = all.filter((l) => l.status !== 'draft'); // everything shown on the site, incl. sold / rented (tagged)
    const available = all.filter((l) => l.status === 'live'); // the 'available only' filter

    const proj = (p) => {
      const a = A[p.area_id] || {}, d = DV[p.developer_id] || {};
      return {
        ...p, areaName: a.name, areaShort: a.short, devName: d.name, devMono: d.mono, typeAr: PROJECT_TYPES[p.type],
        handover: handoverText(p.handover), isReady: p.status === 'ready', statusLabel: p.status === 'ready' ? 'جاهز' : 'قيد الإنشاء', progressW: p.progress + '%',
        fromText: money(p.price_from), amenList: (p.amenities || []).map((k) => AMEN[k] || k),
        unitList: live.filter((l) => l.project_id === p.id), downPct: p.plan_down + '%', monthsText: p.plan_months + ' شهر',
        instPct: Math.max(0, 100 - p.plan_down - p.plan_handover) + '%', handPct: p.plan_handover + '%', href: `/projects/${p.id}`, pos: posOf(p, a), hasPin: hasPos(p),
      };
    };
    const projs = raw.projects.map(proj);
    // Area buying price (USD/m²): average price ÷ size of the sale listings on the market in that area; falls back to the stored value.
    const ppmOf = (a) => { const s = live.filter((l) => l.area_id === a.id && l.deal === 'sale' && l.price > 0 && l.size > 0 && !l.hide_price); return s.length ? Math.round(s.reduce((t, l) => t + l.price / l.size, 0) / s.length) : a.ppm; };
    const rentOf = (a) => { const s = live.filter((l) => l.area_id === a.id && l.deal === 'rent' && l.rent > 0 && l.size > 0 && !l.hide_price); return s.length ? Math.round((s.reduce((t, l) => t + l.rent / l.size, 0) / s.length) * 10) / 10 : +a.rent || 0; };
    const maxPpm = Math.max(1, ...raw.areas.map(ppmOf));
    const DNA = { family: 'للعوائل', convenience: 'قرب الخدمات', green: 'مساحات خضراء', dining: 'مطاعم ومقاهي', growth: 'نمو', quiet: 'هدوء' };
    const areas = raw.areas.map((a) => {
      const ls = live.filter((l) => l.area_id === a.id);
      const ppm = ppmOf(a);
      const rent = rentOf(a);
      return {
        ...a, ppm, rent, desc: a.description, ppmText: money(ppm), rentText: '$' + rent + ' / م² شهرياً',
        saleCount: ls.filter((l) => l.deal === 'sale').length, rentCount: ls.filter((l) => l.deal === 'rent').length, total: ls.length,
        pos: posOf(a), barW: Math.round((ppm / maxPpm) * 100) + '%',
        dnaRows: Object.entries(DNA).map(([k, lab]) => ({ lab, v: a.dna?.[k] ?? 0, w: (a.dna?.[k] ?? 0) * 10 + '%' })),
        listings: ls, projs: projs.filter((p) => p.area_id === a.id), href: `/areas/${a.id}`,
      };
    });
    const devs = raw.devs.map((d) => ({ ...d, desc: d.description, projs: projs.filter((p) => p.developer_id === d.id), projCount: projs.filter((p) => p.developer_id === d.id).length }));
    const homeAreas = (S.home_areas?.length ? S.home_areas.map((id) => areas.find((a) => a.id === id)).filter(Boolean) : areas).slice(0, 4);
    const featured = live.filter((l) => l.featured).sort((a, b) => (a.featured_rank ?? 99) - (b.featured_rank ?? 99));
    return {
      ...base, settings: S, money, all, live, visible, available, card, projs, areas, devs, homeAreas, featured,
      byId: (id) => all.find((l) => l.id === id), projById: (id) => projs.find((p) => p.id === id), areaById: (id) => areas.find((a) => a.id === id),
      savedCards: saved.map((id) => all.find((l) => l.id === id)).filter(Boolean),
      showAgent: S.show_agent !== false, showId: S.show_listing_id !== false,
    };
  }, [raw, error, load, saved, toggleSave]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
