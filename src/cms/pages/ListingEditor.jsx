import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCms } from '../CmsApp.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { supabase, q, uploadMedia, removeMedia, friendlyError } from '../../lib/supabase.js';
import { useDocTitle } from '../../lib/hooks.js';
import { CONDITIONS, FURNISHING, LISTING_FEATURES, PAYMENT_AR, STATUS, TYPE_AR, ago, listingPlan, listingTitle, usd, handoverText, isIsoDate } from '../../lib/format.js';
import { Btn, Field, Icon, Seg, Spinner, Toggle, useToast } from '../../components/ui.jsx';
import { Av, Note, OsCard, OsEmpty, OsTabs, PageTitle, Stat, StatusBadge, SwRow } from '../../staff/Shell.jsx';
import { PlanBar } from '../../site/parts.jsx';
import { LocationPicker } from '../../components/MapView.jsx';

const NUMS = ['beds', 'baths', 'size', 'plot', 'floor', 'total_floors', 'floors', 'terrace', 'frontage', 'age', 'price', 'rent', 'deposit', 'plan_down', 'plan_months', 'plan_handover'];
const GEO = ['lat', 'lng'];
const FIELDS = ['deal', 'type', 'area_id', 'project_id', 'agent_id', 'status', 'featured', 'verified', 'hide_price', 'land_use', 'use_type', 'condition', 'view_text', 'features', 'description_ar', 'description_en', 'payment', 'furnishing', 'available', 'plan_source', 'plan_handover_date', 'plan_note', 'video_url', ...GEO, ...NUMS];
const BOOLS = ['featured', 'verified', 'hide_price'];
const toForm = (l) => Object.fromEntries(FIELDS.map((k) => [k, BOOLS.includes(k) ? !!l[k] : l[k] == null ? (k === 'features' ? [] : '') : l[k]]));
const toRow = (f) => Object.fromEntries(FIELDS.map((k) => [k, BOOLS.includes(k) ? !!f[k] : GEO.includes(k) ? (f[k] === '' || f[k] == null ? null : +(+f[k]).toFixed(6)) : NUMS.includes(k) ? (f[k] === '' || f[k] == null ? null : Math.round(+f[k])) : f[k] === '' ? null : f[k]]));
const F = 'field !h-10 !text-[13.5px]';

