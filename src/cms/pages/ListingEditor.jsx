import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCms } from '../CmsApp.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { supabase, q, uploadMedia, removeMedia, friendlyError } from '../../lib/supabase.js';
import { useDocTitle } from '../../lib/hooks.js';
import { CONDITIONS, FURNISHING, LISTING_FEATURES, PAYMENT_AR, STATUS, TYPE_AR, ago, listingPlan, listingTitle, usd } from '../../lib/format.js';
import { Btn, Card, Field, Seg, Spinner, StatusPill, Toggle, useToast } from '../../components/ui.jsx';
import { PlanBar } from '../../site/parts.jsx';

const NUMS = ['beds', 'baths', 'size', 'plot', 'floor', 'total_floors', 'floors', 'terrace', 'frontage', 'age', 'price', 'rent', 'deposit', 'plan_down', 'plan_months', 'plan_handover'];
const FIELDS = ['deal', 'type', 'area_id', 'project_id', 'agent_id', 'status', 'featured', 'verified', 'hide_price', 'land_use', 'use_type', 'condition', 'view_text', 'features', 'description_ar', 'description_en', 'payment', 'furnishing', 'available', 'plan_source', 'plan_handover_date', 'plan_note', 'video_url', ...NUMS];
const BOOLS = ['featured', 'verified', 'hide_price'];
const toForm = (l) => Object.fromEntries(FIELDS.map((k) => [k, BOOLS.includes(k) ? !!l[k] : l[k] == null ? (k === 'features' ? [] : '') : l[k]]));
const toRow = (f) => Object.fromEntries(FIELDS.map((k) => [k, BOOLS.includes(k) ? !!f[k] : NUMS.includes(k) ? (f[k] === '' || f[k] == null ? null : Math.round(+f[k])) : f[k] === '' ? null : f[k]]));

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

  if (!isNew && !l) return <Card>العقار غير موجود. <Btn onClick={() => nav('/cms/listings')}>رجوع</Btn></Card>;
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
  const tabBtn = (k, t, extra) => (
    <button key={k} onClick={() => setSp({ tab: k }, { replace: true })} style={{ height: 42, padding: '0 16px', border: 0, background: 'transparent', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: tab === k ? '#1d1e22' : '#767a83', boxShadow: `inset 0 -2px 0 ${tab === k ? '#c8102e' : 'transparent'}`, whiteSpace: 'nowrap' }}>{t} {extra}</button>
  );

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => nav('/cms/listings')} aria-label="رجوع" style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #d8d8d3', background: '#fff', cursor: 'pointer', fontSize: 16 }}>→</button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: '#767a83' }}>{isNew ? 'عقار جديد · يُحفظ كمسودة' : `${l.id} · آخر حفظ ${ago(l.updated_at)}`}{dirty && <span style={{ color: '#b26a00' }}> · تغييرات غير محفوظة</span>}</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '2px 0 0' }}>{title}</h1>
        </div>
        <StatusPill label={st[0]} color={st[1]} bg={st[2]} h={26} fs={12} />
        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!isNew && <a href={`/property/${l.id}`} target="_blank" rel="noreferrer"><Btn>معاينة في الموقع</Btn></a>}
          {canEdit && A.isEditor && <Btn disabled={busy} onClick={() => save('draft')}>حفظ كمسودة</Btn>}
          {canEdit && A.isEditor && <Btn kind="red" disabled={busy} onClick={() => save(f.status === 'draft' && !isNew ? 'live' : undefined)}>{isNew ? 'إنشاء العقار' : f.status === 'draft' ? 'نشر' : 'نشر التغييرات'}</Btn>}
          {canEdit && !A.isEditor && <Btn kind="red" disabled={busy} onClick={() => save()}>{isNew ? 'حفظ كمسودة' : 'حفظ التغييرات'}</Btn>}
        </div>
      </div>
      {!canEdit && <div style={{ background: '#fff3e0', color: '#b26a00', borderRadius: 12, padding: '10px 14px', fontSize: 13.5, fontWeight: 600, marginBottom: 16 }}>عرض فقط — هذا العقار مسند لوسيط آخر</div>}
      {A.isAgent && canEdit && <div style={{ background: '#f1f1ef', color: '#5a5e68', borderRadius: 12, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>كوسيط تحفظ التعديلات كمسودة؛ محرر المحتوى يراجع وينشر.</div>}
      <div className="no-scrollbar" style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e7e7e3', marginBottom: 20, overflowX: 'auto' }}>
        {tabBtn('details', 'التفاصيل')}
        {tabBtn('photos', 'الصور والمخططات', <span style={{ fontSize: 12, color: '#9da0a7' }}>{l?.photos.length || 0}</span>)}
        {f.deal === 'sale' && tabBtn('plan', 'خطة الدفع')}
        {tabBtn('status', 'الحالة والنشر')}
      </div>
      <fieldset disabled={!canEdit || busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {tab === 'details' && <Details f={f} set={set} setF={setF} C={C} A={A} l={l} priv={priv} setPriv={setPriv} />}
        {tab === 'photos' && (isNew ? <Card>احفظ العقار أولاً حتى تگدر ترفع الصور والمخططات. <Btn kind="red" style={{ marginInlineStart: 8 }} onClick={() => save()}>إنشاء العقار</Btn></Card> : (
          <Card>
            <MediaManager l={l} kind="photo" title="الصور" sub="اسحب لإعادة الترتيب · الأولى هي صورة الغلاف" max={20} reload={C.reload} />
            <div style={{ height: 24 }} />
            <MediaManager l={l} kind="plan" title="المخططات" sub="صورة أو PDF" max={10} reload={C.reload} />
            <div style={{ fontWeight: 600, margin: '24px 0 10px' }}>جولة فيديو (اختياري)</div>
            <input className="inp-sm" dir="ltr" placeholder="رابط يوتيوب أو ملف" value={f.video_url} onChange={set('video_url')} style={{ maxWidth: 480 }} />
            {f.video_url !== initial.video_url && <div style={{ fontSize: 12, color: '#b26a00', marginTop: 6 }}>اضغط حفظ لتثبيت الرابط</div>}
          </Card>
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
  const num = (k, label, extra = {}) => <Field label={label}><input className="inp-sm" type="number" min="0" inputMode="numeric" value={f[k]} onChange={set(k)} {...extra} /></Field>;
  const auto = `${TYPE_AR[f.type]} في ${C.A[f.area_id]?.name || ''} بمساحة ${f.size || '—'} م².${f.view_text ? ' ' + f.view_text + '.' : ''} ${(f.features || []).slice(0, 3).join('، ')}.`;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, gridColumn: 'span 2', minWidth: 0 }}>
        <Card><div style={{ fontWeight: 600, marginBottom: 14 }}>الأساسيات</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
            <Field label="نوع العرض"><Seg full value={f.deal} onChange={(v) => setF((s) => ({ ...s, deal: v }))} h={34} options={[['sale', 'للبيع'], ['rent', 'للإيجار']]} style={{ display: 'flex', padding: 3, borderRadius: 10 }} /></Field>
            <Field label="نوع العقار"><select className="inp-sm sel" value={f.type} onChange={set('type')}>{Object.entries(TYPE_AR).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></Field>
            <Field label="المنطقة"><select className="inp-sm sel" value={f.area_id} onChange={set('area_id')}>{C.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
            <Field label="المشروع (اختياري)"><select className="inp-sm sel" value={f.project_id || ''} onChange={set('project_id')}><option value="">— بدون مشروع —</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            {f.deal === 'sale' ? (
              <>
                <Field label="السعر (دولار)"><input className="inp-sm" type="number" min="0" dir="ltr" style={{ fontWeight: 600, textAlign: 'right' }} value={f.price} onChange={set('price')} /></Field>
                <Field label="طريقة الدفع"><select className="inp-sm sel" value={f.payment || 'cash'} onChange={set('payment')}>{Object.entries(PAYMENT_AR).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></Field>
              </>
            ) : (
              <>
                <Field label="الإيجار الشهري (دولار)"><input className="inp-sm" type="number" min="0" dir="ltr" style={{ fontWeight: 600, textAlign: 'right' }} value={f.rent} onChange={set('rent')} /></Field>
                <Field label="الفرش"><select className="inp-sm sel" value={f.furnishing || ''} onChange={set('furnishing')}><option value="">—</option>{FURNISHING.map((t) => <option key={t}>{t}</option>)}</select></Field>
                {num('deposit', 'التأمين (دولار)')}
                <Field label="التوفر"><input className="inp-sm" list="avail" value={f.available} onChange={set('available')} placeholder="متاح الآن" /><datalist id="avail"><option value="متاح الآن" /></datalist></Field>
              </>
            )}
          </div>
        </Card>
        <Card><div style={{ fontWeight: 600, marginBottom: 14 }}>المواصفات</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
            {num('size', 'المساحة م²', { required: true })}
            {!isLand && num('beds', 'غرف النوم')}
            {!isLand && num('baths', 'الحمامات')}
            {!isLand && num('floor', 'الطابق')}
            {['apartment', 'penthouse', 'office'].includes(f.type) && num('total_floors', 'عدد طوابق المبنى')}
            {['villa', 'house', 'townhouse', 'land'].includes(f.type) && num('plot', 'مساحة القطعة م²')}
            {['land', 'shop'].includes(f.type) && num('frontage', 'الواجهة م')}
            {f.type === 'penthouse' && num('terrace', 'التراس م²')}
            {['house', 'villa', 'townhouse'].includes(f.type) && num('age', 'عمر البناء (سنة)')}
            {isLand && <Field label="الاستخدام"><input className="inp-sm" value={f.land_use} onChange={set('land_use')} placeholder="سكني / تجاري" /></Field>}
            {!isLand && <Field label="الحالة"><select className="inp-sm sel" value={f.condition || ''} onChange={set('condition')}><option value="">—</option>{CONDITIONS.map((t) => <option key={t}>{t}</option>)}</select></Field>}
            <Field label="الإطلالة"><input className="inp-sm" value={f.view_text} onChange={set('view_text')} placeholder="مثلاً: إطلالة على المتنزه" /></Field>
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#5a5e68', margin: '16px 0 8px' }}>المميزات</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {feats.map((t) => {
              const on = f.features.includes(t);
              return <button type="button" key={t} onClick={() => toggleFeat(t)} style={{ height: 32, padding: '0 12px', borderRadius: 999, background: on ? '#1d1e22' : '#fff', color: on ? '#fff' : '#1d1e22', border: on ? 0 : '1px solid #d8d8d3', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t}{on ? ' ✓' : ''}</button>;
            })}
            <form onSubmit={(e) => { e.preventDefault(); const t = newFeat.trim(); if (t && !f.features.includes(t)) setF((s) => ({ ...s, features: [...s.features, t] })); setNewFeat(''); }} style={{ display: 'contents' }}>
              <input value={newFeat} onChange={(e) => setNewFeat(e.target.value)} placeholder="+ إضافة" aria-label="إضافة ميزة" style={{ height: 32, padding: '0 12px', borderRadius: 999, border: '1px dashed #d8d8d3', fontSize: 13, width: 110, outline: 0 }} />
            </form>
          </div>
        </Card>
        <Card><div style={{ fontWeight: 600, marginBottom: 14 }}>الوصف</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {[['ar', 'عربي'], ['en', 'English']].map(([k, t]) => <button type="button" key={k} onClick={() => setLang(k)} style={{ height: 30, padding: '0 10px', borderRadius: 8, background: lang === k ? '#f6f6f4' : 'transparent', border: 0, fontSize: 12.5, fontWeight: 600, color: lang === k ? '#1d1e22' : '#767a83', cursor: 'pointer' }}>{t}</button>)}
          </div>
          {lang === 'ar'
            ? <textarea className="inp" rows={5} value={f.description_ar} onChange={set('description_ar')} placeholder={auto} style={{ fontSize: 14 }} />
            : <textarea className="inp" rows={5} dir="ltr" value={f.description_en} onChange={set('description_en')} placeholder="English description (optional)" style={{ fontSize: 14 }} />}
          {lang === 'ar' && !f.description_ar && <div style={{ fontSize: 12, color: '#767a83', marginTop: 6 }}>إذا تركته فارغاً يُكتب وصف تلقائي من المواصفات.</div>}
        </Card>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
        <Card pad={18}><div style={{ fontWeight: 600, marginBottom: 12 }}>الوسيط المسؤول</div>
          {A.isEditor ? (
            <select className="inp-sm sel" value={f.agent_id || ''} onChange={set('agent_id')} style={{ height: 54, fontWeight: 600 }}>
              <option value="">— غير مخصّص —</option>{C.agents.filter((a) => a.active || a.id === f.agent_id).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, border: '1px solid #d8d8d3', borderRadius: 10 }}>{C.G[f.agent_id]?.img && <img src={C.G[f.agent_id].img} alt="" style={{ width: 34, height: 34, borderRadius: 999, objectFit: 'cover' }} />}<div style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{C.G[f.agent_id]?.name || '—'}</div></div>
          )}
        </Card>
        <Card pad={18}><div style={{ fontWeight: 600, marginBottom: 12 }}>المالك (داخلي)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="inp-sm" placeholder="اسم المالك" value={priv.owner_name} onChange={(e) => setPriv({ ...priv, owner_name: e.target.value })} />
            <input className="inp-sm" placeholder="هاتف المالك" dir="ltr" style={{ textAlign: 'right' }} value={priv.owner_phone} onChange={(e) => setPriv({ ...priv, owner_phone: e.target.value })} />
          </div>
          <div style={{ fontSize: 12, color: '#767a83', marginTop: 8 }}>لا يظهر في الموقع</div>
        </Card>
        {l && (
          <Card pad={18}><div style={{ fontWeight: 600, marginBottom: 12 }}>الإحصائيات</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
              <div style={{ background: '#f6f6f4', borderRadius: 10, padding: 10 }}><div style={{ color: '#767a83', fontSize: 11.5 }}>مشاهدات</div><div style={{ fontWeight: 700, fontSize: 18 }}>{l.views}</div></div>
              <div style={{ background: '#f6f6f4', borderRadius: 10, padding: 10 }}><div style={{ color: '#767a83', fontSize: 11.5 }}>طلبات</div><div style={{ fontWeight: 700, fontSize: 18 }}>{l.leads}</div></div>
            </div>
          </Card>
        )}
      </div>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}><div><div style={{ fontWeight: 600 }}>{title}</div><div style={{ fontSize: 12.5, color: '#767a83' }}>{sub}</div></div><span style={{ fontSize: 12.5, color: '#767a83' }}>{order.length} / {max}</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
        {order.map((m, i) => (
          <div key={m.id} draggable onDragStart={() => setDrag(i)} onDragEnd={() => { setDrag(null); setOver(null); }} onDragOver={(e) => { e.preventDefault(); setOver(i); }} onDrop={(e) => { e.preventDefault(); move(drag, i); }}
            className={(drag === i ? 'dragging ' : '') + (over === i && drag !== i ? 'drop-target' : '')}
            style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden', background: isPdf(m) ? 'repeating-linear-gradient(45deg,#f6f6f4 0 8px,#f0f0ed 8px 16px)' : '#f6f6f4', cursor: 'grab', border: isPdf(m) ? '1px solid #e7e7e3' : 0 }}>
            {isPdf(m) ? <a href={m.url} target="_blank" rel="noreferrer" style={{ position: 'absolute', bottom: 10, insetInlineStart: 10, fontSize: 12, fontFamily: 'ui-monospace,monospace', color: '#767a83' }}>{m.name || 'plan.pdf'}</a> : <img src={m.url} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
            <span style={{ position: 'absolute', top: 8, insetInlineStart: 8, height: 22, padding: '0 8px', borderRadius: 6, background: 'rgba(29,30,34,.8)', color: '#fff', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>{kind === 'photo' && i === 0 ? 'الغلاف' : i + 1}</span>
            <div style={{ position: 'absolute', bottom: 8, insetInlineEnd: 8, display: 'flex', gap: 4 }}>
              {i > 0 && <button type="button" title="تقديم" aria-label="تقديم" onClick={() => move(i, i - 1)} style={mini}>→</button>}
              {i < order.length - 1 && <button type="button" title="تأخير" aria-label="تأخير" onClick={() => move(i, i + 1)} style={mini}>←</button>}
              <button type="button" title="حذف" aria-label="حذف" onClick={() => remove(m)} style={mini}>✕</button>
            </div>
          </div>
        ))}
        {order.length < max && (
          <label style={{ aspectRatio: '4/3', borderRadius: 12, border: '2px dashed #d8d8d3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#767a83', fontSize: 13, fontWeight: 600, cursor: busy ? 'wait' : 'pointer' }}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.length) upload(e.dataTransfer.files); }}>
            {busy ? <div className="spin" /> : <>+<span>{kind === 'photo' ? 'رفع صور' : 'مخطط أو PDF'}</span></>}
            <input ref={fileRef} type="file" multiple accept={kind === 'photo' ? 'image/jpeg,image/png,image/webp,image/avif' : 'image/jpeg,image/png,image/webp,application/pdf'} disabled={busy} onChange={(e) => e.target.files?.length && upload(e.target.files)} style={{ display: 'none' }} />
          </label>
        )}
      </div>
      <form onSubmit={addUrl} style={{ display: 'flex', gap: 8, marginTop: 10, maxWidth: 520 }}>
        <input className="inp-sm" dir="ltr" placeholder="أو الصق رابط صورة https://…" value={url} onChange={(e) => setUrl(e.target.value)} style={{ height: 36, fontSize: 13 }} />
        <Btn type="submit" h={36} r={10} fs={13} disabled={busy || !url}>إضافة</Btn>
      </form>
    </div>
  );
}
const mini = { width: 26, height: 26, borderRadius: 6, background: 'rgba(255,255,255,.95)', border: 0, display: 'grid', placeItems: 'center', fontSize: 12, cursor: 'pointer' };

function PlanTab({ f, set, setF, project }) {
  const src = f.plan_source || '';
  const plan = listingPlan({ ...f, deal: 'sale', price: +f.price || 0, payment: f.payment === 'cash' && src ? 'installments' : f.payment, plan_down: +f.plan_down || 0, plan_months: +f.plan_months || 0, plan_handover: +f.plan_handover || 0 }, project);
  const fromProj = src === 'project' && project;
  const v = (k, pk) => (fromProj ? project[pk] : f[k]);
  const choose = (s) => setF((x) => ({ ...x, plan_source: s || null, payment: s ? (x.payment === 'cash' ? 'installments' : x.payment) : 'cash', ...(s === 'custom' && !x.plan_months ? { plan_down: 20, plan_months: 36, plan_handover: 10 } : {}) }));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: 16, alignItems: 'start' }}>
      <Card style={{ gridColumn: 'span 2' }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>خطة الدفع</div>
        <div style={{ fontSize: 12.5, color: '#767a83', marginBottom: 16 }}>تُعرض على صفحة العقار كشريط ملوّن. اختار «كاش فقط» للبيع بدون تقسيط.</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#f6f6f4', borderRadius: 10, padding: 3, width: 'fit-content', flexWrap: 'wrap' }}>
          {[['project', 'من المشروع', !project], ['custom', 'مخصصة'], ['', 'كاش فقط']].map(([k, t, dis]) => (
            <button type="button" key={t} disabled={dis} title={dis ? 'اربط العقار بمشروع أولاً' : undefined} onClick={() => choose(k)} style={{ height: 34, padding: '0 14px', borderRadius: 8, border: 0, background: src === k ? '#fff' : 'transparent', boxShadow: src === k ? '0 1px 2px rgba(0,0,0,.08)' : 'none', fontSize: 13.5, fontWeight: src === k ? 600 : 400, color: src === k ? '#1d1e22' : '#767a83', cursor: 'pointer' }}>{t}</button>
          ))}
        </div>
        {src && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              <Field label="دفعة أولى %"><input className="inp-sm" type="number" min="0" max="100" disabled={!!fromProj} value={v('plan_down', 'plan_down')} onChange={set('plan_down')} style={{ fontWeight: 600 }} /></Field>
              <Field label="عدد الأقساط (شهر)"><input className="inp-sm" type="number" min="1" max="120" disabled={!!fromProj} value={v('plan_months', 'plan_months')} onChange={set('plan_months')} style={{ fontWeight: 600 }} /></Field>
              <Field label="عند التسليم %"><input className="inp-sm" type="number" min="0" max="100" disabled={!!fromProj} value={v('plan_handover', 'plan_handover')} onChange={set('plan_handover')} style={{ fontWeight: 600 }} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <Field label="موعد التسليم"><input className="inp-sm" disabled={!!fromProj} value={fromProj ? project.handover : f.plan_handover_date} onChange={set('plan_handover_date')} placeholder="الربع الرابع 2027" /></Field>
              <Field label="ملاحظة تظهر للزائر"><input className="inp-sm" value={f.plan_note} onChange={set('plan_note')} placeholder="مثلاً: بدون فوائد" /></Field>
            </div>
            {fromProj && <div style={{ fontSize: 12.5, color: '#767a83', marginTop: 10 }}>القيم مأخوذة من مشروع {project.name} وتتحدث تلقائياً معه.</div>}
            {!fromProj && +f.plan_down + +f.plan_handover > 100 && <div style={{ fontSize: 12.5, color: '#c8102e', marginTop: 10 }}>مجموع الدفعة الأولى والتسليم أكبر من 100%</div>}
          </>
        )}
      </Card>
      <Card pad={18}>
        <div style={{ fontSize: 12, color: '#767a83', marginBottom: 10 }}>معاينة كما تظهر في الموقع</div>
        {plan ? (
          <>
            <PlanBar down={plan.down} inst={plan.inst} handover={plan.handover} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 12, fontSize: 12 }}>
              <div><div style={{ color: '#767a83' }}>دفعة أولى</div><div style={{ fontWeight: 600 }} dir="ltr">{usd(plan.downAmt)}</div></div>
              <div><div style={{ color: '#767a83' }}>{plan.months} قسط</div><div style={{ fontWeight: 600 }} dir="ltr">{usd(plan.monthly)}</div></div>
              <div><div style={{ color: '#767a83' }}>التسليم</div><div style={{ fontWeight: 600 }} dir="ltr">{usd(plan.handAmt)}</div></div>
            </div>
          </>
        ) : <div style={{ fontSize: 13, color: '#767a83' }}>كاش فقط — لا يظهر شريط التقسيط.</div>}
      </Card>
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <div><div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div><div style={{ fontSize: 12.5, color: '#767a83' }}>{sub}</div></div>
      <Toggle on={!!f[k]} disabled={disabled} label={label} onChange={(v) => setF((s) => ({ ...s, [k]: v }))} />
    </div>
  );
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, gridColumn: 'span 2', minWidth: 0 }}>
        <Card><div style={{ fontWeight: 600, marginBottom: 14 }}>حالة العقار</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
            {opts.map(([k, t, d]) => {
              const on = f.status === k;
              const dis = (A.isAgent && k !== 'draft' && k !== l?.status) || (isNew && k !== 'draft');
              const [, c, bg] = STATUS[k];
              return (
                <button type="button" key={k} disabled={dis} onClick={() => setF((s) => ({ ...s, status: k }))} style={{ textAlign: 'start', padding: 14, borderRadius: 12, border: on ? `2px solid ${c}` : '1px solid #d8d8d3', background: on ? bg : '#fff', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: on ? c : '#1d1e22' }}>{t}{on ? ' ✓' : ''}</div><div style={{ fontSize: 12, color: on ? c : '#767a83', marginTop: 2 }}>{d}</div>
                </button>
              );
            })}
          </div>
          {f.status !== (l?.status || 'draft') && <div style={{ fontSize: 12.5, color: '#b26a00', marginTop: 10 }}>اضغط «{A.isEditor ? 'نشر التغييرات' : 'حفظ'}» لتطبيق الحالة الجديدة</div>}
          {isNew && <div style={{ fontSize: 12.5, color: '#767a83', marginTop: 10 }}>العقار الجديد يُنشأ كمسودة، وتنشره بعد إضافة الصور.</div>}
        </Card>
        <Card><div style={{ fontWeight: 600, marginBottom: 14 }}>الظهور</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {row('عقار مميز', A.isEditor ? 'يظهر في قسم «عقارات مميزة» بالصفحة الرئيسية' : 'يحدده محرر المحتوى', 'featured', !A.isEditor)}
            {row('موثّق من ڤايرو', 'تمت زيارة العقار ميدانياً', 'verified')}
            {row('إخفاء السعر', 'يعرض «اتصل للسعر»', 'hide_price')}
          </div>
        </Card>
        {A.isEditor && !isNew && (
          <Card style={{ borderColor: '#f5c6cf' }}><div style={{ fontWeight: 600, marginBottom: 6, color: '#c8102e' }}>حذف العقار</div>
            <div style={{ fontSize: 12.5, color: '#767a83', marginBottom: 12 }}>يُحذف مع صوره وسجله. للأرشفة استخدم «مباع / مؤجّر» بدلاً عن الحذف.</div>
            <Btn h={36} style={{ color: '#c8102e', borderColor: '#f5c6cf' }} onClick={del}>حذف نهائي</Btn>
          </Card>
        )}
      </div>
      <Card pad={18}><div style={{ fontWeight: 600, marginBottom: 12 }}>سجل التغييرات</div>
        {events === null ? <Spinner pad={20} /> : events.length === 0 ? <div style={{ fontSize: 13, color: '#767a83' }}>لا يوجد سجل بعد</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
            {events.map((e) => <div key={e.id}><div style={{ fontWeight: 600 }}>{e.label}</div><div style={{ color: '#767a83' }}>{e.actor_name || 'النظام'} · {ago(e.created_at)}</div></div>)}
          </div>
        )}
      </Card>
    </div>
  );
}
