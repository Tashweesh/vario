import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCms } from '../CmsApp.jsx';
import { supabase, q, uploadMedia } from '../../lib/supabase.js';
import { useDocTitle } from '../../lib/hooks.js';
import { AMEN, PROJECT_TYPES, usd } from '../../lib/format.js';
import { Btn, Card, Empty, Field, Spinner, StatusPill, Toggle, useToast } from '../../components/ui.jsx';
import { PageTitle, ScrollX, TABLE, editBtn, thead, trow } from '../../staff/Shell.jsx';

const COLS = '56px minmax(180px,1.5fr) 1fr 1fr 160px 90px 110px 70px';

export function ProjectsList() {
  useDocTitle('المشاريع');
  const C = useCms();
  const nav = useNavigate();
  return (
    <>
      <PageTitle action={<Btn onClick={() => nav('/cms/projects/new')}>+ مشروع جديد</Btn>}>المشاريع</PageTitle>
      {C.projects.length === 0 ? <Empty>لا توجد مشاريع بعد</Empty> : (
        <div style={TABLE}><ScrollX min={980}>
          <div style={thead(COLS)}><span /><span>المشروع</span><span>المطوّر</span><span>المنطقة</span><span>الإنجاز</span><span>الوحدات</span><span>الحالة</span><span /></div>
          {C.projects.map((p) => (
            <div key={p.id} className="h-row" style={trow(COLS)}>
              {p.img ? <img src={p.img} alt="" style={{ width: 56, height: 40, borderRadius: 8, objectFit: 'cover' }} /> : <span style={{ width: 56, height: 40, borderRadius: 8, background: '#f6f6f4' }} />}
              <div><div style={{ fontWeight: 600 }}>{p.name}{!p.published && <span style={{ fontSize: 11.5, color: '#b26a00', fontWeight: 600 }}> · مخفي</span>}</div><div style={{ fontSize: 12, color: '#767a83' }}>{p.typeAr} · {p.floors} طابق</div></div>
              <span>{p.devName}</span><span>{p.areaName}</span>
              <div><div style={{ height: 6, borderRadius: 999, background: '#eeeeeb', overflow: 'hidden' }}><div style={{ height: '100%', width: p.progress + '%', background: '#c8102e' }} /></div><div style={{ fontSize: 11.5, color: '#767a83', marginTop: 4 }}>{p.progress}% · {p.handover}</div></div>
              <span>{p.unitCount} على الموقع</span>
              <StatusPill label={p.statusLabel} color="#1d1e22" bg="#f1f1ef" />
              <button style={editBtn} onClick={() => nav(`/cms/projects/${p.id}`)}>تعديل</button>
            </div>
          ))}
        </ScrollX></div>
      )}
    </>
  );
}

const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const NUMS = ['progress', 'floors', 'units', 'price_from', 'plan_down', 'plan_months', 'plan_handover', 'sort'];
const FIELDS = ['name', 'name_en', 'type', 'area_id', 'developer_id', 'status', 'handover', 'img', 'tagline', 'amenities', 'published', ...NUMS];

