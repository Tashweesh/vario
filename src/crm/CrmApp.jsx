import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, q } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { SOURCES, STAGE_AR, TYPE_AR, VIEWING_STATUS, ago, listingTitle, usd } from '../lib/format.js';
import { Btn, Field, Icon, Img, Modal, Spinner, useToast } from '../components/ui.jsx';
import { Crumbs } from '../site/parts.jsx';
import { Shell, StaffGate } from '../staff/Shell.jsx';
import Pipeline from './pages/Pipeline.jsx';
import Contacts from './pages/Contacts.jsx';
import ContactDetail from './pages/ContactDetail.jsx';
import Viewings from './pages/Viewings.jsx';
import Reports from './pages/Reports.jsx';

const Ctx = createContext(null);
export const useCrm = () => useContext(Ctx);

// ───────────── VAIRO OS kit (reference os/shell.js) — local to the CRM pages.
// Tones map the app's labels onto the reference's `osb` badges.
export const STAGE_TONE = { new: 'red', contacted: 'ink', viewing: 'ink', offer: 'amber', closed: 'green' };
export const SCORE_TONE = { hot: 'red', warm: 'amber', cold: 'gray', won: 'green', lost: 'gray' };
export const VIEW_TONE = { confirmed: 'green', pending: 'amber', second: 'ink', done: 'gray', cancelled: 'gray' };
export const DEAL_AR = { sale: 'شراء', rent: 'إيجار' };

export const Badge = ({ tone = 'gray', className = '', children, ...p }) => <span className={`osb osb-${tone} ${className}`} {...p}>{children}</span>;