// Ported from the reference's listing record (os/inventory.js /listing/:id): crumbs + header, tabs, sectioned
// os-cards with flabel/field inputs and a sticky side column for status/publishing controls.
export default function ListingEditor() {
  const { id } = useParams();
  const isNew = !id;
  const C = useCms();
  const A = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'details';
  const l = isNew ? null : C.listings.find((x) => x.id === id);
  const initial = useMemo(() => (l ? toForm(l) : toForm({ deal: 'sale', type: 'apartment', area_id: C.areas[0]?.id, status: 'draft', verified: true, payment: 'cash', agent_id: A.me.agent_id, features: [] })), [l?.updated_at, id]);
  const [f, setF] = useState(initial);
  const [priv, setPriv] = useState({ owner_name: '', owner_phone: '' });
  const [privLoaded, setPrivLoaded] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setF(initial); }, [initial]);
  useEffect(() => {
    if (isNew || !l?.canEdit) return;
    supabase.from('listing_private').select('*').eq('listing_id', id).maybeSingle().then(({ data }) => { const p = { owner_name: data?.owner_name || '', owner_phone: data?.owner_phone || '' }; setPriv(p); setPrivLoaded(p); });
  }, [id, isNew, l?.canEdit]);
  useDocTitle(isNew ? 'عقار جديد' : l ? `تعديل ${l.id}` : 'عقار');

  const dirty = JSON.stringify(f) !== JSON.stringify(initial) || (privLoaded && JSON.stringify(priv) !== JSON.stringify(privLoaded)) || (isNew && (priv.owner_name || priv.owner_phone));
  useEffect(() => {
    if (!dirty) return;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  if (!isNew && !l) return <OsEmpty icon="building" title="العقار غير موجود" action={<Btn kind="dark" size="sm" onClick={() => nav('/cms/listings')}>كل العقارات</Btn>}>{id}</OsEmpty>;
  const canEdit = isNew || l.canEdit;
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e && e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
  const project = C.P[f.project_id];
  const st = STATUS[f.status];
  const title = listingTitle({ ...f, beds: +f.beds || null }, project);

  const save = async (status) => {
    const next = { ...f, status: status || f.status };
    if (!next.area_id) return toast('اختار المنطقة', 'error');
    if (!(+next.size > 0)) return toast('أدخل المساحة', 'error');
    if (next.deal === 'sale' && !(+next.price > 0)) return toast('أدخل السعر', 'error');
    if (next.deal === 'rent' && !(+next.rent > 0)) return toast('أدخل الإيجار الشهري', 'error');
    if (next.plan_source === 'project' && !next.project_id) next.plan_source = 'custom';
    if (next.status === 'live' && !isNew && l.photos.length === 0) return toast('أضف صورة واحدة على الأقل قبل النشر', 'error');
    if (next.status === 'live' && isNew) next.status = 'draft';
    setBusy(true);
    try {
      const row = toRow(next);
      let lid = id;
      if (isNew) {
        const created = await q(supabase.from('listings').insert(row).select('id').single());
        lid = created.id;
      } else {
        await q(supabase.from('listings').update(row).eq('id', id));
      }
      if (isNew ? priv.owner_name || priv.owner_phone : JSON.stringify(priv) !== JSON.stringify(privLoaded)) {
        await q(supabase.from('listing_private').upsert({ listing_id: lid, owner_name: priv.owner_name || null, owner_phone: priv.owner_phone || null }));
        setPrivLoaded(priv);
      }
      await C.reload();
      if (isNew) { toast('أُنشئ العقار كمسودة — أضف الصور ثم انشره'); nav(`/cms/listings/${lid}?tab=photos`, { replace: true }); }
      else toast(next.status !== l.status ? `تم الحفظ · ${STATUS[next.status][0]}` : 'تم حفظ التغييرات');
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const tabs = [['details', 'التفاصيل'], ['photos', 'الصور والمخططات', l?.photos.length || 0], ...(f.deal === 'sale' ? [['plan', 'خطة الدفع']] : []), ['status', 'الحالة والنشر']];

  return (
    <>
      <PageTitle crumbs={[['العقارات', '/cms/listings'], [isNew ? 'عقار جديد' : l.id]]}
        sub={<>{isNew ? 'عقار جديد · يُحفظ كمسودة' : <><span className="mono text-[12.5px]">{l.id}</span> · آخر حفظ {ago(l.updated_at)}</>}{dirty && <span className="text-warn font-semibold"> · تغييرات غير محفوظة</span>}</>}
        action={<>
          {!isNew && <a href={`/property/${l.id}`} target="_blank" rel="noreferrer" className="btn btn-line btn-sm"><Icon name="globe" size={15} />شوف بالموقع<Icon name="arrow-up" size={13} className="opacity-60" /></a>}
          {canEdit && A.isEditor && <Btn size="sm" disabled={busy} onClick={() => save('draft')}>حفظ كمسودة</Btn>}
          {canEdit && A.isEditor && <Btn kind="red" size="sm" disabled={busy} onClick={() => save(f.status === 'draft' && !isNew ? 'live' : undefined)}><Icon name="globe" size={15} />{isNew ? 'إنشاء العقار' : f.status === 'draft' ? 'نشر' : 'نشر التغييرات'}</Btn>}
          {canEdit && !A.isEditor && <Btn kind="red" size="sm" disabled={busy} onClick={() => save()}><Icon name="check" size={15} />{isNew ? 'حفظ كمسودة' : 'حفظ التغييرات'}</Btn>}
        </>}>
        <span className="inline-flex flex-wrap items-center gap-2.5">{title}<StatusBadge status={f.status} label={st[0]} /></span>
      </PageTitle>
      {!canEdit && <Note tone="amber" icon="lock" className="mb-4"><b>عرض فقط</b> — هذا العقار مسند لوسيط آخر.</Note>}
      {A.isAgent && canEdit && <Note icon="info" className="mb-4">كوسيط تحفظ التعديلات كمسودة؛ محرر المحتوى يراجع وينشر.</Note>}
      <OsTabs items={tabs} active={tab} onChange={(k) => setSp({ tab: k }, { replace: true })} />
      <fieldset disabled={!canEdit || busy} className="min-w-0" style={{ border: 0, padding: 0, margin: 0 }}>
        {tab === 'details' && <Details f={f} set={set} setF={setF} C={C} A={A} l={l} priv={priv} setPriv={setPriv} />}
        {tab === 'photos' && (isNew ? (
          <OsEmpty icon="image" title="احفظ العقار أولاً" action={<Btn kind="red" size="sm" onClick={() => save()}>إنشاء العقار</Btn>}>بعد الإنشاء تگدر ترفع الصور والمخططات.</OsEmpty>
        ) : (
          <div className="grid gap-5 min-w-0">
            <OsCard><MediaManager l={l} kind="photo" title="الصور" sub="اسحب لإعادة الترتيب · الأولى هي صورة الغلاف" max={20} reload={C.reload} /></OsCard>
            <OsCard><MediaManager l={l} kind="plan" title="المخططات" sub="صورة أو PDF" max={10} reload={C.reload} /></OsCard>
            <OsCard title="جولة فيديو (اختياري)">
              <input className={`${F} mono max-w-[520px]`} dir="ltr" placeholder="رابط يوتيوب أو ملف" value={f.video_url} onChange={set('video_url')} />
              {f.video_url !== initial.video_url && <p className="text-[12px] text-warn mt-2">اضغط حفظ لتثبيت الرابط</p>}
            </OsCard>
          </div>
        ))}
        {tab === 'plan' && f.deal === 'sale' && <PlanTab f={f} set={set} setF={setF} project={project} />}
        {tab === 'status' && <StatusTab f={f} set={set} setF={setF} A={A} l={l} isNew={isNew} C={C} nav={nav} toast={toast} />}
      </fieldset>
    </>
  );
}

function Details({ f, set, setF, C, A, l, priv, setPriv }) {
  const [lang, setLang] = useState('ar');
  const [newFeat, setNewFeat] = useState('');
  const feats = [...new Set([...LISTING_FEATURES, ...(f.features || [])])];
  const toggleFeat = (t) => setF((s) => ({ ...s, features: s.features.includes(t) ? s.features.filter((x) => x !== t) : [...s.features, t] }));
  const projects = C.projects.filter((p) => !f.area_id || p.area_id === f.area_id || p.id === f.project_id);
  const isLand = f.type === 'land';
  const num = (k, label, extra = {}) => <Field label={label}><input className={`${F} num`} type="number" min="0" inputMode="numeric" dir="ltr" value={f[k]} onChange={set(k)} {...extra} /></Field>;
  const auto = `${TYPE_AR[f.type]} في ${C.A[f.area_id]?.name || ''} بمساحة ${f.size || '—'} م².${f.view_text ? ' ' + f.view_text + '.' : ''} ${(f.features || []).slice(0, 3).join('، ')}.`;
  const agent = C.G[f.agent_id];
  return (
    <div className="os-cols">
      <div className="grid gap-5 min-w-0">
        <OsCard title="الأساسيات">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="نوع العرض"><Seg full value={f.deal} onChange={(v) => setF((s) => ({ ...s, deal: v }))} options={[['sale', 'للبيع', 'tag'], ['rent', 'للإيجار', 'key']]} /></Field>
            <Field label="نوع العقار"><select className={F} value={f.type} onChange={set('type')}>{Object.entries(TYPE_AR).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></Field>
            <Field label="المنطقة"><select className={F} value={f.area_id} onChange={set('area_id')}>{C.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
            <Field label="المشروع (اختياري)"><select className={F} value={f.project_id || ''} onChange={set('project_id')}><option value="">— بدون مشروع —</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            {f.deal === 'sale' ? (
              <>
                <Field label="سعر البيع (دولار)"><input className={`${F} num font-semibold`} type="number" min="0" dir="ltr" value={f.price} onChange={set('price')} /></Field>
                <Field label="طريقة الدفع"><select className={F} value={f.payment || 'cash'} onChange={set('payment')}>{Object.entries(PAYMENT_AR).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></Field>
              </>
            ) : (
              <>
                <Field label="الإيجار الشهري (دولار)"><input className={`${F} num font-semibold`} type="number" min="0" dir="ltr" value={f.rent} onChange={set('rent')} /></Field>
                <Field label="الفرش"><select className={F} value={f.furnishing || ''} onChange={set('furnishing')}><option value="">—</option>{FURNISHING.map((t) => <option key={t}>{t}</option>)}</select></Field>
                {num('deposit', 'التأمين (دولار)')}
                <Field label="التوفر"><input className={F} list="avail" value={f.available} onChange={set('available')} placeholder="متاح الآن" /><datalist id="avail"><option value="متاح الآن" /></datalist></Field>
              </>
            )}
          </div>
        </OsCard>
        <OsCard title="المواصفات">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {num('size', 'المساحة م²', { required: true })}
            {!isLand && num('beds', 'غرف النوم')}
            {!isLand && num('baths', 'الحمامات')}
            {!isLand && num('floor', 'الطابق')}
            {['apartment', 'penthouse', 'office'].includes(f.type) && num('total_floors', 'عدد طوابق المبنى')}
            {['villa', 'house', 'townhouse', 'land'].includes(f.type) && num('plot', 'مساحة القطعة م²')}
            {['land', 'shop'].includes(f.type) && num('frontage', 'الواجهة م')}
            {f.type === 'penthouse' && num('terrace', 'التراس م²')}
            {['house', 'villa', 'townhouse'].includes(f.type) && num('age', 'عمر البناء (سنة)')}
            {isLand && <Field label="الاستخدام"><input className={F} value={f.land_use} onChange={set('land_use')} placeholder="سكني / تجاري" /></Field>}
            {!isLand && <Field label="الحالة"><select className={F} value={f.condition || ''} onChange={set('condition')}><option value="">—</option>{CONDITIONS.map((t) => <option key={t}>{t}</option>)}</select></Field>}
            <Field label="الإطلالة" className="col-span-2"><input className={F} value={f.view_text} onChange={set('view_text')} placeholder="مثلاً: إطلالة على المتنزه" /></Field>
          </div>
          <div className="flabel mt-5">المميزات</div>
          <div className="flex flex-wrap gap-1.5">
            {feats.map((t) => {
              const on = f.features.includes(t);
              return <button type="button" key={t} onClick={() => toggleFeat(t)} className={`chip chip-sm ${on ? 'on' : ''}`} aria-pressed={on}>{t}{on && <Icon name="check" size={13} />}</button>;
            })}
            <form onSubmit={(e) => { e.preventDefault(); const t = newFeat.trim(); if (t && !f.features.includes(t)) setF((s) => ({ ...s, features: [...s.features, t] })); setNewFeat(''); }} className="contents">
              <input value={newFeat} onChange={(e) => setNewFeat(e.target.value)} placeholder="+ إضافة" aria-label="إضافة ميزة" className="chip chip-sm" style={{ borderStyle: 'dashed', width: 110, outline: 0 }} />
            </form>
          </div>
        </OsCard>
        <OsCard title="الوصف" extra={<div className="seg"><button type="button" aria-pressed={lang === 'ar'} className="!h-8 !px-3 !text-[12.5px]" onClick={() => setLang('ar')}>عربي</button><button type="button" aria-pressed={lang === 'en'} className="!h-8 !px-3 !text-[12.5px]" onClick={() => setLang('en')}>English</button></div>}>
          {lang === 'ar'
            ? <textarea className="field !text-[13.5px]" rows={5} value={f.description_ar} onChange={set('description_ar')} placeholder={auto} />
            : <textarea className="field !text-[13.5px]" rows={5} dir="ltr" value={f.description_en} onChange={set('description_en')} placeholder="English description (optional)" />}
          {lang === 'ar' && !f.description_ar && <p className="text-[11.5px] text-ink-500 mt-2">إذا تركته فارغاً يُكتب وصف تلقائي من المواصفات.</p>}
        </OsCard>
      </div>
      <aside className="os-aside grid gap-5 min-w-0">
        <OsCard title="الوسيط المسؤول">
          {A.isEditor ? (
            <select className="field !h-11 !text-[13.5px] font-semibold" value={f.agent_id || ''} onChange={set('agent_id')}>
              <option value="">— غير مخصّص —</option>{C.agents.filter((a) => a.active || a.id === f.agent_id).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-[12px] bg-paper-2"><Av src={agent?.img} name={agent?.name} size={34} /><div className="min-w-0 flex-1 text-[13.5px] font-semibold clamp-1">{agent?.name || '—'}</div></div>
          )}
          <p className="text-[11.5px] text-ink-500 mt-2">استفسارات الموقع على هذا العقار تروح له.</p>
        </OsCard>
        <OsCard title="الموقع على الخريطة">
          <LocationPicker value={f.lat !== '' && f.lng !== '' ? { lat: f.lat, lng: f.lng } : null} fallback={C.A[f.area_id]} clearable height={200} onChange={(p) => setF((s) => ({ ...s, lat: p ? p.lat : '', lng: p ? p.lng : '' }))} hint="بدون تحديد، يظهر العقار ضمن منطقته على الخريطة العامة" />
        </OsCard>
        <OsCard title="المالك / المؤجّر" extra={<span className="osb osb-gray"><Icon name="lock" size={12} />داخلي</span>}>
          <div className="grid gap-3">
            <Field label="اسم المالك"><input className={F} value={priv.owner_name} onChange={(e) => setPriv({ ...priv, owner_name: e.target.value })} /></Field>
            <Field label="هاتف المالك"><input className={`${F} mono`} dir="ltr" value={priv.owner_phone} onChange={(e) => setPriv({ ...priv, owner_phone: e.target.value })} /></Field>
          </div>
          <p className="text-[11.5px] text-ink-500 mt-2">ما يظهر بالموقع أبداً.</p>
        </OsCard>
        {l && (
          <OsCard title="الأداء">
            <div className="grid grid-cols-2 gap-2"><Stat label="مشاهدات" value={l.views} /><Stat label="طلبات" value={l.leads} /></div>
          </OsCard>
        )}
      </aside>
    </div>
  );
}

function MediaManager({ l, kind, title, sub, max, reload }) {
  const toast = useToast();
  const items = kind === 'photo' ? l.photos : l.plans;
  const [order, setOrder] = useState(items);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [url, setUrl] = useState('');
  const fileRef = useRef(null);
  useEffect(() => setOrder(items), [items]);
  const nextSort = () => (l.media.length ? Math.max(...l.media.map((m) => m.sort)) + 1 : 0);

  const upload = async (files) => {
    const list = [...files].slice(0, Math.max(0, max - order.length));
    if (!list.length) return toast(`الحد الأقصى ${max}`, 'error');
    setBusy(true);
    try {
      let s = nextSort();
      for (const file of list) {
        if (file.size > 10 * 1024 * 1024) { toast(`${file.name} أكبر من 10MB`, 'error'); continue; }
        const up = await uploadMedia(file, `listings/${l.id}`);
        await q(supabase.from('listing_media').insert({ listing_id: l.id, kind, url: up.url, storage_path: up.path, name: file.name, sort: s++ }));
      }
      await reload();
      toast('تم الرفع');
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const addUrl = async (e) => {
    e.preventDefault();
    if (!/^https?:\/\//.test(url)) return toast('أدخل رابطاً يبدأ بـ https://', 'error');
    setBusy(true);
    try { await q(supabase.from('listing_media').insert({ listing_id: l.id, kind, url, sort: nextSort() })); setUrl(''); await reload(); } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const remove = async (m) => {
    if (!window.confirm('حذف هذا الملف؟')) return;
    setBusy(true);
    try {
      await q(supabase.from('listing_media').delete().eq('id', m.id));
      if (m.storage_path) await removeMedia([m.storage_path]).catch(() => {});
      await reload();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const persistOrder = async (arr) => {
    setOrder(arr);
    const base = Math.min(...arr.map((m) => m.sort));
    try {
      await Promise.all(arr.map((m, i) => (m.sort !== base + i ? q(supabase.from('listing_media').update({ sort: base + i }).eq('id', m.id)) : null)));
      await reload();
    } catch (e) { toast(e.message, 'error'); }
  };
  const move = (from, to) => { if (from === to || to < 0 || to >= order.length) return; const a = [...order]; const [x] = a.splice(from, 1); a.splice(to, 0, x); persistOrder(a); };
  const isPdf = (m) => /\.pdf($|\?)/i.test(m.url) || /\.pdf$/i.test(m.name || '');

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4"><div className="min-w-0"><h2 className="font-semibold text-[15px]">{title}</h2><p className="lbl mt-0.5">{sub}</p></div><span className="text-[12px] text-ink-500 num flex-none">{order.length} / {max}</span></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {order.map((m, i) => (
          <div key={m.id} draggable onDragStart={() => setDrag(i)} onDragEnd={() => { setDrag(null); setOver(null); }} onDragOver={(e) => { e.preventDefault(); setOver(i); }} onDrop={(e) => { e.preventDefault(); move(drag, i); }}
            className={`relative aspect-[4/3] rounded-[12px] overflow-hidden bg-paper-2 cursor-grab ${isPdf(m) ? 'border hair' : ''} ${drag === i ? 'dragging ' : ''}${over === i && drag !== i ? 'drop-target' : ''}`}
            style={isPdf(m) ? { background: 'repeating-linear-gradient(45deg,#f6f6f4 0 8px,#f0f0ed 8px 16px)' } : undefined}>
            {isPdf(m) ? <a href={m.url} target="_blank" rel="noreferrer" className="absolute bottom-2 start-2 mono text-[12px] text-ink-500 inline-flex items-center gap-1"><Icon name="doc" size={14} />{m.name || 'plan.pdf'}</a> : <img src={m.url} alt="" draggable={false} className="w-full h-full block" style={{ objectFit: 'cover' }} />}
            <span className="absolute top-2 start-2 osb osb-ink">{kind === 'photo' && i === 0 ? 'الغلاف' : i + 1}</span>
            <div className="absolute bottom-2 end-2 flex gap-1">
              {i > 0 && <button type="button" title="تقديم" aria-label="تقديم" onClick={() => move(i, i - 1)} className="icon-btn !w-7 !h-7 bg-white shadow"><Icon name="chev" size={14} /></button>}
              {i < order.length - 1 && <button type="button" title="تأخير" aria-label="تأخير" onClick={() => move(i, i + 1)} className="icon-btn !w-7 !h-7 bg-white shadow"><Icon name="chev-l" size={14} /></button>}
              <button type="button" title="حذف" aria-label="حذف" onClick={() => remove(m)} className="icon-btn !w-7 !h-7 bg-white shadow hover:text-red"><Icon name="close" size={14} /></button>
            </div>
          </div>
        ))}
        {order.length < max && (
          <label className={`aspect-[4/3] rounded-[12px] border-2 border-dashed hair flex flex-col items-center justify-center gap-1.5 text-ink-500 text-[13px] font-semibold hover:border-ink transition-colors cursor-pointer`} style={busy ? { cursor: 'wait' } : undefined}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.length) upload(e.dataTransfer.files); }}>
            {busy ? <div className="spin-dark" /> : <><Icon name="upload" size={20} /><span>{kind === 'photo' ? 'رفع صور' : 'مخطط أو PDF'}</span></>}
            <input ref={fileRef} type="file" multiple accept={kind === 'photo' ? 'image/jpeg,image/png,image/webp,image/avif' : 'image/jpeg,image/png,image/webp,application/pdf'} disabled={busy} onChange={(e) => e.target.files?.length && upload(e.target.files)} className="hidden" />
          </label>
        )}
      </div>
      <form onSubmit={addUrl} className="flex gap-2 mt-3 max-w-[520px]">
        <input className={`${F} mono min-w-0`} dir="ltr" placeholder="أو الصق رابط صورة https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Btn type="submit" size="sm" className="!h-10 flex-none" disabled={busy || !url}><Icon name="plus" size={15} />إضافة</Btn>
      </form>
    </div>
  );
}

function PlanTab({ f, set, setF, project }) {
  const src = f.plan_source || '';
  const plan = listingPlan({ ...f, deal: 'sale', price: +f.price || 0, payment: f.payment === 'cash' && src ? 'installments' : f.payment, plan_down: +f.plan_down || 0, plan_months: +f.plan_months || 0, plan_handover: +f.plan_handover || 0 }, project);
  const fromProj = src === 'project' && project;
  const v = (k, pk) => (fromProj ? project[pk] : f[k]);
  const choose = (s) => setF((x) => ({ ...x, plan_source: s || null, payment: s ? (x.payment === 'cash' ? 'installments' : x.payment) : 'cash', ...(s === 'custom' && !x.plan_months ? { plan_down: 20, plan_months: 36, plan_handover: 10 } : {}) }));
  return (
    <div className="os-cols">
      <div className="grid gap-5 min-w-0">
        <OsCard title="خطة الدفع" sub="تُعرض على صفحة العقار كشريط ملوّن. اختار «كاش فقط» للبيع بدون تقسيط.">
          <div className="overflow-x-auto no-sb max-w-full mb-4"><div className="seg">
            {[['project', 'من المشروع', !project], ['custom', 'مخصصة'], ['', 'كاش فقط']].map(([k, t, dis]) => (
              <button type="button" key={t} disabled={dis} title={dis ? 'اربط العقار بمشروع أولاً' : undefined} onClick={() => choose(k)} aria-pressed={src === k} className="!h-9 !px-4 !text-[13px]">{t}</button>
            ))}
          </div></div>
          {src && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Field label="دفعة أولى %"><input className={`${F} num font-semibold`} type="number" min="0" max="100" dir="ltr" disabled={!!fromProj} value={v('plan_down', 'plan_down')} onChange={set('plan_down')} /></Field>
                <Field label="عدد الأقساط (شهر)"><input className={`${F} num font-semibold`} type="number" min="1" max="120" dir="ltr" disabled={!!fromProj} value={v('plan_months', 'plan_months')} onChange={set('plan_months')} /></Field>
                <Field label="عند التسليم %"><input className={`${F} num font-semibold`} type="number" min="0" max="100" dir="ltr" disabled={!!fromProj} value={v('plan_handover', 'plan_handover')} onChange={set('plan_handover')} /></Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <Field label="موعد التسليم">{fromProj ? <input className={F} disabled value={handoverText(project.handover)} readOnly /> : <input className={`${F} num`} type="date" dir="ltr" value={isIsoDate(f.plan_handover_date) ? f.plan_handover_date : ''} onChange={set('plan_handover_date')} />}</Field>
                <Field label="ملاحظة تظهر للزائر"><input className={F} value={f.plan_note} onChange={set('plan_note')} placeholder="مثلاً: بدون فوائد" /></Field>
              </div>
              {fromProj && <p className="text-[11.5px] text-ink-500 mt-3">القيم مأخوذة من مشروع {project.name} وتتحدث تلقائياً معه.</p>}
              {!fromProj && +f.plan_down + +f.plan_handover > 100 && <p className="text-[12.5px] text-red mt-3">مجموع الدفعة الأولى والتسليم أكبر من 100%</p>}
            </>
          )}
        </OsCard>
      </div>
      <aside className="os-aside grid gap-5 min-w-0">
        <OsCard title="معاينة مباشرة" extra={<span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-500"><span className="w-1.5 h-1.5 rounded-full bg-ok" />كما تظهر بالموقع</span>}>
          {plan ? (
            <>
              <PlanBar down={plan.down} inst={plan.inst} handover={plan.handover} />
              <div className="grid grid-cols-3 gap-2 mt-3">
                <Stat label="دفعة أولى" value={<span dir="ltr">{usd(plan.downAmt)}</span>} />
                <Stat label={`${plan.months} قسط`} value={<span dir="ltr">{usd(plan.monthly)}</span>} />
                <Stat label="التسليم" value={<span dir="ltr">{usd(plan.handAmt)}</span>} />
              </div>
            </>
          ) : <p className="text-[13px] text-ink-500">كاش فقط — لا يظهر شريط التقسيط.</p>}
        </OsCard>
      </aside>
    </div>
  );
}

function StatusTab({ f, set, setF, A, l, isNew, C, nav, toast }) {
  const [events, setEvents] = useState(null);
  useEffect(() => {
    if (isNew) return setEvents([]);
    supabase.from('listing_events').select('*').eq('listing_id', l.id).order('created_at', { ascending: false }).limit(30).then(({ data }) => setEvents(data || []));
  }, [isNew, l?.id, l?.updated_at]);
  const opts = [['draft', 'مسودة', 'لا يظهر في الموقع'], ['live', 'منشور', 'ظاهر ويقبل الطلبات'], ['reserved', 'محجوز', 'يظهر بعلامة محجوز'], ['sold', f.deal === 'rent' ? 'مؤجّر' : 'مباع / مؤجّر', 'يُؤرشف من النتائج']];
  const del = async () => {
    if (!window.confirm(`حذف ${l.id} نهائياً؟ سيُحذف من الموقع ومن ربط العملاء.`)) return;
    try {
      const paths = l.media.map((m) => m.storage_path).filter(Boolean);
      await q(supabase.from('listings').delete().eq('id', l.id));
      await removeMedia(paths).catch(() => {});
      await C.reload();
      toast('حُذف العقار');
      nav('/cms/listings', { replace: true });
    } catch (e) { toast(friendlyError(e), 'error'); }
  };
  const row = (label, sub, k, disabled) => (
    <SwRow key={k} label={label} sub={sub}><Toggle on={!!f[k]} disabled={disabled} label={label} onChange={(v) => setF((s) => ({ ...s, [k]: v }))} /></SwRow>
  );
  return (
    <div className="os-cols">
      <div className="grid gap-5 min-w-0">
        <OsCard title="الموقع والحالة" sub="العقار يظهر بالموقع بس إذا حالته منشور أو محجوز.">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {opts.map(([k, t, d]) => {
              const on = f.status === k;
              const dis = (A.isAgent && k !== 'draft' && k !== l?.status) || (isNew && k !== 'draft');
              const [, c, bg] = STATUS[k];
              return (
                <button type="button" key={k} disabled={dis} onClick={() => setF((s) => ({ ...s, status: k }))} aria-pressed={on} className={`text-start p-3.5 rounded-[12px] border transition-colors ${on ? 'border-2' : 'hair bg-white hover:border-ink-300'}`} style={on ? { borderColor: c, background: bg } : undefined}>
                  <div className="font-semibold text-[14px] inline-flex items-center gap-1.5" style={on ? { color: c } : undefined}>{t}{on && <Icon name="check" size={14} />}</div><div className="text-[12px] mt-0.5" style={{ color: on ? c : '#767a83' }}>{d}</div>
                </button>
              );
            })}
          </div>
          {f.status !== (l?.status || 'draft') && <p className="text-[12.5px] text-warn mt-3">اضغط «{A.isEditor ? 'نشر التغييرات' : 'حفظ'}» لتطبيق الحالة الجديدة</p>}
          {isNew && <p className="text-[12.5px] text-ink-500 mt-3">العقار الجديد يُنشأ كمسودة، وتنشره بعد إضافة الصور.</p>}
        </OsCard>
        <OsCard title="الظهور">
          <div className="divide-y hair -my-1">
            {row('مميز بالصفحة الرئيسية', A.isEditor ? 'يظهر في قسم «عقارات مميزة» بالصفحة الرئيسية' : 'يحدده محرر المحتوى', 'featured', !A.isEditor)}
            {row('موثّق من ڤايرو', 'تمت زيارة العقار ميدانياً', 'verified')}
            {row('إخفاء السعر', 'يعرض «اتصل للسعر»', 'hide_price')}
          </div>
        </OsCard>
        {A.isEditor && !isNew && (
          <OsCard title={<span className="text-red">حذف العقار</span>} className="border-red-100" sub="يُحذف مع صوره وسجله. للأرشفة استخدم «مباع / مؤجّر» بدلاً عن الحذف.">
            <Btn size="sm" className="text-red" style={{ borderColor: '#f5c6cf' }} onClick={del}><Icon name="trash" size={15} />حذف نهائي</Btn>
          </OsCard>
        )}
      </div>
      <aside className="os-aside grid gap-5 min-w-0">
        <OsCard title="سجل التغييرات">
          {events === null ? <Spinner pad={20} /> : events.length === 0 ? <p className="text-[13px] text-ink-500">ماكو تغييرات مسجلة بعد.</p> : (
            <div className="text-[12.5px] divide-y hair">
              {events.map((e) => <div key={e.id} className="py-2 flex gap-3"><span className="text-ink-400 whitespace-nowrap num flex-none" style={{ width: 72 }}>{ago(e.created_at)}</span><span className="min-w-0"><b>{e.label}</b><span className="block text-ink-500">{e.actor_name || 'النظام'}</span></span></div>)}
            </div>
          )}
        </OsCard>
      </aside>
    </div>
  );
}
