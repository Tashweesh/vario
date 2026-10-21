import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, q } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { SOURCES, STAGE_AR, TYPE_AR, VIEWING_STATUS, ago, listingTitle, usd } from '../lib/format.js';
import { Btn, Field, Modal, Spinner, useToast } from '../components/ui.jsx';
import { Shell, StaffGate } from '../staff/Shell.jsx';
import Pipeline from './pages/Pipeline.jsx';
import Contacts from './pages/Contacts.jsx';
import ContactDetail from './pages/ContactDetail.jsx';
import Viewings from './pages/Viewings.jsx';
import Reports from './pages/Reports.jsx';

const Ctx = createContext(null);
export const useCrm = () => useContext(Ctx);

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

  if (error) return <div style={{ padding: 60, textAlign: 'center' }}>تعذّر تحميل البيانات: {error} <Btn onClick={load}>إعادة المحاولة</Btn></div>;
  if (!value) return <Spinner pad={160} />;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ───────────── shared modals
export function ListingSelect({ value, onChange, allowEmpty = true, exclude = [] }) {
  const R = useCrm();
  return (
    <select className="inp-sm sel" value={value || ''} onChange={(e) => onChange(e.target.value)}>
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
    <Modal title="عميل جديد" onClose={onClose} width={560}>
      <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="الاسم"><input className="inp-sm" required minLength={2} value={f.name} onChange={set('name')} /></Field>
        <Field label="الهاتف"><input className="inp-sm" required dir="ltr" pattern="[0-9+ ()-]{7,20}" style={{ textAlign: 'right' }} value={f.phone} onChange={set('phone')} /></Field>
        <Field label="المصدر"><select className="inp-sm sel" value={f.source} onChange={set('source')}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="يريد"><select className="inp-sm sel" value={f.deal} onChange={set('deal')}><option value="sale">شراء</option><option value="rent">إيجار</option><option value="">غير محدد</option></select></Field>
        <Field label="الميزانية ($)"><input className="inp-sm" type="number" min="0" value={f.budget} onChange={set('budget')} /></Field>
        <Field label="الوسيط"><select className="inp-sm sel" value={f.agent_id || ''} onChange={set('agent_id')}><option value="">غير مخصّص</option>{R.agents.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <Field label="مهتم بـ" style={{ gridColumn: '1/-1' }}><ListingSelect value={f.listing_id} onChange={set('listing_id')} /></Field>
        <Field label="ملاحظة" style={{ gridColumn: '1/-1' }}><textarea className="inp" rows={2} value={f.note} onChange={set('note')} style={{ fontSize: 14 }} /></Field>
        <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}><Btn type="submit" kind="red" disabled={busy}>إضافة</Btn></div>
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
    <Modal title={isNew ? 'معاينة جديدة' : 'تعديل المعاينة'} onClose={onClose} width={560}>
      <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="العميل" style={{ gridColumn: '1/-1' }}>
          <select className="inp-sm sel" required value={f.contact_id} onChange={(e) => { const c = R.CI[e.target.value]; setF({ ...f, contact_id: e.target.value, listing_id: f.listing_id || c?.listing?.id || '', agent_id: c?.agent_id || f.agent_id }); }}>
            <option value="">اختار العميل…</option>{R.contacts.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
          </select>
        </Field>
        <Field label="العقار" style={{ gridColumn: '1/-1' }}><ListingSelect value={f.listing_id} onChange={set('listing_id')} /></Field>
        <Field label="التاريخ"><input className="inp-sm" type="date" required value={f.date} onChange={set('date')} /></Field>
        <Field label="الوقت"><input className="inp-sm" type="time" required step="900" value={f.time} onChange={set('time')} /></Field>
        <Field label="الوسيط"><select className="inp-sm sel" value={f.agent_id || ''} onChange={set('agent_id')}><option value="">—</option>{R.agents.filter((a) => a.active || a.id === f.agent_id).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <Field label="الحالة"><select className="inp-sm sel" value={f.status} onChange={set('status')}>{Object.entries(VIEWING_STATUS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></Field>
        <Field label="ملاحظة" style={{ gridColumn: '1/-1' }}><input className="inp-sm" value={f.note} onChange={set('note')} /></Field>
        <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isNew && <Btn style={{ color: '#c8102e' }} onClick={del}>حذف</Btn>}
            {!isNew && v.contact_id && <Btn onClick={() => { onClose(); nav(`/crm/contacts/${v.contact_id}`); }}>ملف العميل</Btn>}
          </div>
          <Btn type="submit" kind="red" disabled={busy}>حفظ</Btn>
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
        <Btn onClick={() => setModal('viewing')}>+ معاينة</Btn>
        <Btn kind="red" onClick={() => setModal('contact')}>+ عميل جديد</Btn>
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