// O.page(): title / sub / actions header
export const OsPage = ({ title, sub, actions, crumbs }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
    <div className="min-w-0">
      {crumbs && <div className="mb-2"><Crumbs items={crumbs} /></div>}
      <h1 className="t-h2 text-[24px] sm:text-[28px]">{title}</h1>
      {sub && <p className="text-ink-500 text-[14px] mt-1">{sub}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

// O.kpi()
export const Kpi = ({ label, value, sub, delta, icon, tone }) => (
  <div className="os-card p-4 flex flex-col gap-2">
    <div className="flex items-center justify-between gap-2"><span className="text-[12.5px] text-ink-500 font-medium clamp-1">{label}</span>{icon && <span className={tone === 'red' ? 'text-red' : 'text-ink-300'}><Icon name={icon} size={17} /></span>}</div>
    <div className={`text-[24px] font-semibold num leading-none ${tone === 'red' ? 'text-red' : ''}`}>{value}</div>
    {(sub || delta != null) && <div className="text-[12px] text-ink-500 flex items-center gap-2 flex-wrap">{delta != null && <span className={`${delta >= 0 ? 'text-ok' : 'text-red'} font-semibold num`}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%</span>}{sub}</div>}
  </div>
);

// O.av(): initials avatar (photo when the agent has one)
const AV_TONES = ['#1D1E22', '#3D4047', '#5A5E66', '#8A5A0B', '#34507A', '#1F7A4D', '#A80D26'];
const hash = (s) => [...String(s || '')].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
export function Av({ name, img, size = 28, seed, className = '' }) {
  const st = { width: size, height: size };
  if (img) return <img src={img} alt="" className={`rounded-full flex-none ${className}`} style={{ ...st, objectFit: 'cover' }} />;
  if (!name) return <span className={`inline-flex items-center justify-center rounded-full bg-paper-3 text-ink-400 flex-none ${className}`} style={st}><Icon name="users" size={Math.round(size * 0.5)} /></span>;
  const ini = name.trim().split(/\s+/).map((x) => x[0]).join('').slice(0, 2);
  return <span className={`inline-flex items-center justify-center rounded-full flex-none text-white font-semibold ${className}`} style={{ ...st, background: AV_TONES[hash(seed || name) % AV_TONES.length], fontSize: Math.round(size * 0.38) }} title={name}>{ini}</span>;
}
// O.who(): avatar + name; unassigned → red badge
export const Who = ({ agent, size = 22, fallback = 'غير مخصّص' }) => (agent
  ? <span className="inline-flex items-center gap-2 min-w-0"><Av name={agent.name} img={agent.img} seed={agent.id} size={size} /><span className="clamp-1 text-[13px]">{agent.name}</span></span>
  : <Badge tone="red">{fallback}</Badge>);

// O.lmini(): listing thumbnail + title + id · area
export const Lmini = ({ l, className = '' }) => (l
  ? <span className={`inline-flex items-center gap-2.5 min-w-0 ${className}`}>
      <Img src={l.img} className="w-10 h-8 rounded-[8px] flex-none" />
      <span className="min-w-0"><span className="block text-[13px] font-semibold clamp-1">{l.title}</span><span className="block text-[11.5px] text-ink-500 clamp-1"><span className="mono">{l.id}</span>{l.areaName ? ` · ${l.areaName}` : ''}</span></span>
    </span>
  : <span className="text-ink-300">—</span>);

// O.tabs()
export const OsTabs = ({ items, active, onChange }) => (
  <div className="flex gap-1 overflow-x-auto no-sb border-b hair mb-5">
    {items.map(([k, label, c]) => <button key={k} type="button" className={`os-tab ${k === active ? 'on' : ''}`} onClick={() => onChange(k)}>{label}{c != null && <span className="os-cnt">{c}</span>}</button>)}
  </div>
);

// O.empty()
export const OsEmpty = ({ icon = 'search', title, text, action, className = '' }) => (
  <div className={`os-card p-10 text-center ${className}`}>
    <div className="w-12 h-12 mx-auto rounded-full bg-paper-2 inline-flex items-center justify-center text-ink-400"><Icon name={icon} size={22} /></div>
    <div className="font-semibold mt-3">{title}</div>
    {text && <p className="text-[13.5px] text-ink-500 mt-1 max-w-md mx-auto">{text}</p>}
    {action && <div className="mt-4 flex justify-center gap-2">{action}</div>}
  </div>
);

// H.card(): dashboard section card
export const Sec = ({ title, sub, extra, children, className = '', pad = 'p-4 sm:p-5' }) => (
  <section className={`os-card ${pad} flex flex-col min-w-0 ${className}`}>
    <div className="flex items-start justify-between gap-3 mb-4"><div className="min-w-0"><h2 className="t-h3 text-[15.5px]">{title}</h2>{sub && <p className="lbl mt-0.5">{sub}</p>}</div>{extra && <div className="flex-none">{extra}</div>}</div>
    {children}
  </section>
);
// kv(): label / value row
export const KV = ({ k, children }) => <div className="flex items-start justify-between gap-3 py-2 border-b hair last:border-0"><span className="text-ink-500 text-[13px]">{k}</span><span className="text-[13.5px] font-medium text-end min-w-0 break-words">{children}</span></div>;
// H.hbar(): horizontal bar
export const HBar = ({ v, max, color = '#1D1E22', h = 6 }) => <div className="w-full rounded-full bg-paper-3 overflow-hidden" style={{ height: h }}><div className="h-full rounded-full" style={{ width: `${max ? Math.max(v ? 3 : 0, Math.min(100, (v / max) * 100)) : 0}%`, background: color }} /></div>;
// O.bars(): vertical bar chart
export const Bars = ({ series, h = 140, color = '#1D1E22', fmt = (v) => v }) => {
  const max = Math.max(1, ...series.map((s) => s.value));
  return (
    <div className="flex items-end gap-1.5" style={{ height: h }} dir="ltr">
      {series.map((s) => (
        <div key={s.label} className="flex-1 flex flex-col items-center justify-end gap-1 h-full relative">
          <span className="text-[11px] font-semibold num text-ink-600">{fmt(s.value)}</span>
          <div className="w-full rounded-t-[4px] transition-all" style={{ height: Math.max(2, (s.value / max) * (h - 40)), background: s.color || color }} title={`${s.label}: ${fmt(s.value)}`} />
          <span className="text-[10px] text-ink-400 whitespace-nowrap">{s.label}</span>
        </div>
      ))}
    </div>
  );
};

function CrmDataProvider({ children }) {
  const [raw, setRaw] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    const res = await Promise.all([
      supabase.from('contacts').select('*, contact_listings(listing_id, created_at)').order('last_activity_at', { ascending: false }),
      supabase.from('agents').select('*').order('sort'),
      supabase.from('listings').select('id, deal, type, beds, size, price, rent, status, area_id, project_id, agent_id, leads, views, listing_media(url, kind, sort)'),
      supabase.from('areas').select('id, name, short'),
      supabase.from('projects').select('id, name'),
      supabase.from('viewings').select('*').order('scheduled_at'),
    ]);
    const bad = res.find((r) => r.error);
    if (bad) { setError(bad.error.message); return; }
    const [contacts, agents, listings, areas, projects, viewings] = res.map((r) => r.data);
    setRaw({ contacts, agents, listings, areas, projects, viewings });
    setError(null);
  }, []);
  useEffect(() => { load(); }, [load]);

  const value = useMemo(() => {
    if (!raw) return null;
    const AR = Object.fromEntries(raw.areas.map((a) => [a.id, a]));
    const PR = Object.fromEntries(raw.projects.map((p) => [p.id, p]));
    const G = Object.fromEntries(raw.agents.map((a) => [a.id, a]));
    const listings = raw.listings.map((l) => {
      const photo = [...(l.listing_media || [])].filter((m) => m.kind === 'photo').sort((a, b) => a.sort - b.sort)[0];
      return { ...l, img: photo?.url || '', title: listingTitle(l, PR[l.project_id]), typeAr: TYPE_AR[l.type], areaName: AR[l.area_id]?.name || '', priceText: usd(l.deal === 'rent' ? l.rent : l.price) + (l.deal === 'rent' ? ' / شهر' : '') };
    });
    const LI = Object.fromEntries(listings.map((l) => [l.id, l]));
    const contacts = raw.contacts.map((c) => {
      const links = [...(c.contact_listings || [])].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((x) => LI[x.listing_id]).filter(Boolean);
      const g = c.agent_id ? G[c.agent_id] : null;
      return { ...c, links, listing: links[0] || null, agent: g, agentName: g ? g.name : 'غير مخصّص', stageLabel: STAGE_AR[c.stage], budgetText: c.budget ? usd(c.budget) : '—', last: ago(c.last_activity_at), isHot: c.score === 'hot' };
    });
    const CI = Object.fromEntries(contacts.map((c) => [c.id, c]));
    const viewings = raw.viewings.map((v) => ({ ...v, at: new Date(v.scheduled_at), contact: CI[v.contact_id], listing: LI[v.listing_id], agent: G[v.agent_id], statusLabel: VIEWING_STATUS[v.status] }));
    return { ...raw, listings, contacts, viewings, G, LI, CI, reload: load };
  }, [raw, load]);

  if (error) return <div className="p-6 sm:p-10"><OsEmpty icon="info" title="تعذّر تحميل البيانات" text={error} action={<Btn kind="dark" size="sm" onClick={load}>إعادة المحاولة</Btn>} /></div>;
  if (!value) return <Spinner pad={160} />;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ───────────── shared modals
export const FIELD = 'field !h-11 !text-[13.5px] !rounded-[10px]';
export function ListingSelect({ value, onChange, allowEmpty = true, exclude = [], className = FIELD }) {
  const R = useCrm();
  return (
    <select className={className} value={value || ''} onChange={(e) => onChange(e.target.value)}>
      {allowEmpty && <option value="">— بدون —</option>}
      {R.listings.filter((l) => l.status !== 'draft' && !exclude.includes(l.id)).sort((a, b) => a.id.localeCompare(b.id)).map((l) => <option key={l.id} value={l.id}>{l.id} · {l.title} · {l.priceText}</option>)}
    </select>
  );
}

export function NewContactModal({ onClose }) {
  const R = useCrm();
  const A = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', phone: '', source: 'مكالمة', deal: 'sale', budget: '', agent_id: A.me.agent_id, listing_id: '', note: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e });
  const save = async (e) => {
    e.preventDefault();
    const digits = f.phone.replace(/\D/g, '');
    const dup = R.contacts.find((c) => (c.phone || '').replace(/\D/g, '') === digits);
    if (dup && !window.confirm(`الرقم مسجّل باسم ${dup.name}. إضافة جهة جديدة رغم ذلك؟`)) return;
    setBusy(true);
    try {
      const c = await q(supabase.from('contacts').insert({ name: f.name.trim(), phone: f.phone.trim(), source: f.source, deal: f.deal || null, budget: f.budget ? +f.budget : null, agent_id: f.agent_id || null, note: f.note || null }).select('id').single());
      if (f.listing_id) await q(supabase.from('contact_listings').insert({ contact_id: c.id, listing_id: f.listing_id }));
      await q(supabase.from('activities').insert({ contact_id: c.id, kind: 'system', body: `أُضيف يدوياً · المصدر: ${f.source}${f.note ? '\n' + f.note : ''}`, agent_id: A.me.agent_id }));
      await R.reload();
      toast('أُضيف العميل');
      onClose();
      nav(`/crm/contacts/${c.id}`);
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal title="عميل جديد" sub="سجل واحد لكل شخص — يُربط بكل معاينة وعقار" onClose={onClose} width={560}>
      <form onSubmit={save} className="grid grid-cols-2 gap-3">
        <Field label="الاسم"><input className={FIELD} required minLength={2} value={f.name} onChange={set('name')} /></Field>
        <Field label="الهاتف"><input className={`${FIELD} mono text-end`} required dir="ltr" pattern="[0-9+ ()-]{7,20}" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="المصدر"><select className={FIELD} value={f.source} onChange={set('source')}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="يريد"><select className={FIELD} value={f.deal} onChange={set('deal')}><option value="sale">شراء</option><option value="rent">إيجار</option><option value="">غير محدد</option></select></Field>
        <Field label="الميزانية ($)"><input className={`${FIELD} num`} type="number" min="0" value={f.budget} onChange={set('budget')} /></Field>
        <Field label="الوسيط"><select className={FIELD} value={f.agent_id || ''} onChange={set('agent_id')}><option value="">غير مخصّص</option>{R.agents.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <Field label="مهتم بـ" className="col-span-2"><ListingSelect value={f.listing_id} onChange={set('listing_id')} /></Field>
        <Field label="ملاحظة" className="col-span-2"><textarea className="field !text-[13.5px]" style={{ minHeight: 80 }} rows={2} value={f.note} onChange={set('note')} /></Field>
        <div className="col-span-2 flex justify-end pt-1"><Btn type="submit" kind="red" size="sm" disabled={busy}><Icon name="plus" size={16} />إضافة</Btn></div>
      </form>
    </Modal>
  );
}

const pad = (n) => String(n).padStart(2, '0');
const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function ViewingModal({ v, preset = {}, onClose }) {
  const R = useCrm();
  const A = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const isNew = !v?.id;
  const at = v?.at || preset.date || new Date(Date.now() + 864e5);
  const c0 = v?.contact_id || preset.contact_id || '';
  const [f, setF] = useState({
    contact_id: c0, listing_id: v?.listing_id || preset.listing_id || R.CI[c0]?.listing?.id || '', agent_id: v?.agent_id || R.CI[c0]?.agent_id || A.me.agent_id,
    date: localDate(at), time: v ? `${pad(at.getHours())}:${pad(at.getMinutes())}` : preset.time || '11:00', status: v?.status || 'pending', note: v?.note || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e });
  const save = async (e) => {
    e.preventDefault();
    if (!f.contact_id) return toast('اختار العميل', 'error');
    setBusy(true);
    try {
      const row = { contact_id: f.contact_id, listing_id: f.listing_id || null, agent_id: f.agent_id || null, scheduled_at: new Date(`${f.date}T${f.time}`).toISOString(), status: f.status, note: f.note || null };
      if (isNew) {
        await q(supabase.from('viewings').insert(row));
        await q(supabase.from('activities').insert({ contact_id: f.contact_id, kind: 'system', body: `حُددت معاينة ${f.date} ${f.time}${f.listing_id ? ' · ' + f.listing_id : ''}`, agent_id: A.me.agent_id }));
        const c = R.CI[f.contact_id];
        if (c && (c.stage === 'new' || c.stage === 'contacted')) await q(supabase.from('contacts').update({ stage: 'viewing' }).eq('id', c.id));
        if (f.listing_id && c && !c.links.some((l) => l.id === f.listing_id)) await supabase.from('contact_listings').insert({ contact_id: c.id, listing_id: f.listing_id });
      } else {
        await q(supabase.from('viewings').update(row).eq('id', v.id));
      }
      await R.reload();
      toast(isNew ? 'أُضيفت المعاينة' : 'تم الحفظ');
      onClose();
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const del = async () => {
    if (!window.confirm('حذف هذه المعاينة؟')) return;
    try { await q(supabase.from('viewings').delete().eq('id', v.id)); await R.reload(); onClose(); } catch (err) { toast(err.message, 'error'); }
  };
  return (
    <Modal title={isNew ? 'معاينة جديدة' : 'تعديل المعاينة'} sub={isNew ? undefined : `${v.contact?.name || ''}${v.listing ? ' · ' + v.listing.id : ''}`} onClose={onClose} width={560}>
      <form onSubmit={save} className="grid grid-cols-2 gap-3">
        <Field label="العميل" className="col-span-2">
          <select className={FIELD} required value={f.contact_id} onChange={(e) => { const c = R.CI[e.target.value]; setF({ ...f, contact_id: e.target.value, listing_id: f.listing_id || c?.listing?.id || '', agent_id: c?.agent_id || f.agent_id }); }}>
            <option value="">اختار العميل…</option>{R.contacts.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
          </select>
        </Field>
        <Field label="العقار" className="col-span-2"><ListingSelect value={f.listing_id} onChange={set('listing_id')} /></Field>
        <Field label="التاريخ"><input className={FIELD} type="date" required value={f.date} onChange={set('date')} /></Field>
        <Field label="الوقت"><input className={FIELD} type="time" required step="900" value={f.time} onChange={set('time')} /></Field>
        <Field label="الوسيط"><select className={FIELD} value={f.agent_id || ''} onChange={set('agent_id')}><option value="">—</option>{R.agents.filter((a) => a.active || a.id === f.agent_id).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <Field label="الحالة"><select className={FIELD} value={f.status} onChange={set('status')}>{Object.entries(VIEWING_STATUS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></Field>
        <Field label="ملاحظة" className="col-span-2"><input className={FIELD} value={f.note} onChange={set('note')} /></Field>
        <div className="col-span-2 flex flex-wrap justify-between gap-2 pt-1">
          <div className="flex gap-2">
            {!isNew && <Btn kind="ghost" size="sm" className="text-red" onClick={del}><Icon name="trash" size={15} />حذف</Btn>}
            {!isNew && v.contact_id && <Btn size="sm" onClick={() => { onClose(); nav(`/crm/contacts/${v.contact_id}`); }}><Icon name="users" size={15} />ملف العميل</Btn>}
          </div>
          <Btn type="submit" kind="red" size="sm" disabled={busy}><Icon name="check" size={16} />حفظ</Btn>
        </div>
      </form>
    </Modal>
  );
}

function CrmShell() {
  const R = useCrm();
  const nav = useNavigate();
  const loc = useLocation();
  const [sp] = useSearchParams();
  const [modal, setModal] = useState(null);
  const newCount = R.contacts.filter((c) => c.stage === 'new').length;
  const items = [
    { to: '/crm', label: 'المسار', badge: newCount },
    { to: '/crm/contacts', label: 'جهات الاتصال', match: (p) => p.startsWith('/crm/contacts') },
    { to: '/crm/viewings', label: 'المعاينات' },
    { to: '/crm/reports', label: 'التقارير' },
  ];
  return (
    <Shell sub="CRM" items={items} switchTo={{ to: '/cms', label: 'إدارة المحتوى' }}
      search={loc.pathname === '/crm/contacts' ? sp.get('q') || '' : ''} searchPlaceholder="ابحث بالاسم أو الهاتف…"
      onSearch={(qq) => nav(`/crm/contacts${qq ? '?q=' + encodeURIComponent(qq) : ''}`)}
      actions={<>
        <Btn size="sm" onClick={() => setModal('viewing')}><Icon name="cal" size={16} />معاينة</Btn>
        <Btn kind="red" size="sm" onClick={() => setModal('contact')}><Icon name="plus" size={16} />عميل جديد</Btn>
      </>}>
      <Routes>
        <Route index element={<Pipeline />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="contacts/:id" element={<ContactDetail />} />
        <Route path="viewings" element={<Viewings />} />
        <Route path="reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/crm" replace />} />
      </Routes>
      {modal === 'contact' && <NewContactModal onClose={() => setModal(null)} />}
      {modal === 'viewing' && <ViewingModal onClose={() => setModal(null)} />}
    </Shell>
  );
}

export default function CrmApp() {
  return <StaffGate><CrmDataProvider><CrmShell /></CrmDataProvider></StaffGate>;
}