export function ProjectEditor() {
  const { id } = useParams();
  const isNew = !id;
  const C = useCms();
  const nav = useNavigate();
  const toast = useToast();
  const p = isNew ? null : C.projects.find((x) => x.id === id);
  const initial = useMemo(() => (p ? Object.fromEntries(FIELDS.map((k) => [k, p[k] ?? ''])) : { name: '', name_en: '', type: 'tower', area_id: C.areas[0]?.id || '', developer_id: C.devs[0]?.id || '', status: 'construction', handover: '', img: '', tagline: '', amenities: [], published: true, progress: 0, floors: 1, units: 0, price_from: 0, plan_down: 20, plan_months: 36, plan_handover: 10, sort: C.projects.length }), [p?.updated_at, id]);
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => setF(initial), [initial]);
  useDocTitle(isNew ? 'مشروع جديد' : p?.name);
  if (!isNew && !p) return <Card>المشروع غير موجود.</Card>;
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e?.target ? e.target.value : e }));
  const units = C.listings.filter((l) => l.project_id === id);

  const save = async () => {
    if (!f.name.trim()) return toast('أدخل اسم المشروع', 'error');
    if (+f.plan_down + +f.plan_handover > 100) return toast('مجموع الدفعة الأولى والتسليم أكبر من 100%', 'error');
    setBusy(true);
    try {
      const row = Object.fromEntries(FIELDS.map((k) => [k, NUMS.includes(k) ? Math.round(+f[k] || 0) : f[k] === '' ? null : f[k]]));
      row.progress = Math.min(100, Math.max(0, row.progress));
      if (row.status === 'ready') row.progress = 100;
      if (isNew) {
        const pid = slug(f.name_en || '') || `project-${Date.now().toString(36)}`;
        await q(supabase.from('projects').insert({ ...row, id: pid }));
        await C.reload();
        toast('أُنشئ المشروع');
        nav(`/cms/projects/${pid}`, { replace: true });
      } else {
        await q(supabase.from('projects').update(row).eq('id', id));
        await C.reload();
        toast('تم الحفظ');
      }
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const del = async () => {
    if (!window.confirm(`حذف مشروع ${p.name}؟ العقارات المرتبطة تبقى بدون مشروع.`)) return;
    try { await q(supabase.from('projects').delete().eq('id', id)); await C.reload(); nav('/cms/projects', { replace: true }); toast('حُذف المشروع'); } catch (e) { toast(e.message, 'error'); }
  };
  const cover = async (file) => {
    if (!file) return;
    setBusy(true);
    try { const up = await uploadMedia(file, `projects/${id || 'new'}`); setF((s) => ({ ...s, img: up.url })); toast('رُفعت الصورة — اضغط حفظ'); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const amen = (k) => setF((s) => ({ ...s, amenities: s.amenities.includes(k) ? s.amenities.filter((x) => x !== k) : [...s.amenities, k] }));
  const inp = (k, extra = {}) => <input className="inp-sm" value={f[k]} onChange={set(k)} {...extra} />;
  const numIn = (k, extra = {}) => <input className="inp-sm" type="number" min="0" value={f[k]} onChange={set(k)} style={{ fontWeight: 600 }} {...extra} />;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => nav('/cms/projects')} aria-label="رجوع" style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #d8d8d3', background: '#fff', cursor: 'pointer', fontSize: 16 }}>→</button>
        <div><div style={{ fontSize: 12, color: '#767a83' }}>مشروع · {isNew ? 'جديد' : id}</div><h1 style={{ fontSize: 22, fontWeight: 600, margin: '2px 0 0' }}>{f.name || 'مشروع جديد'}</h1></div>
        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}>
          {!isNew && <a href={`/projects/${id}`} target="_blank" rel="noreferrer"><Btn>معاينة</Btn></a>}
          <Btn kind="red" disabled={busy} onClick={save}>{isNew ? 'إنشاء المشروع' : 'حفظ ونشر'}</Btn>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, gridColumn: 'span 2', minWidth: 0 }}>
          <Card><div style={{ fontWeight: 600, marginBottom: 14 }}>الأساسيات</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
              <Field label="اسم المشروع (عربي)">{inp('name', { required: true })}</Field>
              <Field label="الاسم (English)" hint={isNew ? 'يُستخدم لرابط المشروع' : undefined}>{inp('name_en', { dir: 'ltr' })}</Field>
              <Field label="النوع"><select className="inp-sm sel" value={f.type} onChange={set('type')}>{Object.entries(PROJECT_TYPES).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></Field>
              <Field label="المطوّر"><select className="inp-sm sel" value={f.developer_id} onChange={set('developer_id')}>{C.devs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
              <Field label="المنطقة"><select className="inp-sm sel" value={f.area_id} onChange={set('area_id')}>{C.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
              <Field label="الشعار (سطر واحد)">{inp('tagline')}</Field>
            </div>
          </Card>
          <Card><div style={{ fontWeight: 600, marginBottom: 14 }}>الإنشاء والتسليم</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
              <Field label="الحالة"><select className="inp-sm sel" value={f.status} onChange={set('status')}><option value="construction">قيد الإنشاء</option><option value="ready">جاهز</option></select></Field>
              <Field label="نسبة الإنجاز %">{numIn('progress', { max: 100, disabled: f.status === 'ready' })}</Field>
              <Field label="موعد التسليم">{inp('handover', { placeholder: 'الربع الرابع 2027' })}</Field>
              <Field label="الطوابق">{numIn('floors')}</Field>
              <Field label="إجمالي الوحدات">{numIn('units')}</Field>
              <Field label="يبدأ من (دولار)">{numIn('price_from', { dir: 'ltr' })}</Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid #e7e7e3' }}>
              <Field label="خطة الدفع: دفعة أولى %">{numIn('plan_down', { max: 100 })}</Field>
              <Field label="الأقساط (شهر)">{numIn('plan_months')}</Field>
              <Field label="عند التسليم %">{numIn('plan_handover', { max: 100 })}</Field>
            </div>
          </Card>
          <Card><div style={{ fontWeight: 600, marginBottom: 14 }}>المرافق</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(AMEN).map(([k, t]) => { const on = f.amenities.includes(k); return <button type="button" key={k} onClick={() => amen(k)} style={{ height: 32, padding: '0 12px', borderRadius: 999, background: on ? '#1d1e22' : '#fff', color: on ? '#fff' : '#1d1e22', border: on ? 0 : '1px solid #d8d8d3', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t}{on ? ' ✓' : ''}</button>; })}
            </div>
          </Card>
          {!isNew && f.type === 'tower' && <UnitsGrid project={p} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <Card pad={18}><div style={{ fontWeight: 600, marginBottom: 12 }}>صورة الغلاف</div>
            {f.img ? <img src={f.img} alt="" style={{ width: '100%', aspectRatio: '16/10', objectFit: 'cover', borderRadius: 10 }} /> : <div style={{ width: '100%', aspectRatio: '16/10', borderRadius: 10, background: '#f6f6f4' }} />}
            <label style={{ marginTop: 10, width: '100%', height: 36, borderRadius: 10, border: '1px solid #d8d8d3', background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
              {busy ? '…' : 'تغيير الصورة'}<input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e) => cover(e.target.files?.[0])} />
            </label>
            <input className="inp-sm" dir="ltr" placeholder="أو رابط صورة" value={f.img} onChange={set('img')} style={{ marginTop: 8, height: 34, fontSize: 12.5 }} />
          </Card>
          <Card pad={18}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><div><div style={{ fontWeight: 600, fontSize: 14 }}>ظاهر في الموقع</div><div style={{ fontSize: 12.5, color: '#767a83' }}>يظهر في صفحة المشاريع</div></div><Toggle on={!!f.published} label="ظاهر في الموقع" onChange={(v) => setF((s) => ({ ...s, published: v }))} /></div>
          </Card>
          {!isNew && (
            <Card pad={18}><div style={{ fontWeight: 600, marginBottom: 12 }}>الوحدات المرتبطة</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {units.length === 0 && <div style={{ fontSize: 13, color: '#767a83' }}>لا توجد عقارات مرتبطة</div>}
                {units.map((l) => <button key={l.id} onClick={() => nav(`/cms/listings/${l.id}`)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', border: '1px solid #e7e7e3', borderRadius: 10, background: '#fff', fontSize: 13, cursor: 'pointer', textAlign: 'start', gap: 8 }}><span style={{ fontWeight: 600 }}>{l.id}</span><span style={{ color: '#767a83', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.facts}</span></button>)}
              </div>
              <button onClick={() => nav('/cms/listings/new')} style={{ marginTop: 10, width: '100%', height: 36, borderRadius: 10, border: '1px dashed #d8d8d3', background: 'transparent', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: '#767a83' }}>+ إضافة وحدة لهذا المشروع</button>
            </Card>
          )}
          {!isNew && <Btn h={36} style={{ color: '#c8102e', borderColor: '#f5c6cf' }} onClick={del}>حذف المشروع</Btn>}
        </div>
      </div>
    </>
  );
}

// Tower Explorer availability: click a unit to cycle متاح → محجوز → مباع. Can generate the grid.
function UnitsGrid({ project }) {
  const toast = useToast();
  const [units, setUnits] = useState(null);
  const [gen, setGen] = useState({ perFloor: 6, beds: 2, size: 128 });
  const load = () => supabase.from('project_units').select('*').eq('project_id', project.id).order('floor', { ascending: false }).order('unit').then(({ data }) => setUnits(data || []));
  useEffect(() => { load(); }, [project.id]);
  const NEXT = { free: 'reserved', reserved: 'sold', sold: 'free' };
  const COL = { free: ['#fff', '#1d1e22'], reserved: ['#f5c6cf', '#1d1e22'], sold: ['#1d1e22', '#fff'] };
  const cycle = async (u) => {
    const status = NEXT[u.status];
    setUnits((s) => s.map((x) => (x.id === u.id ? { ...x, status } : x)));
    const { error } = await supabase.from('project_units').update({ status }).eq('id', u.id);
    if (error) { toast(error.message, 'error'); load(); }
  };
  const generate = async () => {
    if (!window.confirm(`إنشاء ${project.floors * gen.perFloor} وحدة (${project.floors} طابق × ${gen.perFloor})؟`)) return;
    const letters = 'ABCDEFGHIJ'.slice(0, gen.perFloor).split('');
    const rows = [];
    for (let n = 1; n <= project.floors; n++) letters.forEach((u) => rows.push({ project_id: project.id, floor: n, unit: u, beds: +gen.beds, size: +gen.size, price: Math.round((project.price_from * (1 + 0.006 * n)) / 1000) * 1000, status: 'free' }));
    const { error } = await supabase.from('project_units').upsert(rows, { onConflict: 'project_id,floor,unit', ignoreDuplicates: true });
    if (error) toast(error.message, 'error'); else { toast('أُنشئت الوحدات'); load(); }
  };
  const floors = useMemo(() => { const m = new Map(); (units || []).forEach((u) => { if (!m.has(u.floor)) m.set(u.floor, []); m.get(u.floor).push(u); }); return [...m.entries()]; }, [units]);
  const counts = (units || []).reduce((a, u) => ({ ...a, [u.status]: (a[u.status] || 0) + 1 }), {});
  return (
    <Card><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
      <div><div style={{ fontWeight: 600 }}>مستكشف البرج · توفر الوحدات</div><div style={{ fontSize: 12.5, color: '#767a83' }}>اضغط على الوحدة لتغيير حالتها: متاح ← محجوز ← مباع</div></div>
      {units?.length > 0 && <div style={{ fontSize: 12.5, color: '#5a5e68' }}>{counts.free || 0} متاح · {counts.reserved || 0} محجوز · {counts.sold || 0} مباع</div>}
    </div>
    {units === null ? <Spinner pad={20} /> : units.length === 0 ? (
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <Field label="وحدات بالطابق"><input className="inp-sm" type="number" min="1" max="10" value={gen.perFloor} onChange={(e) => setGen({ ...gen, perFloor: Math.min(10, Math.max(1, +e.target.value)) })} style={{ width: 110 }} /></Field>
        <Field label="غرف (افتراضي)"><input className="inp-sm" type="number" min="0" value={gen.beds} onChange={(e) => setGen({ ...gen, beds: e.target.value })} style={{ width: 110 }} /></Field>
        <Field label="مساحة م² (افتراضي)"><input className="inp-sm" type="number" min="1" value={gen.size} onChange={(e) => setGen({ ...gen, size: e.target.value })} style={{ width: 130 }} /></Field>
        <Btn kind="dark" onClick={generate}>إنشاء شبكة الوحدات</Btn>
      </div>
    ) : (
      <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {floors.map(([n, us]) => (
          <div key={n} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#767a83' }}>{n}</span>
            <span style={{ display: 'grid', gridTemplateColumns: `repeat(${us.length},1fr)`, gap: 4 }}>
              {us.map((u) => <button type="button" key={u.id} title={`${u.unit} · ${u.beds ?? '–'} غرف · ${u.size ?? '–'} م² · ${usd(u.price)}`} onClick={() => cycle(u)} style={{ height: 26, borderRadius: 6, border: '1px solid #d8d8d3', background: COL[u.status][0], color: COL[u.status][1], fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{u.unit}</button>)}
            </span>
          </div>
        ))}
      </div>
    )}
    </Card>
  );
}
